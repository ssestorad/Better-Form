// Suplementace: dodržování, dávky podle hmotnosti a kontrola horních limitů.
// Čisté funkce bez závislosti na Obsidianu.

import { addDays, daysBetween } from "../model/dates";

// ---------- Dodržování ----------

export interface AdherenceInput {
	/** Od kdy se suplement bere; chybí = počítá se celé okno. */
	since?: string;
	/** Jen ve dnech s tréninkem. */
	trainingDaysOnly: boolean;
}

export interface Adherence {
	/** Počet dnů, kdy byl suplement vzat. */
	taken: number;
	/** Počet dnů, kdy vzat být měl. */
	due: number;
}

/**
 * Dodržování za posledních `windowDays` dnů včetně dneška.
 * Dnešek se mezi „měl vzít“ počítá až ve chvíli, kdy je vzato – ráno tak
 * nevypadá jako vynechaný den. U suplementu jen na tréninkové dny se počítají
 * jen dny s tréninkem. Před datem `since` se nepočítá nic.
 */
export function adherence(
	input: AdherenceInput,
	takenOn: (date: string) => boolean,
	trainedOn: (date: string) => boolean,
	today: string,
	windowDays: number,
): Adherence {
	let taken = 0;
	let due = 0;
	for (let i = windowDays - 1; i >= 0; i--) {
		const date = addDays(today, -i);
		if (input.since && date < input.since) continue;
		const wasTaken = takenOn(date);
		if (wasTaken) taken++;
		const expected = !input.trainingDaysOnly || trainedOn(date);
		if (date === today ? wasTaken : expected || wasTaken) due++;
	}
	return { taken, due };
}

/** Podíl 0–1, nebo null, když zatím nebylo co dodržet. */
export function adherenceRatio(a: Adherence): number | null {
	return a.due === 0 ? null : a.taken / a.due;
}

/** Kolik dnů z okna už je sledovaných (pro stav „sbírám data (X z Y dní)“). */
export function trackedDays(since: string | undefined, today: string, windowDays: number): number {
	if (!since) return windowDays;
	if (since > today) return 0;
	return Math.min(windowDays, daysBetween(since, today) + 1);
}

// ---------- Dávky podle hmotnosti ----------

export interface DoseRange {
	min: number;
	max: number;
	unit: string;
}

/** Kofein 3–6 mg/kg zhruba hodinu před výkonem (Guest 2021, Maughan 2018). */
export const CAFFEINE_MG_PER_KG = { min: 3, max: 6 } as const;
/** Od 9 mg/kg přibývá nežádoucích účinků bez dalšího přínosu (Maughan 2018). */
export const CAFFEINE_EXCESS_MG_PER_KG = 9;

export function caffeineDoseMg(weightKg: number): DoseRange {
	return { min: weightKg * CAFFEINE_MG_PER_KG.min, max: weightKg * CAFFEINE_MG_PER_KG.max, unit: "mg" };
}

/** Celkový denní příjem bílkovin 1,6–2,2 g/kg včetně jídla (Morton 2018, Maughan 2018). */
export const PROTEIN_G_PER_KG = { min: 1.6, max: 2.2 } as const;

export function proteinTargetG(weightKg: number): DoseRange {
	return { min: weightKg * PROTEIN_G_PER_KG.min, max: weightKg * PROTEIN_G_PER_KG.max, unit: "g" };
}

/** Beta-alanin ~65 mg/kg denně, rozděleně (Maughan 2018). */
export const BETA_ALANINE_MG_PER_KG = 65;

export function betaAlanineDoseG(weightKg: number): number {
	return (weightKg * BETA_ALANINE_MG_PER_KG) / 1000;
}

// ---------- Jednotky a horní limity ----------

/** 1 µg vitaminu D = 40 IU. */
const VITAMIN_D_IU_PER_UG = 40;

/**
 * Převede dávku na miligramy. Rozumí g, mg, µg (i "ug", "mcg") a IU u vitaminu D.
 * Neznámá jednotka (kapsle, tableta, odměrka…) = null.
 */
export function doseToMg(dose: number, unit: string | undefined, iuPerUg?: number): number | null {
	const u = (unit ?? "").trim().toLocaleLowerCase("cs");
	if (u === "g") return dose * 1000;
	if (u === "mg") return dose;
	if (u === "µg" || u === "μg" || u === "ug" || u === "mcg") return dose / 1000;
	if (u === "iu" && iuPerUg) return dose / iuPerUg / 1000;
	return null;
}

export interface UpperLimit {
	/** Horní limit v mg za den. */
	mg: number;
	/** Limit se týká jen příjmu z doplňků (hořčík), jinak celkového příjmu včetně jídla. */
	supplementsOnly: boolean;
	/** Převod IU → µg, pokud se látka běžně udává v IU. */
	iuPerUg?: number;
}

