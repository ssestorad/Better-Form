// Odhad 1RM (SPEC 8.6) a zátěž série.

import type { ExerciseKind, ExerciseMeasure } from "../model/constants";
import type { SetEntry } from "../model/types";
import type { Basis } from "../evidence/sources";

/**
 * Epleyho vzorec nemá v katalogu zdrojů (SPEC kap. 14) citaci, proto je
 * označen jako praxe – nevydávat za výzkum.
 */
export const EPLEY_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };

/** Podíl tělesné hmotnosti u kliků (Ebben 2011); u ostatních cviků jsou hodnoty v knihovně orientační. */
export const PUSHUP_BODYWEIGHT_BASIS: Basis = { sourceIds: ["ebben2011"], evidence: "research" };

export const EPLEY_MAX_REPS = 10;

/**
 * Epley: 1RM = kg × (1 + reps / 30), jen pro 1–10 opakování.
 * U jednoho opakování je výsledkem přímo zvednutá váha (skutečné 1RM).
 */
export function epley1RM(kg: number, reps: number): number | null {
	if (!Number.isFinite(kg) || kg <= 0) return null;
	if (!Number.isInteger(reps) || reps < 1 || reps > EPLEY_MAX_REPS) return null;
	if (reps === 1) return kg;
	return kg * (1 + reps / 30);
}

export interface ExerciseForLoad {
	kind: ExerciseKind;
	measure: ExerciseMeasure;
	bodyweight_fraction?: number;
}

/**
 * Hmotnost, se kterou se v sérii pracuje:
 * - `reps_kg`: váha závaží,
 * - `reps_bw`: tělesná hmotnost × podíl zvedané hmotnosti + přívažek (záporný = guma).
 * Když údaje chybí, vrátí null.
 */
export function setLoadKg(set: SetEntry, exercise: ExerciseForLoad, bodyweightKg: number | undefined): number | null {
	if (exercise.measure === "reps_kg") return set.kg !== undefined && set.kg > 0 ? set.kg : null;
	if (exercise.measure === "reps_bw") {
		if (bodyweightKg === undefined || exercise.bodyweight_fraction === undefined) return null;
		const load = bodyweightKg * exercise.bodyweight_fraction + (set.added_kg ?? 0);
		return load > 0 ? load : null;
	}
	return null;
}

/** Odhad 1RM ze série; švihové cviky a výdrže se nepočítají. */
export function estimateSet1RM(
	set: SetEntry,
	exercise: ExerciseForLoad,
	bodyweightKg: number | undefined,
): number | null {
	if (exercise.kind !== "grind" || set.reps === undefined) return null;
	const load = setLoadKg(set, exercise, bodyweightKg);
	return load === null ? null : epley1RM(load, set.reps);
}

/** Nejvyšší odhad 1RM z pracovních sérií (rozcvičovací se nepočítají), nebo null. */
export function best1RM(sets: SetEntry[], exercise: ExerciseForLoad, bodyweightKg: number | undefined): number | null {
	let best: number | null = null;
	for (const set of sets) {
		if (set.warmup) continue;
		const estimate = estimateSet1RM(set, exercise, bodyweightKg);
		if (estimate !== null && (best === null || estimate > best)) best = estimate;
	}
	return best;
}
