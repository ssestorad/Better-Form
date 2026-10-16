import { describe, expect, it } from "vitest";
import { dayLoad, workoutEnergy } from "../../src/calc/nutrition";
import { median } from "../../src/calc/stats";
import {
	copyItems,
	hardStreaks,
	matchPlan,
	nextItemId,
	plannedLoad,
	plannedMinutes,
	plannedWorkout,
	runPaceMinPerKm,
	weekDates,
	weekOutlook,
	weekSummary,
} from "../../src/calc/weekPlan";
import type { PlanItem, WorkoutNote } from "../../src/model/types";

// Týden od pondělí 5. 10. 2026.
const WEEK = "2026-10-05";

function item(id: string, date: string, partial: Partial<PlanItem> = {}): PlanItem {
	return { id, date, sport: "run", intensity: "mid", ...partial };
}

function workout(date: string, partial: Partial<WorkoutNote> = {}): WorkoutNote {
	return { forma: "workout", schema: 1, date, sport: "run", source: "manual", blocks: [], pain: [], ...partial };
}

describe("plán týdne: základ", () => {
	it("týden má sedm dní od pondělí", () => {
		expect(weekDates(WEEK)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
	});

	it("nové označení položky nekoliduje s existujícími", () => {
		expect(nextItemId([])).toBe("p1");
		expect(nextItemId([{ id: "p1" }, { id: "p3" }])).toBe("p4");
		expect(nextItemId([{ id: "p2" }, { id: "p3" }])).toBe("p4");
	});

	it("medián", () => {
		expect(median([])).toBeNull();
		expect(median([5, 1, 3])).toBe(3);
		expect(median([4, 1, 3, 2])).toBe(2.5);
	});
});

describe("plán týdne: stav položek", () => {
	const today = "2026-10-07";

	it("zapsaný trénink stejného sportu položku splní; minulá bez tréninku je vynechaná", () => {
		const items = [item("p1", "2026-10-05"), item("p2", "2026-10-06", { sport: "strength" }), item("p3", "2026-10-07"), item("p4", "2026-10-09")];
		const run = workout("2026-10-05");
		const matches = matchPlan(items, [run, workout("2026-10-06")], today);
		expect(matches.map((m) => m.status)).toEqual(["done", "missed", "planned", "planned"]);
		expect(matches[0]!.workout).toBe(run);
	});

	it("jeden trénink splní jen jednu položku", () => {
		const items = [item("p1", "2026-10-05"), item("p2", "2026-10-05")];
		expect(matchPlan(items, [workout("2026-10-05")], today).map((m) => m.status)).toEqual(["done", "missed"]);
	});

	it("šablona má přednost před sportem", () => {
		const items = [item("p1", "2026-10-05", { sport: "strength" }), item("p2", "2026-10-05", { sport: "strength", template: "Push" })];
		const push = workout("2026-10-05", { sport: "strength", template: "push" });
		const matches = matchPlan(items, [push], today);
		expect(matches.map((m) => m.status)).toEqual(["missed", "done"]);
		expect(matches[1]!.workout).toBe(push);
	});

	it("dnešní nesplněná položka je pořád v plánu", () => {
		expect(matchPlan([item("p1", today)], [], today)[0]!.status).toBe("planned");
	});
});

describe("plán týdne: položka jako trénink", () => {
	it("vlastní tempo běhu = medián za 90 dní, aspoň ze tří běhů", () => {
		const runs = [
			workout("2026-10-01", { run: { distance_km: 10, moving_time_s: 3000 } }), // 5,0 min/km
			workout("2026-09-20", { run: { distance_km: 5 }, duration_min: 30 }), // 6,0 min/km
			workout("2026-09-10", { run: { distance_km: 8, moving_time_s: 2640 } }), // 5,5 min/km
			workout("2026-06-01", { run: { distance_km: 5, moving_time_s: 1200 } }), // starší než 90 dní
			workout("2026-10-02", { sport: "strength", duration_min: 60 }),
		];
		expect(runPaceMinPerKm(runs, "2026-10-07")).toBeCloseTo(5.5, 6);
		expect(runPaceMinPerKm(runs.slice(0, 2), "2026-10-07")).toBeNull();
	});

	it("délka: zadaná, u běhu odhad ze vzdálenosti a tempa, jinak nic", () => {
		expect(plannedMinutes(item("p1", WEEK, { duration_min: 45, distance_km: 8 }), 5.5)).toEqual({ minutes: 45, estimated: false });
		expect(plannedMinutes(item("p1", WEEK, { distance_km: 8 }), 5.5)).toEqual({ minutes: 44, estimated: true });
		expect(plannedMinutes(item("p1", WEEK, { distance_km: 8 }), null)).toBeNull();
		expect(plannedMinutes(item("p1", WEEK, { sport: "strength" }), 5.5)).toBeNull();
	});

	it("zátěž = odhad RPE × minuty: lehká 3, střední 5, těžká 8", () => {
		expect(plannedLoad(item("p1", WEEK, { duration_min: 60, intensity: "low" }), null)).toBe(180);
		expect(plannedLoad(item("p1", WEEK, { duration_min: 60, intensity: "mid" }), null)).toBe(300);
		expect(plannedLoad(item("p1", WEEK, { duration_min: 45, intensity: "high" }), null)).toBe(360);
		expect(plannedLoad(item("p1", WEEK, { intensity: "high" }), null)).toBeNull();
	});

	it("položka jako trénink dá výživě zátěž dne i výdej", () => {
		const hard = plannedWorkout(item("p1", WEEK, { duration_min: 60, intensity: "high", distance_km: 12, title: "Tempo" }), null);
		expect(hard).toMatchObject({ date: WEEK, sport: "run", rpe: 8, duration_min: 60, title: "Tempo", run: { distance_km: 12 } });
		// 60 minut ve vysoké intenzitě = střední den (pod 90 minut).
		expect(dayLoad([hard])).toBe("moderate");
		// Běh 12 km při 70 kg: 70 × 12 = 840 kcal celkem, minus klid 1680/1440 × 60 = 70 kcal → 770 kcal.
		expect(workoutEnergy(hard, 70, 1680).netKcal).toBeCloseTo(770, 6);

		const gym = plannedWorkout(item("p2", WEEK, { sport: "strength", duration_min: 60, intensity: "mid", distance_km: 3 }), null);
		expect(gym.run).toBeUndefined();
		// Posilovna, střední intenzita: (5,0 − 1) MET × 70 kg × 1 h = 280 kcal.
		expect(workoutEnergy(gym, 70, 1680).netKcal).toBeCloseTo(280, 6);
	});
});

describe("plán týdne: souhrn a výhled", () => {
	const today = "2026-10-07";
	const items = [
		item("p1", "2026-10-05", { duration_min: 50, distance_km: 8, intensity: "low" }),
		item("p2", "2026-10-06", { sport: "strength", duration_min: 60, intensity: "high" }),
		item("p3", "2026-10-08", { distance_km: 10, intensity: "high" }),
		item("p4", "2026-10-10", { sport: "swim" }),
	];
	const workouts = [
		workout("2026-10-05", { duration_min: 52, rpe: 3, run: { distance_km: 8.2, moving_time_s: 3120 } }),
		workout("2026-10-04", { duration_min: 90, rpe: 5 }), // minulý týden
	];
	const matches = matchPlan(items, workouts, today);

	it("souhrn: počty, plánované a skutečné minuty a kilometry", () => {
		// Tempo 6 min/km → běh 10 km bez délky ≈ 60 min; plavání bez délky se nepočítá.
		expect(weekSummary(WEEK, matches, workouts, 6)).toEqual({
			planned: 4,
			done: 1,
			missed: 1,
			postponed: 0,
			plannedMin: 50 + 60 + 60,
			withoutDuration: 1,
			plannedRunKm: 18,
			actualMin: 52,
			actualRunKm: 8.2,
		});
	});

	it("výhled: zapsaná zátěž + zbývající plán proti průměru čtyř týdnů", () => {
		// Historie: 4 týdny před 5. 10. (od 7. 9.), každý týden 600 AU → průměr 600.
		const byDate = new Map<string, number>([
			["2026-09-07", 600],
			["2026-09-14", 600],
			["2026-09-21", 600],
			["2026-09-28", 600],
			["2026-10-05", 156], // 52 min × RPE 3
		]);
		const outlook = weekOutlook(WEEK, matches, byDate, WEEK, 6);
		// V plánu zbývá: těžký běh 10 km ≈ 60 min × 8 = 480; plavání bez délky 0; vynechaná posilovna se nepočítá.
		expect(outlook.actual).toBe(156);
		expect(outlook.planned).toBe(480);
		expect(outlook.expected).toBe(636);
		expect(outlook.average).toBe(600);
		expect(outlook.ratio).toBeCloseTo(1.06, 6);
	});

	it("výhled bez čtyř týdnů historie nemá s čím srovnávat", () => {
		const byDate = new Map<string, number>([
			["2026-09-21", 600],
			["2026-09-28", 600],
		]);
		const outlook = weekOutlook(WEEK, matches, byDate, WEEK, 6);
		expect(outlook.average).toBeNull();
		expect(outlook.ratio).toBeNull();
		expect(outlook.expected).toBe(480);
	});

	it("budoucí týden se srovnává s týdny před aktuálním", () => {
		const next = "2026-10-12";
		const future = matchPlan([item("p1", "2026-10-13", { duration_min: 100, intensity: "high" })], [], today);
		const byDate = new Map<string, number>([
			["2026-09-07", 400],
			["2026-09-14", 400],
			["2026-09-21", 400],
			["2026-09-28", 400],
			["2026-10-05", 999], // aktuální týden do průměru nepatří
		]);
		const outlook = weekOutlook(next, future, byDate, WEEK, null);
		expect(outlook).toEqual({ actual: 0, planned: 800, expected: 800, average: 400, ratio: 2 });
	});

	it("těžké dny po sobě: plán i zapsané tréninky, jen když je v řadě něco ještě v plánu", () => {
		const plan = matchPlan(
			[
				item("p1", "2026-10-08", { intensity: "high" }),
				item("p2", "2026-10-09", { intensity: "high" }),
				item("p3", "2026-10-11", { intensity: "high" }),
				item("p4", "2026-10-10", { intensity: "low" }),
			],
			[],
			today,
		);
		expect(hardStreaks(WEEK, plan, [])).toEqual([["2026-10-08", "2026-10-09"]]);
		// Těžký trénink zapsaný včera + těžká položka dnes.
		const todayHard = matchPlan([item("p1", today, { intensity: "high" })], [], today);
		expect(hardStreaks(WEEK, todayHard, [{ date: "2026-10-06", rpe: 8 }])).toEqual([["2026-10-06", today]]);
		// Dva těžké zapsané dny bez plánu jsou historie.
		expect(
			hardStreaks(WEEK, [], [
				{ date: "2026-10-05", rpe: 8 },
				{ date: "2026-10-06", rpe: 9 },
			]),
		).toEqual([]);
		// Neděle před týdnem + pondělí v plánu.
		const monday = matchPlan([item("p1", "2026-10-12", { intensity: "high" })], [], today);
		expect(hardStreaks("2026-10-12", monday, [{ date: "2026-10-11", rpe: 7 }])).toEqual([["2026-10-11", "2026-10-12"]]);
	});

	it("kopie do dalšího týdne posune data a dá nová označení", () => {
		const copied = copyItems(items.slice(0, 2), WEEK, "2026-10-12", [{ id: "p1" }]);
		expect(copied.map((i) => [i.id, i.date, i.sport])).toEqual([
			["p2", "2026-10-12", "run"],
			["p3", "2026-10-13", "strength"],
		]);
		expect(copied[0]).toMatchObject({ duration_min: 50, distance_km: 8, intensity: "low" });
	});
});

describe("plán týdne: volné dny", () => {
	const today = "2026-10-07";
	const off = new Set(["2026-10-05", "2026-10-08"]);

	it("nesplněná položka ve volný den je odložená, ne vynechaná ani zbývající", () => {
		const items = [item("p1", "2026-10-05"), item("p2", "2026-10-06"), item("p3", "2026-10-08", { duration_min: 60, intensity: "high" }), item("p4", "2026-10-09", { duration_min: 30 })];
		const matches = matchPlan(items, [], today, off);
		expect(matches.map((m) => m.status)).toEqual(["off", "missed", "off", "planned"]);
		expect(weekSummary(WEEK, matches, [], null)).toMatchObject({ planned: 4, done: 0, missed: 1, postponed: 2 });
		// Do zbývající zátěže jde jen pátek: 30 min × 5 = 150 AU; odložený těžký čtvrtek ne.
		expect(weekOutlook(WEEK, matches, new Map(), WEEK, null).planned).toBe(150);
		expect(hardStreaks(WEEK, matches, [{ date: "2026-10-07", rpe: 8 }])).toEqual([]);
	});

	it("trénink zapsaný ve volný den položku i tak splní", () => {
		expect(matchPlan([item("p1", "2026-10-05")], [workout("2026-10-05")], today, off)[0]!.status).toBe("done");
	});
});
