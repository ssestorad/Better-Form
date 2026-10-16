import { describe, expect, it } from "vitest";
import { isMonth, percentChange, previousMonth, renderMonthlySummary, renderWeeklySummary, weekSummaryInput } from "../../src/calc/monthlySummary";
import {
	heatmap,
	monthEnd,
	periodLabel,
	periodOf,
	periodStats,
	quartiles,
	shiftPeriod,
	workoutTonnage,
	type TonnageContext,
} from "../../src/calc/overview";
import type { WorkoutNote } from "../../src/model/types";

function workout(partial: Partial<WorkoutNote> & { date: string }): WorkoutNote {
	return { forma: "workout", schema: 1, sport: "strength", source: "manual", blocks: [], pain: [], ...partial };
}

const CTX: TonnageContext = {
	info: (exercise) =>
		exercise === "Kliky"
			? { kind: "grind", measure: "reps_bw", bodyweight_fraction: 0.64 }
			: exercise === "Plank"
				? { kind: "hold", measure: "seconds" }
				: { kind: "grind", measure: "reps_kg" },
	bodyweightKg: 80,
};

describe("období", () => {
	it("týden po–ne, měsíc a rok", () => {
		expect(periodOf("week", "2026-10-02")).toEqual({ kind: "week", from: "2026-09-28", to: "2026-10-04" });
		expect(periodOf("month", "2026-10-02")).toEqual({ kind: "month", from: "2026-10-01", to: "2026-10-31" });
		expect(periodOf("year", "2026-10-02")).toEqual({ kind: "year", from: "2026-01-01", to: "2026-12-31" });
		expect(monthEnd(2028, 2)).toBe("2028-02-29");
		expect(monthEnd(2026, 12)).toBe("2026-12-31");
	});

	it("posun období přes hranici roku", () => {
		expect(shiftPeriod(periodOf("month", "2026-01-15"), -1)).toEqual({ kind: "month", from: "2025-12-01", to: "2025-12-31" });
		expect(shiftPeriod(periodOf("month", "2026-12-15"), 1).from).toBe("2027-01-01");
		expect(shiftPeriod(periodOf("week", "2026-10-02"), -1).from).toBe("2026-09-21");
		expect(shiftPeriod(periodOf("year", "2026-10-02"), -1).to).toBe("2025-12-31");
	});

	it("popisky", () => {
		expect(periodLabel(periodOf("week", "2026-10-02"))).toBe("28. 9. – 4. 10. 2026");
		expect(periodLabel(periodOf("month", "2026-10-02"))).toBe("říjen 2026");
		expect(periodLabel(periodOf("year", "2026-10-02"))).toBe("2026");
	});
});

describe("objem posilovny", () => {
	it("pracovní série: kg × opakování; rozcvičení se nepočítá", () => {
		const w = workout({
			date: "2026-10-01",
			blocks: [{ type: "sets", exercise: "Bench press", sets: [{ reps: 10, kg: 40, warmup: true }, { reps: 5, kg: 100 }, { reps: 5, kg: 100 }, { reps: 5, kg: 100 }] }],
		});
		expect(workoutTonnage(w, CTX)).toBe(1500);
	});

	it("vlastní váha: 80 kg × 0,64 = 51,2 kg na opakování; EMOM; výdrž 0", () => {
		const w = workout({
			date: "2026-10-01",
			blocks: [
				{ type: "sets", exercise: "Kliky", sets: [{ reps: 10 }, { reps: 10 }] },
				{ type: "emom", exercise: "Kettlebell swing", minutes: 10, reps_per_min: 15, kg: 24 },
				{ type: "hold", exercise: "Plank", sets: [{ sec: 60 }] },
			],
		});
		expect(workoutTonnage(w, CTX)).toBeCloseTo(1024 + 3600, 6);
	});

	it("bez známé hmotnosti se vlastní váha nezapočítá", () => {
		const w = workout({ date: "2026-10-01", blocks: [{ type: "sets", exercise: "Kliky", sets: [{ reps: 10 }] }] });
		expect(workoutTonnage(w, { info: CTX.info })).toBe(0);
	});
});