/** Horní limity pro dospělé podle EFSA (zdroj `efsaUl`). Klíč = ID v katalogu suplementů. */
export const UPPER_LIMITS: Record<string, UpperLimit> = {
	magnesium: { mg: 250, supplementsOnly: true },
	zinc: { mg: 25, supplementsOnly: false },
	vitamin_d: { mg: 0.1, supplementsOnly: false, iuPerUg: VITAMIN_D_IU_PER_UG },
	vitamin_a: { mg: 3, supplementsOnly: false },
	vitamin_e: { mg: 300, supplementsOnly: false },
	vitamin_b: { mg: 12, supplementsOnly: false },
	selenium: { mg: 0.255, supplementsOnly: false },
	calcium: { mg: 2500, supplementsOnly: false },
};

export type LimitCheck =
	| { status: "ok" | "over"; doseMg: number; limitMg: number; supplementsOnly: boolean }
	| { status: "unknown" };

/**
 * Porovná denní dávku s horním limitem látky. "unknown" = látka limit nemá,
 * nebo dávku nejde převést (jednotka typu „kapsle“).
 * U vitaminů B se limit týká vitaminu B6 – dávka se bere jako obsah B6.
 */
export function checkUpperLimit(
	catalogId: string | undefined,
	dose: number | undefined,
	unit: string | undefined,
): LimitCheck {
	const limit = catalogId ? UPPER_LIMITS[catalogId] : undefined;
	if (!limit || dose === undefined) return { status: "unknown" };
	const doseMg = doseToMg(dose, unit, limit.iuPerUg);
	if (doseMg === null) return { status: "unknown" };
	return {
		status: doseMg > limit.mg + 1e-9 ? "over" : "ok",
		doseMg,
		limitMg: limit.mg,
		supplementsOnly: limit.supplementsOnly,
	};
}

/** Kofein: dávka od 9 mg/kg už jen přidává nežádoucí účinky. */
export function caffeineIsExcessive(doseMg: number, weightKg: number): boolean {
	return doseMg >= weightKg * CAFFEINE_EXCESS_MG_PER_KG;
}

// ---------- Složení vlastního přípravku ----------

/** Látka ve složení přípravku: množství v jedné porci. */
export interface IngredientAmount {
	name: string;
	amount: number;
	unit: string;
	catalog?: string;
}

/** Bez zadaného počtu porcí se počítá jedna denně. */
const servingsOf = (servings: number | undefined) => (servings !== undefined && servings > 0 ? servings : 1);

/** Součet látek přípravku v mg za den (porce × obsah); null, když žádné množství nejde převést. */
export function ingredientsDailyMg(ingredients: readonly IngredientAmount[], servings: number | undefined): number | null {
	let sum: number | null = null;
	for (const i of ingredients) {
		const mg = doseToMg(i.amount * servingsOf(servings), i.unit, i.catalog ? UPPER_LIMITS[i.catalog]?.iuPerUg : undefined);
		if (mg !== null) sum = (sum ?? 0) + mg;
	}
	return sum;
}

/** Látky přípravku, které při daném počtu porcí denně překračují horní limit. */
export function ingredientWarnings(ingredients: readonly IngredientAmount[], servings: number | undefined): { name: string; check: LimitCheck }[] {
	return ingredients
		.map((i) => ({ name: i.name, check: checkUpperLimit(i.catalog, i.amount * servingsOf(servings), i.unit) }))
		.filter((w) => w.check.status === "over");
}

// ---------- Stejná látka z více suplementů ----------

/** Co uživatel bere: samostatná látka (`catalog`, `dose`) nebo přípravek se složením (`dose` = porcí denně). */
export interface SupplementIntake {
	name: string;
	catalog?: string;
	dose?: number;
	unit?: string;
	ingredients?: readonly IngredientAmount[];
}

export interface SubstanceTotal {
	/** ID látky v katalogu. */
	catalog: string;
	/** Denní množství ze všech suplementů dohromady. */
	mg: number;
	/** Názvy suplementů, které látku obsahují. */
	from: string[];
}

