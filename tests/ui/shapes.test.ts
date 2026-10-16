import { describe, expect, it } from "vitest";
import { MUSCLES } from "../../src/model/constants";
import {
	BODY_SHAPES,
	FIGURE_HEIGHT,
	FIGURE_WIDTH,
	MUSCLE_SHAPES,
	pathPoints,
	shapeTransform,
	type PlacedShape,
} from "../../src/ui/body/shapes";

/** Krajní body tvaru v souřadnicích celé kresby (po posunu a zrcadlení). */
function placedBounds(item: PlacedShape): { minX: number; maxX: number; minY: number; maxY: number } {
	const { shape } = item;
	let points: [number, number][];
	if (shape.kind === "path") points = pathPoints(shape.d);
	else if (shape.kind === "ellipse") points = [[shape.cx - shape.rx, shape.cy - shape.ry], [shape.cx + shape.rx, shape.cy + shape.ry]];
	else points = [[shape.x, shape.y], [shape.x + shape.w, shape.y + shape.h]];
	const offset = item.side === "back" ? 220 : 0;
	const xs = points.map(([x]) => (item.mirrored ? 200 - x : x) + offset);
	const ys = points.map(([, y]) => y);
	return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

describe("panáček", () => {
	it("každá ze 14 partií má aspoň jeden tvar", () => {
		const drawn = new Set(MUSCLE_SHAPES.map((s) => s.muscle));
		for (const muscle of MUSCLES) expect(drawn, muscle).toContain(muscle);
		expect(drawn.size).toBe(14);
	});

	it("partie viditelné zepředu a zezadu podle návrhu", () => {
		const on = (side: "front" | "back") => [...new Set(MUSCLE_SHAPES.filter((s) => s.side === side).map((s) => s.muscle))].sort();
		expect(on("front")).toEqual(["abs", "biceps", "calves", "chest", "forearms", "obliques", "quads", "shoulders"]);
		expect(on("back")).toEqual(["calves", "forearms", "glutes", "hamstrings", "lats", "lowback", "shoulders", "traps", "triceps"]);
	});

	it("všechny tvary jsou uvnitř plátna a postavy se nepřekrývají", () => {
		for (const item of [...MUSCLE_SHAPES, ...BODY_SHAPES]) {
			const b = placedBounds(item);
			expect(b.minX).toBeGreaterThanOrEqual(item.side === "back" ? 220 : 0);
			expect(b.maxX).toBeLessThanOrEqual(item.side === "back" ? FIGURE_WIDTH : 200);
			expect(b.minY).toBeGreaterThanOrEqual(0);
			expect(b.maxY).toBeLessThanOrEqual(FIGURE_HEIGHT);
		}
	});

	it("párové partie mají levou i pravou (zrcadlenou) polovinu", () => {
		for (const side of ["front", "back"] as const) {
			for (const muscle of ["shoulders", "forearms", "calves"] as const) {
				const halves = MUSCLE_SHAPES.filter((s) => s.side === side && s.muscle === muscle).map((s) => s.mirrored);
				expect(halves.sort(), `${side} ${muscle}`).toEqual([false, true]);
			}
		}
	});

	it("transformace: zrcadlení kolem osy postavy, zadní postava posunutá o 220", () => {
		expect(shapeTransform({ side: "front", mirrored: false })).toBeUndefined();
		expect(shapeTransform({ side: "front", mirrored: true })).toBe("matrix(-1 0 0 1 200 0)");
		expect(shapeTransform({ side: "back", mirrored: false })).toBe("translate(220 0)");
		// x' = 420 − x: bod x = 53 levé paže se zobrazí na 367 = 220 + (200 − 53)
		expect(shapeTransform({ side: "back", mirrored: true })).toBe("matrix(-1 0 0 1 420 0)");
	});

	it("pathPoints čte dvojice souřadnic", () => {
		expect(pathPoints("M89,116 L111,116 C105,200 95,200 89,194 Z")).toEqual([
			[89, 116],
			[111, 116],
			[105, 200],
			[95, 200],
			[89, 194],
		]);
	});
});
