import { describe, expect, it } from "vitest";
import { checkInTrend, deloadSignals, stagnation } from "../../src/calc/deload";
import { evaluateGoal, goalPoints, type GoalData } from "../../src/calc/goals";
import { normCurrent, normStatus, normTarget, type NormData } from "../../src/calc/norms";
import { assessPain, painCategory, painLevels, recordPain } from "../../src/calc/pain";
import type { SessionBest } from "../../src/calc/records";
import { addDays } from "../../src/model/dates";
import type { DayNote, GoalNote, NormItem, NormNote, PainNote, TestNote, WorkoutNote } from "../../src/model/types";

const TODAY = "2026-10-02";
const LIMITS = { professionalLevel: 4, professionalDays: 7 };

function pain(partial: Partial<PainNote>): PainNote {
	return { forma: "pain", schema: 1, name: "Koleno", muscle: "quads", level: 2, since: "2026-09-30", status: "active", history: [{ date: "2026-09-30", level: 2 }], ...partial };
}

function workout(partial: Partial<WorkoutNote> & { date: string }): WorkoutNote {
	return { forma: "workout", schema: 1, sport: "run", source: "manual", blocks: [], pain: [], ...partial };
}

function day(date: string, partial: Partial<DayNote> = {}): DayNote {
	return { forma: "day", schema: 1, date, sleep: {}, check_in: {}, hrv: {}, body: {}, ...partial };
}

function goal(partial: Partial<GoalNote>): GoalNote {
	return { forma: "goal", schema: 1, name: "Cíl", type: "lift_1rm", target: 100, created: "2026-09-01", status: "active", ...partial };
}

function data(partial: Partial<GoalData> = {}): GoalData {
	return {
		workouts: [],
		days: [],
		tests: [],
		series: new Map(),
		exerciseName: (link) => link,
		measureOf: () => "reps_kg",
		ladderLevels: () => [],
		normRatio: () => null,
		...partial,
	};
}

describe("bolest (pravidlo 8)", () => {
	it("mírná čerstvá bolest: bez doporučení odborníka", () => {
		expect(assessPain(pain({}), TODAY, LIMITS)).toMatchObject({ days: 2, improving: false, seeProfessional: false, reason: null });
	});

	it("intenzita 4/10 a víc → odborník", () => {
		expect(assessPain(pain({ level: 4 }), TODAY, LIMITS)).toMatchObject({ seeProfessional: true, reason: "level" });
	});

	it("déle než 7 dní bez zlepšení → odborník; se zlepšením ne", () => {
		const stuck = pain({ since: "2026-09-20", level: 3, history: [{ date: "2026-09-20", level: 3 }, { date: "2026-09-28", level: 3 }] });
		expect(assessPain(stuck, TODAY, LIMITS)).toMatchObject({ days: 12, improving: false, seeProfessional: true, reason: "duration" });
		const better = pain({ since: "2026-09-20", level: 1, history: [{ date: "2026-09-20", level: 3 }, { date: "2026-09-28", level: 1 }] });
		expect(assessPain(better, TODAY, LIMITS)).toMatchObject({ improving: true, seeProfessional: false });
		// přesně 7 dní ještě ne
		expect(assessPain(pain({ since: "2026-09-25", history: [{ date: "2026-09-25", level: 2 }] }), TODAY, LIMITS).seeProfessional).toBe(false);
	});

	it("zápis intenzity: stav, nahrazení záznamu téhož dne, vyřešení", () => {
		const start = pain({});
		const worse = recordPain(start, "2026-10-01", 3);
		expect(worse).toMatchObject({ level: 3, status: "active" });
		expect(worse.history).toHaveLength(2);
		const improving = recordPain(worse, "2026-10-02", 1);
		expect(improving).toMatchObject({ level: 1, status: "improving" });
		const corrected = recordPain(improving, "2026-10-02", 0);
		expect(corrected.history).toHaveLength(3);
		expect(corrected).toMatchObject({ level: 0, status: "resolved" });
		expect(recordPain(start, "2026-10-01", 14).level).toBe(10);
	});

	it("úrovně po partiích a pásma barev", () => {
		const levels = painLevels([pain({ level: 2 }), pain({ level: 5 }), pain({ muscle: "calves", level: 7, status: "resolved" })]);
		expect(levels.quads).toBe(5);
		expect(levels.calves).toBe(0);
		expect([0, 1, 3, 4, 6, 7, 10].map(painCategory)).toEqual([0, 1, 1, 2, 2, 3, 3]);
	});
});

