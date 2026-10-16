// Spánek z ranního check-inu (SPEC 5.2): šel spát, usnul, vstal → délka.

import { minutesOfDay } from "../model/dates";

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
