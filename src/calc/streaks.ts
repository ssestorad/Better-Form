// Série (SPEC 9.2). Čisté funkce bez závislosti na Obsidianu.

import { addDays, startOfWeek } from "../model/dates";

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
/** Splnění jednotlivých týdnů (po–ne) od prvního tréninku po aktuální týden. */
interface WeekStatus {
	/** Pondělí týdne. */
	week: string;
	count: number;
	met: boolean;
	/** Plně omluvený týden: nepočítá se ani pro, ani proti. */
	skipped: boolean;
}

function weekStatuses(dates: readonly string[], today: string, goal: number, excused: ReadonlySet<string>): WeekStatus[] {
	const counts = new Map<string, number>();
	let first: string | null = null;
	for (const date of dates) {
		if (date > today) continue;
		const week = startOfWeek(date);
		counts.set(week, (counts.get(week) ?? 0) + 1);
		if (first === null || week < first) first = week;
	}
	if (first === null || goal <= 0) return [];
	const excusedByWeek = new Map<string, number>();
	for (const date of excused) excusedByWeek.set(startOfWeek(date), (excusedByWeek.get(startOfWeek(date)) ?? 0) + 1);
	const out: WeekStatus[] = [];
	for (let week = first; week <= startOfWeek(today); week = addDays(week, 7)) {
		const weekGoal = excusedGoal(goal, excusedByWeek.get(week) ?? 0);
		const count = counts.get(week) ?? 0;
		out.push({ week, count, met: count >= weekGoal, skipped: weekGoal === 0 });
	}
	return out;
}

/**
 * Série splněných týdnů. `dates` = datum každého tréninku (jeden záznam na
 * trénink). Aktuální týden se započítá, jakmile je splněný; dokud není,
 * série se počítá do minulého týdne. `excused` = dny nemoci a dovolené: snižují
 * cíl svého týdne a plně omluvený týden se přeskočí.
 */
export function weekStreak(dates: readonly string[], today: string, goal: number, excused: ReadonlySet<string> = new Set()): WeekStreak {
	const thisMonday = startOfWeek(today);
	const thisWeek = dates.filter((d) => d <= today && startOfWeek(d) === thisMonday).length;
	const weeks = weekStatuses(dates, today, goal, excused);
	if (weeks.length === 0) return { thisWeek, goal, current: 0, best: 0 };

	let current = 0;
	const last = weeks[weeks.length - 1]!;
	const counted = last.week === thisMonday && (!last.met || last.skipped) ? weeks.slice(0, -1) : weeks;
	for (let i = counted.length - 1; i >= 0; i--) {
		const w = counted[i]!;
		if (w.skipped) continue;
		if (!w.met) break;
		current++;
	}

	let best = 0;
	let run = 0;
	for (const w of weeks) {
		if (w.skipped) continue;
		run = w.met ? run + 1 : 0;
		best = Math.max(best, run);
	}
	return { thisWeek, goal, current, best: Math.max(best, current) };
}

/** Pondělí týdne, kterým série splněných týdnů poprvé dosáhla délky `length`; jinak null. */
export function weekStreakReached(dates: readonly string[], today: string, goal: number, length: number, excused: ReadonlySet<string> = new Set()): string | null {
	let run = 0;
	for (const w of weekStatuses(dates, today, goal, excused)) {
		if (w.skipped) continue;
		run = w.met ? run + 1 : 0;
		if (run >= length) return w.week;
	}
	return null;
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
