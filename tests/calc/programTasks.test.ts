import { describe, expect, it } from "vitest";
import {
	asOwnProgram,
	copyName,
	defaultTarget,
	EDITABLE_TARGETS,
	importName,
	validateProgram,
} from "../../src/calc/programEdit";
import {
	addCounterSet,
	bestReps,
	counterReps,
	newCounterWorkout,
	removeLastCounterSet,
	tasksForDate,
} from "../../src/calc/programTasks";
import { describeDays, describeTarget, programOverview } from "../../src/calc/programText";
import { SEED_PROGRAMS } from "../../src/seed/programs";
import {
	exerciseForWeek,
	ladderTotalReps,
	latestMax,
	planForDate,
	resolveTarget,
} from "../../src/calc/programs";
import type { ProgramItem, ProgramNote, TestNote, WorkoutNote } from "../../src/model/types";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const none = { rule: "none" as const };

function program(overrides: Partial<ProgramNote> = {}): ProgramNote {
	return {
		forma: "program",
		schema: 1,
		name: "Test",
		builtin: false,
		evidence: "practice",
		days: ["mon", "wed", "fri"],
		items: [],
		progression: none,
		active: true,
		active_since: "2026-09-28", // pondělí
		...overrides,
	};
}

function test(date: string, exercise: string, result: number): TestNote {
	return { forma: "test", schema: 1, date, exercise, test_type: "max_reps", result };
}

function workout(blocks: WorkoutNote["blocks"]): WorkoutNote {
	return { forma: "workout", schema: 1, date: "2026-09-28", sport: "calisthenics", source: "manual", blocks, pain: [] };
}

