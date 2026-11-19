// Zrcadlení denních metrik do vlastní denní poznámky uživatele (volitelné): klíče s předponou
// bf_ ve frontmatteru, aby je šlo číst přes Bases nebo Dataview i bez pluginu. Plugin přepisuje
// jen tyto klíče, nic jiného v poznámce nemění. Čisté funkce bez závislosti na Obsidianu.

import type { DayNote, WorkoutNote } from "../model/types";

/** Klíče, které plugin do denní poznámky zapisuje (a jen ty smí přepsat nebo smazat). */
export const MIRROR_KEYS = ["bf_readiness", "bf_load", "bf_sleep_h", "bf_hrv", "bf_rhr", "bf_weight", "bf_steps", "bf_workouts", "bf_workout_min", "bf_run_km"] as const;
export type MirrorKey = (typeof MIRROR_KEYS)[number];

export interface MirrorInput {
	day?: DayNote;
	/** Tréninky toho dne. */
	workouts: readonly WorkoutNote[];
	/** Zátěž dne (session RPE × minuty, AU). */
	loadAu?: number;
	/** Připravenost 0–100; null, když nejde spočítat. */
	readiness: number | null;
}

const round = (value: number, digits = 0) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Hodnoty pro denní poznámku; chybějící údaj = undefined (klíč se z poznámky odstraní). */
export function mirrorValues(input: MirrorInput): Record<MirrorKey, number | undefined> {
	const { day, workouts } = input;
	const minutes = workouts.reduce((sum, w) => sum + (w.duration_min ?? 0), 0);
	const km = workouts.reduce((sum, w) => sum + (w.sport === "run" ? (w.run?.distance_km ?? 0) : 0), 0);
	return {
		bf_readiness: input.readiness ?? undefined,
		bf_load: input.loadAu !== undefined && input.loadAu > 0 ? round(input.loadAu) : undefined,
		bf_sleep_h: day?.sleep.duration_min !== undefined ? round(day.sleep.duration_min / 60, 1) : undefined,
		bf_hrv: day?.hrv.rmssd_ms,
		bf_rhr: day?.hrv.resting_hr,
		bf_weight: day?.body.weight_kg,
		bf_steps: day?.steps,
		bf_workouts: workouts.length > 0 ? workouts.length : undefined,
		bf_workout_min: minutes > 0 ? round(minutes) : undefined,
		bf_run_km: km > 0 ? round(km, 2) : undefined,
	};
}

/**
 * Zapíše hodnoty do frontmatteru (objekt z processFrontMatter). Mění jen klíče bf_; chybějící
 * hodnotu smaže. Vrací true, když se něco změnilo – bez změny se poznámka nepřepisuje.
 */
export function applyMirror(frontmatter: Record<string, unknown>, values: Record<MirrorKey, number | undefined>): boolean {
	let changed = false;
	for (const key of MIRROR_KEYS) {
		const value = values[key];
		if (value === undefined) {
			if (key in frontmatter) {
				delete frontmatter[key];
				changed = true;
			}
		} else if (frontmatter[key] !== value) {
			frontmatter[key] = value;
			changed = true;
		}
	}
	return changed;
}

/** Bez změny? Porovná uložený frontmatter s novými hodnotami (aby se poznámka zbytečně nepřepsala). */
export function mirrorDiffers(frontmatter: Readonly<Record<string, unknown>> | undefined, values: Record<MirrorKey, number | undefined>): boolean {
	return MIRROR_KEYS.some((key) => (values[key] === undefined ? frontmatter !== undefined && key in frontmatter : frontmatter?.[key] !== values[key]));
}

const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Název denní poznámky z data podle formátu ve stylu moment.js – běžné tokeny YYYY, YY,
 * MMMM, MMM, MM, M, DD, D, dddd, ddd a text v [hranatých závorkách]. Složitější formáty
 * (týdny, lokalizované názvy) nepodporuje.
 */
export function dailyNoteName(date: string, format: string): string {
	const [y, m, d] = date.split("-").map(Number) as [number, number, number];
	const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
	const tokens: Record<string, string> = {
		YYYY: String(y),
		YY: String(y).slice(-2),
		MMMM: MONTHS_EN[m - 1]!,
		MMM: MONTHS_EN[m - 1]!.slice(0, 3),
		MM: String(m).padStart(2, "0"),
		M: String(m),
		DD: String(d).padStart(2, "0"),
		D: String(d),
		dddd: WEEKDAYS_EN[weekday]!,
		ddd: WEEKDAYS_EN[weekday]!.slice(0, 3),
	};
	return format.replace(/\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd/g, (match, literal: string | undefined) => literal ?? tokens[match] ?? match);
}
