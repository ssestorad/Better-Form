// Garmin Connect Personal API: převod odpovědí na denní hodnoty a seznam běhů.
// Čisté funkce bez závislosti na Obsidianu. Tvar odpovědí Garmin nepopisuje celý,
// proto se hodnoty hledají tolerantně a co chybí, se jen přeskočí.

import type { DailyRow } from "../calc/dailyImport";
import { addDays, daysBetween, isIsoDate } from "../model/dates";

export const GARMIN_BASE_URL = "https://personal.connectapi.garmin.com";
export const GARMIN_TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token";
/** Stránka v Garmin Connect, kde si uživatel vytvoří vlastní klíč. */
export const GARMIN_KEY_URL = "https://connect.garmin.com/app/settings/personalApiToken";

/** Nejdelší rozsah dní jednoho dotazu (spánek a HRV dovolí 31 dní, souhrny rok). */
export const GARMIN_CHUNK_DAYS = 28;
/** Synchronizace se vrací o pár dní zpět – hodinky se synchronizují se zpožděním. */
export const GARMIN_OVERLAP_DAYS = 3;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
const positive = (value: unknown): number | undefined => {
	const n = num(value);
	return n !== undefined && n > 0 ? n : undefined;
};

/** Token z odpovědi: holý JWT, nebo JSON s `access_token`. Prázdný řetězec = nic. */
export function extractToken(body: string): string {
	const text = body.trim();
	if (!text.startsWith("{")) return text.replace(/^"|"$/g, "");
	try {
		const json = JSON.parse(text) as Json;
		const token = json.access_token ?? json.accessToken ?? json.token;
		return typeof token === "string" ? token.trim() : "";
	} catch {
		return "";
	}
}

/** Rozdělí rozsah dní (včetně obou konců) na úseky po nejvýš `maxDays` dnech. */
export function dateChunks(from: string, to: string, maxDays: number): { from: string; to: string }[] {
	const out: { from: string; to: string }[] = [];
	for (let start = from; start <= to; start = addDays(start, maxDays)) {
		const end = addDays(start, maxDays - 1);
		out.push({ from: start, to: end < to ? end : to });
	}
	return out;
}

/** Od kdy stahovat: od poslední synchronizace s překryvem, poprvé `initialDays` zpět. */
export function syncStart(today: string, lastSync: string | undefined, initialDays: number): string {
	if (lastSync && isIsoDate(lastSync) && daysBetween(lastSync, today) >= 0) return addDays(lastSync, -GARMIN_OVERLAP_DAYS);
	return addDays(today, -(initialDays - 1));
}

/** Položky odpovědi: pole přímo, nebo první pole objektů uvnitř (i o úroveň hlouběji). */
export function items(json: unknown): Json[] {
	if (Array.isArray(json)) return json.filter(isObject);
	if (!isObject(json)) return [];
	for (const value of Object.values(json)) {
		if (Array.isArray(value) && value.some(isObject)) return value.filter(isObject);
	}
	for (const value of Object.values(json)) {
		const inner = isObject(value) ? items(value) : [];
		if (inner.length > 0) return inner;
	}
	return [];
}

/** Datum položky: `calendarDate` / `summaryDate` (YYYY-MM-DD), jinak čas v ms. */
function dateOf(item: Json): string | null {
	for (const key of ["calendarDate", "summaryDate"]) {
		const value = item[key];
		if (typeof value === "string" && isIsoDate(value.slice(0, 10))) return value.slice(0, 10);
	}
	const ms = num(item.date) ?? num(item.timestampGMT);
	return ms !== undefined ? new Date(ms).toISOString().slice(0, 10) : null;
}

