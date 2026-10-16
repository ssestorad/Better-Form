import { describe, expect, it } from "vitest";
import { best1RM, epley1RM, estimateSet1RM, setLoadKg } from "../../src/calc/oneRm";

const bench = { kind: "grind", measure: "reps_kg" } as const;
const pullUp = { kind: "grind", measure: "reps_bw", bodyweight_fraction: 0.95 } as const;
const pushUp = { kind: "grind", measure: "reps_bw", bodyweight_fraction: 0.64 } as const;
const swing = { kind: "ballistic", measure: "reps_kg" } as const;

describe("Epley", () => {
	it("1RM = kg × (1 + reps / 30)", () => {
		// 80 × (1 + 6/30) = 80 × 1,2 = 96
		expect(epley1RM(80, 6)).toBeCloseTo(96, 10);
		// 100 × (1 + 10/30) = 133,33…
		expect(epley1RM(100, 10)).toBeCloseTo(133.3333, 3);
		// 60 × (1 + 3/30) = 66
		expect(epley1RM(60, 3)).toBeCloseTo(66, 10);
	});

	it("1 opakování = zvednutá váha", () => {
		expect(epley1RM(120, 1)).toBe(120);
	});

	it("mimo rozsah 1–10 opakování se nepočítá", () => {
		expect(epley1RM(80, 11)).toBeNull();
		expect(epley1RM(80, 0)).toBeNull();
		expect(epley1RM(80, 5.5)).toBeNull();
		expect(epley1RM(0, 5)).toBeNull();
	});
});

describe("zátěž série", () => {
	it("s vlastní vahou: hmotnost × podíl + přívažek", () => {
		// 80 × 0,95 + 10 = 86 kg
		expect(setLoadKg({ reps: 6, added_kg: 10 }, pullUp, 80)).toBeCloseTo(86, 10);
		// guma: 80 × 0,95 − 20 = 56 kg
		expect(setLoadKg({ reps: 6, added_kg: -20 }, pullUp, 80)).toBeCloseTo(56, 10);
		// kliky: 80 × 0,64 = 51,2 kg (Ebben 2011)
		expect(setLoadKg({ reps: 20 }, pushUp, 80)).toBeCloseTo(51.2, 10);
	});

	it("bez tělesné hmotnosti nebo podílu nelze", () => {
		expect(setLoadKg({ reps: 6 }, pullUp, undefined)).toBeNull();
		expect(setLoadKg({ reps: 6 }, { kind: "grind", measure: "reps_bw" }, 80)).toBeNull();
	});

	it("odhad 1RM u shybů s přívažkem", () => {
		// 86 × (1 + 6/30) = 103,2 kg
		expect(estimateSet1RM({ reps: 6, added_kg: 10 }, pullUp, 80)).toBeCloseTo(103.2, 10);
	});

	it("švihové cviky a série nad 10 opakování se nepočítají", () => {
		expect(estimateSet1RM({ reps: 10, kg: 24 }, swing, 80)).toBeNull();
		expect(estimateSet1RM({ reps: 20 }, pushUp, 80)).toBeNull();
	});

	it("nejlepší odhad ze sérií", () => {
		const sets = [
			{ reps: 6, kg: 80 }, // 96
			{ reps: 3, kg: 90 }, // 90 × 1,1 = 99
			{ reps: 12, kg: 60 }, // nepočítá se
			{ sec: 30 },
		];
		expect(best1RM(sets, bench, undefined)).toBeCloseTo(99, 10);
		expect(best1RM([], bench, undefined)).toBeNull();
	});

	it("rozcvičovací série se do 1RM nepočítají", () => {
		const sets = [
			{ reps: 1, kg: 100, warmup: true },
			{ reps: 6, kg: 80 }, // 96
		];
		expect(best1RM(sets, bench, undefined)).toBeCloseTo(96, 10);
	});
});