describe("čísla za období", () => {
	const data = [
		workout({ date: "2026-09-28", sport: "run", rpe: 5, duration_min: 60, run: { distance_km: 10 } }),
		workout({ date: "2026-09-28", sport: "strength", rpe: 7, duration_min: 50, blocks: [{ type: "sets", exercise: "Dřep", sets: [{ reps: 5, kg: 100 }] }] }),
		workout({ date: "2026-10-01", sport: "swim", duration_min: 40, swim: { distance_m: 1500 } }),
		workout({ date: "2026-10-05", sport: "run", rpe: 5, duration_min: 30, run: { distance_km: 5 } }),
	];

	it("součty, sporty, dny a tréninky bez zátěže", () => {
		const stats = periodStats(data, "2026-09-28", "2026-10-04", CTX);
		expect(stats).toEqual({
			workouts: 3,
			bySport: { run: 1, strength: 1, swim: 1 },
			activeDays: 2,
			durationMin: 150,
			load: 650,
			missingLoad: 1,
			runKm: 10,
			swimM: 1500,
			tonnageKg: 500,
		});
	});

	it("prázdné období", () => {
		expect(periodStats(data, "2025-01-01", "2025-01-31", CTX).workouts).toBe(0);
	});
});

describe("heatmapa", () => {
	it("kvartily kladných hodnot", () => {
		expect(quartiles([100, 0, 200, 300, 400])).toEqual([175, 250, 325]);
		expect(quartiles([])).toEqual([0, 0, 0]);
	});

	it("sloupce po týdnech, úrovně a budoucí dny", () => {
		const loads = new Map([
			["2026-09-21", 100],
			["2026-09-23", 200],
			["2026-09-28", 300],
			["2026-10-01", 400],
		]);
		const grid = heatmap(loads, new Set(["2026-09-22", ...loads.keys()]), "2026-10-02", 2);
		expect(grid).toHaveLength(2);
		expect(grid[0]![0]).toEqual({ date: "2026-09-21", load: 100, level: 1, future: false, untracked: false });
		// trénink bez RPE: nejnižší úroveň s příznakem
		expect(grid[0]![1]).toMatchObject({ date: "2026-09-22", level: 1, untracked: true });
		expect(grid[0]![2]!.level).toBe(2);
		expect(grid[1]![0]!.level).toBe(3);
		expect(grid[1]![3]!.level).toBe(4);
		expect(grid[1]![4]).toMatchObject({ date: "2026-10-02", level: 0, future: false });
		expect(grid[1]![5]).toMatchObject({ date: "2026-10-03", future: true });
	});
});

