import { describe, expect, it } from "vitest";
import type { Recovery } from "../../src/calc/muscleVolume";
import {
	bestSetText,
	cardioText,
	changeText,
	formatSetCount,
	lastTrainedText,
	recoveryAdvice,
	recoveryLegend,
	trendGeometry,
	volumeAdvice,
	volumeLegend,
} from "../../src/ui/body/text";

const RANGE = { low: 6, targetMin: 10, targetMax: 20 };

function rec(hours: number | null): Recovery {
	return { lastAt: hours === null ? null : 0, lastDate: hours === null ? null : "2026-09-26", hours, percent: 0, category: 0 };
}

describe("legendy", () => {
	it("objem podle prahů z nastavení", () => {
		expect(volumeLegend(RANGE)).toEqual(["Málo (pod 6)", "Pod optimem (6–9)", "Optimum (10–20)", "Nad rozsahem (20+)"]);
	});

	it("regenerace podle hodin z nastavení", () => {
		expect(recoveryLegend(24, 48, 72)[1]).toBe("Regeneruje (24–48 h)");
	});
});

describe("formátování", () => {
	it("počet sérií: půlky s jednou desetinou", () => {
		expect(formatSetCount(9)).toBe("9");
		expect(formatSetCount(9.5)).toBe("9,5");
	});

	it("naposledy", () => {
		expect(lastTrainedText(rec(null))).toBe("Zatím ne");
		expect(lastTrainedText(rec(0.5))).toBe("Před chvílí");
		expect(lastTrainedText(rec(6))).toBe("Před 6 h");
		expect(lastTrainedText(rec(30))).toBe("Včera");
		expect(lastTrainedText(rec(74))).toBe("Před 3 dny");
	});

	it("nejlepší série", () => {
		expect(bestSetText({ reps: 6, kg: 80 })).toBe("80 kg × 6");
		expect(bestSetText({ reps: 6, addedKg: 10 })).toBe("+10 kg × 6");
		expect(bestSetText({ reps: 8, addedKg: -15 })).toBe("−15 kg × 8");
		expect(bestSetText({ reps: 12 })).toBe("tělo × 12");
		expect(bestSetText({ sec: 60 })).toBe("60 s");
		expect(bestSetText(null)).toBe("—");
	});

	it("změna za 4 týdny: kg na půlky, opakování a sekundy na celé", () => {
		expect(changeText({ value: 6, unit: "kg" })).toBe("+6 kg");
		expect(changeText({ value: 2.4, unit: "kg" })).toBe("+2,5 kg");
		expect(changeText({ value: -1, unit: "reps" })).toBe("−1 opak.");
		expect(changeText({ value: 10, unit: "sec" })).toBe("+10 s");
		expect(changeText({ value: 0.1, unit: "kg" })).toBe("=");
		expect(changeText(null)).toBe("nové");
	});

	it("kardio", () => {
		expect(cardioText([{ sport: "run", count: 2, distance: 18 }])).toBe("běh 18 km (2×)");
		expect(cardioText([{ sport: "swim", count: 1, distance: 2400 }])).toBe("plavání 2,4 km (1×)");
		expect(cardioText([{ sport: "rope", count: 3, distance: 0 }])).toBe("švihadlo 3×");
	});
});

describe("doporučení", () => {
	it("objem pod rozsahem, v rozsahu a nad ním", () => {
		expect(volumeAdvice(6.5, RANGE).text).toBe("Pod doporučeným rozsahem 10–20 sérií týdně. Do optima chybí aspoň 4.");
		expect(volumeAdvice(14, RANGE).text).toBe("Týdenní objem je v doporučeném rozsahu.");
		expect(volumeAdvice(22, RANGE).text).toContain("Nad 20 sérií");
		expect(volumeAdvice(14, RANGE).source).toBe("Schoenfeld 2017 · výzkum");
	});

	it("regenerace je označená jako praxe", () => {
		expect(recoveryAdvice(rec(20), 48, 72).text).toBe("Ještě regeneruje. Těžší trénink nejdřív za 28 h.");
		expect(recoveryAdvice(rec(50), 48, 72).text).toContain("Skoro připravená");
		expect(recoveryAdvice(rec(80), 48, 72).text).toContain("Odpočatá");
		expect(recoveryAdvice(rec(null), 48, 72).text).toContain("netrénovaná");
		expect(recoveryAdvice(rec(80), 48, 72).source).toBe("orientačně 48–72 h · praxe");
	});
});

describe("trendGeometry", () => {
	it("osa Y do 24, pás 10–20, 8 bodů přes šířku 500", () => {
		const g = trendGeometry([0, 12, 24, 12, 12, 12, 12, 12], RANGE);
		const points = g.points.split(" ");
		expect(points).toHaveLength(8);
		// y(0) = 6 + 78 = 84; y(24) = 6; y(12) = 45
		expect(points[0]).toBe("10.0,84.0");
		expect(points[2]).toBe("147.1,6.0");
		expect(points[7]).toBe("490.0,45.0");
		expect(g.lastX).toBe(490);
		expect(g.lastY).toBe(45);
		// y(20) = 6 + (1 − 20/24) × 78 = 19; y(10) = 51,5 → výška 32,5
		expect(g.bandY).toBeCloseTo(19, 10);
		expect(g.bandHeight).toBeCloseTo(32.5, 10);
	});

	it("vyšší hodnoty roztáhnou osu, nic nevyjede z grafu", () => {
		const g = trendGeometry([30, 15], RANGE);
		expect(g.points).toBe("10.0,6.0 490.0,45.0");
	});
});
