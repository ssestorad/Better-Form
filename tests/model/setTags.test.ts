// Označení série (drop, do selhání) a supersety: čtení, zápis, výpočty a texty.
import { describe, expect, it } from "vitest";
import { volumeHistory, type VolumeContext } from "../../src/calc/muscleVolume";
import { formatSets } from "../../src/calc/performance";
import { setsCsv } from "../../src/data/csv";
import { blockLine } from "../../src/data/workoutBlock";
import { parseTemplate, parseWorkout } from "../../src/model/parse";
import { templateToFrontmatter, workoutToFrontmatter } from "../../src/model/serialize";
import type { WorkoutNote } from "../../src/model/types";
import { draftToTemplate, draftToWorkout, templateToDraft, workoutToDraft } from "../../src/ui/workout/draft";

const RAW = {
	forma: "workout",
	schema: 1,
	date: "2026-10-06",
	sport: "strength",
	source: "manual",
	blocks: [
		{ type: "sets", exercise: "[[Bench press]]", sets: [{ reps: 10, kg: 40, warmup: true, tag: "drop" }, { reps: 6, kg: 80, rir: 2 }, { reps: 5, kg: 80, tag: "failure" }, { reps: 8, kg: 60, tag: "drop" }, { reps: 8, kg: 60, tag: "nesmysl" }] },
		{ type: "sets", exercise: "[[Přítahy v předklonu]]", superset: true, sets: [{ reps: 8, kg: 60 }] },
		{ type: "emom", exercise: "[[Kettlebell swing]]", minutes: 10, reps_per_min: 15, superset: true },
	],
	pain: [],
};

describe("označení série a supersety", () => {
	const note = parseWorkout(RAW)!;

	it("čtení: platné označení jen u pracovních sérií, superset jen u sérií a výdrží", () => {
		const bench = note.blocks[0]!;
		const row = note.blocks[1]!;
		const emom = note.blocks[2]!;
		expect(bench).toMatchObject({ type: "sets", exercise: "Bench press" });
		expect(bench.type === "sets" && bench.sets.map((s) => [s.warmup ?? false, s.tag])).toEqual([
			[true, undefined],
			[false, undefined],
			[false, "failure"],
			[false, "drop"],
			[false, undefined],
		]);
		expect(bench.type === "sets" && bench.superset).toBeFalsy();
		expect(row).toMatchObject({ type: "sets", superset: true });
		expect(emom).not.toHaveProperty("superset");
	});

	it("zápis a zpětné čtení dá totéž", () => {
		const fm = workoutToFrontmatter(note);
		expect(parseWorkout(fm)).toEqual(note);
		const blocks = fm.blocks as Record<string, unknown>[];
		expect(blocks[1]).toMatchObject({ superset: true });
		expect(blocks[0]).not.toHaveProperty("superset");
		expect((blocks[0]!.sets as Record<string, unknown>[])[2]).toEqual({ reps: 5, kg: 80, tag: "failure" });
	});

	it("texty: počet označených sérií za výpisem a superset v řádku bloku", () => {
		const bench = note.blocks[0]!;
		expect(bench.type === "sets" && formatSets(bench.sets, "reps_kg")).toBe("rozcv. 10 × 40 kg · 6×80, 5×80, 8×60, 8×60 kg (RIR 2, –, –, –) · 1× drop série, 1× do selhání");
		expect(blockLine(note.blocks[1]!, () => "reps_kg")).toBe("↳ superset – **Přítahy v předklonu:** 8 × 60 kg");
		expect(blockLine(note.blocks[0]!, () => "reps_kg")).toMatch(/^\*\*Bench press:\*\*/);
	});

	it("série do selhání bez RIR je efektivní (RIR 0) a dokládá maximum; stejná série bez označení se počítá jen odhadem", () => {
		const ctx: VolumeContext = {
			info: () => ({ name: "Kliky", category: "calisthenics", kind: "grind", measure: "reps_bw", muscles: { primary: ["chest"], secondary: [] } }),
			options: { rirMax: 4, minPct1rm: 60, holdPctOfMax: 70, blockMinRpe: 7 },
		};
		const workout = (tag?: "failure"): WorkoutNote => ({ forma: "workout", schema: 1, date: "2026-10-06", sport: "calisthenics", source: "manual", blocks: [{ type: "sets", exercise: "Kliky", sets: [{ reps: 20, ...(tag ? { tag } : {}) }] }], pain: [] });
		expect(volumeHistory([workout("failure")], ctx)[0]).toMatchObject({ muscles: { chest: 1 }, assumed: 0 });
		expect(volumeHistory([workout()], ctx)[0]).toMatchObject({ muscles: { chest: 1 }, assumed: 1 });
	});

	it("formulář: označení a superset přežijí úpravu; první blok superset být nemůže", () => {
		const draft = workoutToDraft(note);
		expect(draft.blocks[1]!.superset).toBe(true);
		expect(draftToWorkout(draft, 1).blocks).toEqual(note.blocks);
		// Po přesunutí supersetu na první místo se příznak zahodí.
		const moved = { ...draft, blocks: [draft.blocks[1]!, draft.blocks[0]!] };
		const first = draftToWorkout(moved, 1).blocks[0]!;
		expect(first).toMatchObject({ exercise: "Přítahy v předklonu" });
		expect(first).not.toHaveProperty("superset");
	});

	it("šablona si superset pamatuje", () => {
		const template = draftToTemplate(workoutToDraft(note), "Push a pull", 1);
		expect(template.blocks.map((b) => [b.exercise, b.superset])).toEqual([
			["Bench press", undefined],
			["Přítahy v předklonu", true],
			["Kettlebell swing", undefined],
		]);
		const parsed = parseTemplate(templateToFrontmatter(template))!;
		expect(parsed.blocks[1]!.superset).toBe(true);
		const fresh = templateToDraft(parsed, "Push a pull", "2026-10-13", { info: () => undefined, last: () => undefined, options: { kettlebellsKg: [] } } as never);
		expect(fresh.blocks[1]!.superset).toBe(true);
		expect(fresh.blocks[0]!.superset).toBeUndefined();
	});

	it("export do CSV: označení a superset v poznámce řádku", () => {
		const rows = setsCsv([note]).split("\r\n").slice(1, 7);
		expect(rows[2]).toMatch(/;do selhání$/);
		expect(rows[3]).toMatch(/;drop série$/);
		expect(rows[5]).toMatch(/Přítahy v předklonu;1;8;60;;;;;superset s předchozím cvikem$/);
		expect(rows[0]).toMatch(/;ano;$/);
	});
});
