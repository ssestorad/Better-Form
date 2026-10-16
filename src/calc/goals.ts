// Cíle (SPEC 4.6, 5.8): aktuální stav, průběh a předpověď splnění podle trendu.
// Předpověď je přímka proložená posledními výkony – heuristika (praxe).
// Bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import type { ExerciseMeasure } from "../model/constants";
import { addDays, daysBetween } from "../model/dates";
import type { DayNote, GoalNote, TestNote, WorkoutNote } from "../model/types";
import type { SessionBest } from "./records";
import { RECORD_DISTANCES, RECORD_TOLERANCE } from "./running";
import { clamp, linearFit, mean } from "./stats";

export const GOAL_FORECAST_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };

/** „Aktuální stav“ = nejlepší výkon za tolik posledních dní. */
export const GOAL_RECENT_DAYS = 42;
/** Trend se prokládá výkony za tolik posledních dní… */
export const GOAL_TREND_DAYS = 56;
/** …a potřebuje aspoň tolik bodů v rozpětí aspoň tolika dní. */
export const GOAL_TREND_MIN_POINTS = 3;
export const GOAL_TREND_MIN_SPAN_DAYS = 14;
/** Předpověď dál než tolik dní se neuvádí. */
export const GOAL_FORECAST_MAX_DAYS = 5 * 365;

export interface GoalData {
	workouts: readonly WorkoutNote[];
	days: readonly DayNote[];
	tests: readonly TestNote[];
	/** Nejlepší výkony cviků po dnech (records.exerciseSeries). */
	series: ReadonlyMap<string, readonly SessionBest[]>;
	/** Jednotný název cviku z knihovny. */
	exerciseName(link: string): string | undefined;
	measureOf(link: string): ExerciseMeasure | undefined;
	/** Splněné stupně žebříčku: datum a stupeň. */
	ladderLevels(ladder: string): { date: string; value: number }[];
	/** Splnění normy 0–1+ (nejslabší disciplína); null bez dat. */
	normRatio(norm: string): number | null;
}

export type GoalUnit = "time" | "kg" | "reps" | "sec" | "level" | "km" | "pct";
export type GoalDirection = "up" | "down";

export interface GoalPoint {
	date: string;
	value: number;
}

function near(km: number, target: number): boolean {
	return Math.abs(km - target) / target <= RECORD_TOLERANCE;
}

