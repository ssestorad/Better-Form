import { describe, expect, it } from "vitest";
import { badges, checkInStreak, type BadgeInput } from "../../src/calc/badges";
import { addDays } from "../../src/model/dates";
import type { DayNote, WorkoutNote } from "../../src/model/types";

function workout(partial: Partial<WorkoutNote> & { date: string }): WorkoutNote {
	return { forma: "workout", schema: 1, sport: "strength", source: "manual", blocks: [], pain: [], ...partial };
}

function day(date: string, partial: Partial<DayNote> = {}): DayNote {
	return { forma: "day", schema: 1, date, sleep: {}, check_in: {}, hrv: {}, body: {}, ...partial };
}

const IDS: Record<string, string> = {
	Shyby: "pull-up",
	Kliky: "push-up",
	"Kliky na kolenou": "knee-push-up",
	Pistole: "pistol-squat",
	Plank: "plank",
	Bench: "bench-press",
	Dřep: "back-squat",
	"Mrtvý tah": "deadlift",
};

function input(partial: Partial<BadgeInput> & { workouts: WorkoutNote[] }): BadgeInput {
	return {
		sessions: partial.workouts,
		days: [],
		idOf: (e) => IDS[e],
		loadOf: () => ({ kind: "grind", measure: "reps_kg" }),
		profileWeightKg: null,
		weeklyGoal: 3,
		excused: new Set(),
		today: "2026-10-02",
		...partial,
	};
}

const byId = (list: ReturnType<typeof badges>) => Object.fromEntries(list.map((b) => [b.id, b]));

