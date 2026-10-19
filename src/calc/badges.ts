// Odznaky (SPEC 9.2): běh, síla vůči tělesné hmotnosti, kalistenika a pravidelnost.
// Čisté funkce bez závislosti na Obsidianu.

import { addDays } from "../model/dates";
import type { DayNote, SetEntry, WorkoutNote } from "../model/types";
import { t, tn, translated } from "../i18n";
import { hasCheckIn } from "./checkIn";
import { estimateSet1RM, type ExerciseForLoad } from "./oneRm";
import { weekStreak, weekStreakReached } from "./streaks";

export type BadgeGroup = "running" | "strength" | "calisthenics" | "consistency";

export const BADGE_GROUPS: BadgeGroup[] = ["running", "strength", "calisthenics", "consistency"];

export const BADGE_GROUP_LABELS: Record<BadgeGroup, string> = translated({
	running: "Running",
	strength: "Strength for your body weight",
	calisthenics: "Calisthenics",
	consistency: "Consistency",
});

export interface Badge {
	id: string;
	group: BadgeGroup;
	title: string;
	description: string;
	/** Datum získání; null = zatím ne. */
	achieved: string | null;
	/** Průběh k získání. */
	progress: { value: number; target: number; unit: string };
}

export interface BadgeInput {
	/** Všechny tréninky včetně denních počítadel. */
	workouts: readonly WorkoutNote[];
	/** Tréninky bez denních počítadel – počítají se do počtu tréninků a týdnů v řadě. */
	sessions: readonly WorkoutNote[];
	days: readonly DayNote[];
	/** Id vestavěného cviku podle názvu (v kterémkoli jazyce). */
	idOf: (exercise: string) => string | undefined;
	/** Údaje cviku pro odhad 1RM. */
	loadOf: (exercise: string) => ExerciseForLoad | undefined;
	/** Hmotnost z profilu, když v deníku žádná zapsaná není. */
	profileWeightKg: number | null;
	weeklyGoal: number;
	/** Dny nemoci a dovolené z plánu – sérii týdnů nepřeruší. */
	excused: ReadonlySet<string>;
	today: string;
}

export const PULL_UP_IDS = ["pull-up", "chin-up", "wide-grip-pull-up", "chest-to-bar-pull-up"];
/** Klasické kliky a těžší varianty; kliky na kolenou a o vyvýšení se nepočítají. */
export const PUSH_UP_IDS = ["push-up", "wide-push-up", "diamond-push-up", "decline-push-up"];

/** Hranice pro půlmaraton a maraton: GPS bývá o pár set metrů kratší. */
const HALF_KM = 21;
const MARATHON_KM = 42;
const DISTANCES = [5, 10, HALF_KM, MARATHON_KM];

const RATIOS = [
	{ id: "benchBodyweight", exercise: "bench-press", ratio: 1, title: () => t("Bench press = body weight"), description: () => t("Estimated one-rep max in the bench press at least equal to your body weight.") },
	{ id: "squat1_5", exercise: "back-squat", ratio: 1.5, title: () => t("Squat 1.5× body weight"), description: () => t("Estimated one-rep max in the back squat at least 1.5 times your body weight.") },
	{ id: "deadlift2", exercise: "deadlift", ratio: 2, title: () => t("Deadlift 2× body weight"), description: () => t("Estimated one-rep max in the deadlift at least twice your body weight.") },
];

function sortByTime(workouts: readonly WorkoutNote[]): WorkoutNote[] {
	return [...workouts].sort((a, b) => (a.date + (a.start ?? "")).localeCompare(b.date + (b.start ?? "")));
}

/** Pracovní série bez dopomoci (guma = záporný přívažek). */
const unassisted = (set: SetEntry) => !set.warmup && (set.added_kg ?? 0) >= 0;

/** Tělesná hmotnost k datu: poslední zapsaná do toho dne, jinak první pozdější, jinak z profilu. */
function weightOn(weights: readonly { date: string; kg: number }[], date: string, profile: number | null): number | null {
	let found: number | null = null;
	for (const w of weights) {
		if (w.date <= date) found = w.kg;
		else return found ?? w.kg;
	}
	return found ?? profile;
}

/** Den, kterým řada po sobě jdoucích dnů s check-inem poprvé dosáhla délky `length`, a nejdelší řada. */
export function checkInStreak(days: readonly DayNote[], today: string, length: number): { reached: string | null; longest: number } {
	const dates = [...new Set(days.filter((d) => d.date <= today && hasCheckIn(d)).map((d) => d.date))].sort();
	let run = 0;
	let longest = 0;
	let reached: string | null = null;
	for (let i = 0; i < dates.length; i++) {
		run = i > 0 && addDays(dates[i - 1]!, 1) === dates[i] ? run + 1 : 1;
		longest = Math.max(longest, run);
		if (reached === null && run >= length) reached = dates[i]!;
	}
	return { reached, longest };
}

