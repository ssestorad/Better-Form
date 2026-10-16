import { describe, expect, it } from "vitest";
import { plateColor, plateLoad, plateText, warmupSets, type BarbellSettings } from "../../src/calc/plates";
import { formatNumber } from "../../src/ui/format";

const BAR: BarbellSettings = { barKg: 20, platesKg: [25, 20, 15, 10, 5, 2.5, 1.25] };

describe("kalkulačka kotoučů", () => {
	it("barvy podle závodního značení; hmotnost mimo něj je šedá", () => {
		expect([25, 20, 15, 10, 5].map(plateColor)).toEqual(["#d32f2f", "#1f5fbf", "#f2c200", "#2e9e4f", "#f4f4f4"]);
		expect(plateColor(2.5)).toBe(plateColor(25));
		expect(plateColor(1.25)).toBe("#9aa0a6");
	});

	it("100 kg na 20kg ose = 40 kg na stranu = 25 + 15", () => {
		expect(plateLoad(100, BAR)).toEqual({ perSide: [25, 15], loadedKg: 100, missingKg: 0 });
	});

	it("opakuje stejný kotouč a bere i nejmenší: 182,5 kg = 81,25 na stranu", () => {
		// 25 + 25 + 25 + 5 + 1,25 = 81,25
		expect(plateLoad(182.5, BAR)).toEqual({ perSide: [25, 25, 25, 5, 1.25], loadedKg: 182.5, missingKg: 0 });
	});

	it("co nejde složit přesně, zaokrouhlí dolů a řekne, kolik chybí", () => {
		// 61 kg: 20,5 na stranu → 20 (zbývá 0,5 na stranu = 1 kg celkem)
		expect(plateLoad(61, BAR)).toEqual({ perSide: [20], loadedKg: 60, missingKg: 1 });
		// Bez malých kotoučů: 57,5 kg → 18,75 na stranu → 15 → 50 kg
		expect(plateLoad(57.5, { barKg: 20, platesKg: [20, 15, 10] })).toEqual({ perSide: [15], loadedKg: 50, missingKg: 7.5 });
	});

	it("samotná osa a neplatné vstupy", () => {
		expect(plateLoad(20, BAR)).toEqual({ perSide: [], loadedKg: 20, missingKg: 0 });
		expect(plateLoad(15, BAR)).toBeNull();
		expect(plateLoad(Number.NaN, BAR)).toBeNull();
		expect(plateLoad(100, { barKg: 0, platesKg: [20] })).toBeNull();
		// Duplicitní a nesmyslné kotouče v nastavení nevadí.
		expect(plateLoad(60, { barKg: 20, platesKg: [20, 20, -5, 0] })?.perSide).toEqual([20]);
	});

	it("text na jednu stranu", () => {
		const fmt = (kg: number) => formatNumber(kg, 2);
		expect(plateText(plateLoad(182.5, BAR)!, fmt)).toBe("25 + 25 + 25 + 5 + 1,25");
		expect(plateText(plateLoad(20, BAR)!, fmt)).toBe("jen osa");
	});
});

describe("rozcvičovací série", () => {
	it("100 kg: osa ×10, 40 kg ×5, 60 kg ×3, 80 kg ×2", () => {
		expect(warmupSets(100, BAR)).toEqual([
			{ kg: 20, reps: 10 },
			{ kg: 40, reps: 5 },
			{ kg: 60, reps: 3 },
			{ kg: 80, reps: 2 },
		]);
	});

	it("váhy se zaokrouhlí dolů na naložitelné: 72,5 kg → 29 → 27,5; 43,5 → 42,5; 58 → 57,5", () => {
		expect(warmupSets(72.5, BAR)).toEqual([
			{ kg: 20, reps: 10 },
			{ kg: 27.5, reps: 5 },
			{ kg: 42.5, reps: 3 },
			{ kg: 57.5, reps: 2 },
		]);
	});

	it("u lehké váhy vynechá kroky, které by se opakovaly", () => {
		// 30 kg: 40 % = 12 → osa (stejná jako první krok), 60 % = 18 → osa, 80 % = 24 → 22,5
		expect(warmupSets(30, BAR)).toEqual([
			{ kg: 20, reps: 10 },
			{ kg: 22.5, reps: 2 },
		]);
		expect(warmupSets(20, BAR)).toEqual([]);
		expect(warmupSets(15, BAR)).toEqual([]);
	});
});
