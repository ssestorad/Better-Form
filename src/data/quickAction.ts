// Rychlé akce z odkazu obsidian://better-form?action=… – pro zástupce na ploše telefonu,
// Zkratky (iOS) a widgety. Jen čtení parametrů; co se pak otevře, rozhoduje plugin.
// Bez závislosti na Obsidianu.

import { isIsoDate } from "../model/dates";
import { SPORTS, type Sport } from "../model/constants";

export const QUICK_ACTION_PROTOCOL = "better-form";

export type QuickAction =
	| { kind: "checkin"; date?: string }
	| { kind: "log"; date?: string; template?: string; sport?: Sport }
	| { kind: "tab"; tab: string }
	| { kind: "counter"; program: string; reps: number; exercise?: string }
	| { kind: "sync"; service: "garmin" | "strava" | "runna" };

/** Parametry odkazu → akce; null u neznámé akce nebo chybějícího povinného parametru. */
export function parseQuickAction(params: Readonly<Record<string, string | undefined>>): QuickAction | null {
	const text = (key: string) => {
		const value = params[key]?.trim();
		return value ? value : undefined;
	};
	const date = text("date");
	const validDate = date !== undefined && isIsoDate(date) ? date : undefined;
	switch (text("action")) {
		case "checkin":
		case "check-in":
			return { kind: "checkin", ...(validDate ? { date: validDate } : {}) };
		case "log": {
			const sport = text("sport");
			return {
				kind: "log",
				...(validDate ? { date: validDate } : {}),
				...(text("template") ? { template: text("template") } : {}),
				...(sport && (SPORTS as readonly string[]).includes(sport) ? { sport: sport as Sport } : {}),
			};
		}
		case "tab": {
			const tab = text("tab") ?? text("name");
			return tab ? { kind: "tab", tab } : null;
		}
		case "counter": {
			const program = text("program");
			const reps = Number(text("reps"));
			if (!program || !Number.isInteger(reps) || reps <= 0 || reps > 1000) return null;
			return { kind: "counter", program, reps, ...(text("exercise") ? { exercise: text("exercise") } : {}) };
		}
		case "sync": {
			const service = text("service");
			return service === "garmin" || service === "strava" || service === "runna" ? { kind: "sync", service } : null;
		}
		default:
			return null;
	}
}
