import { describe, expect, it } from "vitest";
import { minutesBetween, sleepDurationMin } from "../../src/calc/sleep";

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
