// Historie jednoho cviku (SPEC 5.3 – knihovna): všechny tréninky, kde se cvik
// objevil, řada nejlepších výkonů pro graf a nejlepší výkon. Bez závislosti na Obsidianu.

import { BLOCK_LABELS, type ExerciseMeasure } from "../model/constants";
import type { WorkoutNote } from "../model/types";
import { formatSets } from "./performance";
import { exerciseSeries, type RecordContext, type SessionBest } from "./records";
import { t, translated } from "../i18n";

/** Co se u cviku sleduje v grafu: odhad 1RM, nejvíc opakování v sérii, nebo nejdelší výdrž. */
export type HistoryMetric = "oneRm" | "reps" | "sec";

export const HISTORY_METRIC_LABELS: Record<HistoryMetric, string> = translated({
	oneRm: "Estimated 1RM (kg)",
	reps: "Most reps in a set",
	sec: "Longest hold (s)",
});

/** Do věty „nejlepší …“. */
export const HISTORY_BEST_LABELS: Record<HistoryMetric, string> = translated({ oneRm: "estimated 1RM", reps: "reps in a set", sec: "hold" });

export interface HistorySession {
	date: string;
	/** Co se ten den odcvičilo, např. „3×6 × 80 kg“; víc bloků odděluje středník. */
	text: string;
	/** Počet pracovních sérií. */
	sets: number;
}

export interface ExerciseHistory {
	/** Tréninky s cvikem od nejnovějšího. */
	sessions: HistorySession[];
	/** Sledovaná veličina; null, když z výkonů nejde žádná určit (např. jen EMOM). */
	metric: HistoryMetric | null;
	/** Nejlepší výkon každého dne od nejstaršího (jen dny, kde veličina je). */
	points: { date: string; value: number }[];
	/** Nejlepší výkon vůbec (při shodě ten dřívější). */
	best: { date: string; value: number } | null;
}

const key = (text: string) => text.trim().toLocaleLowerCase("cs");

function pickMetric(series: readonly SessionBest[]): HistoryMetric | null {
	if (series.some((s) => s.oneRm !== undefined)) return "oneRm";
	if (series.some((s) => s.reps !== undefined)) return "reps";
	return series.some((s) => s.sec !== undefined) ? "sec" : null;
}

/**
 * Historie cviku `name` (název z knihovny). `ctx.info` převádí aliasy na cvik
 * z knihovny, takže se sečtou i tréninky zapsané pod jiným názvem téhož cviku.
 */
export function exerciseHistory(workouts: readonly WorkoutNote[], name: string, measure: ExerciseMeasure, ctx: RecordContext): ExerciseHistory {
	const matches = (exercise: string) => key(ctx.info(exercise)?.name ?? exercise) === key(name);
	const byDate = new Map<string, { texts: string[]; sets: number }>();
	for (const workout of workouts) {
		for (const block of workout.blocks) {
			const own = "exercise" in block ? matches(block.exercise) : block.items.some((item) => matches(item.exercise));
			if (!own) continue;
			const day = byDate.get(workout.date) ?? { texts: [], sets: 0 };
			byDate.set(workout.date, day);
			if (block.type === "sets" || block.type === "hold") {
				const working = block.sets.filter((s) => !s.warmup);
				day.sets += working.length;
				day.texts.push(working.length > 0 ? formatSets(working, measure) : t("warm-up sets only"));
			} else {
				day.texts.push(BLOCK_LABELS[block.type]);
			}
		}
	}
	const sessions = [...byDate]
		.map(([date, day]) => ({ date, text: day.texts.join("; "), sets: day.sets }))
		.sort((a, b) => b.date.localeCompare(a.date));

	const series = [...exerciseSeries(workouts, ctx)].find(([exercise]) => key(exercise) === key(name))?.[1] ?? [];
	const metric = pickMetric(series);
	const points = metric === null ? [] : series.flatMap((s) => (s[metric] !== undefined ? [{ date: s.date, value: s[metric] }] : []));
	let best: ExerciseHistory["best"] = null;
	for (const point of points) if (best === null || point.value > best.value) best = point;
	return { sessions, metric, points, best };
}