describe("cíle (5.8)", () => {
	const series = (values: [string, number][]): Map<string, SessionBest[]> => new Map([["Bench press", values.map(([date, oneRm]) => ({ date, oneRm }))]]);

	it("síla: stav, průběh a předpověď z trendu", () => {
		// +1 kg týdně: 90, 91, 92, 93, 94 → dnes podle přímky 94, do 100 kg zbývá 6 týdnů
		const points: [string, number][] = [0, 1, 2, 3, 4].map((i) => [addDays(TODAY, -28 + 7 * i), 90 + i]);
		const result = evaluateGoal(goal({ exercise: "Bench press", start_value: 90, deadline: "2026-12-31" }), data({ series: series(points) }), TODAY);
		expect(result).toMatchObject({ unit: "kg", direction: "up", current: 94, start: 90, reached: false, status: "on_track", overdue: false });
		expect(result.fraction).toBeCloseTo(0.4, 10);
		expect(result.perWeek).toBeCloseTo(1, 10);
		expect(result.eta).toBe(addDays(TODAY, 42));
	});

	it("pozdě proti termínu nebo trend opačným směrem = ohrožený cíl", () => {
		const points: [string, number][] = [0, 1, 2, 3, 4].map((i) => [addDays(TODAY, -28 + 7 * i), 90 + i]);
		const late = evaluateGoal(goal({ exercise: "Bench press", deadline: "2026-10-20" }), data({ series: series(points) }), TODAY);
		expect(late.status).toBe("at_risk");
		const falling: [string, number][] = [0, 1, 2, 3, 4].map((i) => [addDays(TODAY, -28 + 7 * i), 94 - i]);
		const down = evaluateGoal(goal({ exercise: "Bench press" }), data({ series: series(falling) }), TODAY);
		expect(down).toMatchObject({ status: "at_risk", eta: null });
		expect(down.perWeek).toBeCloseTo(-1, 10);
	});

	it("málo dat = bez předpovědi; splněno = hotovo", () => {
		const few = evaluateGoal(goal({ exercise: "Bench press" }), data({ series: series([[addDays(TODAY, -3), 95]]) }), TODAY);
		expect(few).toMatchObject({ status: "no_data", current: 95, eta: null });
		const done = evaluateGoal(goal({ exercise: "Bench press" }), data({ series: series([[addDays(TODAY, -3), 101]]) }), TODAY);
		expect(done).toMatchObject({ status: "reached", reached: true, fraction: 1 });
		expect(evaluateGoal(goal({ exercise: "Bench press" }), data(), TODAY)).toMatchObject({ status: "no_data", current: null, fraction: null });
	});

	it("čas na trati: menší je lepší, počítá úsek ze Stravy i celý běh", () => {
		const workouts = [
			workout({ date: "2026-09-10", run: { distance_km: 10.1, moving_time_s: 3300 } }),
			workout({ date: "2026-09-20", run: { distance_km: 15, moving_time_s: 5000, best_s: { "10k": 3200 } } }),
			workout({ date: "2026-09-25", run: { distance_km: 8, moving_time_s: 2400 } }),
		];
		const g = goal({ type: "run_time", distance_km: 10, target: 3000, start_value: 3400 });
		expect(goalPoints(g, data({ workouts }), TODAY)).toEqual([
			{ date: "2026-09-10", value: 3300 },
			{ date: "2026-09-20", value: 3200 },
		]);
		const result = evaluateGoal(g, data({ workouts }), TODAY);
		expect(result).toMatchObject({ unit: "time", direction: "down", current: 3200, reached: false });
		expect(result.fraction).toBeCloseTo(0.5, 10);
	});

	it("hmotnost: směr podle výchozího stavu, stav = průměr za 7 dní", () => {
		const days = [day("2026-09-01", { body: { weight_kg: 84 } }), day("2026-09-30", { body: { weight_kg: 82 } }), day("2026-10-02", { body: { weight_kg: 81 } })];
		const result = evaluateGoal(goal({ type: "body_weight", target: 80 }), data({ days }), TODAY);
		expect(result).toMatchObject({ unit: "kg", direction: "down", current: 81.5, start: 84, reached: false });
		expect(result.fraction).toBeCloseTo(0.625, 10);
	});

	it("týdenní kilometry: posledních 7 dní", () => {
		const workouts = [workout({ date: "2026-09-28", run: { distance_km: 12 } }), workout({ date: "2026-10-01", run: { distance_km: 8 } }), workout({ date: "2026-09-20", run: { distance_km: 30 } })];
		const result = evaluateGoal(goal({ type: "weekly_volume", target: 40 }), data({ workouts }), TODAY);
		expect(result.current).toBe(20);
		expect(result.points).toHaveLength(8);
		expect(result.unit).toBe("km");
	});

	it("dovednost, výdrž a norma", () => {
		const skill = evaluateGoal(goal({ type: "skill_level", ladder: "Shyby – progrese", target: 6 }), data({ ladderLevels: () => [{ date: "2026-09-01", value: 2 }, { date: "2026-09-20", value: 4 }] }), TODAY);
		expect(skill).toMatchObject({ unit: "level", current: 4, reached: false });
		const hold = evaluateGoal(
			goal({ type: "reps_max", exercise: "Plank", target: 120 }),
			data({ measureOf: () => "seconds", series: new Map([["Plank", [{ date: "2026-09-30", sec: 90, reps: undefined }]]]) }),
			TODAY,
		);
		expect(hold).toMatchObject({ unit: "sec", current: 90 });
		const norm = evaluateGoal(goal({ type: "norm", norm: "Testy", target: undefined }), data({ normRatio: () => 0.8 }), TODAY);
		expect(norm).toMatchObject({ unit: "pct", target: 100, current: 80, reached: false });
	});

	it("po termínu a nesplněno = ohrožený", () => {
		const result = evaluateGoal(goal({ exercise: "Bench press", deadline: "2026-09-30" }), data({ series: series([[addDays(TODAY, -3), 95]]) }), TODAY);
		expect(result).toMatchObject({ overdue: true, status: "at_risk" });
	});
});

