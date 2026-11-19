// Deník návyků: co se dělo předchozí den (alkohol, pozdní jídlo, obrazovka před spaním…)
// a jak se pak lišilo ráno – HRV, klidový tep, spánek a únava. Jen souvislost, ne příčina:
// stejný den se může stát víc věcí najednou. Minimální vzorek 5 dní „ano“ a 5 „ne“ za 90 dní
// podle Whoop Journal – praxe. Čisté funkce bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import { addDays } from "../model/dates";
import type { DayNote } from "../model/types";

export const HABIT_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };
export const HABIT_WINDOW_DAYS = 90;
export const HABIT_MIN_DAYS = 5;

/** Výchozí návyky (anglicky; uživatel si je v nastavení přejmenuje nebo doplní). */
export const DEFAULT_HABITS = ["Alcohol", "Caffeine after 2 pm", "Late meal", "Screen before bed", "Travel"];

export type HabitMetric = "hrv" | "resting_hr" | "sleep" | "fatigue";

/** Čím je ráno lépe: vyšší HRV a spánek, nižší tep a únava. */
export const HABIT_METRIC_BETTER: Record<HabitMetric, "higher" | "lower"> = { hrv: "higher", resting_hr: "lower", sleep: "higher", fatigue: "lower" };

function metric(day: DayNote | undefined, m: HabitMetric): number | undefined {
	if (!day) return undefined;
	switch (m) {
		case "hrv":
			return day.hrv.rmssd_ms;
		case "resting_hr":
			return day.hrv.resting_hr;
		case "sleep":
			return day.sleep.duration_min;
		case "fatigue":
			return day.check_in.fatigue;
	}
}

export interface HabitEffect {
	metric: HabitMetric;
	yesDays: number;
	noDays: number;
	/** Průměr následujícího rána po dni s návykem a bez něj. */
	yes: number;
	no: number;
	/** Rozdíl v procentech proti dnům bez návyku. */
	pct: number;
	/** Rozdíl je ve směru, který znamená horší ráno. */
	worse: boolean;
}

export interface HabitImpact {
	habit: string;
	/** Kolik dní s návykem a bez něj (dny se zapsaným deníkem) – i když vliv ještě nejde ukázat. */
	yesDays: number;
	noDays: number;
	effects: HabitEffect[];
}

/**
 * Vliv návyků na další ráno za posledních 90 dní. Deník se počítá od prvního zápisu
 * v okně; den s denní poznámkou bez daného návyku = „ne“. Dny před prvním zápisem
 * se nepočítají – nejde poznat „ne“ od „nevyplnil“.
 */
export function habitImpact(days: readonly DayNote[], habits: readonly string[], today: string): HabitImpact[] {
	const from = addDays(today, -HABIT_WINDOW_DAYS);
	const byDate = new Map(days.map((d) => [d.date, d]));
	const logged = days.filter((d) => d.date >= from && d.date < today && d.habits !== undefined);
	// Deník se vede od prvního zápisu; dny s denní poznámkou po něm bez návyků = „nic z toho“.
	const start = logged.length > 0 ? logged.reduce((min, d) => (d.date < min ? d.date : min), logged[0]!.date) : null;
	const journalDays = start === null ? [] : days.filter((d) => d.date >= start && d.date < today);
	const key = (s: string) => s.trim().toLocaleLowerCase("cs");
	return habits.map((habit) => {
		const yesDates: string[] = [];
		const noDates: string[] = [];
		for (const day of journalDays) (day.habits?.some((h) => key(h) === key(habit)) ? yesDates : noDates).push(day.date);
		const effects: HabitEffect[] = [];
		for (const m of Object.keys(HABIT_METRIC_BETTER) as HabitMetric[]) {
			const next = (dates: string[]) => dates.map((d) => metric(byDate.get(addDays(d, 1)), m)).filter((v): v is number => v !== undefined);
			const yes = next(yesDates);
			const no = next(noDates);
			if (yes.length < HABIT_MIN_DAYS || no.length < HABIT_MIN_DAYS) continue;
			const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
			const y = mean(yes);
			const n = mean(no);
			if (n === 0) continue;
			const pct = ((y - n) / n) * 100;
			effects.push({ metric: m, yesDays: yes.length, noDays: no.length, yes: y, no: n, pct, worse: HABIT_METRIC_BETTER[m] === "higher" ? pct < 0 : pct > 0 });
		}
		return { habit, yesDays: yesDates.length, noDays: noDates.length, effects };
	});
}
