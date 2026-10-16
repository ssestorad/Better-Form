import { describe, expect, it } from "vitest";
import { lastPerformance } from "../../src/calc/performance";
import type { Block, TemplateNote, WorkoutNote } from "../../src/model/types";
import {
	blockErrorKey,
	draftBlockToBlock,
	draftToTemplate,
	draftToWorkout,
	emptyBlock,
	emptyDraft,
	newBlockForExercise,
	prefillSetsBlock,
	revertToLast,
	setErrorKey,
	templateToDraft,
	validateDraft,
	workoutToDraft,
	type ExerciseInfo,
	type PrefillContext,
} from "../../src/ui/workout/draft";

const LIBRARY: Record<string, ExerciseInfo> = {
	"bench press": { category: "strength", kind: "grind", measure: "reps_kg", muscles: { primary: ["chest"] } },
	shyby: { category: "calisthenics", kind: "grind", measure: "reps_bw", muscles: { primary: ["lats"] } },
	plank: { category: "calisthenics", kind: "hold", measure: "seconds", muscles: { primary: ["abs"] } },
	"kettlebell swing": { category: "kettlebell", kind: "ballistic", measure: "reps_kg", muscles: { primary: ["glutes"] } },
};

function workout(date: string, blocks: Block[]): WorkoutNote {
	return { forma: "workout", schema: 1, date, sport: "strength", source: "manual", blocks, pain: [] };
}

const HISTORY = [
	workout("2026-09-28", [
		{
			type: "sets",
			exercise: "Bench press",
			sets: [
				{ reps: 10, kg: 40, warmup: true, rir: 5 },
				{ reps: 6, kg: 80, rir: 2 },
				{ reps: 6, kg: 80, rir: 2 },
				{ reps: 6, kg: 80, rir: 3 },
			],
		},
		{ type: "sets", exercise: "Shyby", sets: [{ reps: 8, added_kg: 5, rir: 1 }, { reps: 8, added_kg: 5, rir: 1 }] },
		{ type: "hold", exercise: "Plank", sets: [{ sec: 60 }, { sec: 45 }] },
		{ type: "emom", exercise: "Kettlebell swing", minutes: 10, reps_per_min: 15, kg: 24 },
	]),
];

const ctx: PrefillContext = {
	info: (e) => LIBRARY[e.toLowerCase()],
	last: (e) => lastPerformance(HISTORY, (x) => x.toLowerCase() === e.toLowerCase(), "2026-10-01"),
	options: { rirMin: 2, incrementUpperKg: 2.5, incrementLowerKg: 5, kettlebellsKg: [16, 24, 32] },
};

describe("předvyplnění z minula (1a: rovnou návrhem)", () => {
	it("bench press: rozcvičení z minula + 3 pracovní série s návrhem +2,5 kg", () => {
		const block = prefillSetsBlock(emptyBlock("sets", "Bench press"), ctx);
		expect(block.sets).toEqual([
			{ reps: 10, kg: 40, warmup: true },
			{ reps: 6, kg: 82.5 },
			{ reps: 6, kg: 82.5 },
			{ reps: 6, kg: 82.5 },
		]);
		expect(block.suggestion).toContain("2,5 kg");
		expect(block.lastSets).toHaveLength(4);
	});

	it("vrátit na minule: série jako minule, bez RIR", () => {
		const block = revertToLast(prefillSetsBlock(emptyBlock("sets", "Bench press"), ctx));
		expect(block.sets).toEqual([
			{ reps: 10, kg: 40, warmup: true },
			{ reps: 6, kg: 80 },
			{ reps: 6, kg: 80 },
			{ reps: 6, kg: 80 },
		]);
		expect(block.suggestion).toBeUndefined();
	});

	it("shyby s RIR 1: stejný přívažek a opakování", () => {
		const block = prefillSetsBlock(emptyBlock("sets", "Shyby"), ctx);
		expect(block.sets).toEqual([
			{ reps: 8, added_kg: 5 },
			{ reps: 8, added_kg: 5 },
		]);
	});

	it("výdrž: sekundy z nejlepší pracovní série minula", () => {
		expect(newBlockForExercise("Plank", ctx)).toMatchObject({ type: "hold", sets: [{ sec: 60 }, { sec: 60 }] });
	});

	it("cvik bez historie: jedna prázdná série", () => {
		expect(newBlockForExercise("Dřepy", ctx)).toMatchObject({ type: "sets", sets: [{}] });
	});

	it("cíl ze šablony: počet sérií a opakování má přednost, váha z návrhu", () => {
		const block = prefillSetsBlock(emptyBlock("sets", "Bench press"), ctx, { sets: 4, reps: 6, kg: "last" });
		expect(block.sets.filter((s) => !s.warmup)).toEqual([
			{ reps: 6, kg: 82.5 },
			{ reps: 6, kg: 82.5 },
			{ reps: 6, kg: 82.5 },
			{ reps: 6, kg: 82.5 },
		]);
		const fixed = prefillSetsBlock(emptyBlock("sets", "Bench press"), ctx, { sets: 2, reps: 5, kg: 70 });
		expect(fixed.sets.filter((s) => !s.warmup)).toEqual([
			{ reps: 5, kg: 70 },
			{ reps: 5, kg: 70 },
		]);
	});
});

