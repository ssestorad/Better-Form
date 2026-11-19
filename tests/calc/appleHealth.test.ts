import { describe, expect, it } from "vitest";
import { appleHealthReader, parseHealthAutoExport } from "../../src/calc/appleHealth";

const rec = (type: string, start: string, end: string, value: string, source = "Watch", unit = "") =>
	`<Record type="${type}" sourceName="${source}" unit="${unit}" creationDate="${end}" startDate="${start}" endDate="${end}" value="${value}">\n<MetadataEntry key="x" value="y"/>\n</Record>`;

describe("Apple Health export.xml", () => {
	it("kroky z jednoho zdroje, spánek ke dni probuzení, váha v lb, SDNN se přeskočí", () => {
		const xml = [
			`<?xml version="1.0"?><HealthData locale="cs_CZ">`,
			rec("HKQuantityTypeIdentifierStepCount", "2026-11-01 08:00:00 +0100", "2026-11-01 08:10:00 +0100", "4000", "Watch"),
			rec("HKQuantityTypeIdentifierStepCount", "2026-11-01 12:00:00 +0100", "2026-11-01 12:10:00 +0100", "3000", "Watch"),
			rec("HKQuantityTypeIdentifierStepCount", "2026-11-01 08:00:00 +0100", "2026-11-01 08:10:00 +0100", "5000", "iPhone"),
			// Noc 1.→2. 11.: 23:00–02:00 core, 02:00–02:30 bdění, 02:30–06:30 deep → 7 h spánku.
			rec("HKCategoryTypeIdentifierSleepAnalysis", "2026-11-01 23:00:00 +0100", "2026-11-02 02:00:00 +0100", "HKCategoryValueSleepAnalysisAsleepCore"),
			rec("HKCategoryTypeIdentifierSleepAnalysis", "2026-11-02 02:00:00 +0100", "2026-11-02 02:30:00 +0100", "HKCategoryValueSleepAnalysisAwake"),
			rec("HKCategoryTypeIdentifierSleepAnalysis", "2026-11-02 02:30:00 +0100", "2026-11-02 06:30:00 +0100", "HKCategoryValueSleepAnalysisAsleepDeep"),
			rec("HKQuantityTypeIdentifierRestingHeartRate", "2026-11-02 00:00:00 +0100", "2026-11-02 23:59:00 +0100", "52"),
			rec("HKQuantityTypeIdentifierBodyMass", "2026-11-02 07:00:00 +0100", "2026-11-02 07:00:00 +0100", "165", "Scale", "lb"),
			rec("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", "2026-11-02 07:00:00 +0100", "2026-11-02 07:01:00 +0100", "48"),
			"</HealthData>",
		].join("\n");
		const reader = appleHealthReader();
		// Po kouscích přes hranice značek.
		for (let i = 0; i < xml.length; i += 37) reader.push(xml.slice(i, i + 37));
		const parsed = reader.finish();
		expect(parsed.rows).toEqual([
			{ date: "2026-11-01", steps: 7000 },
			{ date: "2026-11-02", resting_hr: 52, weight_kg: 74.8, duration_min: 420, sleep_onset: "23:00", wake: "06:30" },
		]);
		expect(parsed.fields).toEqual(["steps", "duration_min", "resting_hr", "weight_kg"]);
		expect(parsed.sdnnSkipped).toBe(1);
	});
});

describe("Health Auto Export JSON", () => {
	it("denní hodnoty a spánek s časy", () => {
		const parsed = parseHealthAutoExport({
			data: {
				metrics: [
					{ name: "step_count", units: "count", data: [{ date: "2026-11-01 00:00:00 +0100", qty: 8123.4 }] },
					{ name: "weight_body_mass", units: "kg", data: [{ date: "2026-11-01 07:00:00 +0100", qty: 74.26 }] },
					{ name: "sleep_analysis", units: "hr", data: [{ date: "2026-11-01 00:00:00 +0100", totalSleep: 7.5, sleepStart: "2026-10-31 23:15:00 +0100", sleepEnd: "2026-11-01 06:45:00 +0100" }] },
					{ name: "heart_rate_variability", units: "ms", data: [{ date: "2026-11-01 07:00:00 +0100", qty: 40 }] },
				],
			},
		});
		expect(parsed.rows).toEqual([{ date: "2026-11-01", steps: 8123, weight_kg: 74.3, duration_min: 450, sleep_onset: "23:15", wake: "06:45" }]);
		expect(parsed.sdnnSkipped).toBe(1);
		expect(() => parseHealthAutoExport({ foo: 1 })).toThrow();
	});
});
