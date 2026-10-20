// Výkony u cviků: poslední výkon, zkrácený zápis sérií, časy a tempo běhu.
// Bez závislosti na Obsidianu.

import { t } from "../i18n";
import { SET_TAG_LABELS, SET_TAGS, type ExerciseMeasure } from "../model/constants";
import type { Block, SetEntry, WorkoutNote } from "../model/types";
import { formatNumber } from "../ui/format";

// ---------- Poslední výkon ----------

/** Cviky, kterých se blok týká (u AMRAP a komplexu všechny položky). */
export function blockExercises(block: Block): string[] {
	return block.type === "amrap" || block.type === "complex" ? block.items.map((i) => i.exercise) : [block.exercise];
}

export interface ExercisePerformance {
	date: string;
	/** Všechny bloky s daným cvikem z posledního tréninku, kde se cvik objevil. */
	blocks: Block[];
}

/**
 * Poslední trénink (nejpozději v den `onOrBefore`), kde se cvik objevil.
 * `isSameExercise` porovná odkaz v bloku s hledaným cvikem (i přes aliasy).
 */
export function lastPerformance(
	workouts: WorkoutNote[],
	isSameExercise: (exercise: string) => boolean,
	onOrBefore: string,
): ExercisePerformance | undefined {
	const sorted = workouts
		.filter((w) => w.date <= onOrBefore)
		.sort((a, b) => (b.date + (b.start ?? "")).localeCompare(a.date + (a.start ?? "")));
	for (const workout of sorted) {
		const blocks = workout.blocks.filter((b) => blockExercises(b).some(isSameExercise));
		if (blocks.length > 0) return { date: workout.date, blocks };
	}
	return undefined;
}

/** Série ze všech bloků typu „série“ / „výdrž“ posledního výkonu. */
export function performanceSets(performance: ExercisePerformance | undefined): SetEntry[] {
	if (!performance) return [];
	return performance.blocks.flatMap((b) => (b.type === "sets" || b.type === "hold" ? b.sets : []));
}

// ---------- Zkrácený zápis sérií ----------

function kg(value: number): string {
	return `${formatNumber(value, 2)} kg`;
}

function signedKg(value: number): string {
	return value > 0 ? `+${kg(value)}` : `−${kg(-value)}`;
}

function allEqual<T>(values: T[]): boolean {
	return values.every((v) => v === values[0]);
}

/** Pracovní série: „3×6 × 80 kg“, „6, 6, 5 × 80 kg“, „6×80, 5×85 kg“, „3×10 +10 kg“, „30 s, 25 s“. */
function formatWorking(sets: SetEntry[], measure: ExerciseMeasure): string {
	const timed = measure === "seconds" || sets.every((s) => s.reps === undefined && s.sec !== undefined);
	const weights = sets.map((s) => (measure === "reps_bw" ? s.added_kg : s.kg));
	const values = sets.map((s) => (timed ? s.sec : s.reps));
	const unit = timed ? " s" : "";
	const valueText = (v: number | undefined) => (v === undefined ? "?" : formatNumber(v, 1));

	let volume: string;
	if (allEqual(values) && sets.length > 1) volume = `${sets.length}×${valueText(values[0])}${unit}`;
	else volume = values.map(valueText).join(", ") + unit;

	const weightDefined = weights.filter((w): w is number => w !== undefined && w !== 0);
	if (weightDefined.length === 0) return volume;
	if (allEqual(weights)) {
		const w = weights[0]!;
		return measure === "reps_bw" ? `${volume} ${signedKg(w)}` : `${volume} × ${kg(w)}`;
	}
	// Různé váhy: každá série zvlášť.
	return sets
		.map((_, i) => {
			const w = weights[i];
			const v = `${valueText(values[i])}${unit}`;
			if (w === undefined || w === 0) return v;
			return measure === "reps_bw" ? `${v} ${signedKg(w)}` : `${v}×${formatNumber(w, 2)}`;
		})
		.join(", ") + (measure === "reps_bw" ? "" : " kg");
}

