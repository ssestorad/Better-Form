// Přehled (SPEC 5.4): čísla za týden / měsíc / rok a heatmapa zátěže.
// Čisté funkce bez závislosti na Obsidianu.

import type { ExerciseKind, ExerciseMeasure, Sport } from "../model/constants";
import { addDays, startOfWeek } from "../model/dates";
import type { Block, WorkoutNote } from "../model/types";
import { sessionLoad } from "./load";
import { setLoadKg } from "./oneRm";
import { translated } from "../i18n";

// ---------- Období ----------

export type PeriodKind = "week" | "month" | "year";

export interface Period {
	kind: PeriodKind;
	from: string;
	to: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Poslední den měsíce `YYYY-MM`. */
export function monthEnd(year: number, month: number): string {
	const next = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
	return addDays(next, -1);
}

/** Kalendářní týden (po–ne), měsíc nebo rok, do kterého datum patří. */
export function periodOf(kind: PeriodKind, date: string): Period {
	const [y, m] = date.split("-").map(Number) as [number, number, number];
	if (kind === "week") {
		const from = startOfWeek(date);
		return { kind, from, to: addDays(from, 6) };
	}
	if (kind === "month") return { kind, from: `${y}-${pad(m)}-01`, to: monthEnd(y, m) };
	return { kind, from: `${y}-01-01`, to: `${y}-12-31` };
}

/** Období posunuté o `steps` (záporné = dřív). */
export function shiftPeriod(period: Period, steps: number): Period {
	if (period.kind === "week") return periodOf("week", addDays(period.from, 7 * steps));
	const [y, m] = period.from.split("-").map(Number) as [number, number, number];
	if (period.kind === "year") return periodOf("year", `${y + steps}-01-01`);
	const index = y * 12 + (m - 1) + steps;
	return periodOf("month", `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`);
}

const MONTH_NAMES = translated(["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"]);

/** „29. 9. – 5. 10. 2026“, „říjen 2026“, „2026“. */
export function periodLabel(period: Period): string {
	const [fy, fm, fd] = period.from.split("-").map(Number) as [number, number, number];
	const [ty, tm, td] = period.to.split("-").map(Number) as [number, number, number];
	if (period.kind === "year") return String(fy);
	if (period.kind === "month") return `${MONTH_NAMES[fm - 1]} ${fy}`;
	return `${fd}. ${fm}. – ${td}. ${tm}. ${ty}`;
}

// ---------- Objem posilovny ----------

export interface TonnageExercise {
	kind: ExerciseKind;
	measure: ExerciseMeasure;
	bodyweight_fraction?: number;
}

export interface TonnageContext {
	info(exercise: string): TonnageExercise | undefined;
	bodyweightKg?: number;
}

function blockTonnage(block: Block, ctx: TonnageContext): number {
	const load = (exercise: string, kg: number | undefined, addedKg: number | undefined): number => {
		const info = ctx.info(exercise);
		if (!info) return 0;
		return setLoadKg({ kg, added_kg: addedKg }, info, ctx.bodyweightKg) ?? 0;
	};
	switch (block.type) {
		case "sets":
			return block.sets
				.filter((s) => !s.warmup && s.reps !== undefined)
				.reduce((sum, s) => sum + load(block.exercise, s.kg, s.added_kg) * (s.reps ?? 0), 0);
		case "emom":
			return load(block.exercise, block.kg, block.added_kg) * block.reps_per_min * (block.rounds ?? block.minutes);
		case "ladder":
			return load(block.exercise, block.kg, block.added_kg) * block.steps.reduce((s, v) => s + v, 0);
		case "timed":
			return load(block.exercise, block.kg, block.added_kg) * (block.reps ?? 0);
		case "amrap":
			return block.items.reduce((sum, item) => sum + load(item.exercise, item.kg, item.added_kg) * (item.reps ?? 0) * block.rounds, 0);
		case "complex":
			return block.items.reduce((sum, item) => sum + load(item.exercise, item.kg ?? block.kg, item.added_kg) * (item.reps ?? 0) * block.rounds, 0);
		case "hold":
			return 0;
	}
}

/**
 * Zvednutá hmotnost v tréninku (kg × opakování pracovních sérií). U cviků
 * s vlastní vahou se počítá tělesná hmotnost × podíl + přívažek; bez známé
 * hmotnosti se takové série nezapočítají.
 */
export function workoutTonnage(workout: WorkoutNote, ctx: TonnageContext): number {
	return workout.blocks.reduce((sum, block) => sum + blockTonnage(block, ctx), 0);
}

// ---------- Čísla za období ----------

export interface PeriodStats {
	workouts: number;
	bySport: Partial<Record<Sport, number>>;
	/** Dny s aspoň jedním tréninkem. */
	activeDays: number;
	durationMin: number;
	/** Zátěž sRPE v AU. */
	load: number;
	/** Tréninky bez RPE nebo délky – do zátěže se nepočítají. */
	missingLoad: number;
	runKm: number;
	swimM: number;
	tonnageKg: number;
}

/** Součty za dny `from`–`to` včetně. */
export function periodStats(workouts: readonly WorkoutNote[], from: string, to: string, ctx: TonnageContext): PeriodStats {
	const stats: PeriodStats = { workouts: 0, bySport: {}, activeDays: 0, durationMin: 0, load: 0, missingLoad: 0, runKm: 0, swimM: 0, tonnageKg: 0 };
	const days = new Set<string>();
	for (const workout of workouts) {
		if (workout.date < from || workout.date > to) continue;
		stats.workouts++;
		stats.bySport[workout.sport] = (stats.bySport[workout.sport] ?? 0) + 1;
		days.add(workout.date);
		stats.durationMin += workout.duration_min ?? 0;
		const load = sessionLoad(workout.rpe, workout.duration_min);
		if (load === null) stats.missingLoad++;
		else stats.load += load;
		if (workout.sport === "run") stats.runKm += workout.run?.distance_km ?? 0;
		if (workout.sport === "swim") stats.swimM += workout.swim?.distance_m ?? 0;
		stats.tonnageKg += workoutTonnage(workout, ctx);
	}
	stats.activeDays = days.size;
	return stats;
}

// ---------- Heatmapa ----------

export interface HeatCell {
	date: string;
	load: number;
	/** 0 = bez tréninku, 1–4 podle zátěže (kvartily dnů se zátěží). */
	level: 0 | 1 | 2 | 3 | 4;
	/** Den po `today` – nevykresluje se. */
	future: boolean;
	/** Trénink bez RPE nebo délky: zátěž není známá. */
	untracked: boolean;
}

/** Hranice 25., 50. a 75. percentilu kladných hodnot (lineární interpolace). */
export function quartiles(values: readonly number[]): [number, number, number] {
	const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
	if (sorted.length === 0) return [0, 0, 0];
	const at = (p: number) => {
		const index = (sorted.length - 1) * p;
		const lo = Math.floor(index);
		const hi = Math.ceil(index);
		return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (index - lo);
	};
	return [at(0.25), at(0.5), at(0.75)];
}

/**
 * Mřížka po týdnech (sloupec = týden po–ne), posledních `weeks` týdnů včetně
 * toho s `today`. Úroveň 1–4 podle kvartilů dnů se zátěží v zobrazeném období.
 */
export function heatmap(
	byDate: ReadonlyMap<string, number>,
	workoutDates: ReadonlySet<string>,
	today: string,
	weeks = 53,
): HeatCell[][] {
	const lastMonday = startOfWeek(today);
	const first = addDays(lastMonday, -7 * (weeks - 1));
	const loads: number[] = [];
	for (let i = 0; i < weeks * 7; i++) loads.push(byDate.get(addDays(first, i)) ?? 0);
	const [q1, q2, q3] = quartiles(loads);
	const columns: HeatCell[][] = [];
	for (let w = 0; w < weeks; w++) {
		const column: HeatCell[] = [];
		for (let d = 0; d < 7; d++) {
			const date = addDays(first, w * 7 + d);
			const load = loads[w * 7 + d]!;
			const untracked = load <= 0 && workoutDates.has(date);
			const level = load <= 0 ? (untracked ? 1 : 0) : load <= q1 ? 1 : load <= q2 ? 2 : load <= q3 ? 3 : 4;
			column.push({ date, load, level, future: date > today, untracked });
		}
		columns.push(column);
	}
	return columns;
}
