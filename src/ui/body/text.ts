// Texty a barvy karty Tělo (SPEC 5.5). Bez závislosti na Obsidianu.

import type { CardioLoad, MuscleExerciseRow, Recovery } from "../../calc/muscleVolume";
import { formatDays, formatNumber } from "../format";
import { t, translated } from "../../i18n";

export type BodyMode = "volume" | "recovery" | "pain";

export const MODE_LABELS: Record<BodyMode, string> = translated({ volume: "Objem", recovery: "Regenerace", pain: "Bolesti" });

/** Barvy pásem bolesti: bez bolesti, mírná, střední, silná. */
export const PAIN_COLORS = [
	"var(--background-modifier-border-hover)",
	"color-mix(in srgb, var(--color-yellow) 70%, var(--background-modifier-border))",
	"var(--color-orange)",
	"var(--color-red)",
] as const;

export const PAIN_LEGEND = ["Bez bolesti", "Mírná (1–3)", "Střední (4–6)", "Silná (7–10)"] as const;

export interface MusclePain {
	name: string;
	level: number;
	days: number;
	seeProfessional: boolean;
}

/** Řádek o bolesti v detailu partie. */
export function painText(pains: readonly MusclePain[]): string {
	if (pains.length === 0) return t("Bez evidované bolesti.");
	return pains.map((p) => `${p.name} ${p.level}/10 (${formatDays(p.days)})`).join(" · ");
}

/** Barvy pásem – přes proměnné motivu, aby seděly ve světlém i tmavém režimu. */
export const VOLUME_COLORS = [
	"var(--background-modifier-border-hover)",
	"color-mix(in srgb, var(--interactive-accent) 45%, var(--background-modifier-border))",
	"var(--interactive-accent)",
	"var(--color-orange)",
] as const;

export const RECOVERY_COLORS = [
	"var(--color-red)",
	"var(--color-orange)",
	"color-mix(in srgb, var(--color-orange) 40%, var(--background-modifier-border))",
	"color-mix(in srgb, var(--interactive-accent) 45%, var(--background-modifier-border))",
] as const;

export interface VolumeRange {
	low: number;
	targetMin: number;
	targetMax: number;
}

export function volumeLegend(range: VolumeRange): string[] {
	return [
		t("Málo (pod {low})", { low: range.low }),
		t("Pod optimem ({from}–{to})", { from: range.low, to: range.targetMin - 1 }),
		t("Optimum ({from}–{to})", { from: range.targetMin, to: range.targetMax }),
		t("Nad rozsahem ({from}+)", { from: range.targetMax }),
	];
}

export const VOLUME_SHORT = ["Málo", "Pod optimem", "Optimum", "Nad rozsahem"] as const;

export function recoveryLegend(h1: number, h2: number, h3: number): string[] {
	return [t("Čerstvě zatížená (pod {h1} h)", { h1 }), t("Regeneruje ({h1}–{h2} h)", { h1, h2 }), t("Skoro připravená ({h2}–{h3} h)", { h2, h3 }), t("Odpočatá ({h3} h+)", { h3 })];
}

/** Počet sérií: celá čísla bez desetin, půlky s jednou ("9,5"). */
export function formatSetCount(sets: number): string {
	return formatNumber(sets, 1);
}

/** „Před 6 h“, „Včera“, „Před 3 dny“; bez tréninku „Zatím ne“. */
export function lastTrainedText(recovery: Recovery): string {
	if (recovery.hours === null) return t("Zatím ne");
	const hours = recovery.hours;
	if (hours < 1) return t("Před chvílí");
	if (hours < 24) return t("Před {v} h", { v: formatNumber(hours, 0) });
	const days = Math.floor(hours / 24);
	if (days === 1) return t("Včera");
	return t("Před {days} dny", { days });
}

/** Nejlepší série: „80 kg × 6“, „+10 kg × 6“, „tělo × 12“, „60 s“. */
export function bestSetText(best: MuscleExerciseRow["best"]): string {
	if (!best) return "—";
	if (best.reps === undefined) return best.sec !== undefined ? `${formatNumber(best.sec, 0)} s` : "—";
	if (best.kg !== undefined) return `${formatNumber(best.kg)} kg × ${best.reps}`;
	if (best.addedKg !== undefined && best.addedKg !== 0) {
		return `${best.addedKg > 0 ? "+" : "−"}${formatNumber(Math.abs(best.addedKg))} kg × ${best.reps}`;
	}
	return t("tělo × {reps}", { reps: best.reps });
}

