// Plán z cizího kalendáře (Runna nebo jiná trenérská aplikace s odkazem iCal):
// události → položky plánu týdne. Čisté funkce bez závislosti na Obsidianu.
// Formát událostí Runny není zdokumentovaný, proto se sport, intenzita, vzdálenost
// a délka jen odhadují z názvu (a popisu) – co nejde poznat, zůstane prázdné.

import type { PlanIntensity, Sport } from "../model/constants";
import type { PlanItem } from "../model/types";
import { MAX_PLAN_KM, MAX_PLAN_MINUTES } from "../model/parse";
import type { IcsEvent } from "./ics";

/** Kolik týdnů dopředu (včetně aktuálního) se plán z kalendáře přenáší. */
export const EXTERNAL_PLAN_WEEKS = 4;

const MILE_KM = 1.609344;
const MAX_NOTES = 300;

/** Položka z kalendáře bez id – to přidělí poznámka týdne. */
export type ExternalPlanItem = Omit<PlanItem, "id"> & { uid: string; source: string };

const REST = /\b(rest day|rest)\b|volno|odpočinek/i;
const STRENGTH = /strength|gym|weights|posilov|silov/i;
const SWIM = /swim|plav/i;
const OTHER = /yoga|jóga|pilates|mobility|mobilit|stretch|strečink|cycl|bike|kolo|cross[- ]?train/i;
const RUN = /run|jog|tempo|interval|fartlek|strides|hill|threshold|progression|race|parkrun|běh/i;
const HARD = /interval|tempo|threshold|fartlek|hill|repeat|race|time trial|vo2|speed|progression|práh/i;
const EASY = /easy|recovery|shake|lehk|regener|výklus/i;

/** „8 km“, „5,5km“, „3 mi“ → km; null když vzdálenost v textu není. */
function distanceKm(text: string): number | null {
	const m = /(\d+(?:[.,]\d+)?)\s*(km|mi|miles?)\b/i.exec(text);
	if (!m) return null;
	const value = Number(m[1]!.replace(",", "."));
	return Math.round((m[2]!.toLowerCase() === "km" ? value : value * MILE_KM) * 100) / 100;
}

/** „45 min“, „1 h 10 min“, „1 hr“ → minuty; null když délka v textu není. Samotné „m“ jsou metry (800m). */
function durationMin(text: string): number | null {
	const m = /(?:(\d+)\s*h(?:ours?|rs?)?\s*)?(\d+)\s*(?:min|mins|minutes)\b/i.exec(text) ?? /(\d+)\s*h(?:ours?|rs?)?\b/i.exec(text);
	if (!m) return null;
	if (m.length === 2) return Number(m[1]) * 60;
	return Number(m[1] ?? 0) * 60 + Number(m[2]);
}

function sportOf(text: string, hasDistance: boolean): Sport {
	if (STRENGTH.test(text)) return "strength";
	if (SWIM.test(text)) return "swim";
	if (OTHER.test(text)) return "other";
	return RUN.test(text) || hasDistance ? "run" : "other";
}

function intensityOf(text: string): PlanIntensity {
	if (HARD.test(text)) return "high";
	if (EASY.test(text)) return "low";
	return "mid";
}

/**
 * Události od `from` do `to` (včetně) jako položky plánu. Dny volna se přeskočí.
 * Vzdálenost a délka se berou z názvu; z popisu jen označená celková vzdálenost
 * („Distance: 8 km“, „Total 8 km“), protože popis obvykle rozepisuje jednotlivé úseky.
 */
export function externalPlanItems(events: readonly IcsEvent[], from: string, to: string, source: string): ExternalPlanItem[] {
	const out: ExternalPlanItem[] = [];
	const seen = new Set<string>();
	for (const event of events) {
		if (event.date < from || event.date > to || seen.has(event.uid)) continue;
		const title = event.summary.replace(/\s+/g, " ").trim();
		if (!title || (REST.test(title) && !RUN.test(title))) continue;
		seen.add(event.uid);
		const labelled = /(?:distance|total|vzdálenost|celkem)\D{0,15}(\d+(?:[.,]\d+)?\s*(?:km|mi|miles?))\b/i.exec(event.description);
		const km = distanceKm(title) ?? (labelled ? distanceKm(labelled[1]!) : null);
		const sport = sportOf(`${title} ${event.description}`, km !== null);
		const minutes = event.minutes ?? durationMin(title);
		const item: ExternalPlanItem = { uid: event.uid, source, date: event.date, sport, title: title.slice(0, 80), intensity: intensityOf(title) };
		if (sport === "run" && km !== null && km > 0 && km <= MAX_PLAN_KM) item.distance_km = km;
		if (minutes !== null && minutes > 0 && minutes <= MAX_PLAN_MINUTES) item.duration_min = minutes;
		const notes = event.description.replace(/\s+/g, " ").trim();
		if (notes) item.notes = notes.length > MAX_NOTES ? `${notes.slice(0, MAX_NOTES - 1)}…` : notes;
		out.push(item);
	}
	return out;
}
