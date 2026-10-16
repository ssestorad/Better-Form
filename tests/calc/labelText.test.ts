import { describe, expect, it } from "vitest";
import { parseLabelText } from "../../src/calc/labelText";
import { ingredientsDailyMg, ingredientWarnings } from "../../src/calc/supplements";
import { parseSupplement } from "../../src/model/parse";
import { supplementToFrontmatter } from "../../src/model/serialize";
import { labelCatalogId } from "../../src/seed/supplements";
import { limitMessage } from "../../src/ui/supplements/text";

const LABEL = `Složení v 1 tabletě            % RHP*
Energie 12 kJ / 3 kcal
Vitamin C 80 mg 100 %
Vitamin D3: 25 µg (1000 IU) 500 %
Hořčík (citrát hořečnatý)\t375 mg | 100 %
- Zinek 10mg
Vitamin B6 1,4 mg 100%
Vitamin B12 2,5 mcg
Niacin (vitamin B3) 16 mg
Vitamin C 80 mg
1 tableta obsahuje 500 mg
Kofein 0 mg
*RHP = referenční hodnota příjmu`;

describe("složení z textu etikety", () => {
	const rows = parseLabelText(LABEL);

	it("z řádku vezme název a první množství; energie, nadpisy, opakování a nuly přeskočí", () => {
		expect(rows).toEqual([
			{ name: "Vitamin C", amount: 80, unit: "mg" },
			{ name: "Vitamin D3", amount: 25, unit: "µg" },
			{ name: "Hořčík", amount: 375, unit: "mg" },
			{ name: "Zinek", amount: 10, unit: "mg" },
			{ name: "Vitamin B6", amount: 1.4, unit: "mg" },
			{ name: "Vitamin B12", amount: 2.5, unit: "µg" },
			{ name: "Niacin", amount: 16, unit: "mg" },
		]);
		expect(parseLabelText("")).toEqual([]);
		expect(parseLabelText("Vitamin D 1000 IU\nVitamin A 800 m.j.")).toEqual([
			{ name: "Vitamin D", amount: 1000, unit: "IU" },
			{ name: "Vitamin A", amount: 800, unit: "IU" },
		]);
	});

	it("látky se přiřadí ke katalogu; z vitaminů B jen B6 (jen pro něj platí horní limit)", () => {
		expect(rows.map((r) => labelCatalogId(r.name))).toEqual(["vitamin_c", "vitamin_d", "magnesium", "zinc", "vitamin_b", undefined, undefined]);
		expect(labelCatalogId("Neznámá látka")).toBeUndefined();
	});

	it("denní množství = porce × obsah; limity se hlídají u každé látky zvlášť", () => {
		const ingredients = rows.map((r) => ({ ...r, catalog: labelCatalogId(r.name) }));
		// 1 porce: 80 + 0,025 + 375 + 10 + 1,4 + 0,0025 + 16 = 482,4275 mg
		expect(ingredientsDailyMg(ingredients, 1)).toBeCloseTo(482.4275, 6);
		expect(ingredientsDailyMg(ingredients, undefined)).toBeCloseTo(482.4275, 6);
		expect(ingredientsDailyMg([{ name: "Směs", amount: 2, unit: "kapsle" }], 1)).toBeNull();
		// Hořčík z doplňků má limit 250 mg: 375 mg je nad ním už v jedné porci.
		const over = (servings: number) => ingredientWarnings(ingredients, servings).map((w) => `${w.name}: ${limitMessage(w.check)}`);
		expect(over(1)).toEqual(["Hořčík: Dávka 375 mg je nad horním limitem 250 mg denně (z doplňků)."]);
		// Tři porce: zinek 30 mg > 25 mg, vitamin D 75 µg je pod limitem 100 µg.
		expect(over(3).map((t) => t.split(":")[0])).toEqual(["Hořčík", "Zinek"]);
	});

	it("složení se uloží do poznámky a načte zpět; neplatné řádky se zahodí", () => {
		const note = parseSupplement({
			forma: "supplement",
			schema: 1,
			name: "Multivitamin",
			dose: 2,
			unit: "tablety",
			ingredients: [{ name: "Zinek", amount: 10, unit: "mg", catalog: "zinc" }, { name: "Bez množství", unit: "mg" }, "text", { name: "Vitamin C", amount: 80, unit: "mg" }],
		})!;
		expect(note.ingredients).toEqual([
			{ name: "Zinek", amount: 10, unit: "mg", catalog: "zinc" },
			{ name: "Vitamin C", amount: 80, unit: "mg" },
		]);
		expect(parseSupplement(supplementToFrontmatter(note))).toEqual(note);
		expect(parseSupplement({ forma: "supplement", name: "Kreatin", ingredients: [] })?.ingredients).toBeUndefined();
	});
});
