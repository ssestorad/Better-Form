import { describe, expect, it } from "vitest";
import {
	averageRestingHr,
	estimateHrMax,
	hrZones,
	longestRun,
	pendingImports,
	cadenceSpm,
	resolveHrMax,
	runRecords,
	runSpike,
	shoeUsage,
} from "../../src/calc/running";
import type { RunData, WorkoutNote } from "../../src/model/types";

function run(date: string, data: RunData, extra: Partial<WorkoutNote> = {}): WorkoutNote {
	return { forma: "workout", schema: 1, date, sport: "run", source: "manual", run: data, blocks: [], pain: [], ...extra };
}

describe("runRecords", () => {
	it("celý běh se počítá jen do ±2 % trati", () => {
		const records = runRecords([
			run("2026-09-01", { distance_km: 5.05, moving_time_s: 1500 }), // 1 % → počítá se
			run("2026-09-08", { distance_km: 5.2, moving_time_s: 1400 }), // 4 % → nepočítá se
			run("2026-09-15", { distance_km: 10, moving_time_s: 3200 }),
		]);
		expect(records.map((r) => [r.distance.key, r.seconds, r.date, r.from])).toEqual([
			["5k", 1500, "2026-09-01", "run"],
			["10k", 3200, "2026-09-15", "run"],
		]);
	});

	it("nejrychlejší úsek ze Stravy má přednost, když je rychlejší", () => {
		const records = runRecords([
			run("2026-09-01", { distance_km: 5, moving_time_s: 1500 }),
			run("2026-09-20", { distance_km: 12, moving_time_s: 3900, best_s: { "5k": 1480, "10k": 3150, "1k": 262 } }),
		]);
		const byKey = Object.fromEntries(records.map((r) => [r.distance.key, r]));
		expect(byKey["5k"]).toMatchObject({ seconds: 1480, date: "2026-09-20", from: "segment" });
		expect(byKey["10k"]).toMatchObject({ seconds: 3150, from: "segment" });
		expect(byKey["1k"]).toMatchObject({ seconds: 262, from: "segment" });
	});

	it("při stejném čase platí starší výkon; jiné sporty a běhy bez času se nepočítají", () => {
		const records = runRecords([
			run("2026-09-10", { distance_km: 5, moving_time_s: 1500 }),
			run("2026-09-01", { distance_km: 5, moving_time_s: 1500 }),
			run("2026-09-12", { distance_km: 5 }),
			run("2026-09-13", { distance_km: 5, moving_time_s: 900 }, { sport: "swim" }),
		]);
		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({ seconds: 1500, date: "2026-09-01" });
	});

	it("bez běhů prázdný seznam", () => {
		expect(runRecords([])).toEqual([]);
	});
});

describe("longestRun", () => {
	it("nejdelší běh", () => {
		expect(longestRun([run("2026-09-01", { distance_km: 8 }), run("2026-09-05", { distance_km: 21.3 }), run("2026-09-09", {})])).toEqual({
			km: 21.3,
			date: "2026-09-05",
		});
		expect(longestRun([])).toBeNull();
	});
});

describe("runSpike (Frandsen 2025)", () => {
	const history = [run("2026-08-20", { distance_km: 30 }), run("2026-09-05", { distance_km: 10 }), run("2026-09-20", { distance_km: 8 }), run("2026-10-01", { distance_km: 12 })];

	it("nejdelší běh za předchozích 30 dní, hranice +10 %", () => {
		// 2026-10-01: okno od 1. 9. – 30 km z 20. 8. se nepočítá, nejdelší je 10 km; 12 km je o 20 % víc.
		expect(runSpike(history, "2026-10-01", 12)).toEqual({ km: 12, longestKm: 10, pct: expect.closeTo(20), maxKm: 11 });
		expect(runSpike(history, "2026-10-01", 11)).toBeNull();
		// Do srovnání jde i dnešek předcházející běh, ne běh téhož dne: 2026-10-02 je nejdelší 12 km → hranice 13,2 km.
		expect(runSpike(history, "2026-10-02", 13.3)).toMatchObject({ longestKm: 12, maxKm: 13.2 });
		expect(runSpike(history, "2026-10-02", 13.2)).toBeNull();
	});

	it("bez běhu za 30 dní není s čím srovnat", () => {
		expect(runSpike(history, "2026-12-01", 20)).toBeNull();
		expect(runSpike([], "2026-10-01", 5)).toBeNull();
	});
});