describe("normy (5.8)", () => {
	const pushUps: NormItem = {
		exercise: "Kliky",
		kind: "reps",
		time_limit_s: 120,
		rows: [{ value: 20 }, { sex: "male", age_from: 18, age_to: 29, value: 40 }, { sex: "male", age_from: 30, age_to: 39, value: 34 }, { sex: "female", value: 18 }],
	};
	const run: NormItem = { exercise: "Běh", kind: "run_time", distance_km: 3, rows: [{ value: 900 }] };
	const plank: NormItem = { exercise: "Plank", kind: "hold", rows: [{ sex: "female", value: 60 }] };
	const profile = { sex: "male" as const, age: 32 };

	it("řádek podle pohlaví a věku; přesnější má přednost", () => {
		expect(normTarget(pushUps, profile)).toBe(34);
		expect(normTarget(pushUps, { sex: "male", age: 25 })).toBe(40);
		expect(normTarget(pushUps, { sex: "female", age: 25 })).toBe(18);
		expect(normTarget(pushUps, { sex: null, age: null })).toBe(20);
		expect(normTarget(plank, profile)).toBeNull();
	});

	const tests: TestNote[] = [
		{ forma: "test", schema: 1, date: "2026-09-20", exercise: "Kliky", test_type: "max_reps_timed", time_limit_s: 120, result: 30 },
		{ forma: "test", schema: 1, date: "2026-09-25", exercise: "Kliky", test_type: "max_reps_timed", time_limit_s: 180, result: 50 },
		{ forma: "test", schema: 1, date: "2026-09-26", exercise: "Kliky", test_type: "max_reps", result: 45 },
	];
	const workouts = [workout({ date: "2026-09-28", run: { distance_km: 3.02, moving_time_s: 840 } }), workout({ date: "2026-03-01", run: { distance_km: 3, moving_time_s: 800 } })];
	const normData: NormData = { workouts, tests, isSameExercise: (a, b) => a === b, today: TODAY };

	it("aktuální výkon: test ve správném limitu; běh z posledních 90 dní", () => {
		expect(normCurrent(pushUps, normData)).toEqual({ value: 30, date: "2026-09-20" });
		expect(normCurrent(run, normData)).toEqual({ value: 840, date: "2026-09-28" });
		// bez čerstvého výkonu poslední známý
		expect(normCurrent(run, { ...normData, workouts: workouts.slice(1) })).toEqual({ value: 800, date: "2026-03-01" });
		expect(normCurrent(plank, normData)).toBeNull();
	});

	it("vzdálenost od splnění a nejslabší disciplína", () => {
		const norm: NormNote = { forma: "norm", schema: 1, name: "Testy", items: [pushUps, run, plank] };
		const status = normStatus(norm, profile, normData);
		// kliky 30 / 34 = 0,882; běh 900 / 840 = 1,071 (splněno); plank nemá řádek pro muže
		expect(status.items.map((i) => i.met)).toEqual([false, true, false]);
		expect(status.items[0]!.ratio).toBeCloseTo(0.882, 3);
		expect(status.items[1]!.ratio).toBeCloseTo(1.071, 3);
		expect(status.items[2]).toMatchObject({ target: null, ratio: null });
		expect(status.weakest!.item.exercise).toBe("Kliky");
		expect(status).toMatchObject({ met: 1, total: 2 });
		expect(status.ratio).toBeCloseTo(0.882, 3);
	});
});

