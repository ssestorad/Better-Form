import { describe, expect, it } from "vitest";
import { parseGear, parseWorkout } from "../../src/model/parse";
import { gearToFrontmatter, workoutToFrontmatter } from "../../src/model/serialize";
import type { WorkoutNote } from "../../src/model/types";
import {
	PAGE_SIZE,
	activityToWorkout,
	describeSync,
	findManualMatch,
	hasMorePages,
	isWantedActivity,
	localDateTime,
	mergeIntoManual,
	parseActivities,
	parseBestEfforts,
	parseHeartRateZones,
	planSync,
	syncAfter,
	type StravaActivity,
} from "../../src/strava/activities";

const TYPES = ["Run", "TrailRun", "VirtualRun"];

/** Ukázková aktivita ve tvaru odpovědi `GET /athlete/activities`. */
const ACTIVITY: StravaActivity = {
	id: 15000000001,
	name: "Odpolední běh",
	type: "Run",
	sport_type: "Run",
	start_date_local: "2026-09-28T17:30:12Z",
	distance: 10234.5,
	moving_time: 3310,
	elapsed_time: 3402,
	total_elevation_gain: 85.4,
	has_heartrate: true,
	average_heartrate: 151.6,
	max_heartrate: 178,
};

function manualRun(overrides: Partial<WorkoutNote> = {}): WorkoutNote {
	return {
		forma: "workout",
		schema: 1,
		date: "2026-09-28",
		sport: "run",
		source: "manual",
		rpe: 6,
		run: { distance_km: 10, type: "easy", shoes: "Pegasus 40" },
		blocks: [],
		pain: [],
		notes: "Šlo to dobře.",
		...overrides,
	};
}

describe("syncAfter", () => {
	const NOW = 1_790_000_000;

	it("první synchronizace: 90 dní zpět", () => {
		expect(syncAfter(0, 90, NOW)).toBe(NOW - 90 * 86400);
	});

	it("další synchronizace: poslední sync minus týdenní přesah", () => {
		expect(syncAfter(1_789_000_000, 90, NOW)).toBe(1_789_000_000 - 7 * 86400);
	});
});

describe("stránkování", () => {
	it("další stránka jen po plné stránce a do limitu", () => {
		expect(hasMorePages(PAGE_SIZE, 1)).toBe(true);
		expect(hasMorePages(PAGE_SIZE - 1, 1)).toBe(false);
		expect(hasMorePages(0, 1)).toBe(false);
		expect(hasMorePages(PAGE_SIZE, 20)).toBe(false);
	});

	it("parseActivities zahodí položky bez id a nepole", () => {
		expect(parseActivities([ACTIVITY, { name: "bez id" }, null, 5])).toEqual([ACTIVITY]);
		expect(parseActivities({ message: "Rate Limit Exceeded" })).toEqual([]);
	});
});

describe("isWantedActivity", () => {
	it("podle sport_type i staršího type, bez ohledu na velikost písmen", () => {
		expect(isWantedActivity(ACTIVITY, TYPES)).toBe(true);
		expect(isWantedActivity({ id: 1, sport_type: "TrailRun", type: "Run" }, ["trailrun"])).toBe(true);
		expect(isWantedActivity({ id: 1, sport_type: "Ride", type: "Ride" }, TYPES)).toBe(false);
		expect(isWantedActivity({ id: 1 }, TYPES)).toBe(false);
	});
});

describe("activityToWorkout", () => {
	it("převede jednotky a označí trénink jako import k doplnění", () => {
		expect(activityToWorkout(ACTIVITY, 1)).toEqual({
			forma: "workout",
			schema: 1,
			date: "2026-09-28",
			start: "17:30",
			sport: "run",
			title: "Odpolední běh",
			duration_min: 55, // 3310 s = 55,2 min
			source: "strava",
			strava_id: 15000000001,
			run: {
				distance_km: 10.23, // 10 234,5 m
				moving_time_s: 3310,
				avg_hr: 152,
				max_hr: 178,
				elevation_m: 85,
			},
			blocks: [],
			pain: [],
		});
	});

	it("místní čas se bere tak, jak ho Strava poslala (Z neznamená UTC)", () => {
		expect(localDateTime("2026-01-01T00:05:00Z")).toEqual({ date: "2026-01-01", start: "00:05" });
		expect(localDateTime("nesmysl")).toBeNull();
		expect(localDateTime(undefined)).toBeNull();
	});

	it("bez tepu a převýšení tato pole chybí; bez data null", () => {
		const note = activityToWorkout({ id: 2, type: "Run", start_date_local: "2026-09-01T07:00:00Z", distance: 5000, moving_time: 1500 }, 1);
		expect(note?.run).toEqual({ distance_km: 5, moving_time_s: 1500 });
		expect(note?.rpe).toBeUndefined();
		expect(activityToWorkout({ id: 3, type: "Run" }, 1)).toBeNull();
	});

	it("uložený import přečte parser zpět beze změny", () => {
		const note = activityToWorkout(ACTIVITY, 1)!;
		expect(parseWorkout(workoutToFrontmatter(note))).toEqual(note);
	});
});

