import { describe, expect, it } from "vitest";
import { equivalentTime, paceRange, planPaceKind, qualityLimits, trainingPaces, vdot } from "../../src/calc/runningPaces";

// Kontrola proti tabulkám Daniels' Running Formula: VDOT 50 ≈ 5 km za 19:57, maraton za 3:10:49,
// tempo M asi 4:31/km, T asi 4:15/km, I asi 3:55/km, R asi 3:42/km.
describe("tempa podle Danielse", () => {
	it("VDOT a rovnocenný čas na maraton", () => {
		expect(vdot(5, 19 * 60 + 57)).toBeCloseTo(50, 0);
		expect(equivalentTime(50, 42.195)).toBeGreaterThan(3 * 3600 + 9 * 60);
		expect(equivalentTime(50, 42.195)).toBeLessThan(3 * 3600 + 13 * 60);
		expect(vdot(0, 1200)).toBeNull();
		expect(vdot(5, 0)).toBeNull();
	});

	it("tempa E, M, T, I, R z výsledku na 5 km", () => {
		const p = trainingPaces(5, 19 * 60 + 57)!;
		// E 59–74 % VO2max: pomalejší konec je pomalejší než rychlejší.
		expect(p.easy.slow).toBeGreaterThan(p.easy.fast);
		expect(p.easy.fast).toBeGreaterThan(p.marathon);
		expect(p.marathon).toBeCloseTo(271, -1); // 4:31/km
		expect(p.threshold.fast).toBeCloseTo(255, -1); // 4:15/km
		expect(p.repetition).toBeCloseTo(222, -1); // 3:42/km
		// I = R + 15–20 s/km (6–8 s na 400 m).
		expect(p.interval).toEqual({ slow: p.repetition + 20, fast: p.repetition + 15 });
		// Pořadí od nejpomalejšího: E > M > T > I > R.
		expect(p.marathon).toBeGreaterThan(p.threshold.slow);
		expect(p.threshold.fast).toBeGreaterThan(p.interval.slow);
	});

	it("limity rychlých úseků podle týdenního objemu", () => {
		expect(qualityLimits(50)).toEqual({ thresholdKm: 5, intervalKm: 4, repetitionKm: 2.5, longRunKm: 15 });
		// I nejvýš 10 km, R nejvýš 8 km i při velkém objemu.
		expect(qualityLimits(200)).toMatchObject({ intervalKm: 10, repetitionKm: 8 });
		expect(qualityLimits(0)).toBeNull();
	});
});

describe("tempo k běhu v plánu", () => {
	it("druh tempa podle názvu, jinak podle intenzity", () => {
		expect(planPaceKind("Intervals 6×800 m", "high")).toBe("I");
		expect(planPaceKind("Strides", "low")).toBe("R");
		expect(planPaceKind("Tempo Run", "mid")).toBe("T");
		expect(planPaceKind("Marathon Pace 12 km", "mid")).toBe("M");
		expect(planPaceKind("Long Run", "mid")).toBe("E");
		expect(planPaceKind("Fartlek", "high")).toBe("T");
		expect(planPaceKind("", "low")).toBe("E");
	});

	it("rozpětí tempa", () => {
		const p = trainingPaces(5, 19 * 60 + 57)!;
		expect(paceRange(p, "E")).toBe(p.easy);
		expect(paceRange(p, "R")).toEqual({ slow: p.repetition, fast: p.repetition });
		expect(paceRange(p, "M")).toEqual({ slow: p.marathon, fast: p.marathon });
	});
});
