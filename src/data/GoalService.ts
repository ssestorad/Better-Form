// Cíle a normy (SPEC 4.6, 5.8): poznámky `forma: goal` a `forma: norm`.

import type { TFile } from "obsidian";
import { evaluateGoal, type GoalData, type GoalEvaluation } from "../calc/goals";
import { normStatus, type NormProfile, type NormStatus } from "../calc/norms";
import { exerciseSeries, type RecordContext } from "../calc/records";
import { ladderStatus, laddersFrom } from "../calc/skills";
import { SCHEMA_VERSION, type GoalStatus } from "../model/constants";
import { goalToFrontmatter, normToFrontmatter } from "../model/serialize";
import type { GoalNote, NormNote } from "../model/types";
import type { BetterFormSettings } from "../settings/settings";
import type { FormaIndex, IndexEntry } from "./FormaIndex";
import type { NoteWriter } from "./NoteWriter";
import { namedNotePath } from "./paths";
import { t } from "../i18n";

export type GoalEntry = IndexEntry<GoalNote>;
export type NormEntry = IndexEntry<NormNote>;

export type GoalDraft = Omit<GoalNote, "forma" | "schema" | "created" | "status" | "start_value">;

const GOAL_KEYS = ["forma", "schema", "name", "type", "target", "exercise", "distance_km", "ladder", "norm", "created", "deadline", "start_value", "status", "notes"] as const;
const NORM_KEYS = ["forma", "schema", "name", "items", "notes"] as const;

function sameName(a: string, b: string): boolean {
	return a.trim().toLocaleLowerCase("cs") === b.trim().toLocaleLowerCase("cs");
}

export class GoalService {
	constructor(
		private readonly index: FormaIndex,
		private readonly writer: NoteWriter,
		private readonly settings: () => BetterFormSettings,
		private readonly context: () => RecordContext,
		private readonly isSameExercise: (a: string, b: string) => boolean,
		private readonly onChange: () => void,
	) {}

	// ---------- Cíle ----------

	/** Aktivní první, pak splněné a opuštěné; uvnitř podle termínu a názvu. */
	goals(): GoalEntry[] {
		const order: Record<GoalStatus, number> = { active: 0, done: 1, dropped: 2 };
		return this.index
			.all("goal")
			.sort(
				(a, b) =>
					order[a.note.status] - order[b.note.status] ||
					(a.note.deadline ?? "9999").localeCompare(b.note.deadline ?? "9999") ||
					a.note.name.localeCompare(b.note.name, "cs"),
			);
	}

	/** Podklady pro vyhodnocení cílů; sestavují se jednou pro všechny cíle. */
	data(today: string): GoalData {
		const workouts = this.index.all("workout").map((w) => w.note);
		const ctx = this.context();
		const exercises = this.index.all("exercise").map((e) => e.note);
		const th = this.settings().thresholds;
		const criteria = { sets: th.skillSets, reps: th.skillReps, holdSec: th.skillHoldSec };
		const ladders = laddersFrom(exercises);
		return {
			workouts,
			days: this.index.all("day").map((d) => d.note),
			tests: this.index.all("test").map((t2) => t2.note),
			series: exerciseSeries(workouts, ctx),
			exerciseName: (link) => ctx.info(link)?.name,
			measureOf: (link) => ctx.info(link)?.measure,
			ladderLevels: (name) => {
				const ladder = ladders.find((l) => sameName(l.name, name));
				if (!ladder) return [];
				return ladderStatus(ladder, workouts, this.isSameExercise, criteria)
					.steps.filter((s) => s.achieved !== null)
					.map((s) => ({ date: s.achieved!, value: s.level }));
			},
			normRatio: (name) => {
				const norm = this.findNorm(name);
				return norm ? this.normStatus(norm, today).ratio : null;
			},
		};
	}

	evaluate(entry: GoalEntry, today: string, data: GoalData = this.data(today)): GoalEvaluation {
		return evaluateGoal(entry.note, data, today);
	}

	/** Založí cíl; výchozí stav se zapíše, aby šel počítat průběh. */
	async create(draft: GoalDraft, today: string): Promise<TFile> {
		const name = draft.name.trim();
		if (!name) throw new Error(t("Chybí název cíle."));
		if (this.index.all("goal").some((e) => sameName(e.note.name, name))) throw new Error(t("Cíl „{name}“ už existuje.", { name }));
		const note: GoalNote = { ...draft, forma: "goal", schema: SCHEMA_VERSION, name, created: today, status: "active" };
		const current = evaluateGoal(note, this.data(today), today).current;
		if (current !== null) note.start_value = current;
		const file = await this.writer.createNote(namedNotePath(this.settings().folders, "goals", name), goalToFrontmatter(note));
		this.onChange();
		return file;
	}

	async setStatus(entry: GoalEntry, status: GoalStatus): Promise<void> {
		await this.writeGoal(entry, { ...entry.note, status });
	}

	/** Změna cílové hodnoty nebo termínu. */
	async updateGoal(entry: GoalEntry, changes: Pick<GoalNote, "target" | "deadline">): Promise<void> {
		await this.writeGoal(entry, { ...entry.note, ...changes });
	}

	private async writeGoal(entry: GoalEntry, note: GoalNote): Promise<void> {
		if (entry.schemaStatus === "newer") throw new Error(t("Poznámka je z novější verze pluginu – aktualizuj plugin."));
		const next = goalToFrontmatter(note);
		await this.writer.updateFrontmatter(entry.file, (frontmatter) => {
			for (const key of GOAL_KEYS) delete frontmatter[key];
			Object.assign(frontmatter, next);
		});
		this.onChange();
	}

	// ---------- Normy ----------

	norms(): NormEntry[] {
		return this.index.all("norm").sort((a, b) => a.note.name.localeCompare(b.note.name, "cs"));
	}

	findNorm(name: string): NormEntry | undefined {
		return this.index.all("norm").find((e) => sameName(e.note.name, name) || sameName(e.file.basename, name));
	}

	profile(today: string): NormProfile {
		const { sex, birthYear } = this.settings().profile;
		return { sex, age: birthYear !== null ? Number(today.slice(0, 4)) - birthYear : null };
	}

	normStatus(entry: NormEntry, today: string): NormStatus {
		return normStatus(entry.note, this.profile(today), {
			workouts: this.index.all("workout").map((w) => w.note),
			tests: this.index.all("test").map((x) => x.note),
			isSameExercise: this.isSameExercise,
			today,
		});
	}

	/** Uloží normu: novou založí, existující přepíše (jen spravované klíče). */
	async saveNorm(note: Omit<NormNote, "forma" | "schema">, existing?: NormEntry): Promise<TFile> {
		const name = note.name.trim();
		if (!name) throw new Error(t("Chybí název normy."));
		if (note.items.length === 0) throw new Error(t("Norma nemá žádnou disciplínu."));
		const next = normToFrontmatter({ ...note, name, forma: "norm", schema: SCHEMA_VERSION });
		if (existing) {
			if (existing.schemaStatus === "newer") throw new Error(t("Poznámka je z novější verze pluginu – aktualizuj plugin."));
			await this.writer.updateFrontmatter(existing.file, (frontmatter) => {
				for (const key of NORM_KEYS) delete frontmatter[key];
				Object.assign(frontmatter, next);
			});
			this.onChange();
			return existing.file;
		}
		if (this.findNorm(name)) throw new Error(t("Norma „{name}“ už existuje.", { name }));
		// Normy patří podle SPEC kap. 3 do složky Testy.
		const file = await this.writer.createNote(namedNotePath(this.settings().folders, "tests", name), next);
		this.onChange();
		return file;
	}
}
