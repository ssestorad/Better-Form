// Import ze souborů: programy, běhy (GPX/TCX/FIT), historie ze Strong/Hevy a denní data.

import { Notice } from "obsidian";
import { appleHealthReader, parseHealthAutoExport, type ParsedHealth } from "../calc/appleHealth";
import { PROGRAM_FILE_EXTENSIONS, describeImport } from "../calc/programFile";
import { DAILY_FIELDS, DAILY_FIELD_LABELS, missingValues, parseDailyCsv } from "../calc/dailyImport";
import { describeHistory, type WeightUnit } from "../calc/historyImport";
import { describeRunImport, RUN_FILE_EXTENSIONS, type RunImportCounts } from "../calc/runFile";
import { formatCzechDate } from "../ui/format";
import { t, tn } from "../i18n";
import { confirmAction } from "../ui/modals/ConfirmModal";
import type BetterFormPlugin from "../main";

/** Nechá vybrat soubor (.md, .txt, .json, .yaml) a vytvoří z něj vlastní program. */
export function pickProgramFile(plugin: BetterFormPlugin): void {
	pickFiles(PROGRAM_FILE_EXTENSIONS.join(","), false, ([file]) => void importProgramFile(plugin, file!.name, () => file!.text()));
}

/** Vytvoří program z textu souboru a oznámí, co vzniklo a co zkontrolovat. */
async function importProgramFile(plugin: BetterFormPlugin, fileName: string, read: () => Promise<string>): Promise<void> {
	try {
		const report = await plugin.programs.importFile(fileName, await read());
		plugin.indexVersion.update((n) => n + 1);
		new Notice(describeImport(report), 12000);
	} catch (err) {
		new Notice(t("Couldn't create a program from the file: {v}", { v: err instanceof Error ? err.message : String(err) }), 10000);
	}
}

/** Výběr souborů GPX / TCX / FIT s běhy (ze Stravy, MapMyRun, hodinek) a jejich import. */
export function pickRunFiles(plugin: BetterFormPlugin): void {
	pickFiles(RUN_FILE_EXTENSIONS.join(","), true, (files) => void importRunFiles(plugin, files.map((file) => ({ name: file.name, read: () => file.arrayBuffer() }))));
}

/** Importuje běhy ze souborů jeden po druhém a oznámí, co vzniklo; vadný soubor ostatní nezastaví. */
async function importRunFiles(plugin: BetterFormPlugin, files: { name: string; read: () => Promise<ArrayBuffer> }[]): Promise<RunImportCounts> {
	const counts: RunImportCounts = { created: 0, merged: 0, duplicates: 0, withoutHr: 0, failed: [] };
	for (const file of files) {
		try {
			const result = await plugin.runImport.importFile(await file.read());
			if (result.action === "created") counts.created++;
			else if (result.action === "merged") counts.merged++;
			else counts.duplicates++;
			if (result.action !== "duplicate" && result.note.sport === "run" && !result.hasHeartRate) counts.withoutHr++;
		} catch (err) {
			counts.failed.push({ name: file.name, reason: err instanceof Error ? err.message : t("couldn't read the file.") });
		}
	}
	plugin.indexVersion.update((n) => n + 1);
	new Notice(describeRunImport(counts), 10000);
	return counts;
}

/** Výběr CSV exportu ze Strong nebo Hevy. `unit` = jednotka váhy v exportu Strong (Hevy ji má v souboru). */
export function pickHistoryFile(plugin: BetterFormPlugin, unit: WeightUnit): void {
	pickFiles(".csv", false, ([file]) => void file!.text().then((text) => importHistory(plugin, text, unit)));
}

/** Ukáže, co v souboru je, a po potvrzení založí tréninky; duplicity přeskočí. */
async function importHistory(plugin: BetterFormPlugin, text: string, unit: WeightUnit): Promise<void> {
	try {
		const preview = plugin.historyImport.preview(text, unit);
		const { fresh, duplicates, unknownExercises, parsed } = preview;
		if (fresh.length === 0) {
			new Notice(`${describeHistory(parsed, (iso) => formatCzechDate(iso, false))}${duplicates > 0 ? ` ${t("They're all already in the journal ({duplicates}).", { duplicates })}` : ""}`, 10000);
			return;
		}
		const lines = [
			describeHistory(parsed, (iso) => formatCzechDate(iso, false)),
			t("Workouts to create: {fresh_length}{v}. A daily note will be created for each day too.", { fresh_length: fresh.length, v: duplicates > 0 ? t("; already in the journal: {duplicates}", { duplicates }) : "" }),
			parsed.format === "strong" ? t("Treating weights as {v} – the Strong export doesn't include the unit.", { v: unit === "kg" ? t("kilograms") : t("pounds (converted to kg)") }) : "",
			parsed.skippedRows > 0 ? t("Rows skipped: {skippedRows} (runs and other cardio, empty sets).", { skippedRows: parsed.skippedRows }) : "",
			unknownExercises.length > 0
				? t("Exercises the library doesn't know ({unknownExercises_length}) keep their original name: {v}{v2}.", { unknownExercises_length: unknownExercises.length, v: unknownExercises.slice(0, 8).join(", "), v2: unknownExercises.length > 8 ? "…" : "" })
				: "",
			t("These apps don't record RPE for the whole workout – imported workouts count towards load once you add it."),
		].filter((line) => line !== "");
		if (!(await confirmAction(plugin.app, t("Import workout history?"), lines.join("\n\n"), t("Import")))) return;
		const progress = new Notice(t("Importing… {done} of {total}", { done: 0, total: fresh.length }), 0);
		try {
			await plugin.historyImport.save(fresh, (done) => {
				if (done % 10 === 0 || done === fresh.length) progress.setMessage(t("Importing… {done} of {total}", { done, total: fresh.length }));
			});
		} finally {
			progress.hide();
		}
		plugin.indexVersion.update((n) => n + 1);
		new Notice(t("Import done – workouts: {fresh_length}.", { fresh_length: fresh.length }), 8000);
	} catch (err) {
		plugin.fail(t("History import failed"), err);
	}
}

