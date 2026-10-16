import { Modal, Notice, TFile } from "obsidian";
import { mount, unmount } from "svelte";
import { formatSets, performanceSets } from "../../calc/performance";
import { migrateFrontmatter } from "../../data/migrations";
import type BetterFormPlugin from "../../main";
import { BLOCK_LABELS, type ExerciseCategory, type ExerciseMeasure, type Sport } from "../../model/constants";
import { parseWorkout } from "../../model/parse";
import type { PlanItem, WorkoutNote } from "../../model/types";
import { formatShortDate } from "../format";
import type { WorkoutFormApi } from "../workout/api";
import {
	emptyDraft,
	newBlockForExercise,
	templateToDraft,
	workoutToDraft,
	type WorkoutDraft,
} from "../workout/draft";
import WorkoutForm from "../workout/WorkoutForm.svelte";
import { confirmAction } from "./ConfirmModal";
import { t } from "../../i18n";

export interface WorkoutModalOptions {
	/** Upravit existující trénink. */
	file?: TFile;
	/** Nový trénink ze šablony. */
	template?: TFile;
	/** Nový trénink z dnešních úkolů programu. */
	program?: TFile;
	/** Nový trénink předvyplněný z položky plánu týdne (sport, název, délka, vzdálenost běhu). */
	plan?: PlanItem;
	sport?: Sport;
	date: string;
}

const NEW_EXERCISE: Record<Sport, { category: ExerciseCategory; measure: ExerciseMeasure }> = {
	strength: { category: "strength", measure: "reps_kg" },
	calisthenics: { category: "calisthenics", measure: "reps_bw" },
	kettlebell: { category: "kettlebell", measure: "reps_kg" },
	other: { category: "strength", measure: "reps_kg" },
	run: { category: "cardio", measure: "distance" },
	swim: { category: "cardio", measure: "distance" },
	rope: { category: "cardio", measure: "time" },
};

export class WorkoutModal extends Modal {
	private component: ReturnType<typeof mount> | null = null;
	private dirty = false;
	private closing = false;
	/** Odkaz na záznam bolesti zapsaný při tomto ukládání. */
	private painLink: string | null = null;

	constructor(
		private readonly plugin: BetterFormPlugin,
		private readonly options: WorkoutModalOptions,
	) {
		super(plugin.app);
	}

	override onOpen(): void {
		this.modalEl.addClass("bf-modal", "bf-modal-wide");
		const initial = this.initialDraft();
		if (!initial) {
			new Notice(t("Trénink nejde načíst – zkontroluj frontmatter poznámky."));
			this.closing = true;
			this.close();
			return;
		}
		this.titleEl.setText(this.options.file ? t("Upravit trénink") : t("Zapsat trénink"));
		const settings = this.plugin.settings;
		const sports = (Object.keys(settings.sports) as Sport[]).filter((s) => settings.sports[s]);
		this.component = mount(WorkoutForm, {
			target: this.contentEl,
			props: { initial, sports, bells: settings.kettlebellsKg, barbell: { barKg: settings.barbellKg, platesKg: settings.platesKg }, api: this.api() },
		});
	}

	/** Zavření rozepsaného formuláře se nejdřív potvrdí. */
	override close(): void {
		if (!this.dirty || this.closing) {
			super.close();
			return;
		}
		void confirmAction(this.app, t("Zahodit rozepsaný trénink?"), t("Neuložené změny se ztratí."), t("Zahodit")).then((ok) => {
			if (!ok) return;
			this.closing = true;
			super.close();
		});
	}

	override onClose(): void {
		if (this.component) {
			void unmount(this.component);
			this.component = null;
		}
		this.contentEl.empty();
	}

