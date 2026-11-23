// Synchronizace (Garmin, Strava, Runna), metriky v denní poznámce uživatele a rychlé akce z odkazu.

import { normalizePath, Notice, TFile } from "obsidian";
import { type QuickAction } from "../data/quickAction";
import { applyMirror, dailyNoteName, mirrorDiffers, mirrorValues } from "../calc/dailyMirror";
import { dailyLoads } from "../calc/load";
import { isTabId } from "../ui/tabs";
import { get, type Writable } from "svelte/store";
import { describeSync } from "../strava/activities";
import { describeGarminSync } from "../garmin/GarminSync";
import { syncRunna } from "../data/RunnaSync";
import { toIsoDate } from "../model/dates";
import { t } from "../i18n";
import type BetterFormPlugin from "../main";

/**
 * Společný průběh ruční synchronizace: jen jedna naráz, chybějící nastavení ohlásí,
 * během běhu nastaví `busy` a výsledek nebo chybu oznámí hláškou. Z chyby se vypíše
 * jen text – nikdy celý objekt (mohl by nést klíč, token nebo tajný odkaz).
 */
async function runSync(plugin: BetterFormPlugin, options: {
	label: string;
	busy: Writable<boolean>;
	missing: string | null;
	progress?: string;
	run: () => Promise<string>;
}): Promise<void> {
	if (get(options.busy)) return;
	if (options.missing) {
		new Notice(options.missing);
		return;
	}
	options.busy.set(true);
	const progress = options.progress ? new Notice(options.progress, 0) : null;
	try {
		new Notice(await options.run(), 10000);
	} catch (err) {
		new Notice(`${options.label}: ${err instanceof Error ? err.message : "sync failed."}`, 10000);
	} finally {
		progress?.hide();
		options.busy.set(false);
		plugin.indexVersion.update((n) => n + 1);
	}
}

/** Ruční synchronizace s Garmin Connect (denní data a běhy). */
export function syncGarmin(plugin: BetterFormPlugin): Promise<void> {
	return runSync(plugin, {
		label: "Garmin",
		busy: plugin.garminBusy,
		missing: plugin.garminSync.isConfigured ? null : t("Fill in the Garmin Connect key in the Better Form settings first."),
		progress: t("Syncing Garmin Connect…"),
		run: async () => describeGarminSync(await plugin.garminSync.sync()),
	});
}

/** Plán z Runny přes odkaz na kalendář. */
export function syncRunnaPlan(plugin: BetterFormPlugin): Promise<void> {
	return runSync(plugin, {
		label: "Runna",
		busy: plugin.runnaBusy,
		missing: plugin.settings.runna.url.trim() ? null : t("Fill in the Runna calendar link in the Better Form settings first."),
		run: async () => {
			const r = await syncRunna(plugin.plans, plugin.settings, () => plugin.saveSettings(), toIsoDate(new Date()));
			return r.added + r.updated + r.removed === 0
				? t("The plan from Runna is up to date.")
				: t("Plan from Runna: {v} added, {v2} changed, {v3} removed.", { v: r.added, v2: r.updated, v3: r.removed });
		},
	});
}

/** Ruční synchronizace běhů ze Stravy. */
export function syncStrava(plugin: BetterFormPlugin): Promise<void> {
	return runSync(plugin, {
		label: "Strava",
		busy: plugin.stravaBusy,
		missing: plugin.strava.isConnected ? null : t("Strava isn't connected – connect it in the Better Form settings."),
		run: async () => describeSync(await plugin.stravaSync.sync()),
	});
}

/**
 * Zapíše metriky dne (bf_…) do existující denní poznámky uživatele, jen když je to zapnuté
 * a hodnoty se liší. Poznámku nezakládá a nic jiného v ní nemění.
 */
export async function mirrorDailyNotes(plugin: BetterFormPlugin, dates: readonly string[]): Promise<void> {
	const mirror = plugin.settings.dailyMirror;
	if (!mirror.enabled || !mirror.format.trim()) return;
	for (const date of new Set(dates)) {
		const name = dailyNoteName(date, mirror.format.trim());
		const file = plugin.app.vault.getAbstractFileByPath(normalizePath(mirror.folder.trim() ? `${mirror.folder.trim()}/${name}.md` : `${name}.md`));
		if (!(file instanceof TFile)) continue;
		const workouts = plugin.index.all("workout").map((w) => w.note).filter((w) => w.date === date);
		const values = mirrorValues({
			day: plugin.index.day(date)?.note,
			workouts,
			loadAu: dailyLoads(workouts).byDate.get(date),
			readiness: plugin.insights.readinessHistory(date, 1)[0]?.score ?? null,
		});
		if (!mirrorDiffers(plugin.app.metadataCache.getFileCache(file)?.frontmatter, values)) continue;
		try {
			await plugin.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => void applyMirror(frontmatter, values));
		} catch (err) {
			console.error("Better Form: daily note metrics", err);
		}
	}
}

/** Provede rychlou akci z odkazu (data/quickAction.ts). */
export async function runQuickAction(plugin: BetterFormPlugin, action: QuickAction): Promise<void> {
	const today = toIsoDate(new Date());
	const same = (a: string, b: string) => a.trim().toLocaleLowerCase("cs") === b.trim().toLocaleLowerCase("cs");
	switch (action.kind) {
		case "checkin":
			plugin.openCheckIn(action.date ?? today);
			return;
		case "log": {
			const template = action.template ? plugin.index.all("template").find((e) => same(e.note.name, action.template!) || same(e.file.basename, action.template!)) : undefined;
			if (action.template && !template) new Notice(t("Template “{v}” wasn't found – opening an empty workout.", { v: action.template }));
			plugin.openWorkout({ date: action.date ?? today, ...(template ? { template: template.file } : {}), ...(action.sport ? { sport: action.sport } : {}) });
			return;
		}
		case "tab":
			if (!isTabId(action.tab)) {
				new Notice(t("Better Form: unknown tab “{v}”.", { v: action.tab }));
				return;
			}
			await plugin.activateView();
			plugin.showTab(action.tab);
			return;
		case "counter": {
			const entry = plugin.programs.programs().find((p) => same(p.note.name, action.program) || same(p.file.basename, action.program));
			const task = entry ? plugin.programs.tasks(entry, today).find((x) => x.target.kind === "daily_total" && (!action.exercise || same(x.exercise, action.exercise))) : undefined;
			if (!entry || !task) {
				new Notice(t("No daily counter of program “{v}” for today.", { v: action.program }));
				return;
			}
			await plugin.programs.addToCounter(entry, task.exercise, action.reps, today);
			plugin.indexVersion.update((n) => n + 1);
			new Notice(t("Added {reps} × {exercise} to the daily counter.", { reps: action.reps, exercise: task.exercise }));
			return;
		}
		case "sync":
			await (action.service === "garmin" ? syncGarmin(plugin) : action.service === "strava" ? syncStrava(plugin) : syncRunnaPlan(plugin));
			return;
	}
}
