// Denní poznámka (SPEC 4.1): založení, zápis check-inu, obnovení generovaného bloku.

import { TFile, type App } from "obsidian";
import { applyCheckIn, checkInFromDay, finalizeCheckIn, type CheckInValues } from "../calc/checkIn";
import { missingValues, type DailyRow } from "../calc/dailyImport";
import { SCHEMA_VERSION } from "../model/constants";
import { asNameList, parseDay } from "../model/parse";
import type { DayNote, WorkoutNote } from "../model/types";
import type { BetterFormSettings } from "../settings/settings";
import { renderDayBlock } from "./dayBlock";
import type { FormaIndex } from "./FormaIndex";
import { migrateFrontmatter } from "./migrations";
import type { NoteWriter } from "./NoteWriter";
import { dayNotePath } from "./paths";
import { t } from "../i18n";

export class DayService {
	/** Rozpozná trénink z denního počítadla (nastaví plugin, až existují programy). */
	isCounterWorkout: ((note: WorkoutNote) => boolean) | null = null;
	/** Řádek s doporučenou výživou pro den (nastaví plugin); null = bez řádku. */
	nutritionLine: ((date: string, workouts: WorkoutNote[]) => string | null) | null = null;

	constructor(
		private readonly app: App,
		private readonly index: FormaIndex,
		private readonly writer: NoteWriter,
		private readonly settings: () => BetterFormSettings,
	) {}

	/** Existující denní poznámka pro datum (i přesunutá), nebo null. */
	findDayFile(date: string): TFile | null {
		const entry = this.index.day(date);
		if (entry) return entry.file;
		const file = this.app.vault.getAbstractFileByPath(dayNotePath(this.settings().folders, date));
		return file instanceof TFile ? file : null;
	}

	async ensureDayNote(date: string): Promise<TFile> {
		const existing = this.findDayFile(date);
		if (existing) return existing;
		return this.writer.createNote(dayNotePath(this.settings().folders, date), {
			forma: "day",
			schema: SCHEMA_VERSION,
			date,
		});
	}

	/** Uloží check-in do denní poznámky a obnoví souhrn. */
	async saveCheckIn(values: CheckInValues): Promise<TFile> {
		if (this.index.day(values.date)?.schemaStatus === "newer") {
			throw new Error(t("Denní poznámka je z novější verze pluginu – aktualizuj plugin."));
		}
		const file = await this.ensureDayNote(values.date);
		let saved: DayNote | null = null;
		await this.writer.updateFrontmatter(file, (frontmatter) => {
			applyCheckIn(frontmatter, finalizeCheckIn(values));
			saved = parseDay(structuredClone(frontmatter));
		});
		await this.writeBlock(file, values.date, saved ?? undefined);
		return file;
	}

	/**
	 * Upraví seznam suplementů vzatých daný den a obnoví souhrn; vrátí nový seznam.
	 * Čte přímo z frontmatteru, takže nezávisí na zpoždění indexu.
	 */
	async updateSupplements(date: string, change: (list: string[]) => string[]): Promise<string[]> {
		if (this.index.day(date)?.schemaStatus === "newer") {
			throw new Error(t("Denní poznámka je z novější verze pluginu – aktualizuj plugin."));
		}
		const file = await this.ensureDayNote(date);
		let saved: DayNote | null = null;
		let result: string[] = [];
		await this.writer.updateFrontmatter(file, (frontmatter) => {
			result = change(asNameList(frontmatter.supplements));
			if (result.length > 0) frontmatter.supplements = result;
			else delete frontmatter.supplements;
			saved = parseDay(structuredClone(frontmatter));
		});
		await this.writeBlock(file, date, saved ?? undefined);
		return result;
	}

	/**
	 * Doplní do denních poznámek hodnoty z importu – jen ty, které chybí; zapsané nepřepíše.
	 * Vrátí počet dnů, kterých se zápis týkal, a počet doplněných hodnot.
	 */
	async fillMissing(rows: readonly DailyRow[], onProgress?: (done: number) => void): Promise<{ days: number; values: number }> {
		let days = 0;
		let values = 0;
		let done = 0;
		for (const row of rows) {
			onProgress?.(++done);
			const entry = this.index.day(row.date);
			if (entry?.schemaStatus === "newer") continue;
			const { steps, ...checkIn } = missingValues(row, entry?.note);
			const count = Object.keys(checkIn).length + (steps !== undefined ? 1 : 0);
			if (count === 0) continue;
			if (Object.keys(checkIn).length > 0) await this.saveCheckIn({ ...(entry ? checkInFromDay(entry.note) : { date: row.date }), ...checkIn });
			if (steps !== undefined) await this.setSteps(row.date, steps);
			days++;
			values += count;
		}
		return { days, values };
	}

	/** Zapíše (nebo smaže) kroky za den a obnoví souhrn. */
	async setSteps(date: string, steps: number | undefined): Promise<void> {
		if (this.index.day(date)?.schemaStatus === "newer") {
			throw new Error(t("Denní poznámka je z novější verze pluginu – aktualizuj plugin."));
		}
		if (steps === undefined && !this.findDayFile(date)) return;
		const file = await this.ensureDayNote(date);
		let saved: DayNote | null = null;
		await this.writer.updateFrontmatter(file, (frontmatter) => {
			if (steps === undefined) delete frontmatter.steps;
			else frontmatter.steps = Math.round(steps);
			saved = parseDay(structuredClone(frontmatter));
		});
		await this.writeBlock(file, date, saved ?? undefined);
	}

	/**
	 * Obnoví generovaný blok denní poznámky; vrátí false, když poznámka neexistuje.
	 * `fresh` = právě uložený trénink, který ještě nemusí být v indexu;
	 * `removed` = právě smazaný trénink, který v indexu ještě může být.
	 */
	async refreshBlock(date: string, fresh?: FreshWorkout, removed?: TFile): Promise<boolean> {
		const file = this.findDayFile(date);
		if (!file) return false;
		await this.writeBlock(file, date, this.readDay(file), fresh, removed);
		return true;
	}

	async openDayNote(date: string): Promise<void> {
		const file = await this.ensureDayNote(date);
		await this.app.workspace.getLeaf(false).openFile(file);
	}

	/** Datum denní poznámky, pokud je daný soubor denní poznámka. */
	dateOfDayFile(file: TFile): string | null {
		return this.readDay(file)?.date ?? null;
	}

	private readDay(file: TFile): DayNote | undefined {
		const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
		const migration = migrateFrontmatter(frontmatter);
		if (migration.status === "invalid") return undefined;
		return parseDay(migration.data) ?? undefined;
	}

	private async writeBlock(file: TFile, date: string, day: DayNote | undefined, fresh?: FreshWorkout, removed?: TFile): Promise<void> {
		const entries = this.index
			.workouts()
			.filter((w) => w.file !== fresh?.file && w.file !== removed)
			.map((w) => ({ file: w.file, note: w.note }));
		if (fresh) entries.push(fresh);
		const workouts = entries
			.filter((w) => w.note.date === date)
			.sort((a, b) => (a.note.start ?? "").localeCompare(b.note.start ?? ""))
			.map((w) => ({
				note: w.note,
				link: this.app.metadataCache.fileToLinktext(w.file, file.path, true),
				counter: this.isCounterWorkout?.(w.note) ?? false,
			}));
		const nutrition = this.nutritionLine?.(date, workouts.map((w) => w.note)) ?? null;
		await this.writer.setGeneratedBlock(file, renderDayBlock(day, workouts, nutrition));
	}
}

export interface FreshWorkout {
	file: TFile;
	note: WorkoutNote;
}