	private initialDraft(): WorkoutDraft | null {
		const { file, template, program, plan, sport, date } = this.options;
		const workouts = this.plugin.workouts;
		if (program) {
			const entry = this.plugin.programs.programs().find((p) => p.file === program);
			return entry ? this.plugin.programs.draftFor(entry, date) : null;
		}
		if (file) {
			const note = this.plugin.index.all("workout").find((e) => e.file === file)?.note ?? this.readWorkout(file);
			return note ? workoutToDraft(note) : null;
		}
		if (template) {
			const entry = this.plugin.index.all("template").find((e) => e.file === template);
			if (!entry) return null;
			return templateToDraft(entry.note, workouts.linkTarget(template), date, workouts.prefillContext(date));
		}
		if (plan) {
			// RPE se nepředvyplňuje – zapisuje se skutečný pocit, ne plán.
			const draft = emptyDraft(date, plan.sport);
			draft.title = plan.title;
			draft.duration_min = plan.duration_min;
			if (plan.sport === "run") draft.run.distance_km = plan.distance_km;
			return draft;
		}
		const enabled = (Object.keys(this.plugin.settings.sports) as Sport[]).filter((s) => this.plugin.settings.sports[s]);
		return emptyDraft(date, sport ?? enabled[0] ?? "strength");
	}

	private readWorkout(file: TFile): WorkoutNote | null {
		const migration = migrateFrontmatter(this.app.metadataCache.getFileCache(file)?.frontmatter);
		return migration.status === "invalid" ? null : parseWorkout(migration.data);
	}

	private api(): WorkoutFormApi {
		const workouts = this.plugin.workouts;
		const exclude = this.options.file;
		return {
			exercises: () =>
				this.plugin.index.all("exercise").map((e) => ({
					name: e.note.name,
					aliases: e.note.aliases,
					category: e.note.category,
				})),
			info: (exercise) => workouts.exerciseInfo(exercise),
			lastText: (exercise, date) => {
				const perf = workouts.prefillContext(date, exclude).last(exercise);
				if (!perf) return undefined;
				const sets = performanceSets(perf);
				const text =
					sets.length > 0
						? formatSets(sets, workouts.measureOf(exercise) ?? "reps_kg")
						: perf.blocks.map((b) => BLOCK_LABELS[b.type]).join(", ");
				return `${formatShortDate(perf.date)}: ${text}`;
			},
			newBlock: (exercise, date) => newBlockForExercise(exercise, workouts.prefillContext(date, exclude)),
			createExercise: async (name, sport) => {
				const { category, measure } = NEW_EXERCISE[sport];
				await workouts.createExercise(name, measure, category);
				new Notice(t("Cvik „{name}“ založen v knihovně – doplň mu svalové partie.", { name }));
			},
			showExercise: (exercise) => this.plugin.openLibrary({ exercise }),
			shoes: () => this.plugin.gear.activeShoeNames(),
			pains: () => this.plugin.pains.open().map((e) => ({ name: e.note.name, level: e.note.level })),
			save: async (draft) => {
				// Bolest při tréninku: zapsat do evidence a trénink na záznam odkázat.
				if (draft.painReport) {
					// Při opakovaném pokusu o uložení se bolest nezapisuje podruhé.
					this.painLink ??= await this.plugin.pains.report(draft.painReport, draft.date);
					if (!draft.pain.includes(this.painLink)) draft.pain = [...draft.pain, this.painLink];
					delete draft.painReport;
				}
				await workouts.save(draft, this.options.file);
				new Notice(this.options.file ? t("Trénink upraven.") : t("Trénink uložen."));
				this.closing = true;
				this.close();
			},
			saveTemplate: async (draft, name) => {
				const file = await workouts.saveTemplate(draft, name);
				new Notice(t("Šablona „{basename}“ uložena.", { basename: file.basename }));
			},
			cancel: () => this.close(),
			remove: exclude
				? async () => {
						if (!(await this.plugin.deleteWorkout(exclude))) return;
						this.closing = true;
						this.close();
					}
				: undefined,
			setDirty: (dirty) => (this.dirty = dirty),
		};
	}
}
