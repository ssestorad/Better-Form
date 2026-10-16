import { describe, expect, it } from "vitest";
import { acwr, firstLoadDate, fitnessSeries, loadDataDays, lowFormDays, monotony, MONOTONY_CAP } from "../../src/calc/fitness";
import { linearFit, mean, sampleSd } from "../../src/calc/stats";
import { addDays } from "../../src/model/dates";

function loads(start: string, values: number[]): Map<string, number> {
	const map = new Map<string, number>();
	values.forEach((v, i) => {
		if (v > 0) map.set(addDays(start, i), v);
	});
	return map;
}

describe("statistika", () => {
	it("průměr a výběrová odchylka", () => {
		expect(mean([2, 4, 6])).toBe(4);
		expect(mean([])).toBeNull();
		// odchylky −2, 0, 2 → 8 / 2 = 4 → 2
		expect(sampleSd([2, 4, 6])).toBe(2);
		expect(sampleSd([5])).toBeNull();
	});

	it("přímka nejmenších čtverců", () => {
		expect(linearFit([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }])).toEqual({ slope: 2, intercept: 1 });
		expect(linearFit([{ x: 1, y: 1 }])).toBeNull();
		expect(linearFit([{ x: 1, y: 1 }, { x: 1, y: 2 }])).toBeNull();
	});
});

describe("kondice, únava, forma (8.2)", () => {
	it("jedna zátěž 100: CTL 2,353, ATL 13,312, druhý den útlum", () => {
		// 1 − e^(−1/42) = 0,023528; 1 − e^(−1/7) = 0,133122
		const series = fitnessSeries(loads("2026-09-01", [100]), "2026-09-01", "2026-09-02", 42, 7);
		expect(series).toHaveLength(2);
		expect(series[0]!.ctl).toBeCloseTo(2.3528, 3);
		expect(series[0]!.atl).toBeCloseTo(13.3122, 3);
		expect(series[0]!.tsb).toBeCloseTo(-10.9594, 3);
		// den bez zátěže: × e^(−1/τ)
		expect(series[1]!.ctl).toBeCloseTo(2.2975, 3);
		expect(series[1]!.atl).toBeCloseTo(11.5401, 3);
	});

	it("počítá se od první zátěže, i když graf začíná později", () => {
		const data = loads("2026-09-01", [100, 0, 0]);
		const late = fitnessSeries(data, "2026-09-03", "2026-09-03", 42, 7);
		const full = fitnessSeries(data, "2026-09-01", "2026-09-03", 42, 7);
		expect(late).toEqual([full[2]]);
	});

	it("stálá zátěž: kondice i únava se blíží zátěži, forma k nule", () => {
		const series = fitnessSeries(loads("2026-01-01", Array(300).fill(200)), "2026-01-01", "2026-10-27", 42, 7);
		const last = series[series.length - 1]!;
		expect(last.ctl).toBeCloseTo(200, 0);
		expect(last.atl).toBeCloseTo(200, 3);
		expect(Math.abs(last.tsb)).toBeLessThan(1);
	});

	it("bez dat prázdná řada, počet dní s daty", () => {
		expect(fitnessSeries(new Map(), "2026-09-01", "2026-09-10", 42, 7)).toEqual([]);
		const data = loads("2026-09-01", [100, 0, 50]);
		expect(firstLoadDate(data)).toBe("2026-09-01");
		expect(loadDataDays(data, "2026-09-10")).toBe(10);
		expect(loadDataDays(new Map(), "2026-09-10")).toBe(0);
	});

	it("dny s formou pod −20 % kondice", () => {
		const point = (ctl: number, tsb: number) => ({ date: "", load: 0, ctl, atl: ctl - tsb, tsb });
		expect(lowFormDays([point(100, -25), point(100, -19), point(100, -21), point(0, -5)], 7, 20)).toBe(2);
	});
});

describe("ACWR (8.3)", () => {
	it("stálá zátěž → 1,0", () => {
		const result = acwr(loads("2026-09-01", Array(28).fill(100)), "2026-09-28", 7, 28);
		expect(result!.ratio).toBeCloseTo(1, 10);
	});

	it("skok na 400 po 28 dnech po 100: akutní 175, chronická 120,69 → 1,45", () => {
		// λ7 = 0,25: 400 × 0,25 + 0,75 × 100 = 175; λ28 = 2/29: 400 × 0,068966 + 0,931034 × 100 = 120,69
		const result = acwr(loads("2026-09-01", [...Array(28).fill(100), 400]), "2026-09-29", 7, 28)!;
		expect(result.acute).toBeCloseTo(175, 6);
		expect(result.chronic).toBeCloseTo(120.69, 2);
		expect(result.ratio).toBeCloseTo(1.45, 2);
	});

	it("méně než 28 dní dat → null", () => {
		expect(acwr(loads("2026-09-01", Array(27).fill(100)), "2026-09-27", 7, 28)).toBeNull();
		expect(acwr(new Map(), "2026-09-27", 7, 28)).toBeNull();
	});
});

describe("monotónnost a strain (8.4)", () => {
	it("300, 0, 400, 0, 500, 0, 200 → 0,961 a strain 1345", () => {
		// průměr 200; součet čtverců odchylek 260 000 / 6 → SD 208,17
		const result = monotony(loads("2026-09-01", [300, 0, 400, 0, 500, 0, 200]), "2026-09-07")!;
		expect(result.monotony).toBeCloseTo(0.9608, 3);
		expect(result.weekLoad).toBe(1400);
		expect(result.strain).toBeCloseTo(1345.1, 0);
	});

	it("každý den stejně → strop, žádná zátěž nebo málo dní → null", () => {
		expect(monotony(loads("2026-09-01", Array(7).fill(300)), "2026-09-07")!.monotony).toBe(MONOTONY_CAP);
		expect(monotony(loads("2026-09-01", [300]), "2026-09-20")).toBeNull();
		expect(monotony(loads("2026-09-01", [300, 200, 100]), "2026-09-03")).toBeNull();
	});
});
