import { describe, expect, it } from "vitest";
import { cardioStats, exerciseStats, quickSet, setPlan, taskFor } from "../../src/calc/basic";
import type { ProgramTask } from "../../src/calc/programTasks";
import { startOfWeek } from "../../src/model/dates";
import type { Block, TestNote, WorkoutNote } from "../../src/model/types";

function workout(date: string, blocks: Block[], extra: Partial<WorkoutNote> = {}): WorkoutNote {
	return { forma: "workout", schema: 1, date, sport: "calisthenics", source: "manual", blocks, pain: [], ...extra };
}
const pushUps = (...reps: number[]): Block => ({ type: "sets", exercise: "Kliky", sets: reps.map((r) => ({ reps: r })) });
const isKliky = (e: string) => e.toLowerCase() === "kliky";

describe("statistiky cviku", () => {
	const workouts = [
		workout("2026-09-25", [pushUps(20, 18, 15)]),
		workout("2026-09-28", [pushUps(18, 18), { type: "sets", exercise: "Shyby", sets: [{ reps: 6 }] }]),
		workout("2026-09-28", [{ type: "sets", exercise: "Kliky", sets: [{ reps: 30, warmup: true }, { reps: 16 }] }], { start: "18:00" }),
		workout("2026-10-01", [pushUps(19, 17)]),
		workout("2026-10-05", [pushUps(40)]),
	];
	const tests: TestNote[] = [
		{ forma: "test", schema: 1, date: "2026-09-20", exercise: "Kliky", test_type: "max_reps", result: 30 },
		{ forma: "test", schema: 1, date: "2026-09-29", exercise: "Kliky", test_type: "max_reps", result: 32 },
		{ forma: "test", schema: 1, date: "2026-09-29", exercise: "Shyby", test_type: "max_reps", result: 50 },
	];

	it("naposledy = poslední den před dneškem (oba tréninky dne), dnešek zvlášť", () => {
		const stats = exerciseStats(workouts, tests, isKliky, "reps", "2026-10-01");
		expect(stats.last).toEqual({ date: "2026-09-28", values: [18, 18, 16] });
		expect(stats.today).toEqual([19, 17]);
	});

	it("rekord = nejlepší série nebo test; rozcvičení a budoucnost se nepočítají", () => {
		const stats = exerciseStats(workouts, tests, isKliky, "reps", "2026-10-01");
		// série: nejvýš 20; testy: 32 → rekord 32 z 29. 9.
		expect(stats.record).toEqual({ value: 32, date: "2026-09-29" });
		expect(stats.lastTest).toEqual({ value: 32, date: "2026-09-29" });
	});

	it("bez dat", () => {
		expect(exerciseStats([], [], isKliky, "reps", "2026-10-01")).toEqual({ today: [] });
	});

	it("výdrže se počítají v sekundách", () => {
		const plank = [workout("2026-09-30", [{ type: "hold", exercise: "Plank", sets: [{ sec: 60 }, { sec: 45 }] }])];
		const stats = exerciseStats(plank, [], (e) => e === "Plank", "sec", "2026-10-01");
		expect(stats.last).toEqual({ date: "2026-09-30", values: [60, 45] });
		expect(stats.record).toEqual({ value: 60, date: "2026-09-30" });
	});
});

describe("plán série a úkol cviku", () => {
	it("počet sérií a hodnota z cíle", () => {
		expect(setPlan({ kind: "pct_of_max", sets: 3, reps: 18, max: 30, pct: 60 })).toEqual({ sets: 3, value: 18 });
		expect(setPlan({ kind: "sets_reps", sets: 4, reps: 10 })).toEqual({ sets: 4, value: 10 });
		expect(setPlan({ kind: "time", time_s: 45, sets: 3 })).toEqual({ sets: 3, value: 45 });
		expect(setPlan({ kind: "max_sets", sets: 5 })).toEqual({ sets: 5 });
		expect(setPlan({ kind: "needs_test", sets: 3, pct: 60 })).toEqual({});
		expect(setPlan(undefined)).toEqual({});
	});

	it("první úkol dnešních programů pro cvik", () => {
		const task = (exercise: string): ProgramTask => ({ itemIndex: 0, exercise, target: { kind: "sets_reps", sets: 3, reps: 10 }, done: false });
		const programs = [
			{ name: "A", tasks: [task("Shyby")] },
			{ name: "B", tasks: [task("Dřepy"), task("Kliky")] },
		];
		expect(taskFor(programs, isKliky)?.program.name).toBe("B");
		expect(taskFor(programs, (e) => e === "Plank")).toBeUndefined();
	});

	it("série pro rychlý zápis", () => {
		expect(quickSet(18, "reps")).toEqual({ reps: 18 });
		expect(quickSet(45, "sec")).toEqual({ sec: 45 });
	});
});

describe("přehled běhu", () => {
	const run = (date: string, km?: number, s?: number): WorkoutNote =>
		workout(date, [], { sport: "run", ...(km !== undefined ? { run: { distance_km: km, ...(s !== undefined ? { moving_time_s: s } : {}) } } : {}) });

	it("týden začíná v pondělí", () => {
		// 1. 10. 2026 je čtvrtek → pondělí 28. 9.
		expect(startOfWeek("2026-10-01")).toBe("2026-09-28");
		expect(startOfWeek("2026-09-28")).toBe("2026-09-28");
		expect(startOfWeek("2026-10-04")).toBe("2026-09-28");
	});

	it("poslední běh, nejdelší běh a tento týden", () => {
		const workouts = [run("2026-09-20", 12), run("2026-09-27", 8), run("2026-09-28", 5, 1800), run("2026-09-30", 6.5), run("2026-10-01"), workout("2026-09-30", [pushUps(10)])];
		expect(cardioStats(workouts, "run", "2026-10-01")).toEqual({
			last: { date: "2026-10-01" },
			longest: { value: 12, date: "2026-09-20" },
			weekCount: 3,
			// 5 + 6,5 + 0 (běh bez vzdálenosti)
			weekKm: 11.5,
		});
		expect(cardioStats(workouts, "run", "2026-09-28").last).toEqual({ date: "2026-09-28", distance_km: 5, moving_time_s: 1800 });
	});

	it("bez běhů", () => {
		expect(cardioStats([], "run", "2026-10-01")).toEqual({ weekCount: 0, weekKm: 0 });
	});
});
