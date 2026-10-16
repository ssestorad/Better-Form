// Váha: řady pro graf, trend a co z něj plyne pro energetickou bilanci (SPEC 11.6).
// Bez zápisu jídla nejde spočítat skutečný výdej – z trendu váhy ale jde poznat,
// jestli je příjem nad nebo pod výdejem a o kolik. Bez závislosti na Obsidianu.

import { addDays, daysBetween } from "../model/dates";
import type { DayNote } from "../model/types";
import type { BodyGoal } from "../settings/settings";
import { KCAL_PER_KG, clampCorrection, type Range } from "./nutrition";
import { linearFit } from "./stats";

export interface WeightPoint {
	date: string;
	kg: number;
}

/** Vážení z denních poznámek, od nejstaršího. */
export function weightPoints(days: readonly DayNote[]): WeightPoint[] {
	const out: WeightPoint[] = [];
	for (const day of days) {
		const kg = day.body.weight_kg;
		if (kg !== undefined && Number.isFinite(kg) && kg > 0) out.push({ date: day.date, kg });
	}
	return out.sort((a, b) => a.date.localeCompare(b.date));
}

export interface WeightChart {
	/** Vážení dne. */
	value: (number | null)[];
	/** Průměr vážení za posledních 7 dní (včetně dne); null, když v nich žádné není. */
	average: (number | null)[];
}

export const WEIGHT_AVERAGE_DAYS = 7;

/** Řady pro graf váhy: jednotlivá vážení a klouzavý průměr, který vyhladí denní výkyvy. */
export function weightChart(points: readonly WeightPoint[], dates: readonly string[]): WeightChart {
	const byDate = new Map(points.map((p) => [p.date, p.kg]));
	const value = dates.map((d) => byDate.get(d) ?? null);
	const average = dates.map((date) => {
		let sum = 0;
		let n = 0;
		for (let i = 0; i < WEIGHT_AVERAGE_DAYS; i++) {
			const kg = byDate.get(addDays(date, -i));
			if (kg !== undefined) {
				sum += kg;
				n++;
			}
		}
		return n > 0 ? sum / n : null;
	});
	return { value, average };
}

/** Okno trendu a kolik dat je potřeba – praxe (denní výkyvy váhy jsou 1–2 kg, kratší okno by měřilo šum). */
export const TREND_WINDOW_DAYS = 21;
export const TREND_MIN_SAMPLES = 5;
export const TREND_MIN_SPAN_DAYS = 14;

export type WeightTrend =
	| {
			ready: true;
			samples: number;
			spanDays: number;
			/** Hmotnost podle přímky v den `date`. */
			currentKg: number;
			kgPerWeek: number;
			/** Změna v % hmotnosti za týden (záporná = hubnutí). */
			pctPerWeek: number;
			/** Odpovídající denní bilance: záporná = příjem pod výdejem. */
			kcalPerDay: number;
	  }
	| { ready: false; samples: number; spanDays: number };

/**
 * Trend váhy: přímka metodou nejmenších čtverců přes vážení za posledních 21 dní.
 * Potřeba aspoň 5 vážení v rozpětí aspoň 14 dní, jinak „sbírám data“.
 */
export function weightTrend(points: readonly WeightPoint[], date: string): WeightTrend {
	const from = addDays(date, -(TREND_WINDOW_DAYS - 1));
	const window = points.filter((p) => p.date >= from && p.date <= date);
	const spanDays = window.length > 0 ? daysBetween(window[0]!.date, window[window.length - 1]!.date) : 0;
	const fit = linearFit(window.map((p) => ({ x: daysBetween(from, p.date), y: p.kg })));
	if (window.length < TREND_MIN_SAMPLES || spanDays < TREND_MIN_SPAN_DAYS || fit === null) {
		return { ready: false, samples: window.length, spanDays };
	}
	const currentKg = fit.intercept + fit.slope * (TREND_WINDOW_DAYS - 1);
	const kgPerWeek = fit.slope * 7;
	return {
		ready: true,
		samples: window.length,
		spanDays,
		currentKg,
		kgPerWeek,
		pctPerWeek: (kgPerWeek / currentKg) * 100,
		kcalPerDay: fit.slope * KCAL_PER_KG,
	};
}

/** Změna do ±0,25 % hmotnosti za týden se bere jako „váha drží“ – praxe. */
export const STABLE_PCT_PER_WEEK = 0.25;

export type BalanceStatus =
	/** Odpovídá cíli. */
	| "on_track"
	/** Jde správným směrem, ale pomaleji než cíl (nebo váha stojí). */
	| "slow"
	/** Rychleji, než je rozumné. */
	| "fast"
	/** Opačným směrem než cíl. */
	| "opposite"
	/** Cíl je udržování, ale váha klesá nebo roste. */
	| "drift";

