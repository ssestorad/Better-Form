// Tabulky v Suplementech: kofein, doporučený příjem a horní limity, co nebrat spolu.
// Čisté funkce a data bez závislosti na Obsidianu.

import type { Basis, SourceId } from "../evidence/sources";
import { translated } from "../i18n";
import type { Sex } from "./electrolytes";
import { UPPER_LIMITS, type SubstanceTotal } from "./supplements";

// ---------- Kofein ----------

export interface CaffeineSource {
	id: string;
	name: string;
	/** Porce, např. „60 ml“. */
	amount: string;
	mg: number;
}

/** Obsah kofeinu v běžných porcích podle EFSA (shrnutí EUFIC); skutečný obsah kávy a čokolády kolísá. */
export const CAFFEINE_SOURCES: CaffeineSource[] = translated([
	{ id: "espresso", name: "Espresso", amount: "60 ml", mg: 80 },
	{ id: "filter", name: "Filter coffee", amount: "200 ml", mg: 90 },
	{ id: "tea", name: "Tea", amount: "220 ml", mg: 50 },
	{ id: "energy", name: "Energy drink", amount: "250 ml", mg: 80 },
	{ id: "cola", name: "Cola", amount: "355 ml", mg: 40 },
	{ id: "dark", name: "Plain chocolate", amount: "50 g", mg: 25 },
	{ id: "milk", name: "Milk chocolate", amount: "50 g", mg: 10 },
]);

/** EFSA 2015: bezpečná jednorázová a denní dávka pro zdravé dospělé (ne v těhotenství – tam 200 mg denně). */
export const CAFFEINE_SAFE_MG = { single: 200, daily: 400, pregnancy: 200 } as const;

/** Gardiner 2023: nejmenší odstup od ulehnutí, aby se nezkrátil spánek. */
export const CAFFEINE_BEFORE_BED: { mg: number; hours: number }[] = [
	{ mg: 107, hours: 8.8 },
	{ mg: 217.5, hours: 13.2 },
];

export const CAFFEINE_TABLE_BASIS: Basis = { sourceIds: ["efsaCaffeine2015", "eufic2015", "gardiner2023"], evidence: "consensus" };

/** Kolik porcí se vejde do limitu (zaokrouhleno dolů). */
export function servingsWithin(limitMg: number, perServingMg: number): number {
	return perServingMg > 0 ? Math.floor(limitMg / perServingMg + 1e-9) : 0;
}

