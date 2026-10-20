// Čitelný souhrn poznámky tréninku (generovaný blok). Bez závislosti na Obsidianu.

import { sessionLoad } from "../calc/load";
import { formatClockDuration, formatPace, formatSets, paceSecondsPerKm } from "../calc/performance";
import type { ExerciseMeasure, RunType, SwimStyle } from "../model/constants";
import type { Block, BlockItem, WorkoutNote } from "../model/types";
import { formatNumber, formatSeconds } from "../ui/format";
import { inContext, t, tn, translated } from "../i18n";

export const RUN_TYPE_LABELS: Record<RunType, string> = translated({
	easy: inContext("run", "easy"),
	long: "long",
	tempo: "tempo",
	intervals: "intervals",
	race: "race",
});

export const SWIM_STYLE_LABELS: Record<SwimStyle, string> = translated({
	freestyle: "freestyle",
	breaststroke: "breaststroke",
	backstroke: "backstroke",
	butterfly: "butterfly",
	mixed: "mixed",
});

function weightText(kg: number | undefined, addedKg: number | undefined): string {
	if (kg !== undefined) return `${formatNumber(kg, 2)} kg`;
	if (addedKg !== undefined && addedKg !== 0) return `${addedKg > 0 ? "+" : "−"}${formatNumber(Math.abs(addedKg), 2)} kg`;
	return "";
}

function itemText(item: BlockItem): string {
	const amount = item.reps !== undefined ? `${item.reps}× ` : item.sec !== undefined ? `${formatSeconds(item.sec)} ` : "";
	const weight = weightText(item.kg, item.added_kg);
	return `${amount}${item.exercise}${weight ? ` (${weight})` : ""}`;
}

function withRpe(text: string, rpe: number | undefined): string {
	return rpe === undefined ? text : `${text} · RPE ${formatNumber(rpe)}`;
}

/** Jeden řádek souhrnu bloku; `measureOf` vrátí typ měření cviku z knihovny. */
export function blockLine(block: Block, measureOf: (exercise: string) => ExerciseMeasure | undefined): string {
	switch (block.type) {
		case "sets":
		case "hold": {
			const measure = measureOf(block.exercise) ?? (block.type === "hold" ? "seconds" : "reps_kg");
			return `${block.superset ? "↳ superset – " : ""}**${block.exercise}:** ${formatSets(block.sets, measure)}`;
		}
		case "emom": {
			const weight = weightText(block.kg, block.added_kg);
			const rounds = block.rounds !== undefined && block.rounds !== block.minutes ? t(" ({rounds} rounds done)", { rounds: block.rounds }) : "";
			return withRpe(
				tn(block.reps_per_min, ["**{exercise}:** EMOM {minutes} min × {n} rep{v}{rounds}", "**{exercise}:** EMOM {minutes} min × {n} reps{v}{rounds}"], { exercise: block.exercise, minutes: block.minutes, v: weight ? `, ${weight}` : "", rounds }),
				block.rpe,
			);
		}
		case "amrap": {
			const extra = block.extra_reps ? tn(block.extra_reps, [" + {n} rep", " + {n} reps"]) : "";
			return withRpe(
				t("**AMRAP {minutes} min:** {v} – {rounds} rounds{extra}", { minutes: block.minutes, v: block.items.map(itemText).join(", "), rounds: block.rounds, extra }),
				block.rpe,
			);
		}
		case "ladder": {
			const total = block.steps.reduce((sum, n) => sum + n, 0);
			const weight = weightText(block.kg, block.added_kg);
			return t("**{exercise}:** ladder {v} ({total} in total){v2}", { exercise: block.exercise, v: block.steps.join("-"), total, v2: weight ? `, ${weight}` : "" });
		}
		case "complex": {
			const weight = block.kg !== undefined ? `, ${formatNumber(block.kg, 2)} kg` : "";
			return withRpe(t("**Complex:** {v} – {rounds} rounds{weight}", { v: block.items.map(itemText).join(" + "), rounds: block.rounds, weight }), block.rpe);
		}
		case "timed": {
			const weight = weightText(block.kg, block.added_kg);
			const reps = block.reps !== undefined ? tn(block.reps, ["{n} rep in ", "{n} reps in "]) : "";
			return `**${block.exercise}:** ${reps}${formatSeconds(block.sec)}${weight ? `, ${weight}` : ""}`;
		}
	}
}

export function runLine(note: WorkoutNote): string | null {
	const run = note.run;
	if (!run || (run.distance_km === undefined && run.moving_time_s === undefined)) return null;
	const parts: string[] = [];
	if (run.distance_km !== undefined) parts.push(`${formatNumber(run.distance_km, 2)} km`);
	if (run.moving_time_s !== undefined) parts.push(t("in {v}", { v: formatClockDuration(run.moving_time_s) }));
	const pace = paceSecondsPerKm(run.distance_km, run.moving_time_s);
	let text = t("**Run:** {v}{v2}", { v: parts.join(" "), v2: pace !== null ? ` (${formatPace(pace)})` : "" });
	const extra: string[] = [];
	if (run.type) extra.push(RUN_TYPE_LABELS[run.type]);
	if (run.avg_hr !== undefined) extra.push(t("heart rate {avg_hr}{v}", { avg_hr: run.avg_hr, v: run.max_hr !== undefined ? `/${run.max_hr}` : "" }));
	if (run.elevation_m !== undefined) extra.push(t("elevation gain {v} m", { v: formatNumber(run.elevation_m, 0) }));
	if (run.cadence_spm !== undefined) extra.push(t("cadence {v} steps/min", { v: formatNumber(run.cadence_spm, 0) }));
	if (run.shoes) extra.push(t("shoes [[{shoes}]]", { shoes: run.shoes }));
	if (extra.length > 0) text += ` · ${extra.join(" · ")}`;
	return text;
}

export function swimLine(note: WorkoutNote): string | null {
	const swim = note.swim;
	if (!swim || swim.distance_m === undefined) return null;
	const details: string[] = [];
	if (swim.style) details.push(SWIM_STYLE_LABELS[swim.style]);
	if (swim.pool_m !== undefined) details.push(t("pool {pool_m} m", { pool_m: swim.pool_m }));
	return t("**Swim:** {v} m{v2}", { v: formatNumber(swim.distance_m, 0), v2: details.length > 0 ? ` (${details.join(", ")})` : "" });
}

export function ropeLine(note: WorkoutNote): string | null {
	if (note.rope?.jumps === undefined) return null;
	return t("**Jump rope:** {v} jumps", { v: formatNumber(note.rope.jumps, 0) });
}

export function loadLine(note: WorkoutNote): string {
	const load = sessionLoad(note.rpe, note.duration_min);
	if (load !== null) {
		return t("**Load:** RPE {v} × {v2} min = {v3}", { v: formatNumber(note.rpe!), v2: formatNumber(note.duration_min!), v3: formatNumber(load, 0) });
	}
	if (note.rpe === undefined) return t("**Load:** add RPE (0–10) about 30 min after training.");
	return t("**Load:** add the workout duration.");
}

/** Markdown generovaného bloku poznámky tréninku. */
export function renderWorkoutBlock(
	note: WorkoutNote,
	measureOf: (exercise: string) => ExerciseMeasure | undefined,
): string {
	const lines = [runLine(note), swimLine(note), ropeLine(note), ...note.blocks.map((b) => blockLine(b, measureOf)), loadLine(note)].filter(
		(line): line is string => line !== null,
	);
	return lines.join("  \n");
}
