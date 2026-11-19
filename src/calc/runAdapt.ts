// Úprava naplánovaného běhu podle stavu: bolest nohou, nízká připravenost, vynechané
// běhy. Jen návrh s viditelným důvodem – plán se sám nemění. Pravidla jsou praxe
// trenérů (vynechané se nedohání, při únavě lehčeji a kratší), ne výzkum.
// Čisté funkce bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import type { MuscleId, PlanIntensity } from "../model/constants";
import { READINESS_LEVELS } from "./readiness";

export const RUN_ADAPT_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };

/** Partie, které běh zatěžuje – bolest jinde běh nemění. */
const RUN_MUSCLES: readonly MuscleId[] = ["glutes", "quads", "hamstrings", "calves", "lowback"];
/** Od této bolesti (0–10) běh vynechat a poradit se s odborníkem (CLAUDE.md: ≥ 4/10). */
export const RUN_PAIN_STOP = 4;
/** Kolik vynechaných běhů za 7 dní znamená „nedohánět“. */
export const RUN_MISSED_LIMIT = 2;

export interface RunAdaptInput {
	intensity: PlanIntensity;
	distance_km?: number;
	duration_min?: number;
	/** Připravenost dne běhu 0–100 (jen u dnešního běhu), jinak null. */
	readiness: number | null;
	/** Otevřené bolesti s aktuální intenzitou. */
	pains: readonly { muscle: MuscleId; level: number }[];
	/** Naplánované běhy za posledních 7 dní, které se nesplnily. */
	missedRuns: number;
}

export type RunAdaptReason = "pain_stop" | "pain" | "readiness" | "missed";

export interface RunAdaptation {
	reason: RunAdaptReason;
	/** rest = běh vynechat; easy = jen lehce; shorten = kratší. */
	action: "rest" | "easy" | "shorten";
	/** Navržená délka (zkrácená), když ji plán uvádí. */
	km?: number;
	minutes?: number;
}

const cut = (value: number | undefined, factor: number, digits: number) => (value === undefined ? undefined : Math.round(value * factor * 10 ** digits) / 10 ** digits);

/** Návrh úpravy běhu, nebo null, když je plán v pořádku. Platí první pravidlo podle závažnosti. */
export function adaptRun(input: RunAdaptInput): RunAdaptation | null {
	const legPain = Math.max(0, ...input.pains.filter((p) => RUN_MUSCLES.includes(p.muscle)).map((p) => p.level));
	if (legPain >= RUN_PAIN_STOP) return { reason: "pain_stop", action: "rest" };
	if (legPain > 0 && input.intensity !== "low") return { reason: "pain", action: "easy", km: cut(input.distance_km, 0.7, 1), minutes: cut(input.duration_min, 0.7, 0) };
	if (input.readiness !== null && input.readiness < READINESS_LEVELS.caution) {
		return input.intensity === "low" ? { reason: "readiness", action: "shorten", km: cut(input.distance_km, 0.7, 1), minutes: cut(input.duration_min, 0.7, 0) } : { reason: "readiness", action: "easy" };
	}
	if (input.missedRuns >= RUN_MISSED_LIMIT && input.intensity === "high") return { reason: "missed", action: "easy" };
	return null;
}
