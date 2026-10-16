import { describe, expect, it } from "vitest";
import {
	counterProgress,
	intervalTotalSeconds,
	intervalWorkSeconds,
	programWeek,
	resolveTarget,
	retestDue,
	sessionIndexInWeek,
	targetForDate,
} from "../../src/calc/programs";
import type { ProgramItem, ProgramNote, ProgramTarget } from "../../src/model/types";

function program(overrides: Partial<ProgramNote> = {}): ProgramNote {
	return {
		forma: "program",
		schema: 1,
		name: "Test",
		builtin: false,
		evidence: "practice",
		days: ["mon", "wed", "fri"],
		items: [],
		progression: { rule: "none" },
		active: true,
		// 28. 9. 2026 je pondělí
		active_since: "2026-09-28",
		...overrides,
	};
}

describe("týden a dny programu", () => {
	it("týden od začátku programu", () => {
		expect(programWeek(program(), "2026-09-28")).toBe(0);
		expect(programWeek(program(), "2026-10-04")).toBe(0); // 6 dní
		expect(programWeek(program(), "2026-10-05")).toBe(1); // 7 dní
		expect(programWeek(program(), "2026-10-19")).toBe(3); // 21 dní
	});

	it("před začátkem, po konci nebo neaktivní program = null", () => {
		expect(programWeek(program(), "2026-09-27")).toBeNull();
		// 4 týdny: 26. 10. je 28. den → 5. týden (index 4) už nepatří
		expect(programWeek(program({ duration_weeks: 4 }), "2026-10-25")).toBe(3);
		expect(programWeek(program({ duration_weeks: 4 }), "2026-10-26")).toBeNull();
		expect(programWeek(program({ active: false }), "2026-09-29")).toBeNull();
		expect(programWeek(program({ active_since: undefined }), "2026-09-29")).toBeNull();
	});
});

describe("cíl na dnešek", () => {
	const none = { rule: "none" as const };
	const weeklyAdd = (add: number) => ({ rule: "weekly_add" as const, add });

	it("denní součet a série × opakování, s týdenním přidáváním", () => {
		expect(resolveTarget({ kind: "daily_total", daily_total: 100 }, { week: 2, progression: none })).toEqual({
			kind: "daily_total",
			total: 100,
		});
		// 100 + 10 × 2 = 120
		expect(
			resolveTarget({ kind: "daily_total", daily_total: 100 }, { week: 2, progression: weeklyAdd(10) }),
		).toEqual({ kind: "daily_total", total: 120 });
		// 10 + 1 × 3 = 13
		expect(resolveTarget({ kind: "sets_reps", sets: 3, reps: 10 }, { week: 3, progression: weeklyAdd(1) })).toEqual(
			{ kind: "sets_reps", sets: 3, reps: 13 },
		);
	});

	it("procento z maxima, zaokrouhleno na celá opakování, min. 1", () => {
		const target = (pct: number) => ({ kind: "pct_of_max" as const, sets: 4, pct_of_max: pct });
		// 32 × 60 % = 19,2 → 19
		expect(resolveTarget(target(60), { week: 0, progression: none, lastMax: 32 })).toEqual({
			kind: "pct_of_max",
			sets: 4,
			reps: 19,
			max: 32,
			pct: 60,
		});
		// 25 × 55 % = 13,75 → 14
		expect(resolveTarget(target(55), { week: 0, progression: none, lastMax: 25 })).toMatchObject({ reps: 14 });
		// 3 × 10 % = 0,3 → minimum 1
		expect(resolveTarget(target(10), { week: 0, progression: none, lastMax: 3 })).toMatchObject({ reps: 1 });
	});

	it("bez testu maxima → nejdřív test", () => {
		expect(
			resolveTarget({ kind: "pct_of_max", sets: 3, pct_of_max: 50 }, { week: 0, progression: none }),
		).toEqual({ kind: "needs_test", sets: 3, pct: 50 });
	});

	it("čas a vzdálenost", () => {
		// 30 s + 5 s × 2 = 40 s
		expect(resolveTarget({ kind: "time", time_s: 30 }, { week: 2, progression: weeklyAdd(5) })).toEqual({
			kind: "time",
			time_s: 40,
			sets: 1,
		});
		expect(resolveTarget({ kind: "distance", distance_km: 5 }, { week: 1, progression: none })).toEqual({
			kind: "distance",
			distance_km: 5,
		});
	});
});

