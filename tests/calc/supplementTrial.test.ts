import { describe, expect, it } from "vitest";
import { personalTrial } from "../../src/calc/supplementTrial";
import { addDays } from "../../src/model/dates";

describe("osobní test (N-of-1)", () => {
	const day = (date: string, quality: number | undefined, mood?: number) => ({ date, sleep: { quality, duration_min: 420 }, check_in: { mood } });
	const series = (from: string, count: number, quality: number, mood?: number) =>
		Array.from({ length: count }, (_, i) => day(addDays(from, i), quality, mood));

	it("4 týdny před proti období užívání", () => {
		const days = [...series("2026-08-01", 28, 3), ...series("2026-08-29", 30, 4)];
		const result = personalTrial(days, "2026-08-29", "2026-09-27", "sleep_quality");
		expect(result).toEqual({ ready: true, before: 3, during: 4, diff: 1, samplesBefore: 28, samplesDuring: 30, daysDuring: 30 });
		expect(personalTrial(days, "2026-08-29", "2026-09-27", "sleep_duration")).toMatchObject({ ready: true, before: 7, during: 7, diff: 0 });
	});

	it("období užívání nejvýš 8 týdnů; starší měření se nepočítají", () => {
		const days = [...series("2026-08-01", 28, 3), ...series("2026-08-29", 56, 4), ...series("2026-10-24", 10, 1)];
		const result = personalTrial(days, "2026-08-29", "2026-11-30", "sleep_quality");
		expect(result).toMatchObject({ ready: true, during: 4, samplesDuring: 56, daysDuring: 56 });
	});

	it("málo dní nebo měření → sbírám data", () => {
		const days = [...series("2026-08-01", 28, 3), ...series("2026-08-29", 10, 4)];
		expect(personalTrial(days, "2026-08-29", "2026-09-07", "sleep_quality")).toEqual({ ready: false, daysDuring: 10, samplesDuring: 10, samplesBefore: 28 });
		expect(personalTrial(series("2026-08-29", 30, 4, 4), "2026-08-29", "2026-09-27", "mood")).toMatchObject({ ready: false, samplesBefore: 0 });
	});
});