describe("nové cíle programu", () => {
	it("pevný žebřík / pyramida: součet opakování", () => {
		// (1+2+3+4+5+4+3+2+1) × 2 = 25 × 2 = 50
		const target = {
			kind: "ladder" as const,
			steps: [1, 2, 3, 4, 5, 4, 3, 2, 1],
			rounds: 2,
			rest_per_rep_s: 10,
			round_rest_s: 120,
		};
		expect(ladderTotalReps(target)).toBe(50);
		const resolved = resolveTarget(target, { week: 0, progression: none });
		expect(resolved).toMatchObject({ kind: "ladder", open: false, rounds: 2, total: 50 });
		expect(describeTarget(resolved)).toBe(
			"žebřík 1-2-3-4-5-4-3-2-1 ×2 (50 opak.), pauza 10 s × opak., mezi koly 2 min",
		);
	});

	it("otevřený žebřík do selhání", () => {
		const target = { kind: "ladder" as const, open: true, start: 2, step: 2, rest_per_rep_s: 2.5 };
		expect(ladderTotalReps(target)).toBeNull();
		expect(describeTarget(resolveTarget(target, { week: 0, progression: none }))).toBe(
			"žebřík 2, 4, 6… do selhání, pauza 2,5 s × opak.",
		);
	});

	it("EMOM s třetinou maxima", () => {
		const target = { kind: "emom" as const, pct_of_max: 33.33, until_failure: true, max_minutes: 15 };
		// 30 × 33,33 % = 9,999 → 10
		const resolved = resolveTarget(target, { week: 0, progression: none, lastMax: 30 });
		expect(resolved).toEqual({ kind: "emom", reps: 10, until_failure: true, max_minutes: 15, max: 30, pct: 33.33 });
		expect(describeTarget(resolved)).toBe("EMOM 10 opak. každou minutu (33 % z maxima 30) do selhání, nejvýš 15 min");
		// 9 × 33,33 % = 2,9997 → 3
		expect(resolveTarget(target, { week: 0, progression: none, lastMax: 9 })).toMatchObject({ reps: 3 });
		expect(resolveTarget(target, { week: 0, progression: none })).toEqual({ kind: "needs_test", sets: 1, pct: 33.33 });
	});

	it("EMOM s pevným počtem a série na maximum", () => {
		expect(describeTarget(resolveTarget({ kind: "emom", reps: 8, minutes: 10 }, { week: 0, progression: none }))).toBe(
			"EMOM 8 opak. každou minutu, 10 min",
		);
		expect(describeTarget(resolveTarget({ kind: "max_sets", sets: 5, rest_s: 120 }, { week: 0, progression: none }))).toBe(
			"5 sérií na maximum, pauza 2 min",
		);
	});

	it("popis dnů", () => {
		expect(describeDays(["fri", "mon", "wed"])).toBe("po, st, pá");
		expect(describeDays(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).toBe("každý den");
	});
});

describe("přehled programu po týdnech", () => {
	it("program bez změn = jeden týden, stejné dny sloučené", () => {
		const p = program({
			items: [
				{ exercise: "Kliky", target: { kind: "pct_of_max", sets: 3, pct_of_max: 60 } },
				{ exercise: "Dřepy", target: { kind: "sets_reps", sets: 3, reps: 20 }, days: ["fri"] },
			],
		});
		expect(programOverview(p)).toEqual([
			{ from: 1, to: 1, lines: ["po, st: Kliky – 3× 60 % maxima", "pá: Kliky – 3× 60 % maxima; Dřepy – 3×20"] },
		]);
	});

	it("týdenní přidávání a sloučení stejných týdnů", () => {
		const p = program({
			duration_weeks: 3,
			days: ["mon"],
			progression: { rule: "weekly_add", add: 2 },
			items: [{ exercise: "Kliky", target: { kind: "sets_reps", sets: 3, reps: 10 } }],
		});
		// 10, 12, 14 opakování
		expect(programOverview(p).map((w) => w.lines[0])).toEqual(["po: Kliky – 3×10", "po: Kliky – 3×12", "po: Kliky – 3×14"]);
	});

	it("Kliky a shyby – 6 týdnů: pátek střídá varianty, 3. a 6. týden test", () => {
		const p = SEED_PROGRAMS.find((s) => s.note.name === "Kliky a shyby – 6 týdnů")!.note;
		const overview = programOverview(p);
		expect(overview.map((w) => [w.from, w.to])).toEqual([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]]);
		expect(overview[0]!.lines).toEqual([
			"po: Kliky – EMOM 40 % maxima každou minutu, 10 min; Shyby – EMOM 40 % maxima každou minutu, 10 min",
			"st: Kliky – 5× 60 % maxima; Shyby – 5× 60 % maxima",
			"pá: Diamantové kliky – 4× 50 % maxima; Shyby podhmatem – 4× 50 % maxima",
		]);
		expect(overview[2]!.lines[2]).toBe("pá: Kliky – 1 série na maximum; Shyby – 1 série na maximum");
	});

	it("Od gauče k 5 km: týdny 5 a 6 mají různé tréninky", () => {
		const p = SEED_PROGRAMS.find((s) => s.note.name === "Od gauče k 5 km")!.note;
		const overview = programOverview(p);
		expect(overview).toHaveLength(9);
		expect(overview[0]!.lines).toEqual([
			"po, st, so: Běh – zahřátí 5 min · 7× (1 min / 1 min 30 s), 1 min · vychladnutí 5 min – celkem 28 min 30 s",
		]);
		expect(overview[4]!.lines).toHaveLength(3);
		expect(overview[4]!.lines[2]).toBe("so: Běh – zahřátí 5 min · 20 min · vychladnutí 5 min – celkem 30 min");
	});
});

describe("rotace cviku po týdnech", () => {
	const item: ProgramItem = {
		exercise: "Kliky",
		target: { kind: "max_sets", sets: 5 },
		days: ["fri"],
		schedule: [
			{ week: 1, exercise: "Diamantové kliky" },
			{ week: 2, exercise: "Kliky" },
			{ week: 3, exercise: "Široké kliky" },
		],
	};
	const p = program({ items: [item] });

	it("cvik podle týdne, cíl výchozí", () => {
		expect(exerciseForWeek(item, 0)).toBe("Diamantové kliky");
		expect(exerciseForWeek(item, 2)).toBe("Široké kliky");
		expect(exerciseForWeek(item, 5)).toBe("Kliky");
		// pátek 3. týdne = 16. 10. 2026
		expect(planForDate(p, item, "2026-10-16")).toEqual({
			exercise: "Široké kliky",
			target: { kind: "max_sets", sets: 5 },
			week: 2,
		});
		expect(planForDate(p, item, "2026-10-14")).toBeNull(); // středa
	});
});

