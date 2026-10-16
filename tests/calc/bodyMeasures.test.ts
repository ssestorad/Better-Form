import { describe, expect, it } from "vitest";
import { BODY_MEASURES, bodyMeasureRows } from "../../src/calc/bodyMeasures";
import { CHECK_IN_NUMBERS } from "../../src/calc/checkIn";
import { parseDay } from "../../src/model/parse";
import type { DayNote } from "../../src/model/types";

function day(date: string, body: DayNote["body"]): DayNote {
	return { forma: "day", schema: 1, date, sleep: {}, check_in: {}, hrv: {}, body };
}

describe("tělesné míry", () => {
	const days = [
		day("2026-08-01", { weight_kg: 82, waist_cm: 88, arm_cm: 35 }),
		day("2026-09-01", { waist_cm: 86.5 }),
		day("2026-10-01", { waist_cm: 85, body_fat_pct: 17.5 }),
		day("2026-10-20", { waist_cm: 84 }), // po „dnešku“
	];

	it("poslední hodnota, změna od minula a od prvního měření", () => {
		const rows = bodyMeasureRows(days, "2026-10-05");
		expect(rows.map((r) => r.id)).toEqual(["body_fat_pct", "waist_cm", "arm_cm"]);
		const waist = rows.find((r) => r.id === "waist_cm")!;
		// 85 − 86,5 = −1,5 cm za 30 dní; od prvního měření 85 − 88 = −3 cm za 61 dní.
		expect(waist).toMatchObject({ label: "Pas", unit: "cm", value: 85, date: "2026-10-01", count: 3 });
		expect(waist.previous).toEqual({ change: -1.5, days: 30 });
		expect(waist.first).toEqual({ change: -3, days: 61 });
	});

	it("jedno měření nemá s čím srovnat; dvě mají jen „od minula“", () => {
		const rows = bodyMeasureRows(days, "2026-10-05");
		expect(rows.find((r) => r.id === "arm_cm")).toMatchObject({ value: 35, count: 1, previous: null, first: null });
		const two = bodyMeasureRows(days, "2026-09-15").find((r) => r.id === "waist_cm")!;
		expect(two.previous).toEqual({ change: -1.5, days: 31 });
		expect(two.first).toBeNull();
		expect(bodyMeasureRows([], "2026-10-05")).toEqual([]);
	});

	it("každá míra má pravidlo v check-inu a čte se z denní poznámky", () => {
		for (const measure of BODY_MEASURES) expect(CHECK_IN_NUMBERS[measure.id].group, measure.id).toBe("body");
		const parsed = parseDay({ forma: "day", date: "2026-10-01", body: { weight_kg: "81,5", waist_cm: "85,5", hips_cm: 98, chest_cm: 102, arm_cm: 36, thigh_cm: 58, calf_cm: 38, body_fat_pct: 17 } });
		expect(parsed?.body).toEqual({ weight_kg: 81.5, body_fat_pct: 17, waist_cm: 85.5, hips_cm: 98, chest_cm: 102, arm_cm: 36, thigh_cm: 58, calf_cm: 38 });
	});
});