/** Celý zápis sérií včetně rozcvičení a RIR: „warm-up 10×40, 5×60 kg · 3×6 × 80 kg (RIR 2, 2, 1)“. */
export function formatSets(sets: SetEntry[], measure: ExerciseMeasure): string {
	const warmups = sets.filter((s) => s.warmup);
	const working = sets.filter((s) => !s.warmup);
	const parts: string[] = [];
	if (warmups.length > 0) parts.push(t("warm-up {v}", { v: formatWorking(warmups, measure) }, "sets"));
	if (working.length > 0) {
		const rirs = working.map((s) => s.rir);
		const rirText = rirs.some((r) => r !== undefined)
			? ` (RIR ${rirs.map((r) => (r === undefined ? "–" : formatNumber(r, 0))).join(", ")})`
			: "";
		parts.push(formatWorking(working, measure) + rirText);
		const tags = SET_TAGS.map((tag) => ({ tag, count: working.filter((s) => s.tag === tag).length })).filter((x) => x.count > 0);
		if (tags.length > 0) parts.push(tags.map((x) => `${x.count}× ${SET_TAG_LABELS[x.tag]}`).join(", "));
	}
	return parts.join(" · ");
}

// ---------- Časy a tempo ----------

/**
 * Čas zadaný jako „h:mm:ss“, „mm:ss“ nebo jen minuty („45“) → sekundy.
 * Neplatný vstup → null.
 */
export function parseClockDuration(text: string): number | null {
	const trimmed = text.trim();
	if (trimmed === "") return null;
	const parts = trimmed.split(":");
	if (parts.length > 3 || parts.some((p) => !/^\d+([.,]\d+)?$/.test(p))) return null;
	const numbers = parts.map((p) => Number(p.replace(",", ".")));
	if (numbers.length === 1) return Math.round(numbers[0]! * 60);
	const [a, b, c] = numbers as [number, number, number?];
	if (b >= 60 || (c !== undefined && c >= 60)) return null;
	return Math.round(c === undefined ? a * 60 + b : a * 3600 + b * 60 + c);
}

/** 3310 → „55:10“, 3930 → „1:05:30“. */
export function formatClockDuration(seconds: number): string {
	const total = Math.max(0, Math.round(seconds));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const ss = String(s).padStart(2, "0");
	return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Tempo v sekundách na km, nebo null. */
export function paceSecondsPerKm(distanceKm: number | undefined, seconds: number | undefined): number | null {
	if (!distanceKm || !seconds || distanceKm <= 0 || seconds <= 0) return null;
	return seconds / distanceKm;
}

/** Průměrné tempo běhů po dnech v s/km (víc běhů za den = celková vzdálenost a čas), od nejstaršího. */
export function runPacePoints(workouts: readonly WorkoutNote[]): { date: string; value: number }[] {
	const totals = new Map<string, { km: number; sec: number }>();
	for (const workout of workouts) {
		const km = workout.sport === "run" ? workout.run?.distance_km : undefined;
		const sec = workout.run?.moving_time_s ?? (workout.duration_min !== undefined ? workout.duration_min * 60 : undefined);
		if (paceSecondsPerKm(km, sec) === null) continue;
		const day = totals.get(workout.date) ?? { km: 0, sec: 0 };
		day.km += km!;
		day.sec += sec!;
		totals.set(workout.date, day);
	}
	return [...totals].map(([date, day]) => ({ date, value: day.sec / day.km })).sort((a, b) => a.date.localeCompare(b.date));
}

/** 325 → „5:25 /km“. */
export function formatPace(secondsPerKm: number): string {
	return `${formatClockDuration(secondsPerKm)} /km`;
}

/** Rozvinutí zápisu příček žebříku: „1-5“ → [1,2,3,4,5], „5-1“ → [5,4,3,2,1], „2, 4, 6“ → [2,4,6]. */
export function parseLadderSteps(text: string): number[] {
	const range = text.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
	if (range) {
		const from = Number(range[1]);
		const to = Number(range[2]);
		if (Math.abs(to - from) > 50) return [];
		const step = from <= to ? 1 : -1;
		const steps: number[] = [];
		for (let n = from; step > 0 ? n <= to : n >= to; n += step) steps.push(n);
		return steps.filter((n) => n > 0);
	}
	return text
		.split(/[,;\s]+/)
		.filter((p) => p !== "")
		.map(Number)
		.filter((n) => Number.isInteger(n) && n > 0);
}
