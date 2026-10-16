// Připravenost dne 0–100 (SPEC 8.9). Složky jsou podložené, jejich bodování a
// váhy jsou heuristika – celek nese štítek „praxe“. Bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import type { CheckInData } from "../model/types";
import { formatDurationMin, formatNumber, formatSigned } from "../ui/format";
import type { Baseline } from "./hrv";
import { clamp, mean } from "./stats";
import { t, translated } from "../i18n";

export const READINESS_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };

export type ReadinessPartId = "hrv" | "rhr" | "sleep" | "feel" | "form";

/** Váhy složek; chybějící složky se vynechají a zbytek se přepočítá na 100 %. */
export const READINESS_WEIGHTS: Record<ReadinessPartId, number> = { hrv: 25, rhr: 10, sleep: 25, feel: 25, form: 15 };

/** Body za stav proti osobní normě (pod / v / nad). */
export const NORM_SCORES = { bad: 30, within: 80, good: 90 } as const;

const PART_LABELS: Record<ReadinessPartId, string> = translated({
	hrv: "HRV (7 days vs baseline)",
	rhr: "Resting heart rate (7 days vs baseline)",
	sleep: "Sleep",
	feel: "How you feel (check-in)",
	form: "Form (fitness − fatigue)",
});

const PART_BASIS: Record<ReadinessPartId, Basis> = {
	hrv: { sourceIds: ["plews2012_2013"], evidence: "research" },
	rhr: { sourceIds: ["plews2012_2013"], evidence: "research" },
	sleep: { sourceIds: ["watson2015"], evidence: "consensus" },
	feel: { sourceIds: ["saw2016"], evidence: "research" },
	form: { sourceIds: ["banister"], evidence: "research" },
};

export interface ReadinessInput {
	/** lnRMSSD proti normě; null = bez měření. */
	hrv: Baseline | null;
	restingHr: Baseline | null;
	sleep: {
		durationMin?: number;
		/** 1–5. */
		quality?: number;
		/** Osobní průměr délky spánku; null = zatím málo nocí. */
		averageMin: number | null;
	} | null;
	checkIn: CheckInData | null;
	/** Kondice a forma; null, dokud model nemá dost dat. */
	form: { ctl: number; tsb: number } | null;
	sleepTargetHours: number;
}

export interface ReadinessPart {
	id: ReadinessPartId;
	label: string;
	/** 0–100. */
	score: number;
	/** Podíl na výsledku 0–1 (po přepočtu chybějících složek). */
	share: number;
	detail: string;
	basis: Basis;
}

export type ReadinessLevel = "ready" | "caution" | "rest";

export interface Readiness {
	score: number;
	level: ReadinessLevel;
	parts: ReadinessPart[];
	/** Názvy složek, které dnes chybí. */
	missing: string[];
}

/** Hodinu pod cílem = −25 bodů; od cílové délky 100. */
export function sleepDurationScore(durationMin: number, targetHours: number): number {
	const below = Math.max(0, targetHours * 60 - durationMin) / 60;
	return clamp(100 - 25 * below, 0, 100);
}

/** Kolik minut pod osobním průměrem už znamená srážku. */
export const SLEEP_BELOW_AVERAGE_MIN = 60;
export const SLEEP_BELOW_AVERAGE_PENALTY = 10;

export function sleepScore(sleep: NonNullable<ReadinessInput["sleep"]>, targetHours: number): number | null {
	const duration = sleep.durationMin !== undefined ? sleepDurationScore(sleep.durationMin, targetHours) : null;
	const quality = sleep.quality !== undefined ? ((clamp(sleep.quality, 1, 5) - 1) / 4) * 100 : null;
	if (duration === null && quality === null) return null;
	let score = duration !== null && quality !== null ? 0.6 * duration + 0.4 * quality : (duration ?? quality)!;
	if (sleep.durationMin !== undefined && sleep.averageMin !== null && sleep.averageMin - sleep.durationMin >= SLEEP_BELOW_AVERAGE_MIN) {
		score -= SLEEP_BELOW_AVERAGE_PENALTY;
	}
	return clamp(score, 0, 100);
}

/** Průměr vyplněných škál 1–5 (5 = nejlepší) převedený na 0–100. */
export function feelScore(checkIn: CheckInData): number | null {
	const values = [checkIn.fatigue, checkIn.soreness, checkIn.mood, checkIn.stress].filter((v): v is number => v !== undefined);
	const avg = mean(values);
	return avg === null ? null : ((clamp(avg, 1, 5) - 1) / 4) * 100;
}

/** Forma v poměru ke kondici: 0 → 60 bodů, −20 % kondice → 40, +40 % → 100. */
export function formScore(ctl: number, tsb: number): number | null {
	if (ctl <= 0) return null;
	return clamp(60 + 100 * (tsb / ctl), 0, 100);
}

const STATUS_TEXT = translated({ below: "below baseline", within: "within baseline", above: "above baseline" } as const);

