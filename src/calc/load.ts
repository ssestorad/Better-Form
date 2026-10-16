// Zátěž tréninku – session RPE (SPEC 8.1).

import { addDays, daysBetween } from "../model/dates";
import type { Basis } from "../evidence/sources";

export const SESSION_LOAD_BASIS: Basis = { sourceIds: ["foster2001"], evidence: "research" };

/**
 * Zátěž jednoho tréninku v AU: RPE (CR-10, 0–10) × délka v minutách.
 * Chybějící nebo neplatné vstupy vrátí null (trénink se do zátěže nezapočítá).
 */
export function sessionLoad(rpe: number | undefined, durationMin: number | undefined): number | null {
	if (rpe === undefined || durationMin === undefined) return null;
	if (!Number.isFinite(rpe) || !Number.isFinite(durationMin)) return null;
	if (rpe < 0 || rpe > 10 || durationMin < 0) return null;
	return rpe * durationMin;
}

export interface LoadInput {
	date: string;
	rpe?: number;
	duration_min?: number;
}

export interface DailyLoads {
	/** Součet zátěže po dnech (jen dny s aspoň jedním započitatelným tréninkem). */
	byDate: Map<string, number>;
	/** Počet tréninků bez RPE nebo délky – UI je nabídne k doplnění. */
	missing: number;
}

/** Denní zátěž = součet zátěží tréninků daného dne. */
export function dailyLoads(workouts: LoadInput[]): DailyLoads {
	const byDate = new Map<string, number>();
	let missing = 0;
	for (const workout of workouts) {
		const load = sessionLoad(workout.rpe, workout.duration_min);
		if (load === null) {
			missing++;
			continue;
		}
		byDate.set(workout.date, (byDate.get(workout.date) ?? 0) + load);
	}
	return { byDate, missing };
}

/** Souvislá řada denní zátěže od `from` do `to` včetně; dny bez tréninku = 0. */
export function dailyLoadSeries(
	byDate: Map<string, number>,
	from: string,
	to: string,
): { date: string; load: number }[] {
	const days = daysBetween(from, to);
	if (days < 0) return [];
	const series: { date: string; load: number }[] = [];
	for (let i = 0; i <= days; i++) {
		const date = addDays(from, i);
		series.push({ date, load: byDate.get(date) ?? 0 });
	}
	return series;
}