describe("trénink ze šablony", () => {
	const template: TemplateNote = {
		forma: "template",
		schema: 1,
		name: "Push day",
		sport: "strength",
		blocks: [
			{ type: "sets", exercise: "Bench press", sets: 3, reps: 6, kg: "last" },
			{ type: "emom", exercise: "Kettlebell swing", minutes: 10, reps_per_min: 15, kg: "last" },
			{ type: "ladder", exercise: "Shyby", steps: [1, 2, 3] },
		],
	};

	it("předvyplní bloky včetně váhy z minula", () => {
		const draft = templateToDraft(template, "Push day", "2026-10-01", ctx, "17:30");
		expect(draft).toMatchObject({ date: "2026-10-01", start: "17:30", sport: "strength", title: "Push day", template: "Push day" });
		expect(draft.blocks.map((b) => b.type)).toEqual(["sets", "emom", "ladder"]);
		expect(draft.blocks[0]!.sets.filter((s) => !s.warmup)).toHaveLength(3);
		expect(draft.blocks[1]).toMatchObject({ minutes: 10, reps_per_min: 15, kg: 24 });
		expect(draft.blocks[2]).toMatchObject({ exercise: "Shyby", steps: [1, 2, 3] });
	});
});

describe("formulář → poznámka", () => {
	it("vynechá prázdné série a neúplné bloky", () => {
		const draft = emptyDraft("2026-10-01", "strength", "17:30");
		draft.title = "  Push  ";
		draft.duration_min = 60;
		draft.rpe = 7;
		draft.blocks = [
			{ ...emptyBlock("sets", "Bench press"), sets: [{ reps: 6, kg: 80, rir: 2 }, {}, { warmup: true }] },
			emptyBlock("sets"),
			{ ...emptyBlock("emom", "Kettlebell swing"), minutes: 10 },
		];
		const note = draftToWorkout(draft, 1);
		expect(note).toEqual({
			forma: "workout",
			schema: 1,
			date: "2026-10-01",
			start: "17:30",
			sport: "strength",
			title: "Push",
			duration_min: 60,
			rpe: 7,
			source: "manual",
			blocks: [{ type: "sets", exercise: "Bench press", sets: [{ reps: 6, kg: 80, rir: 2 }] }],
			pain: [],
		});
	});

	it("běh: údaje o běhu jen u sportu běh", () => {
		const draft = emptyDraft("2026-10-01", "run");
		draft.run = { distance_km: 10.2, moving_time_s: 3310, type: "easy" };
		expect(draftToWorkout(draft, 1).run).toEqual({ distance_km: 10.2, moving_time_s: 3310, type: "easy" });
		// délka z času běhu: 3310 s = 55,2 min → 55
		expect(draftToWorkout(draft, 1).duration_min).toBe(55);
		draft.duration_min = 65;
		expect(draftToWorkout(draft, 1).duration_min).toBe(65);
		draft.sport = "strength";
		expect(draftToWorkout(draft, 1).run).toBeUndefined();
	});

	it("poznámka → formulář → poznámka beze změny", () => {
		const note = workout("2026-09-28", [
			...HISTORY[0]!.blocks,
			{ type: "amrap", minutes: 12, items: [{ exercise: "Kliky", reps: 10 }], rounds: 5, extra_reps: 3, rpe: 8 },
			{ type: "ladder", exercise: "Shyby", steps: [1, 2, 3] },
			{ type: "complex", items: [{ exercise: "Kettlebell clean", reps: 2 }], rounds: 5, kg: 16 },
			{ type: "timed", exercise: "Kettlebell swing", sec: 300, reps: 100, kg: 24 },
		]);
		note.rpe = 7;
		note.duration_min = 62;
		expect(draftToWorkout(workoutToDraft(note), 1)).toEqual(note);
	});
});

