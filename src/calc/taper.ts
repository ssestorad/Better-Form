// Ladění formy před závodem (taper). Čisté funkce bez závislosti na Obsidianu.
// Výzkum: nejlépe asi 2 týdny, objem postupně snížit o 41–60 %, intenzitu i počet
// tréninků nechat (Bosquet 2007, Wang 2023); počet tréninků ubrat nejvýš o 20 %
// (Mujika & Padilla 2003). Rozdělení na dva týdny (60–70 % a 40–50 % obvyklého
// objemu) je praxe – průměr vychází na snížení zhruba o 40–50 %.

import type { Basis } from "../evidence/sources";
import { addDays, daysBetween } from "../model/dates";

export const TAPER_BASIS: Basis = { sourceIds: ["bosquet2007", "wang2023taper", "mujika2003"], evidence: "research" };

/** Délka ladění ve dnech (2 týdny před závodem). */
export const TAPER_DAYS = 14;

export interface TaperWeek {
	from: string;
	to: string;
	/** Doporučený objem běhu v km (rozpětí). */
	minKm: number;
	maxKm: number;
}

export interface TaperPlan {
	race: string;
	/** Dny do závodu (0 = dnes). */
	daysLeft: number;
	/** Obvyklý týdenní objem, ze kterého se počítá. */
	weeklyKm: number;
	weeks: [TaperWeek, TaperWeek];
}

/**
 * Plán ladění pro závod v den `race`: dva týdny před ním (bez dne závodu).
 * `weeklyKm` je obvyklý týdenní objem před laděním. Null, když je závod
 * minulý, víc než 3 týdny daleko, nebo chybí objem.
 */
export function taperPlan(race: string, today: string, weeklyKm: number): TaperPlan | null {
	const daysLeft = daysBetween(today, race);
	if (daysLeft < 0 || daysLeft > TAPER_DAYS + 7 || !(weeklyKm > 0)) return null;
	const start = addDays(race, -TAPER_DAYS);
	const round = (v: number) => Math.round(v * 10) / 10;
	return {
		race,
		daysLeft,
		weeklyKm,
		weeks: [
			{ from: start, to: addDays(start, 6), minKm: round(weeklyKm * 0.6), maxKm: round(weeklyKm * 0.7) },
			{ from: addDays(start, 7), to: addDays(race, -1), minKm: round(weeklyKm * 0.4), maxKm: round(weeklyKm * 0.5) },
		],
	};
}
