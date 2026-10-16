import { describe, expect, it } from "vitest";
import { baseline, baselineSeries, daysInStatus, hrvBaseline, type BaselineOptions, type Sample } from "../../src/calc/hrv";
import { feelScore, formScore, readiness, sleepDurationScore, sleepScore } from "../../src/calc/readiness";
import { addDays } from "../../src/model/dates";

const OPTIONS: BaselineOptions = { windowDays: 7, baselineDays: 60, minSamples: 14, sdFactor: 0.5 };

function samples(start: string, values: number[]): Sample[] {
	return values.map((value, i) => ({ date: addDays(start, i), value }));
}

describe("osobní norma (8.8)", () => {
	// 7× 60, pak 7× 50: průměr 55, každá odchylka 5 → SD = √(350 / 13) = 5,189
	const data = samples("2026-09-01", [...Array(7).fill(60), ...Array(7).fill(50)]);

	it("průměr ± 0,5 SD a klouzavý průměr pod normou", () => {
		const b = baseline(data, "2026-09-14", OPTIONS);
		if (!b.ready) throw new Error("norma má být hotová");
		expect(b.mean).toBe(55);
		expect(b.sd).toBeCloseTo(5.1887, 3);
		expect(b.low).toBeCloseTo(52.406, 2);
		expect(b.high).toBeCloseTo(57.594, 2);
		expect(b.current).toBe(50);
		expect(b.status).toBe("below");
	});

	it("málo měření pro normu → sbírám data", () => {
		expect(baseline(data.slice(0, 13), "2026-09-13", OPTIONS)).toEqual({ ready: false, reason: "baseline", have: 13, need: 14 });
	});

	it("málo měření v posledních 7 dnech", () => {
		const b = baseline([...data, { date: "2026-09-25", value: 55 }], "2026-09-25", OPTIONS);
		expect(b).toEqual({ ready: false, reason: "window", have: 1, need: 3 });
	});

	it("měření starší než 60 dní do normy nepatří", () => {
		const b = baseline(data, "2026-11-20", OPTIONS);
		expect(b.ready).toBe(false);
	});

	it("HRV se počítá v logaritmu", () => {
		const b = hrvBaseline(data, "2026-09-14", OPTIONS);
		if (!b.ready) throw new Error("norma má být hotová");
		expect(b.current).toBeCloseTo(Math.log(50), 10);
		expect(b.status).toBe("below");
	});

	it("řada po dnech a počet dní pod normou", () => {
		const series = baselineSeries(data, "2026-09-13", "2026-09-14", OPTIONS);
		expect(series.map((p) => p.status)).toEqual([null, "below"]);
		expect(series[1]!.value).toBe(50);
		expect(daysInStatus(data, "2026-09-14", 7, "below", OPTIONS)).toBe(1);
	});
});

