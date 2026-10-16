// Režim Základ (SPEC 5.11): statistiky cviku pro kartu – naposledy, rekord,
// dnešní série proti plánu – a přehled běhu. Bez závislosti na Obsidianu.

import type { Sport } from "../model/constants";
import { startOfWeek } from "../model/dates";
import type { SetEntry, TestNote, WorkoutNote } from "../model/types";
import type { ProgramTask } from "./programTasks";
import type { ResolvedTarget } from "./programs";

/** Co se u cviku měří: opakování, nebo sekundy (výdrže). */
export type BasicUnit = "reps" | "sec";

export interface DatedValue {
	value: number;
	date: string;
}

export interface ExerciseStats {
	/** Poslední trénink cviku před dneškem: pracovní série. */
	last?: { date: string; values: number[] };
	/** Nejlepší jednotlivá série (opakování nebo sekundy), včetně dneška. */
	record?: DatedValue;
	/** Poslední test maxima. */
	lastTest?: DatedValue;
	/** Dnešní pracovní série. */
	today: number[];
}

function workingValues(workout: WorkoutNote, isExercise: (e: string) => boolean, unit: BasicUnit): number[] {
	const values: number[] = [];
	for (const block of workout.blocks) {
		if ((block.type !== "sets" && block.type !== "hold") || !isExercise(block.exercise)) continue;
		for (const set of block.sets) {
			const value = unit === "sec" ? set.sec : set.reps;
			if (!set.warmup && value !== undefined && value > 0) values.push(value);
		}
	}
	return values;
}

/** Statistiky cviku pro kartu režimu Základ. */
export function exerciseStats(
	workouts: WorkoutNote[],
	tests: TestNote[],
	isExercise: (exercise: string) => boolean,
	unit: BasicUnit,
	today: string,
): ExerciseStats {
	const stats: ExerciseStats = { today: [] };
	const sorted = [...workouts].sort((a, b) => (a.date + (a.start ?? "")).localeCompare(b.date + (b.start ?? "")));
	for (const workout of sorted) {
		if (workout.date > today) continue;
		const values = workingValues(workout, isExercise, unit);
		if (values.length === 0) continue;
		const best = Math.max(...values);
		if (!stats.record || best > stats.record.value) stats.record = { value: best, date: workout.date };
		if (workout.date === today) stats.today.push(...values);
		else if (stats.last?.date === workout.date) stats.last.values.push(...values);
		else stats.last = { date: workout.date, values };
	}
	const type = unit === "sec" ? "max_hold" : "max_reps";
	for (const test of tests) {
		if (test.test_type !== type || test.date > today || !isExercise(test.exercise)) continue;
		if (!stats.lastTest || test.date > stats.lastTest.date) stats.lastTest = { value: test.result, date: test.date };
		if (!stats.record || test.result > stats.record.value) stats.record = { value: test.result, date: test.date };
	}
	return stats;
}

export interface SetPlan {
	/** Plánovaný počet sérií (když ho cíl určuje). */
	sets?: number;
	/** Plánovaná hodnota jedné série (opakování nebo sekundy) pro rychlé tlačítko. */
	value?: number;
}

/** Počet sérií a hodnota série z cíle programu (pro rychlý zápis). */
export function setPlan(target: ResolvedTarget | undefined): SetPlan {
	switch (target?.kind) {
		case "sets_reps":
		case "pct_of_max":
			return { sets: target.sets, value: target.reps };
		case "time":
			return { sets: target.sets, value: target.time_s };
		case "max_sets":
			return { sets: target.sets };
		case "emom":
			return { value: target.reps };
		default:
			return {};
	}
}

/** První úkol dnešních programů, který se týká cviku. */
export function taskFor<T extends { tasks: ProgramTask[] }>(
	programs: T[],
	isExercise: (exercise: string) => boolean,
): { program: T; task: ProgramTask } | undefined {
	for (const program of programs) {
		const task = program.tasks.find((x) => isExercise(x.exercise));
		if (task) return { program, task };
	}
	return undefined;
}

export interface CardioStats {
	last?: { date: string; distance_km?: number; moving_time_s?: number; duration_min?: number };
	longest?: DatedValue;
	/** Tento týden (pondělí–neděle): počet tréninků a kilometry. */
	weekCount: number;
	weekKm: number;
}

/** Přehled tréninků jednoho sportu (běh) pro kartu režimu Základ. */
export function cardioStats(workouts: WorkoutNote[], sport: Sport, today: string): CardioStats {
	const stats: CardioStats = { weekCount: 0, weekKm: 0 };
	const monday = startOfWeek(today);
	for (const workout of workouts) {
		if (workout.sport !== sport || workout.date > today) continue;
		const km = workout.run?.distance_km;
		if (!stats.last || workout.date >= stats.last.date) {
			stats.last = { date: workout.date };
			if (km !== undefined) stats.last.distance_km = km;
			if (workout.run?.moving_time_s !== undefined) stats.last.moving_time_s = workout.run.moving_time_s;
			if (workout.duration_min !== undefined) stats.last.duration_min = workout.duration_min;
		}
		if (km !== undefined && (!stats.longest || km > stats.longest.value)) stats.longest = { value: km, date: workout.date };
		if (workout.date >= monday) {
			stats.weekCount++;
			stats.weekKm += km ?? 0;
		}
	}
	return stats;
}

/** Série pro rychlý zápis: opakování, nebo sekundy u výdrží. */
export function quickSet(value: number, unit: BasicUnit): SetEntry {
	return unit === "sec" ? { sec: value } : { reps: value };
}
