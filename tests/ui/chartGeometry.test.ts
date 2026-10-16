import { describe, expect, it } from "vitest";
import { bandPath, definedIndexes, extent, linePath, nearestIndex, paddedDomain, scale, xAt, yScale, type ChartBox } from "../../src/ui/charts/geometry";

const BOX: ChartBox = { width: 120, height: 60, left: 10, right: 10, top: 5, bottom: 5 };

describe("geometrie grafů", () => {
	it("rozsah hodnot přeskočí chybějící", () => {
		expect(extent([3, null, 7, undefined, -1])).toEqual([-1, 7]);
		expect(extent([null])).toBeNull();
	});

	it("osa s rezervou 8 %; stejné hodnoty se roztáhnou; nula zůstane na kraji", () => {
		expect(paddedDomain(0, 100)).toEqual([-8, 108]);
		expect(paddedDomain(50, 100, true)).toEqual([0, 108]);
		// 50 ± 10 % = 45–55, rezerva 0,8
		const [lo, hi] = paddedDomain(50, 50);
		expect(lo).toBeCloseTo(44.2, 10);
		expect(hi).toBeCloseTo(55.8, 10);
		const [neg, pos] = paddedDomain(-20, 10, true);
		expect(neg).toBeCloseTo(-22.4, 10);
		expect(pos).toBeCloseTo(12.4, 10);
	});

	it("převod hodnot na souřadnice", () => {
		expect(scale(0, 10, 0, 100)(2.5)).toBe(25);
		expect(scale(5, 5, 0, 100)(5)).toBe(50);
		expect(xAt(0, 5, BOX)).toBe(10);
		expect(xAt(4, 5, BOX)).toBe(110);
		expect(xAt(0, 1, BOX)).toBe(60);
		// větší hodnota je výš (menší y); obráceně pro tempo
		expect(yScale([0, 10], BOX)(10)).toBe(5);
		expect(yScale([0, 10], BOX)(0)).toBe(55);
		expect(yScale([0, 10], BOX, true)(10)).toBe(55);
	});

	it("čára se na chybějící hodnotě přeruší, s connect se spojí", () => {
		const x = (i: number) => i * 10;
		const y = (v: number) => v;
		expect(linePath([1, 2, null, 4], x, y)).toBe("M0.0,1.0 L10.0,2.0 M30.0,4.0");
		expect(linePath([1, 2, null, 4], x, y, true)).toBe("M0.0,1.0 L10.0,2.0 L30.0,4.0");
		expect(linePath([null, null], x, y)).toBe("");
	});

	it("pásmo: uzavřená plocha pro každý souvislý úsek", () => {
		const x = (i: number) => i * 10;
		const y = (v: number) => v;
		expect(bandPath([1, 1, null, 2], [3, 3, null, 4], x, y)).toBe("M0.0,3.0 L10.0,3.0 L10.0,1.0 L0.0,1.0 Z M30.0,4.0 L30.0,2.0 Z");
	});

	it("nejbližší bod k poloze kurzoru", () => {
		expect(nearestIndex(10, 5, BOX)).toBe(0);
		expect(nearestIndex(58, 5, BOX)).toBe(2);
		expect(nearestIndex(500, 5, BOX)).toBe(4);
		expect(nearestIndex(-20, 5, BOX)).toBe(0);
		expect(nearestIndex(50, 1, BOX)).toBe(0);
		expect(definedIndexes([null, 1, null, 2])).toEqual([1, 3]);
	});
});
