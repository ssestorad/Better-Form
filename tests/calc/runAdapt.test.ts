import { describe, expect, it } from "vitest";
import { adaptRun } from "../../src/calc/runAdapt";

const base = { intensity: "high" as const, distance_km: 10, duration_min: 50, readiness: 80, pains: [], missedRuns: 0 };

describe("úprava naplánovaného běhu", () => {
	it("bez důvodu nic", () => {
		expect(adaptRun(base)).toBeNull();
	});

	it("bolest nohou 4/10 a víc → vynechat; menší → lehce a o 30 % kratší", () => {
		expect(adaptRun({ ...base, pains: [{ muscle: "calves", level: 5 }] })).toEqual({ reason: "pain_stop", action: "rest" });
		expect(adaptRun({ ...base, pains: [{ muscle: "quads", level: 2 }] })).toEqual({ reason: "pain", action: "easy", km: 7, minutes: 35 });
		// Bolest ramene běh nemění.
		expect(adaptRun({ ...base, pains: [{ muscle: "shoulders", level: 6 }] })).toBeNull();
	});

	it("nízká připravenost: tvrdý běh lehce, lehký kratší", () => {
		expect(adaptRun({ ...base, readiness: 40 })).toEqual({ reason: "readiness", action: "easy" });
		expect(adaptRun({ ...base, intensity: "low", readiness: 40 })).toEqual({ reason: "readiness", action: "shorten", km: 7, minutes: 35 });
		expect(adaptRun({ ...base, readiness: null })).toBeNull();
	});

	it("dva vynechané běhy za týden → tvrdý běh nedohánět, jen lehce", () => {
		expect(adaptRun({ ...base, missedRuns: 2 })).toEqual({ reason: "missed", action: "easy" });
		expect(adaptRun({ ...base, intensity: "mid", missedRuns: 3 })).toBeNull();
	});
});
