import { describe, expect, it } from "vitest";
import { activityFromSteps, nutritionPlan, stepsActivity, stepsFactor, type NutritionProfile } from "../../src/calc/nutrition";
import { renderDayBlock } from "../../src/data/dayBlock";
import { daysBetween } from "../../src/model/dates";
import { parseDay } from "../../src/model/parse";
import type { DayNote, WorkoutNote } from "../../src/model/types";
import { DEFAULT_NUTRITION } from "../../src/settings/settings";

function day(date: string, partial: Partial<DayNote> = {}): DayNote {
	return { forma: "day", schema: 1, date, sleep: {}, check_in: {}, hrv: {}, body: {}, ...partial };
}
function run(date: string, km: number): WorkoutNote {
	return { forma: "workout", schema: 1, date, sport: "run", source: "manual", blocks: [], pain: [], run: { distance_km: km } };
}

describe("kroky a běžná aktivita (SPEC 11.3)", () => {
	const withSteps = (date: string, steps: number) => day(date, { steps });

	it("třídy podle kroků (Tudor-Locke & Bassett 2004)", () => {
		expect([0, 4999, 5000, 9999, 10000, 15000].map(activityFromSteps)).toEqual(["sedentary", "sedentary", "light", "light", "active", "active"]);
	});

	it("koeficient z kroků plynule mezi středy pásem", () => {
		const f = { sedentary: 1.2, light: 1.4, active: 1.6 };
		expect([0, 2500, 5000, 7500, 10000, 12500, 20000].map((s) => stepsFactor(s, f))).toEqual([1.2, 1.2, 1.3, 1.4, 1.5, 1.6, 1.6].map((v) => expect.closeTo(v, 10)));
	});

	it("kroky dne mají přednost a kroky z běhu se odečítají (1 000 na km)", () => {
		const days = [withSteps("2026-10-04", 12000), withSteps("2026-10-03", 3000)];
		// 12 000 − 5 km · 1 000 = 7 000 → lehce aktivní
		expect(stepsActivity(days, [run("2026-10-04", 5)], "2026-10-04", daysBetween)).toEqual({ level: "light", steps: 7000, source: "day", days: 1 });
		expect(stepsActivity(days, [], "2026-10-04", daysBetween)).toEqual({ level: "active", steps: 12000, source: "day", days: 1 });
	});

	it("bez kroků dne průměr z předchozích 7 dní, aspoň ze 3 záznamů", () => {
		const days = [withSteps("2026-10-03", 4000), withSteps("2026-10-02", 6000), withSteps("2026-10-01", 3000), withSteps("2026-09-20", 20000)];
		expect(stepsActivity(days, [], "2026-10-04", daysBetween)).toEqual({ level: "sedentary", steps: 4333, source: "average", days: 3 });
		expect(stepsActivity(days.slice(1), [], "2026-10-04", daysBetween)).toBeNull();
		expect(stepsActivity([], [], "2026-10-04", daysBetween)).toBeNull();
	});

	it("úroveň z kroků přebije nastavení ve výpočtu příjmu", () => {
		const man: NutritionProfile = { sex: "male", age: 30, heightCm: 180, weightKg: 80, bodyFatPct: null, activity: "light", goal: "maintain" };
		const base = nutritionPlan({ profile: man, settings: structuredClone(DEFAULT_NUTRITION), eaMin: 30, workouts: [] })!;
		expect(base).toMatchObject({ activity: "light", activityFactor: 1.4 });
		const plan = nutritionPlan({
			profile: { ...man, steps: { level: "sedentary", steps: 4333, source: "average", days: 3 } },
			settings: structuredClone(DEFAULT_NUTRITION),
			// Bez pojistky EA, ať je vidět jen vliv koeficientu (pojistka bez % tuku je otevřený bod v SPEC).
			eaMin: 0,
			workouts: [],
		})!;
		// Koeficient plynule: 1,2 + (4333 − 2500) / 5000 · 0,2 = 1,27332; 1989,2264 · 1,27332 = 2532,9
		expect(plan.activity).toBe("sedentary");
		expect(plan.activityFactor).toBeCloseTo(1.27332, 5);
		expect(plan.target).toBe(2530);
	});

	it("kroky v denní poznámce: čtení a řádek v souhrnu", () => {
		expect(parseDay({ forma: "day", schema: 1, date: "2026-10-03", steps: 8200.4 })?.steps).toBe(8200);
		expect(parseDay({ forma: "day", schema: 1, date: "2026-10-03", steps: -5 })?.steps).toBeUndefined();
		expect(parseDay({ forma: "day", schema: 1, date: "2026-10-03", steps: "hodně" })?.steps).toBeUndefined();
		expect(renderDayBlock(day("2026-10-03", { steps: 8200 }), [])).toContain("**Kroky:** 8200");
	});
});
