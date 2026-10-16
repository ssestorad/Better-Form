import { describe, expect, it } from "vitest";
import { dailyLoads, dailyLoadSeries, sessionLoad } from "../../src/calc/load";

describe("sessionLoad – session RPE (Foster 2001)", () => {
	it("RPE × minuty", () => {
		// 7 × 62 = 434 AU
		expect(sessionLoad(7, 62)).toBe(434);
		// 4 × 45 = 180 AU
		expect(sessionLoad(4, 45)).toBe(180);
		expect(sessionLoad(0, 30)).toBe(0);
		// 2,5 × 40 = 100 AU (CR-10 připouští i desetinné hodnoty)
		expect(sessionLoad(2.5, 40)).toBe(100);
	});

	it("chybějící nebo neplatné vstupy = null", () => {
		expect(sessionLoad(undefined, 60)).toBeNull();
		expect(sessionLoad(7, undefined)).toBeNull();
		expect(sessionLoad(11, 60)).toBeNull();
		expect(sessionLoad(-1, 60)).toBeNull();
		expect(sessionLoad(7, -5)).toBeNull();
		expect(sessionLoad(Number.NaN, 60)).toBeNull();
	});
});

describe("denní zátěž", () => {
	const workouts = [
		{ date: "2026-09-28", rpe: 7, duration_min: 62 }, // 434
		{ date: "2026-09-28", rpe: 5, duration_min: 30 }, // 150
		{ date: "2026-09-29", rpe: 3, duration_min: 40 }, // 120
		{ date: "2026-09-29", duration_min: 50 }, // bez RPE
		{ date: "2026-09-26", rpe: 8, duration_min: 90 }, // 720
	];

	it("součet za den a počet nedoplněných tréninků", () => {
		const { byDate, missing } = dailyLoads(workouts);
		// 434 + 150 = 584
		expect(byDate.get("2026-09-28")).toBe(584);
		expect(byDate.get("2026-09-29")).toBe(120);
		expect(byDate.get("2026-09-26")).toBe(720);
		expect(byDate.has("2026-09-27")).toBe(false);
		expect(missing).toBe(1);
	});

	it("souvislá řada s nulami ve dnech bez tréninku", () => {
		const { byDate } = dailyLoads(workouts);
		expect(dailyLoadSeries(byDate, "2026-09-26", "2026-09-29")).toEqual([
			{ date: "2026-09-26", load: 720 },
			{ date: "2026-09-27", load: 0 },
			{ date: "2026-09-28", load: 584 },
			{ date: "2026-09-29", load: 120 },
		]);
		expect(dailyLoadSeries(byDate, "2026-09-29", "2026-09-28")).toEqual([]);
	});
});
