// Běh (SPEC 8.7, 5.10): osobní rekordy, tepové zóny a kilometry bot.
// Čisté funkce bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import { addDays as addDaysIso } from "../model/dates";
import type { WorkoutNote } from "../model/types";
import { translated } from "../i18n";

// ---------- Osobní rekordy ----------

export interface RecordDistance {
	key: string;
	label: string;
	km: number;
}

export const RECORD_DISTANCES: RecordDistance[] = translated([
	{ key: "1k", label: "1 km", km: 1 },
	{ key: "5k", label: "5 km", km: 5 },
	{ key: "10k", label: "10 km", km: 10 },
	{ key: "half", label: "Half marathon", km: 21.0975 },
	{ key: "marathon", label: "Marathon", km: 42.195 },
]);

/** Celý běh se počítá jako běh na danou trať, když se vzdálenost liší nejvýš o 2 %. */
export const RECORD_TOLERANCE = 0.02;

export interface RunRecord {
	distance: RecordDistance;
	seconds: number;
	date: string;
	/** "segment" = nejrychlejší úsek uvnitř delšího běhu (ze Stravy), "run" = celý běh dané délky. */
	from: "segment" | "run";
}

/**
 * Nejlepší čas na každé trati: z nejrychlejších úseků (`run.best_s`), jinak z
 * celých běhů dané vzdálenosti ±2 %. Při shodě časů vyhrává starší výkon.
 */
export function runRecords(workouts: readonly WorkoutNote[]): RunRecord[] {
	const records: RunRecord[] = [];
	for (const distance of RECORD_DISTANCES) {
		let best: RunRecord | null = null;
		const consider = (seconds: number | undefined, date: string, from: RunRecord["from"]) => {
			if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return;
			if (!best || seconds < best.seconds || (seconds === best.seconds && date < best.date)) {
				best = { distance, seconds, date, from };
			}
		};
		for (const workout of workouts) {
			if (workout.sport !== "run" || !workout.run) continue;
			consider(workout.run.best_s?.[distance.key], workout.date, "segment");
			const km = workout.run.distance_km;
			if (km !== undefined && Math.abs(km - distance.km) / distance.km <= RECORD_TOLERANCE) {
				consider(workout.run.moving_time_s, workout.date, "run");
			}
		}
		if (best) records.push(best);
	}
	return records;
}

export interface LongestRun {
	km: number;
	date: string;
}

export function longestRun(workouts: readonly WorkoutNote[]): LongestRun | null {
	let best: LongestRun | null = null;
	for (const workout of workouts) {
		const km = workout.sport === "run" ? workout.run?.distance_km : undefined;
		if (km !== undefined && km > 0 && (!best || km > best.km)) best = { km, date: workout.date };
	}
	return best;
}

/** Jeden běh delší o víc než 10 % než nejdelší za předchozích 30 dní souvisel s častějšími zraněními (Frandsen 2025). */
export const RUN_SPIKE_DAYS = 30;
export const RUN_SPIKE_PCT = 10;
export const RUN_SPIKE_BASIS: Basis = { sourceIds: ["frandsen2025"], evidence: "research" };

export interface RunSpike {
	km: number;
	/** Nejdelší běh za předchozích 30 dní (bez daného dne). */
	longestKm: number;
	/** O kolik procent je běh delší. */
	pct: number;
	/** Nejdelší běh, který ještě nepřekročí hranici (zaokrouhleno dolů na 0,1 km). */
	maxKm: number;
}

/** Běh `km` v den `date` proti nejdelšímu běhu za předchozích 30 dní; null = v pořádku nebo není s čím srovnat. */
export function runSpike(workouts: readonly WorkoutNote[], date: string, km: number): RunSpike | null {
	const from = addDaysIso(date, -RUN_SPIKE_DAYS);
	let longestKm = 0;
	for (const workout of workouts) {
		const distance = workout.sport === "run" ? workout.run?.distance_km : undefined;
		if (distance !== undefined && workout.date >= from && workout.date < date) longestKm = Math.max(longestKm, distance);
	}
	const limit = longestKm * (1 + RUN_SPIKE_PCT / 100);
	if (longestKm <= 0 || km <= limit) return null;
	return { km, longestKm, pct: (km / longestKm - 1) * 100, maxKm: Math.floor(limit * 10 + 1e-9) / 10 };
}

// ---------- Kadence ----------

/** Vyšší kadence snižuje zatížení kolene (Anderson 2022, Doyle 2022). */
export const CADENCE_BASIS: Basis = { sourceIds: ["anderson2022", "doyle2022"], evidence: "research" };

/**
 * Kadence v krocích za minutu. Hodinky, Strava, FIT i GPX ji obvykle zapisují za
 * jednu nohu (běh 70–110), proto ×2; hodnota od 120 už je za obě nohy.
 */
export function cadenceSpm(raw: number): number {
	return Math.round(raw >= 120 ? raw : raw * 2);
}

// ---------- Tepové zóny ----------

/** Odhad maximálního tepu podle věku: 208 − 0,7 × věk (Tanaka 2001). */
export function estimateHrMax(age: number): number {
	return 208 - 0.7 * age;
}

export interface HrMaxResult {
	value: number;
	/** "measured" = z nastavení, "estimated" = odhad z věku. */
	from: "measured" | "estimated";
}

/** Maximální tep: změřený z profilu, jinak odhad z roku narození; null bez obou. */
export function resolveHrMax(measured: number | null, birthYear: number | null, currentYear: number): HrMaxResult | null {
	if (measured !== null && measured > 0) return { value: measured, from: "measured" };
	if (birthYear === null) return null;
	const age = currentYear - birthYear;
	if (age < 10 || age > 100) return null;
	return { value: Math.round(estimateHrMax(age)), from: "estimated" };
}

