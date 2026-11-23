// Výstupy: export CSV, kalendář a tréninky do hodinek, záloha, souhrny a hlášky o rekordech.

import { Notice, TFile } from "obsidian";
import { allRecords, newRecords } from "../calc/records";
import type { WorkoutNote } from "../model/types";
import { planEvents, planItemTitle } from "../data/planBlock";
import { toIcs } from "../calc/ics";
import { encodeFitWorkout, type FitStep } from "../calc/fitWorkout";
import { runRecords } from "../calc/running";
import { paceRange, planPaceKind, trainingPaces } from "../calc/runningPaces";
import { previousMonth } from "../calc/monthlySummary";
import { addDays, startOfWeek, toIsoDate } from "../model/dates";
import { t, tn } from "../i18n";
import type BetterFormPlugin from "../main";

/** Kolik rekordů se vypíše v jedné hlášce. */
const MAX_RECORD_LINES = 5;

/** Export tréninků, sérií a denních dat do CSV (SPEC 5.12). */
export async function exportCsv(plugin: BetterFormPlugin): Promise<void> {
	try {
		const result = await plugin.exporter.exportCsv();
		new Notice(t("Export done – workouts: {workouts}, days: {days}, folder “{folder}”.", { workouts: result.workouts, days: result.days, folder: result.folder }), 8000);
	} catch (err) {
		plugin.fail(t("Export failed"), err);
	}
}

/** Plán týdne jako soubor .ics do složky exportů – jde importovat do kalendáře. */
export async function exportPlanCalendar(plugin: BetterFormPlugin, week: string): Promise<void> {
	try {
		const events = planEvents(plugin.plans.view(week, toIsoDate(new Date())).days);
		if (events.length === 0) {
			new Notice(t("Nothing is planned this week."));
			return;
		}
		const path = await plugin.exporter.saveText(t("Plan {week}.ics", { week }), toIcs(events, new Date()));
		new Notice(t("Saved “{path}” – import it into your calendar (e.g. Google Calendar: Settings → Import).", { path }), 10000);
	} catch (err) {
		plugin.fail(t("Export failed"), err);
	}
}

/** Naplánované běhy týdne (od dneška) jako tréninky FIT pro hodinky – jeden soubor na běh. */
export async function exportPlanWorkouts(plugin: BetterFormPlugin, week: string): Promise<void> {
	try {
		const today = toIsoDate(new Date());
		const runs = plugin.plans
			.view(week, today)
			.days.flatMap((d) => d.entries)
			.filter((e) => !e.program && e.status === "planned" && e.item.sport === "run" && e.item.date >= today);
		if (runs.length === 0) {
			new Notice(t("No upcoming runs are planned this week."));
			return;
		}
		// Cílové tempo podle Danielse z nejnovějšího rekordu (jako v Plánu); bez rekordu bez cíle.
		const workouts = plugin.index.all("workout").map((w) => w.note);
		const record = [...runRecords(workouts)].sort((a, b) => b.date.localeCompare(a.date))[0];
		const paces = record && plugin.moduleOn("running.paces") ? trainingPaces(record.distance.km, record.seconds) : null;
		const paths: string[] = [];
		for (const { item } of runs) {
			const title = planItemTitle(item);
			const duration: FitStep["duration"] = item.distance_km ? { kind: "distance", m: item.distance_km * 1000 } : item.duration_min ? { kind: "time", s: item.duration_min * 60 } : { kind: "open" };
			const pace = paces ? paceRange(paces, planPaceKind(item.title ?? "", item.intensity)) : undefined;
			// ponytail: jeden krok na celý běh; intervaly by chtěly strukturu tréninku v plánu.
			const fit = encodeFitWorkout({ name: title, steps: [{ name: title, duration, pace, intensity: "active" }] }, new Date());
			paths.push(await plugin.exporter.saveText(`${item.date} ${title.replace(/[\\/:*?<>|#^[\]"]/g, "")}.fit`, fit));
		}
		new Notice(tn(paths.length, ["Saved {n} workout to the exports folder – copy it to the watch (Garmin: the GARMIN/NewFiles folder over USB).", "Saved {n} workouts to the exports folder – copy them to the watch (Garmin: the GARMIN/NewFiles folder over USB)."]), 10000);
	} catch (err) {
		plugin.fail(t("Export failed"), err);
	}
}

