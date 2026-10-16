import { describe, expect, it } from "vitest";
import { exerciseHistory } from "../../src/calc/exerciseHistory";
import type { ExerciseNote, WorkoutNote } from "../../src/model/types";

const exercise = (name: string, partial: Partial<ExerciseNote> = {}): ExerciseNote => ({
	forma: "exercise",
	schema: 1,
	name,
	category: "strength",
	kind: "grind",
	measure: "reps_kg",
	muscles: { primary: ["chest"], secondary: [] },
	aliases: [],
	...partial,
});
const LIBRARY = [exercise("Bench press", { aliases: ["Benchpress"] }), exercise("Plank", { category: "calisthenics", kind: "hold", measure: "seconds" }), exercise("Kettlebell swing", { category: "kettlebell", kind: "ballistic" })];
const ctx = {
	info: (name: string) => LIBRARY.find((e) => [e.name, ...e.aliases].some((k) => k.toLowerCase() === name.trim().toLowerCase())),
	bodyweightKg: 80,
};

function workout(date: string, blocks: WorkoutNote["blocks"]): WorkoutNote {
	return { forma: "workout", schema: 1, date, sport: "strength", source: "manual", blocks, pain: [] };
}

const workouts = [
	workout("2026-09-01", [{ type: "sets", exercise: "Bench press", sets: [{ reps: 10, kg: 40, warmup: true }, { reps: 5, kg: 80 }, { reps: 5, kg: 80 }] }]),
	// Zapsáno pod aliasem – patří ke stejnému cviku.
	workout("2026-09-08", [{ type: "sets", exercise: "benchpress", sets: [{ reps: 5, kg: 85 }, { reps: 4, kg: 85 }] }]),
	workout("2026-09-15", [
		{ type: "sets", exercise: "Bench press", sets: [{ reps: 6, kg: 80 }] },
		{ type: "hold", exercise: "Plank", sets: [{ sec: 60 }, { sec: 75 }] },
	]),
	workout("2026-09-20", [{ type: "emom", exercise: "Kettlebell swing", minutes: 10, reps_per_min: 15, kg: 24 }]),
];

describe("historie cviku", () => {
	it("tréninky od nejnovějšího, i ty zapsané pod aliasem; rozcvičení se do sérií nepočítá", () => {
		const history = exerciseHistory(workouts, "Bench press", "reps_kg", ctx);
		expect(history.sessions.map((s) => [s.date, s.sets])).toEqual([
			["2026-09-15", 1],
			["2026-09-08", 2],
			["2026-09-01", 2],
		]);
		expect(history.sessions[2]!.text).toBe("2×5 × 80 kg");
		expect(history.sessions[1]!.text).toBe("5, 4 × 85 kg");
	});

	it("graf: nejvyšší odhad 1RM každého tréninku a nejlepší výkon", () => {
		const history = exerciseHistory(workouts, "Bench press", "reps_kg", ctx);
		expect(history.metric).toBe("oneRm");
		expect(history.points.map((p) => p.date)).toEqual(["2026-09-01", "2026-09-08", "2026-09-15"]);
		// Epley: 80 × (1 + 5/30) = 93,33; 85 × (1 + 5/30) = 99,17; 80 × (1 + 6/30) = 96.
		expect(history.points.map((p) => Math.round(p.value * 100) / 100)).toEqual([93.33, 99.17, 96]);
		expect(history.best?.date).toBe("2026-09-08");
	});

	it("výdrž se sleduje v sekundách", () => {
		const history = exerciseHistory(workouts, "Plank", "seconds", ctx);
		expect(history.metric).toBe("sec");
		expect(history.points).toEqual([{ date: "2026-09-15", value: 75 }]);
		expect(history.best).toEqual({ date: "2026-09-15", value: 75 });
		expect(history.sessions).toHaveLength(1);
	});

	it("blok bez sérií (EMOM) je v historii, ale bez grafu; cvik bez tréninku je prázdný", () => {
		const swing = exerciseHistory(workouts, "Kettlebell swing", "reps_kg", ctx);
		expect(swing.sessions).toEqual([{ date: "2026-09-20", text: "EMOM", sets: 0 }]);
		expect(swing.metric).toBeNull();
		expect(swing.points).toEqual([]);
		expect(exerciseHistory(workouts, "Dřep", "reps_kg", ctx)).toEqual({ sessions: [], metric: null, points: [], best: null });
	});
});
