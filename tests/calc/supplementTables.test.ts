import { describe, expect, it } from "vitest";
import { getSource, isSourceId } from "../../src/evidence/sources";
import { CAFFEINE_SAFE_MG, CAFFEINE_SOURCES, COMBINATIONS, intakeRows, latestBefore, servingsWithin } from "../../src/calc/supplementTables";

describe("tabulka kofeinu", () => {
	it("porce do limitu EFSA: 400 mg denně, 200 mg najednou", () => {
		const espresso = CAFFEINE_SOURCES.find((s) => s.id === "espresso")!;
		// 400 / 80 = 5 espress denně, 200 / 80 = 2,5 → 2 najednou
		expect(servingsWithin(CAFFEINE_SAFE_MG.daily, espresso.mg)).toBe(5);
		expect(servingsWithin(CAFFEINE_SAFE_MG.single, espresso.mg)).toBe(2);
		expect(servingsWithin(400, 0)).toBe(0);
	});

	it("nejpozdější čas před spaním, i přes půlnoc", () => {
		// 22:30 − 8,8 h (8 h 48 min) = 13:42
		expect(latestBefore(22 * 60 + 30, 8.8)).toBe("13:42");
		// 23:00 − 13,2 h (13 h 12 min) = 9:48
		expect(latestBefore(23 * 60, 13.2)).toBe("09:48");
		// 01:00 − 8,8 h = 16:12 předchozího dne
		expect(latestBefore(60, 8.8)).toBe("16:12");
	});
});

describe("doporučený příjem a horní limity", () => {
	it("hodnoty podle pohlaví; bez pohlaví rozmezí obou", () => {
		const iron = (sex: "male" | "female" | null) => intakeRows(sex, []).find((r) => r.reference.id === "iron")!;
		expect(iron("male").recommendedMg).toEqual([11, 11]);
		expect(iron("female").recommendedMg).toEqual([16, 16]);
		expect(iron(null).recommendedMg).toEqual([11, 16]);
		expect(iron(null).limitMg).toBeNull();
	});

	it("součet ze suplementů a překročení horního limitu", () => {
		const rows = intakeRows("male", [
			{ catalog: "magnesium", mg: 300, from: ["Hořčík", "Multivitamin"] },
			{ catalog: "zinc", mg: 15, from: ["Zinek"] },
		]);
		const magnesium = rows.find((r) => r.reference.id === "magnesium")!;
		expect(magnesium.fromSupplementsMg).toBe(300);
		expect(magnesium.limitMg).toBe(250);
		expect(magnesium.supplementsOnly).toBe(true);
		expect(magnesium.overLimit).toBe(true);
		const zinc = rows.find((r) => r.reference.id === "zinc")!;
		expect(zinc.recommendedMg).toEqual([9.4, 16.3]);
		expect(zinc.overLimit).toBe(false);
		expect(rows.find((r) => r.reference.id === "vitamin_c")!.fromSupplementsMg).toBeNull();
	});
});

describe("co nebrat spolu", () => {
	it("každý řádek má existující zdroje a jedinečné id", () => {
		expect(new Set(COMBINATIONS.map((c) => c.id)).size).toBe(COMBINATIONS.length);
		for (const c of COMBINATIONS) {
			expect(c.sources.length, c.id).toBeGreaterThan(0);
			for (const s of c.sources) {
				expect(isSourceId(s), `${c.id}: ${s}`).toBe(true);
				expect(getSource(s).evidence, `${c.id}: ${s}`).toBeDefined();
			}
		}
	});
});