/** Jeden bod na den: nejlepší hodnota dne (`lower` = menší je lepší). */
function bestPerDay(points: GoalPoint[], lower: boolean): GoalPoint[] {
	const byDate = new Map<string, number>();
	for (const p of points) {
		if (!Number.isFinite(p.value) || p.value <= 0) continue;
		const current = byDate.get(p.date);
		if (current === undefined || (lower ? p.value < current : p.value > current)) byDate.set(p.date, p.value);
	}
	return [...byDate].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

export function goalUnit(goal: GoalNote, data: GoalData): GoalUnit {
	switch (goal.type) {
		case "run_time":
			return "time";
		case "lift_1rm":
		case "body_weight":
			return "kg";
		case "reps_max":
			return goal.exercise && data.measureOf(goal.exercise) === "seconds" ? "sec" : "reps";
		case "skill_level":
			return "level";
		case "weekly_volume":
			return "km";
		case "norm":
			return "pct";
	}
}

/** Výkony vztahující se k cíli, od nejstaršího, nejvýš k datu `today`. */
export function goalPoints(goal: GoalNote, data: GoalData, today: string): GoalPoint[] {
	const upTo = <T extends { date: string }>(items: readonly T[]) => items.filter((i) => i.date <= today);
	switch (goal.type) {
		case "run_time": {
			const km = goal.distance_km;
			if (!km || km <= 0) return [];
			const key = RECORD_DISTANCES.find((d) => near(d.km, km))?.key;
			const points: GoalPoint[] = [];
			for (const w of upTo(data.workouts)) {
				if (w.sport !== "run" || !w.run) continue;
				const segment = key ? w.run.best_s?.[key] : undefined;
				if (segment !== undefined) points.push({ date: w.date, value: segment });
				if (w.run.distance_km !== undefined && near(w.run.distance_km, km) && w.run.moving_time_s !== undefined) {
					points.push({ date: w.date, value: w.run.moving_time_s });
				}
			}
			for (const x of upTo(data.tests)) {
				if (x.test_type === "run_time" && x.distance_km !== undefined && near(x.distance_km, km)) points.push({ date: x.date, value: x.result });
			}
			return bestPerDay(points, true);
		}
		case "lift_1rm":
		case "reps_max": {
			const name = goal.exercise ? data.exerciseName(goal.exercise) : undefined;
			if (!name) return [];
			const unit = goalUnit(goal, data);
			const points: GoalPoint[] = [];
			for (const s of upTo(data.series.get(name) ?? [])) {
				const value = goal.type === "lift_1rm" ? s.oneRm : unit === "sec" ? s.sec : s.reps;
				if (value !== undefined) points.push({ date: s.date, value });
			}
			const testType = goal.type === "lift_1rm" ? "1rm" : unit === "sec" ? "max_hold" : "max_reps";
			for (const x of upTo(data.tests)) {
				if (x.test_type === testType && data.exerciseName(x.exercise) === name) points.push({ date: x.date, value: x.result });
			}
			return bestPerDay(points, false);
		}
		case "skill_level":
			return goal.ladder ? bestPerDay(upTo(data.ladderLevels(goal.ladder)), false) : [];
		case "weekly_volume": {
			const points: GoalPoint[] = [];
			for (let i = 7; i >= 0; i--) {
				const to = addDays(today, -7 * i);
				const from = addDays(to, -6);
				const km = data.workouts
					.filter((w) => w.sport === "run" && w.date >= from && w.date <= to)
					.reduce((sum, w) => sum + (w.run?.distance_km ?? 0), 0);
				points.push({ date: to, value: km });
			}
			return points;
		}
		case "body_weight":
			return bestPerDay(
				upTo(data.days)
					.filter((d) => d.body.weight_kg !== undefined)
					.map((d) => ({ date: d.date, value: d.body.weight_kg! })),
				false,
			);
		case "norm": {
			const ratio = goal.norm ? data.normRatio(goal.norm) : null;
			return ratio === null ? [] : [{ date: today, value: Math.round(ratio * 100) }];
		}
	}
}

/** Cílová hodnota (u normy 100 %). */
export function goalTarget(goal: GoalNote): number {
	return goal.type === "norm" ? 100 : (goal.target ?? 0);
}

/** Směr zlepšování: čas běhu dolů; hmotnost podle toho, kde uživatel začínal. */
export function goalDirection(goal: GoalNote, start: number | null): GoalDirection {
	if (goal.type === "run_time") return "down";
	if (goal.type === "body_weight") return start !== null && start > goalTarget(goal) ? "down" : "up";
	return "up";
}

/** Aktuální stav cíle; null bez dat. */
export function goalCurrent(goal: GoalNote, points: readonly GoalPoint[], today: string): number | null {
	const last = points[points.length - 1];
	if (!last) return null;
	if (goal.type === "weekly_volume" || goal.type === "norm") return last.value;
	if (goal.type === "skill_level") return Math.max(...points.map((p) => p.value));
	if (goal.type === "body_weight") {
		const from = addDays(today, -6);
		return mean(points.filter((p) => p.date >= from).map((p) => p.value)) ?? last.value;
	}
	const from = addDays(today, -(GOAL_RECENT_DAYS - 1));
	const recent = points.filter((p) => p.date >= from).map((p) => p.value);
	if (recent.length === 0) return last.value;
	return goal.type === "run_time" ? Math.min(...recent) : Math.max(...recent);
}

export type ForecastStatus = "reached" | "on_track" | "at_risk" | "no_data";

export interface GoalEvaluation {
	unit: GoalUnit;
	direction: GoalDirection;
	target: number;
	points: GoalPoint[];
	current: number | null;
	start: number | null;
	/** Průběh 0–1 od počátečního stavu k cíli; null bez dat. */
	fraction: number | null;
	reached: boolean;
	status: ForecastStatus;
	/** Předpokládané datum splnění podle trendu; null = trend k cíli nevede nebo chybí data. */
	eta: string | null;
	/** Změna za týden podle trendu (v jednotkách cíle); null bez trendu. */
	perWeek: number | null;
	/** Termín už uplynul. */
	overdue: boolean;
}

/** Celé vyhodnocení cíle k datu `today`. */
export function evaluateGoal(goal: GoalNote, data: GoalData, today: string): GoalEvaluation {
	const points = goalPoints(goal, data, today);
	const target = goalTarget(goal);
	const current = goalCurrent(goal, points, today);
	const firstSince = points.find((p) => p.date >= goal.created) ?? points[0];
	const start = goal.start_value ?? firstSince?.value ?? null;
	const direction = goalDirection(goal, start);
	const reached = current !== null && (direction === "up" ? current >= target : current <= target);

	let fraction: number | null = null;
	if (current !== null) {
		if (reached) fraction = 1;
		else if (start === null || start === target) fraction = 0;
		else fraction = clamp((current - start) / (target - start), 0, 1);
	}

	const overdue = goal.deadline !== undefined && goal.deadline < today;
	const base = { unit: goalUnit(goal, data), direction, target, points, current, start, fraction, reached, overdue };
	if (reached) return { ...base, status: "reached", eta: null, perWeek: null };

	// Trend: přímka výkony za poslední týdny.
	const from = addDays(today, -(GOAL_TREND_DAYS - 1));
	const recent = points.filter((p) => p.date >= from);
	const span = recent.length > 0 ? daysBetween(recent[0]!.date, recent[recent.length - 1]!.date) : 0;
	const fit =
		recent.length >= GOAL_TREND_MIN_POINTS && span >= GOAL_TREND_MIN_SPAN_DAYS
			? linearFit(recent.map((p) => ({ x: daysBetween(today, p.date), y: p.value })))
			: null;
	if (!fit) return { ...base, status: overdue ? "at_risk" : "no_data", eta: null, perWeek: null };

	const perWeek = fit.slope * 7;
	const toward = direction === "up" ? fit.slope > 0 : fit.slope < 0;
	if (!toward) return { ...base, status: "at_risk", eta: null, perWeek };
	const daysNeeded = Math.max(0, Math.ceil((target - fit.intercept) / fit.slope));
	if (daysNeeded > GOAL_FORECAST_MAX_DAYS) return { ...base, status: "at_risk", eta: null, perWeek };
	const eta = addDays(today, daysNeeded);
	const late = overdue || (goal.deadline !== undefined && eta > goal.deadline);
	return { ...base, status: late ? "at_risk" : "on_track", eta, perWeek };
}
