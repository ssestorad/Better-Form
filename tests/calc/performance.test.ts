import { describe, expect, it } from "vitest";
import {
	formatClockDuration,
	formatPace,
	formatSets,
	lastPerformance,
	paceSecondsPerKm,
	parseClockDuration,
	parseLadderSteps,
	performanceSets,
} from "../../src/calc/performance";
import type { Block, WorkoutNote } from "../../src/model/types";

function workout(date: string, blocks: Block[], start?: string): WorkoutNote {
	return { forma: "workout", schema: 1, date, start, sport: "strength", source: "manual", blocks, pain: [] };
}

describe("poslední výkon cviku", () => {
	const bench = (kg: number): Block => ({ type: "sets", exercise: "Bench press", sets: [{ reps: 6, kg }] });
	const workouts = [
		workout("2026-09-20", [bench(75)]),
		workout("2026-09-24", [bench(77.5), { type: "sets", exercise: "Tlak na lavici", sets: [{ reps: 8, kg: 60 }] }]),
		workout("2026-09-27", [{ type: "sets", exercise: "Dřepy", sets: [{ reps: 10 }] }]),
		workout("2026-09-28", [bench(80)], "07:00"),
		workout("2026-09-28", [{ type: "hold", exercise: "Plank", sets: [{ sec: 60 }] }], "18:00"),
		workout("2026-10-01", [bench(82.5)]),
	];
	const isBench = (name: string) => ["bench press", "tlak na lavici"].includes(name.toLowerCase());

	it("nejnovější trénink s cvikem do daného dne včetně", () => {
		const last = lastPerformance(workouts, isBench, "2026-09-30");
		expect(last?.date).toBe("2026-09-28");
		expect(performanceSets(last)).toEqual([{ reps: 6, kg: 80 }]);
	});

	it("všechny bloky cviku z tréninku, i pod aliasem", () => {
		const last = lastPerformance(workouts, isBench, "2026-09-25");
		expect(last?.date).toBe("2026-09-24");
		expect(performanceSets(last)).toEqual([
			{ reps: 6, kg: 77.5 },
			{ reps: 8, kg: 60 },
		]);
	});

	it("cvik v AMRAP / komplexu se také najde; nic = undefined", () => {
		const amrap = workout("2026-09-29", [
			{ type: "amrap", minutes: 10, rounds: 5, items: [{ exercise: "Bench press", reps: 5 }] },
		]);
		expect(lastPerformance([...workouts, amrap], isBench, "2026-09-30")?.date).toBe("2026-09-29");
		expect(lastPerformance(workouts, isBench, "2026-09-19")).toBeUndefined();
	});
});

describe("zkrácený zápis sérií", () => {
	it("stejné série", () => {
		expect(formatSets([{ reps: 6, kg: 80 }, { reps: 6, kg: 80 }, { reps: 6, kg: 80 }], "reps_kg")).toBe("3×6 × 80 kg");
	});

	it("různá opakování se stejnou váhou, RIR", () => {
		expect(
			formatSets(
				[
					{ reps: 6, kg: 80, rir: 2 },
					{ reps: 6, kg: 80, rir: 2 },
					{ reps: 5, kg: 80, rir: 1 },
				],
				"reps_kg",
			),
		).toBe("6, 6, 5 × 80 kg (RIR 2, 2, 1)");
	});

	it("různé váhy a rozcvičení", () => {
		expect(
			formatSets(
				[
					{ reps: 10, kg: 40, warmup: true },
					{ reps: 5, kg: 60, warmup: true },
					{ reps: 6, kg: 80, rir: 2 },
					{ reps: 5, kg: 82.5 },
				],
				"reps_kg",
			),
		).toBe("rozcv. 10×40, 5×60 kg · 6×80, 5×82,5 kg (RIR 2, –)");
	});

	it("vlastní váha s přívažkem a s gumou", () => {
		expect(formatSets([{ reps: 10 }, { reps: 10 }, { reps: 8 }], "reps_bw")).toBe("10, 10, 8");
		expect(formatSets([{ reps: 6, added_kg: 10 }, { reps: 6, added_kg: 10 }], "reps_bw")).toBe("2×6 +10 kg");
		expect(formatSets([{ reps: 5, added_kg: -20 }], "reps_bw")).toBe("5 −20 kg");
	});

	it("výdrže", () => {
		expect(formatSets([{ sec: 15 }, { sec: 12 }], "seconds")).toBe("15, 12 s");
		expect(formatSets([{ sec: 30 }, { sec: 30 }, { sec: 30 }], "seconds")).toBe("3×30 s");
	});
});

describe("časy a tempo", () => {
	it("čas h:mm:ss, mm:ss nebo minuty", () => {
		expect(parseClockDuration("55:10")).toBe(3310);
		expect(parseClockDuration("1:05:30")).toBe(3930);
		expect(parseClockDuration("45")).toBe(2700);
		expect(parseClockDuration("1,5")).toBe(90);
		expect(parseClockDuration("5:75")).toBeNull();
		expect(parseClockDuration("abc")).toBeNull();
		expect(parseClockDuration("")).toBeNull();
	});

	it("formát času", () => {
		expect(formatClockDuration(3310)).toBe("55:10");
		expect(formatClockDuration(3930)).toBe("1:05:30");
		expect(formatClockDuration(59)).toBe("0:59");
	});

	it("tempo: 10,2 km za 55:10 → 5:25 /km", () => {
		// 3310 s / 10,2 km = 324,5 s/km → zaokrouhleno 325 s = 5:25
		const pace = paceSecondsPerKm(10.2, 3310)!;
		expect(pace).toBeCloseTo(324.51, 2);
		expect(formatPace(pace)).toBe("5:25 /km");
		expect(paceSecondsPerKm(0, 3310)).toBeNull();
	});

	it("příčky žebříku", () => {
		expect(parseLadderSteps("1-5")).toEqual([1, 2, 3, 4, 5]);
		expect(parseLadderSteps("5–3")).toEqual([5, 4, 3]);
		expect(parseLadderSteps("2, 4, 6")).toEqual([2, 4, 6]);
		expect(parseLadderSteps("1-500")).toEqual([]);
		expect(parseLadderSteps("x")).toEqual([]);
	});
});
