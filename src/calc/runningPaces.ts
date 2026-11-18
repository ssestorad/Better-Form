// Běžecká tempa podle Danielse (Daniels' Running Formula, 3. vyd. 2014) z výsledku závodu
// nebo rekordu. Čisté funkce bez závislosti na Obsidianu.
// VDOT a rychlost při daném podílu VO2max z rovnic Danielse a Gilberta (1979):
//   VO2 = −4,60 + 0,182258·v + 0,000104·v²  (v v m/min)
//   podíl VO2max udržitelný po t minut = 0,8 + 0,1894393·e^(−0,012778·t) + 0,2989558·e^(−0,1932605·t)
// Z knihy (ověřeno v textu): E 59–74 % VO2max, T 86–88 %, R = aktuální závodní tempo na míli,
// I o 6–8 s na 400 m pomalejší než R; T nejvýš 10 % týdenního objemu, I nejvýš 8 % nebo 10 km,
// R nejvýš 5 % nebo 8 km, dlouhý běh nejvýš asi 30 %.

import type { Basis } from "../evidence/sources";

export const PACES_BASIS: Basis = { sourceIds: ["daniels2014"], evidence: "practice" };

const MILE_KM = 1.609344;
const MARATHON_KM = 42.195;

function vo2(velocity: number): number {
	return -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;
}

function sustainableFraction(minutes: number): number {
	return 0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes);
}

/** VDOT z výsledku: vzdálenost v km a čas v sekundách; null u nesmyslných vstupů. */
export function vdot(km: number, seconds: number): number | null {
	if (!(km > 0) || !(seconds > 0)) return null;
	const minutes = seconds / 60;
	const value = vo2((km * 1000) / minutes) / sustainableFraction(minutes);
	return Number.isFinite(value) && value > 0 ? value : null;
}

/** Tempo (s/km) při daném podílu VO2max. */
function paceAtFraction(value: number, fraction: number): number {
	const a = 0.000104;
	const b = 0.182258;
	const velocity = (-b + Math.sqrt(b * b + 4 * a * (4.6 + fraction * value))) / (2 * a);
	return 60000 / velocity;
}

/** Odhad závodního času (s) na vzdálenost se stejným VDOT – bisekce. */
export function equivalentTime(value: number, km: number): number {
	let low = 60;
	let high = 60 * 60 * 12;
	for (let i = 0; i < 60; i++) {
		const mid = (low + high) / 2;
		// Čím delší čas, tím nižší VDOT.
		if ((vdot(km, mid) ?? 0) > value) low = mid;
		else high = mid;
	}
	return (low + high) / 2;
}

export interface PaceRange {
	/** Pomalejší konec v s/km. */
	slow: number;
	/** Rychlejší konec v s/km. */
	fast: number;
}

export interface TrainingPaces {
	vdot: number;
	easy: PaceRange;
	marathon: number;
	threshold: PaceRange;
	interval: PaceRange;
	repetition: number;
}

/** Tréninková tempa E, M, T, I, R (s/km) z výsledku závodu nebo rekordu. */
export function trainingPaces(km: number, seconds: number): TrainingPaces | null {
	const value = vdot(km, seconds);
	if (value === null) return null;
	const repetition = equivalentTime(value, MILE_KM) / MILE_KM;
	// I je o 6–8 s na 400 m pomalejší než R → o 15–20 s na km.
	return {
		vdot: value,
		easy: { slow: paceAtFraction(value, 0.59), fast: paceAtFraction(value, 0.74) },
		marathon: equivalentTime(value, MARATHON_KM) / MARATHON_KM,
		threshold: { slow: paceAtFraction(value, 0.86), fast: paceAtFraction(value, 0.88) },
		interval: { slow: repetition + 20, fast: repetition + 15 },
		repetition,
	};
}

export interface QualityLimits {
	/** Tempový běh (T) v jednom tréninku. */
	thresholdKm: number;
	/** Intervaly (I) v jednom tréninku. */
	intervalKm: number;
	/** Opakované úseky (R) v jednom tréninku. */
	repetitionKm: number;
	/** Dlouhý běh. */
	longRunKm: number;
}

/** Danielsovy limity rychlých úseků podle týdenního objemu (km). */
export function qualityLimits(weeklyKm: number): QualityLimits | null {
	if (!(weeklyKm > 0)) return null;
	return {
		thresholdKm: weeklyKm * 0.1,
		intervalKm: Math.min(10, weeklyKm * 0.08),
		repetitionKm: Math.min(8, weeklyKm * 0.05),
		longRunKm: weeklyKm * 0.3,
	};
}

export type PaceKind = "E" | "M" | "T" | "I" | "R";

/**
 * Které Danielsovo tempo patří k běhu v plánu: podle názvu (intervaly → I, úseky
 * a rovinky → R, tempo a práh → T, maratonské → M), jinak podle intenzity –
 * těžký běh T, ostatní (i dlouhý běh) E.
 */
export function planPaceKind(title: string, intensity: "low" | "mid" | "high"): PaceKind {
	if (/interval|vo2/i.test(title)) return "I";
	if (/\brep(s|etition)?\b|strides|rovink|úsek/i.test(title)) return "R";
	if (/tempo|threshold|práh|prahov/i.test(title)) return "T";
	if (/marathon pace|maratonsk/i.test(title)) return "M";
	return intensity === "high" ? "T" : "E";
}

/** Rozpětí tempa (s/km) pro daný druh; jednohodnotová tempa mají stejné oba konce. */
export function paceRange(paces: TrainingPaces, kind: PaceKind): PaceRange {
	switch (kind) {
		case "E":
			return paces.easy;
		case "M":
			return { slow: paces.marathon, fast: paces.marathon };
		case "T":
			return paces.threshold;
		case "I":
			return paces.interval;
		case "R":
			return { slow: paces.repetition, fast: paces.repetition };
	}
}
