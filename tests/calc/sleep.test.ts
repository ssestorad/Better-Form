import { describe, expect, it } from "vitest";
import { clockSpreadMin, minutesBetween, sleepDurationMin, sleepWeek } from "../../src/calc/sleep";
import type { DayNote, SleepData } from "../../src/model/types";

describe("spánek", () => {
	it("příklad ze SPEC 4.1: usnul 23:25, vstal 06:40 → 435 min", () => {
		// 23:25 → 24:00 = 35 min, 00:00 → 06:40 = 400 min, celkem 435 min (7 h 15 min)
		expect(sleepDurationMin({ bedtime: "23:10", sleep_onset: "23:25", wake: "06:40" })).toBe(435);
	});

	it("bez odhadu usnutí se počítá od ulehnutí", () => {
		// 23:10 → 06:40 = 50 + 400 = 450 min
		expect(sleepDurationMin({ bedtime: "23:10", wake: "06:40" })).toBe(450);
	});

	it("spánek po půlnoci a odpolední spánek", () => {
		// 00:30 → 07:00 = 390 min
		expect(sleepDurationMin({ sleep_onset: "00:30", wake: "07:00" })).toBe(390);
		// 13:00 → 13:30 = 30 min
		expect(sleepDurationMin({ bedtime: "13:00", wake: "13:30" })).toBe(30);
	});

	it("chybějící údaje nebo nulová délka = null", () => {
		expect(sleepDurationMin({ bedtime: "23:00" })).toBeNull();
		expect(sleepDurationMin({ wake: "07:00" })).toBeNull();
		expect(sleepDurationMin({ bedtime: "07:00", wake: "07:00" })).toBeNull();
		expect(sleepDurationMin({ bedtime: "7 hodin", wake: "07:00" })).toBeNull();
	});

	it("minutesBetween přes půlnoc", () => {
		expect(minutesBetween("22:00", "06:00")).toBe(480);
		expect(minutesBetween("06:00", "22:00")).toBe(960);
	});
});

describe("týden spánku", () => {
	const night = (date: string, sleep: SleepData): DayNote => ({ forma: "day", schema: 1, date, sleep, check_in: {}, hrv: {}, body: {} });
	const today = "2026-10-19";

	it("rozptyl časů přes půlnoc: 23:30, 0:30, 23:30, 0:30 → ±34,6 min", () => {
		// posuny od 23:30: 0, 60, 0, 60 → průměr 30, výběrová SD = √(4 × 30² / 3) = 34,64
		expect(clockSpreadMin(["23:30", "00:30", "23:30", "00:30"])).toBeCloseTo(34.64, 2);
		expect(clockSpreadMin(["07:00", "07:00"])).toBe(0);
		expect(clockSpreadMin(["07:00"])).toBeNull();
	});

	it("rozptyl kolem kruhového průměru – výjimečná první noc nerozbije ostatní", () => {
		// průměrný směr 13:00, 23:00, 01:00 je 23:00 → posuny −600, 0, +120 min;
		// průměr −160, odchylky −440, 160, 280 → √((193 600 + 25 600 + 78 400) / 2) = 385,75
		expect(clockSpreadMin(["13:00", "23:00", "01:00"])).toBeCloseTo(385.75, 1);
	});

	it("dluh za 7 nocí proti cíli 7 h, starší noci se nepočítají", () => {
		const days = [
			night("2026-10-19", { duration_min: 360 }), // −60
			night("2026-10-18", { sleep_onset: "23:00", wake: "07:30" }), // 510, nad cílem
			night("2026-10-17", { duration_min: 390 }), // −30
			night("2026-10-16", { duration_min: 420 }), // přesně cíl
			night("2026-10-13", { duration_min: 300 }), // −120 (7. noc zpět)
			night("2026-10-12", { duration_min: 100 }), // 8. noc – mimo
		];
		const week = sleepWeek(days, today, 420);
		expect(week.nights).toBe(5);
		expect(week.debtMin).toBe(210);
		// (360 + 510 + 390 + 420 + 300) / 5 = 396
		expect(week.averageMin).toBe(396);
		expect(week.shortNights).toBe(3);
	});

	it("málo dat: pod 4 nocemi dluh ani průměr, pod 4 časy rozptyl ne", () => {
		const days = [night("2026-10-19", { bedtime: "23:00", wake: "06:00" }), night("2026-10-18", { duration_min: 400, wake: "06:30" }), night("2026-10-17", { wake: "06:00" })];
		const week = sleepWeek(days, today, 420);
		expect(week.nights).toBe(2);
		expect(week.debtMin).toBeNull();
		expect(week.averageMin).toBeNull();
		expect(week.wakeSpreadMin).toBeNull();
		expect(week.onsetSpreadMin).toBeNull();
	});

	it("usnutí bere odhad usnutí, jinak ulehnutí", () => {
		const days = ["2026-10-19", "2026-10-18", "2026-10-17", "2026-10-16"].map((d, i) =>
			night(d, i % 2 === 0 ? { sleep_onset: "23:00" } : { bedtime: "23:00" }),
		);
		expect(sleepWeek(days, today, 420).onsetSpreadMin).toBe(0);
	});
});
