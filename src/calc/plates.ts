// Kalkulačka kotoučů a rozcvičovacích sérií pro cviky s velkou činkou.
// Čisté funkce; hmotnost osy a sada kotoučů jsou v nastavení.

import type { Basis } from "../evidence/sources";
import { t } from "../i18n";

export interface BarbellSettings {
	/** Hmotnost osy v kg. */
	barKg: number;
	/** Hmotnosti kotoučů, které jsou k dispozici (kg); každý v libovolném počtu párů. */
	platesKg: number[];
}

export interface PlateLoad {
	/** Kotouče na jednu stranu osy, od nejtěžšího. */
	perSide: number[];
	/** Hmotnost, která jde s danými kotouči opravdu naložit (osa + 2× kotouče). */
	loadedKg: number;
	/** Kolik do požadované hmotnosti chybí, když ji kotouči nejde složit přesně. */
	missingKg: number;
}

const EPSILON = 1e-9;

/**
 * Rozloží hmotnost na kotouče na jednu stranu: bere vždy nejtěžší kotouč, který
 * se ještě vejde. Null, když je cíl lehčí než samotná osa nebo vstup není platný.
 */
export function plateLoad(totalKg: number, barbell: BarbellSettings): PlateLoad | null {
	const { barKg } = barbell;
	if (!Number.isFinite(totalKg) || !Number.isFinite(barKg) || barKg <= 0 || totalKg < barKg - EPSILON) return null;
	const plates = [...new Set(barbell.platesKg.filter((p) => Number.isFinite(p) && p > 0))].sort((a, b) => b - a);
	let rest = (totalKg - barKg) / 2;
	const perSide: number[] = [];
	for (const plate of plates) {
		while (rest >= plate - EPSILON) {
			perSide.push(plate);
			rest -= plate;
		}
	}
	const loadedKg = barKg + 2 * perSide.reduce((sum, p) => sum + p, 0);
	const missingKg = Math.max(0, totalKg - loadedKg);
	return { perSide, loadedKg, missingKg: missingKg < 1e-6 ? 0 : Math.round(missingKg * 1000) / 1000 };
}

/**
 * Rozcvičovací řada před pracovní váhou: prázdná osa, pak 40, 60 a 80 % pracovní
 * váhy s klesajícím počtem opakování. Je to běžná trenérská praxe, ne výsledek
 * studie – účel je zahřát se a nacvičit pohyb bez únavy.
 */
export const WARMUP_STEPS: readonly { pct: number; reps: number }[] = [
	{ pct: 0, reps: 10 },
	{ pct: 0.4, reps: 5 },
	{ pct: 0.6, reps: 3 },
	{ pct: 0.8, reps: 2 },
];

export const WARMUP_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };

export interface WarmupSet {
	kg: number;
	reps: number;
}

/**
 * Rozcvičovací série pro pracovní váhu, zaokrouhlené dolů na hmotnost, kterou
 * jde naložit. Kroky, které by vyšly stejně jako předchozí nebo by nebyly lehčí
 * než pracovní váha, se vynechají. Prázdné, když je pracovní váha nejvýš osa.
 */
export function warmupSets(workKg: number, barbell: BarbellSettings): WarmupSet[] {
	if (!Number.isFinite(workKg) || workKg <= barbell.barKg + EPSILON) return [];
	const sets: WarmupSet[] = [];
	for (const step of WARMUP_STEPS) {
		const target = Math.max(barbell.barKg, workKg * step.pct);
		const load = plateLoad(target, barbell);
		if (!load) continue;
		const kg = load.loadedKg;
		const last = sets[sets.length - 1];
		if (kg >= workKg - EPSILON || (last && kg <= last.kg + EPSILON)) continue;
		sets.push({ kg, reps: step.reps });
	}
	return sets;
}

/**
 * Barvy kotoučů podle závodního značení (IWF): 25 červená, 20 modrá, 15 žlutá,
 * 10 zelená, 5 bílá; malé kotouče pořadí opakují. Jiné hmotnosti (např. 1,25 kg)
 * závodní barvu nemají – kreslí se ocelově šedé.
 */
const PLATE_COLORS: Record<number, string> = {
	25: "#d32f2f",
	20: "#1f5fbf",
	15: "#f2c200",
	10: "#2e9e4f",
	5: "#f4f4f4",
	2.5: "#d32f2f",
	2: "#1f5fbf",
	1.5: "#f2c200",
	1: "#2e9e4f",
	0.5: "#f4f4f4",
};

export function plateColor(kg: number): string {
	return PLATE_COLORS[kg] ?? "#9aa0a6";
}

/** „25 + 15 + 2,5“ – kotouče na jednu stranu jako text; bez kotoučů „jen osa“. */
export function plateText(load: PlateLoad, format: (kg: number) => string): string {
	return load.perSide.length > 0 ? load.perSide.map(format).join(" + ") : t("bar only");
}