/** Denní množství každé látky katalogu sečtené přes všechny suplementy; nepřevoditelné dávky se vynechají. */
export function substanceTotals(items: readonly SupplementIntake[]): SubstanceTotal[] {
	const totals = new Map<string, SubstanceTotal>();
	const add = (catalog: string | undefined, amount: number | undefined, unit: string | undefined, from: string) => {
		if (!catalog || amount === undefined) return;
		const mg = doseToMg(amount, unit, UPPER_LIMITS[catalog]?.iuPerUg);
		if (mg === null) return;
		const total = totals.get(catalog) ?? { catalog, mg: 0, from: [] };
		total.mg += mg;
		if (!total.from.includes(from)) total.from.push(from);
		totals.set(catalog, total);
	};
	for (const item of items) {
		if (item.ingredients) for (const i of item.ingredients) add(i.catalog, i.amount * servingsOf(item.dose), i.unit, item.name);
		else add(item.catalog, item.dose, item.unit, item.name);
	}
	return [...totals.values()];
}

export type CombinedWarning = SubstanceTotal & ({ kind: "limit"; limitMg: number; supplementsOnly: boolean } | { kind: "caffeine"; limitMg: number });

/**
 * Co je moc až v součtu: látka nad horním limitem, když ji obsahují aspoň dva
 * suplementy (překročení jediným hlásí jeho řádek), a kofein od 9 mg/kg celkem.
 */
export function combinedWarnings(totals: readonly SubstanceTotal[], weightKg: number | null): CombinedWarning[] {
	const out: CombinedWarning[] = [];
	for (const total of totals) {
		const limit = UPPER_LIMITS[total.catalog];
		if (limit && total.from.length > 1 && total.mg > limit.mg + 1e-9) out.push({ ...total, kind: "limit", limitMg: limit.mg, supplementsOnly: limit.supplementsOnly });
		if (total.catalog === "caffeine" && weightKg !== null && weightKg > 0 && caffeineIsExcessive(total.mg, weightKg)) {
			out.push({ ...total, kind: "caffeine", limitMg: weightKg * CAFFEINE_EXCESS_MG_PER_KG });
		}
	}
	return out;
}

// ---------- Denní součet ----------

export interface DailyItem {
	/** ID položky katalogu (kvůli převodu IU a rozpoznání aminokyselin). */
	catalogId?: string;
	dose?: number;
	unit?: string;
	trainingDaysOnly: boolean;
}

export interface DailyTotals {
	/** Počet suplementů v tréninkový den / v den volna. */
	trainingDayCount: number;
	restDayCount: number;
	/** Součet dávek v mg (jen dávky s převoditelnou jednotkou). */
	trainingDayMg: number;
	restDayMg: number;
	/** Z toho suplementy vybrané funkcí `isAmino`. */
	aminoTrainingDayMg: number;
	aminoRestDayMg: number;
	/** Počet suplementů, jejichž dávku nejde převést na mg (kapsle, tableta, bez dávky). */
	unconverted: number;
}

/** Dávka suplementu v mg; null, když chybí nebo má nepřevoditelnou jednotku. */
export function itemDoseMg(item: DailyItem): number | null {
	if (item.dose === undefined) return null;
	const iuPerUg = item.catalogId ? UPPER_LIMITS[item.catalogId]?.iuPerUg : undefined;
	return doseToMg(item.dose, item.unit, iuPerUg);
}

/**
 * Kolik toho uživatel denně bere: součet dávek zvlášť pro tréninkový den
 * (všechny suplementy) a den volna (bez těch „jen s tréninkem“).
 */
export function dailyTotals(items: readonly DailyItem[], isAmino: (catalogId: string | undefined) => boolean): DailyTotals {
	const totals: DailyTotals = {
		trainingDayCount: 0,
		restDayCount: 0,
		trainingDayMg: 0,
		restDayMg: 0,
		aminoTrainingDayMg: 0,
		aminoRestDayMg: 0,
		unconverted: 0,
	};
	for (const item of items) {
		totals.trainingDayCount++;
		if (!item.trainingDaysOnly) totals.restDayCount++;
		const mg = itemDoseMg(item);
		if (mg === null) {
			totals.unconverted++;
			continue;
		}
		const amino = isAmino(item.catalogId);
		totals.trainingDayMg += mg;
		if (amino) totals.aminoTrainingDayMg += mg;
		if (!item.trainingDaysOnly) {
			totals.restDayMg += mg;
			if (amino) totals.aminoRestDayMg += mg;
		}
	}
	return totals;
}

// ---------- Úprava denního seznamu ----------

function sameName(a: string, b: string): boolean {
	return a.trim().toLocaleLowerCase("cs") === b.trim().toLocaleLowerCase("cs");
}

export function isTaken(list: readonly string[] | undefined, name: string): boolean {
	return (list ?? []).some((item) => sameName(item, name));
}

/** Přidá nebo odebere suplement ze seznamu vzatých; pořadí ostatních zůstane. */
export function toggleTaken(list: readonly string[] | undefined, name: string, taken: boolean): string[] {
	const rest = (list ?? []).filter((item) => !sameName(item, name));
	return taken ? [...rest, name.trim()] : rest;
}