/** Hranice pěti zón jako podíl tepové rezervy (Karvonen): 50–60–70–80–90–100 %. */
export const ZONE_BOUNDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1] as const;

export const ZONE_LABELS = translated(["Z1 – very easy", "Z2 – easy", "Z3 – moderate", "Z4 – hard", "Z5 – maximal"]);

export interface HrZone {
	zone: number;
	/** Dolní a horní hranice v tepech za minutu. */
	from: number;
	to: number;
}

/**
 * Pět tepových zón přes tepovou rezervu: tep = klidový + podíl × (max − klidový).
 * Bez klidového tepu se počítá z podílu maxima (klidový = 0).
 */
export function hrZones(hrMax: number, restingHr: number | null): HrZone[] {
	const rest = restingHr !== null && restingHr > 0 && restingHr < hrMax ? restingHr : 0;
	const at = (share: number) => Math.round(rest + share * (hrMax - rest));
	return ZONE_BOUNDS.slice(0, -1).map((share, i) => ({ zone: i + 1, from: at(share), to: at(ZONE_BOUNDS[i + 1]!) }));
}

/** Zdroj maximálního tepu; rozdělení na zóny po 10 % tepové rezervy je zvyklost. */
export const HR_MAX_BASIS: Basis = { sourceIds: ["tanaka2001"], evidence: "research" };
export const HR_ZONE_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };

/** Průměr klidového tepu z posledních měření (nejnovější první); null bez dat. */
export function averageRestingHr(values: readonly number[], count = 7): number | null {
	const recent = values.filter((v) => Number.isFinite(v) && v > 0).slice(0, count);
	if (recent.length === 0) return null;
	return Math.round(recent.reduce((sum, v) => sum + v, 0) / recent.length);
}

// ---------- Boty ----------

export interface ShoeUsage {
	/** Najeto celkem: počáteční km + běhy s těmito botami. */
	km: number;
	runs: number;
	limitKm: number;
	/** Podíl limitu 0–1+. */
	ratio: number;
	status: "ok" | "near" | "over";
}

/** Od kolika procent limitu se boty označí jako „blíží se limitu“. */
export const SHOE_NEAR_RATIO = 0.85;

/** Kilometry bot: počáteční stav + součet běhů, které na boty odkazují. */
export function shoeUsage(
	startKm: number,
	limitKm: number,
	workouts: readonly WorkoutNote[],
	isThisShoe: (link: string) => boolean,
): ShoeUsage {
	let km = Math.max(0, startKm);
	let runs = 0;
	for (const workout of workouts) {
		const shoes = workout.run?.shoes;
		if (workout.sport !== "run" || !shoes || !isThisShoe(shoes)) continue;
		runs++;
		km += workout.run?.distance_km ?? 0;
	}
	const ratio = limitKm > 0 ? km / limitKm : 0;
	return { km, runs, limitKm, ratio, status: ratio >= 1 ? "over" : ratio >= SHOE_NEAR_RATIO ? "near" : "ok" };
}

/** Limit kilometrů bot je zvyklost, ne výsledek výzkumu. */
export const SHOE_LIMIT_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };

// ---------- Importy k doplnění ----------

/** Importované tréninky (ze Stravy nebo ze souboru), kterým chybí RPE – od nejnovějšího. */
export function pendingImports<T extends { note: WorkoutNote }>(entries: readonly T[]): T[] {
	return entries
		.filter((e) => e.note.source !== "manual" && e.note.rpe === undefined)
		.sort((a, b) => (b.note.date + (b.note.start ?? "")).localeCompare(a.note.date + (a.note.start ?? "")));
}

// ---------- Odhad závodního času ----------

/** Riegel 1981; u delších tratí je odhad méně přesný. */
export const RIEGEL_BASIS: Basis = { sourceIds: ["riegel1981"], evidence: "research" };
export const RIEGEL_EXPONENT = 1.06;

/** Riegel: T2 = T1 × (D2 / D1)^1,06. Neplatné vstupy vrátí null. */
export function riegelTime(seconds: number, fromKm: number, toKm: number, exponent = RIEGEL_EXPONENT): number | null {
	if (!(seconds > 0) || !(fromKm > 0) || !(toKm > 0)) return null;
	return seconds * (toKm / fromKm) ** exponent;
}

// ---------- Rozložení intenzit (80/20) ----------

export const INTENSITY_BASIS: Basis = { sourceIds: ["seiler2010", "stoggl2014"], evidence: "research" };

export interface IntensityShare {
	/** Čas v zónách 1–2 v sekundách. */
	easySec: number;
	/** Čas v zónách 3–5 v sekundách. */
	hardSec: number;
	/** Podíl intenzivního času 0–1. */
	share: number;
	/** Počet běhů s daty o zónách. */
	runs: number;
}

/**
 * Podíl času v zónách 3–5 za posledních `days` dní včetně `today`. Počítají se
 * jen běhy s časem v zónách (`run.hr_zone_s`); bez nich null.
 */
export function intensityShare(workouts: readonly WorkoutNote[], today: string, days = 28): IntensityShare | null {
	const from = addDaysIso(today, -(days - 1));
	let easySec = 0;
	let hardSec = 0;
	let runs = 0;
	for (const workout of workouts) {
		const zones = workout.sport === "run" ? workout.run?.hr_zone_s : undefined;
		if (!zones || zones.length === 0 || workout.date < from || workout.date > today) continue;
		runs++;
		zones.forEach((sec, i) => {
			if (!Number.isFinite(sec) || sec <= 0) return;
			if (i < 2) easySec += sec;
			else hardSec += sec;
		});
	}
	const total = easySec + hardSec;
	if (runs === 0 || total <= 0) return null;
	return { easySec, hardSec, share: hardSec / total, runs };
}
