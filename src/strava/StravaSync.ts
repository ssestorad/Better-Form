// Synchronizace běhů ze Stravy (SPEC 6.1): stažení aktivit, deduplikace,
// sloučení s ručně zapsanými běhy a doplnění detailu (nejlepší úseky, tepové zóny).
// Tokeny se nikdy nelogují ani nevypisují do hlášek.

import { requestUrl, type TFile } from "obsidian";
import type { FormaIndex } from "../data/FormaIndex";
import type { WorkoutService } from "../data/WorkoutService";
import { SCHEMA_VERSION } from "../model/constants";
import type { WorkoutNote } from "../model/types";
import type { BetterFormSettings } from "../settings/settings";
import {
	PAGE_SIZE,
	hasMorePages,
	parseActivities,
	parseBestEfforts,
	parseHeartRateZones,
	planSync,
	syncAfter,
	type StravaActivity,
	type SyncResult,
} from "./activities";
import { describeStravaError } from "./oauth";
import type { StravaAuth } from "./StravaAuth";
import { t } from "../i18n";

const API = "https://www.strava.com/api/v3";

/**
 * Kolik aktivit nejvýš dostane při jedné synchronizaci detail (2 požadavky na
 * aktivitu). Strava dovoluje 100 čtecích požadavků za 15 minut; zbytek se
 * doplní při dalších synchronizacích.
 */
export const DETAIL_BUDGET = 30;


class StravaApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}

interface Target {
	file: TFile;
	note: WorkoutNote;
}

export class StravaSync {
	private running = false;
	/** Tréninky zapsané v tomto sezení – index se o nich dozví se zpožděním. */
	private readonly recent: WorkoutNote[] = [];

	constructor(
		private readonly auth: StravaAuth,
		private readonly index: FormaIndex,
		private readonly workouts: WorkoutService,
		private readonly settings: () => BetterFormSettings,
		private readonly save: () => Promise<void>,
	) {}

	get isRunning(): boolean {
		return this.running;
	}

	async sync(): Promise<SyncResult> {
		if (this.running) throw new Error(t("Sync is already running."));
		this.running = true;
		try {
			return await this.run();
		} finally {
			this.running = false;
		}
	}

	private async run(): Promise<SyncResult> {
		const strava = this.settings().strava;
		const startedAt = Math.floor(Date.now() / 1000);
		const token = await this.auth.accessToken();
		const activities = await this.fetchActivities(token, syncAfter(strava.lastSyncAt, strava.initialDays, startedAt));

		const existing = this.index.all("workout");
		const plan = planSync(
			activities,
			// Nedávno zapsané importy na konec: mají strava_id, takže jen brání duplicitám.
			[...existing.map((e) => e.note), ...this.recent],
			strava.activityTypes,
			SCHEMA_VERSION,
		);

		// Tréninky zapsané v této synchronizaci – index o nich ještě neví.
		const written: Target[] = [];
		for (const { index, note } of plan.merge) {
			const file = existing[index]!.file;
			await this.workouts.saveNote(note, file);
			written.push({ file, note });
		}
		for (const note of plan.create) {
			written.push({ file: await this.workouts.saveNote(note), note });
		}

		this.recent.push(...written.map((t) => t.note));
		strava.lastSyncAt = startedAt;
		await this.save();

		const result: SyncResult = {
			created: plan.create.length,
			merged: plan.merge.length,
			duplicates: plan.duplicates,
			details: 0,
			detailsPending: 0,
			rateLimited: false,
		};
		await this.fillDetails(token, written, result);
		return result;
	}

	private async fetchActivities(token: string, after: number): Promise<StravaActivity[]> {
		const all: StravaActivity[] = [];
		for (let page = 1; ; page++) {
			const json = await this.get(token, `/athlete/activities?after=${after}&page=${page}&per_page=${PAGE_SIZE}`);
			const batch = parseActivities(json);
			all.push(...batch);
			if (!hasMorePages(Array.isArray(json) ? json.length : 0, page)) break;
		}
		return all;
	}

	/** Doplní nejlepší úseky a tepové zóny – od nejnovějších, v rámci rozpočtu požadavků. */
	private async fillDetails(token: string, written: Target[], result: SyncResult): Promise<void> {
		const writtenFiles = new Set(written.map((t) => t.file));
		const older = this.index
			.all("workout")
			.filter((e) => !writtenFiles.has(e.file) && e.schemaStatus !== "newer")
			.map((e) => ({ file: e.file, note: e.note }));
		const targets = [...written, ...older]
			.filter((t) => t.note.strava_id !== undefined && t.note.run?.strava_detail !== true)
			.sort((a, b) => b.note.date.localeCompare(a.note.date));

		let zonesAvailable = true;
		let done = 0;
		for (const target of targets) {
			if (done >= DETAIL_BUDGET) break;
			try {
				const id = target.note.strava_id!;
				const run = { ...target.note.run };
				const best = parseBestEfforts(await this.get(token, `/activities/${id}`));
				if (Object.keys(best).length > 0) run.best_s = best;
				if (zonesAvailable && run.avg_hr !== undefined && run.hr_zone_s === undefined) {
					try {
						const zones = parseHeartRateZones(await this.get(token, `/activities/${id}/zones`));
						if (zones) run.hr_zone_s = zones;
					} catch (err) {
						// Zóny jsou jen pro předplatitele Stravy (402) – dál je nezkoušet.
						if (err instanceof StravaApiError && [402, 403, 404].includes(err.status)) zonesAvailable = false;
						else throw err;
					}
				}
				run.strava_detail = true;
				await this.workouts.saveNote({ ...target.note, run }, target.file);
				done++;
			} catch (err) {
				if (err instanceof StravaApiError && err.status === 429) {
					result.rateLimited = true;
					break;
				}
				// Smazaná nebo nedostupná aktivita: přeskočit, ostatní dokončit.
				if (err instanceof StravaApiError && err.status === 404) continue;
				throw err;
			}
		}
		result.details = done;
		result.detailsPending = Math.max(0, targets.length - done);
	}

	private async get(token: string, path: string): Promise<unknown> {
		let status: number;
		let json: unknown;
		try {
			const response = await requestUrl({
				url: `${API}${path}`,
				headers: { Authorization: `Bearer ${token}` },
				throw: false,
			});
			status = response.status;
			try {
				json = response.json;
			} catch {
				json = null;
			}
		} catch {
			// Záměrně bez původní chyby – mohla by obsahovat hlavičku s tokenem.
			throw new Error(t("Couldn't connect to Strava – check your internet connection."));
		}
		if (status < 200 || status >= 300) throw new StravaApiError(status, describeStravaError(status, json));
		return json;
	}
}
