// Návrh odlehčeného týdne (SPEC 9.4): aspoň dva ze čtyř signálů. Jednotlivé
// signály mají oporu, jejich kombinace je heuristika (praxe).
// Bez závislosti na Obsidianu.

import { addDays } from "../model/dates";
import type { DayNote } from "../model/types";
import { formatNumber } from "../ui/format";
import type { SessionBest } from "./records";
import { mean } from "./stats";
import { t } from "../i18n";

// ---------- Zhoršující se check-in ----------

/** Průměr pocitů za poslední 3 dny proti předchozím 14 dnům. */
export const CHECKIN_RECENT_DAYS = 3;
export const CHECKIN_BEFORE_DAYS = 14;
/** O kolik bodů (škála 1–5) musí průměr klesnout. */
export const CHECKIN_DROP = 0.5;
export const CHECKIN_MIN_RECENT = 2;
export const CHECKIN_MIN_BEFORE = 5;

export interface CheckInTrend {
	/** Průměr pocitů (1–5, 5 = nejlepší) za poslední dny; null bez dat. */
	recent: number | null;
	before: number | null;
	worsening: boolean;
}

/** Průměr vyplněných škál dne (únava, svaly, nálada, stres); null bez check-inu. */
export function dayFeeling(day: DayNote): number | null {
	const c = day.check_in;
	return mean([c.fatigue, c.soreness, c.mood, c.stress].filter((v): v is number => v !== undefined));
}

export function checkInTrend(days: readonly DayNote[], today: string): CheckInTrend {
	const recentFrom = addDays(today, -(CHECKIN_RECENT_DAYS - 1));
	const beforeFrom = addDays(recentFrom, -CHECKIN_BEFORE_DAYS);
	const recent: number[] = [];
	const before: number[] = [];
	for (const day of days) {
		const feeling = dayFeeling(day);
		if (feeling === null || day.date > today || day.date < beforeFrom) continue;
		(day.date >= recentFrom ? recent : before).push(feeling);
	}
	const r = recent.length >= CHECKIN_MIN_RECENT ? mean(recent) : null;
	const b = before.length >= CHECKIN_MIN_BEFORE ? mean(before) : null;
	return { recent: r, before: b, worsening: r !== null && b !== null && b - r >= CHECKIN_DROP };
}

// ---------- Stagnace výkonů ----------

export interface Stagnation {
	/** Cviky, u kterých je s čím srovnávat. */
	tracked: string[];
	/** Cviky, které se v posledních týdnech zlepšily. */
	improved: string[];
	stagnating: boolean;
}

/** Kolik tréninků cviku musí být v posledních týdnech, aby se posuzoval. */
export const STAGNATION_MIN_SESSIONS = 2;

function metric(sessions: readonly SessionBest[]): (s: SessionBest) => number | undefined {
	if (sessions.some((s) => s.oneRm !== undefined)) return (s) => s.oneRm;
	if (sessions.some((s) => s.reps !== undefined)) return (s) => s.reps;
	return (s) => s.sec;
}

/**
 * Stagnace: žádný z pravidelně cvičených cviků se za posledních `weeks` týdnů
 * nezlepšil proti nejlepšímu výkonu z dvojnásobně dlouhého období před tím.
 */
export function stagnation(series: ReadonlyMap<string, readonly SessionBest[]>, today: string, weeks: number): Stagnation {
	const recentFrom = addDays(today, -(weeks * 7 - 1));
	const beforeFrom = addDays(recentFrom, -weeks * 14);
	const tracked: string[] = [];
	const improved: string[] = [];
	for (const [name, sessions] of series) {
		const value = metric(sessions);
		const recent = sessions.filter((s) => s.date >= recentFrom && s.date <= today).map(value).filter((v): v is number => v !== undefined);
		const before = sessions.filter((s) => s.date >= beforeFrom && s.date < recentFrom).map(value).filter((v): v is number => v !== undefined);
		if (recent.length < STAGNATION_MIN_SESSIONS || before.length === 0) continue;
		tracked.push(name);
		if (Math.max(...recent) > Math.max(...before)) improved.push(name);
	}
	return { tracked, improved, stagnating: tracked.length > 0 && improved.length === 0 };
}

// ---------- Složení signálů ----------

export interface DeloadInput {
	/** Kolik z posledních `tsbDays` dní byla forma pod prahem; null = model nemá data. */
	lowFormDays: number | null;
	tsbDays: number;
	tsbPct: number;
	/** Kolik z posledních 7 dní bylo HRV pod normou; null = norma není. */
	hrvLowDays: number | null;
	hrvDaysNeeded: number;
	checkIn: CheckInTrend;
	stagnation: Stagnation;
	stagnationWeeks: number;
}

export interface DeloadSignals {
	lowForm: boolean;
	hrvLow: boolean;
	checkInWorse: boolean;
	stagnating: boolean;
	/** Počet splněných signálů (0–4). */
	count: number;
	/** Navrhnout odlehčený týden (aspoň dva signály). */
	suggest: boolean;
	/** Slovní popis splněných signálů. */
	reasons: string[];
}

export const DELOAD_MIN_SIGNALS = 2;

export function deloadSignals(input: DeloadInput): DeloadSignals {
	const lowForm = input.lowFormDays !== null && input.lowFormDays >= input.tsbDays;
	const hrvLow = input.hrvLowDays !== null && input.hrvLowDays >= input.hrvDaysNeeded;
	const checkInWorse = input.checkIn.worsening;
	const stagnating = input.stagnation.stagnating;
	const reasons: string[] = [];
	if (lowForm) reasons.push(t("Forma je {tsbDays} dní v řadě víc než {tsbPct} % pod kondicí.", { tsbDays: input.tsbDays, tsbPct: input.tsbPct }));
	if (hrvLow) reasons.push(t("HRV bylo {hrvLowDays} z posledních 7 dní pod osobní normou.", { hrvLowDays: input.hrvLowDays ?? 0 }));
	if (checkInWorse) {
		reasons.push(
			t("Pocity z check-inu se zhoršily: průměr {v}/5 za poslední {CHECKIN_RECENT_DAYS} dny proti {v2}/5 předtím.", { v: formatNumber(input.checkIn.recent!, 1), CHECKIN_RECENT_DAYS, v2: formatNumber(input.checkIn.before!, 1) }),
		);
	}
	if (stagnating) {
		reasons.push(t("Výkony {stagnationWeeks} týdny nerostou ({v}).", { stagnationWeeks: input.stagnationWeeks, v: input.stagnation.tracked.slice(0, 3).join(", ") }));
	}
	const count = reasons.length;
	return { lowForm, hrvLow, checkInWorse, stagnating, count, suggest: count >= DELOAD_MIN_SIGNALS, reasons };
}
