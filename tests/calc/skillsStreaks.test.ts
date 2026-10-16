import { describe, expect, it } from "vitest";
import { criterionText, ladderStatus, laddersFrom, type SkillCriteria } from "../../src/calc/skills";
import { badges, dayStreak, weekStreak } from "../../src/calc/streaks";
import type { WorkoutNote } from "../../src/model/types";
import { SEED_EXERCISES } from "../../src/seed/exercises";
import { progressionFor, PULL_UP_EXERCISES, SKILL_LADDERS } from "../../src/seed/skills";

function workout(partial: Partial<WorkoutNote> & { date: string }): WorkoutNote {
	return { forma: "workout", schema: 1, sport: "calisthenics", source: "manual", blocks: [], pain: [], ...partial };
}

const CRITERIA: SkillCriteria = { sets: 3, reps: 8, holdSec: 10 };
const same = (a: string, b: string) => a === b;

describe("předpřipravené žebříčky (5.6)", () => {
	const names = new Set(SEED_EXERCISES.map((e) => e.name));

	it("dovednosti ze SPEC a všechny stupně jsou v knihovně", () => {
		expect(SKILL_LADDERS.length).toBe(10);
		for (const ladder of SKILL_LADDERS) {
			expect(ladder.steps.length, ladder.name).toBeGreaterThanOrEqual(3);
			for (const step of ladder.steps) expect(names, `${ladder.name}: ${step}`).toContain(step);
		}
	});

	it("cvik je nejvýš v jednom žebříčku", () => {
		const all = SKILL_LADDERS.flatMap((l) => l.steps);
		expect(new Set(all).size).toBe(all.length);
	});

	it("regrese ke shybu podle SPEC: přítahy → negativy → s gumou → shyb", () => {
		const steps = SKILL_LADDERS.find((l) => l.name === "Shyby – progrese")!.steps;
		const order = ["Australské přítahy", "Negativní shyby", "Shyby s gumou", "Shyby"].map((s) => steps.indexOf(s));
		expect(order).toEqual([...order].sort((a, b) => a - b));
		expect(order.every((i) => i >= 0)).toBe(true);
	});

	it("cviky v knihovně nesou žebříček a stupeň", () => {
		expect(progressionFor("Kliky")).toEqual({ ladder: "Kliky – progrese", level: 3 });
		expect(progressionFor("Bench press")).toBeUndefined();
		expect(SEED_EXERCISES.find((e) => e.name === "Kliky")!.progression).toEqual({ ladder: "Kliky – progrese", level: 3 });
		const ladders = laddersFrom(SEED_EXERCISES);
		expect(ladders.map((l) => l.name).sort()).toEqual(SKILL_LADDERS.map((l) => l.name).sort());
		const front = ladders.find((l) => l.name === "Front lever – progrese")!;
		expect(front.steps.map((s) => s.exercise)).toEqual(["Tuck front lever", "Advanced tuck front lever", "Front lever"]);
		expect(front.steps.every((s) => s.unit === "sec")).toBe(true);
	});

	it("shyby pro odznak jsou v knihovně", () => {
		for (const name of PULL_UP_EXERCISES) expect(names).toContain(name);
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

describe("odznaky", () => {
	const isPullUp = (e: string) => e === "Shyby";

	it("průběh, když ještě nejsou získané", () => {
		const workouts = [
			workout({ date: "2026-10-01", sport: "run", run: { distance_km: 6 } }),
			workout({ date: "2026-10-01", blocks: [{ type: "sets", exercise: "Shyby", sets: [{ reps: 5, added_kg: -20 }] }] }),
		];
		const result = badges(workouts, workouts, isPullUp, "2026-10-02");
		expect(result.map((b) => b.achieved)).toEqual([null, null, null, null]);
		expect(result.map((b) => b.progress.value)).toEqual([6, 6, 2, 0]);
	});

	it("první desítka, 100 km za měsíc, 50 tréninků, první shyb", () => {
		const runs = Array.from({ length: 10 }, (_, i) =>
			workout({ date: `2026-09-${String(i * 2 + 1).padStart(2, "0")}`, sport: "run", run: { distance_km: i === 3 ? 12 : 10 } }),
		);
		const gym = Array.from({ length: 45 }, (_, i) => workout({ date: `2026-08-${String((i % 28) + 1).padStart(2, "0")}`, start: `${String(6 + Math.floor(i / 28)).padStart(2, "0")}:00` }));
		const pull = workout({ date: "2026-09-30", blocks: [{ type: "sets", exercise: "Shyby", sets: [{ reps: 2 }] }] });
		const all = [...gym, ...runs, pull];
		const result = badges(all, all, isPullUp, "2026-10-02");
		const byId = Object.fromEntries(result.map((b) => [b.id, b.achieved]));
		expect(byId.first10k).toBe("2026-09-01");
		// 9 běhů po 10 km + jeden 12 km: 100 km padne desátým během (19. 9.)
		expect(byId.month100k).toBe("2026-09-19");
		// 45 tréninků v srpnu + 5. běh v září (9. 9.) = 50.
		expect(byId.workouts50).toBe("2026-09-09");
		expect(byId.firstPullUp).toBe("2026-09-30");
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
