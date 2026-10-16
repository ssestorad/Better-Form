// Texty a barvy karty Tělo (SPEC 5.5). Bez závislosti na Obsidianu.

import type { CardioLoad, MuscleExerciseRow, Recovery } from "../../calc/muscleVolume";
import { formatDays, formatNumber } from "../format";
import { t, tn, translated } from "../../i18n";

export type BodyMode = "volume" | "recovery" | "pain";

export const MODE_LABELS: Record<BodyMode, string> = translated({ volume: "Volume", recovery: "Recovery", pain: "Pain" });

/** Barvy pásem bolesti: bez bolesti, mírná, střední, silná. */
export const PAIN_COLORS = [
	"var(--background-modifier-border-hover)",
	"color-mix(in srgb, var(--color-yellow) 70%, var(--background-modifier-border))",
	"var(--color-orange)",
	"var(--color-red)",
] as const;

export const PAIN_LEGEND = ["Bez bolesti", "Mild (1–3)", "Moderate (4–6)", "Severe (7–10)"] as const;

export interface MusclePain {
	name: string;
	level: number;
	days: number;
	seeProfessional: boolean;
}

/** Řádek o bolesti v detailu partie. */
export function painText(pains: readonly MusclePain[]): string {
	if (pains.length === 0) return t("No pain logged.");
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
		t("Low (below {low})", { low: range.low }),
		t("Below optimum ({from}–{to})", { from: range.low, to: range.targetMin - 1 }),
		t("Optimum ({from}–{to})", { from: range.targetMin, to: range.targetMax }),
		t("Above range ({from}+)", { from: range.targetMax }),
	];
}

export const VOLUME_SHORT = ["Low", "Pod optimem", "Optimum", "Nad rozsahem"] as const;

export function recoveryLegend(h1: number, h2: number, h3: number): string[] {
	return [t("Recently loaded (under {h1} h)", { h1 }), t("Recovering ({h1}–{h2} h)", { h1, h2 }), t("Almost ready ({h2}–{h3} h)", { h2, h3 }), t("Rested ({h3} h+)", { h3 })];
}

/** Počet sérií: celá čísla bez desetin, půlky s jednou ("9,5"). */
export function formatSetCount(sets: number): string {
	return formatNumber(sets, 1);
}

/** „Před 6 h“, „Včera“, „Před 3 dny“; bez tréninku „Zatím ne“. */
export function lastTrainedText(recovery: Recovery): string {
	if (recovery.hours === null) return t("Not yet");
	const hours = recovery.hours;
	if (hours < 1) return t("Just now");
	if (hours < 24) return t("{v} h ago", { v: formatNumber(hours, 0) });
	const days = Math.floor(hours / 24);
	if (days === 1) return t("Yesterday");
	return tn(days, ["{n} day ago", "{n} days ago"]);
}

/** Nejlepší série: „80 kg × 6“, „+10 kg × 6“, „tělo × 12“, „60 s“. */
export function bestSetText(best: MuscleExerciseRow["best"]): string {
	if (!best) return "—";
	if (best.reps === undefined) return best.sec !== undefined ? `${formatNumber(best.sec, 0)} s` : "—";
	if (best.kg !== undefined) return `${formatNumber(best.kg)} kg × ${best.reps}`;
	if (best.addedKg !== undefined && best.addedKg !== 0) {
		return `${best.addedKg > 0 ? "+" : "−"}${formatNumber(Math.abs(best.addedKg))} kg × ${best.reps}`;
	}
	return t("body × {reps}", { reps: best.reps });
}

/** Změna za 4 týdny: „+2,5 kg“, „−1 opak.“, „+10 s“, „=“; bez srovnání „nové“. */
export function changeText(change: MuscleExerciseRow["change"]): string {
	if (!change) return t("new");
	const rounded = change.unit === "kg" ? Math.round(change.value * 2) / 2 : Math.round(change.value);
	if (rounded === 0) return "=";
	const unit = change.unit === "kg" ? "kg" : change.unit === "reps" ? t("reps", undefined, "abbr") : "s";
	return `${rounded > 0 ? "+" : "−"}${formatNumber(Math.abs(rounded))} ${unit}`;
}

/** „běh 18 km (2×)“, „plavání 2,4 km (1×)“, „švihadlo 3×“. */
export function cardioText(loads: readonly CardioLoad[]): string {
	return loads
		.map((load) => {
			if (load.sport === "swim") return load.distance > 0 ? t("swim {v} km ({load_count}×)", { v: formatNumber(load.distance / 1000, 1), load_count: load.count }) : t("swim {load_count}×", { load_count: load.count });
			if (load.sport === "rope") return t("jump rope {load_count}×", { load_count: load.count });
			return load.distance > 0 ? t("run {v} km ({load_count}×)", { v: formatNumber(load.distance, 1), load_count: load.count }) : t("run {load_count}×", { load_count: load.count });
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
	const source = t("Schoenfeld 2017 · research");
	if (sets < range.targetMin) {
		const missing = Math.ceil(range.targetMin - sets);
		return { text: t("Below the recommended range of {targetMin}–{targetMax} sets per week. At least {missing} short of the optimum.", { targetMin: range.targetMin, targetMax: range.targetMax, missing }), source };
	}
	if (sets <= range.targetMax) return { text: t("Weekly volume is in the recommended range."), source };
	return { text: t("Above {targetMax} sets per week the benefit of more volume declines – consider cutting back.", { targetMax: range.targetMax }), source };
}

/** Věta k regeneraci partie (orientační pásma). */
export function recoveryAdvice(recovery: Recovery, h2: number, h3: number): BodyAdvice {
	const source = t("roughly {h2}–{h3} h · practice", { h2, h3 });
	if (recovery.hours === null) return { text: t("Not trained recently – you can add it."), source };
	if (recovery.hours < h2) {
		return { text: t("Still recovering. Hard training in {v} h at the earliest.", { v: formatNumber(Math.max(1, h2 - recovery.hours), 0) }), source };
	}
	if (recovery.hours < h3) return { text: t("Almost ready – you can go all out tomorrow."), source };
	return { text: t("Rested, you can train it today."), source };
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
