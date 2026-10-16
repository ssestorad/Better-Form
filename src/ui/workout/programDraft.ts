// Trénink z programu na dnes: úkoly programu → předvyplněný formulář. Bez Obsidianu.

import { performanceSets } from "../../calc/performance";
import type { ProgramTask } from "../../calc/programTasks";
import { describeTarget } from "../../calc/programText";
import type { Sport } from "../../model/constants";
import type { ProgramNote, SetEntry } from "../../model/types";
import { emptyBlock, emptyDraft, type DraftBlock, type PrefillContext, type WorkoutDraft } from "./draft";

export interface ProgramDraftContext extends PrefillContext {
	/** Sport tréninku podle cviku (kardio → běh / plavání, jinak podle kategorie). */
	sportFor(exercise: string): Sport;
}

/** Série s váhou z posledního výkonu cviku (pracovní váha), bez RIR. */
function setsWithLastWeight(count: number, base: SetEntry, exercise: string, ctx: PrefillContext): SetEntry[] {
	const field = ctx.info(exercise)?.measure === "reps_bw" ? "added_kg" : "kg";
	const weights = performanceSets(ctx.last(exercise))
		.filter((s) => !s.warmup)
		.map((s) => s[field])
		.filter((w): w is number => w !== undefined && w !== 0);
	const set: SetEntry = weights.length > 0 ? { ...base, [field]: Math.max(...weights) } : { ...base };
	return Array.from({ length: Math.max(1, count) }, () => ({ ...set }));
}

function taskToBlock(task: ProgramTask, ctx: PrefillContext): DraftBlock | null {
	const { exercise, target } = task;
	const note = describeTarget(target);
	switch (target.kind) {
		case "sets_reps":
		case "pct_of_max":
			return {
				...emptyBlock("sets", exercise),
				sets: setsWithLastWeight(target.sets, { reps: target.reps }, exercise, ctx),
				targetNote: note,
			};
		case "needs_test":
			return { ...emptyBlock("sets", exercise), sets: [{}], targetNote: note };
		case "max_sets":
			return { ...emptyBlock("sets", exercise), sets: setsWithLastWeight(target.sets, {}, exercise, ctx), targetNote: note };
		case "time":
			return {
				...emptyBlock("hold", exercise),
				sets: Array.from({ length: target.sets }, () => ({ sec: target.time_s })),
				targetNote: note,
			};
		case "ladder": {
			// Pevný žebřík: příčky všech kol za sebou; otevřený se vyplní podle skutečnosti.
			const steps = target.open ? [] : Array.from({ length: target.rounds }, () => target.steps).flat();
			return { ...emptyBlock("ladder", exercise), steps, targetNote: note };
		}
		case "emom":
			return {
				...emptyBlock("emom", exercise),
				minutes: target.minutes ?? target.max_minutes,
				reps_per_min: target.reps,
				targetNote: note,
			};
		default:
			// daily_total řeší počítadlo; vzdálenost a intervaly jdou do údajů o běhu.
			return null;
	}
}

/**
 * Nový trénink z dnešních úkolů programu (bez položek denního počítadla).
 * `programLink` = cíl odkazu na poznámku programu.
 */
export function programToDraft(
	program: ProgramNote,
	programLink: string,
	date: string,
	tasks: ProgramTask[],
	ctx: ProgramDraftContext,
): WorkoutDraft {
	const relevant = tasks.filter((t) => t.target.kind !== "daily_total");
	const sport = relevant[0] ? ctx.sportFor(relevant[0].exercise) : "other";
	const draft: WorkoutDraft = { ...emptyDraft(date, sport), title: program.name, program: programLink };
	const notes: string[] = [];
	for (const task of relevant) {
		const block = taskToBlock(task, ctx);
		if (block) {
			draft.blocks.push(block);
			continue;
		}
		if (task.target.kind === "distance" && sport === "run") draft.run.distance_km = task.target.distance_km;
		if (task.target.kind === "intervals") draft.duration_min = Math.round(task.target.total_s / 60);
		notes.push(`${task.exercise}: ${describeTarget(task.target)}`);
	}
	if (notes.length > 0) draft.notes = notes.join("\n");
	return draft;
}
