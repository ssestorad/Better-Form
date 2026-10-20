// Převod aktivit Stravy na tréninky a plán synchronizace (SPEC 6.1).
// Čisté funkce bez závislosti na Obsidianu – síť a zápis řeší StravaSync.

import type { RunData, WorkoutNote } from "../model/types";
import { cadenceSpm } from "../calc/running";
import { t, tn } from "../i18n";

/** Pole aktivity ze seznamu `GET /athlete/activities`, která plugin používá. */
export interface StravaActivity {
	id: number;
	name?: string;
	type?: string;
	sport_type?: string;
	/** Místní čas začátku ve tvaru „2026-09-28T17:30:00Z“ (písmeno Z neznamená UTC). */
	start_date_local?: string;
	/** Vzdálenost v metrech. */
	distance?: number;
	moving_time?: number;
	elapsed_time?: number;
	total_elevation_gain?: number;
	has_heartrate?: boolean;
	average_heartrate?: number;
	max_heartrate?: number;
	/** Průměrná kadence za jednu nohu. */
	average_cadence?: number;
}

/** Kolik aktivit na stránku se žádá (Strava dovolí nejvýš 200). */
export const PAGE_SIZE = 100;
/** Pojistka proti nekonečnému stránkování. */
export const MAX_PAGES = 20;
/** Synchronizace se vrací o pár dnů zpět kvůli aktivitám nahraným se zpožděním. */
export const SYNC_OVERLAP_S = 7 * 24 * 3600;
/** Ručně zapsaný běh se s importem sloučí, když se vzdálenost liší nejvýš o tolik. */
export const MERGE_DISTANCE_TOLERANCE = 0.1;

const DAY_S = 24 * 3600;

/** Od kdy stahovat (unixový čas): při první synchronizaci `initialDays` zpět, jinak poslední sync s přesahem. */
export function syncAfter(lastSyncAt: number, initialDays: number, nowS: number): number {
	if (lastSyncAt <= 0) return Math.floor(nowS - Math.max(1, initialDays) * DAY_S);
	return Math.max(0, Math.floor(lastSyncAt - SYNC_OVERLAP_S));
}

/** Je třeba žádat další stránku? */
export function hasMorePages(receivedOnPage: number, page: number): boolean {
	return receivedOnPage >= PAGE_SIZE && page < MAX_PAGES;
}

/** Přečte seznam aktivit z odpovědi; položky bez číselného `id` zahodí. */
export function parseActivities(json: unknown): StravaActivity[] {
	if (!Array.isArray(json)) return [];
	return json.filter(
		(item): item is StravaActivity =>
			typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "number",
	);
}

/** Patří aktivita mezi importované typy (Run, TrailRun, VirtualRun…)? */
export function isWantedActivity(activity: StravaActivity, types: readonly string[]): boolean {
	const wanted = new Set(types.map((t) => t.trim().toLowerCase()).filter((t) => t !== ""));
	return [activity.sport_type, activity.type].some((t) => typeof t === "string" && wanted.has(t.toLowerCase()));
}

function positive(value: number | undefined): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Datum a čas z místního času Stravy; null u neplatného formátu. */
export function localDateTime(startDateLocal: string | undefined): { date: string; start: string } | null {
	const match = startDateLocal?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
	return match ? { date: match[1]!, start: match[2]! } : null;
}

/** Aktivita → trénink „k doplnění“ (chybí RPE, typ běhu, boty). Null bez platného data. */
export function activityToWorkout(activity: StravaActivity, schema: number): WorkoutNote | null {
	const when = localDateTime(activity.start_date_local);
	if (!when) return null;
	const meters = positive(activity.distance);
	const moving = positive(activity.moving_time);
	const run: RunData = {};
	if (meters !== undefined) run.distance_km = Math.round(meters / 10) / 100;
	if (moving !== undefined) run.moving_time_s = Math.round(moving);
	const avgHr = positive(activity.average_heartrate);
	const maxHr = positive(activity.max_heartrate);
	if (avgHr !== undefined) run.avg_hr = Math.round(avgHr);
	if (maxHr !== undefined) run.max_hr = Math.round(maxHr);
	const elevation = positive(activity.total_elevation_gain);
	if (elevation !== undefined) run.elevation_m = Math.round(elevation);
	const cadence = positive(activity.average_cadence);
	if (cadence !== undefined) run.cadence_spm = cadenceSpm(cadence);
	const note: WorkoutNote = {
		forma: "workout",
		schema,
		date: when.date,
		start: when.start,
		sport: "run",
		source: "strava",
		strava_id: activity.id,
		run,
		blocks: [],
		pain: [],
	};
	const title = activity.name?.trim();
	if (title) note.title = title;
	if (moving !== undefined) note.duration_min = Math.max(1, Math.round(moving / 60));
	return note;
}