export interface BalanceCheck {
	status: BalanceStatus;
	direction: "down" | "up" | "flat";
	/** O kolik kcal denně upravit příjem, aby bilance odpovídala cíli (kladné = přidat); 0 = nic. */
	adjustKcal: number;
}

const round50 = (n: number) => Math.round(n / 50) * 50;

/**
 * Porovná skutečnou bilanci (z trendu váhy) se záměrem. `intended` = zamýšlená denní
 * bilance v kcal podle cíle (hubnutí záporná, nabírání kladná); u udržování se nepoužije.
 */
export function assessBalance(trend: Extract<WeightTrend, { ready: true }>, goal: BodyGoal, intended: Range): BalanceCheck {
	const tolerance = (trend.currentKg * (STABLE_PCT_PER_WEEK / 100) * KCAL_PER_KG) / 7;
	const balance = trend.kcalPerDay;
	const direction = balance < -tolerance ? "down" : balance > tolerance ? "up" : "flat";
	if (goal === "maintain") {
		return direction === "flat" ? { status: "on_track", direction, adjustKcal: 0 } : { status: "drift", direction, adjustKcal: round50(-balance) };
	}
	// Hubnutí i nabírání: zamýšlená bilance je rozsah [min, max] v kcal/den.
	const toward = goal === "lose" ? "down" : "up";
	if (balance >= intended.min && balance <= intended.max) return { status: "on_track", direction, adjustKcal: 0 };
	if (direction !== "flat" && direction !== toward) {
		const nearest = goal === "lose" ? intended.max : intended.min;
		return { status: "opposite", direction, adjustKcal: round50(nearest - balance) };
	}
	const beyond = goal === "lose" ? balance < intended.min : balance > intended.max;
	if (beyond) return { status: "fast", direction, adjustKcal: round50((goal === "lose" ? intended.min : intended.max) - balance) };
	return { status: "slow", direction, adjustKcal: round50((goal === "lose" ? intended.max : intended.min) - balance) };
}

// ---------- Týdenní kontrola: osobní korekce odhadu výdeje ----------

/** Menší rozdíl se neřeší – je v šumu vážení. */
export const MIN_CORRECTION_STEP_KCAL = 100;
/**
 * Po úpravě korekce se další nenabízí, dokud trend váhy neobsahuje jen dny po ní
 * (jinak by se stejná odchylka opravila dvakrát).
 */
export const CORRECTION_LOCK_DAYS = TREND_WINDOW_DAYS;

export type CorrectionAdvice =
	/** Váha neodpovídá cíli: nabídnout posun odhadu výdeje o `stepKcal` na celkových `totalKcal`. */
	| { kind: "offer"; stepKcal: number; totalKcal: number }
	/** Korekce je čerstvá; další kontrola od data `until`. */
	| { kind: "locked"; until: string }
	/** Váha říká „méně“, ale doporučení už drží pojistka a níž nepůjde. */
	| { kind: "floor" }
	| { kind: "none" };

/**
 * Co s odhadem výdeje podle kontroly váhy. Předpoklad: uživatel se doporučení
 * zhruba držel – pak rozdíl mezi skutečnou a zamýšlenou bilancí říká, o kolik je
 * odhad výdeje vedle. Je to heuristika (praxe); bez zápisu jídla to přesněji nejde.
 * `check.adjustKcal` říká, o kolik změnit příjem; stejným směrem se posune doporučení.
 * `atFloor` = doporučení už zvedla pojistka (RMR nebo energetická dostupnost).
 */
export function correctionAdvice(check: BalanceCheck | null, currentKcal: number, appliedOn: string, today: string, atFloor = false): CorrectionAdvice {
	if (appliedOn !== "" && daysBetween(appliedOn, today) >= 0 && daysBetween(appliedOn, today) < CORRECTION_LOCK_DAYS) {
		return { kind: "locked", until: addDays(appliedOn, CORRECTION_LOCK_DAYS) };
	}
	if (!check || Math.abs(check.adjustKcal) < MIN_CORRECTION_STEP_KCAL) return { kind: "none" };
	// Doporučení už stojí na pojistce (klidový výdej, energetická dostupnost): níž nepůjde, korekce dolů by nic nezměnila.
	if (atFloor && check.adjustKcal < 0) return { kind: "floor" };
	const current = clampCorrection(currentKcal);
	const total = clampCorrection(current + check.adjustKcal);
	return total === current ? { kind: "none" } : { kind: "offer", stepKcal: total - current, totalKcal: total };
}
