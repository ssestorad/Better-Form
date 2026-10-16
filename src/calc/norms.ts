// Normy (SPEC 4.6, 5.8): tabulku zadá uživatel; plugin najde řádek pro jeho
// pohlaví a věk, ukáže vzdálenost od splnění a nejslabší disciplínu.
// Žádné normy se nepředvyplňují. Bez závislosti na Obsidianu.

import { addDays } from "../model/dates";
import type { NormItem, NormNote, NormRow, TestNote, WorkoutNote } from "../model/types";
import { RECORD_DISTANCES, RECORD_TOLERANCE } from "./running";

export interface NormProfile {
	sex: "male" | "female" | null;
	age: number | null;
}

/** Aktuální výkon = nejlepší za tolik posledních dní; starší jen když novější chybí. */
export const NORM_RECENT_DAYS = 90;

function rowMatches(row: NormRow, profile: NormProfile): boolean {
	if (row.sex !== undefined && row.sex !== profile.sex) return false;
	if (row.age_from !== undefined && (profile.age === null || profile.age < row.age_from)) return false;
	if (row.age_to !== undefined && (profile.age === null || profile.age > row.age_to)) return false;
	return true;
}

/** Kolik podmínek řádek má – přesnější řádek má přednost před obecným. */
function specificity(row: NormRow): number {
	return Number(row.sex !== undefined) + Number(row.age_from !== undefined) + Number(row.age_to !== undefined);
}

/** Požadovaná hodnota disciplíny pro daného člověka; null, když žádný řádek neodpovídá. */
export function normTarget(item: NormItem, profile: NormProfile): number | null {
	const rows = item.rows.filter((row) => rowMatches(row, profile)).sort((a, b) => specificity(b) - specificity(a));
	return rows[0]?.value ?? null;
}

export interface NormData {
	workouts: readonly WorkoutNote[];
	tests: readonly TestNote[];
	isSameExercise(a: string, b: string): boolean;
	today: string;
}

export interface NormResult {
	value: number;
	date: string;
}

function near(km: number, target: number): boolean {
	return Math.abs(km - target) / target <= RECORD_TOLERANCE;
}

/** Výkony, které se k disciplíně počítají (testy i tréninky). */
function candidates(item: NormItem, data: NormData): NormResult[] {
	const out: NormResult[] = [];
	const same = (exercise: string) => data.isSameExercise(exercise, item.exercise);
	if (item.kind === "run_time") {
		const km = item.distance_km;
		if (!km || km <= 0) return out;
		const key = RECORD_DISTANCES.find((d) => near(d.km, km))?.key;
		for (const w of data.workouts) {
			if (w.sport !== "run" || !w.run) continue;
			const segment = key ? w.run.best_s?.[key] : undefined;
			if (segment !== undefined) out.push({ value: segment, date: w.date });
			if (w.run.distance_km !== undefined && near(w.run.distance_km, km) && w.run.moving_time_s !== undefined) {
				out.push({ value: w.run.moving_time_s, date: w.date });
			}
		}
		for (const x of data.tests) {
			if (x.test_type === "run_time" && x.distance_km !== undefined && near(x.distance_km, km)) out.push({ value: x.result, date: x.date });
		}
		return out;
	}
	const timed = item.kind === "reps" && item.time_limit_s !== undefined;
	for (const x of data.tests) {
		if (!same(x.exercise)) continue;
		if (item.kind === "hold" && x.test_type === "max_hold") out.push({ value: x.result, date: x.date });
		if (item.kind === "reps" && !timed && x.test_type === "max_reps") out.push({ value: x.result, date: x.date });
		// Test na delší čas, než norma dovoluje, se nepočítá.
		if (timed && x.test_type === "max_reps_timed" && x.time_limit_s !== undefined && x.time_limit_s <= item.time_limit_s!) {
			out.push({ value: x.result, date: x.date });
		}
	}
	for (const w of data.workouts) {
		for (const block of w.blocks) {
			if (timed) {
				if (block.type === "timed" && same(block.exercise) && block.reps !== undefined && block.sec <= item.time_limit_s!) {
					out.push({ value: block.reps, date: w.date });
				}
				continue;
			}
			if ((block.type !== "sets" && block.type !== "hold") || !same(block.exercise)) continue;
			for (const set of block.sets) {
				if (set.warmup || (set.added_kg ?? 0) < 0) continue;
				const value = item.kind === "hold" ? (set.reps === undefined ? set.sec : undefined) : set.reps;
				if (value !== undefined && value > 0) out.push({ value, date: w.date });
			}
		}
	}
	return out;
}

/** Aktuální výkon v disciplíně: nejlepší za posledních 90 dní, jinak poslední známý. */
export function normCurrent(item: NormItem, data: NormData): NormResult | null {
	const all = candidates(item, data).filter((c) => c.date <= data.today && c.value > 0);
	if (all.length === 0) return null;
	const lower = item.kind === "run_time";
	const from = addDays(data.today, -(NORM_RECENT_DAYS - 1));
	const recent = all.filter((c) => c.date >= from);
	if (recent.length > 0) return recent.reduce((best, c) => ((lower ? c.value < best.value : c.value > best.value) ? c : best));
	return all.reduce((latest, c) => (c.date > latest.date ? c : latest));
}

export interface NormItemStatus {
	item: NormItem;
	/** Požadovaná hodnota; null = v tabulce není řádek pro tohoto člověka. */
	target: number | null;
	current: NormResult | null;
	/** Splnění 0–1+ (1 = přesně splněno); null bez cíle nebo výkonu. */
	ratio: number | null;
	met: boolean;
}

export interface NormStatus {
	items: NormItemStatus[];
	/** Disciplína nejdál od splnění (bez výkonu se bere jako 0). */
	weakest: NormItemStatus | null;
	met: number;
	/** Disciplíny, které mají pro tohoto člověka cíl. */
	total: number;
	/** Splnění nejslabší disciplíny; null, když žádná disciplína nemá cíl. */
	ratio: number | null;
}

export function normStatus(norm: NormNote, profile: NormProfile, data: NormData): NormStatus {
	const items: NormItemStatus[] = norm.items.map((item) => {
		const target = normTarget(item, profile);
		const current = normCurrent(item, data);
		let ratio: number | null = null;
		if (target !== null && current !== null) ratio = item.kind === "run_time" ? target / current.value : current.value / target;
		return { item, target, current, ratio, met: ratio !== null && ratio >= 1 };
	});
	const withTarget = items.filter((i) => i.target !== null);
	const weakest = withTarget.reduce<NormItemStatus | null>((worst, i) => (worst === null || (i.ratio ?? 0) < (worst.ratio ?? 0) ? i : worst), null);
	return {
		items,
		weakest: weakest && !weakest.met ? weakest : null,
		met: withTarget.filter((i) => i.met).length,
		total: withTarget.length,
		ratio: withTarget.length > 0 ? Math.min(...withTarget.map((i) => i.ratio ?? 0)) : null,
	};
}