describe("poslední maximum", () => {
	const tests = [
		test("2026-09-20", "Kliky", 28),
		test("2026-09-27", "Široké kliky", 24),
		test("2026-09-27", "Kliky", 30),
		test("2026-10-04", "Diamantové kliky", 18),
		{ ...test("2026-10-05", "Kliky", 100), test_type: "1rm" as const },
	];

	it("nejnovější test relevantního cviku do daného dne", () => {
		expect(latestMax(tests, (e) => e === "Kliky", "2026-09-30")).toEqual({ value: 30, date: "2026-09-27", exercise: "Kliky" });
		expect(latestMax(tests, (e) => e === "Kliky", "2026-09-26")?.value).toBe(28);
		expect(latestMax(tests, (e) => e === "Shyby", "2026-10-30")).toBeUndefined();
	});

	it("ze všech variant: poslední test vyhrává, i když je nižší (plán z PDF)", () => {
		const variants = ["Kliky", "Široké kliky", "Diamantové kliky"];
		expect(latestMax(tests, (e) => variants.includes(e), "2026-10-10")).toEqual({
			value: 18,
			date: "2026-10-04",
			exercise: "Diamantové kliky",
		});
		// stejný den: vyšší výsledek
		expect(latestMax(tests, (e) => variants.includes(e), "2026-09-27")?.value).toBe(30);
	});
});

describe("dnešní úkoly a splnění", () => {
	const p = program({
		days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
		items: [
			{ exercise: "Kliky", target: { kind: "daily_total", daily_total: 100 } },
			{ exercise: "Shyby", target: { kind: "pct_of_max", sets: 3, pct_of_max: 60 } },
			{ exercise: "Dřepy", target: { kind: "sets_reps", sets: 3, reps: 20 }, days: ["tue"] },
			{
				exercise: "Kliky",
				target: { kind: "emom", pct_of_max: 33.33, until_failure: true },
				max_from: ["Kliky", "Široké kliky"],
			},
		],
	});

	it("počítadlo, % maxima, maximum z více variant", () => {
		const tasks = tasksForDate(p, "2026-09-28", {
			workouts: [workout([{ type: "sets", exercise: "kliky", sets: [{ reps: 10 }, { reps: 15 }, { reps: 10, warmup: true }] }])],
			tests: [test("2026-09-20", "Shyby", 10), test("2026-09-20", "Kliky", 20), test("2026-09-25", "Široké kliky", 30)],
			isSameExercise: same,
		});
		expect(tasks.map((t) => t.exercise)).toEqual(["Kliky", "Shyby", "Kliky"]); // Dřepy jen v úterý
		// počítadlo: 10 + 15 = 25 ze 100 (rozcvičovací série se nepočítá)
		expect(tasks[0]).toMatchObject({ done: false, counter: { done: 25, total: 100, remaining: 75, percent: 25 } });
		// 10 × 60 % = 6
		expect(tasks[1]).toMatchObject({ target: { kind: "pct_of_max", sets: 3, reps: 6, max: 10 }, done: false });
		// poslední maximum z variant je 30 (Široké kliky) → 10 opak.
		expect(tasks[2]).toMatchObject({ target: { kind: "emom", reps: 10 }, max: { exercise: "Široké kliky" }, done: true });
	});

	it("retest: po nastaveném počtu týdnů od posledního testu", () => {
		const every3 = program({ ...p, retest_every_weeks: 3 });
		const on = (testDate: string) => tasksForDate(every3, "2026-09-28", { workouts: [], tests: [test(testDate, "Shyby", 10)], isSameExercise: same })[1]!;
		expect(on("2026-09-07").retest).toBe(true); // 21 dní
		expect(on("2026-09-08").retest).toBeUndefined(); // 20 dní
		// bez nastavení se nepřipomíná
		expect(tasksForDate(p, "2026-09-28", { workouts: [], tests: [test("2026-01-01", "Shyby", 10)], isSameExercise: same })[1]!.retest).toBeUndefined();
	});

	it("bez testu → nejdřív test; mimo program → nic", () => {
		const tasks = tasksForDate(p, "2026-09-28", { workouts: [], tests: [], isSameExercise: same });
		expect(tasks[1]!.target.kind).toBe("needs_test");
		expect(tasksForDate(program({ active: false, items: p.items }), "2026-09-28", { workouts: [], tests: [], isSameExercise: same })).toEqual([]);
	});

	it("běh podle programu je splněný tréninkem navázaným na program", () => {
		const run = program({ items: [{ exercise: "Běh", target: { kind: "distance", distance_km: 5 } }] });
		const ctx = { tests: [], isSameExercise: same };
		expect(tasksForDate(run, "2026-09-28", { ...ctx, workouts: [] })[0]!.done).toBe(false);
		expect(tasksForDate(run, "2026-09-28", { ...ctx, workouts: [workout([])] })[0]!.done).toBe(true);
	});
});

