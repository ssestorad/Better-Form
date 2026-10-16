// Bolesti a zranění (SPEC 4.6, 5.10, pravidlo 8 v kap. 10). Plugin nediagnostikuje –
// jen eviduje intenzitu a při prahu doporučí odborníka. Bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import { MUSCLES, type BodySide, type MuscleId, type PainStatus } from "../model/constants";
import { addDays, daysBetween } from "../model/dates";
import type { PainNote } from "../model/types";

/** Prahy (4/10, 7 dní) jsou opatrná zvyklost, ne výsledek výzkumu. */
export const PAIN_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };

export interface PainThresholds {
	/** Od této intenzity doporučit odborníka (výchozí 4). */
	professionalLevel: number;
	/** Po kolika dnech bez zlepšení doporučit odborníka (výchozí 7). */
	professionalDays: number;
}

/** Bolest zapsaná u tréninku (SPEC 5.3): existující záznam, nebo nová. */
export interface PainReport {
	/** Název existujícího záznamu; prázdné = nová bolest podle `draft`. */
	existing?: string;
	/** Intenzita 0–10 při tréninku. */
	level: number;
	draft?: { name: string; muscle: MuscleId; side?: BodySide; trigger?: string };
}

export function isOpenPain(pain: PainNote): boolean {
	return pain.status !== "resolved";
}

export interface PainAssessment {
	name: string;
	muscle: MuscleId;
	side?: BodySide;
	level: number;
	status: PainStatus;
	/** Kolik dní bolest trvá. */
	days: number;
	/** Intenzita je nižší než před `professionalDays` dny (nebo než na začátku). */
	improving: boolean;
	seeProfessional: boolean;
	/** Proč: vysoká intenzita, nebo dlouhé trvání bez zlepšení. */
	reason: "level" | "duration" | null;
}

/** Vyhodnocení otevřené bolesti k datu `today`. */
export function assessPain(pain: PainNote, today: string, th: PainThresholds): PainAssessment {
	const days = Math.max(0, daysBetween(pain.since, today));
	// Srovnávací intenzita: poslední záznam starý aspoň `professionalDays` dní, jinak první.
	const cutoff = addDays(today, -th.professionalDays);
	const older = pain.history.filter((h) => h.date <= cutoff);
	const reference = older[older.length - 1]?.level ?? pain.history[0]?.level ?? pain.level;
	const improving = pain.level < reference;
	let reason: PainAssessment["reason"] = null;
	if (pain.level >= th.professionalLevel) reason = "level";
	else if (pain.level > 0 && days > th.professionalDays && !improving) reason = "duration";
	return {
		name: pain.name,
		muscle: pain.muscle,
		side: pain.side,
		level: pain.level,
		status: pain.status,
		days,
		improving,
		seeProfessional: reason !== null,
		reason,
	};
}

/**
 * Zapíše intenzitu k datu (záznam téhož dne nahradí). Stav: 0 = vyřešená,
 * nižší než předchozí záznam = zlepšuje se, jinak aktivní.
 */
export function recordPain(pain: PainNote, date: string, level: number): PainNote {
	const clamped = Math.min(10, Math.max(0, Math.round(level)));
	const history = [...pain.history.filter((h) => h.date !== date), { date, level: clamped }].sort((a, b) => a.date.localeCompare(b.date));
	const latest = history[history.length - 1]!;
	const previous = history[history.length - 2];
	const status: PainStatus = latest.level === 0 ? "resolved" : previous && latest.level < previous.level ? "improving" : "active";
	return { ...pain, history, level: latest.level, status, since: history[0]!.date < pain.since ? history[0]!.date : pain.since };
}

/** Nejvyšší intenzita otevřené bolesti na každé partii (0 = bez bolesti). */
export function painLevels(pains: readonly PainNote[]): Record<MuscleId, number> {
	const levels = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<MuscleId, number>;
	for (const pain of pains) {
		if (isOpenPain(pain)) levels[pain.muscle] = Math.max(levels[pain.muscle], pain.level);
	}
	return levels;
}

/** Pásmo pro obarvení panáčka: 0 = bez bolesti, 1 = mírná (1–3), 2 = střední (4–6), 3 = silná (7–10). */
export function painCategory(level: number): 0 | 1 | 2 | 3 {
	if (level <= 0) return 0;
	if (level <= 3) return 1;
	return level <= 6 ? 2 : 3;
}