describe("cadenceSpm", () => {
	it("za jednu nohu × 2; od 120 už je za obě nohy", () => {
		expect(cadenceSpm(85)).toBe(170);
		expect(cadenceSpm(84.6)).toBe(169);
		expect(cadenceSpm(172)).toBe(172);
	});
});

describe("maximální tep", () => {
	it("Tanaka: 208 − 0,7 × věk; 40 let → 180", () => {
		expect(estimateHrMax(40)).toBe(180);
		expect(estimateHrMax(30)).toBe(187);
	});

	it("změřený má přednost, jinak odhad z roku narození", () => {
		expect(resolveHrMax(192, 1990, 2026)).toEqual({ value: 192, from: "measured" });
		expect(resolveHrMax(null, 1986, 2026)).toEqual({ value: 180, from: "estimated" }); // 40 let
		expect(resolveHrMax(null, null, 2026)).toBeNull();
		expect(resolveHrMax(null, 2025, 2026)).toBeNull(); // nesmyslný věk
	});
});

describe("hrZones", () => {
	it("Karvonen: max 190, klid 50 → rezerva 140", () => {
		// 50 + 0,5×140 = 120; 0,6 → 134; 0,7 → 148; 0,8 → 162; 0,9 → 176; 1,0 → 190
		expect(hrZones(190, 50)).toEqual([
			{ zone: 1, from: 120, to: 134 },
			{ zone: 2, from: 134, to: 148 },
			{ zone: 3, from: 148, to: 162 },
			{ zone: 4, from: 162, to: 176 },
			{ zone: 5, from: 176, to: 190 },
		]);
	});

	it("bez klidového tepu z podílu maxima: max 200 → 100, 120, 140, 160, 180, 200", () => {
		expect(hrZones(200, null).map((z) => z.from)).toEqual([100, 120, 140, 160, 180]);
		expect(hrZones(200, null)[4]!.to).toBe(200);
	});
});

describe("averageRestingHr", () => {
	it("průměr posledních sedmi měření", () => {
		expect(averageRestingHr([50, 52, 54])).toBe(52);
		expect(averageRestingHr([50, 50, 50, 50, 50, 50, 50, 90])).toBe(50); // osmé už se nepočítá
		expect(averageRestingHr([])).toBeNull();
	});
});

describe("shoeUsage", () => {
	const isPegasus = (link: string) => link.toLowerCase() === "pegasus 40";
	const workouts = [
		run("2026-09-01", { distance_km: 10, shoes: "Pegasus 40" }),
		run("2026-09-03", { distance_km: 8.5, shoes: "pegasus 40" }),
		run("2026-09-05", { distance_km: 12, shoes: "Jiné" }),
		run("2026-09-07", { distance_km: 6 }),
	];

	it("počáteční km + běhy s botami", () => {
		// 100 + 10 + 8,5 = 118,5 km ze 700 → 16,9 %
		const usage = shoeUsage(100, 700, workouts, isPegasus);
		expect(usage.km).toBeCloseTo(118.5, 10);
		expect(usage.runs).toBe(2);
		expect(usage.ratio).toBeCloseTo(118.5 / 700, 10);
		expect(usage.status).toBe("ok");
	});

	it("blíží se limitu od 85 %, nad limitem od 100 %", () => {
		expect(shoeUsage(580, 700, workouts, isPegasus).status).toBe("near"); // 598,5 km = 85,5 %
		expect(shoeUsage(570, 700, workouts, isPegasus).status).toBe("ok"); // 588,5 km = 84,1 %
		expect(shoeUsage(690, 700, workouts, isPegasus).status).toBe("over"); // 708,5 km
	});
});

describe("pendingImports", () => {
	it("jen importy bez RPE, od nejnovějšího", () => {
		const entries = [
			{ note: run("2026-09-01", {}, { source: "strava", strava_id: 1 }) },
			{ note: run("2026-09-10", {}, { source: "strava", strava_id: 2, rpe: 5 }) },
			{ note: run("2026-09-20", {}, { source: "strava", strava_id: 3 }) },
			{ note: run("2026-09-25", {}) },
		];
		expect(pendingImports(entries).map((e) => e.note.strava_id)).toEqual([3, 1]);
	});
});