/** Garmin posílá místní čas jako milisekundy „v UTC“ – hodiny se čtou bez převodu pásma. */
function localClock(ms: unknown): string | undefined {
	const value = num(ms);
	if (value === undefined) return undefined;
	const d = new Date(value);
	return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Den, ke kterému hodnota patří, a hodnoty k doplnění. Spánek patří ke dni probuzení. */
export type GarminRow = DailyRow;

/** Denní souhrny: kroky a klidový tep. */
export function fromDailySummaries(json: unknown): GarminRow[] {
	return items(json).flatMap((item) => {
		const date = dateOf(item);
		if (!date) return [];
		const row: GarminRow = { date };
		const steps = num(item.totalSteps);
		if (steps !== undefined && steps > 0) row.steps = Math.round(steps);
		const rhr = positive(item.restingHeartRate);
		if (rhr !== undefined) row.resting_hr = Math.round(rhr);
		return Object.keys(row).length > 1 ? [row] : [];
	});
}

/** Spánek: délka bez probuzení a časy usnutí a probuzení (místní). */
export function fromSleep(json: unknown): GarminRow[] {
	return items(json).flatMap((raw) => {
		const item = isObject(raw.dailySleepDTO) ? raw.dailySleepDTO : raw;
		const date = dateOf(item);
		const seconds = positive(item.sleepTimeSeconds);
		if (!date || seconds === undefined) return [];
		const row: GarminRow = { date, duration_min: Math.round(seconds / 60) };
		const onset = localClock(item.sleepStartTimestampLocal);
		const wake = localClock(item.sleepEndTimestampLocal);
		if (onset && wake) Object.assign(row, { sleep_onset: onset, wake });
		return [row];
	});
}

/** HRV přes noc: průměr rMSSD poslední noci v ms. */
export function fromHrv(json: unknown): GarminRow[] {
	return items(json).flatMap((raw) => {
		const item = isObject(raw.hrvSummary) ? raw.hrvSummary : raw;
		const date = dateOf(item) ?? dateOf(raw);
		const rmssd = positive(item.lastNightAvg);
		return date && rmssd !== undefined ? [{ date, rmssd_ms: Math.round(rmssd * 10) / 10 }] : [];
	});
}

/** Váha: poslední vážení dne; API ji vrací v gramech. */
export function fromWeight(json: unknown): GarminRow[] {
	const byDate = new Map<string, number>();
	for (const raw of items(json)) {
		const metrics = Array.isArray(raw.allWeightMetrics) ? raw.allWeightMetrics.filter(isObject) : [];
		const item = isObject(raw.latestWeight) ? raw.latestWeight : (metrics.at(-1) ?? raw);
		const date = dateOf(raw) ?? dateOf(item);
		const weight = positive(item.weight);
		if (date && weight !== undefined) byDate.set(date, weight > 1000 ? weight / 1000 : weight);
	}
	return [...byDate].map(([date, kg]) => ({ date, weight_kg: Math.round(kg * 10) / 10 }));
}

/** Spojí řádky podle dne; dřívější zdroj má přednost. Seřazeno od nejstaršího dne. */
export function mergeRows(...sources: GarminRow[][]): GarminRow[] {
	const byDate = new Map<string, GarminRow>();
	for (const rows of sources) {
		for (const row of rows) byDate.set(row.date, { ...row, ...byDate.get(row.date) });
	}
	return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Běhy ze seznamu aktivit: id a den startu. Typ běhu poznají podle `activityType.typeKey`. */
export function runActivities(json: unknown): { id: number; date: string }[] {
	return items(json).flatMap((item) => {
		const type = isObject(item.activityType) ? item.activityType.typeKey : undefined;
		const id = num(item.activityId);
		const start = typeof item.startTimeLocal === "string" ? item.startTimeLocal.slice(0, 10) : "";
		if (typeof type !== "string" || !/run/.test(type) || id === undefined || !isIsoDate(start)) return [];
		return [{ id, date: start }];
	});
}

/**
 * Soubor aktivity: FIT přímo, nebo první .fit v ZIP (uložený, nebo deflate). Velikosti
 * se berou z centrálního adresáře – místní hlavička je mívá prázdné (datový deskriptor).
 * Null = archiv bez souboru FIT nebo nečitelný.
 */
export async function fitFromDownload(data: ArrayBuffer): Promise<ArrayBuffer | null> {
	const bytes = new Uint8Array(data);
	const view = new DataView(data);
	if (bytes.length < 4 || view.getUint32(0, true) !== 0x04034b50) return data;
	let end = -1;
	for (let pos = bytes.length - 22; pos >= Math.max(0, bytes.length - 22 - 0xffff); pos--) {
		if (view.getUint32(pos, true) === 0x06054b50) {
			end = pos;
			break;
		}
	}
	if (end < 0) return null;
	const count = view.getUint16(end + 10, true);
	for (let i = 0, pos = view.getUint32(end + 16, true); i < count && pos + 46 <= bytes.length; i++) {
		if (view.getUint32(pos, true) !== 0x02014b50) return null;
		const method = view.getUint16(pos + 10, true);
		const size = view.getUint32(pos + 20, true);
		const nameLength = view.getUint16(pos + 28, true);
		const local = view.getUint32(pos + 42, true);
		const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
		pos += 46 + nameLength + view.getUint16(pos + 30, true) + view.getUint16(pos + 32, true);
		if (!/\.fit$/i.test(name) || local + 30 > bytes.length) continue;
		const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
		const body = bytes.slice(start, start + size);
		if (method === 0) return body.buffer;
		if (method === 8) return new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
		return null;
	}
	return null;
}
