// Elektrolyty a tekutiny: referenční denní příjem (EFSA), ztráty potem a pitný
// režim kolem tréninku (ACSM 2007). Čisté funkce bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import { translated } from "../i18n";

export interface Range {
	avg: number;
	min: number;
	max: number;
}

export interface Electrolyte {
	id: string;
	name: string;
	symbol: string;
	/** Referenční denní příjem dospělého v mg (EFSA); u hořčíku se liší podle pohlaví. */
	referenceMg: { male: number; female: number };
	/** Koncentrace v potu v mg/l (Sawka 2007, přepočteno z mEq/l). */
	sweatMgPerL: Range;
	/** Krátká poznámka k řádku. */
	note: string;
}

/** Atomová hmotnost a mocenství pro přepočet mEq → mg. */
const ION = {
	na: { mass: 22.99, valence: 1 },
	k: { mass: 39.1, valence: 1 },
	cl: { mass: 35.45, valence: 1 },
	ca: { mass: 40.08, valence: 2 },
	mg: { mass: 24.31, valence: 2 },
} as const;

/** mEq/l → mg/l: mg = mEq × atomová hmotnost / mocenství. */
export function meqToMg(meq: number, ion: keyof typeof ION): number {
	return (meq * ION[ion].mass) / ION[ion].valence;
}

function sweat(ion: keyof typeof ION, avg: number, min: number, max: number): Range {
	return { avg: meqToMg(avg, ion), min: meqToMg(min, ion), max: meqToMg(max, ion) };
}

/**
 * Referenční příjem: EFSA (sodík 2,0 g, chlorid 3,1 g, draslík 3500 mg, vápník 950 mg,
 * hořčík 350 mg muži / 300 mg ženy). Pot: Sawka 2007 – sodík 35 (10–70), draslík 5 (3–15),
 * vápník 1 (0,3–2), hořčík 0,8 (0,2–1,5), chlorid 30 (5–60) mEq/l.
 */
export const ELECTROLYTES: Electrolyte[] = translated([
	{
		id: "sodium",
		name: "Sodík",
		symbol: "Na",
		referenceMg: { male: 2000, female: 2000 },
		sweatMgPerL: sweat("na", 35, 10, 70),
		note: "2 g sodíku = 5 g soli. Běžná strava ho obvykle obsahuje víc; doplňovat cíleně má smysl u tréninků nad 2 hodiny, v horku nebo při silném pocení.",
	},
	{
		id: "chloride",
		name: "Chlorid",
		symbol: "Cl",
		referenceMg: { male: 3100, female: 3100 },
		sweatMgPerL: sweat("cl", 30, 5, 60),
		note: "Přijímá se spolu se sodíkem jako sůl – zvlášť ho řešit není potřeba.",
	},
	{
		id: "potassium",
		name: "Draslík",
		symbol: "K",
		referenceMg: { male: 3500, female: 3500 },
		sweatMgPerL: sweat("k", 5, 3, 15),
		note: "Ztráty potem jsou proti dennímu příjmu malé. Zdroje: brambory, luštěniny, banány, zelenina.",
	},
	{
		id: "calcium",
		name: "Vápník",
		symbol: "Ca",
		referenceMg: { male: 950, female: 950 },
		sweatMgPerL: sweat("ca", 1, 0.3, 2),
		note: "Hodnota platí od 25 let (18–24 let: 1000 mg). Ztráty potem jsou malé.",
	},
	{
		id: "magnesium",
		name: "Hořčík",
		symbol: "Mg",
		referenceMg: { male: 350, female: 300 },
		sweatMgPerL: sweat("mg", 0.8, 0.2, 1.5),
		note: "Ztráty potem jsou velmi malé – trénink sám o sobě potřebu skoro nezvyšuje.",
	},
]);

export const ELECTROLYTE_BASIS: Basis = { sourceIds: ["efsaDrv", "sawka2007", "baker2017"], evidence: "consensus" };

/** Rychlost pocení v l/h: sportovci se obvykle pohybují mezi 0,5 a 2,0 l/h (Baker 2017, Sawka 2007). */
export const SWEAT_RATES = { low: 0.5, medium: 1.0, high: 1.5 } as const;
export type SweatLevel = keyof typeof SWEAT_RATES;

export const SWEAT_LEVEL_LABELS: Record<SweatLevel, string> = translated({
	low: "malé (0,5 l/h) – chladno, lehká zátěž",
	medium: "střední (1 l/h)",
	high: "velké (1,5 l/h) – horko, vysoká intenzita",
});

/** Odhad ztráty potu v litrech za trénink. */
export function sweatLossL(rateLPerH: number, minutes: number): number {
	return Math.max(0, rateLPerH) * (Math.max(0, minutes) / 60);
}

export type Sex = "male" | "female" | null;

export interface ElectrolyteNeed {
	electrolyte: Electrolyte;
	/** Den bez tréninku: referenční příjem v mg. */
	restMg: number;
	/** Totéž na kg hmotnosti (jen orientačně – referenční hodnoty na váze nezávisí). */
	restMgPerKg: number | null;
	/** Odhad ztráty potem za trénink v mg. */
	lossMg: Range;
	/** Den s tréninkem: referenční příjem + průměrná ztráta potem. */
	trainingMg: number;
}

/** Potřeba jednoho elektrolytu v den volna a v den s tréninkem. Bez pohlaví se bere vyšší hodnota. */
export function electrolyteNeed(e: Electrolyte, weightKg: number | null, sex: Sex, sweatL: number): ElectrolyteNeed {
	const restMg = sex === "female" ? e.referenceMg.female : e.referenceMg.male;
	const lossMg: Range = {
		avg: e.sweatMgPerL.avg * sweatL,
		min: e.sweatMgPerL.min * sweatL,
		max: e.sweatMgPerL.max * sweatL,
	};
	return {
		electrolyte: e,
		restMg,
		restMgPerKg: weightKg !== null && weightKg > 0 ? restMg / weightKg : null,
		lossMg,
		trainingMg: restMg + lossMg.avg,
	};
}

// ---------- Tekutiny (Sawka 2007) ----------

/** Před tréninkem: asi 5–7 ml/kg nejméně 4 hodiny předem. */
export const PRE_EXERCISE_ML_PER_KG = { min: 5, max: 7 } as const;
/** Rychlé doplnění po tréninku: asi 1,5 l na každý ztracený kilogram. */
export const REHYDRATION_L_PER_KG_LOST = 1.5;
/** Sodík v nápoji při delší zátěži: 20–50 mEq/l. */
export const DRINK_SODIUM_MG_PER_L = { min: meqToMg(20, "na"), max: meqToMg(50, "na") } as const;

export interface FluidPlan {
	/** Kolik vypít před tréninkem (ml); null bez hmotnosti. */
	preMl: { min: number; max: number } | null;
	/** Odhad ztráty potem (l) – odpovídá zhruba úbytku hmotnosti v kg. */
	sweatL: number;
	/** Kolik vypít po tréninku pro rychlé doplnění, kdyby během něj nepil nic (l). */
	rehydrateL: number;
}

export function fluidPlan(weightKg: number | null, sweatL: number): FluidPlan {
	return {
		preMl:
			weightKg !== null && weightKg > 0
				? { min: weightKg * PRE_EXERCISE_ML_PER_KG.min, max: weightKg * PRE_EXERCISE_ML_PER_KG.max }
				: null,
		sweatL,
		rehydrateL: sweatL * REHYDRATION_L_PER_KG_LOST,
	};
}
