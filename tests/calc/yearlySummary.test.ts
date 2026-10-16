import { describe, expect, it } from "vitest";
import { isYear, renderYearlySummary, yearSummaryInput } from "../../src/calc/yearlySummary";
import type { DayNote, WorkoutNote } from "../../src/model/types";

function workout(date: string, partial: Partial<WorkoutNote> = {}): WorkoutNote {
	return { forma: "workout", schema: 1, date, sport: "run", source: "manual", blocks: [], pain: [], ...partial };
}
function day(date: string, partial: Partial<DayNote> = {}): DayNote {
	return { forma: "day", schema: 1, date, sleep: {}, check_in: {}, hrv: {}, body: {}, ...partial };
}
const ctx = { info: () => undefined };

// 2026: leden 2 běhy, březen 3 tréninky v jednom týdnu (po 9. 3. – ne 15. 3.), říjen 1 plavání. 2025: 1 běh.
const workouts = [
	workout("2025-06-01", { duration_min: 30, rpe: 5, run: { distance_km: 5 } }),
	workout("2026-01-05", { duration_min: 40, rpe: 4, run: { distance_km: 8 } }),
	workout("2026-01-20", { duration_min: 95, rpe: 5, run: { distance_km: 18.5 } }),
	workout("2026-03-09", { sport: "strength", duration_min: 60, rpe: 7 }),
	workout("2026-03-11", { duration_min: 30, rpe: 6, run: { distance_km: 5 } }),
	workout("2026-03-14", { sport: "strength", duration_min: 120 }),
	workout("2026-10-02", { sport: "swim", duration_min: 45, rpe: 4, swim: { distance_m: 1500 } }),
];
const days = [day("2026-01-03", { sleep: { duration_min: 420 }, body: { weight_kg: 82 } }), day("2026-06-01", { sleep: { duration_min: 480 } }), day("2026-10-01", { body: { weight_kg: 79.5 } })];

describe("roční souhrn (SPEC 9.5)", () => {
	const input = yearSummaryInput(2026, workouts, days, [], ctx);

	it("součty roku, loňska a měsíců", () => {
		expect(input.stats).toMatchObject({ workouts: 6, activeDays: 6, durationMin: 390, runKm: 31.5, swimM: 1500, missingLoad: 1 });
		// Zátěž: 40×4 + 95×5 + 60×7 + 30×6 + 45×4 = 160 + 475 + 420 + 180 + 180 = 1415 (trénink bez RPE se nepočítá).
		expect(input.stats.load).toBe(1415);
		expect(input.previous).toMatchObject({ workouts: 1, runKm: 5 });
		expect(input.months).toHaveLength(12);
		expect(input.months.map((m) => m.stats.workouts)).toEqual([2, 0, 3, 0, 0, 0, 0, 0, 0, 1, 0, 0]);
		expect(input.months[0]!.month).toBe("2026-01");
	});

	it("nej roku, spánek a hmotnost", () => {
		expect(input.longestRun).toEqual({ km: 18.5, date: "2026-01-20" });
		expect(input.longestWorkout).toEqual({ minutes: 120, date: "2026-03-14" });
		expect(input.bestWeek).toEqual({ workouts: 3, from: "2026-03-09" });
		expect(input.sleepAvgMin).toBe(450);
		expect(input.previousSleepAvgMin).toBeNull();
		expect(input.weightChangeKg).toBeCloseTo(-2.5, 6);
	});

	it("text souhrnu", () => {
		const text = renderYearlySummary(input);
		expect(text).toContain("**Rok 2026 v číslech**");
		expect(text).toContain("| Tréninky | 6 | 1 | +500 % |");
		expect(text).toContain("| Běh | 31,5 km | 5 km | +530 % |");
		expect(text).toContain("| Plavání | 1,5 km | 0 km | — |");
		expect(text).toContain("| Spánek (průměr) | 7 h 30 min | — | — |");
		expect(text).toContain("**Podle sportu:** běh 3× · posilovna 2× · plavání 1×");
		expect(text).toContain("*1 trénink nemá RPE nebo délku – do zátěže se nepočítá.*");
		expect(text).toContain("| Měsíc | Tréninky | Čas | Běh | Zátěž |");
		expect(text).toContain("| leden | 2 | 2 h 15 min | 26,5 km | 635 |");
		expect(text).toContain("| únor | — | — | — | — |");
		expect(text).toContain("- Nejaktivnější měsíc: březen (3 tréninky)");
		expect(text).toContain("- Nejvíc tréninků za týden: 3 (týden od po 9. 3.)");
		expect(text).toContain("- Nejdelší běh: 18,5 km (út 20. 1.)");
		expect(text).toContain("- Nejdelší trénink: 2 h (so 14. 3.)");
		expect(text).toContain("**Hmotnost:** −2,5 kg od prvního do posledního vážení v roce");
		expect(text).toContain("**Nové rekordy**");
		expect(text).not.toMatch(/NaN|undefined/);
	});

	it("rok bez tréninků a platnost roku", () => {
		const empty = renderYearlySummary(yearSummaryInput(2024, workouts, days, [], ctx));
		expect(empty).toBe("**Rok 2024 v číslech**\n\nV tomto roce není zapsaný žádný trénink.");
		expect(isYear(2026)).toBe(true);
		expect(isYear(26)).toBe(false);
		expect(isYear(Number.NaN)).toBe(false);
	});
});
