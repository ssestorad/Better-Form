// Import aktivity ze souboru GPX nebo TCX (SPEC 6.3; binární FIT čte fitFile.ts): čtení záznamu, vzdálenost,
// čas v pohybu, tep, převýšení a nejrychlejší úseky. Čisté funkce bez závislosti
// na Obsidianu – XML se čte jednoduchými výrazy, bez DOM (kvůli testům i mobilu).

import { SCHEMA_VERSION, type Sport } from "../model/constants";
import type { RunData, WorkoutNote } from "../model/types";
import { BEST_EFFORT_KM, type BestEffortKey } from "../strava/activities";
import { t, tn } from "../i18n";

export const RUN_FILE_EXTENSIONS = [".gpx", ".tcx", ".fit"] as const;

export interface TrackPoint {
	/** Čas bodu v ms (UTC). */
	timeMs?: number;
	lat?: number;
	lon?: number;
	/** Nadmořská výška v metrech. */
	ele?: number;
	hr?: number;
	/** Vzdálenost od startu v metrech, jak ji zapsalo zařízení (TCX, FIT). */
	distM?: number;
}

export interface ParsedRunFile {
	format: "gpx" | "tcx" | "fit";
	/** Název aktivity ze souboru. */
	name?: string;
	/** Typ aktivity, jak je v souboru (např. „running“, „Biking“). */
	type?: string;
	points: TrackPoint[];
	/** Součty kol z TCX nebo souhrn z FIT – použijí se, když z bodů nejde vzdálenost nebo čas spočítat. */
	lapTimeS?: number;
	lapDistanceM?: number;
}

// ---------- Čtení XML ----------

function decode(text: string): string {
	return text
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, "&")
		.trim();
}

/** Obsah prvního prvku daného jména (i s prefixem jmenného prostoru). */
function tag(xml: string, name: string): string | undefined {
	const match = xml.match(new RegExp(`<(?:[\\w.-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}>`));
	return match ? decode(match[1]!) : undefined;
}

function num(text: string | undefined): number | undefined {
	if (text === undefined || text.trim() === "") return undefined;
	const value = Number(text.trim());
	return Number.isFinite(value) ? value : undefined;
}

function time(text: string | undefined): number | undefined {
	if (!text) return undefined;
	const ms = Date.parse(text.trim());
	return Number.isNaN(ms) ? undefined : ms;
}

