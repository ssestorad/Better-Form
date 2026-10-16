import { describe, expect, it } from "vitest";
import {
	applyCheckIn,
	checkInFromDay,
	finalizeCheckIn,
	hasCheckIn,
	initialCheckIn,
	lastValues,
	sleepTimeDate,
	validateCheckIn,
} from "../../src/calc/checkIn";
import { parseDay } from "../../src/model/parse";
import type { DayNote } from "../../src/model/types";

function day(date: string, overrides: Partial<DayNote> = {}): DayNote {
	return { forma: "day", schema: 1, date, sleep: {}, check_in: {}, hrv: {}, body: {}, ...overrides };
}

describe("validace check-inu", () => {
	it("platné hodnoty", () => {
		expect(
			validateCheckIn({ date: "2026-09-30", quality: 4, fatigue: 1, rmssd_ms: 62.5, resting_hr: 52, weight_kg: 78.4 }),
		).toEqual({});
	});

	it("mimo rozsah, necelé číslo, NaN, datum", () => {
		expect(
			validateCheckIn({ date: "2026-02-30", quality: 6, awakenings: 1.5, rmssd_ms: Number.NaN, weight_kg: 20 }),
		).toEqual({
			date: "Neplatné datum.",
			quality: "Rozsah 1–5.",
			awakenings: "Zadej celé číslo.",
			rmssd_ms: "Není číslo.",
			weight_kg: "Rozsah 30–250.",
		});
	});
});

describe("časy spánku a dny", () => {
	it("check-in 30. 9. = noc z 29. na 30. 9.", () => {
		expect(sleepTimeDate("2026-09-30", "wake", "06:40")).toBe("2026-09-30");
		expect(sleepTimeDate("2026-09-30", "bedtime", "23:10")).toBe("2026-09-29");
		expect(sleepTimeDate("2026-09-30", "sleep_onset", "23:25")).toBe("2026-09-29");
		// usnutí po půlnoci patří už ke dni check-inu
		expect(sleepTimeDate("2026-09-30", "sleep_onset", "00:30")).toBe("2026-09-30");
		// hranice poledne
		expect(sleepTimeDate("2026-09-30", "bedtime", "12:00")).toBe("2026-09-29");
		expect(sleepTimeDate("2026-09-30", "bedtime", "11:59")).toBe("2026-09-30");
		// přes začátek měsíce
		expect(sleepTimeDate("2026-10-01", "bedtime", "22:00")).toBe("2026-09-30");
	});

	it("usnutí musí být mezi ulehnutím a vstáváním", () => {
		const base = { date: "2026-09-30", bedtime: "23:10", wake: "06:40" };
		// ulehnutí → usnutí 15 min, v posteli 450 min
		expect(validateCheckIn({ ...base, sleep_onset: "23:25" })).toEqual({});
		// po půlnoci: 80 min < 450 min
		expect(validateCheckIn({ ...base, sleep_onset: "00:30" })).toEqual({});
		// po vstávání: 470 min ≥ 450 min
		expect(validateCheckIn({ ...base, sleep_onset: "07:00" }).sleep_onset).toBeDefined();
		// před ulehnutím: 22:00 je z pohledu 23:10 až za 1370 min
		expect(validateCheckIn({ ...base, sleep_onset: "22:00" }).sleep_onset).toBeDefined();
		// bez ulehnutí se pořadí nekontroluje
		expect(validateCheckIn({ date: "2026-09-30", sleep_onset: "07:00", wake: "06:40" })).toEqual({});
	});
});

describe("délka spánku", () => {
	it("dopočítá se z časů (23:25 → 06:40 = 435 min)", () => {
		expect(finalizeCheckIn({ date: "2026-09-30", bedtime: "23:10", sleep_onset: "23:25", wake: "06:40" }).duration_min).toBe(
			435,
		);
	});

	it("ruční přepsání má přednost", () => {
		expect(finalizeCheckIn({ date: "2026-09-30", bedtime: "23:10", wake: "06:40", duration_min: 400 }).duration_min).toBe(
			400,
		);
	});

	it("bez časů a přepsání se délka neuloží", () => {
		expect("duration_min" in finalizeCheckIn({ date: "2026-09-30", quality: 3 })).toBe(false);
	});
});

