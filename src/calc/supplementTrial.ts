// Osobní test suplementu (N-of-1): ukazatel za 4 týdny před užíváním proti období užívání.
// Čisté funkce bez závislosti na Obsidianu.

import { addDays, daysBetween } from "../model/dates";
import { translated } from "../i18n";

/** Ukazatele z ranního check-inu, které jde u suplementu sledovat. */
export const TRIAL_METRICS = ["sleep_quality", "sleep_duration", "mood", "stress", "fatigue", "soreness", "motivation"] as const;
export type TrialMetric = (typeof TRIAL_METRICS)[number];

export const TRIAL_METRIC_LABELS: Record<TrialMetric, string> = translated({
	sleep_quality: "sleep quality (1–5)",
	sleep_duration: "sleep duration (h)",
	mood: "mood (1–5)",
	stress: "stress (1–5, 5 = calm)",
	fatigue: "fatigue (1–5, 5 = rested)",
	soreness: "muscles (1–5, 5 = no soreness)",
	motivation: "desire to train (1–5)",
});

/** Délka srovnávaných období a minimum měření v každém (heuristika, praxe). */
export const TRIAL_DAYS = 28;
export const TRIAL_MAX_DAYS = 56;
export const TRIAL_MIN_SAMPLES = 14;

export interface TrialDay {
	date: string;
	sleep: { quality?: number; duration_min?: number };
	check_in: { mood?: number; stress?: number; fatigue?: number; soreness?: number; motivation?: number };
}

function metricValue(day: TrialDay, metric: TrialMetric): number | undefined {
	switch (metric) {
		case "sleep_quality":
			return day.sleep.quality;
		case "sleep_duration":
			return day.sleep.duration_min !== undefined ? day.sleep.duration_min / 60 : undefined;
		default:
			return day.check_in[metric];
	}
}

export type TrialResult =
	| { ready: false; /** Dny užívání od začátku. */ daysDuring: number; samplesDuring: number; samplesBefore: number }
	| { ready: true; before: number; during: number; diff: number; samplesBefore: number; samplesDuring: number; daysDuring: number };

/** Jedno měření pro osobní test: den a hodnota (průměr check-inu, 1RM, tempo…). */
export interface TrialPoint {
	date: string;
	value: number;
}

/** U výkonu stačí méně měření – tréninků je méně než ranních check-inů (heuristika, praxe). */
export const TRIAL_MIN_SESSIONS = 3;

/**
 * Srovná měření za období užívání (od `since`, nejvýš 8 týdnů) s 4 týdny
 * před ním. Výsledek je jen orientační – bez placeba a zaslepení ho ovlivní
 * i očekávání, sezóna a trénink.
 */
export function comparePeriods(points: readonly TrialPoint[], since: string, today: string, minSamples: number): TrialResult {
	const beforeFrom = addDays(since, -TRIAL_DAYS);
	const duringTo = addDays(since, TRIAL_MAX_DAYS - 1) < today ? addDays(since, TRIAL_MAX_DAYS - 1) : today;
	const daysDuring = Math.max(0, daysBetween(since, duringTo) + 1);
	const before: number[] = [];
	const during: number[] = [];
	for (const { date, value } of points) {
		if (!Number.isFinite(value)) continue;
		if (date >= beforeFrom && date < since) before.push(value);
		else if (date >= since && date <= duringTo) during.push(value);
	}
	if (daysDuring < TRIAL_DAYS || before.length < minSamples || during.length < minSamples) {
		return { ready: false, daysDuring, samplesDuring: during.length, samplesBefore: before.length };
	}
	const avg = (list: number[]) => list.reduce((s, v) => s + v, 0) / list.length;
	const b = avg(before);
	const d = avg(during);
	return { ready: true, before: b, during: d, diff: d - b, samplesBefore: before.length, samplesDuring: during.length, daysDuring };
}

/** Osobní test ukazatele z ranního check-inu (aspoň 14 měření v každém období). */
export function personalTrial(days: readonly TrialDay[], since: string, today: string, metric: TrialMetric): TrialResult {
	const points = days.flatMap((day) => {
		const value = metricValue(day, metric);
		return value === undefined ? [] : [{ date: day.date, value }];
	});
	return comparePeriods(points, since, today, TRIAL_MIN_SAMPLES);
}