/** Nejpozdější čas („HH:MM“) dávky, když se jde spát v `bedtimeMin` minut po půlnoci a odstup je `hours` hodin. */
export function latestBefore(bedtimeMin: number, hours: number): string {
	const minutes = (((Math.round(bedtimeMin) - Math.round(hours * 60)) % 1440) + 1440) % 1440;
	return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// ---------- Doporučený příjem a horní limity ----------

export interface ReferenceIntake {
	/** ID látky v katalogu suplementů. */
	id: string;
	name: string;
	/** Jednotka zobrazení; hodnoty jsou v mg. */
	unit: "mg" | "µg";
	/** Přiměřený příjem (AI) – data na doporučený příjem (PRI, pokryje 97,5 % lidí) nestačí. */
	adequate?: boolean;
	/** Rozmezí v mg pro muže a ženy (u zinku podle fytátů ve stravě). */
	maleMg: [number, number];
	femaleMg: [number, number];
	note?: string;
}

/** Referenční hodnoty pro dospělé podle EFSA (souhrnná zpráva 2017, aktualizace 2019). */
export const REFERENCE_INTAKES: ReferenceIntake[] = translated([
	{ id: "vitamin_a", name: "Vitamin A", unit: "µg", maleMg: [0.75, 0.75], femaleMg: [0.65, 0.65] },
	{ id: "vitamin_d", name: "Vitamin D", unit: "µg", adequate: true, maleMg: [0.015, 0.015], femaleMg: [0.015, 0.015], note: "That is 600 IU." },
	{ id: "vitamin_e", name: "Vitamin E", unit: "mg", adequate: true, maleMg: [13, 13], femaleMg: [11, 11] },
	{ id: "vitamin_k", name: "Vitamin K", unit: "µg", adequate: true, maleMg: [0.07, 0.07], femaleMg: [0.07, 0.07] },
	{ id: "vitamin_c", name: "Vitamin C", unit: "mg", maleMg: [110, 110], femaleMg: [95, 95] },
	{ id: "vitamin_b", name: "Vitamin B6", unit: "mg", maleMg: [1.7, 1.7], femaleMg: [1.6, 1.6], note: "The B-complex row compares only vitamin B6." },
	{ id: "calcium", name: "Calcium", unit: "mg", maleMg: [950, 950], femaleMg: [950, 950], note: "At 18–24 years 1000 mg." },
	{ id: "magnesium", name: "Magnesium", unit: "mg", adequate: true, maleMg: [350, 350], femaleMg: [300, 300] },
	{ id: "iron", name: "Iron", unit: "mg", maleMg: [11, 11], femaleMg: [16, 16], note: "Women before menopause 16 mg, after it 11 mg." },
	{ id: "zinc", name: "Zinc", unit: "mg", maleMg: [9.4, 16.3], femaleMg: [7.5, 12.7], note: "The more phytate in the diet (wholegrains, legumes), the higher the need." },
	{ id: "selenium", name: "Selenium", unit: "µg", adequate: true, maleMg: [0.07, 0.07], femaleMg: [0.07, 0.07] },
]);

export const INTAKE_TABLE_BASIS: Basis = { sourceIds: ["efsaDrv", "efsaUl"], evidence: "consensus" };

export interface IntakeRow {
	reference: ReferenceIntake;
	/** Doporučené rozmezí v mg; bez zadaného pohlaví od nižší po vyšší hodnotu obou. */
	recommendedMg: [number, number];
	/** Horní limit v mg, pokud ho EFSA stanovila. */
	limitMg: number | null;
	supplementsOnly: boolean;
	/** Denní množství ze suplementů (součet přes všechny), nebo null. */
	fromSupplementsMg: number | null;
	/** Ze suplementů nad horním limitem. */
	overLimit: boolean;
}

export function intakeRows(sex: Sex, totals: readonly SubstanceTotal[]): IntakeRow[] {
	return REFERENCE_INTAKES.map((reference) => {
		const range: [number, number] =
			sex === "male" ? reference.maleMg : sex === "female" ? reference.femaleMg : [Math.min(reference.maleMg[0], reference.femaleMg[0]), Math.max(reference.maleMg[1], reference.femaleMg[1])];
		const limit = UPPER_LIMITS[reference.id];
		const fromSupplementsMg = totals.find((t) => t.catalog === reference.id)?.mg ?? null;
		return {
			reference,
			recommendedMg: range,
			limitMg: limit?.mg ?? null,
			supplementsOnly: limit?.supplementsOnly ?? false,
			fromSupplementsMg,
			overLimit: limit !== undefined && fromSupplementsMg !== null && fromSupplementsMg > limit.mg + 1e-9,
		};
	});
}

// ---------- Co nebrat spolu ----------

export interface Combination {
	id: string;
	/** Co s čím. */
	pair: string;
	/** Co studie ukázaly. */
	finding: string;
	/** Co s tím dělat. */
	advice: string;
	sources: SourceId[];
}

export const COMBINATIONS: Combination[] = translated([
	{
		id: "iron-calcium",
		pair: "Iron + calcium or dairy",
		finding: "300–600 mg of calcium, or 165 mg from milk or cheese, cut iron absorption from a meal by 50–60 %. Long-term calcium supplementation hasn't worsened iron status.",
		advice: "Take iron at a different time of day than calcium and dairy.",
		sources: ["hallberg1991", "lonnerdal2010"],
	},
	{
		id: "iron-coffee",
		pair: "Iron + coffee or tea",
		finding: "A cup of coffee with a meal cut iron absorption by 39 %, tea by 64 %; coffee an hour before the meal didn't, an hour after did. Herbal teas and cocoa inhibit it too.",
		advice: "Have coffee and tea at least an hour before iron, not with it or right after.",
		sources: ["morck1983", "hurrell1999"],
	},
	{
		id: "iron-vitamin-c",
		pair: "Iron + vitamin C",
		finding: "Vitamin C helps iron absorption from single meals much more than across a whole diet; added to iron tablets in anaemia it didn't improve haemoglobin.",
		advice: "With iron tablets it isn't needed; vitamin C-rich food helps iron from plant-based meals.",
		sources: ["cook2001", "li2020vitc"],
	},
	{
		id: "iron-alternate",
		pair: "Iron every day",
		finding: "In women with low iron stores, one dose every other day was absorbed better than daily doses.",
		advice: "Ask about taking iron every other day instead of daily.",
		sources: ["stoffel2017"],
	},
	{
		id: "zinc-iron",
		pair: "Zinc + iron",
		finding: "More than about 25 mg of iron taken together with zinc can reduce zinc absorption.",
		advice: "Take larger doses of iron and zinc apart.",
		sources: ["whittaker1998"],
	},
	{
		id: "zinc-calcium",
		pair: "Zinc + calcium",
		finding: "600 mg of calcium carbonate with a meal halved zinc absorption.",
		advice: "Don't take a calcium supplement together with zinc.",
		sources: ["wood1997"],
	},
	{
		id: "vitamin-d-meal",
		pair: "Vitamin D on an empty stomach",
		finding: "Taking vitamin D with the largest meal of the day raised its blood level by about 50 %.",
		advice: "Take vitamin D (and other fat-soluble vitamins) with a meal that contains fat.",
		sources: ["mulligan2010"],
	},
	{
		id: "calcium-carbonate",
		pair: "Calcium carbonate on an empty stomach",
		finding: "Fasting people with low stomach acid absorbed only about 4 % of calcium from carbonate; with breakfast it was absorbed normally.",
		advice: "Take calcium carbonate with food; citrate works on an empty stomach too.",
		sources: ["recker1985"],
	},
]);