describe("odznaky (SPEC 9.2)", () => {
	it("skupiny a jedinečná id", () => {
		const list = badges(input({ workouts: [] }));
		expect(new Set(list.map((b) => b.id)).size).toBe(list.length);
		expect(list.length).toBe(22);
		expect(new Set(list.map((b) => b.group))).toEqual(new Set(["running", "strength", "calisthenics", "consistency"]));
	});

	it("průběh, když ještě nejsou získané; shyb s gumou se nepočítá", () => {
		const workouts = [
			workout({ date: "2026-10-01", sport: "run", run: { distance_km: 6 } }),
			workout({ date: "2026-10-01", blocks: [{ type: "sets", exercise: "Shyby", sets: [{ reps: 5, added_kg: -20 }] }] }),
		];
		const b = byId(badges(input({ workouts })));
		expect(b.first5k!.achieved).toBe("2026-10-01");
		expect(b.first10k!.achieved).toBeNull();
		expect(b.first10k!.progress.value).toBe(6);
		expect(b.month100k!.progress.value).toBe(6);
		expect(b.workouts50!.progress.value).toBe(2);
		expect(b.firstPullUp!.achieved).toBeNull();
		expect(b.firstPullUp!.progress.value).toBe(0);
	});

	it("první desítka, 100 km za měsíc, 50 tréninků, první shyb", () => {
		const runs = Array.from({ length: 10 }, (_, i) =>
			workout({ date: `2026-09-${String(i * 2 + 1).padStart(2, "0")}`, sport: "run", run: { distance_km: i === 3 ? 12 : 10 } }),
		);
		const gym = Array.from({ length: 45 }, (_, i) => workout({ date: `2026-08-${String((i % 28) + 1).padStart(2, "0")}`, start: `${String(6 + Math.floor(i / 28)).padStart(2, "0")}:00` }));
		const pull = workout({ date: "2026-09-30", blocks: [{ type: "sets", exercise: "Shyby", sets: [{ reps: 2 }] }] });
		const b = byId(badges(input({ workouts: [...gym, ...runs, pull] })));
		expect(b.first10k!.achieved).toBe("2026-09-01");
		// 9 běhů po 10 km + jeden 12 km: 100 km padne desátým během (19. 9.)
		expect(b.month100k!.achieved).toBe("2026-09-19");
		// 45 tréninků v srpnu + 5. běh v září (9. 9.) = 50.
		expect(b.workouts50!.achieved).toBe("2026-09-09");
		expect(b.workouts100!.achieved).toBeNull();
		expect(b.firstPullUp!.achieved).toBe("2026-09-30");
	});

	it("půlmaraton, maraton a součty 500 a 1000 km", () => {
		// 25 maratonů po 42 km: 12 × 42 = 504 km (500 padne 12. během), 24 × 42 = 1008 km.
		const runs = Array.from({ length: 25 }, (_, i) => workout({ date: addDays("2026-01-01", i * 7), sport: "run", run: { distance_km: 42 } }));
		const b = byId(badges(input({ workouts: runs, today: "2026-12-31" })));
		expect(b.halfMarathon!.achieved).toBe("2026-01-01");
		expect(b.marathon!.achieved).toBe("2026-01-01");
		expect(b.run500!.achieved).toBe(addDays("2026-01-01", 11 * 7));
		expect(b.run1000!.achieved).toBe(addDays("2026-01-01", 23 * 7));
		expect(b.run1000!.progress.value).toBe(1000);
	});

	it("síla vůči hmotnosti: odhad 1RM a nejbližší zapsaná váha", () => {
		const days = [day("2026-09-01", { body: { weight_kg: 80 } })];
		const workouts = [
			// 100 kg × 1 = 100 kg → 1,25 × 80 kg
			workout({ date: "2026-09-02", blocks: [{ type: "sets", exercise: "Bench", sets: [{ reps: 1, kg: 100 }] }] }),
			// Epley 100 × (1 + 5/30) = 116,67 kg → 1,46 × 80 kg, na 1,5× nestačí
			workout({ date: "2026-09-03", blocks: [{ type: "sets", exercise: "Dřep", sets: [{ reps: 5, kg: 100 }] }] }),
			// 140 × (1 + 5/30) = 163,33 kg → 2,04 × 80 kg; rozcvičovací série se nepočítá
			workout({ date: "2026-09-04", blocks: [{ type: "sets", exercise: "Mrtvý tah", sets: [{ reps: 5, kg: 200, warmup: true }, { reps: 5, kg: 140 }] }] }),
		];
		const b = byId(badges(input({ workouts, days, profileWeightKg: 90 })));
		expect(b.benchBodyweight!.achieved).toBe("2026-09-02");
		expect(b.squat1_5!.achieved).toBeNull();
		expect(b.squat1_5!.progress.value).toBe(1.46);
		expect(b.deadlift2!.achieved).toBe("2026-09-04");
		// Bez zapsané váhy rozhoduje profil: 163,33 / 90 = 1,81.
		expect(byId(badges(input({ workouts, profileWeightKg: 90 }))).deadlift2!.achieved).toBeNull();
		// Bez jakékoli váhy se poměr nepočítá.
		expect(byId(badges(input({ workouts }))).benchBodyweight!.progress.value).toBe(0);
	});

	it("váha zapsaná až po tréninku se použije, když dřívější není", () => {
		const days = [day("2026-09-10", { body: { weight_kg: 80 } })];
		const workouts = [workout({ date: "2026-09-02", blocks: [{ type: "sets", exercise: "Bench", sets: [{ reps: 1, kg: 80 }] }] })];
		expect(byId(badges(input({ workouts, days }))).benchBodyweight!.achieved).toBe("2026-09-02");
	});

	it("kalistenika: 10 shybů, 50 kliků (ne na kolenou), pistole, minuta v planku", () => {
		const workouts = [
			workout({ date: "2026-09-01", blocks: [{ type: "sets", exercise: "Kliky na kolenou", sets: [{ reps: 60 }] }] }),
			workout({ date: "2026-09-02", blocks: [{ type: "sets", exercise: "Shyby", sets: [{ reps: 9 }, { reps: 10, added_kg: 0 }] }] }),
			workout({ date: "2026-09-03", blocks: [{ type: "sets", exercise: "Kliky", sets: [{ reps: 50 }] }] }),
			workout({ date: "2026-09-04", blocks: [{ type: "sets", exercise: "Pistole", sets: [{ reps: 1, added_kg: -5 }] }] }),
			workout({ date: "2026-09-05", blocks: [{ type: "sets", exercise: "Pistole", sets: [{ reps: 1 }] }] }),
			workout({ date: "2026-09-06", blocks: [{ type: "hold", exercise: "Plank", sets: [{ sec: 45 }, { sec: 65 }] }] }),
		];
		const b = byId(badges(input({ workouts })));
		expect(b.pullUps10!.achieved).toBe("2026-09-02");
		expect(b.firstPullUp!.achieved).toBe("2026-09-02");
		expect(b.pushUps50!.achieved).toBe("2026-09-03");
		expect(b.firstPistol!.achieved).toBe("2026-09-05");
		expect(b.plank60!.achieved).toBe("2026-09-06");
	});

	it("10 týdnů v řadě: datum posledního tréninku desátého splněného týdne", () => {
		// Cíl 2 týdně: pondělí a středa od 1. 6. 2026 (pondělí) po 12 týdnů.
		const workouts = Array.from({ length: 12 }, (_, w) => [0, 2].map((d) => workout({ date: addDays("2026-06-01", w * 7 + d) }))).flat();
		const b = byId(badges(input({ workouts, weeklyGoal: 2 })));
		// 10. týden začíná 3. 8., středa 5. 8.
		expect(b.weeks10!.achieved).toBe("2026-08-05");
		expect(b.weeks26!.achieved).toBeNull();
		expect(b.weeks26!.progress.value).toBe(12);
	});

	it("30 check-inů v řadě; mezera řadu přeruší", () => {
		const days = Array.from({ length: 30 }, (_, i) => day(addDays("2026-08-01", i), { check_in: { mood: 3 } }));
		expect(checkInStreak(days, "2026-10-02", 30)).toEqual({ reached: "2026-08-30", longest: 30 });
		const gap = days.filter((d) => d.date !== "2026-08-15");
		expect(checkInStreak(gap, "2026-10-02", 30)).toEqual({ reached: null, longest: 15 });
		// Den bez vyplněných hodnot není check-in.
		expect(checkInStreak([day("2026-08-01")], "2026-10-02", 30).longest).toBe(0);
	});
});
