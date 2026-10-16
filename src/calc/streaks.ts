// Série a odznaky (SPEC 9.2). Čisté funkce bez závislosti na Obsidianu.

import { addDays, startOfWeek } from "../model/dates";
import type { WorkoutNote } from "../model/types";
import { t } from "../i18n";

// ---------- Týdenní cíl ----------

export interface WeekStreak {
	/** Tréninky v aktuálním týdnu (po–ne). */
	thisWeek: number;
	goal: number;
	/** Počet po sobě jdoucích splněných týdnů; rozdělaný týden sérii nepřeruší. */
	current: number;
	best: number;
}

/**
 * Cíl týdne snížený o omluvené dny (nemoc, dovolená): poměrně podle zbylých dnů,
 * zaokrouhleno nahoru. Celý omluvený týden má cíl 0 – sérii nepřeruší ani neprodlouží.
 */
export function excusedGoal(goal: number, excusedDays: number): number {
	const free = Math.max(0, 7 - Math.max(0, excusedDays));
	return Math.ceil((goal * free) / 7);
}

/**
 * Série splněných týdnů. `dates` = datum každého tréninku (jeden záznam na
 * trénink). Aktuální týden se započítá, jakmile je splněný; dokud není,
 * série se počítá do minulého týdne. `excused` = dny nemoci a dovolené: snižují
 * cíl svého týdne a plně omluvený týden se přeskočí.
 */
export function weekStreak(dates: readonly string[], today: string, goal: number, excused: ReadonlySet<string> = new Set()): WeekStreak {
	const counts = new Map<string, number>();
	let first: string | null = null;
	for (const date of dates) {
		if (date > today) continue;
		const week = startOfWeek(date);
		counts.set(week, (counts.get(week) ?? 0) + 1);
		if (first === null || week < first) first = week;
	}
	const thisMonday = startOfWeek(today);
	const thisWeek = counts.get(thisMonday) ?? 0;
	if (first === null || goal <= 0) return { thisWeek, goal, current: 0, best: 0 };

	const excusedByWeek = new Map<string, number>();
	for (const date of excused) excusedByWeek.set(startOfWeek(date), (excusedByWeek.get(startOfWeek(date)) ?? 0) + 1);
	const weekGoal = (week: string) => excusedGoal(goal, excusedByWeek.get(week) ?? 0);
	/** Plně omluvený týden: nepočítá se ani pro, ani proti. */
	const skipped = (week: string) => weekGoal(week) === 0;
	const met = (week: string) => (counts.get(week) ?? 0) >= weekGoal(week);
	let current = 0;
	for (let week = met(thisMonday) && !skipped(thisMonday) ? thisMonday : addDays(thisMonday, -7); week >= first; week = addDays(week, -7)) {
		if (skipped(week)) continue;
		if (!met(week)) break;
		current++;
	}

	let best = 0;
	let run = 0;
	for (let week = first; week <= thisMonday; week = addDays(week, 7)) {
		if (skipped(week)) continue;
		run = met(week) ? run + 1 : 0;
		best = Math.max(best, run);
	}
	return { thisWeek, goal, current, best: Math.max(best, current) };
}

// ---------- Dny programu ----------

/**
 * Série splněných dnů programu: jde se od `today` zpět po dnech, kdy má program
 * úkoly. Dnešek bez splnění sérii nepřeruší (ještě se dá stihnout).
 */
export function dayStreak(
	isScheduled: (date: string) => boolean,
	isDone: (date: string) => boolean,
	today: string,
	since: string,
	maxDays = 366,
): number {
	let streak = 0;
	for (let i = 0; i < maxDays; i++) {
		const date = addDays(today, -i);
		if (date < since) break;
		if (!isScheduled(date)) continue;
		if (isDone(date)) streak++;
		else if (i > 0) break;
	}
	return streak;
}

// ---------- Odznaky ----------

export type BadgeId = "first10k" | "month100k" | "workouts50" | "firstPullUp";

export interface Badge {
	id: BadgeId;
	title: string;
	description: string;
	/** Datum získání; null = zatím ne. */
	achieved: string | null;
	/** Průběh k získání. */
	progress: { value: number; target: number; unit: string };
}

function sortByTime(workouts: readonly WorkoutNote[]): WorkoutNote[] {
	return [...workouts].sort((a, b) => (a.date + (a.start ?? "")).localeCompare(b.date + (b.start ?? "")));
}

/**
 * Odznaky ze SPEC 9.2: první 10 km, 100 km za měsíc, 50 tréninků, první shyb.
 * `sessions` = tréninky, které se počítají do „50 tréninků“ (bez denních počítadel).
 */
export function badges(
	workouts: readonly WorkoutNote[],
	sessions: readonly WorkoutNote[],
	isPullUp: (exercise: string) => boolean,
	today: string,
): Badge[] {
	const ordered = sortByTime(workouts.filter((w) => w.date <= today));

	// První běh na 10 km.
	let first10k: string | null = null;
	let longest = 0;
	// 100 km běhu v jednom kalendářním měsíci.
	const monthKm = new Map<string, number>();
	let month100k: string | null = null;
	// První shyb bez dopomoci.
	let firstPullUp: string | null = null;
	let pullUpBest = 0;

	for (const workout of ordered) {
		const km = workout.sport === "run" ? (workout.run?.distance_km ?? 0) : 0;
		if (km > 0) {
			longest = Math.max(longest, km);
			if (first10k === null && km >= 10) first10k = workout.date;
			const month = workout.date.slice(0, 7);
			const total = (monthKm.get(month) ?? 0) + km;
			monthKm.set(month, total);
			if (month100k === null && total >= 100) month100k = workout.date;
		}
		for (const block of workout.blocks) {
			if (block.type !== "sets" || !isPullUp(block.exercise)) continue;
			for (const set of block.sets) {
				if (set.warmup || (set.added_kg ?? 0) < 0 || set.reps === undefined || set.reps < 1) continue;
				pullUpBest = Math.max(pullUpBest, set.reps);
				if (firstPullUp === null) firstPullUp = workout.date;
			}
		}
	}

	const orderedSessions = sortByTime(sessions.filter((w) => w.date <= today));
	const fiftieth = orderedSessions[49]?.date ?? null;
	const currentMonthKm = monthKm.get(today.slice(0, 7)) ?? 0;

	return [
		{
			id: "first10k",
			title: t("První desítka"),
			description: t("Běh dlouhý aspoň 10 km."),
			achieved: first10k,
			progress: { value: Math.min(longest, 10), target: 10, unit: "km" },
		},
		{
			id: "month100k",
			title: t("100 km za měsíc"),
			description: t("Sto kilometrů běhu v jednom kalendářním měsíci."),
			achieved: month100k,
			progress: { value: Math.min(month100k ? 100 : currentMonthKm, 100), target: 100, unit: "km" },
		},
		{
			id: "workouts50",
			title: t("50 tréninků"),
			description: t("Padesát zapsaných tréninků."),
			achieved: fiftieth,
			progress: { value: Math.min(orderedSessions.length, 50), target: 50, unit: t("tréninků") },
		},
		{
			id: "firstPullUp",
			title: t("První shyb"),
			description: t("Shyb bez dopomoci zapsaný v tréninku."),
			achieved: firstPullUp,
			progress: { value: Math.min(pullUpBest, 1), target: 1, unit: "shyb" },
		},
	];
}
