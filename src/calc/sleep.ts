// Spánek z ranního check-inu (SPEC 5.2): šel spát, usnul, vstal → délka.

import type { Basis } from "../evidence/sources";
import { addDays, minutesOfDay } from "../model/dates";
import type { DayNote, SleepData } from "../model/types";
import { mean, sampleSd } from "./stats";

const DAY_MIN = 24 * 60;

/** Minuty od `start` do `end`; přes půlnoc se počítá do dalšího dne. Stejný čas = 0. */
export function minutesBetween(start: string, end: string): number | null {
	const a = minutesOfDay(start);
	const b = minutesOfDay(end);
	if (a === null || b === null) return null;
	return (b - a + DAY_MIN) % DAY_MIN;
}

export interface SleepTimes {
	bedtime?: string;
	sleep_onset?: string;
	wake?: string;
}

/**
 * Délka spánku v minutách: od usnutí (nebo od ulehnutí, když odhad usnutí chybí)
 * do probuzení. Když nejde spočítat, vrátí null.
 */
export function sleepDurationMin(times: SleepTimes): number | null {
	const start = times.sleep_onset ?? times.bedtime;
	if (!start || !times.wake) return null;
	const minutes = minutesBetween(start, times.wake);
	return minutes === null || minutes === 0 ? null : minutes;
}

/** Délka noci v minutách: zapsaná, jinak spočítaná z časů; nula nebo chybí = null. */
export function nightMin(sleep: SleepData): number | null {
	const minutes = sleep.duration_min ?? sleepDurationMin(sleep);
	return minutes !== null && minutes > 0 ? minutes : null;
}

/** Spánkový dluh za posledních 7 nocí (dnešní poznámka = minulá noc). */
export const SLEEP_DEBT_NIGHTS = 7;
/** Pod tolik nocí s daty se dluh neukazuje – „sbírám data“. */
export const SLEEP_DEBT_MIN_NIGHTS = 4;
/** Pravidelnost časů ze 14 nocí, aspoň ze 4 zapsaných časů. */
export const SLEEP_REGULARITY_NIGHTS = 14;
export const SLEEP_REGULARITY_MIN_NIGHTS = 4;

/** Cíl délky spánku (Watson 2015) a důležitost pravidelných časů (Sletten 2023, konsenzus NSF). */
export const SLEEP_WEEK_BASIS: Basis = { sourceIds: ["watson2015", "sletten2023"], evidence: "consensus" };

export interface SleepWeek {
	/** Nocí s délkou spánku z posledních 7. */
	nights: number;
	/** Součet minut chybějících do cíle jen za noci s daty (`nights` z 7); null = málo dat. */
	debtMin: number | null;
	averageMin: number | null;
	/** Nocí kratších než cíl. */
	shortNights: number;
	/** Směrodatná odchylka času usnutí a probuzení v minutách (14 nocí); null = málo dat. */
	onsetSpreadMin: number | null;
	wakeSpreadMin: number | null;
	/** Nocí se zapsaným časem usnutí a probuzení (14 nocí) – pro „sbírám data“. */
	onsetNights: number;
	wakeNights: number;
}

/**
 * Rozptyl časů dne v minutách: každý čas se vezme jako nejbližší posun (±12 h) od kruhového
 * průměru, takže 23:30 a 0:30 jsou od sebe hodina, ne 23 hodin – i když je jedna noc výjimka.
 */
export function clockSpreadMin(times: readonly string[]): number | null {
	const minutes = times.map(minutesOfDay).filter((m): m is number => m !== null);
	if (minutes.length < 2) return null;
	const center = clockMeanMin(times)!;
	const half = DAY_MIN / 2;
	return sampleSd(minutes.map((m) => ((((m - center + half) % DAY_MIN) + DAY_MIN) % DAY_MIN) - half));
}

/** Kruhový průměr časů dne v minutách 0–1439 (23:30 a 0:30 → 0:00); prázdný seznam = null. */
export function clockMeanMin(times: readonly string[]): number | null {
	const minutes = times.map(minutesOfDay).filter((m): m is number => m !== null);
	if (minutes.length === 0) return null;
	const angle = (m: number) => (m / DAY_MIN) * 2 * Math.PI;
	const meanAngle = Math.atan2(
		minutes.reduce((sum, m) => sum + Math.sin(angle(m)), 0),
		minutes.reduce((sum, m) => sum + Math.cos(angle(m)), 0),
	);
	return ((((meanAngle / (2 * Math.PI)) * DAY_MIN) % DAY_MIN) + DAY_MIN) % DAY_MIN;
}