export function badges(input: BadgeInput): Badge[] {
	const { today, idOf } = input;
	const ordered = sortByTime(input.workouts.filter((w) => w.date <= today));
	const weights = input.days
		.flatMap((d) => (d.body.weight_kg !== undefined ? [{ date: d.date, kg: d.body.weight_kg }] : []))
		.sort((a, b) => a.date.localeCompare(b.date));

	// Běh
	let longest = 0;
	let totalKm = 0;
	const firstRun = new Map<number, string>();
	let run500: string | null = null;
	let run1000: string | null = null;
	const monthKm = new Map<string, number>();
	let month100k: string | null = null;
	// Síla vůči hmotnosti: nejlepší poměr a datum splnění
	const ratioBest: Record<string, number> = {};
	const ratioDone: Record<string, string | null> = {};
	// Kalistenika
	let firstPullUp: string | null = null;
	let pullUpBest = 0;
	let pullUps10: string | null = null;
	let pushUpBest = 0;
	let pushUps50: string | null = null;
	let pistol: string | null = null;
	let plankBest = 0;
	let plank60: string | null = null;

	for (const workout of ordered) {
		const km = workout.sport === "run" ? (workout.run?.distance_km ?? 0) : 0;
		if (km > 0) {
			longest = Math.max(longest, km);
			for (const limit of DISTANCES) if (!firstRun.has(limit) && km >= limit) firstRun.set(limit, workout.date);
			totalKm += km;
			if (run500 === null && totalKm >= 500) run500 = workout.date;
			if (run1000 === null && totalKm >= 1000) run1000 = workout.date;
			const month = workout.date.slice(0, 7);
			const total = (monthKm.get(month) ?? 0) + km;
			monthKm.set(month, total);
			if (month100k === null && total >= 100) month100k = workout.date;
		}
		for (const block of workout.blocks) {
			if (block.type !== "sets" && block.type !== "hold") continue;
			const id = idOf(block.exercise);
			if (block.type === "hold") {
				if (id !== "plank") continue;
				for (const set of block.sets) {
					if (set.warmup || set.sec === undefined) continue;
					plankBest = Math.max(plankBest, set.sec);
					if (plank60 === null && set.sec >= 60) plank60 = workout.date;
				}
				continue;
			}
			for (const set of block.sets) {
				const reps = set.reps ?? 0;
				if (id !== undefined && PULL_UP_IDS.includes(id) && unassisted(set) && reps >= 1) {
					pullUpBest = Math.max(pullUpBest, reps);
					if (firstPullUp === null) firstPullUp = workout.date;
					if (pullUps10 === null && reps >= 10) pullUps10 = workout.date;
				}
				if (id !== undefined && PUSH_UP_IDS.includes(id) && unassisted(set)) {
					pushUpBest = Math.max(pushUpBest, reps);
					if (pushUps50 === null && reps >= 50) pushUps50 = workout.date;
				}
				if (id === "pistol-squat" && unassisted(set) && reps >= 1 && pistol === null) pistol = workout.date;
			}
			const target = RATIOS.find((r) => r.exercise === id);
			const load = target && input.loadOf(block.exercise);
			if (!target || !load) continue;
			const bodyweight = weightOn(weights, workout.date, input.profileWeightKg);
			if (bodyweight === null || bodyweight <= 0) continue;
			for (const set of block.sets) {
				if (set.warmup) continue;
				const oneRm = estimateSet1RM(set, load, bodyweight);
				if (oneRm === null) continue;
				const ratio = oneRm / bodyweight;
				ratioBest[target.id] = Math.max(ratioBest[target.id] ?? 0, ratio);
				if ((ratioDone[target.id] ?? null) === null && ratio >= target.ratio) ratioDone[target.id] = workout.date;
			}
		}
	}

	const sessions = sortByTime(input.sessions.filter((w) => w.date <= today));
	const sessionDates = sessions.map((w) => w.date);
	const streak = weekStreak(sessionDates, today, input.weeklyGoal, input.excused);
	/** Poslední trénink v týdnu, kterým série dosáhla délky – den, kdy byl odznak skutečně získán. */
	const weeksReached = (length: number): string | null => {
		const monday = weekStreakReached(sessionDates, today, input.weeklyGoal, length, input.excused);
		if (monday === null) return null;
		const end = addDays(monday, 6);
		return sessionDates.filter((d) => d >= monday && d <= end).pop() ?? monday;
	};
	const checkIns = checkInStreak(input.days, today, 30);
	const km = "km";
	const ran = (limit: number) => firstRun.get(limit) ?? null;
	const workoutsUnit = t("workouts");
	const capped = (value: number, target: number, done: string | null) => (done ? target : Math.min(value, target));

	return [
		{ id: "first5k", group: "running", title: t("First five"), description: t("A run of at least 5 km."), achieved: ran(5), progress: { value: capped(longest, 5, ran(5)), target: 5, unit: km } },
		{ id: "first10k", group: "running", title: t("First ten"), description: t("A run of at least 10 km."), achieved: ran(10), progress: { value: capped(longest, 10, ran(10)), target: 10, unit: km } },
		{ id: "halfMarathon", group: "running", title: t("Half marathon"), description: t("A run of at least 21 km."), achieved: ran(HALF_KM), progress: { value: capped(longest, HALF_KM, ran(HALF_KM)), target: HALF_KM, unit: km } },
		{ id: "marathon", group: "running", title: t("Marathon"), description: t("A run of at least 42 km."), achieved: ran(MARATHON_KM), progress: { value: capped(longest, MARATHON_KM, ran(MARATHON_KM)), target: MARATHON_KM, unit: km } },
		{
			id: "month100k",
			group: "running",
			title: t("100 km in a month"),
			description: t("A hundred kilometers of running in one calendar month."),
			achieved: month100k,
			progress: { value: capped(monthKm.get(today.slice(0, 7)) ?? 0, 100, month100k), target: 100, unit: km },
		},
		{ id: "run500", group: "running", title: t("500 km"), description: t("Five hundred kilometers of running in total."), achieved: run500, progress: { value: capped(totalKm, 500, run500), target: 500, unit: km } },
		{ id: "run1000", group: "running", title: t("1000 km"), description: t("A thousand kilometers of running in total."), achieved: run1000, progress: { value: capped(totalKm, 1000, run1000), target: 1000, unit: km } },
		...RATIOS.map((r) => {
			const done = ratioDone[r.id] ?? null;
			return {
				id: r.id,
				group: "strength" as const,
				title: r.title(),
				description: r.description(),
				achieved: done,
				progress: { value: capped(Math.round((ratioBest[r.id] ?? 0) * 100) / 100, r.ratio, done), target: r.ratio, unit: t("× body weight") },
			};
		}),
		{ id: "firstPullUp", group: "calisthenics", title: t("First pull-up"), description: t("An unassisted pull-up logged in a workout."), achieved: firstPullUp, progress: { value: capped(pullUpBest, 1, firstPullUp), target: 1, unit: t("pull-up") } },
		{ id: "pullUps10", group: "calisthenics", title: t("10 pull-ups"), description: t("Ten unassisted pull-ups in one set."), achieved: pullUps10, progress: { value: capped(pullUpBest, 10, pullUps10), target: 10, unit: t("reps") } },
		{ id: "pushUps50", group: "calisthenics", title: t("50 push-ups"), description: t("Fifty push-ups in one set (not on the knees or against a raised surface)."), achieved: pushUps50, progress: { value: capped(pushUpBest, 50, pushUps50), target: 50, unit: t("reps") } },
		{ id: "firstPistol", group: "calisthenics", title: t("First pistol squat"), description: t("An unassisted pistol squat logged in a workout."), achieved: pistol, progress: { value: pistol ? 1 : 0, target: 1, unit: t("reps") } },
		{ id: "plank60", group: "calisthenics", title: t("A minute in the plank"), description: t("A plank held for at least 60 seconds."), achieved: plank60, progress: { value: capped(plankBest, 60, plank60), target: 60, unit: "s" } },
		...[50, 100, 250, 500].map((n) => {
			const done = sessions[n - 1]?.date ?? null;
			return { id: `workouts${n}`, group: "consistency" as const, title: tn(n, ["{n} workout", "{n} workouts"]), description: t("{n} logged workouts.", { n }), achieved: done, progress: { value: Math.min(sessions.length, n), target: n, unit: workoutsUnit } };
		}),
		...[10, 26].map((n) => {
			const done = weeksReached(n);
			return {
				id: `weeks${n}`,
				group: "consistency" as const,
				title: t("{n} weeks in a row", { n }),
				description: t("{n} completed weeks in a row with your weekly workout goal.", { n }),
				achieved: done,
				progress: { value: capped(streak.best, n, done), target: n, unit: t("weeks") },
			};
		}),
		{
			id: "checkIns30",
			group: "consistency",
			title: t("30 check-ins in a row"),
			description: t("A morning check-in on 30 days in a row."),
			achieved: checkIns.reached,
			progress: { value: capped(checkIns.longest, 30, checkIns.reached), target: 30, unit: t("days") },
		},
	];
}