describe("měsíční souhrn", () => {
	it("pomocné funkce", () => {
		expect(isMonth("2026-09")).toBe(true);
		expect(isMonth("2026-13")).toBe(false);
		expect(previousMonth("2026-01")).toBe("2025-12");
		expect(previousMonth("2026-10")).toBe("2026-09");
		expect(percentChange(112, 100)).toBe("+12 %");
		expect(percentChange(92, 100)).toBe("−8 %");
		expect(percentChange(100, 100)).toBe("beze změny");
		expect(percentChange(5, 0)).toBe("—");
	});

	it("tabulka se srovnáním, sporty a rekordy", () => {
		const stats = { workouts: 12, bySport: { run: 8, strength: 4 }, activeDays: 11, durationMin: 600, load: 3600, missingLoad: 1, runKm: 82.4, swimM: 0, tonnageKg: 15200 };
		const previous = { workouts: 10, bySport: { run: 10 }, activeDays: 10, durationMin: 500, load: 3000, missingLoad: 0, runKm: 80, swimM: 0, tonnageKg: 0 };
		const text = renderMonthlySummary({
			month: "2026-09",
			stats,
			previous,
			records: ["Běh 5 km – 24:31"],
			sleepAvgMin: 435,
			previousSleepAvgMin: null,
			weightChangeKg: -0.8,
		});
		expect(text).toContain("**Souhrn za září 2026**");
		expect(text).toContain("| Tréninky | 12 | 10 | +20 % |");
		expect(text).toContain("| Běh | 82,4 km | 80 km | +3 % |");
		expect(text).toContain("| Zvednuto | 15,2 t | 0 t | — |");
		expect(text).toContain("| Spánek (průměr) | 7 h 15 min | — | — |");
		expect(text).toContain("**Podle sportu:** běh 8× · posilovna 4×");
		expect(text).toContain("*1 trénink nemá RPE nebo délku");
		expect(text).toContain("**Hmotnost:** −0,8 kg za měsíc");
		expect(text).toContain("- Běh 5 km – 24:31");
		expect(text).not.toContain("Plavání");
	});

	it("týdenní souhrn: čísla proti minulému týdnu, plán a zátěž proti průměru", () => {
		const run = (date: string, km: number, min: number, rpe: number) => ({ forma: "workout" as const, schema: 1, date, sport: "run" as const, source: "manual" as const, duration_min: min, rpe, run: { distance_km: km }, blocks: [], pain: [] });
		const day = (date: string, kg: number) => ({ forma: "day" as const, schema: 1, date, sleep: { duration_min: 420 }, check_in: {}, hrv: {}, body: { weight_kg: kg }, supplements: [] });
		// Týden 5.–11. 10. 2026 (pondělí 5. 10.): dva běhy, 10 + 6 km, zátěž 60 × 5 + 40 × 7 = 580; minulý týden jeden běh 8 km, zátěž 50 × 4 = 200.
		const input = weekSummaryInput("2026-10-05", [run("2026-10-06", 10, 60, 5), run("2026-10-09", 6, 40, 7), run("2026-09-30", 8, 50, 4)], [day("2026-10-05", 81), day("2026-10-11", 80.4)], [], { info: () => undefined });
		expect(input.stats).toMatchObject({ workouts: 2, runKm: 16, load: 580 });
		expect(input.previous).toMatchObject({ workouts: 1, runKm: 8, load: 200 });
		expect(input.weightChangeKg).toBeCloseTo(-0.6, 9);
		const text = renderWeeklySummary({ ...input, week: "2026-10-05", plan: { planned: 4, done: 2, missed: 1, postponed: 1 }, averageLoad: 400 });
		expect(text).toContain("**Souhrn týdne 5. 10. – 11. 10. 2026**");
		expect(text).toContain("| | Tento týden | Minulý týden | Změna |");
		expect(text).toContain("| Tréninky | 2 | 1 | +100 % |");
		expect(text).toContain("| Běh | 16 km | 8 km | +100 % |");
		expect(text).toContain("**Plán:** splněno 2 z 4 · vynecháno 1 · odloženo 1");
		// 580 / 400 = 1,45
		expect(text).toContain("**Zátěž proti průměru:** 1,45× průměru čtyř předchozích týdnů (400 AU)");
		expect(text).toContain("**Hmotnost:** −0,6 kg za týden");
		// Bez plánu, průměru a tréninků zůstane jen nadpis a věta.
		const empty = { workouts: 0, bySport: {}, activeDays: 0, durationMin: 0, load: 0, missingLoad: 0, runKm: 0, swimM: 0, tonnageKg: 0 };
		const bare = renderWeeklySummary({ week: "2026-10-05", stats: empty, previous: empty, records: [], sleepAvgMin: null, previousSleepAvgMin: null, weightChangeKg: null, plan: null, averageLoad: null });
		expect(bare).toBe("**Souhrn týdne 5. 10. – 11. 10. 2026**\n\nV tomto týdnu není zapsaný žádný trénink.");
	});

	it("měsíc bez tréninku", () => {
		const empty = { workouts: 0, bySport: {}, activeDays: 0, durationMin: 0, load: 0, missingLoad: 0, runKm: 0, swimM: 0, tonnageKg: 0 };
		const text = renderMonthlySummary({ month: "2026-08", stats: empty, previous: empty, records: [], sleepAvgMin: null, previousSleepAvgMin: null, weightChangeKg: null });
		expect(text).toContain("není zapsaný žádný trénink");
		expect(text).toContain("V tomto měsíci žádný.");
	});
});