function attribute(attributes: string, name: string): string | undefined {
	return attributes.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`))?.[1];
}

const compactPoint = (point: TrackPoint): TrackPoint => Object.fromEntries(Object.entries(point).filter(([, v]) => v !== undefined));

function parseGpx(xml: string): ParsedRunFile {
	const track = tag(xml, "trk") ?? xml;
	const points: TrackPoint[] = [];
	for (const match of xml.matchAll(/<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g)) {
		const body = match[2] ?? "";
		const hr = num(body.match(/<(?:[\w.-]+:)?hr>\s*(\d+(?:\.\d+)?)\s*</)?.[1]);
		points.push(compactPoint({ timeMs: time(tag(body, "time")), lat: num(attribute(match[1]!, "lat")), lon: num(attribute(match[1]!, "lon")), ele: num(tag(body, "ele")), hr }));
	}
	// Název a typ jsou v hlavičce stopy, před prvním úsekem.
	const head = track.split(/<trkseg\b/)[0] ?? "";
	const parsed: ParsedRunFile = { format: "gpx", points };
	const name = tag(head, "name");
	const type = tag(head, "type");
	if (name) parsed.name = name;
	if (type) parsed.type = type;
	return parsed;
}

function parseTcx(xml: string): ParsedRunFile {
	const points: TrackPoint[] = [];
	for (const match of xml.matchAll(/<Trackpoint\b[^>]*>([\s\S]*?)<\/Trackpoint>/g)) {
		const body = match[1]!;
		const heart = tag(body, "HeartRateBpm");
		points.push(
			compactPoint({
				timeMs: time(tag(body, "Time")),
				lat: num(tag(body, "LatitudeDegrees")),
				lon: num(tag(body, "LongitudeDegrees")),
				ele: num(tag(body, "AltitudeMeters")),
				hr: heart !== undefined ? num(tag(heart, "Value") ?? heart) : undefined,
				distM: num(tag(body, "DistanceMeters")),
			}),
		);
	}
	const parsed: ParsedRunFile = { format: "tcx", points };
	let lapTime = 0;
	let lapDistance = 0;
	for (const match of xml.matchAll(/<Lap\b[^>]*>([\s\S]*?)<\/Lap>/g)) {
		// Součty kola jsou před stopou; uvnitř stopy má `DistanceMeters` každý bod.
		const head = match[1]!.split(/<Track\b/)[0]!;
		lapTime += num(tag(head, "TotalTimeSeconds")) ?? 0;
		lapDistance += num(tag(head, "DistanceMeters")) ?? 0;
	}
	if (lapTime > 0) parsed.lapTimeS = lapTime;
	if (lapDistance > 0) parsed.lapDistanceM = lapDistance;
	const type = xml.match(/<Activity\b[^>]*\bSport\s*=\s*"([^"]*)"/)?.[1];
	if (type) parsed.type = decode(type);
	return parsed;
}

/** Přečte GPX nebo TCX; formát pozná podle obsahu, ne podle přípony. Chyby vrací česky. */
export function parseRunFile(text: string): ParsedRunFile {
	const xml = text.replace(/^\uFEFF/, "");
	if (/<gpx[\s>]/i.test(xml)) return parseGpx(xml);
	if (/<TrainingCenterDatabase[\s>]/i.test(xml)) return parseTcx(xml);
	throw new Error(t("The file isn't GPX, TCX or FIT. Export GPX from Strava, TCX from MapMyRun."));
}

// ---------- Výpočty ze záznamu ----------

const EARTH_RADIUS_M = 6371000;

/** Vzdálenost dvou bodů na kouli (haversine) v metrech. */
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const rad = Math.PI / 180;
	const dLat = (lat2 - lat1) * rad;
	const dLon = (lon2 - lon1) * rad;
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
	return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Úsek se počítá do času v pohybu od této rychlosti (0,5 m/s ≈ 33 min/km) – praxe.
 * Pomalejší úseky a mezery v záznamu jsou stání nebo pauza.
 */
export const MOVING_MIN_SPEED_MS = 0.5;

/**
 * Stoupání se započítá, až když výška od posledního zlomu vzroste aspoň o tolik
 * metrů – jinak by se sčítal šum GPS. Výsledek je odhad; Strava výšky koriguje
 * podle mapy, takže se čísla můžou lišit.
 */
export const ELEVATION_STEP_M = 3;

export interface RunTotals {
	distanceM: number;
	/** Čas v pohybu; chybí, když body nemají čas. */
	movingTimeS?: number;
	/** Čas od prvního do posledního bodu včetně pauz. */
	elapsedS?: number;
	startMs?: number;
	avgHr?: number;
	maxHr?: number;
	elevationM?: number;
	best: Partial<Record<BestEffortKey, number>>;
}

function segmentM(a: TrackPoint, b: TrackPoint): number {
	if (a.distM !== undefined && b.distM !== undefined) return Math.max(0, b.distM - a.distM);
	if (a.lat !== undefined && a.lon !== undefined && b.lat !== undefined && b.lon !== undefined) return haversineM(a.lat, a.lon, b.lat, b.lon);
	return 0;
}

/**
 * Nejrychlejší úsek dané délky: nejkratší čas (včetně pauz), za který záznam
 * urazil `targetM`. Konec úseku se mezi dvěma body dopočítá lineárně.
 */
export function fastestSegmentS(distM: readonly number[], timeS: readonly number[], targetM: number): number | null {
	const n = distM.length;
	if (n < 2 || distM[n - 1]! - distM[0]! < targetM) return null;
	let best: number | null = null;
	let j = 1;
	for (let i = 0; i < n - 1; i++) {
		if (j <= i) j = i + 1;
		while (j < n && distM[j]! - distM[i]! < targetM) j++;
		if (j >= n) break;
		const step = distM[j]! - distM[j - 1]!;
		const missing = targetM - (distM[j - 1]! - distM[i]!);
		const end = step > 0 ? timeS[j - 1]! + ((timeS[j]! - timeS[j - 1]!) * missing) / step : timeS[j]!;
		const seconds = end - timeS[i]!;
		if (best === null || seconds < best) best = seconds;
	}
	return best;
}

/** Součty záznamu: vzdálenost, časy, tep, převýšení a nejrychlejší úseky (1 km až maraton). */
export function runTotals(file: ParsedRunFile): RunTotals {
	const { points } = file;
	let distance = 0;
	let moving = 0;
	const timed: { d: number; t: number }[] = [];
	let previous: TrackPoint | undefined;
	for (const point of points) {
		if (previous) {
			const meters = segmentM(previous, point);
			distance += meters;
			if (previous.timeMs !== undefined && point.timeMs !== undefined) {
				const seconds = (point.timeMs - previous.timeMs) / 1000;
				if (seconds > 0 && meters / seconds >= MOVING_MIN_SPEED_MS) moving += seconds;
			}
		}
		if (point.timeMs !== undefined) timed.push({ d: distance, t: point.timeMs / 1000 });
		previous = point;
	}

	const totals: RunTotals = { distanceM: distance > 0 ? distance : (file.lapDistanceM ?? 0), best: {} };
	const first = timed[0];
	const last = timed[timed.length - 1];
	if (first && last) {
		totals.startMs = first.t * 1000;
		totals.elapsedS = last.t - first.t;
		// Bez poloh (např. běžecký pás) nejde pohyb poznat – vezme se čas kol, jinak celý záznam.
		totals.movingTimeS = moving > 0 ? moving : (file.lapTimeS ?? totals.elapsedS);
		if (distance > 0) {
			const d = timed.map((p) => p.d);
			const x = timed.map((p) => p.t);
			for (const key of Object.keys(BEST_EFFORT_KM) as BestEffortKey[]) {
				const seconds = fastestSegmentS(d, x, BEST_EFFORT_KM[key] * 1000);
				if (seconds !== null && seconds > 0) totals.best[key] = Math.round(seconds);
			}
		}
	}

	const rates = points.map((p) => p.hr).filter((hr): hr is number => hr !== undefined && hr > 0);
	if (rates.length > 0) {
		totals.avgHr = rates.reduce((sum, hr) => sum + hr, 0) / rates.length;
		totals.maxHr = Math.max(...rates);
	}

	const heights = points.map((p) => p.ele).filter((ele): ele is number => ele !== undefined);
	if (heights.length > 1) {
		let gain = 0;
		let reference = heights[0]!;
		for (const height of heights) {
			if (height - reference >= ELEVATION_STEP_M) {
				gain += height - reference;
				reference = height;
			} else if (reference - height >= ELEVATION_STEP_M) {
				reference = height;
			}
		}
		totals.elevationM = gain;
	}
	return totals;
}

// ---------- Záznam → trénink ----------

/** Sport podle typu v souboru. Neznámý nebo chybějící typ = běh (import je určený pro běhy). */
export function sportOfFileType(type: string | undefined): Sport {
	const text = (type ?? "").trim().toLowerCase();
	// Strava ve starších exportech píše číslo typu: 9 = běh, 1 = kolo.
	if (text === "" || text === "9" || /run|jog|běh|beh|treadmill/.test(text)) return "run";
	if (/swim|plav/.test(text)) return "swim";
	if (text === "1" || /bik|cycl|ride|kolo|walk|hik|chůze|ski|row|other/.test(text)) return "other";
	return "run";
}

/** Datum a čas v místním čase; `offsetMin` = posun místního času od UTC v minutách (léto v ČR +120). */
export function localDateTimeOf(ms: number, offsetMin: number = -new Date(ms).getTimezoneOffset()): { date: string; start: string } {
	const iso = new Date(ms + offsetMin * 60000).toISOString();
	return { date: iso.slice(0, 10), start: iso.slice(11, 16) };
}

/**
 * Trénink „k doplnění“ ze souboru (chybí RPE, typ běhu, boty). Vyhodí chybu, když
 * soubor nemá body s časem – pak je to naplánovaná trasa, ne záznam aktivity.
 */
export function runFileToWorkout(file: ParsedRunFile, offsetMin?: number, schema: number = SCHEMA_VERSION): WorkoutNote {
	const totals = runTotals(file);
	if (totals.startMs === undefined) throw new Error(t("The file has no timestamps – it looks like a planned route, not a recorded activity."));
	const when = localDateTimeOf(totals.startMs, offsetMin);
	const sport = sportOfFileType(file.type);
	const note: WorkoutNote = { forma: "workout", schema, date: when.date, start: when.start, sport, source: "file", blocks: [], pain: [] };
	if (file.name) note.title = file.name;
	const seconds = totals.movingTimeS;
	if (seconds !== undefined && seconds > 0) note.duration_min = Math.max(1, Math.round(seconds / 60));
	if (sport === "run") {
		const run: RunData = {};
		if (totals.distanceM > 0) run.distance_km = Math.round(totals.distanceM / 10) / 100;
		if (seconds !== undefined && seconds > 0) run.moving_time_s = Math.round(seconds);
		if (totals.avgHr !== undefined) run.avg_hr = Math.round(totals.avgHr);
		if (totals.maxHr !== undefined) run.max_hr = Math.round(totals.maxHr);
		if (totals.elevationM !== undefined && totals.elevationM > 0) run.elevation_m = Math.round(totals.elevationM);
		if (Object.keys(totals.best).length > 0) run.best_s = { ...totals.best };
		note.run = run;
	} else if (sport === "swim" && totals.distanceM > 0) {
		note.swim = { distance_m: Math.round(totals.distanceM) };
	}
	return note;
}

// ---------- Duplicity ----------

/** Tentýž záznam podruhé: start se liší nejvýš o tolik minut a vzdálenost o tolik procent. */
export const DUPLICATE_START_MIN = 2;
export const DUPLICATE_DISTANCE_TOLERANCE = 0.03;

const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));

/**
 * Najde už uložený trénink, který je tentýž záznam (stejný den a sport, skoro
 * stejný start a vzdálenost) – ať přišel ze souboru, nebo ze Stravy. Vrací index, nebo -1.
 */
export function findSameRecording(imported: WorkoutNote, existing: readonly WorkoutNote[]): number {
	if (imported.start === undefined) return -1;
	const km = imported.run?.distance_km;
	return existing.findIndex((note) => {
		if (note.date !== imported.date || note.sport !== imported.sport || note.start === undefined || note.source === "manual") return false;
		if (Math.abs(minutes(note.start) - minutes(imported.start!)) > DUPLICATE_START_MIN) return false;
		const other = note.run?.distance_km;
		if (km === undefined || other === undefined) return km === other;
		return Math.abs(other - km) / km <= DUPLICATE_DISTANCE_TOLERANCE;
	});
}

// ---------- Hlášení ----------

export interface RunImportCounts {
	created: number;
	merged: number;
	duplicates: number;
	/** Nové nebo sloučené běhy, jejichž soubor neobsahoval tep. */
	withoutHr: number;
	/** Soubory, které nešly načíst: název a důvod. */
	failed: { name: string; reason: string }[];
}

/** „Import ze souboru: 2 nové běhy, 1 sloučen s ručním zápisem, 1 už v deníku byl.“ */
export function describeRunImport(counts: RunImportCounts): string {
	const parts: string[] = [];
	if (counts.created > 0) parts.push(tn(counts.created, ["{n} new workout", "new workouts: {n}"]));
	if (counts.merged > 0) parts.push(t("merged with a manual entry: {merged}", { merged: counts.merged }));
	if (counts.duplicates > 0) parts.push(t("already in the journal: {duplicates}", { duplicates: counts.duplicates }));
	const lines = [parts.length > 0 ? t("File import – {v}.", { v: parts.join(", ") }) : t("File import: nothing new.")];
	if (counts.created + counts.merged > 0) lines.push(t("Add RPE, run type and shoes – the runs are in the list to complete."));
	if (counts.withoutHr > 0) {
		const which = counts.withoutHr === counts.created + counts.merged ? "" : ` (${counts.withoutHr}×)`;
		lines.push(t("The file has no heart rate{which} – the app doesn't have it for the activity, or didn't include it in the export. You can add heart rate manually.", { which }));
	}
	for (const failure of counts.failed) lines.push(`${failure.name}: ${failure.reason}`);
	return lines.join("\n");
}
