// Návrh navýšení „z minula“ (SPEC 9.3): řízení podle RIR (Helms 2016),
// konkrétní přírůstky (+2,5 / +5 kg, +1–2 opakování) jsou trenérská praxe.

import type { ExerciseCategory, ExerciseMeasure, MuscleId } from "../model/constants";
import type { SetEntry } from "../model/types";
import type { Basis } from "../evidence/sources";
import { t, tn } from "../i18n";

export const PROGRESSION_BASIS: Basis = { sourceIds: ["helms2016", "practice"], evidence: "practice" };

/** Partie, podle kterých se cvik bere jako cvik na dolní polovinu těla. */
const LOWER_BODY: readonly MuscleId[] = ["quads", "hamstrings", "glutes", "calves"];

export interface ProgressionExercise {
	category: ExerciseCategory;
	measure: ExerciseMeasure;
	muscles: { primary: MuscleId[] };
}

export interface ProgressionOptions {
	/** Navýšit, když všechny pracovní série měly RIR aspoň tolik. */
	rirMin: number;
	incrementUpperKg: number;
	incrementLowerKg: number;
	/** Vlastní kettlebelly – u kettlebell cviků se navrhne další těžší zvon. */
	kettlebellsKg: number[];
}

export type ProgressionSuggestion =
	| { action: "increase_weight"; kg: number; reps: number; reason: string }
	| { action: "increase_reps"; reps: number; kg?: number; added_kg?: number; reason: string }
	| { action: "same"; reps: number; kg?: number; added_kg?: number; reason: string }
	/** Není z čeho navrhovat (žádná data, jiný typ měření). */
	| { action: "none"; reason: string };

function workingWeight(set: SetEntry, measure: ExerciseMeasure): number {
	return (measure === "reps_kg" ? set.kg : set.added_kg) ?? 0;
}

export function isLowerBody(exercise: ProgressionExercise): boolean {
	return exercise.muscles.primary.some((m) => LOWER_BODY.includes(m));
}

/**
 * Návrh pro příští trénink z posledního výkonu cviku.
 * Rozcvičovací série (`warmup`) se ignorují; z ostatních jsou pracovní ty
 * s nejvyšší váhou. „Splněno“ = každá pracovní série dosáhla cílového počtu
 * opakování (ze šablony), bez cíle počtu z první pracovní série.
 */
export function suggestProgression(
	lastSets: SetEntry[],
	exercise: ProgressionExercise,
	options: ProgressionOptions,
	targetReps?: number,
): ProgressionSuggestion {
	if (exercise.measure !== "reps_kg" && exercise.measure !== "reps_bw") {
		return { action: "none", reason: t("Increase suggestions are only for rep-based exercises.") };
	}
	const withReps = lastSets.filter((s) => !s.warmup && s.reps !== undefined && s.reps > 0);
	if (withReps.length === 0) return { action: "none", reason: t("No last result.") };

	const weight = Math.max(...withReps.map((s) => workingWeight(s, exercise.measure)));
	const working = withReps.filter((s) => workingWeight(s, exercise.measure) === weight);
	const reps = Math.min(...working.map((s) => s.reps!));
	const goal = targetReps ?? working[0]!.reps!;
	const completed = working.every((s) => s.reps! >= goal);

	const weightFields =
		exercise.measure === "reps_kg" ? { kg: weight } : weight !== 0 ? { added_kg: weight } : {};
	const same = (reason: string): ProgressionSuggestion => ({ action: "same", reps: goal, ...weightFields, reason });

	if (!completed) return same(t("Not all sets were completed last time – repeat the same weight."));
	const rirs = working.map((s) => s.rir);
	if (rirs.some((r) => r === undefined)) {
		return same(t("RIR (reps left) is missing – can't assess, repeat the same weight."));
	}
	const minRir = Math.min(...(rirs as number[]));
	if (minRir < options.rirMin) {
		return same(
			minRir === 0
				? t("Last time a set went to failure (RIR 0) – repeat the same weight.")
				: t("Last time RIR {minRir} – repeat the same weight.", { minRir }),
		);
	}

	const repsStep = minRir > options.rirMin ? 2 : 1;
	const repsReason = tn(repsStep, ["All sets completed with RIR ≥ {rirMin} – add {n} rep.", "All sets completed with RIR ≥ {rirMin} – add {n} reps."], { rirMin: options.rirMin });

	if (exercise.category === "kettlebell" && exercise.measure === "reps_kg") {
		const next = options.kettlebellsKg.filter((kg) => kg > weight).sort((a, b) => a - b)[0];
		if (next !== undefined) {
			return {
				action: "increase_weight",
				kg: next,
				reps: goal,
				reason: t("All sets completed with RIR ≥ {rirMin} – try a heavier kettlebell.", { rirMin: options.rirMin }),
			};
		}
		return { action: "increase_reps", reps: reps + repsStep, kg: weight, reason: repsReason };
	}

	if (exercise.measure === "reps_kg") {
		const increment = isLowerBody(exercise) ? options.incrementLowerKg : options.incrementUpperKg;
		return {
			action: "increase_weight",
			kg: weight + increment,
			reps: goal,
			reason: t("All sets completed with RIR ≥ {rirMin} – add {v} kg.", { rirMin: options.rirMin, v: formatKg(increment) }),
		};
	}

	// Cviky s vlastní vahou: přidávají se opakování, přívažek zůstává.
	return { action: "increase_reps", reps: reps + repsStep, ...weightFields, reason: repsReason };
}

function formatKg(kg: number): string {
	return String(kg).replace(".", ",");
}