/** Záloha kořenové složky do ZIP (SPEC 5.12). */
export async function backup(plugin: BetterFormPlugin): Promise<void> {
	try {
		const result = await plugin.exporter.backup();
		new Notice(tn(result.files, ["Backup done: {n} file, {v} kB – “{path}”.", "Backup done: {n} files, {v} kB – “{path}”."], { v: Math.max(1, Math.round(result.bytes / 1024)), path: result.path }), 8000);
	} catch (err) {
		plugin.fail(t("Couldn't create the backup"), err);
	}
}

/** Souhrn otevřené poznámky se souhrnem, jinak za uplynulý měsíc; otevře ho. */
export async function monthlySummary(plugin: BetterFormPlugin): Promise<void> {
	const active = plugin.app.workspace.getActiveFile();
	const month = (active && plugin.summaries.monthOf(active)) ?? previousMonth(toIsoDate(new Date()).slice(0, 7));
	try {
		const file = await plugin.summaries.generate(month);
		await plugin.app.workspace.getLeaf(false).openFile(file);
	} catch (err) {
		plugin.fail(t("Couldn't create the summary"), err);
	}
}

/** Roční souhrn: pro otevřený roční souhrn ho obnoví, jinak vytvoří souhrn letošního roku. */
export async function yearlySummary(plugin: BetterFormPlugin, year?: number): Promise<void> {
	const active = plugin.app.workspace.getActiveFile();
	const target = year ?? (active && plugin.summaries.yearOf(active)) ?? Number(toIsoDate(new Date()).slice(0, 4));
	try {
		const file = await plugin.summaries.generateYear(target);
		await plugin.app.workspace.getLeaf(false).openFile(file);
	} catch (err) {
		plugin.fail(t("Couldn't create the yearly summary"), err);
	}
}

/** Týdenní souhrn: daný týden, jinak týden otevřeného souhrnu, jinak minulý (dokončený) týden. */
export async function weeklySummary(plugin: BetterFormPlugin, date?: string): Promise<void> {
	const active = plugin.app.workspace.getActiveFile();
	const today = toIsoDate(new Date());
	const week = startOfWeek(date ?? (active && plugin.summaries.weekOf(active)) ?? addDays(today, -7));
	try {
		const view = plugin.plans.view(week, today);
		const file = await plugin.summaries.generateWeek(week, view.summary, view.outlook.average);
		await plugin.app.workspace.getLeaf(false).openFile(file);
	} catch (err) {
		plugin.fail(t("Couldn't create the weekly summary"), err);
	}
}

export async function autoSummary(plugin: BetterFormPlugin): Promise<void> {
	if (!plugin.index.isReady) return;
	try {
		const file = await plugin.summaries.ensurePrevious(toIsoDate(new Date()));
		if (file) new Notice(t("Better Form: last month's summary is in the note “{basename}”.", { basename: file.basename }));
	} catch (err) {
		console.error(t("Better Form: couldn't create the monthly summary"), err);
	}
}

/** Obnoví souhrn v aktivní denní poznámce, jinak v dnešní. */
export async function refreshDayBlock(plugin: BetterFormPlugin): Promise<void> {
	const active = plugin.app.workspace.getActiveFile();
	const date = (active && plugin.days.dateOfDayFile(active)) ?? toIsoDate(new Date());
	try {
		const done = await plugin.days.refreshBlock(date);
		new Notice(done ? t("Summary in the daily note refreshed.") : t("There's no daily note for this day yet."));
	} catch (err) {
		plugin.fail(t("Can't refresh the summary"), err);
	}
}

/** Po uložení nového tréninku ohlásí překonané osobní rekordy (SPEC 5.3, 9.1). */
export function announceRecords(plugin: BetterFormPlugin, note: WorkoutNote, file: TFile): void {
	const others = plugin.index
		.all("workout")
		.filter((w) => w.file !== file)
		.map((w) => w.note);
	const tests = plugin.index.all("test").map((t) => t.note);
	const ctx = plugin.statsContext();
	const fresh = newRecords(allRecords(others, tests, ctx), allRecords([...others, note], tests, ctx));
	if (fresh.length === 0) return;
	const lines = fresh.slice(0, MAX_RECORD_LINES).map((r) => `• ${r.text}`);
	if (fresh.length > MAX_RECORD_LINES) lines.push(t("… and {MAX_RECORD_LINES} more", { MAX_RECORD_LINES: fresh.length - MAX_RECORD_LINES }));
	new Notice(`${tn(fresh.length, ["New personal record", "New personal records"])}\n${lines.join("\n")}`, 12000);
}
