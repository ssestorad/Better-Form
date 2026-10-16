import { describe, expect, it } from "vitest";
import {
	DRINK_SODIUM_MG_PER_L,
	ELECTROLYTES,
	ELECTROLYTE_BASIS,
	SWEAT_RATES,
	electrolyteNeed,
	fluidPlan,
	meqToMg,
	sweatLossL,
} from "../../src/calc/electrolytes";
import { isSourceId } from "../../src/evidence/sources";

const byId = (id: string) => ELECTROLYTES.find((e) => e.id === id)!;

describe("meqToMg", () => {
	it("jednomocné ionty: mg = mEq × atomová hmotnost", () => {
		expect(meqToMg(35, "na")).toBeCloseTo(804.65, 2); // 35 × 22,99
		expect(meqToMg(5, "k")).toBeCloseTo(195.5, 2); // 5 × 39,1
		expect(meqToMg(30, "cl")).toBeCloseTo(1063.5, 2); // 30 × 35,45
	});

	it("dvojmocné ionty: polovina", () => {
		expect(meqToMg(1, "ca")).toBeCloseTo(20.04, 2); // 40,08 / 2
		expect(meqToMg(0.8, "mg")).toBeCloseTo(9.724, 3); // 0,8 × 24,31 / 2
	});
});

describe("tabulka elektrolytů", () => {
	it("referenční příjem podle EFSA", () => {
		expect(byId("sodium").referenceMg.male).toBe(2000);
		expect(byId("chloride").referenceMg.male).toBe(3100);
		expect(byId("potassium").referenceMg.male).toBe(3500);
		expect(byId("calcium").referenceMg.male).toBe(950);
		expect(byId("magnesium").referenceMg).toEqual({ male: 350, female: 300 });
	});

	it("koncentrace v potu podle ACSM 2007 (rozsahy v mg/l)", () => {
		const na = byId("sodium").sweatMgPerL;
		expect(na.min).toBeCloseTo(229.9, 1); // 10 mEq/l
		expect(na.avg).toBeCloseTo(804.65, 1); // 35 mEq/l
		expect(na.max).toBeCloseTo(1609.3, 1); // 70 mEq/l
		for (const e of ELECTROLYTES) {
			expect(e.sweatMgPerL.min, e.id).toBeLessThan(e.sweatMgPerL.avg);
			expect(e.sweatMgPerL.avg, e.id).toBeLessThan(e.sweatMgPerL.max);
		}
	});

	it("zdroje existují", () => {
		for (const id of ELECTROLYTE_BASIS.sourceIds) expect(isSourceId(id), id).toBe(true);
	});
});

describe("sweatLossL", () => {
	it("rychlost × čas", () => {
		expect(sweatLossL(SWEAT_RATES.medium, 60)).toBe(1);
		expect(sweatLossL(SWEAT_RATES.high, 90)).toBeCloseTo(2.25, 10);
		expect(sweatLossL(SWEAT_RATES.low, 30)).toBeCloseTo(0.25, 10);
		expect(sweatLossL(1, -10)).toBe(0);
	});
});

describe("electrolyteNeed", () => {
	it("sodík, 80 kg, 1,5 l potu", () => {
		const need = electrolyteNeed(byId("sodium"), 80, "male", 1.5);
		expect(need.restMg).toBe(2000);
		expect(need.restMgPerKg).toBe(25); // 2000 / 80
		expect(need.lossMg.avg).toBeCloseTo(1206.98, 1); // 804,65 × 1,5
		expect(need.lossMg.min).toBeCloseTo(344.85, 1); // 229,9 × 1,5
		expect(need.lossMg.max).toBeCloseTo(2413.95, 1); // 1609,3 × 1,5
		expect(need.trainingMg).toBeCloseTo(3206.98, 1);
	});

	it("hořčík podle pohlaví; bez pohlaví vyšší hodnota", () => {
		expect(electrolyteNeed(byId("magnesium"), 60, "female", 1).restMg).toBe(300);
		expect(electrolyteNeed(byId("magnesium"), 60, "male", 1).restMg).toBe(350);
		expect(electrolyteNeed(byId("magnesium"), 60, null, 1).restMg).toBe(350);
		// Ztráta potem je malá: 9,7 mg na litr.
		expect(electrolyteNeed(byId("magnesium"), 60, "male", 1).trainingMg).toBeCloseTo(359.72, 1);
	});

	it("bez tréninku se den s tréninkem rovná dni bez něj; bez váhy chybí přepočet na kg", () => {
		const need = electrolyteNeed(byId("potassium"), null, null, 0);
		expect(need.trainingMg).toBe(3500);
		expect(need.lossMg).toEqual({ avg: 0, min: 0, max: 0 });
		expect(need.restMgPerKg).toBeNull();
	});
});

describe("fluidPlan", () => {
	it("80 kg, 1 l potu: 400–560 ml předem, 1,5 l po tréninku", () => {
		expect(fluidPlan(80, 1)).toEqual({ preMl: { min: 400, max: 560 }, sweatL: 1, rehydrateL: 1.5 });
	});

	it("bez váhy chybí množství před tréninkem", () => {
		expect(fluidPlan(null, 2).preMl).toBeNull();
		expect(fluidPlan(null, 2).rehydrateL).toBe(3);
	});

	it("sodík v nápoji 20–50 mEq/l = 460–1150 mg/l", () => {
		expect(DRINK_SODIUM_MG_PER_L.min).toBeCloseTo(459.8, 1);
		expect(DRINK_SODIUM_MG_PER_L.max).toBeCloseTo(1149.5, 1);
	});
});