describe("findManualMatch", () => {
	const imported = activityToWorkout(ACTIVITY, 1)!; // 10,23 km, 28. 9.

	it("stejný den a vzdálenost do 10 %", () => {
		expect(findManualMatch(imported, [manualRun()])).toBe(0); // 10 km: rozdíl 2,2 %
		expect(findManualMatch(imported, [manualRun({ run: { distance_km: 9.3 } })])).toBe(0); // 9,1 %
		expect(findManualMatch(imported, [manualRun({ run: { distance_km: 9 } })])).toBe(-1); // 12 %
	});

	it("jiný den, jiný sport nebo už importovaný běh se neslučuje", () => {
		expect(findManualMatch(imported, [manualRun({ date: "2026-09-27" })])).toBe(-1);
		expect(findManualMatch(imported, [manualRun({ sport: "swim" })])).toBe(-1);
		expect(findManualMatch(imported, [manualRun({ source: "strava", strava_id: 7 })])).toBe(-1);
	});

	it("ze dvou běhů v jeden den vybere ten bližší", () => {
		const morning = manualRun({ run: { distance_km: 9.5 } });
		const evening = manualRun({ run: { distance_km: 10.2 } });
		expect(findManualMatch(imported, [morning, evening])).toBe(1);
	});

	it("ruční běh bez vzdálenosti se sloučí, jen když je ten den jediný", () => {
		const noDistance = manualRun({ run: { type: "easy" } });
		expect(findManualMatch(imported, [noDistance])).toBe(0);
		expect(findManualMatch(imported, [noDistance, manualRun({ run: { distance_km: 3 } })])).toBe(-1);
	});
});

describe("mergeIntoManual", () => {
	it("měřené údaje ze Stravy, uživatelovy údaje zůstanou", () => {
		const merged = mergeIntoManual(manualRun(), activityToWorkout(ACTIVITY, 1)!);
		expect(merged.source).toBe("strava");
		expect(merged.strava_id).toBe(15000000001);
		expect(merged.rpe).toBe(6);
		expect(merged.notes).toBe("Šlo to dobře.");
		expect(merged.run).toEqual({
			distance_km: 10.23,
			moving_time_s: 3310,
			avg_hr: 152,
			max_hr: 178,
			elevation_m: 85,
			type: "easy",
			shoes: "Pegasus 40",
		});
		// Chybějící čas, název a délka se doplní z importu.
		expect(merged.start).toBe("17:30");
		expect(merged.title).toBe("Odpolední běh");
		expect(merged.duration_min).toBe(55);
	});

	it("uživatelův název, čas a délka mají přednost", () => {
		const merged = mergeIntoManual(manualRun({ title: "Okruh", start: "17:00", duration_min: 60 }), activityToWorkout(ACTIVITY, 1)!);
		expect(merged.title).toBe("Okruh");
		expect(merged.start).toBe("17:00");
		expect(merged.duration_min).toBe(60);
	});
});

describe("planSync", () => {
	const ride: StravaActivity = { id: 99, type: "Ride", sport_type: "Ride", start_date_local: "2026-09-28T08:00:00Z" };

	it("nový běh založí, jiný sport ignoruje", () => {
		const plan = planSync([ACTIVITY, ride], [], TYPES, 1);
		expect(plan.create).toHaveLength(1);
		expect(plan.merge).toHaveLength(0);
		expect(plan.ignored).toBe(1);
		expect(plan.duplicates).toBe(0);
	});

	it("už importovanou aktivitu přeskočí (podle strava_id)", () => {
		const existing = [activityToWorkout(ACTIVITY, 1)!];
		const plan = planSync([ACTIVITY], existing, TYPES, 1);
		expect(plan.create).toHaveLength(0);
		expect(plan.duplicates).toBe(1);
	});

	it("stejná aktivita dvakrát v odpovědi se založí jen jednou", () => {
		const plan = planSync([ACTIVITY, ACTIVITY], [], TYPES, 1);
		expect(plan.create).toHaveLength(1);
		expect(plan.duplicates).toBe(1);
	});

	it("sloučí s ručním během a každý ruční běh použije nejvýš jednou", () => {
		const second: StravaActivity = { ...ACTIVITY, id: 15000000002, start_date_local: "2026-09-28T19:00:00Z", distance: 10100 };
		const plan = planSync([ACTIVITY, second], [manualRun()], TYPES, 1);
		expect(plan.merge).toHaveLength(1);
		expect(plan.merge[0]!.index).toBe(0);
		expect(plan.merge[0]!.note.strava_id).toBe(15000000001);
		expect(plan.create).toHaveLength(1);
		expect(plan.create[0]!.strava_id).toBe(15000000002);
	});
});