describe("připravenost (8.9)", () => {
	it("spánek: hodina pod cílem = −25 bodů", () => {
		expect(sleepDurationScore(420, 7)).toBe(100);
		expect(sleepDurationScore(480, 7)).toBe(100);
		expect(sleepDurationScore(360, 7)).toBe(75);
		expect(sleepDurationScore(300, 7)).toBe(50);
		expect(sleepDurationScore(60, 7)).toBe(0);
	});

	it("spánek: 60 % délka, 40 % kvalita, srážka pod osobním průměrem", () => {
		// 6 h → 75; kvalita 4/5 → 75
		expect(sleepScore({ durationMin: 360, quality: 4, averageMin: null }, 7)).toBe(75);
		expect(sleepScore({ durationMin: 360, quality: 4, averageMin: 450 }, 7)).toBe(65);
		expect(sleepScore({ durationMin: 360, averageMin: null }, 7)).toBe(75);
		expect(sleepScore({ quality: 5, averageMin: null }, 7)).toBe(100);
		expect(sleepScore({ averageMin: null }, 7)).toBeNull();
	});

	it("pocity a forma", () => {
		expect(feelScore({ fatigue: 3, soreness: 3, mood: 4, stress: 4 })).toBe(62.5);
		expect(feelScore({})).toBeNull();
		expect(formScore(50, -10)).toBe(40);
		expect(formScore(50, 0)).toBe(60);
		expect(formScore(50, 40)).toBe(100);
		expect(formScore(0, 0)).toBeNull();
	});

	it("složené skóre přepočítá váhy chybějících složek", () => {
		// HRV v normě 80 (váha 25), spánek 75 (25), pocity 62,5 (25), forma 40 (15); klidový tep chybí
		// (2000 + 1875 + 1562,5 + 600) / 90 = 67,08
		const result = readiness({
			hrv: { ready: true, current: 4, mean: 4, sd: 0.1, low: 3.95, high: 4.05, status: "within", samples: 20 },
			restingHr: null,
			sleep: { durationMin: 360, quality: 4, averageMin: null },
			checkIn: { fatigue: 3, soreness: 3, mood: 4, stress: 4 },
			form: { ctl: 50, tsb: -10 },
			sleepTargetHours: 7,
		})!;
		expect(result.score).toBe(67);
		expect(result.level).toBe("caution");
		expect(result.parts.map((p) => p.id)).toEqual(["hrv", "sleep", "feel", "form"]);
		expect(result.parts.reduce((s, p) => s + p.share, 0)).toBeCloseTo(1, 10);
		expect(result.missing).toEqual(["Klidový tep (7 dní vs. norma)"]);
	});

	it("klidový tep nad normou je špatně, HRV pod normou také", () => {
		const base = { ready: true as const, current: 0, mean: 0, sd: 1, low: -1, high: 1, samples: 20 };
		const result = readiness({
			hrv: { ...base, status: "below" },
			restingHr: { ...base, status: "above" },
			sleep: null,
			checkIn: null,
			form: null,
			sleepTargetHours: 7,
		})!;
		expect(result.parts.map((p) => p.score)).toEqual([30, 30]);
		expect(result.level).toBe("rest");
	});

	it("bez dat null", () => {
		expect(readiness({ hrv: null, restingHr: null, sleep: null, checkIn: null, form: null, sleepTargetHours: 7 })).toBeNull();
	});
});

describe("trend připravenosti (SPEC 8.9)", () => {
	const days = (scores: (number | null)[]) => scores.map((score, i) => ({ date: `2026-10-${String(i + 1).padStart(2, "0")}`, score }));

	it("průměr posledních 7 dnů proti 7 dnům před nimi", async () => {
		const { readinessTrend } = await import("../../src/calc/readiness");
		// Předchozí týden 50, 50, 60, 60, 50, 50, 60 → průměr 54,29; poslední týden 70 × 7 → 70.
		const trend = readinessTrend(days([50, 50, 60, 60, 50, 50, 60, 70, 70, 70, 70, 70, 70, 70]));
		expect(trend.samples).toBe(14);
		expect(trend.recent).toBe(70);
		expect(trend.previous).toBeCloseTo(54.286, 3);
		expect(trend.delta).toBeCloseTo(15.714, 3);
	});

	it("dny bez skóre se do průměru nepočítají; pod tři dny se průměr nepočítá", async () => {
		const { readinessTrend } = await import("../../src/calc/readiness");
		const trend = readinessTrend(days([null, null, null, null, null, 40, 60, null, 80, null, 60, null, 70, null]));
		// Poslední týden: 80, 60, 70 → 70; předchozí jen dvě hodnoty → nic.
		expect(trend.recent).toBe(70);
		expect(trend.previous).toBeNull();
		expect(trend.delta).toBeNull();
		expect(trend.samples).toBe(5);
		expect(readinessTrend(days([null, 50, 60])).recent).toBeNull();
		expect(readinessTrend([])).toMatchObject({ samples: 0, recent: null, previous: null, delta: null });
	});
});
