import { describe, expect, it } from "vitest";
import { suggestProgression, type ProgressionExercise } from "../../src/calc/progression";

const options = { rirMin: 2, incrementUpperKg: 2.5, incrementLowerKg: 5, kettlebellsKg: [16, 24, 32] };

const bench: ProgressionExercise = { category: "strength", measure: "reps_kg", muscles: { primary: ["chest"] } };
const squat: ProgressionExercise = { category: "strength", measure: "reps_kg", muscles: { primary: ["quads", "glutes"] } };
const pullUp: ProgressionExercise = { category: "calisthenics", measure: "reps_bw", muscles: { primary: ["lats"] } };
const swing: ProgressionExercise = { category: "kettlebell", measure: "reps_kg", muscles: { primary: ["glutes"] } };
const plank: ProgressionExercise = { category: "calisthenics", measure: "seconds", muscles: { primary: ["abs"] } };

describe("návrh navýšení (SPEC 9.3)", () => {
	it("horní polovina: vše splněno s RIR ≥ 2 → +2,5 kg", () => {
		const sets = [
			{ reps: 6, kg: 80, rir: 2 },
			{ reps: 6, kg: 80, rir: 2 },
			{ reps: 6, kg: 80, rir: 3 },
		];
		expect(suggestProgression(sets, bench, options)).toMatchObject({ action: "increase_weight", kg: 82.5, reps: 6 });
	});

	it("dolní polovina: +5 kg", () => {
		const sets = [
			{ reps: 5, kg: 100, rir: 2 },
			{ reps: 5, kg: 100, rir: 2 },
		];
		expect(suggestProgression(sets, squat, options)).toMatchObject({ action: "increase_weight", kg: 105 });
	});

	it("rozcvičovací série s nižší váhou se ignorují", () => {
		const sets = [
			{ reps: 10, kg: 40, rir: 6 },
			{ reps: 6, kg: 80, rir: 2 },
			{ reps: 6, kg: 80, rir: 2 },
		];
		expect(suggestProgression(sets, bench, options)).toMatchObject({ action: "increase_weight", kg: 82.5 });
	});

	it("označené rozcvičovací série se ignorují, i když mají stejnou váhu", () => {
		const sets = [
			{ reps: 3, kg: 80, warmup: true }, // rozcvičení pracovní vahou, RIR nevyplněn
			{ reps: 6, kg: 80, rir: 2 },
			{ reps: 6, kg: 80, rir: 2 },
		];
		expect(suggestProgression(sets, bench, options)).toMatchObject({ action: "increase_weight", kg: 82.5, reps: 6 });
		expect(suggestProgression([{ reps: 10, kg: 40, warmup: true }], bench, options).action).toBe("none");
	});

	it("RIR 0 nebo 1 → stejná váha", () => {
		const failure = [
			{ reps: 6, kg: 80, rir: 2 },
			{ reps: 6, kg: 80, rir: 0 },
		];
		expect(suggestProgression(failure, bench, options)).toMatchObject({ action: "same", kg: 80, reps: 6 });
		const rir1 = [{ reps: 6, kg: 80, rir: 1 }];
		expect(suggestProgression(rir1, bench, options)).toMatchObject({ action: "same", kg: 80 });
	});

	it("nesplněný cíl ze šablony → stejná váha", () => {
		const sets = [
			{ reps: 8, kg: 60, rir: 2 },
			{ reps: 8, kg: 60, rir: 2 },
			{ reps: 6, kg: 60, rir: 2 },
		];
		expect(suggestProgression(sets, bench, options, 8)).toMatchObject({ action: "same", kg: 60, reps: 8 });
	});

	it("bez cíle: pokles opakování v dalších sériích = nesplněno", () => {
		const sets = [
			{ reps: 8, kg: 60, rir: 3 },
			{ reps: 7, kg: 60, rir: 2 },
		];
		expect(suggestProgression(sets, bench, options)).toMatchObject({ action: "same", reps: 8 });
	});

	it("chybějící RIR → stejná váha", () => {
		const sets = [
			{ reps: 6, kg: 80, rir: 3 },
			{ reps: 6, kg: 80 },
		];
		const result = suggestProgression(sets, bench, options);
		expect(result.action).toBe("same");
		expect(result.reason).toContain("Chybí RIR");
	});

	it("vlastní váha: +1 opakování při RIR = 2, +2 při RIR ≥ 3", () => {
		const rir2 = [
			{ reps: 8, rir: 2 },
			{ reps: 8, rir: 3 },
		];
		expect(suggestProgression(rir2, pullUp, options)).toEqual(
			expect.objectContaining({ action: "increase_reps", reps: 9 }),
		);
		const rir3 = [
			{ reps: 8, rir: 3 },
			{ reps: 8, rir: 4 },
		];
		expect(suggestProgression(rir3, pullUp, options)).toMatchObject({ action: "increase_reps", reps: 10 });
	});

	it("vlastní váha s přívažkem: přívažek zůstává, přidávají se opakování", () => {
		const sets = [{ reps: 6, added_kg: 10, rir: 2 }];
		expect(suggestProgression(sets, pullUp, options)).toMatchObject({
			action: "increase_reps",
			reps: 7,
			added_kg: 10,
		});
	});

	it("kettlebell: další těžší vlastní zvon, u nejtěžšího opakování", () => {
		const at24 = [{ reps: 15, kg: 24, rir: 3 }];
		expect(suggestProgression(at24, swing, options)).toMatchObject({ action: "increase_weight", kg: 32, reps: 15 });
		const at32 = [{ reps: 15, kg: 32, rir: 3 }];
		expect(suggestProgression(at32, swing, options)).toMatchObject({ action: "increase_reps", reps: 17, kg: 32 });
	});

	it("bez dat nebo u výdrží se nenavrhuje", () => {
		expect(suggestProgression([], bench, options).action).toBe("none");
		expect(suggestProgression([{ sec: 60 }], plank, options).action).toBe("none");
	});
});