describe("denní počítadlo", () => {
	const isKliky = (e: string) => same(e, "Kliky");

	it("každá dávka je samostatná série; vstup se nemění", () => {
		const empty = newCounterWorkout("2026-09-28", "calisthenics", "100 kliků denně", "100 kliků denně", 1);
		const first = addCounterSet(empty, "Kliky", 10, isKliky);
		const second = addCounterSet(first, "Kliky", 15, isKliky);
		expect(empty.blocks).toEqual([]);
		expect(second.blocks).toEqual([{ type: "sets", exercise: "Kliky", sets: [{ reps: 10 }, { reps: 15 }] }]);
		expect(second).toMatchObject({ program: "100 kliků denně", title: "100 kliků denně", sport: "calisthenics" });
		expect(counterReps([second], isKliky)).toBe(25);
	});

	it("vrátit poslední dávku; prázdný blok zmizí", () => {
		const note = workout([{ type: "sets", exercise: "Kliky", sets: [{ reps: 10 }, { reps: 15 }] }]);
		const once = removeLastCounterSet(note, isKliky)!;
		expect(once.blocks).toEqual([{ type: "sets", exercise: "Kliky", sets: [{ reps: 10 }] }]);
		const twice = removeLastCounterSet(once, isKliky)!;
		expect(twice.blocks).toEqual([]);
		expect(removeLastCounterSet(twice, isKliky)).toBeNull();
	});

	it("nejlepší série pro nové maximum (bez rozcvičení)", () => {
		const note = workout([
			{ type: "sets", exercise: "Kliky", sets: [{ reps: 40, warmup: true }, { reps: 32 }, { reps: 25 }, { reps: 21 }] },
		]);
		expect(bestReps(note, isKliky)).toBe(32);
		expect(bestReps(note, (e) => e === "Shyby")).toBeUndefined();
	});
});

describe("validace programu z formuláře", () => {
	it("platný program", () => {
		const p = program({
			name: "Můj",
			items: EDITABLE_TARGETS.map((kind) => ({ exercise: "Kliky", target: defaultTarget(kind) })),
		});
		expect(validateProgram(p)).toEqual([]);
	});

	it("vyjmenuje problémy", () => {
		const p = program({
			name: " ",
			days: [],
			progression: { rule: "weekly_add" },
			items: [
				{ exercise: "", target: { kind: "sets_reps", sets: 0, reps: 10 } },
				{ exercise: "Shyby", target: { kind: "pct_of_max", sets: 3, pct_of_max: 150 } },
				{ exercise: "Kliky", target: { kind: "emom", reps: 5 } },
			],
		});
		expect(validateProgram(p)).toEqual([
			"Doplň název programu.",
			"Vyber aspoň jeden den.",
			"Doplň, kolik se má každý týden přidat.",
			"Položka 1: vyber cvik.",
			"položka 1: doplň série a opakování.",
			"Shyby: doplň série a procento 1–100.",
			"Kliky: doplň opakování (nebo % maxima) a délku.",
		]);
	});
});

describe("kopie a import programu", () => {
	it("vlastní neaktivní kopie", () => {
		const copy = asOwnProgram(program({ builtin: true, name: "Základ 4" }), "Základ 4 (kopie)");
		expect(copy).toMatchObject({ name: "Základ 4 (kopie)", builtin: false, active: false });
		expect("active_since" in copy).toBe(false);
	});

	it("názvy při kolizi", () => {
		const taken = new Set(["A (kopie)", "B", "B (2)"]);
		const exists = (n: string) => taken.has(n);
		expect(copyName("X", exists)).toBe("X (kopie)");
		expect(copyName("A", exists)).toBe("A (kopie 2)");
		expect(importName("C", exists)).toBe("C");
		expect(importName("B", exists)).toBe("B (3)");
	});
});
