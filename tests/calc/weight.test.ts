import { describe, expect, it } from "vitest";
import { assessBalance, weightChart, weightPoints, weightTrend, type WeightTrend } from "../../src/calc/weight";
import type { DayNote } from "../../src/model/types";
import { adjustText, balanceText, trendText } from "../../src/ui/nutrition/text";

function day(date: string, partial: Partial<DayNote> = {}): DayNote {
	return { forma: "day", schema: 1, date, sleep: {}, check_in: {}, hrv: {}, body: {}, ...partial };
}
const weighed = (date: string, kg: number) => day(date, { body: { weight_kg: kg } });

type ReadyTrend = Extract<WeightTrend, { ready: true }>;
const trendOf = (kcalPerDay: number): ReadyTrend => ({
	ready: true,
	samples: 6,
	spanDays: 20,
	currentKg: 61,
	kgPerWeek: (kcalPerDay / 7700) * 7,
	pctPerWeek: ((kcalPerDay / 7700) * 7 * 100) / 61,
	kcalPerDay,
});
// Hubnutí 0,5–1 % z 61 kg týdně = 335,5–671 kcal denně.
const LOSE = { min: -671, max: -335.5 };
const GAIN = { min: 125, max: 250 };

describe("váha: graf a trend (SPEC 11.6)", () => {
	// Vážení po 5 dnech: 62,0 → 61,8 → 61,5 → 61,3 → 61,0 kg.
	const days = [weighed("2026-10-01", 62), weighed("2026-10-06", 61.8), weighed("2026-10-11", 61.5), weighed("2026-10-16", 61.3), weighed("2026-10-21", 61)];

	it("řady pro graf: vážení a průměr za 7 dní", () => {
		const points = weightPoints([weighed("2026-10-03", 61), day("2026-10-02"), weighed("2026-10-01", 62)]);
		expect(points).toEqual([
			{ date: "2026-10-01", kg: 62 },
			{ date: "2026-10-03", kg: 61 },
		]);
		const chart = weightChart(points, ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-12"]);
		expect(chart.value).toEqual([62, null, 61, null]);
		expect(chart.average).toEqual([62, 62, 61.5, null]);
	});

	it("trend přímkou: −0,05 kg denně = −0,35 kg týdně = −385 kcal denně", () => {
		// x = 0, 5, 10, 15, 20; průměr x 10, průměr y 61,52; Sxx = 250, Sxy = −12,5 → sklon −0,05
		const trend = weightTrend(weightPoints(days), "2026-10-21");
		expect(trend.ready).toBe(true);
		if (!trend.ready) return;
		expect(trend.samples).toBe(5);
		expect(trend.spanDays).toBe(20);
		expect(trend.kgPerWeek).toBeCloseTo(-0.35, 6);
		expect(trend.currentKg).toBeCloseTo(61.02, 6);
		expect(trend.pctPerWeek).toBeCloseTo((-0.35 / 61.02) * 100, 6);
		expect(trend.kcalPerDay).toBeCloseTo(-385, 6);
	});

	it("málo vážení nebo krátké rozpětí → sbírám data", () => {
		expect(weightTrend(weightPoints(days.slice(1)), "2026-10-21")).toEqual({ ready: false, samples: 4, spanDays: 15 });
		const close = ["2026-10-12", "2026-10-14", "2026-10-16", "2026-10-18", "2026-10-21"].map((d) => weighed(d, 61));
		expect(weightTrend(weightPoints(close), "2026-10-21")).toEqual({ ready: false, samples: 5, spanDays: 9 });
		// Vážení starší než 21 dní se nepočítají.
		expect(weightTrend(weightPoints(days), "2026-11-20")).toEqual({ ready: false, samples: 0, spanDays: 0 });
	});
});

describe("bilance podle váhy proti cíli", () => {
	it("udržování: do ±0,25 % týdně drží, jinak navrhne úpravu", () => {
		// Tolerance u 61 kg: 61 · 0,0025 · 7700 / 7 = 167,75 kcal denně
		expect(assessBalance(trendOf(-150), "maintain", LOSE)).toEqual({ status: "on_track", direction: "flat", adjustKcal: 0 });
		expect(assessBalance(trendOf(-385), "maintain", LOSE)).toEqual({ status: "drift", direction: "down", adjustKcal: 400 });
		expect(assessBalance(trendOf(320), "maintain", LOSE)).toEqual({ status: "drift", direction: "up", adjustKcal: -300 });
	});

	it("hubnutí: v rozsahu, pomalu, rychle, opačně", () => {
		expect(assessBalance(trendOf(-385), "lose", LOSE).status).toBe("on_track");
		expect(assessBalance(trendOf(-100), "lose", LOSE)).toEqual({ status: "slow", direction: "flat", adjustKcal: -250 });
		expect(assessBalance(trendOf(-900), "lose", LOSE)).toEqual({ status: "fast", direction: "down", adjustKcal: 250 });
		expect(assessBalance(trendOf(300), "lose", LOSE)).toEqual({ status: "opposite", direction: "up", adjustKcal: -650 });
	});

	it("nabírání: v rozsahu, pomalu, rychle, opačně", () => {
		expect(assessBalance(trendOf(200), "gain", GAIN).status).toBe("on_track");
		expect(assessBalance(trendOf(0), "gain", GAIN)).toEqual({ status: "slow", direction: "flat", adjustKcal: 150 });
		expect(assessBalance(trendOf(500), "gain", GAIN)).toEqual({ status: "fast", direction: "up", adjustKcal: -250 });
		expect(assessBalance(trendOf(-385), "gain", GAIN)).toEqual({ status: "opposite", direction: "down", adjustKcal: 500 });
	});

	it("texty", () => {
		expect(trendText({ ...trendOf(-384), kgPerWeek: -0.35, pctPerWeek: -0.57 })).toBe("−0,35 kg za týden (−0,6 % hmotnosti), tedy bilance asi −380 kcal denně");
		expect(trendText({ ...trendOf(222), kgPerWeek: 0.2, pctPerWeek: 0.33 })).toBe("+0,2 kg za týden (+0,3 % hmotnosti), tedy bilance asi +220 kcal denně");
		expect(adjustText(0)).toBe("");
		expect(adjustText(-250)).toBe("uber asi 250 kcal denně");
		expect(balanceText({ status: "drift", direction: "down", adjustKcal: 400 }, "maintain", 1)).toBe(
			"Cíl je udržování, ale váha klesá – jíš méně, než vydáš. Pokud to není záměr, přidej asi 400 kcal denně.",
		);
		expect(balanceText({ status: "fast", direction: "down", adjustKcal: 250 }, "lose", 1)).toContain("rychleji než 1 % hmotnosti týdně");
		expect(balanceText({ status: "on_track", direction: "up", adjustKcal: 0 }, "gain", 1)).toBe("Přibíráš tempem, které odpovídá zvolenému přebytku.");
	});
});

describe("týdenní kontrola: osobní korekce výdeje (SPEC 11.6)", () => {
	const check = (adjustKcal: number) => ({ status: "slow" as const, direction: "flat" as const, adjustKcal });

	it("nabídne posun o doporučenou úpravu; drobný rozdíl neřeší", async () => {
		const { correctionAdvice } = await import("../../src/calc/weight");
		expect(correctionAdvice(check(-150), 0, "", "2026-10-07")).toEqual({ kind: "offer", stepKcal: -150, totalKcal: -150 });
		expect(correctionAdvice(check(200), -100, "", "2026-10-07")).toEqual({ kind: "offer", stepKcal: 200, totalKcal: 100 });
		expect(correctionAdvice(check(50), 0, "", "2026-10-07")).toEqual({ kind: "none" });
		expect(correctionAdvice(check(0), 0, "", "2026-10-07")).toEqual({ kind: "none" });
		expect(correctionAdvice(null, 0, "", "2026-10-07")).toEqual({ kind: "none" });
	});

	it("po úpravě se 21 dní další nenabízí – trend ještě obsahuje dny před ní", async () => {
		const { correctionAdvice } = await import("../../src/calc/weight");
		expect(correctionAdvice(check(-150), -100, "2026-10-01", "2026-10-07")).toEqual({ kind: "locked", until: "2026-10-22" });
		expect(correctionAdvice(check(-150), -100, "2026-10-01", "2026-10-21")).toEqual({ kind: "locked", until: "2026-10-22" });
		expect(correctionAdvice(check(-150), -100, "2026-10-01", "2026-10-22")).toEqual({ kind: "offer", stepKcal: -150, totalKcal: -250 });
	});

	it("doporučení na pojistce: korekci dolů nenabízí, nahoru ano", async () => {
		const { correctionAdvice } = await import("../../src/calc/weight");
		expect(correctionAdvice(check(-300), 0, "", "2026-10-07", true)).toEqual({ kind: "floor" });
		expect(correctionAdvice(check(200), 0, "", "2026-10-07", true)).toEqual({ kind: "offer", stepKcal: 200, totalKcal: 200 });
		expect(correctionAdvice(check(-300), 0, "", "2026-10-07", false)).toEqual({ kind: "offer", stepKcal: -300, totalKcal: -300 });
	});

	it("korekce se drží v rozsahu ±500 kcal", async () => {
		const { correctionAdvice } = await import("../../src/calc/weight");
		expect(correctionAdvice(check(-300), -400, "", "2026-10-07")).toEqual({ kind: "offer", stepKcal: -100, totalKcal: -500 });
		expect(correctionAdvice(check(-300), -500, "", "2026-10-07")).toEqual({ kind: "none" });
	});
});
