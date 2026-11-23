import { describe, expect, it } from "vitest";
import { cycleState } from "../../src/calc/cycle";
import type { DayNote } from "../../src/model/types";

const day = (date: string, period = true): DayNote => ({ forma: "day", schema: 1, date, sleep: {}, check_in: {}, hrv: {}, body: {}, ...(period ? { period: true } : {}) });
const run = (start: string, count: number) => Array.from({ length: count }, (_, i) => {
	const d = new Date(`${start}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + i);
	return day(d.toISOString().slice(0, 10));
});

describe("menstruační cyklus", () => {
	it("bez zápisu není den cyklu ani průměr", () => {
		expect(cycleState([day("2026-11-01", false)], "2026-11-19")).toEqual({ day: null, start: null, cycles: 0, averageLength: null });
	});

	it("den cyklu od prvního dne poslední menstruace", () => {
		// začátek 8. 11., dnes 19. 11. → 11 dní rozdíl → 12. den cyklu
		expect(cycleState(run("2026-11-08", 5), "2026-11-19")).toMatchObject({ day: 12, start: "2026-11-08", cycles: 0, averageLength: null });
	});

	it("průměrná délka ze dvou celých cyklů", () => {
		// začátky 1. 9., 29. 9. (28 dní), 29. 10. (30 dní) → průměr 29; dnes 19. 11. = 22. den
		const days = [...run("2026-09-01", 5), ...run("2026-09-29", 4), ...run("2026-10-29", 5)];
		expect(cycleState(days, "2026-11-19")).toEqual({ day: 22, start: "2026-10-29", cycles: 2, averageLength: 29 });
	});

	it("mezera do 2 dnů je nezapsaný den téže menstruace, 3 a víc dní začíná nový cyklus", () => {
		// 1., 2., 4. 11. = jedna menstruace (mezera 2 dny); 7. 11. je o 3 dny později → nový začátek
		const days = [day("2026-11-01"), day("2026-11-02"), day("2026-11-04"), day("2026-11-07")];
		expect(cycleState(days, "2026-11-10")).toMatchObject({ start: "2026-11-07", day: 4, cycles: 1 });
		expect(cycleState(days.slice(0, 3), "2026-11-10")).toMatchObject({ start: "2026-11-01", day: 10 });
	});

	it("budoucí dny se nepočítají", () => {
		expect(cycleState([...run("2026-11-01", 3), day("2026-12-01")], "2026-11-19")).toMatchObject({ start: "2026-11-01", day: 19 });
	});
});
