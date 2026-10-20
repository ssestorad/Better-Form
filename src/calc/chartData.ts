// Řady pro grafy na kartě Přehled (SPEC 5.4). Každá řada má jednu hodnotu na den
// zobrazeného období (null = ten den nic). Bez závislosti na Obsidianu.

import { addDays, daysBetween } from "../model/dates";
import type { DayNote, WorkoutNote } from "../model/types";
import { fitnessSeries } from "./fitness";
import { baselineSeries, type BaselineOptions, type Sample } from "./hrv";
import { runPacePoints } from "./performance";
import type { SessionBest } from "./records";
import { nightMin } from "./sleep";

/** Všechny dny od `from` do `to` včetně. */
export function dateRange(from: string, to: string): string[] {
	const days = daysBetween(from, to);
	const out: string[] = [];
	for (let i = 0; i <= days; i++) out.push(addDays(from, i));
	return out;
}

export interface LoadChart {
	load: number[];
	ctl: number[];
	atl: number[];
	tsb: number[];
}

/** Denní zátěž a model kondice / únavy / formy pro dané dny. */
export function loadChart(byDate: ReadonlyMap<string, number>, dates: readonly string[], ctlDays: number, atlDays: number): LoadChart {
	const out: LoadChart = { load: dates.map((d) => byDate.get(d) ?? 0), ctl: [], atl: [], tsb: [] };
	if (dates.length === 0) return out;
	const series = new Map(fitnessSeries(byDate, dates[0]!, dates[dates.length - 1]!, ctlDays, atlDays).map((p) => [p.date, p]));
	for (const date of dates) {
		const point = series.get(date);
		out.ctl.push(point?.ctl ?? 0);
		out.atl.push(point?.atl ?? 0);
		out.tsb.push(point?.tsb ?? 0);
	}
	return out;
}

/** Tempo běhu v s/km po dnech (víc běhů v jednom dni: celkový čas / celková vzdálenost). */
export function paceChart(workouts: readonly WorkoutNote[], dates: readonly string[]): (number | null)[] {
	const byDate = new Map(runPacePoints(workouts).map((p) => [p.date, p.value]));
	return dates.map((date) => byDate.get(date) ?? null);
}

/** Průměrná kadence dne (kroky/min), vážená časem běhu; null = den bez kadence. */
export function cadenceChart(workouts: readonly WorkoutNote[], dates: readonly string[]): (number | null)[] {
	const totals = new Map<string, { sum: number; weight: number }>();
	for (const workout of workouts) {
		const cadence = workout.sport === "run" ? workout.run?.cadence_spm : undefined;
		if (cadence === undefined || cadence <= 0) continue;
		const weight = workout.run?.moving_time_s ?? 1;
		const day = totals.get(workout.date) ?? { sum: 0, weight: 0 };
		day.sum += cadence * weight;
		day.weight += weight;
		totals.set(workout.date, day);
	}
	return dates.map((date) => {
		const day = totals.get(date);
		return day ? day.sum / day.weight : null;
	});
}

export interface OneRmLine {
	name: string;
	values: (number | null)[];
}

/** Odhad 1RM cviků, které se v období cvičily nejčastěji (nejvýš `top` čar, aspoň 2 body). */
export function oneRmChart(series: ReadonlyMap<string, readonly SessionBest[]>, dates: readonly string[], top = 3): OneRmLine[] {
	if (dates.length === 0) return [];
	const from = dates[0]!;
	const to = dates[dates.length - 1]!;
	const candidates: { name: string; byDate: Map<string, number> }[] = [];
	for (const [name, sessions] of series) {
		const byDate = new Map<string, number>();
		for (const s of sessions) if (s.oneRm !== undefined && s.date >= from && s.date <= to) byDate.set(s.date, s.oneRm);
		if (byDate.size >= 2) candidates.push({ name, byDate });
	}
	return candidates
		.sort((a, b) => b.byDate.size - a.byDate.size || a.name.localeCompare(b.name, "cs"))
		.slice(0, top)
		.map(({ name, byDate }) => ({ name, values: dates.map((d) => byDate.get(d) ?? null) }));
}

/** Délka spánku v hodinách po dnech. */
export function sleepChart(days: readonly DayNote[], dates: readonly string[]): (number | null)[] {
	const byDate = new Map<string, number>();
	for (const day of days) {
		const minutes = nightMin(day.sleep);
		if (minutes !== null) byDate.set(day.date, minutes / 60);
	}
	return dates.map((d) => byDate.get(d) ?? null);
}

export interface HrvChart {
	/** Měření dne v ms. */
	value: (number | null)[];
	/** Klouzavý průměr za 7 dní (geometrický, v ms). */
	current: (number | null)[];
	/** Normální pásmo v ms. */
	low: (number | null)[];
	high: (number | null)[];
}

/** HRV: počítá se v lnRMSSD, do grafu se převádí zpět na milisekundy. */
export function hrvChart(samples: readonly Sample[], dates: readonly string[], options: BaselineOptions): HrvChart {
	const out: HrvChart = { value: [], current: [], low: [], high: [] };
	if (dates.length === 0) return out;
	const positive = samples.filter((s) => s.value > 0);
	const back = (v: number | null) => (v === null ? null : Math.exp(v));
	for (const point of baselineSeries(positive, dates[0]!, dates[dates.length - 1]!, options, Math.log)) {
		out.value.push(back(point.value));
		out.current.push(back(point.current));
		out.low.push(back(point.low));
		out.high.push(back(point.high));
	}
	return out;
}

/** Měření rMSSD a klidového tepu z denních poznámek. */
export function daySamples(days: readonly DayNote[], pick: (day: DayNote) => number | undefined): Sample[] {
	const out: Sample[] = [];
	for (const day of days) {
		const value = pick(day);
		if (value !== undefined && Number.isFinite(value)) out.push({ date: day.date, value });
	}
	return out.sort((a, b) => a.date.localeCompare(b.date));
}
