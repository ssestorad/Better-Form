// Programy (SPEC 4.5, 5.7): který den se cvičí, cíl na dnešek, průběh denního počítadla.

import { WEEKDAYS, type Weekday } from "../model/constants";
import { daysBetween, weekdayOf } from "../model/dates";
import type {
	IntervalStep,
	LadderTarget,
	ProgramItem,
	ProgramNote,
	ProgramTarget,
	TestNote,
} from "../model/types";

/** Týden programu od `active_since` (0 = první týden), nebo null, když program neběží. */
export function programWeek(program: ProgramNote, date: string): number | null {
	if (!program.active || !program.active_since) return null;
	const days = daysBetween(program.active_since, date);
	if (days < 0) return null;
	const week = Math.floor(days / 7);
	if (program.duration_weeks !== undefined && week >= program.duration_weeks) return null;
	return week;
}

/** Dny v týdnu, kdy se položka cvičí, v pořadí po → ne. */
function itemWeekdays(program: ProgramNote, item: ProgramItem): Weekday[] {
	return WEEKDAYS.filter((d) => program.days.includes(d) && (item.days === undefined || item.days.includes(d)));
}

/** Pořadí tréninku položky v týdnu (0 = první trénink týdne), nebo null, když se ten den necvičí. */
export function sessionIndexInWeek(program: ProgramNote, item: ProgramItem, date: string): number | null {
	const index = itemWeekdays(program, item).indexOf(weekdayOf(date));
	return index >= 0 ? index : null;
}

/**
 * Cíl položky pro daný den: z týdenního plánu (`schedule`) – nejdřív cíl
 * konkrétního tréninku v týdnu, pak cíl týdne – jinak výchozí `target`.
 * Když se ten den položka necvičí, vrátí null.
 */
export function targetForDate(program: ProgramNote, item: ProgramItem, date: string): ProgramTarget | null {
	const week = programWeek(program, date);
	const session = sessionIndexInWeek(program, item, date);
	if (week === null || session === null) return null;
	const entry = item.schedule?.find((s) => s.week === week + 1);
	return entry?.sessions?.[session] ?? entry?.target ?? item.target;
}

/** Cvik položky v daném týdnu programu (rotace variant přes `schedule`), jinak výchozí cvik. */
export function exerciseForWeek(item: ProgramItem, week: number): string {
	return item.schedule?.find((s) => s.week === week + 1)?.exercise ?? item.exercise;
}

/** Co se má daný den cvičit: cvik (podle týdne) a cíl; null, když se položka ten den necvičí. */
export function planForDate(
	program: ProgramNote,
	item: ProgramItem,
	date: string,
): { exercise: string; target: ProgramTarget; week: number } | null {
	const week = programWeek(program, date);
	const target = targetForDate(program, item, date);
	if (week === null || target === null) return null;
	return { exercise: exerciseForWeek(item, week), target, week };
}

// ---------- Žebřík ----------

/** Součet opakování pevného žebříku včetně kol; u otevřeného null. */
export function ladderTotalReps(target: LadderTarget): number | null {
	if (!target.steps || target.steps.length === 0) return null;
	return target.steps.reduce((sum, n) => sum + n, 0) * (target.rounds ?? 1);
}

// ---------- Maximum z testů ----------

export interface MaxResult {
	value: number;
	date: string;
	exercise: string;
}

/**
 * Poslední test maxima opakování (nebo výdrže) u některého z relevantních cviků,
 * nejpozději v den `onOrBefore`. Při více testech ve stejný den vyšší výsledek.
 */
export function latestMax(
	tests: TestNote[],
	isRelevant: (exercise: string) => boolean,
	onOrBefore: string,
): MaxResult | undefined {
	let best: TestNote | undefined;
	for (const test of tests) {
		if (test.date > onOrBefore || !isRelevant(test.exercise)) continue;
		if (test.test_type !== "max_reps" && test.test_type !== "max_hold") continue;
		if (!best || test.date > best.date || (test.date === best.date && test.result > best.result)) best = test;
	}
	return best ? { value: best.result, date: best.date, exercise: best.exercise } : undefined;
}

/** Celková délka intervalového tréninku v sekundách (zahřátí + úseky + vyklusání). */
export function intervalTotalSeconds(target: { warmup_s?: number; steps: IntervalStep[]; cooldown_s?: number }): number {
	const steps = target.steps.reduce((sum, s) => sum + s.repeats * (s.work_s + (s.rest_s ?? 0)), 0);
	return (target.warmup_s ?? 0) + steps + (target.cooldown_s ?? 0);
}

/** Čas zátěže (např. běhu) v intervalovém tréninku bez zahřátí a odpočinku. */
export function intervalWorkSeconds(target: { steps: IntervalStep[] }): number {
	return target.steps.reduce((sum, s) => sum + s.repeats * s.work_s, 0);
}

