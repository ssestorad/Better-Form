// Menstruační cyklus (modul Menstruační cyklus): den cyklu a průměrná délka ze zapsaných dnů
// menstruace. Ovulace, fáze ani další menstruace se z kalendáře neodhadují – odhad je nespolehlivý
// a plánování tréninku podle fáze nemá oporu (výzkumná karta menstrual_cycle).

import type { Basis } from "../evidence/sources";
import { daysBetween } from "../model/dates";
import type { DayNote } from "../model/types";
import { mean } from "./stats";

/** Prostý počet dní ze zápisu – praxe; k tréninku odkazuje na meta-analýzu McNulty 2020. */
export const CYCLE_BASIS: Basis = { sourceIds: ["mcnulty2020"], evidence: "practice" };
/** Den menstruace po aspoň tolika dnech bez ní začíná nový cyklus (kratší mezera = nezapsaný den). */
export const CYCLE_GAP_DAYS = 2;
/** Průměrná délka až z tolika celých cyklů. */
export const CYCLE_MIN_CYCLES = 2;

export interface CycleState {
	/** Den cyklu (1 = první den menstruace); null = ještě žádný zapsaný začátek. */
	day: number | null;
	/** Začátek posledního cyklu. */
	start: string | null;
	/** Celých cyklů (od začátku k dalšímu začátku). */
	cycles: number;
	/** Průměrná délka cyklu ve dnech; null = méně než CYCLE_MIN_CYCLES celých cyklů. */
	averageLength: number | null;
}

/** Stav cyklu k dnešku ze dnů s `period: true`. */
export function cycleState(days: readonly DayNote[], today: string): CycleState {
	const periods = days.filter((d) => d.period === true && d.date <= today).map((d) => d.date).sort();
	const starts = periods.filter((date, i) => i === 0 || daysBetween(periods[i - 1]!, date) > CYCLE_GAP_DAYS);
	const lengths = starts.slice(1).map((date, i) => daysBetween(starts[i]!, date));
	const start = starts.at(-1) ?? null;
	return {
		day: start === null ? null : daysBetween(start, today) + 1,
		start,
		cycles: lengths.length,
		averageLength: lengths.length >= CYCLE_MIN_CYCLES ? Math.round(mean(lengths)!) : null,
	};
}