/** Týden spánku k dnešku: dluh proti cíli a pravidelnost časů usnutí a probuzení. */
export function sleepWeek(days: readonly DayNote[], today: string, targetMin: number): SleepWeek {
	const byDate = new Map(days.map((d) => [d.date, d.sleep]));
	const last = (count: number) => Array.from({ length: count }, (_, i) => byDate.get(addDays(today, -i))).filter((s): s is SleepData => s !== undefined);

	const durations = last(SLEEP_DEBT_NIGHTS).map(nightMin).filter((m): m is number => m !== null);
	const ready = durations.length >= SLEEP_DEBT_MIN_NIGHTS;

	const recent = last(SLEEP_REGULARITY_NIGHTS);
	const onsets = recent.flatMap((s) => s.sleep_onset ?? s.bedtime ?? []);
	const wakes = recent.flatMap((s) => s.wake ?? []);
	const spread = (times: string[]) => (times.length >= SLEEP_REGULARITY_MIN_NIGHTS ? clockSpreadMin(times) : null);

	return {
		nights: durations.length,
		debtMin: ready ? durations.reduce((sum, m) => sum + Math.max(0, targetMin - m), 0) : null,
		averageMin: ready ? mean(durations) : null,
		shortNights: durations.filter((m) => m < targetMin).length,
		onsetSpreadMin: spread(onsets),
		wakeSpreadMin: spread(wakes),
		onsetNights: onsets.length,
		wakeNights: wakes.length,
	};
}

/** Doporučený čas usnutí: z obvyklého vstávání (14 nocí, aspoň 4) mínus cíl délky spánku. */
export const BEDTIME_MIN_NIGHTS = 4;

export interface BedtimeAdvice {
	/** Nocí se zapsaným vstáváním za posledních 14 – pro „sbírám data“. */
	wakeNights: number;
	/** Obvyklé vstávání „HH:MM“; null = málo dat. */
	wake: string | null;
	/** Usnout nejpozději „HH:MM“; null = málo dat. */
	onset: string | null;
	/** Do postele „HH:MM“ podle obvyklé doby usínání; null = málo nocí s ulehnutím i usnutím. */
	bed: string | null;
	latencyMin: number | null;
}

/** „HH:MM“ z minut dne, zaokrouhleno na 5 minut (doporučení nepotřebuje minutovou přesnost). */
function clockOf(minutes: number): string {
	const rounded = ((Math.round(minutes / 5) * 5) % DAY_MIN + DAY_MIN) % DAY_MIN;
	return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

/**
 * Kdy jít dnes spát: obvyklý čas vstávání (kruhový průměr) mínus cíl délky spánku; čas do postele
 * ještě o obvyklou dobu od ulehnutí do usnutí. Pravidelný čas, žádné splácení dluhu dřívějším
 * spaním – na to ověřený zdroj nemáme. Základ SLEEP_WEEK_BASIS (cíl délky a pravidelnost).
 */
export function bedtimeAdvice(days: readonly DayNote[], today: string, targetMin: number): BedtimeAdvice {
	const byDate = new Map(days.map((d) => [d.date, d.sleep]));
	const recent = Array.from({ length: SLEEP_REGULARITY_NIGHTS }, (_, i) => byDate.get(addDays(today, -i))).filter((s): s is SleepData => s !== undefined);
	const wakes = recent.flatMap((s) => s.wake ?? []);
	const latencies = recent.flatMap((s) => (s.bedtime && s.sleep_onset ? (minutesBetween(s.bedtime, s.sleep_onset) ?? []) : []));
	const wakeMin = wakes.length >= BEDTIME_MIN_NIGHTS ? clockMeanMin(wakes) : null;
	if (wakeMin === null) return { wakeNights: wakes.length, wake: null, onset: null, bed: null, latencyMin: null };
	const onsetMin = wakeMin - targetMin;
	const latencyMin = latencies.length >= BEDTIME_MIN_NIGHTS ? Math.round(mean(latencies)!) : null;
	return {
		wakeNights: wakes.length,
		wake: clockOf(wakeMin),
		onset: clockOf(onsetMin),
		bed: latencyMin === null ? null : clockOf(onsetMin - latencyMin),
		latencyMin,
	};
}
