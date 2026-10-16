// Uložení a úprava tréninku (SPEC 4.2, 5.3), uložení šablony (4.4).

import { TFile, type App } from "obsidian";
import { lastPerformance } from "../calc/performance";
import { SCHEMA_VERSION, type ExerciseMeasure } from "../model/constants";
import { templateToFrontmatter, WORKOUT_KEYS, workoutToFrontmatter } from "../model/serialize";
import type { WorkoutNote } from "../model/types";
import type { BetterFormSettings } from "../settings/settings";
import {
	draftToTemplate,
	draftToWorkout,
	type ExerciseInfo,
	type PrefillContext,
	type WorkoutDraft,
} from "../ui/workout/draft";
import type { DayService } from "./DayService";
import { workoutLabel } from "./dayBlock";
import type { FormaIndex } from "./FormaIndex";
import type { NoteWriter } from "./NoteWriter";
import { namedNotePath, workoutNotePath } from "./paths";
import { renderWorkoutBlock } from "./workoutBlock";
import { t } from "../i18n";

export class WorkoutService {
	constructor(
		private readonly app: App,
		private readonly index: FormaIndex,
		private readonly writer: NoteWriter,
		private readonly days: DayService,
		private readonly settings: () => BetterFormSettings,
	) {}

	/** Stejný cvik (název, alias nebo název souboru knihovny). */
	isSameExercise(a: string, b: string): boolean {
		if (a === b) return true;
		const ea = this.index.findExercise(a);
		const eb = this.index.findExercise(b);
		// Oba v knihovně: rozhoduje shoda poznámky. Jinak (vlastní cvik mimo knihovnu) shoda názvu.
		return ea && eb ? ea === eb : a.trim().toLocaleLowerCase("cs") === b.trim().toLocaleLowerCase("cs");
	}

	exerciseInfo(exercise: string): ExerciseInfo | undefined {
		return this.index.findExercise(exercise)?.note;
	}

	measureOf(exercise: string): ExerciseMeasure | undefined {
		return this.exerciseInfo(exercise)?.measure;
	}

	/** Kontext pro předvyplnění; `exclude` = upravovaný trénink (nepočítá se jako „minule“). */
	prefillContext(date: string, exclude?: TFile): PrefillContext {
		const settings = this.settings();
		const workouts = this.index
			.workouts()
			.filter((w) => w.file !== exclude)
			.map((w) => w.note);
		return {
			info: (exercise) => this.exerciseInfo(exercise),
			last: (exercise) => lastPerformance(workouts, (other) => this.isSameExercise(exercise, other), date),
			options: {
				rirMin: settings.thresholds.progressionRirMin,
				incrementUpperKg: settings.thresholds.incrementUpperKg,
				incrementLowerKg: settings.thresholds.incrementLowerKg,
				kettlebellsKg: settings.kettlebellsKg,
			},
		};
	}

	/** Volá se po každém uložení tréninku (např. zápis nového maxima z programu). */
	onSaved: ((note: WorkoutNote, file: TFile, isNew: boolean) => Promise<void>) | null = null;

	/** Uloží trénink z formuláře (nový nebo úprava existujícího). */
	async save(draft: WorkoutDraft, existing?: TFile): Promise<TFile> {
		const note = draftToWorkout(draft, SCHEMA_VERSION);
		const file = await this.saveNote(note, existing);
		await this.onSaved?.(note, file, !existing);
		return file;
	}

	/** Uloží nový trénink nebo upraví existující; obnoví souhrny a denní poznámku. */
	async saveNote(note: WorkoutNote, existing?: TFile): Promise<TFile> {
		const frontmatter = workoutToFrontmatter(note);
		let file: TFile;
		let previousDate: string | undefined;
		if (existing) {
			if (this.index.all("workout").find((e) => e.file === existing)?.schemaStatus === "newer") {
				throw new Error(t("Trénink je z novější verze pluginu – aktualizuj plugin."));
			}
			previousDate = this.index.all("workout").find((e) => e.file === existing)?.note.date;
			await this.writer.updateFrontmatter(existing, (fm) => {
				// Spravované klíče nahradit, ostatní (uživatelovy) zachovat.
				for (const key of WORKOUT_KEYS) delete fm[key];
				Object.assign(fm, frontmatter);
			});
			file = existing;
		} else {
			file = await this.writer.createNote(
				workoutNotePath(this.settings().folders, note.date, workoutLabel(note)),
				frontmatter,
			);
		}
		await this.writer.setGeneratedBlock(file, renderWorkoutBlock(note, (e) => this.measureOf(e)));
		await this.refreshDay(note.date, file, note);
		if (previousDate && previousDate !== note.date) await this.days.refreshBlock(previousDate);
		return file;
	}

	/** Uloží šablonu z formuláře; vrátí soubor. */
	async saveTemplate(draft: WorkoutDraft, name: string): Promise<TFile> {
		const template = draftToTemplate(draft, name.trim(), SCHEMA_VERSION);
		if (template.blocks.length === 0) throw new Error(t("Šablona nemá žádný cvik."));
		return this.writer.createNote(
			namedNotePath(this.settings().folders, "templates", template.name),
			templateToFrontmatter(template),
		);
	}

	/** Cíl odkazu na soubor (pro `template:` a `program:` v tréninku). */
	linkTarget(file: TFile, sourcePath = ""): string {
		return this.app.metadataCache.fileToLinktext(file, sourcePath, true);
	}

	/** Založí jednoduchý cvik, když v knihovně chybí. */
	async createExercise(name: string, measure: ExerciseMeasure, category: ExerciseInfo["category"]): Promise<void> {
		await this.writer.createNote(
			namedNotePath(this.settings().folders, "exercises", name),
			{
				forma: "exercise",
				schema: SCHEMA_VERSION,
				name,
				aliases: [],
				category,
				kind: measure === "seconds" ? "hold" : "grind",
				measure,
				muscles: { primary: [], secondary: [] },
			},
			t("Doplň svalové partie (muscles) a případně techniku."),
		);
	}

	/**
	 * Obnoví souhrn denní poznámky. Metadata právě uloženého tréninku ještě
	 * nemusí být v indexu, proto se trénink předá rovnou.
	 */
	private async refreshDay(date: string, file: TFile, note: WorkoutNote): Promise<void> {
		await this.days.ensureDayNote(date);
		await this.days.refreshBlock(date, { file, note });
	}
}