describe("zápis do frontmatteru", () => {
	it("nová poznámka: doplní forma, schema, date a sekce podle SPEC 4.1", () => {
		const fm: Record<string, unknown> = {};
		applyCheckIn(
			fm,
			finalizeCheckIn({
				date: "2026-09-28",
				bedtime: "23:10",
				sleep_onset: "23:25",
				wake: "06:40",
				quality: 4,
				awakenings: 1,
				morning_feeling: 3,
				fatigue: 3,
				soreness: 3,
				mood: 4,
				stress: 3,
				rmssd_ms: 62,
				resting_hr: 52,
				elonga_readiness: 71,
				weight_kg: 78.4,
			}),
		);
		expect(fm).toEqual({
			forma: "day",
			schema: 1,
			date: "2026-09-28",
			sleep: {
				bedtime: "23:10",
				sleep_onset: "23:25",
				wake: "06:40",
				duration_min: 435,
				quality: 4,
				awakenings: 1,
				morning_feeling: 3,
			},
			check_in: { fatigue: 3, soreness: 3, mood: 4, stress: 3 },
			hrv: { rmssd_ms: 62, resting_hr: 52, elonga_readiness: 71 },
			body: { weight_kg: 78.4 },
		});
	});

	it("zachová cizí klíče, smaže vyprázdněná pole a prázdné sekce", () => {
		const fm: Record<string, unknown> = {
			forma: "day",
			schema: 1,
			date: "2026-09-28",
			tags: ["deník"],
			sleep: { quality: 2, dream: "let" },
			hrv: { rmssd_ms: 50 },
			body: { weight_kg: 80, body_fat_pct: 15, neck_cm: 38 },
			notes: "Můj text",
		};
		// Podíl tuku je pole check-inu – když ho formulář pošle, zůstane; cizí klíč (obvod krku) zůstane vždy.
		applyCheckIn(fm, { date: "2026-09-28", quality: 4, weight_kg: 79, body_fat_pct: 15 });
		expect(fm).toEqual({
			forma: "day",
			schema: 1,
			date: "2026-09-28",
			tags: ["deník"],
			sleep: { quality: 4, dream: "let" },
			body: { weight_kg: 79, body_fat_pct: 15, neck_cm: 38 },
			notes: "Můj text",
		});
	});

	it("uložené hodnoty se načtou zpět stejné", () => {
		const values = finalizeCheckIn({ date: "2026-09-28", bedtime: "23:10", wake: "06:40", fatigue: 2, rmssd_ms: 61.5 });
		const fm: Record<string, unknown> = {};
		applyCheckIn(fm, values);
		const parsed = parseDay(fm)!;
		expect(parsed.sleep).toEqual({ bedtime: "23:10", wake: "06:40", duration_min: 450 });
		expect(parsed.check_in).toEqual({ fatigue: 2 });
		expect(parsed.hrv).toEqual({ rmssd_ms: 61.5 });
	});
});

describe("hodnoty z minula a výchozí formulář", () => {
	const history = [
		day("2026-09-27", { sleep: { bedtime: "22:30", wake: "06:00" }, hrv: { rmssd_ms: 55 }, body: { weight_kg: 79 } }),
		day("2026-09-28", { sleep: { bedtime: "23:10", wake: "06:40", quality: 4 }, hrv: { rmssd_ms: 62 } }),
		day("2026-09-30", { hrv: { rmssd_ms: 70 } }),
	];

	it("poslední známá hodnota každého pole před datem", () => {
		expect(lastValues(history, "2026-09-29")).toEqual({
			bedtime: "23:10",
			wake: "06:40",
			quality: 4,
			rmssd_ms: 62,
			weight_kg: 79,
		});
	});

	it("nový check-in: předvyplní jen časy spánku z minula", () => {
		expect(initialCheckIn("2026-09-29", undefined, history)).toEqual({
			date: "2026-09-29",
			bedtime: "23:10",
			wake: "06:40",
		});
	});

	it("existující check-in: načte ho; délka rovná dopočtu není přepsání", () => {
		const existing = day("2026-09-28", {
			sleep: { bedtime: "23:10", wake: "06:40", duration_min: 450 },
			check_in: { mood: 4 },
			body: { weight_kg: 78.4, body_fat_pct: 15, waist_cm: 82.5 },
		});
		expect(hasCheckIn(existing)).toBe(true);
		// Tělesné míry a podíl tuku se načtou taky – jinak by je uložení check-inu smazalo.
		expect(initialCheckIn("2026-09-28", existing, history)).toEqual({
			date: "2026-09-28",
			bedtime: "23:10",
			wake: "06:40",
			mood: 4,
			weight_kg: 78.4,
			body_fat_pct: 15,
			waist_cm: 82.5,
		});
		expect(validateCheckIn({ date: "2026-09-28", waist_cm: 20, body_fat_pct: 70, arm_cm: 36.5 })).toEqual({ waist_cm: "Rozsah 40–200.", body_fat_pct: "Rozsah 3–60." });
		const overridden = day("2026-09-28", { sleep: { bedtime: "23:10", wake: "06:40", duration_min: 400 } });
		expect(checkInFromDay(overridden).duration_min).toBe(400);
	});

	it("den bez vyplněných údajů = bez check-inu", () => {
		expect(hasCheckIn(day("2026-09-29"))).toBe(false);
		expect(hasCheckIn(undefined)).toBe(false);
	});
});