/** Výběr souboru s denními hodnotami: CSV z hodinek či aplikace, export.xml z Apple Health, JSON z Health Auto Export. */
export function pickDailyFile(plugin: BetterFormPlugin): void {
	pickFiles(".csv,.xml,.json", false, ([file]) => void importDaily(plugin, file!));
}

/** export.xml mívá stovky MB – čte se po kouscích, ne celý do paměti. */
async function readDailyFile(file: File): Promise<ParsedHealth | ReturnType<typeof parseDailyCsv>> {
	const name = file.name.toLowerCase();
	if (name.endsWith(".json")) return parseHealthAutoExport(JSON.parse(await file.text()));
	if (!name.endsWith(".xml")) return parseDailyCsv(await file.text());
	const reader = appleHealthReader();
	const stream = file.stream().pipeThrough(new TextDecoderStream()).getReader();
	for (;;) {
		const { done, value } = await stream.read();
		if (done) break;
		reader.push(value);
	}
	return reader.finish();
}

/** Import denních hodnot: ukáže, co se doplní, a po potvrzení zapíše jen chybějící hodnoty. */
async function importDaily(plugin: BetterFormPlugin, file: File): Promise<void> {
	try {
		const parsed = await readDailyFile(file);
		if (parsed.rows.length === 0) throw new Error(t("I didn't find any steps, sleep, resting heart rate or weight in the file."));
		const plan = parsed.rows.map((row) => ({ row, missing: missingValues(row, plugin.index.day(row.date)?.note) })).filter((p) => Object.keys(p.missing).length > 0);
		const span = parsed.rows.length > 0 ? ` (${formatCzechDate(parsed.rows[0]!.date, false)} – ${formatCzechDate(parsed.rows[parsed.rows.length - 1]!.date, false)})` : "";
		const found = t("In the file – days: {rows_length}{span}; values: {v}.", { rows_length: parsed.rows.length, span, v: parsed.fields.map((f) => DAILY_FIELD_LABELS[f]).join(", ") });
		if (plan.length === 0) {
			new Notice(t("{found} Nothing to add – everything is already in the journal.", { found }), 10000);
			return;
		}
		const perField = DAILY_FIELDS.map((f) => ({ f, n: plan.filter((p) => p.missing[f] !== undefined).length })).filter((x) => x.n > 0);
		const newNotes = plan.filter((p) => !plugin.index.day(p.row.date)).length;
		const lines = [
			found,
			tn(plan.length, ["Will fill in {n} day: {v}. Values you've already logged stay.", "Will fill in {n} days: {v}. Values you've already logged stay."], { v: perField.map((x) => `${DAILY_FIELD_LABELS[x.f]} ${x.n}×`).join(", ") }),
			newNotes > 0 ? t("New daily notes to create: {newNotes}.", { newNotes }) : "",
			parsed.fields.includes("duration_min") ? t("Sleep duration goes to the day stated in the file – it should be the day you woke up.") : "",
			parsed.skippedRows > 0 ? t("Rows without a valid date skipped: {skippedRows}.", { skippedRows: parsed.skippedRows }) : "",
			"sdnnSkipped" in parsed && parsed.sdnnSkipped > 0 ? t("HRV isn't imported: Apple Health measures it as SDNN, which can't be compared with the morning RMSSD the plugin uses.") : "",
		].filter((line) => line !== "");
		if (!(await confirmAction(plugin.app, t("Import daily data?"), lines.join("\n\n"), t("Import")))) return;
		const progress = new Notice(t("Importing… {done} of {total}", { done: 0, total: plan.length }), 0);
		let result = { days: 0, values: 0 };
		try {
			result = await plugin.days.fillMissing(
				plan.map((p) => p.row),
				(done) => {
					if (done % 10 === 0 || done === plan.length) progress.setMessage(t("Importing… {done} of {total}", { done, total: plan.length }));
				},
			);
		} finally {
			progress.hide();
		}
		plugin.indexVersion.update((n) => n + 1);
		new Notice(t("Import done – values added: {values}, days: {days}.", { values: result.values, days: result.days }), 8000);
	} catch (err) {
		plugin.fail(t("Daily data import failed"), err);
	}
}

/** Otevře výběr souborů; `onFiles` dostane aspoň jeden vybraný soubor. */
function pickFiles(accept: string, multiple: boolean, onFiles: (files: File[]) => void): void {
	const input = createEl("input");
	input.type = "file";
	input.multiple = multiple;
	input.accept = accept;
	input.addEventListener("change", () => {
		const files = [...(input.files ?? [])];
		if (files.length > 0) onFiles(files);
	});
	input.click();
}
