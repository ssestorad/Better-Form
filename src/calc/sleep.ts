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
	const angle = (m: number) => (m / DAY_MIN) * 2 * Math.PI;
	const meanAngle = Math.atan2(
		minutes.reduce((sum, m) => sum + Math.sin(angle(m)), 0),
		minutes.reduce((sum, m) => sum + Math.cos(angle(m)), 0),
	);
	const center = (meanAngle / (2 * Math.PI)) * DAY_MIN;
	const half = DAY_MIN / 2;
	return sampleSd(minutes.map((m) => ((((m - center + half) % DAY_MIN) + DAY_MIN) % DAY_MIN) - half));
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
