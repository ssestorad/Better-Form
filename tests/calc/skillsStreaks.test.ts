import { describe, expect, it } from "vitest";
import { criterionText, ladderStatus, laddersFrom, type SkillCriteria } from "../../src/calc/skills";
import { dayStreak, weekStreak } from "../../src/calc/streaks";
import type { WorkoutNote } from "../../src/model/types";
import { seedExercises } from "../../src/seed/exercises";
import { EXERCISE_ROWS } from "../../src/seed/exerciseData";
import { progressionFor, PULL_UP_EXERCISES, SKILL_LADDERS } from "../../src/seed/skills";
import { builtinName } from "../../src/seed/localize";

function workout(partial: Partial<WorkoutNote> & { date: string }): WorkoutNote {
	return { forma: "workout", schema: 1, sport: "calisthenics", source: "manual", blocks: [], pain: [], ...partial };
}

const CRITERIA: SkillCriteria = { sets: 3, reps: 8, holdSec: 10 };
const same = (a: string, b: string) => a === b;

describe("předpřipravené žebříčky (5.6)", () => {
	const ids = new Set(EXERCISE_ROWS.map((e) => e.id));
	const czech = seedExercises("cs");

	it("dovednosti ze SPEC a všechny stupně jsou v knihovně", () => {
		expect(SKILL_LADDERS.length).toBe(10);
		for (const ladder of SKILL_LADDERS) {
			expect(ladder.steps.length, ladder.name).toBeGreaterThanOrEqual(3);
			for (const step of ladder.steps) expect(ids, `${ladder.name}: ${step}`).toContain(step);
		}
	});

	it("cvik je nejvýš v jednom žebříčku", () => {
		const all = SKILL_LADDERS.flatMap((l) => l.steps);
		expect(new Set(all).size).toBe(all.length);
	});

	it("regrese ke shybu podle SPEC: přítahy → negativy → s gumou → shyb", () => {
		const steps = SKILL_LADDERS.find((l) => l.id === "pull-up-progression")!.steps;
		const order = ["inverted-row", "negative-pull-up", "band-assisted-pull-up", "pull-up"].map((s) => steps.indexOf(s));
		expect(order).toEqual([...order].sort((a, b) => a - b));
		expect(order.every((i) => i >= 0)).toBe(true);
	});

	it("cviky v knihovně nesou žebříček a stupeň", () => {
		expect(progressionFor("Kliky")).toEqual({ ladder: "Kliky – progrese", level: 3 });
		expect(progressionFor("Bench press")).toBeUndefined();
		expect(progressionFor("Push-up", "en")).toEqual({ ladder: "Push-up – progression", level: 3 });
		expect(czech.find((e) => e.name === "Kliky")!.progression).toEqual({ ladder: "Kliky – progrese", level: 3 });
		const ladders = laddersFrom(czech);
		expect(ladders.map((l) => l.name).sort()).toEqual(SKILL_LADDERS.map((l) => builtinName("ladder", l.id, "cs")).sort());
		const front = ladders.find((l) => l.name === "Front lever – progrese")!;
		expect(front.steps.map((s) => s.exercise)).toEqual(["Tuck front lever", "Advanced tuck front lever", "Front lever"]);
		expect(front.steps.every((s) => s.unit === "sec")).toBe(true);
	});

	it("shyby pro odznak jsou v knihovně", () => {
		for (const id of PULL_UP_EXERCISES) expect(ids).toContain(id);
	});
});

describe("stav žebříčku", () => {
	const ladder = laddersFrom([
		{ name: "Kliky na kolenou", measure: "reps_bw", progression: { ladder: "Kliky", level: 1 } },
		{ name: "Kliky", measure: "reps_bw", progression: { ladder: "Kliky", level: 2 } },
		{ name: "Diamantové kliky", measure: "reps_bw", progression: { ladder: "Kliky", level: 3 } },
		{ name: "Plank", measure: "seconds", progression: { ladder: "Výdrže", level: 1 } },
		{ name: "Bez žebříčku", measure: "reps_bw" },
	]);

	it("žebříčky podle názvu, stupně podle úrovně", () => {
		expect(ladder.map((l) => l.name)).toEqual(["Kliky", "Výdrže"]);
		expect(ladder[0]!.steps.map((s) => s.level)).toEqual([1, 2, 3]);
	});

	it("stupeň splní první trénink se 3 sériemi po 8; rozcvičení a dopomoc se nepočítají", () => {
		const workouts = [
			workout({ date: "2026-09-01", blocks: [{ type: "sets", exercise: "Kliky", sets: [{ reps: 8 }, { reps: 8 }, { reps: 7 }] }] }),
			workout({ date: "2026-09-05", blocks: [{ type: "sets", exercise: "Kliky", sets: [{ reps: 12, warmup: true }, { reps: 9 }, { reps: 8 }, { reps: 8, added_kg: -10 }] }] }),
			workout({ date: "2026-09-09", blocks: [{ type: "sets", exercise: "Kliky", sets: [{ reps: 10 }, { reps: 8 }, { reps: 8 }] }] }),
			workout({ date: "2026-09-12", blocks: [{ type: "sets", exercise: "Diamantové kliky", sets: [{ reps: 5 }, { reps: 4 }] }] }),
		];
		const status = ladderStatus(ladder[0]!, workouts, same, CRITERIA);
		expect(status.level).toBe(2);
		expect(status.steps[1]).toMatchObject({ achieved: "2026-09-09", best: { value: 10, date: "2026-09-09" }, bestSets: 3 });
		expect(status.steps[0]!.achieved).toBeNull();
		expect(status.next).toMatchObject({ exercise: "Diamantové kliky", best: { value: 5, date: "2026-09-12" }, bestSets: 0 });
	});

	it("výdrže: 3×10 s; bez tréninku je dalším krokem první stupeň", () => {
		const done = ladderStatus(ladder[1]!, [workout({ date: "2026-09-01", blocks: [{ type: "hold", exercise: "Plank", sets: [{ sec: 30 }, { sec: 20 }, { sec: 10 }] }] })], same, CRITERIA);
		expect(done.level).toBe(1);
		expect(done.next).toBeNull();
		const empty = ladderStatus(ladder[0]!, [], same, CRITERIA);
		expect(empty.level).toBe(0);
		expect(empty.next!.exercise).toBe("Kliky na kolenou");
		expect(criterionText("sec", CRITERIA)).toBe("3×10 s");
		expect(criterionText("reps", CRITERIA)).toBe("3×8 opakování");
	});
});

