// Synchronizace s Garmin Connect přes Personal API: denní hodnoty (kroky, spánek,
// klidový tep, váha, volitelně HRV) a běhy jako soubory FIT. Jen čtení; spouští ji
// uživatel. Klíč ani token se nikdy nelogují ani nevypisují do hlášek.

import { requestUrl } from "obsidian";
import { missingValues } from "../calc/dailyImport";
import type { DayService } from "../data/DayService";
import type { FormaIndex } from "../data/FormaIndex";
import type { RunImportService } from "../data/RunImportService";
import { toIsoDate } from "../model/dates";
import type { BetterFormSettings } from "../settings/settings";
import { t } from "../i18n";
import {
	GARMIN_BASE_URL,
	GARMIN_CHUNK_DAYS,
	GARMIN_TOKEN_PATH,
	dateChunks,
	extractToken,
	fitFromDownload,
	fromDailySummaries,
	fromHrv,
	fromSleep,
	fromWeight,
	mergeRows,
	runActivities,
	syncStart,
	type GarminRow,
} from "./garminData";

/** Kolik běhů nejvýš stáhnout při jedné synchronizaci (zbytek příště). */
export const GARMIN_MAX_RUNS = 50;

export interface GarminSyncResult {
	from: string;
	to: string;
	/** Dny, do kterých se něco doplnilo, a kolik hodnot. */
	days: number;
	values: number;
	runs: { created: number; merged: number; duplicate: number; failed: number };
}

export class GarminSync {
	private token: string | null = null;
	private running = false;

	constructor(
		private readonly index: FormaIndex,
		private readonly days: DayService,
		private readonly runImport: RunImportService,
		private readonly settings: () => BetterFormSettings,
		private readonly save: () => Promise<void>,
	) {}

	get isRunning(): boolean {
		return this.running;
	}

	get isConfigured(): boolean {
		return this.settings().garmin.apiKey.trim() !== "";
	}

	/** Klíč se změnil – starý token zahodit. */
	forgetToken(): void {
		this.token = null;
	}

	async sync(today = toIsoDate(new Date())): Promise<GarminSyncResult> {
		if (this.running) throw new Error(t("Garmin sync is already running."));
		this.running = true;
		try {
			const garmin = this.settings().garmin;
			const from = syncStart(today, garmin.lastSync, garmin.initialDays);
			const result: GarminSyncResult = { from, to: today, days: 0, values: 0, runs: { created: 0, merged: 0, duplicate: 0, failed: 0 } };

			if (garmin.syncDaily) {
				const rows = await this.dailyRows(from, today, garmin.syncHrv);
				const missing = rows.filter((row) => Object.keys(missingValues(row, this.index.day(row.date)?.note)).length > 0);
				const filled = await this.days.fillMissing(missing);
				result.days = filled.days;
				result.values = filled.values;
			}
			if (garmin.syncRuns) {
				const list = await this.json("/activitylist-service/activities/search/activities", { startDate: from, endDate: today, activityType: "running", limit: "1000" });
				for (const run of runActivities(list).slice(0, GARMIN_MAX_RUNS)) {
					try {
						const fit = await fitFromDownload(await this.binary(`/download-service/files/activity/${run.id}`));
						if (!fit) {
							result.runs.failed++;
							continue;
						}
						result.runs[(await this.runImport.importFile(fit)).action]++;
					} catch {
						result.runs.failed++;
					}
				}
			}
			garmin.lastSync = today;
			await this.save();
			return result;
		} finally {
			this.running = false;
		}
	}