/**
 * Najde ručně zapsaný běh, který je nejspíš tentýž jako import: stejný den,
 * bez `strava_id`, vzdálenost do ±10 %. Když ruční běh vzdálenost nemá, sloučí
 * se jen tehdy, je-li ten den jediný. Vrací index v `candidates`, nebo -1.
 */
export function findManualMatch(imported: WorkoutNote, candidates: readonly WorkoutNote[]): number {
	const sameDay = candidates
		.map((note, index) => ({ note, index }))
		.filter(
			({ note }) =>
				note.sport === "run" && note.date === imported.date && note.strava_id === undefined && note.source === "manual",
		);
	const km = imported.run?.distance_km;
	let best = -1;
	let bestDiff = Number.POSITIVE_INFINITY;
	for (const { note, index } of sameDay) {
		const manualKm = note.run?.distance_km;
		if (manualKm === undefined || km === undefined) continue;
		const diff = Math.abs(manualKm - km) / km;
		if (diff <= MERGE_DISTANCE_TOLERANCE && diff < bestDiff) {
			best = index;
			bestDiff = diff;
		}
	}
	if (best >= 0) return best;
	const withoutDistance = sameDay.filter(({ note }) => note.run?.distance_km === undefined);
	return sameDay.length === 1 && withoutDistance.length === 1 ? withoutDistance[0]!.index : -1;
}

/**
 * Sloučí import (ze Stravy nebo ze souboru) do ručně zapsaného běhu: měřené údaje
 * (vzdálenost, čas, tep, převýšení) z importu, vše, co zadal uživatel (RPE, typ,
 * boty, název, program, poznámka, délka tréninku), zůstává.
 */
export function mergeIntoManual(manual: WorkoutNote, imported: WorkoutNote): WorkoutNote {
	const run: RunData = { ...manual.run, ...imported.run };
	const merged: WorkoutNote = { ...manual, source: imported.source, run };
	if (imported.strava_id !== undefined) merged.strava_id = imported.strava_id;
	if (manual.start === undefined && imported.start !== undefined) merged.start = imported.start;
	if (manual.title === undefined && imported.title !== undefined) merged.title = imported.title;
	if (manual.duration_min === undefined && imported.duration_min !== undefined) merged.duration_min = imported.duration_min;
	return merged;
}

export interface SyncPlan {
	/** Nové tréninky k založení. */
	create: WorkoutNote[];
	/** Sloučení do existujících ručních běhů: index v `existing` a výsledný trénink. */
	merge: { index: number; note: WorkoutNote }[];
	/** Už importované aktivity (stejné `strava_id`). */
	duplicates: number;
	/** Aktivity jiného typu nebo bez platného data. */
	ignored: number;
}

/**
 * Rozhodne, co s každou staženou aktivitou: přeskočit duplicitu, sloučit s
 * ručním během, nebo založit nový trénink. Každý ruční běh se sloučí nejvýš jednou.
 */
export function planSync(
	activities: readonly StravaActivity[],
	existing: readonly WorkoutNote[],
	types: readonly string[],
	schema: number,
): SyncPlan {
	const plan: SyncPlan = { create: [], merge: [], duplicates: 0, ignored: 0 };
	const knownIds = new Set(existing.map((w) => w.strava_id).filter((id): id is number => id !== undefined));
	const taken = new Set<number>();
	for (const activity of activities) {
		if (!isWantedActivity(activity, types)) {
			plan.ignored++;
			continue;
		}
		if (knownIds.has(activity.id)) {
			plan.duplicates++;
			continue;
		}
		const note = activityToWorkout(activity, schema);
		if (!note) {
			plan.ignored++;
			continue;
		}
		knownIds.add(activity.id);
		const free = existing.map((w, index) => ({ w, index })).filter(({ index }) => !taken.has(index));
		const found = free[findManualMatch(note, free.map(({ w }) => w))];
		if (found) {
			taken.add(found.index);
			plan.merge.push({ index: found.index, note: mergeIntoManual(found.w, note) });
		} else {
			plan.create.push(note);
		}
	}
	return plan;
}

