// Kondice, únava, forma (SPEC 8.2), poměr akutní/chronické zátěže (8.3),
// monotónnost a strain (8.4). Čisté funkce bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import { addDays, daysBetween } from "../model/dates";
import { dailyLoadSeries } from "./load";
import { mean, sampleSd } from "./stats";

/** Model trendu, ne přesná předpověď. */
export const FITNESS_BASIS: Basis = { sourceIds: ["banister"], evidence: "research" };

/** První den, kdy je zapsaná nějaká zátěž; null bez dat. */
export function firstLoadDate(byDate: ReadonlyMap<string, number>): string | null {
	let first: string | null = null;
	for (const date of byDate.keys()) if (first === null || date < first) first = date;
	return first;
}

/** Počet dní od první zapsané zátěže do `today` včetně; 0 bez dat. */
export function loadDataDays(byDate: ReadonlyMap<string, number>, today: string): number {
	const first = firstLoadDate(byDate);
	if (first === null || first > today) return 0;
	return daysBetween(first, today) + 1;
}

export interface FitnessPoint {
	date: string;
	load: number;
	/** Kondice – dlouhodobý průměr zátěže. */
	ctl: number;
	/** Únava – krátkodobý průměr zátěže. */
	atl: number;
	/** Forma = kondice − únava. */
	tsb: number;
}

/**
 * Exponenciálně vážené průměry denní zátěže s časovou konstantou τ:
 * `X(t) = X(t−1) + (zátěž(t) − X(t−1)) × (1 − e^(−1/τ))`, začíná se od nuly
 * v den první zapsané zátěže. Vrátí body od `from` do `to` včetně.
 */
export function fitnessSeries(
	byDate: ReadonlyMap<string, number>,
	from: string,
	to: string,
	ctlDays: number,
	atlDays: number,
): FitnessPoint[] {
	const first = firstLoadDate(byDate);
	if (first === null || to < from) return [];
	const start = first < from ? first : from;
	const kCtl = 1 - Math.exp(-1 / ctlDays);
	const kAtl = 1 - Math.exp(-1 / atlDays);
	let ctl = 0;
	let atl = 0;
	const out: FitnessPoint[] = [];
	for (const { date, load } of dailyLoadSeries(byDate as Map<string, number>, start, to)) {
		ctl += (load - ctl) * kCtl;
		atl += (load - atl) * kAtl;
		if (date >= from) out.push({ date, load, ctl, atl, tsb: ctl - atl });
	}
	return out;
}

export interface Acwr {
	acute: number;
	chronic: number;
	ratio: number;
}

/**
 * ACWR z exponenciálně vážených průměrů (Williams 2017): λ = 2 / (N + 1),
 * `EWMA(t) = zátěž(t) × λ + (1 − λ) × EWMA(t−1)`, první hodnota = první zátěž.
 * Null, dokud není dat aspoň na chronické okno nebo je chronická zátěž nulová.
 */
export function acwr(byDate: ReadonlyMap<string, number>, today: string, acuteDays: number, chronicDays: number): Acwr | null {
	const first = firstLoadDate(byDate);
	if (first === null || loadDataDays(byDate, today) < chronicDays) return null;
	const la = 2 / (acuteDays + 1);
	const lc = 2 / (chronicDays + 1);
	let acute = 0;
	let chronic = 0;
	dailyLoadSeries(byDate as Map<string, number>, first, today).forEach(({ load }, i) => {
		acute = i === 0 ? load : load * la + (1 - la) * acute;
		chronic = i === 0 ? load : load * lc + (1 - lc) * chronic;
	});
	if (chronic <= 0) return null;
	return { acute, chronic, ratio: acute / chronic };
}

/** Když je zátěž každý den stejná (odchylka 0), monotónnost se zastaví na této hodnotě. */
export const MONOTONY_CAP = 10;

export interface Monotony {
	/** Průměr denní zátěže / směrodatná odchylka (výběrová) za 7 dní. */
	monotony: number;
	/** Součet zátěže za 7 dní × monotónnost. */
	strain: number;
	weekLoad: number;
}

/**
 * Monotónnost a strain za posledních `days` dní včetně `today` (dny bez tréninku = 0).
 * Null bez zátěže v okně nebo když data nepokrývají celé okno.
 */
export function monotony(byDate: ReadonlyMap<string, number>, today: string, days = 7): Monotony | null {
	if (loadDataDays(byDate, today) < days) return null;
	const loads: number[] = [];
	for (let i = days - 1; i >= 0; i--) loads.push(byDate.get(addDays(today, -i)) ?? 0);
	const avg = mean(loads) ?? 0;
	if (avg <= 0) return null;
	const sd = sampleSd(loads) ?? 0;
	const value = sd > 0 ? Math.min(MONOTONY_CAP, avg / sd) : MONOTONY_CAP;
	const weekLoad = loads.reduce((s, v) => s + v, 0);
	return { monotony: value, strain: weekLoad * value, weekLoad };
}

/**
 * Kolik z posledních `days` dní byla forma (TSB) pod −`pct` % kondice (CTL).
 * Podklad pro návrh odlehčeného týdne (SPEC 9.4).
 */
export function lowFormDays(series: readonly FitnessPoint[], days: number, pct: number): number {
	return series.slice(-days).filter((p) => p.ctl > 0 && p.tsb < (-pct / 100) * p.ctl).length;
}
