// Dnešní úkoly programu, jejich splnění a denní počítadlo (SPEC 5.7).
// Bez závislosti na Obsidianu.

import type { Sport } from "../model/constants";
import type { ProgramNote, SetEntry, TestNote, WorkoutNote } from "../model/types";
import { blockExercises } from "./performance";
import {
	counterProgress,
	latestMax,
	planForDate,
	resolveTarget,
	retestDue,
	targetNeedsMax,
	type CounterProgress,
	type MaxResult,
	type ResolvedTarget,
} from "./programs";

export interface ProgramTask {
	/** Pořadí položky v programu. */
	itemIndex: number;
	exercise: string;
	target: ResolvedTarget;
	done: boolean;
	/** Průběh denního počítadla (jen `daily_total`). */
	counter?: CounterProgress;
	/** Maximum, ze kterého se cíl počítal. */
	max?: MaxResult;
	/** Od posledního testu uběhlo `retest_every_weeks` týdnů – je čas na nový. */
	retest?: true;
}

export interface TaskContext {
	/** Tréninky daného dne navázané na tento program. */
	workouts: WorkoutNote[];
	tests: TestNote[];
	isSameExercise: (a: string, b: string) => boolean;
}

/** Součet opakování pracovních sérií cviku v daných trénincích. */
export function counterReps(workouts: WorkoutNote[], isExercise: (exercise: string) => boolean): number {
	let total = 0;
	for (const workout of workouts) {
		for (const block of workout.blocks) {
			if (block.type !== "sets" || !isExercise(block.exercise)) continue;
			for (const set of block.sets) if (!set.warmup) total += set.reps ?? 0;
		}
	}
	return total;
}

/** Úkoly programu na daný den; prázdné, když se ten den necvičí. */
export function tasksForDate(program: ProgramNote, date: string, ctx: TaskContext): ProgramTask[] {
	const tasks: ProgramTask[] = [];
	program.items.forEach((item, itemIndex) => {
		const plan = planForDate(program, item, date);
		if (!plan) return;
		const { exercise } = plan;
		const isExercise = (other: string) => ctx.isSameExercise(exercise, other);

		let max: MaxResult | undefined;
		if (targetNeedsMax(plan.target)) {
			const sources = item.max_from ?? [exercise];
			max = latestMax(ctx.tests, (e) => sources.some((s) => ctx.isSameExercise(s, e)), date);
		}
		const target = resolveTarget(plan.target, { week: plan.week, progression: program.progression, lastMax: max?.value });

		const task: ProgramTask = { itemIndex, exercise, target, done: false };
		if (max) task.max = max;
		if (max && retestDue(program, max.date, date)) task.retest = true;
		if (target.kind === "daily_total") {
			task.counter = counterProgress(counterReps(ctx.workouts, isExercise), target.total);
			task.done = task.counter.complete;
		} else if (target.kind === "distance" || target.kind === "intervals") {
			task.done = ctx.workouts.length > 0;
		} else {
			task.done = ctx.workouts.some((w) => w.blocks.some((b) => blockExercises(b).some(isExercise)));
		}
		tasks.push(task);
	});
	return tasks;
}

// ---------- Denní počítadlo ----------

/** Prázdný trénink pro počítadlo / rychlý zápis (jeden na program a den); `programLink` jen u programu. */
export function newCounterWorkout(
	date: string,
	sport: Sport,
	title: string,
	programLink: string | undefined,
	schema: number,
): WorkoutNote {
	const note: WorkoutNote = { forma: "workout", schema, date, sport, title, source: "manual", blocks: [], pain: [] };
	if (programLink) note.program = programLink;
	return note;
}

/** Přidá dávku opakování jako samostatnou sérii cviku. Vstup nemění. */
export function addCounterSet(
	note: WorkoutNote,
	exercise: string,
	reps: number,
	isExercise: (exercise: string) => boolean,
): WorkoutNote {
	return addSet(note, exercise, { reps }, isExercise);
}

/** Přidá sérii k bloku cviku (nebo blok založí). Série se sekundami jdou do bloku „výdrž“. Vstup nemění. */
export function addSet(
	note: WorkoutNote,
	exercise: string,
	set: SetEntry,
	isExercise: (exercise: string) => boolean,
): WorkoutNote {
	const type = set.reps === undefined && set.sec !== undefined ? "hold" : "sets";
	let added = false;
	const blocks = note.blocks.map((block) => {
		if (added || block.type !== type || !isExercise(block.exercise)) return block;
		added = true;
		return { ...block, sets: [...block.sets, set] };
	});
	if (!added) blocks.push({ type, exercise, sets: [set] });
	return { ...note, blocks };
}

/** Odebere poslední dávku cviku; null, když žádná není. Prázdný blok zmizí. */
export function removeLastCounterSet(note: WorkoutNote, isExercise: (exercise: string) => boolean): WorkoutNote | null {
	for (let i = note.blocks.length - 1; i >= 0; i--) {
		const block = note.blocks[i]!;
		if ((block.type !== "sets" && block.type !== "hold") || !isExercise(block.exercise) || block.sets.length === 0) continue;
		const sets = block.sets.slice(0, -1);
		const blocks = [...note.blocks];
		if (sets.length > 0) blocks[i] = { ...block, sets };
		else blocks.splice(i, 1);
		return { ...note, blocks };
	}
	return null;
}

/** Nejlepší počet opakování v pracovních sériích cviku (pro zápis nového maxima). */
export function bestReps(note: WorkoutNote, isExercise: (exercise: string) => boolean): number | undefined {
	let best: number | undefined;
	for (const block of note.blocks) {
		if (block.type !== "sets" || !isExercise(block.exercise)) continue;
		for (const set of block.sets) {
			if (set.warmup || set.reps === undefined) continue;
			if (best === undefined || set.reps > best) best = set.reps;
		}
	}
	return best;
}
