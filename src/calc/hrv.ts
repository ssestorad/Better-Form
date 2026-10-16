// HRV a klidový tep proti osobní normě (SPEC 8.8): klouzavý průměr za 7 dní
// vs. průměr ± 0,5 SD za 60 dní. Čisté funkce bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import { addDays } from "../model/dates";
import { mean, sampleSd } from "./stats";

export const HRV_BASIS: Basis = { sourceIds: ["plews2012_2013"], evidence: "research" };

/**
 * Kolik měření musí být v sedmidenním okně, aby mělo smysl ho hodnotit.
 * Orientační hranice (praxe) – jedno měření za týden o trendu nic neřekne.
 */
export const MIN_WINDOW_SAMPLES = 3;

export interface Sample {
	date: string;
	value: number;
}

export interface BaselineOptions {
	/** Okno klouzavého průměru (výchozí 7 dní). */
	windowDays: number;
	/** Okno osobní normy (výchozí 60 dní). */
	baselineDays: number;
	/** Minimum měření pro normu (výchozí 14). */
	minSamples: number;
	/** Šířka normy v násobcích SD (výchozí 0,5). */
	sdFactor: number;
}

export type BaselineStatus = "below" | "within" | "above";

export type Baseline =
	| {
			ready: false;
			/** "baseline" = málo měření pro normu, "window" = málo měření v posledních dnech. */
			reason: "baseline" | "window";
			have: number;
			need: number;
	  }
	| {
			ready: true;
			/** Klouzavý průměr za okno. */
			current: number;
			mean: number;
			sd: number;
			low: number;
			high: number;
			status: BaselineStatus;
			samples: number;
	  };

function inRange(samples: readonly Sample[], from: string, to: string): number[] {
	return samples.filter((s) => s.date >= from && s.date <= to && Number.isFinite(s.value)).map((s) => s.value);
}

/**
 * Klouzavý průměr za `windowDays` proti normě (průměr ± `sdFactor` × SD za
 * `baselineDays`), obojí k datu `today` včetně. Hodnoty se před výpočtem
 * převedou funkcí `transform` (u HRV přirozený logaritmus).
 */
export function baseline(
	samples: readonly Sample[],
	today: string,
	options: BaselineOptions,
	transform: (value: number) => number = (v) => v,
): Baseline {
	const all = inRange(samples, addDays(today, -(options.baselineDays - 1)), today).map(transform);
	if (all.length < options.minSamples) return { ready: false, reason: "baseline", have: all.length, need: options.minSamples };
	const window = inRange(samples, addDays(today, -(options.windowDays - 1)), today).map(transform);
	if (window.length < MIN_WINDOW_SAMPLES) return { ready: false, reason: "window", have: window.length, need: MIN_WINDOW_SAMPLES };
	const avg = mean(all)!;
	const sd = sampleSd(all) ?? 0;
	const current = mean(window)!;
	const low = avg - options.sdFactor * sd;
	const high = avg + options.sdFactor * sd;
	return {
		ready: true,
		current,
		mean: avg,
		sd,
		low,
		high,
		status: current < low ? "below" : current > high ? "above" : "within",
		samples: all.length,
	};
}

/** lnRMSSD – s HRV se pracuje v logaritmu (rozdělení rMSSD je šikmé). */
export function hrvBaseline(samples: readonly Sample[], today: string, options: BaselineOptions): Baseline {
	return baseline(
		samples.filter((s) => s.value > 0),
		today,
		options,
		Math.log,
	);
}

export interface BaselinePoint {
	date: string;
	/** Měření toho dne (po převodu), nebo null. */
	value: number | null;
	current: number | null;
	low: number | null;
	high: number | null;
	status: BaselineStatus | null;
}

/** Vývoj po dnech od `from` do `to` – pro graf trendu s normálním pásmem. */
export function baselineSeries(
	samples: readonly Sample[],
	from: string,
	to: string,
	options: BaselineOptions,
	transform: (value: number) => number = (v) => v,
): BaselinePoint[] {
	const byDate = new Map(samples.map((s) => [s.date, s.value]));
	const out: BaselinePoint[] = [];
	for (let date = from; date <= to; date = addDays(date, 1)) {
		const raw = byDate.get(date);
		const b = baseline(samples, date, options, transform);
		out.push({
			date,
			value: raw !== undefined && Number.isFinite(raw) ? transform(raw) : null,
			current: b.ready ? b.current : null,
			low: b.ready ? b.low : null,
			high: b.ready ? b.high : null,
			status: b.ready ? b.status : null,
		});
	}
	return out;
}

/** Kolik z posledních `days` dní (včetně `today`) byl klouzavý průměr v daném stavu. */
export function daysInStatus(
	samples: readonly Sample[],
	today: string,
	days: number,
	status: BaselineStatus,
	options: BaselineOptions,
	transform: (value: number) => number = (v) => v,
): number {
	return baselineSeries(samples, addDays(today, -(days - 1)), today, options, transform).filter((p) => p.status === status).length;
}