describe("týdenní série (9.2)", () => {
	// týdny od pondělí: 7. 9., 14. 9., 21. 9., 28. 9. 2026
	const dates = ["2026-09-07", "2026-09-08", "2026-09-10", "2026-09-14", "2026-09-21", "2026-09-22", "2026-09-27", "2026-09-28"];

	it("rozdělaný týden sérii nepřeruší", () => {
		expect(weekStreak(dates, "2026-10-02", 3)).toEqual({ thisWeek: 1, goal: 3, current: 1, best: 1 });
	});

	it("splněný aktuální týden se započítá", () => {
		expect(weekStreak([...dates, "2026-09-30", "2026-10-01"], "2026-10-02", 3)).toEqual({ thisWeek: 3, goal: 3, current: 2, best: 2 });
	});

	it("cíl 1: čtyři týdny po sobě", () => {
		expect(weekStreak(dates, "2026-10-02", 1)).toMatchObject({ current: 4, best: 4 });
	});

	it("bez tréninků nuly", () => {
		expect(weekStreak([], "2026-10-02", 3)).toEqual({ thisWeek: 0, goal: 3, current: 0, best: 0 });
	});
});

describe("série dnů programu", () => {
	const done = new Set(["2026-09-28", "2026-09-30", "2026-10-01"]);
	const scheduled = (date: string) => date !== "2026-09-29";

	it("nesplněný dnešek nevadí, dny bez úkolů se přeskočí", () => {
		expect(dayStreak(scheduled, (d) => done.has(d), "2026-10-02", "2026-09-28")).toBe(3);
	});

	it("nesplněný včerejšek sérii ukončí", () => {
		expect(dayStreak(() => true, (d) => done.has(d), "2026-10-02", "2026-09-01")).toBe(2);
	});
});

describe("shovívavé série: nemoc a dovolená (SPEC 9.2)", () => {
	// Cíl 3 tréninky týdně. Týdny od pondělí: 14. 9., 21. 9., 28. 9., 5. 10.
	const trained = ["2026-09-14", "2026-09-16", "2026-09-18", "2026-09-28", "2026-09-30", "2026-10-02"];
	const sickWeek = ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"];

	it("cíl týdne se sníží poměrně podle omluvených dnů", async () => {
		const { excusedGoal } = await import("../../src/calc/streaks");
		expect(excusedGoal(3, 0)).toBe(3);
		// 3 × 4/7 = 1,71 → 2; 3 × 2/7 = 0,86 → 1; celý týden → 0.
		expect(excusedGoal(3, 3)).toBe(2);
		expect(excusedGoal(3, 5)).toBe(1);
		expect(excusedGoal(3, 7)).toBe(0);
		expect(excusedGoal(3, 9)).toBe(0);
	});

	it("týden nemoci sérii nepřeruší ani neprodlouží; bez omluvy ji přeruší", () => {
		expect(weekStreak(trained, "2026-10-04", 3)).toEqual({ thisWeek: 3, goal: 3, current: 1, best: 1 });
		expect(weekStreak(trained, "2026-10-04", 3, new Set(sickWeek))).toEqual({ thisWeek: 3, goal: 3, current: 2, best: 2 });
	});

	it("částečně omluvený týden stačí splnit se sníženým cílem", () => {
		// V týdnu od 21. 9. tři dny nemoci → cíl 2; odtrénováno 2×.
		const dates = [...trained, "2026-09-25", "2026-09-27"];
		const excused = new Set(["2026-09-21", "2026-09-22", "2026-09-23"]);
		expect(weekStreak(dates, "2026-10-04", 3).current).toBe(1);
		expect(weekStreak(dates, "2026-10-04", 3, excused)).toMatchObject({ current: 3, best: 3 });
	});
});