describe("odlehčený týden (9.4)", () => {
	it("zhoršující se check-in: pokles průměru aspoň o 0,5", () => {
		const days = [
			...Array.from({ length: 6 }, (_, i) => day(addDays(TODAY, -10 + i), { check_in: { fatigue: 4, soreness: 4, mood: 4, stress: 4 } })),
			day(addDays(TODAY, -1), { check_in: { fatigue: 3, soreness: 3, mood: 4, stress: 3 } }),
			day(TODAY, { check_in: { fatigue: 2, soreness: 3 } }),
		];
		// před tím 4,0; poslední dny (3,25 + 2,5) / 2 = 2,875
		const trend = checkInTrend(days, TODAY);
		expect(trend.before).toBe(4);
		expect(trend.recent).toBeCloseTo(2.875, 10);
		expect(trend.worsening).toBe(true);
		expect(checkInTrend(days.slice(0, 7), TODAY)).toMatchObject({ recent: null, worsening: false });
	});

	it("stagnace: žádný pravidelně cvičený cvik se nezlepšil", () => {
		const sessions = (values: [number, number][]): SessionBest[] => values.map(([daysAgo, oneRm]) => ({ date: addDays(TODAY, -daysAgo), oneRm }));
		const flat = new Map([["Dřep", sessions([[40, 120], [30, 122], [14, 121], [5, 122]])]]);
		expect(stagnation(flat, TODAY, 3)).toEqual({ tracked: ["Dřep"], improved: [], stagnating: true });
		const growing = new Map([...flat, ["Bench press", sessions([[30, 80], [10, 81], [3, 82]])]]);
		expect(stagnation(growing, TODAY, 3)).toMatchObject({ improved: ["Bench press"], stagnating: false });
		// jediný trénink v posledních týdnech nestačí
		expect(stagnation(new Map([["Dřep", sessions([[40, 120], [5, 118]])]]), TODAY, 3)).toMatchObject({ tracked: [], stagnating: false });
	});

	it("návrh až od dvou signálů", () => {
		const base = {
			lowFormDays: 7,
			tsbDays: 7,
			tsbPct: 20,
			hrvLowDays: 4,
			hrvDaysNeeded: 5,
			checkIn: { recent: 4, before: 4, worsening: false },
			stagnation: { tracked: [], improved: [], stagnating: false },
			stagnationWeeks: 3,
		};
		expect(deloadSignals(base)).toMatchObject({ lowForm: true, hrvLow: false, count: 1, suggest: false });
		const two = deloadSignals({ ...base, hrvLowDays: 5 });
		expect(two).toMatchObject({ count: 2, suggest: true });
		expect(two.reasons[0]).toBe("Forma je 7 dní v řadě víc než 20 % pod kondicí.");
		expect(deloadSignals({ ...base, lowFormDays: null, hrvLowDays: null })).toMatchObject({ count: 0, suggest: false });
	});
});