// ---------- Detail aktivity: nejlepší úseky a tepové zóny ----------

/** Klíče uložených nejlepších úseků (`run.best_s`) a jejich délka v km. */
export const BEST_EFFORT_KM = { "1k": 1, "5k": 5, "10k": 10, half: 21.0975, marathon: 42.195 } as const;
export type BestEffortKey = keyof typeof BEST_EFFORT_KM;

const EFFORT_NAMES: Record<string, BestEffortKey> = {
	"1k": "1k",
	"5k": "5k",
	"10k": "10k",
	"half-marathon": "half",
	marathon: "marathon",
};

/** Nejlepší úseky z detailu aktivity (`best_efforts`): klíč → čas v sekundách. */
export function parseBestEfforts(detail: unknown): Partial<Record<BestEffortKey, number>> {
	const efforts = (detail as { best_efforts?: unknown } | null)?.best_efforts;
	const out: Partial<Record<BestEffortKey, number>> = {};
	if (!Array.isArray(efforts)) return out;
	for (const effort of efforts) {
		const { name, elapsed_time: elapsed } = (effort ?? {}) as { name?: unknown; elapsed_time?: unknown };
		const key = typeof name === "string" ? EFFORT_NAMES[name.trim().toLowerCase()] : undefined;
		if (!key || typeof elapsed !== "number" || !Number.isFinite(elapsed) || elapsed <= 0) continue;
		if (out[key] === undefined || elapsed < out[key]) out[key] = Math.round(elapsed);
	}
	return out;
}

/** Čas v tepových zónách 1–5 z `GET /activities/{id}/zones`; null, když tepové zóny chybí. */
export function parseHeartRateZones(json: unknown): number[] | null {
	if (!Array.isArray(json)) return null;
	const zone = json.find((z) => (z as { type?: unknown } | null)?.type === "heartrate") as
		| { distribution_buckets?: unknown }
		| undefined;
	const buckets = zone?.distribution_buckets;
	if (!Array.isArray(buckets) || buckets.length === 0) return null;
	const times = buckets.map((b) => {
		const time = (b as { time?: unknown } | null)?.time;
		return typeof time === "number" && Number.isFinite(time) && time >= 0 ? Math.round(time) : 0;
	});
	return times.some((t) => t > 0) ? times : null;
}

// ---------- Výsledek synchronizace ----------

export interface SyncResult {
	/** Nově založené tréninky. */
	created: number;
	/** Importy sloučené s ručně zapsaným během. */
	merged: number;
	/** Aktivity, které už ve vaultu byly. */
	duplicates: number;
	/** Tréninky, kterým se doplnil detail (úseky, zóny). */
	details: number;
	/** Tréninky, které na detail ještě čekají. */
	detailsPending: number;
	/** Strava během synchronizace omezila požadavky; zbytek příště. */
	rateLimited: boolean;
}

/** Shrnutí synchronizace do jedné hlášky. */
export function describeSync(result: SyncResult): string {
	const parts: string[] = [];
	if (result.created > 0) parts.push(t("new runs: {created}", { created: result.created }));
	if (result.merged > 0) parts.push(t("merged with a manual entry: {merged}", { merged: result.merged }));
	if (result.details > 0) parts.push(t("details added: {details}", { details: result.details }));
	let text = parts.length > 0 ? `Strava – ${parts.join(", ")}.` : t("Strava – nothing new.");
	if (result.rateLimited) text += t(" Strava limited the number of requests; the remaining details will be added next time.");
	else if (result.detailsPending > 0) text += tn(result.detailsPending, [" Details still missing for {n} run – run the sync again later.", " Details still missing for {n} runs – run the sync again later."]);
	return text;
}
