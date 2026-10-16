import { describe, expect, it } from "vitest";
import {
	addDays,
	daysBetween,
	isIsoDate,
	minutesOfDay,
	normalizeClockTime,
	toIsoDate,
	weekdayOf,
} from "../../src/model/dates";
import { parseLink, toLink } from "../../src/model/links";

describe("datumy a časy", () => {
	it("isIsoDate hlídá skutečné datum včetně přestupného roku", () => {
		expect(isIsoDate("2028-02-29")).toBe(true);
		expect(isIsoDate("2026-02-29")).toBe(false);
		expect(isIsoDate("2026-13-01")).toBe(false);
		expect(isIsoDate("2026-9-28")).toBe(false);
	});

	it("toIsoDate používá místní čas", () => {
		expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
	});

	it("addDays přes konec měsíce, roku a změnu času", () => {
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
		expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
		// 29. 3. 2026 se v ČR mění čas
		expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
		expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
	});

	it("daysBetween", () => {
		expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
		expect(daysBetween("2026-09-30", "2026-09-28")).toBe(-2);
		expect(daysBetween("2026-01-01", "2027-01-01")).toBe(365);
	});

	it("weekdayOf", () => {
		expect(weekdayOf("2026-09-28")).toBe("mon");
		expect(weekdayOf("2026-09-29")).toBe("tue");
		expect(weekdayOf("2026-10-04")).toBe("sun");
	});

	it("minutesOfDay", () => {
		expect(minutesOfDay("06:40")).toBe(400);
		expect(minutesOfDay("0:00")).toBe(0);
		expect(minutesOfDay("x")).toBeNull();
	});

	it("normalizeClockTime", () => {
		expect(normalizeClockTime("6:40")).toBe("06:40");
		expect(normalizeClockTime(" 23:10 ")).toBe("23:10");
		expect(normalizeClockTime("24:00")).toBeNull();
		expect(normalizeClockTime("12:60")).toBeNull();
		expect(normalizeClockTime("1230")).toBeNull();
	});
});

describe("wikiodkazy", () => {
	it("parseLink odstraní závorky, popisek a kotvu", () => {
		expect(parseLink("[[Bench press]]")).toBe("Bench press");
		expect(parseLink("[[Kliky|push-upy]]")).toBe("Kliky");
		expect(parseLink("[[Shyby#Technika]]")).toBe("Shyby");
		expect(parseLink("Dřepy")).toBe("Dřepy");
		expect(parseLink("[[]]")).toBe("");
	});

	it("toLink", () => {
		expect(toLink("Bench press")).toBe("[[Bench press]]");
	});
});
