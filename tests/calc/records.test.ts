import { describe, expect, it } from "vitest";
import { allRecords, exerciseRecords, newRecords, swimRecords, type RecordContext } from "../../src/calc/records";
import { intensityShare, riegelTime } from "../../src/calc/running";
import type { TestNote, WorkoutNote } from "../../src/model/types";

function workout(partial: Partial<WorkoutNote> & { date: string }): WorkoutNote {
	return { forma: "workout", schema: 1, sport: "strength", source: "manual", blocks: [], pain: [], ...partial };
}

const CTX: RecordContext = {
	info: (exercise) => {
		switch (exercise) {
			case "Bench press":
			case "Tlak na lavici":
				return { name: "Bench press", kind: "grind", measure: "reps_kg" };
			case "Shyby":
				return { name: "Shyby", kind: "grind", measure: "reps_bw", bodyweight_fraction: 0.95 };
			case "Plank":
				return { name: "Plank", kind: "hold", measure: "seconds" };
			case "Kettlebell swing":
				return { name: "Kettlebell swing", kind: "ballistic", measure: "reps_kg" };
			default:
				return undefined;
		}
	},
	bodyweightKg: 80,
};

const WORKOUTS = [
	workout({
		date: "2026-09-01",
		blocks: [
			{ type: "sets", exercise: "Bench press", sets: [{ reps: 10, kg: 40, warmup: true }, { reps: 5, kg: 80 }, { reps: 8, kg: 70 }] },
			{ type: "sets", exercise: "Shyby", sets: [{ reps: 6 }, { reps: 12, added_kg: -20 }, { reps: 3, added_kg: 10 }] },
			{ type: "hold", exercise: "Plank", sets: [{ sec: 60 }, { sec: 75 }] },
			{ type: "sets", exercise: "Kettlebell swing", sets: [{ reps: 20, kg: 24 }, { reps: 10, kg: 32 }] },
			{ type: "emom", exercise: "Kettlebell swing", minutes: 10, reps_per_min: 15, kg: 24 },
		],
	}),
	workout({ date: "2026-09-08", blocks: [{ type: "sets", exercise: "Tlak na lavici", sets: [{ reps: 3, kg: 90 }] }] }),
];

describe("rekordy cviků (9.1)", () => {
	const records = exerciseRecords(WORKOUTS, [], CTX);
	const of = (name: string) => records.find((r) => r.name === name)!;

	it("odhad 1RM a nejtěžší série pro počet opakování; aliasy patří k jednomu cviku", () => {
		const bench = of("Bench press");
		expect(bench.sessions).toBe(2);
		// 90 × (1 + 3/30) = 99; 80 × (1 + 5/30) = 93,3; 70 × (1 + 8/30) = 88,7
		expect(bench.oneRm!.value).toBeCloseTo(99, 6);
		expect(bench.oneRm!.date).toBe("2026-09-08");
		expect(bench.repMax[1]).toEqual({ value: 90, date: "2026-09-08" });
		expect(bench.repMax[3]).toEqual({ value: 90, date: "2026-09-08" });
		expect(bench.repMax[5]).toEqual({ value: 80, date: "2026-09-01" });
		expect(bench.repMax[8]).toEqual({ value: 70, date: "2026-09-01" });
		expect(bench.repMax[10]).toBeUndefined();
	});

	it("vlastní váha: opakování bez dopomoci, přívažek jako nejtěžší série", () => {
		const pull = of("Shyby");
		expect(pull.maxReps).toEqual({ value: 6, date: "2026-09-01" });
		expect(pull.repMax[3]).toEqual({ value: 10, date: "2026-09-01" });
		// (80 × 0,95 + 10) × (1 + 3/30) = 94,6
		expect(pull.oneRm!.value).toBeCloseTo(94.6, 6);
	});

	it("výdrž a švihový cvik (bez 1RM)", () => {
		expect(of("Plank").longestHold).toEqual({ value: 75, date: "2026-09-01" });
		const swing = of("Kettlebell swing");
		expect(swing.oneRm).toBeUndefined();
		expect(swing.heaviest).toEqual({ kg: 32, reps: 10, date: "2026-09-01" });
		expect(swing.density).toEqual({ repsPerMin: 15, kg: 24, date: "2026-09-01" });
		expect(swing.repMax).toEqual({});
	});

	it("testy maxim se počítají také", () => {
		const tests: TestNote[] = [
			{ forma: "test", schema: 1, date: "2026-09-10", exercise: "Shyby", test_type: "max_reps", result: 9 },
			{ forma: "test", schema: 1, date: "2026-09-10", exercise: "Plank", test_type: "max_hold", result: 120 },
			{ forma: "test", schema: 1, date: "2026-09-10", exercise: "Bench press", test_type: "1rm", result: 102.5 },
		];
		const withTests = exerciseRecords(WORKOUTS, tests, CTX);
		expect(withTests.find((r) => r.name === "Shyby")!.maxReps!.value).toBe(9);
		expect(withTests.find((r) => r.name === "Plank")!.longestHold!.value).toBe(120);
		expect(withTests.find((r) => r.name === "Bench press")!.oneRm!.value).toBe(102.5);
	});
});