// ---------- Trend připravenosti ----------

/** Kolik dní trend ukazuje a kolik skóre musí mít týden, aby se z něj počítal průměr. */
export const TREND_DAYS = 14;
export const TREND_MIN_SAMPLES = 3;

export interface ReadinessDay {
	date: string;
	/** Skóre dne; null = ten den nebylo z čeho počítat. */
	score: number | null;
}

export interface ReadinessTrend {
	/** Dny od nejstaršího po dnešek. */
	days: ReadinessDay[];
	/** Počet dnů se skóre. */
	samples: number;
	/** Průměr posledních 7 dnů; null, když v nich není aspoň 3× skóre. */
	recent: number | null;
	/** Průměr 7 dnů před nimi. */
	previous: number | null;
	/** O kolik se průměr posledního týdne liší od předchozího. */
	delta: number | null;
}

/**
 * Trend z denních skóre (od nejstaršího): průměr posledních 7 dnů proti 7 dnům
 * před nimi. Jeden den má malou výpovědní hodnotu – smysl dává až několik dní po sobě.
 */
export function readinessTrend(days: readonly ReadinessDay[]): ReadinessTrend {
	const average = (part: readonly ReadinessDay[]) => {
		const scores = part.map((d) => d.score).filter((s): s is number => s !== null);
		return scores.length >= TREND_MIN_SAMPLES ? mean(scores) : null;
	};
	const recent = average(days.slice(-7));
	const previous = average(days.slice(-14, -7));
	return {
		days: [...days],
		samples: days.filter((d) => d.score !== null).length,
		recent,
		previous,
		delta: recent !== null && previous !== null ? recent - previous : null,
	};
}

/** Hranice pro slovní hodnocení skóre. */
export const READINESS_LEVELS = { ready: 70, caution: 45 } as const;

/** Složené skóre; null, když dnes není z čeho počítat. */
export function readiness(input: ReadinessInput): Readiness | null {
	const scored: { id: ReadinessPartId; score: number; detail: string }[] = [];
	const missing: string[] = [];
	const add = (id: ReadinessPartId, score: number | null, detail: string) => {
		if (score === null) missing.push(PART_LABELS[id]);
		else scored.push({ id, score, detail });
	};

	if (input.hrv?.ready) {
		const s = input.hrv.status;
		add("hrv", s === "below" ? NORM_SCORES.bad : s === "above" ? NORM_SCORES.good : NORM_SCORES.within, STATUS_TEXT[s]);
	} else add("hrv", null, "");

	if (input.restingHr?.ready) {
		const s = input.restingHr.status;
		// U klidového tepu je horší být nad normou.
		add("rhr", s === "above" ? NORM_SCORES.bad : s === "below" ? NORM_SCORES.good : NORM_SCORES.within, STATUS_TEXT[s]);
	} else add("rhr", null, "");

	if (input.sleep) {
		const parts: string[] = [];
		if (input.sleep.durationMin !== undefined) {
			parts.push(t("{v} (target {v2} h)", { v: formatDurationMin(input.sleep.durationMin), v2: formatNumber(input.sleepTargetHours, 2) }));
		}
		if (input.sleep.quality !== undefined) parts.push(t("quality {quality}/5", { quality: input.sleep.quality }));
		add("sleep", sleepScore(input.sleep, input.sleepTargetHours), parts.join(" · "));
	} else add("sleep", null, "");

	if (input.checkIn) {
		const values = [input.checkIn.fatigue, input.checkIn.soreness, input.checkIn.mood, input.checkIn.stress].filter(
			(v): v is number => v !== undefined,
		);
		const avg = mean(values);
		add("feel", feelScore(input.checkIn), avg === null ? "" : t("average {v}/5", { v: formatNumber(avg, 1) }));
	} else add("feel", null, "");

	if (input.form) {
		add("form", formScore(input.form.ctl, input.form.tsb), t("form {v}, fitness {v2}", { v: formatSigned(input.form.tsb, 0), v2: formatNumber(input.form.ctl, 0) }));
	} else add("form", null, "");

	if (scored.length === 0) return null;
	const totalWeight = scored.reduce((sum, p) => sum + READINESS_WEIGHTS[p.id], 0);
	const parts: ReadinessPart[] = scored.map((p) => ({
		id: p.id,
		label: PART_LABELS[p.id],
		score: Math.round(p.score),
		share: READINESS_WEIGHTS[p.id] / totalWeight,
		detail: p.detail,
		basis: PART_BASIS[p.id],
	}));
	const score = Math.round(scored.reduce((sum, p) => sum + p.score * (READINESS_WEIGHTS[p.id] / totalWeight), 0));
	const level: ReadinessLevel = score >= READINESS_LEVELS.ready ? "ready" : score >= READINESS_LEVELS.caution ? "caution" : "rest";
	return { score, level, parts, missing };
}
