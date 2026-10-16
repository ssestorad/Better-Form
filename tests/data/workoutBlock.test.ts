import { describe, expect, it } from "vitest";
import { blockLine, loadLine, renderWorkoutBlock, runLine, swimLine } from "../../src/data/workoutBlock";
import type { ExerciseMeasure } from "../../src/model/constants";
import type { WorkoutNote } from "../../src/model/types";

const measures: Record<string, ExerciseMeasure> = { "Bench press": "reps_kg", Shyby: "reps_bw", "L-sit": "seconds" };
const measureOf = (e: string) => measures[e];

function note(overrides: Partial<WorkoutNote> = {}): WorkoutNote {
	return { forma: "workout", schema: 1, date: "2026-09-28", sport: "strength", source: "manual", blocks: [], pain: [], ...overrides };
}

describe("souhrn tréninku", () => {
	it("bloky všech typů", () => {
		expect(
			blockLine(
				{
					type: "sets",
					exercise: "Bench press",
					sets: [
						{ reps: 10, kg: 40, warmup: true },
						{ reps: 6, kg: 80, rir: 2 },
						{ reps: 6, kg: 80, rir: 1 },
					],
				},
				measureOf,
			),
		).toBe("**Bench press:** rozcv. 10 × 40 kg · 2×6 × 80 kg (RIR 2, 1)");
		expect(blockLine({ type: "hold", exercise: "L-sit", sets: [{ sec: 15 }, { sec: 12 }] }, measureOf)).toBe(
			"**L-sit:** 15, 12 s",
		);
		expect(
			blockLine({ type: "emom", exercise: "Kettlebell swing", minutes: 10, reps_per_min: 15, kg: 24 }, measureOf),
		).toBe("**Kettlebell swing:** EMOM 10 min × 15 opak., 24 kg");
		expect(
			blockLine(
				{ type: "amrap", minutes: 12, items: [{ exercise: "Kliky", reps: 10 }, { exercise: "Dřepy", reps: 15 }], rounds: 5, extra_reps: 7, rpe: 8 },
				measureOf,
			),
		).toBe("**AMRAP 12 min:** 10× Kliky, 15× Dřepy – 5 kol + 7 opak. · RPE 8");
		// 1 + 2 + 3 + 4 + 5 = 15
		expect(blockLine({ type: "ladder", exercise: "Shyby", steps: [1, 2, 3, 4, 5] }, measureOf)).toBe(
			"**Shyby:** žebřík 1-2-3-4-5 (celkem 15)",
		);
		expect(
			blockLine({ type: "complex", items: [{ exercise: "Clean", reps: 2 }, { exercise: "Press", reps: 1 }], rounds: 5, kg: 16 }, measureOf),
		).toBe("**Komplex:** 2× Clean + 1× Press – 5 kol, 16 kg");
		expect(blockLine({ type: "timed", exercise: "Kettlebell swing", sec: 300, reps: 100, kg: 24 }, measureOf)).toBe(
			"**Kettlebell swing:** 100 opak. za 5 min, 24 kg",
		);
	});

	it("běh s tempem a plavání", () => {
		expect(
			runLine(note({ sport: "run", run: { distance_km: 10.2, moving_time_s: 3310, avg_hr: 152, max_hr: 178, type: "easy" } })),
		).toBe("**Běh:** 10,2 km za 55:10 (5:25 /km) · lehký · tep 152/178");
		expect(swimLine(note({ sport: "swim", swim: { distance_m: 2400, style: "freestyle", pool_m: 25 } }))).toBe(
			"**Plavání:** 2400 m (kraul, bazén 25 m)",
		);
		expect(runLine(note())).toBeNull();
	});

	it("zátěž nebo výzva k doplnění RPE", () => {
		// 7 × 62 = 434
		expect(loadLine(note({ rpe: 7, duration_min: 62 }))).toBe("**Zátěž:** RPE 7 × 62 min = 434");
		expect(loadLine(note({ duration_min: 62 }))).toContain("doplň RPE");
		expect(loadLine(note({ rpe: 7 }))).toContain("doplň délku");
	});

	it("celý blok s tvrdými zalomeními", () => {
		const text = renderWorkoutBlock(
			note({ rpe: 7, duration_min: 30, blocks: [{ type: "sets", exercise: "Shyby", sets: [{ reps: 6, added_kg: 10 }] }] }),
			measureOf,
		);
		expect(text).toBe("**Shyby:** 6 +10 kg  \n**Zátěž:** RPE 7 × 30 min = 210");
	});
});
