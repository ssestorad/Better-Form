// Žebříčky kalistenických dovedností (SPEC 5.6): stupně z knihovny cviků,
// splnění kritéria postupu a další krok. Bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import type { ExerciseMeasure } from "../model/constants";
import type { WorkoutNote } from "../model/types";
import { t } from "../i18n";

/** Kritérium postupu (3×8 opakování / 3×10 s) je trenérská zvyklost. */
export const SKILL_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };

export interface SkillExercise {
	name: string;
	measure: ExerciseMeasure;
	progression?: { ladder?: string; level?: number };
}

export interface LadderStep {
	exercise: string;
	level: number;
	unit: "reps" | "sec";
}

export interface Ladder {
	name: string;
	steps: LadderStep[];
}

/** Žebříčky poskládané z cviků, které mají `progression.ladder` a `level`; podle názvu. */
export function laddersFrom(exercises: readonly SkillExercise[]): Ladder[] {
	const byName = new Map<string, Ladder>();
	for (const exercise of exercises) {
		const ladder = exercise.progression?.ladder?.trim();
		const level = exercise.progression?.level;
		if (!ladder || level === undefined || !Number.isFinite(level)) continue;
		const entry = byName.get(ladder) ?? { name: ladder, steps: [] };
		entry.steps.push({ exercise: exercise.name, level, unit: exercise.measure === "seconds" ? "sec" : "reps" });
		byName.set(ladder, entry);
	}
	for (const ladder of byName.values()) {
		ladder.steps.sort((a, b) => a.level - b.level || a.exercise.localeCompare(b.exercise, "cs"));
	}
	return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "cs"));
}

export interface SkillCriteria {
	/** Kolik sérií v jednom tréninku musí kritérium splnit (výchozí 3). */
	sets: number;
	/** Opakování v každé z nich (výchozí 8). */
	reps: number;
	/** Sekundy výdrže v každé z nich (výchozí 10). */
	holdSec: number;
}

export interface StepStatus extends LadderStep {
	/** Datum prvního tréninku, který kritérium splnil; null = zatím ne. */
	achieved: string | null;
	/** Nejlepší jednotlivá série (opakování nebo sekundy). */
	best: { value: number; date: string } | null;
	/** Nejvíc sérií splňujících kritérium v jednom tréninku. */
	bestSets: number;
}

export interface LadderStatus {
	ladder: Ladder;
	steps: StepStatus[];
	/** Nejvyšší splněný stupeň; 0 = žádný. */
	level: number;
	/** Další krok: první nesplněný stupeň nad nejvyšším splněným; null = hotovo. */
	next: StepStatus | null;
}

/** „3×8 opakování“ / „3×10 s“. */
export function criterionText(unit: "reps" | "sec", c: SkillCriteria): string {
	return unit === "sec" ? `${c.sets}×${c.holdSec} s` : t("{sets}×{reps} opakování", { sets: c.sets, reps: c.reps });
}

/**
 * Stav žebříčku. Stupeň je splněný prvním tréninkem, kde aspoň `sets` pracovních
 * sérií cviku dosáhlo `reps` opakování (nebo `holdSec` sekund). Série s dopomocí
 * (záporný přívažek) se nepočítají.
 */
export function ladderStatus(
	ladder: Ladder,
	workouts: readonly WorkoutNote[],
	isSameExercise: (a: string, b: string) => boolean,
	criteria: SkillCriteria,
): LadderStatus {
	const ordered = [...workouts].sort((a, b) => (a.date + (a.start ?? "")).localeCompare(b.date + (b.start ?? "")));
	const steps: StepStatus[] = ladder.steps.map((step) => {
		const status: StepStatus = { ...step, achieved: null, best: null, bestSets: 0 };
		const threshold = step.unit === "sec" ? criteria.holdSec : criteria.reps;
		for (const workout of ordered) {
			let passing = 0;
			for (const block of workout.blocks) {
				if ((block.type !== "sets" && block.type !== "hold") || !isSameExercise(block.exercise, step.exercise)) continue;
				for (const set of block.sets) {
					if (set.warmup || (set.added_kg ?? 0) < 0) continue;
					const value = step.unit === "sec" ? set.sec : set.reps;
					if (value === undefined || value <= 0) continue;
					if (!status.best || value > status.best.value) status.best = { value, date: workout.date };
					if (value >= threshold) passing++;
				}
			}
			status.bestSets = Math.max(status.bestSets, passing);
			if (status.achieved === null && passing >= criteria.sets) status.achieved = workout.date;
		}
		return status;
	});
	const level = steps.reduce((max, s) => (s.achieved !== null && s.level > max ? s.level : max), 0);
	const next = steps.find((s) => s.level > level && s.achieved === null) ?? null;
	return { ladder, steps, level, next };
}
