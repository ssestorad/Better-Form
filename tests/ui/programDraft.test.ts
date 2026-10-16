import { describe, expect, it } from "vitest";
import type { ProgramTask } from "../../src/calc/programTasks";
import type { ProgramNote } from "../../src/model/types";
import { draftToWorkout } from "../../src/ui/workout/draft";
import { programToDraft, type ProgramDraftContext } from "../../src/ui/workout/programDraft";

const program: ProgramNote = {
	forma: "program",
	schema: 1,
	name: "Kliky a shyby",
	builtin: false,
	evidence: "practice",
	days: ["mon"],
	items: [],
	progression: { rule: "none" },
	active: true,
	active_since: "2026-09-28",
};

const ctx: ProgramDraftContext = {
	info: (e) =>
		e === "Shyby"
			? { category: "calisthenics", kind: "grind", measure: "reps_bw", muscles: { primary: ["lats"] } }
			: undefined,
	last: (e) =>
		e === "Shyby"
			? { date: "2026-09-25", blocks: [{ type: "sets", exercise: "Shyby", sets: [{ reps: 5, added_kg: 5, rir: 2 }] }] }
			: undefined,
	options: { rirMin: 2, incrementUpperKg: 2.5, incrementLowerKg: 5, kettlebellsKg: [] },
	sportFor: (e) => (e === "Běh" ? "run" : "calisthenics"),
};

const task = (exercise: string, target: ProgramTask["target"]): ProgramTask => ({ itemIndex: 0, exercise, target, done: false });

describe("trénink z programu", () => {
	it("bloky podle cílů, počítadlo se vynechá", () => {
		const draft = programToDraft(program, "Kliky a shyby", "2026-09-28", [
			task("Kliky", { kind: "daily_total", total: 100 }),
			task("Shyby", { kind: "pct_of_max", sets: 3, reps: 6, max: 10, pct: 60 }),
			task("Kliky", { kind: "ladder", steps: [1, 2, 3, 2, 1], open: false, start: 1, step: 1, rounds: 2, total: 18 }),
			task("Kliky", { kind: "ladder", steps: [], open: true, start: 2, step: 2, rounds: 1 }),
			task("Kliky", { kind: "emom", reps: 10, until_failure: true, max_minutes: 15 }),
			task("Kliky", { kind: "max_sets", sets: 5, rest_s: 120 }),
			task("Plank", { kind: "time", time_s: 45, sets: 3 }),
			task("Kliky", { kind: "needs_test", sets: 3, pct: 60 }),
		], ctx);

		expect(draft).toMatchObject({ date: "2026-09-28", sport: "calisthenics", title: "Kliky a shyby", program: "Kliky a shyby" });
		expect(draft.blocks.map((b) => b.type)).toEqual(["sets", "ladder", "ladder", "emom", "sets", "hold", "sets"]);
		// % maxima: 3 série po 6, přívažek z minula
		expect(draft.blocks[0]).toMatchObject({
			exercise: "Shyby",
			sets: [{ reps: 6, added_kg: 5 }, { reps: 6, added_kg: 5 }, { reps: 6, added_kg: 5 }],
			targetNote: "3×6 (60 % z maxima 10)",
		});
		// pevný žebřík: příčky obou kol za sebou
		expect(draft.blocks[1]!.steps).toEqual([1, 2, 3, 2, 1, 1, 2, 3, 2, 1]);
		// otevřený žebřík se vyplní podle skutečnosti
		expect(draft.blocks[2]!.steps).toEqual([]);
		expect(draft.blocks[3]).toMatchObject({ minutes: 15, reps_per_min: 10 });
		expect(draft.blocks[4]!.sets).toHaveLength(5);
		expect(draft.blocks[5]!.sets).toEqual([{ sec: 45 }, { sec: 45 }, { sec: 45 }]);
		expect(draft.blocks[6]!.targetNote).toBe("nejdřív otestuj maximum");
	});

	it("běh: vzdálenost do údajů o běhu, intervaly do poznámky a délky", () => {
		const distance = programToDraft(program, "P", "2026-09-28", [task("Běh", { kind: "distance", distance_km: 5 })], ctx);
		expect(distance).toMatchObject({ sport: "run", run: { distance_km: 5 }, blocks: [] });

		const intervals = programToDraft(program, "P", "2026-09-28", [
			task("Běh", {
				kind: "intervals",
				warmup_s: 300,
				steps: [{ repeats: 7, work_s: 60, rest_s: 90 }, { repeats: 1, work_s: 60 }],
				cooldown_s: 300,
				total_s: 1710,
				work_s: 480,
			}),
		], ctx);
		// 1710 s = 28,5 min → 29 (zaokrouhleno)
		expect(intervals.duration_min).toBe(29);
		expect(intervals.notes).toBe(
			"Běh: zahřátí 5 min · 7× (1 min / 1 min 30 s), 1 min · vychladnutí 5 min – celkem 28 min 30 s",
		);
	});

	it("cíl u bloku se do uložené poznámky nedostane", () => {
		const draft = programToDraft(program, "P", "2026-09-28", [task("Kliky", { kind: "sets_reps", sets: 2, reps: 10 })], ctx);
		const note = draftToWorkout(draft, 1);
		expect(note.blocks).toEqual([{ type: "sets", exercise: "Kliky", sets: [{ reps: 10 }, { reps: 10 }] }]);
		expect(note.program).toBe("P");
	});
});