	private async dailyRows(from: string, to: string, hrv: boolean): Promise<GarminRow[]> {
		const summaries: GarminRow[] = [];
		const sleep: GarminRow[] = [];
		const hrvRows: GarminRow[] = [];
		const weight: GarminRow[] = [];
		for (const chunk of dateChunks(from, to, GARMIN_CHUNK_DAYS)) {
			summaries.push(...fromDailySummaries(await this.json("/usersummary-service/v2/dailysummaries", { startDate: chunk.from, endDate: chunk.to })));
			sleep.push(...fromSleep(await this.json("/sleep-service/sleep/dailySleepSummariesByDate", { startDate: chunk.from, endDate: chunk.to })));
			if (hrv) hrvRows.push(...fromHrv(await this.json(`/hrv-service/hrv/daily/${chunk.from}/${chunk.to}`)));
			weight.push(...fromWeight(await this.json(`/weight-service/weight/range/${chunk.from}/${chunk.to}`, { includeAll: "true" })));
		}
		return mergeRows(summaries, sleep, hrvRows, weight);
	}

	private async json(path: string, query?: Record<string, string>): Promise<unknown> {
		const response = await this.get(path, query, "application/json");
		if (response.status === 204 || response.text.trim() === "") return null;
		try {
			return JSON.parse(response.text) as unknown;
		} catch {
			return null;
		}
	}

	private async binary(path: string): Promise<ArrayBuffer> {
		return (await this.get(path)).arrayBuffer;
	}

	/** GET s tokenem; při 401 jednou požádá o nový token. */
	private async get(path: string, query?: Record<string, string>, accept?: string, retried = false): Promise<{ status: number; text: string; arrayBuffer: ArrayBuffer }> {
		const token = await this.accessToken();
		const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
		let response;
		try {
			response = await requestUrl({ url: `${GARMIN_BASE_URL}${path}${qs}`, headers: { ...(accept ? { Accept: accept } : {}), Authorization: `Bearer ${token}` }, throw: false });
		} catch {
			// Záměrně bez původní chyby – mohla by obsahovat hlavičku s tokenem.
			throw new Error(t("Couldn't connect to Garmin Connect – check your internet connection."));
		}
		if (response.status === 401 && !retried) {
			this.token = null;
			return this.get(path, query, accept, true);
		}
		if (response.status === 404 || response.status === 204) return { status: response.status, text: "", arrayBuffer: new ArrayBuffer(0) };
		if (response.status === 429) throw new Error(t("Garmin Connect is limiting requests – try again in a while."));
		if (response.status >= 400) throw new Error(t("Garmin Connect returned an error ({v}).", { v: response.status }));
		return { status: response.status, text: response.text, arrayBuffer: response.arrayBuffer };
	}

	/** Klíč → přístupový token (platí 24 h, obnovovací token Garmin nemá). */
	private async accessToken(): Promise<string> {
		if (this.token) return this.token;
		const key = this.settings().garmin.apiKey.trim();
		if (!key) throw new Error(t("Fill in the Garmin Connect key in the Better Form settings first."));
		let response;
		try {
			response = await requestUrl({ url: `${GARMIN_BASE_URL}${GARMIN_TOKEN_PATH}`, method: "POST", headers: { Authorization: `ApiKey ${key}` }, throw: false });
		} catch {
			throw new Error(t("Couldn't connect to Garmin Connect – check your internet connection."));
		}
		if (response.status === 401 || response.status === 403) throw new Error(t("Garmin Connect rejected the key – it may have expired. Create a new one and paste it into the settings."));
		const token = response.status < 400 ? extractToken(response.text) : "";
		if (!/^[\w-]+\.[\w-]+\.[\w-]*$/.test(token)) throw new Error(t("Garmin Connect returned an error ({v}).", { v: response.status }));
		this.token = token;
		return token;
	}
}

/** Krátké shrnutí synchronizace do hlášky. */
export function describeGarminSync(result: GarminSyncResult): string {
	const { runs } = result;
	const parts = [t("Garmin: days with new values {days} ({values} values)", { days: result.days, values: result.values })];
	if (runs.created + runs.merged + runs.duplicate + runs.failed > 0) {
		parts.push(t("new runs {created}, added to logged runs {merged}, already in the journal {duplicate}", runs));
		if (runs.failed > 0) parts.push(t("couldn't read {failed}", runs));
	}
	return `${parts.join(" · ")}.`;
}
