import { describe, expect, it } from "vitest";
import { cadenceChart, dateRange, daySamples, hrvChart, loadChart, oneRmChart, paceChart, sleepChart } from "../../src/calc/chartData";
import { monthSummaryInput } from "../../src/calc/monthlySummary";
import { addDays } from "../../src/model/dates";
import type { DayNote, WorkoutNote } from "../../src/model/types";

function workout(partial: Partial<WorkoutNote> & { date: string }): WorkoutNote {
	return { forma: "workout", schema: 1, sport: "run", source: "manual", blocks: [], pain: [], ...partial };
}

function day(date: string, partial: Partial<DayNote> = {}): DayNote {
	return { forma: "day", schema: 1, date, sleep: {}, check_in: {}, hrv: {}, body: {}, ...partial };
}

describe("řady pro grafy", () => {
	const dates = dateRange("2026-09-01", "2026-09-04");

	it("dny období včetně krajů", () => {
		expect(dates).toEqual(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]);
	});

	it("zátěž a model: jedna hodnota na den", () => {
		const chart = loadChart(new Map([["2026-09-02", 100]]), dates, 42, 7);
		expect(chart.load).toEqual([0, 100, 0, 0]);
		expect(chart.ctl[0]).toBe(0);
		expect(chart.ctl[1]).toBeCloseTo(2.3528, 3);
		expect(chart.tsb[1]).toBeCloseTo(-10.9594, 3);
		expect(chart.atl).toHaveLength(4);
	});

	it("tempo: víc běhů v jednom dni se sečte; bez času z délky tréninku", () => {
		const runs = [
			workout({ date: "2026-09-01", run: { distance_km: 5, moving_time_s: 1500 } }),
			workout({ date: "2026-09-01", run: { distance_km: 5, moving_time_s: 1700 } }),
			workout({ date: "2026-09-03", duration_min: 60, run: { distance_km: 10 } }),
			workout({ date: "2026-09-04", run: { moving_time_s: 600 } }),
		];
		expect(paceChart(runs, dates)).toEqual([320, null, 360, null]);
	});

	it("1RM: nejčastější cviky s aspoň dvěma body", () => {
		const series = new Map([
			["Dřep", [{ date: "2026-09-01", oneRm: 100 }, { date: "2026-09-03", oneRm: 105 }, { date: "2026-08-01", oneRm: 90 }]],
			["Bench press", [{ date: "2026-09-02", oneRm: 80 }]],
			["Kliky", [{ date: "2026-09-01", reps: 30 }, { date: "2026-09-02", reps: 31 }]],
		]);
		expect(oneRmChart(series, dates)).toEqual([{ name: "Dřep", values: [100, null, 105, null] }]);
	});

	it("spánek v hodinách: zapsaná délka, jinak z časů", () => {
		const days = [day("2026-09-01", { sleep: { duration_min: 450 } }), day("2026-09-03", { sleep: { bedtime: "23:00", wake: "06:00" } })];
		expect(sleepChart(days, dates)).toEqual([7.5, null, 7, null]);
	});

	it("HRV: v ms, pásmo až po dosažení minima měření", () => {
		const days = Array.from({ length: 14 }, (_, i) => day(addDays("2026-09-01", i), { hrv: { rmssd_ms: i < 7 ? 60 : 50 } }));
		const samples = daySamples(days, (d) => d.hrv.rmssd_ms);
		const chart = hrvChart(samples, dateRange("2026-09-13", "2026-09-14"), { windowDays: 7, baselineDays: 60, minSamples: 14, sdFactor: 0.5 });
		expect(chart.value[0]).toBeCloseTo(50, 10);
		expect(chart.current[0]).toBeNull();
		expect(chart.current[1]).toBeCloseTo(50, 10);
		// geometrický průměr √(60 × 50) = 54,77 leží uvnitř pásma
		expect(chart.low[1]!).toBeLessThan(54.77);
		expect(chart.high[1]!).toBeGreaterThan(54.77);
	});
});

describe("vstup měsíčního souhrnu", () => {
	const ctx = { info: () => undefined };

	it("čísla měsíce, srovnání, rekordy překonané v měsíci, spánek a váha", () => {
		const workouts = [
			workout({ date: "2026-08-10", rpe: 5, duration_min: 30, run: { distance_km: 5, moving_time_s: 1600 } }),
			workout({ date: "2026-09-05", rpe: 6, duration_min: 26, run: { distance_km: 5, moving_time_s: 1500 } }),
			workout({ date: "2026-10-01", run: { distance_km: 5, moving_time_s: 1400 } }),
		];
		const days = [
			day("2026-09-01", { sleep: { duration_min: 420 }, body: { weight_kg: 80 } }),
			day("2026-09-20", { sleep: { duration_min: 480 }, body: { weight_kg: 79.2 } }),
		];
		const input = monthSummaryInput("2026-09", workouts, days, [], ctx);
		expect(input.stats.workouts).toBe(1);
		expect(input.previous.workouts).toBe(1);
		expect(input.stats.load).toBe(156);
		expect(input.records).toEqual(["Běh 5 km – 25:00"]);
		expect(input.sleepAvgMin).toBe(450);
		expect(input.previousSleepAvgMin).toBeNull();
		expect(input.weightChangeKg).toBeCloseTo(-0.8, 10);
	});
});

describe("cadenceChart", () => {
	it("průměr dne vážený časem běhu; dny bez kadence null", () => {
		const workouts = [
			workout({ date: "2026-10-01", run: { cadence_spm: 170, moving_time_s: 1800 } }),
			workout({ date: "2026-10-01", run: { cadence_spm: 180, moving_time_s: 600 } }),
			workout({ date: "2026-10-02", run: { distance_km: 5 } }),
			workout({ date: "2026-10-03", sport: "strength", run: { cadence_spm: 100 } }),
		];
		// (170 × 1800 + 180 × 600) / 2400 = 172,5
		expect(cadenceChart(workouts, ["2026-10-01", "2026-10-02", "2026-10-03"])).toEqual([172.5, null, null]);
	});
});
