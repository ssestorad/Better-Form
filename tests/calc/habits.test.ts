import { describe, expect, it } from "vitest";
import { habitImpact } from "../../src/calc/habits";
import { addDays } from "../../src/model/dates";
import type { DayNote } from "../../src/model/types";

const day = (date: string, hrv: number, habits?: string[]): DayNote => ({ forma: "day", schema: 1, date, sleep: {}, check_in: {}, hrv: { rmssd_ms: hrv }, body: {}, habits });

describe("deník návyků", () => {
	it("porovná ráno po dni s návykem a bez něj (min. 5 + 5)", () => {
		// 20 dní: sudé dny alkohol → další (lichý) den HRV 50; liché bez → další den HRV 60.
		const start = "2026-10-01";
		const days: DayNote[] = [];
		for (let i = 0; i < 20; i++) {
			const date = addDays(start, i);
			days.push(day(date, i % 2 === 1 ? 50 : 60, i % 2 === 0 ? ["Alcohol"] : []));
		}
		const [alcohol] = habitImpact(days, ["alcohol"], "2026-10-21");
		expect(alcohol!.yesDays).toBe(10);
		expect(alcohol!.noDays).toBe(10);
		const hrv = alcohol!.effects.find((e) => e.metric === "hrv")!;
		// Ano: 10 rán s HRV 50; ne: 9 rán s HRV 60 (po posledním dni ráno chybí).
		expect(hrv.yes).toBe(50);
		expect(hrv.no).toBe(60);
		expect(hrv.pct).toBeCloseTo(-16.67, 1);
		expect(hrv.worse).toBe(true);
	});

	it("málo dní nebo dny před prvním zápisem – bez výsledku", () => {
		const days = [day("2026-10-01", 60), day("2026-10-02", 50, ["Alcohol"]), day("2026-10-03", 55), day("2026-10-04", 58, [])];
		const [r] = habitImpact(days, ["Alcohol"], "2026-10-05");
		expect(r!.yesDays).toBe(1);
		expect(r!.noDays).toBe(2); // 1. 10. je před prvním zápisem
		expect(r!.effects).toEqual([]);
	});
});