/** Změna za 4 týdny: „+2,5 kg“, „−1 opak.“, „+10 s“, „=“; bez srovnání „nové“. */
export function changeText(change: MuscleExerciseRow["change"]): string {
	if (!change) return t("nové");
	const rounded = change.unit === "kg" ? Math.round(change.value * 2) / 2 : Math.round(change.value);
	if (rounded === 0) return "=";
	const unit = change.unit === "kg" ? "kg" : change.unit === "reps" ? t("opak.") : "s";
	return `${rounded > 0 ? "+" : "−"}${formatNumber(Math.abs(rounded))} ${unit}`;
}

/** „běh 18 km (2×)“, „plavání 2,4 km (1×)“, „švihadlo 3×“. */
export function cardioText(loads: readonly CardioLoad[]): string {
	return loads
		.map((load) => {
			if (load.sport === "swim") return load.distance > 0 ? t("plavání {v} km ({load_count}×)", { v: formatNumber(load.distance / 1000, 1), load_count: load.count }) : t("plavání {load_count}×", { load_count: load.count });
			if (load.sport === "rope") return t("švihadlo {load_count}×", { load_count: load.count });
			return load.distance > 0 ? t("běh {v} km ({load_count}×)", { v: formatNumber(load.distance, 1), load_count: load.count }) : t("běh {load_count}×", { load_count: load.count });
		})
		.join(" · ");
}

export interface BodyAdvice {
	text: string;
	/** Krátký zdroj vpravo. */
	source: string;
}

/** Věta k týdennímu objemu partie (Schoenfeld 2017). */
export function volumeAdvice(sets: number, range: VolumeRange): BodyAdvice {
	const source = t("Schoenfeld 2017 · výzkum");
	if (sets < range.targetMin) {
		const missing = Math.ceil(range.targetMin - sets);
		return { text: t("Pod doporučeným rozsahem {targetMin}–{targetMax} sérií týdně. Do optima chybí aspoň {missing}.", { targetMin: range.targetMin, targetMax: range.targetMax, missing }), source };
	}
	if (sets <= range.targetMax) return { text: t("Týdenní objem je v doporučeném rozsahu."), source };
	return { text: t("Nad {targetMax} sérií týdně už přínos dalšího objemu klesá – zvaž ubrání.", { targetMax: range.targetMax }), source };
}

/** Věta k regeneraci partie (orientační pásma). */
export function recoveryAdvice(recovery: Recovery, h2: number, h3: number): BodyAdvice {
	const source = t("orientačně {h2}–{h3} h · praxe", { h2, h3 });
	if (recovery.hours === null) return { text: t("V poslední době netrénovaná – můžeš ji zařadit."), source };
	if (recovery.hours < h2) {
		return { text: t("Ještě regeneruje. Těžší trénink nejdřív za {v} h.", { v: formatNumber(Math.max(1, h2 - recovery.hours), 0) }), source };
	}
	if (recovery.hours < h3) return { text: t("Skoro připravená – zítra můžeš jít naplno."), source };
	return { text: t("Odpočatá, můžeš ji dnes trénovat."), source };
}

/** Body polyline grafu trendu a poloha pásu doporučeného rozsahu. */
export interface TrendGeometry {
	points: string;
	lastX: number;
	lastY: number;
	bandY: number;
	bandHeight: number;
}

export const TREND_WIDTH = 500;
export const TREND_HEIGHT = 90;

/** Graf 8 týdnů: osa Y od 0 do max(24, nejvyšší hodnota), okraje 10 px vodorovně a 6 px svisle. */
export function trendGeometry(values: readonly number[], range: VolumeRange): TrendGeometry {
	const top = Math.max(24, ...values);
	const y = (v: number) => 6 + (1 - v / top) * (TREND_HEIGHT - 12);
	const step = values.length > 1 ? (TREND_WIDTH - 20) / (values.length - 1) : 0;
	const x = (i: number) => 10 + i * step;
	const last = values.length - 1;
	return {
		points: values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" "),
		lastX: x(Math.max(0, last)),
		lastY: y(values[last] ?? 0),
		bandY: y(range.targetMax),
		bandHeight: y(range.targetMin) - y(range.targetMax),
	};
}
