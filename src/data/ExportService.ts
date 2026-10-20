// Export do CSV a záloha kořenové složky do ZIP (SPEC 5.12). Nic nepřepisuje –
// při shodném názvu přidá k souboru číslo.

import { TFile, type App } from "obsidian";
import { sleepDurationMin } from "../calc/sleep";
import type { DayNote, WorkoutNote } from "../model/types";
import type { BetterFormSettings } from "../settings/settings";
import { daysCsv, setsCsv, workoutsCsv } from "./csv";
import type { FormaIndex } from "./FormaIndex";
import type { NoteWriter } from "./NoteWriter";
import { fileStamp as stamp, folderPath, joinPath, uniquePath } from "./paths";
import { createZip, type ZipEntry } from "./zip";
import { t } from "../i18n";

export interface ExportResult {
	folder: string;
	files: string[];
	workouts: number;
	days: number;
}

export interface BackupResult {
	path: string;
	files: number;
	bytes: number;
}

export class ExportService {
	constructor(
		private readonly app: App,
		private readonly index: FormaIndex,
		private readonly writer: NoteWriter,
		private readonly settings: () => BetterFormSettings,
		private readonly tonnage: (workout: WorkoutNote) => number,
	) {}

	/** Uloží tréninky, série a denní data jako tři CSV soubory. */
	async exportCsv(now = new Date()): Promise<ExportResult> {
		const folder = folderPath(this.settings().folders, "exports");
		await this.writer.ensureFolder(folder);
		const workouts = this.index.all("workout").map((e) => e.note);
		const days: DayNote[] = this.index.all("day").map((e) => e.note);
		const when = stamp(now);
		const outputs: [string, string][] = [
			[t("Workouts {when}.csv", { when }), workoutsCsv(workouts, this.tonnage)],
			[t("Sets {when}.csv", { when }), setsCsv(workouts)],
			[t("Days {when}.csv", { when }), daysCsv(days, (d) => sleepDurationMin(d.sleep))],
		];
		const files: string[] = [];
		for (const [name, content] of outputs) {
			const path = uniquePath(joinPath(folder, name), (p) => this.app.vault.getAbstractFileByPath(p) !== null);
			await this.app.vault.create(path, content);
			files.push(path);
		}
		return { folder, files, workouts: workouts.length, days: days.length };
	}

	/** Uloží text do složky exportů pod volným názvem; vrátí cestu. */
	async saveText(name: string, content: string): Promise<string> {
		const folder = folderPath(this.settings().folders, "exports");
		await this.writer.ensureFolder(folder);
		const path = uniquePath(joinPath(folder, name), (p) => this.app.vault.getAbstractFileByPath(p) !== null);
		await this.app.vault.create(path, content);
		return path;
	}

	/** Zabalí celou kořenovou složku do ZIP ve složce záloh (mimo kořen). */
	async backup(now = new Date()): Promise<BackupResult> {
		const settings = this.settings();
		const root = settings.folders.root;
		const target = settings.backupFolder;
		if (target === root || target.startsWith(`${root}/`)) throw new Error(t("The backup folder can't be inside the root folder."));
		const files = this.app.vault.getFiles().filter((f) => f.path.startsWith(`${root}/`));
		if (files.length === 0) throw new Error(t("The folder “{root}” is empty – nothing to back up.", { root }));
		const entries: ZipEntry[] = [];
		for (const file of files) {
			entries.push({ path: file.path, data: new Uint8Array(await this.app.vault.readBinary(file)), modified: new Date(file.stat.mtime) });
		}
		const zip = createZip(entries);
		await this.writer.ensureFolder(target);
		const path = uniquePath(joinPath(target, `${root.split("/").pop() ?? root} ${stamp(now)}.zip`), (p) => this.app.vault.getAbstractFileByPath(p) !== null);
		const created = await this.app.vault.createBinary(path, zip.slice().buffer);
		return { path: created instanceof TFile ? created.path : path, files: entries.length, bytes: zip.length };
	}
}