describe("plavání", () => {
	it("nejdelší plavání a nejrychlejší průměr na 100 m", () => {
		const swims = [
			workout({ date: "2026-09-01", sport: "swim", duration_min: 50, swim: { distance_m: 2000 } }),
			workout({ date: "2026-09-05", sport: "swim", duration_min: 20, swim: { distance_m: 1000 } }),
			workout({ date: "2026-09-06", sport: "swim", swim: { distance_m: 2400 } }),
		];
		// 50 min / 20 stovek = 150 s; 20 min / 10 = 120 s
		expect(swimRecords(swims)).toEqual({ longest: { value: 2400, date: "2026-09-06" }, fastest100: { value: 120, date: "2026-09-05" } });
	});
});

describe("nové rekordy", () => {
	const before = allRecords(WORKOUTS, [], CTX);

	it("hlásí jen zlepšení; z nejtěžších sérií se stejnou vahou tu s nejvíc opakováními", () => {
		const next = workout({
			date: "2026-09-15",
			blocks: [
				{ type: "sets", exercise: "Bench press", sets: [{ reps: 8, kg: 85 }] },
				{ type: "sets", exercise: "Shyby", sets: [{ reps: 5 }] },
			],
		});
		const texts = newRecords(before, allRecords([...WORKOUTS, next], [], CTX)).map((r) => r.text);
		// 85 × (1 + 8/30) = 107,7 > 99; 85 kg překonává série pro 5 i 8 opakování → jen ta pro 8
		expect(texts).toEqual(["Bench press – odhad 1RM 107,7 kg", "Bench press – 8 opak. s 85 kg"]);
	});

	it("první výkon ve cviku rekordem není", () => {
		const first = workout({ date: "2026-09-15", sport: "run", run: { distance_km: 5, moving_time_s: 1500 } });
		expect(newRecords(before, allRecords([...WORKOUTS, first], [], CTX))).toEqual([]);
	});

	it("běh: nižší čas je lepší", () => {
		const runs = [workout({ date: "2026-09-01", sport: "run", run: { distance_km: 5, moving_time_s: 1500 } })];
		const faster = workout({ date: "2026-09-20", sport: "run", run: { distance_km: 5.05, moving_time_s: 1471 } });
		const texts = newRecords(allRecords(runs, [], CTX), allRecords([...runs, faster], [], CTX)).map((r) => r.text);
		expect(texts).toEqual(["Běh 5 km – 24:31", "Nejdelší běh – 5,05 km"]);
	});
});

describe("běh: Riegel a rozložení intenzit (8.7)", () => {
	it("Riegel: 5 km za 25:00 → 10 km za 52:07", () => {
		// 1500 × 2^1,06 = 1500 × 2,08493 = 3127,4 s
		expect(riegelTime(1500, 5, 10)).toBeCloseTo(3127.4, 0);
		expect(riegelTime(1500, 5, 5)).toBe(1500);
		expect(riegelTime(0, 5, 10)).toBeNull();
	});

	it("podíl času v zónách 3–5 za 28 dní", () => {
		const runs = [
			workout({ date: "2026-09-10", sport: "run", run: { hr_zone_s: [600, 1800, 700, 200, 100] } }),
			workout({ date: "2026-09-20", sport: "run", run: { hr_zone_s: [0, 1600, 0, 0, 0] } }),
			workout({ date: "2026-08-01", sport: "run", run: { hr_zone_s: [0, 0, 5000, 0, 0] } }),
			workout({ date: "2026-09-21", sport: "run", run: { distance_km: 5 } }),
		];
		// lehké 600 + 1800 + 1600 = 4000; intenzivní 1000 → 20 %
		expect(intensityShare(runs, "2026-09-28")).toEqual({ easySec: 4000, hardSec: 1000, share: 0.2, runs: 2 });
		expect(intensityShare(runs.slice(3), "2026-09-28")).toBeNull();
	});
});