describe("detail aktivity", () => {
	it("nejlepší úseky: jen sledované tratě, čas v sekundách", () => {
		const detail = {
			best_efforts: [
				{ name: "400m", elapsed_time: 95 },
				{ name: "1k", elapsed_time: 262 },
				{ name: "5k", elapsed_time: 1481 },
				{ name: "10k", elapsed_time: 3105 },
				{ name: "Half-Marathon", elapsed_time: 6900 },
				{ name: "Marathon", elapsed_time: 0 },
			],
		};
		expect(parseBestEfforts(detail)).toEqual({ "1k": 262, "5k": 1481, "10k": 3105, half: 6900 });
		expect(parseBestEfforts({})).toEqual({});
		expect(parseBestEfforts(null)).toEqual({});
	});

	it("tepové zóny: čas v pěti zónách; bez tepových zón null", () => {
		const zones = [
			{ type: "pace", distribution_buckets: [{ min: 0, max: 2, time: 10 }] },
			{
				type: "heartrate",
				distribution_buckets: [
					{ min: 0, max: 115, time: 600 },
					{ min: 115, max: 152, time: 1800 },
					{ min: 152, max: 171, time: 700.4 },
					{ min: 171, max: 190, time: 200 },
					{ min: 190, max: -1, time: 10 },
				],
			},
		];
		expect(parseHeartRateZones(zones)).toEqual([600, 1800, 700, 200, 10]);
		expect(parseHeartRateZones([{ type: "pace", distribution_buckets: [] }])).toBeNull();
		expect(parseHeartRateZones({ message: "Payment Required" })).toBeNull();
	});

	it("úseky a příznak detailu přežijí uložení a načtení", () => {
		const note = activityToWorkout(ACTIVITY, 1)!;
		note.run = { ...note.run, best_s: { "5k": 1481 }, hr_zone_s: [600, 1800, 700, 200, 10], strava_detail: true };
		expect(parseWorkout(workoutToFrontmatter(note))).toEqual(note);
	});
});

describe("describeSync", () => {
	const base = { created: 0, merged: 0, duplicates: 0, details: 0, detailsPending: 0, rateLimited: false };

	it("nic nového", () => {
		expect(describeSync(base)).toBe("Strava – nic nového.");
	});

	it("shrnutí a zbývající detaily", () => {
		expect(describeSync({ ...base, created: 3, merged: 1, details: 4 })).toBe(
			"Strava – nové běhy: 3, sloučeno s ručním zápisem: 1, doplněn detail: 4.",
		);
		expect(describeSync({ ...base, created: 40, details: 30, detailsPending: 10 })).toContain("zbývá doplnit u 10 běhů");
		expect(describeSync({ ...base, rateLimited: true })).toContain("omezila počet požadavků");
	});
});

describe("poznámka bot", () => {
	it("zápis a čtení se shodují; výchozí hodnoty", () => {
		const note = parseGear({ forma: "gear", kind: "shoes", name: "Pegasus 40", start_km: 120, limit_km: 800, active: false });
		expect(note).toEqual({ forma: "gear", schema: 1, kind: "shoes", name: "Pegasus 40", start_km: 120, limit_km: 800, active: false });
		expect(parseGear(gearToFrontmatter(note!))).toEqual(note);
		expect(parseGear({ forma: "gear", kind: "shoes", name: "Nové" })).toEqual({
			forma: "gear",
			schema: 1,
			kind: "shoes",
			name: "Nové",
			start_km: 0,
			active: true,
		});
	});

	it("jiné vybavení a boty bez názvu se neindexují", () => {
		expect(parseGear({ forma: "gear", kind: "kettlebell", name: "24 kg" })).toBeNull();
		expect(parseGear({ forma: "gear", kind: "shoes" })).toBeNull();
	});
});
