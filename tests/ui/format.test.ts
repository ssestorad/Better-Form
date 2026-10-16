import { describe, expect, it } from "vitest";
import {
	formatCzechDate,
	formatDays,
	formatDurationMin,
	formatNumber,
	formatSeconds,
	formatShortDate,
} from "../../src/ui/format";

describe("formátování", () => {
	it("čísla s desetinnou čárkou", () => {
		expect(formatNumber(78.4)).toBe("78,4");
		expect(formatNumber(80)).toBe("80");
		expect(formatNumber(82.5)).toBe("82,5");
		expect(formatNumber(103.2, 0)).toBe("103");
		expect(formatNumber(133.3333, 1)).toBe("133,3");
		expect(formatNumber(2.25, 2)).toBe("2,25");
		expect(formatNumber(-0.01)).toBe("0");
	});

	it("délka v minutách", () => {
		expect(formatDurationMin(435)).toBe("7 h 15 min");
		expect(formatDurationMin(480)).toBe("8 h");
		expect(formatDurationMin(45)).toBe("45 min");
		expect(formatDurationMin(0)).toBe("0 min");
	});

	it("délka v sekundách", () => {
		expect(formatSeconds(90)).toBe("1 min 30 s");
		expect(formatSeconds(300)).toBe("5 min");
		expect(formatSeconds(45)).toBe("45 s");
	});

	it("krátké datum se zkratkou dne", () => {
		expect(formatShortDate("2026-09-29")).toBe("út 29. 9.");
		expect(formatShortDate("2026-10-01")).toBe("čt 1. 10.");
	});

	it("české datum", () => {
		expect(formatCzechDate("2026-09-30")).toBe("středa 30. 9. 2026");
		expect(formatCzechDate("2026-10-04")).toBe("neděle 4. 10. 2026");
		expect(formatCzechDate("2026-09-28", false)).toBe("28. 9. 2026");
	});
});

describe("dny", () => {
	it("skloňování: den, dny, dní", () => {
		expect([0, 1, 2, 4, 5, 12].map(formatDays)).toEqual(["0 dní", "1 den", "2 dny", "4 dny", "5 dní", "12 dní"]);
	});
});
