import { describe, expect, it } from "vitest";
import { parseTemplate, parseWorkout } from "../../src/model/parse";
import { templateToFrontmatter, WORKOUT_KEYS, workoutToFrontmatter } from "../../src/model/serialize";
import type { TemplateNote, WorkoutNote } from "../../src/model/types";

const strength: WorkoutNote = {
	forma: "workout",
	schema: 1,
	date: "2026-09-28",
	start: "17:30",
	sport: "strength",
	title: "Push",
	template: "Push day",
	duration_min: 62,
	rpe: 7,
	source: "manual",
	blocks: [
		{
			type: "sets",
			exercise: "Bench press",
			sets: [
				{ reps: 10, kg: 40, warmup: true },
				{ reps: 6, kg: 80, rir: 2 },
				{ reps: 6, kg: 80, rir: 1 },
			],
		},
		{ type: "hold", exercise: "L-sit", sets: [{ sec: 15 }, { sec: 12 }] },
		{ type: "emom", exercise: "Kettlebell swing", minutes: 10, reps_per_min: 15, kg: 24 },
		{ type: "sets", exercise: "Shyby", sets: [{ reps: 6, added_kg: 10, rir: 2 }] },
		{
			type: "amrap",
			minutes: 12,
			items: [
				{ exercise: "Kliky", reps: 10 },
				{ exercise: "Dřepy", reps: 15 },
			],
			rounds: 5,
			extra_reps: 7,
			rpe: 8,
		},
		{ type: "ladder", exercise: "Shyby", steps: [1, 2, 3, 4, 5] },
		{ type: "complex", items: [{ exercise: "Kettlebell clean", reps: 2 }], rounds: 5, kg: 16 },
		{ type: "timed", exercise: "Kettlebell swing", sec: 300, reps: 100, kg: 24 },
	],
	pain: [],
	notes: "Dobrý den",
};

describe("zápis tréninku", () => {
	it("odkazy jako [[wikiodkazy]], rozcvičení jako warmup: true", () => {
		const fm = workoutToFrontmatter(strength);
		expect(fm.template).toBe("[[Push day]]");
		const blocks = fm.blocks as Record<string, unknown>[];
		expect(blocks[0]).toEqual({
			type: "sets",
			exercise: "[[Bench press]]",
			sets: [
				{ reps: 10, kg: 40, warmup: true },
				{ reps: 6, kg: 80, rir: 2 },
				{ reps: 6, kg: 80, rir: 1 },
			],
		});
		expect((blocks[4]!.items as Record<string, unknown>[])[0]).toEqual({ exercise: "[[Kliky]]", reps: 10 });
	});

	it("pořadí klíčů podle SPEC 4.2 a jen spravované klíče", () => {
		const keys = Object.keys(workoutToFrontmatter(strength));
		expect(keys).toEqual(["forma", "schema", "date", "start", "sport", "title", "template", "duration_min", "rpe", "source", "blocks", "pain", "notes"]);
		for (const key of keys) expect(WORKOUT_KEYS).toContain(key);
	});

	it("silový trénink: zápis a načtení vrátí stejná data", () => {
		expect(parseWorkout(workoutToFrontmatter(strength))).toEqual(strength);
	});

	it("běh: zápis a načtení vrátí stejná data", () => {
		const run: WorkoutNote = {
			forma: "workout",
			schema: 1,
			date: "2026-09-29",
			sport: "run",
			duration_min: 55,
			source: "manual",
			run: { distance_km: 10.2, moving_time_s: 3310, avg_hr: 152, type: "easy", shoes: "Pegasus 40" },
			blocks: [],
			pain: [],
		};
		const fm = workoutToFrontmatter(run);
		expect((fm.run as Record<string, unknown>).shoes).toBe("[[Pegasus 40]]");
		expect(fm.blocks).toBeUndefined();
		expect(parseWorkout(fm)).toEqual(run);
	});
});

describe("švihadlo", () => {
	it("počet přeskoků: zápis a načtení vrátí stejná data", () => {
		const rope: WorkoutNote = {
			forma: "workout",
			schema: 1,
			date: "2026-10-01",
			sport: "rope",
			duration_min: 12,
			rpe: 6,
			source: "manual",
			rope: { jumps: 1200 },
			blocks: [],
			pain: [],
		};
		const fm = workoutToFrontmatter(rope);
		expect(fm.rope).toEqual({ jumps: 1200 });
		expect(parseWorkout(fm)).toEqual(rope);
	});
});

describe("zápis šablony", () => {
	it("zápis a načtení vrátí stejná data", () => {
		const template: TemplateNote = {
			forma: "template",
			schema: 1,
			name: "Push day",
			sport: "strength",
			blocks: [
				{ type: "sets", exercise: "Bench press", sets: 3, reps: 6, kg: "last" },
				{ type: "sets", exercise: "Shyby", sets: 3, reps: 8, added_kg: "last" },
				{ type: "complex", items: [{ exercise: "Kettlebell clean", reps: 2 }], rounds: 5, kg: "last" },
			],
		};
		const fm = templateToFrontmatter(template);
		expect((fm.blocks as Record<string, unknown>[])[0]!.exercise).toBe("[[Bench press]]");
		expect(parseTemplate(fm)).toEqual(template);
	});
});