describe("validace", () => {
	it("chyby u sérií, RPE a neúplných bloků", () => {
		const draft = emptyDraft("2026-10-01", "strength");
		draft.rpe = 11;
		const sets = { ...emptyBlock("sets", "Bench press"), sets: [{ reps: 5.5, kg: Number.NaN, rir: 12 }] };
		const emom = { ...emptyBlock("emom", "Kettlebell swing"), minutes: 10 };
		const noExercise = emptyBlock("timed");
		draft.blocks = [sets, emom, noExercise];
		const errors = validateDraft(draft);
		expect(errors.rpe).toBe("0–10");
		expect(errors[setErrorKey(sets.id, 0, "reps")]).toBe("Celé číslo.");
		expect(errors[setErrorKey(sets.id, 0, "kg")]).toBe("Není číslo.");
		expect(errors[setErrorKey(sets.id, 0, "rir")]).toBe("0–10");
		expect(errors[blockErrorKey(emom.id, "missing")]).toBe("Doplň minuty a opakování za minutu.");
		expect(errors[blockErrorKey(noExercise.id, "missing")]).toBe("Vyber cvik.");
	});

	it("platný formulář", () => {
		const draft = emptyDraft("2026-10-01", "strength");
		draft.blocks = [{ ...emptyBlock("sets", "Bench press"), sets: [{ reps: 6, kg: 80, added_kg: -10 }] }];
		expect(validateDraft(draft)).toEqual({});
	});
});

describe("formulář → šablona (3: váha z minula)", () => {
	it("počty sérií a opakování, váha jako „last“, bez rozcvičení", () => {
		const draft = workoutToDraft(HISTORY[0]!);
		const template = draftToTemplate(draft, "Push day", 1);
		expect(template).toEqual({
			forma: "template",
			schema: 1,
			name: "Push day",
			sport: "strength",
			blocks: [
				{ type: "sets", exercise: "Bench press", sets: 3, reps: 6, kg: "last" },
				{ type: "sets", exercise: "Shyby", sets: 2, reps: 8, added_kg: "last" },
				{ type: "hold", exercise: "Plank", sets: 2, sec: 60 },
				{ type: "emom", exercise: "Kettlebell swing", minutes: 10, reps_per_min: 15, kg: "last" },
			],
		});
	});

	it("blok bez váhy nemá kg", () => {
		const draft = emptyDraft("2026-10-01", "calisthenics");
		draft.blocks = [{ ...emptyBlock("sets", "Kliky"), sets: [{ reps: 20 }, { reps: 18 }] }];
		expect(draftToTemplate(draft, "Kliky", 1).blocks).toEqual([{ type: "sets", exercise: "Kliky", sets: 2, reps: 20 }]);
		expect(draftBlockToBlock(draft.blocks[0]!)).toEqual({ type: "sets", exercise: "Kliky", sets: [{ reps: 20 }, { reps: 18 }] });
	});
});