export type ResolvedTarget =
	| { kind: "daily_total"; total: number; steps?: number[] }
	| { kind: "sets_reps"; sets: number; reps: number }
	/** `reps` spočítané z posledního testu maxima. */
	| { kind: "pct_of_max"; sets: number; reps: number; max: number; pct: number }
	/** Chybí test maxima – nejdřív otestovat. */
	| { kind: "needs_test"; sets: number; pct: number }
	| { kind: "time"; time_s: number; sets: number }
	| { kind: "distance"; distance_km: number }
	| {
			kind: "intervals";
			warmup_s: number;
			steps: IntervalStep[];
			cooldown_s: number;
			total_s: number;
			work_s: number;
	  }
	| {
			kind: "ladder";
			/** Pevné příčky; u otevřeného žebříku prázdné. */
			steps: number[];
			open: boolean;
			start: number;
			step: number;
			rounds: number;
			rest_per_rep_s?: number;
			round_rest_s?: number;
			/** Součet opakování (jen pevný žebřík). */
			total?: number;
	  }
	| {
			kind: "emom";
			reps: number;
			minutes?: number;
			until_failure: boolean;
			max_minutes?: number;
			/** Vyplněno, když se opakování počítala z maxima. */
			max?: number;
			pct?: number;
	  }
	| { kind: "max_sets"; sets: number; rest_s?: number };

export interface ResolveContext {
	/** Týden programu (0 = první), pro pravidlo `weekly_add`. */
	week: number;
	progression: ProgramNote["progression"];
	/** Poslední maximum cviku z testu (opakování nebo sekundy). */
	lastMax?: number;
}

/**
 * Konkrétní cíl na daný den. U `weekly_add` se každý týden přičte `add`
 * (opakování, u času sekundy, u vzdálenosti km). Procento z maxima se
 * zaokrouhlí na celá opakování, minimálně 1.
 */
export function resolveTarget(target: ProgramTarget, context: ResolveContext): ResolvedTarget {
	const add =
		context.progression.rule === "weekly_add" && context.progression.add !== undefined
			? context.progression.add * context.week
			: 0;
	switch (target.kind) {
		case "daily_total":
			return target.counter_steps
				? { kind: "daily_total", total: target.daily_total + add, steps: target.counter_steps }
				: { kind: "daily_total", total: target.daily_total + add };
		case "sets_reps":
			return { kind: "sets_reps", sets: target.sets, reps: target.reps + add };
		case "pct_of_max":
			if (context.lastMax === undefined || context.lastMax <= 0) {
				return { kind: "needs_test", sets: target.sets, pct: target.pct_of_max };
			}
			return {
				kind: "pct_of_max",
				sets: target.sets,
				reps: Math.max(1, Math.round((context.lastMax * target.pct_of_max) / 100)),
				max: context.lastMax,
				pct: target.pct_of_max,
			};
		case "time":
			return { kind: "time", time_s: target.time_s + add, sets: target.sets ?? 1 };
		case "distance":
			return { kind: "distance", distance_km: target.distance_km + add };
		case "intervals":
			// Intervaly se neposouvají přes `weekly_add` – po týdnech je řídí `schedule`.
			return {
				kind: "intervals",
				warmup_s: target.warmup_s ?? 0,
				steps: target.steps,
				cooldown_s: target.cooldown_s ?? 0,
				total_s: intervalTotalSeconds(target),
				work_s: intervalWorkSeconds(target),
			};
		case "ladder": {
			const total = ladderTotalReps(target);
			return withoutUndefined({
				kind: "ladder" as const,
				steps: target.steps ?? [],
				open: target.open === true,
				start: target.start ?? 1,
				step: target.step ?? 1,
				rounds: target.rounds ?? 1,
				rest_per_rep_s: target.rest_per_rep_s,
				round_rest_s: target.round_rest_s,
				total: total ?? undefined,
			});
		}
		case "emom": {
			const shared = {
				minutes: target.minutes,
				until_failure: target.until_failure === true,
				max_minutes: target.max_minutes,
			};
			if (target.reps !== undefined) return withoutUndefined({ kind: "emom" as const, reps: target.reps, ...shared });
			const pct = target.pct_of_max ?? 0;
			if (context.lastMax === undefined || context.lastMax <= 0) return { kind: "needs_test", sets: 1, pct };
			return withoutUndefined({
				kind: "emom" as const,
				reps: Math.max(1, Math.round((context.lastMax * pct) / 100)),
				...shared,
				max: context.lastMax,
				pct,
			});
		}
		case "max_sets":
			return withoutUndefined({ kind: "max_sets" as const, sets: target.sets, rest_s: target.rest_s });
	}
}

function withoutUndefined<T extends object>(obj: T): T {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) if (value !== undefined) out[key] = value;
	return out as T;
}

/** Potřebuje cíl poslední maximum (test)? */
export function targetNeedsMax(target: ProgramTarget): boolean {
	return target.kind === "pct_of_max" || (target.kind === "emom" && target.reps === undefined);
}

export interface CounterProgress {
	done: number;
	total: number;
	remaining: number;
	/** 0–100, zaokrouhleno dolů, aby 100 % znamenalo opravdu splněno. */
	percent: number;
	complete: boolean;
}

/** Průběh denního počítadla (`daily_total`). */
export function counterProgress(done: number, total: number): CounterProgress {
	const safeDone = Math.max(0, done);
	if (total <= 0) return { done: safeDone, total, remaining: 0, percent: 100, complete: true };
	return {
		done: safeDone,
		total,
		remaining: Math.max(0, total - safeDone),
		percent: Math.min(100, Math.floor((safeDone / total) * 100)),
		complete: safeDone >= total,
	};
}

/** Je čas na nový test maxima? Bez testu vždy ano, jinak po `retest_every_weeks` týdnech. */
export function retestDue(program: ProgramNote, lastTestDate: string | undefined, date: string): boolean {
	if (lastTestDate === undefined) return true;
	if (program.retest_every_weeks === undefined) return false;
	return daysBetween(lastTestDate, date) >= program.retest_every_weeks * 7;
}