describe("plán po týdnech a intervaly", () => {
	const interval = (work: number): ProgramTarget => ({ kind: "intervals", steps: [{ repeats: 1, work_s: work }] });
	const item: ProgramItem = {
		exercise: "Běh",
		target: interval(60),
		schedule: [
			{ week: 1, target: interval(100) },
			{ week: 2, sessions: [interval(201), interval(202), interval(203)] },
			{ week: 3, target: interval(300), sessions: [interval(301)] },
		],
	};
	// po, st, so; 28. 9. 2026 je pondělí
	const c25k = program({ days: ["sat", "mon", "wed"], duration_weeks: 4, items: [item] });

	it("pořadí tréninku v týdnu podle dnů programu (po → ne)", () => {
		expect(sessionIndexInWeek(c25k, item, "2026-09-28")).toBe(0); // po
		expect(sessionIndexInWeek(c25k, item, "2026-09-30")).toBe(1); // st
		expect(sessionIndexInWeek(c25k, item, "2026-10-03")).toBe(2); // so
		expect(sessionIndexInWeek(c25k, item, "2026-09-29")).toBeNull(); // út
	});

	it("cíl podle týdne a tréninku, jinak výchozí", () => {
		const workOf = (date: string) => {
			const target = targetForDate(c25k, item, date);
			return target?.kind === "intervals" ? target.steps[0]!.work_s : target;
		};
		expect(workOf("2026-09-30")).toBe(100); // 1. týden – cíl týdne
		expect(workOf("2026-10-05")).toBe(201); // 2. týden, 1. trénink
		expect(workOf("2026-10-07")).toBe(202); // 2. týden, 2. trénink
		expect(workOf("2026-10-10")).toBe(203); // 2. týden, 3. trénink
		expect(workOf("2026-10-12")).toBe(301); // 3. týden, 1. trénink – vlastní cíl
		expect(workOf("2026-10-14")).toBe(300); // 3. týden, 2. trénink – cíl týdne
		expect(workOf("2026-10-19")).toBe(60); // 4. týden – bez plánu, výchozí cíl
		expect(workOf("2026-09-29")).toBeNull(); // úterý se necvičí
		expect(workOf("2026-10-26")).toBeNull(); // po konci programu
	});

	it("délka intervalového tréninku", () => {
		// 300 + 7 × (60 + 90) + 60 + 300 = 1710 s (28 min 30 s)
		const target = {
			warmup_s: 300,
			steps: [
				{ repeats: 7, work_s: 60, rest_s: 90 },
				{ repeats: 1, work_s: 60 },
			],
			cooldown_s: 300,
		};
		expect(intervalTotalSeconds(target)).toBe(1710);
		// běh: 7 × 60 + 60 = 480 s
		expect(intervalWorkSeconds(target)).toBe(480);
		expect(resolveTarget({ kind: "intervals", ...target }, { week: 0, progression: { rule: "none" } })).toEqual({
			kind: "intervals",
			...target,
			total_s: 1710,
			work_s: 480,
		});
	});

	it("intervaly se neposouvají týdenním přidáváním", () => {
		const resolved = resolveTarget(interval(60), { week: 5, progression: { rule: "weekly_add", add: 10 } });
		expect(resolved).toMatchObject({ total_s: 60, work_s: 60 });
	});
});

describe("denní počítadlo", () => {
	it("průběh", () => {
		expect(counterProgress(35, 100)).toEqual({ done: 35, total: 100, remaining: 65, percent: 35, complete: false });
		// 199 / 200 = 99,5 % → 99 (100 % jen při splnění)
		expect(counterProgress(199, 200).percent).toBe(99);
		expect(counterProgress(120, 100)).toEqual({ done: 120, total: 100, remaining: 0, percent: 100, complete: true });
		expect(counterProgress(-5, 100).done).toBe(0);
	});
});

describe("retest", () => {
	it("bez testu vždy, jinak po N týdnech", () => {
		const p = program({ retest_every_weeks: 3 });
		expect(retestDue(p, undefined, "2026-09-22")).toBe(true);
		expect(retestDue(p, "2026-09-01", "2026-09-22")).toBe(true); // 21 dní
		expect(retestDue(p, "2026-09-01", "2026-09-21")).toBe(false); // 20 dní
		expect(retestDue(program(), "2026-01-01", "2026-09-22")).toBe(false);
	});
});
