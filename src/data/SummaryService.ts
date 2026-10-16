// Měsíční souhrn (SPEC 9.5): poznámka `forma: summary` ve složce Souhrny.
// Přepisuje se jen generovaný blok; text uživatele mimo něj zůstává.

import { TFile, type App } from "obsidian";
import { isMonth, monthSummaryInput, previousMonth, renderMonthlySummary, renderWeeklySummary, weekSummaryInput, type WeekPlanResult } from "../calc/monthlySummary";
import type { TonnageContext } from "../calc/overview";
import { isYear, renderYearlySummary, yearSummaryInput } from "../calc/yearlySummary";
import type { RecordContext } from "../calc/records";
import { SCHEMA_VERSION } from "../model/constants";
import { isIsoDate, startOfWeek } from "../model/dates";
import type { BetterFormSettings } from "../settings/settings";
import type { FormaIndex } from "./FormaIndex";
import type { NoteWriter } from "./NoteWriter";
import { folderPath, joinPath } from "./paths";
import { t } from "../i18n";

export class SummaryService {
	constructor(
		private readonly app: App,
		private readonly index: FormaIndex,
		private readonly writer: NoteWriter,
		private readonly settings: () => BetterFormSettings,
		private readonly context: () => RecordContext & TonnageContext,
	) {}

	path(month: string): string {
		return joinPath(folderPath(this.settings().folders, "summaries"), `${month}.md`);
	}

	/** Existující souhrn – na výchozí cestě, nebo přesunutý jinam ve vaultu (pozná se podle frontmatteru). */
	private findSummary(path: string, matches: (frontmatter: Record<string, unknown>) => boolean): TFile | null {
		const direct = this.app.vault.getAbstractFileByPath(path);
		if (direct instanceof TFile) return direct;
		for (const file of this.app.vault.getMarkdownFiles()) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (fm?.forma === "summary" && matches(fm)) return file;
		}
		return null;
	}

	find(month: string): TFile | null {
		return this.findSummary(this.path(month), (fm) => String(fm.month) === month);
	}

	/** Měsíc souhrnu, pokud je daný soubor souhrn. */
	monthOf(file: TFile): string | null {
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
		const month = fm?.forma === "summary" ? String(fm.month) : "";
		return isMonth(month) ? month : null;
	}

	hasWorkouts(month: string): boolean {
		return this.index.all("workout").some((w) => w.note.date.startsWith(`${month}-`));
	}

	/** Vytvoří souhrn měsíce nebo obnoví jeho generovaný blok. */
	async generate(month: string): Promise<TFile> {
		if (!isMonth(month)) throw new Error(t("Invalid month."));
		const input = monthSummaryInput(
			month,
			this.index.all("workout").map((w) => w.note),
			this.index.all("day").map((d) => d.note),
			this.index.all("test").map((x) => x.note),
			this.context(),
		);
		const file = this.find(month) ?? (await this.writer.createNote(this.path(month), { forma: "summary", schema: SCHEMA_VERSION, month }));
		await this.writer.setGeneratedBlock(file, renderMonthlySummary(input));
		return file;
	}

	// ---------- Roční souhrn ----------

	yearPath(year: number): string {
		return joinPath(folderPath(this.settings().folders, "summaries"), `${year}.md`);
	}

	findYear(year: number): TFile | null {
		return this.findSummary(this.yearPath(year), (fm) => Number(fm.year) === year && fm.month === undefined);
	}

	/** Rok ročního souhrnu, pokud je daný soubor roční souhrn. */
	yearOf(file: TFile): number | null {
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
		const year = fm?.forma === "summary" && fm.month === undefined ? Number(fm.year) : Number.NaN;
		return isYear(year) ? year : null;
	}

	/** Vytvoří roční souhrn „Rok v číslech“ nebo obnoví jeho generovaný blok. */
	async generateYear(year: number): Promise<TFile> {
		if (!isYear(year)) throw new Error(t("Invalid year."));
		const input = yearSummaryInput(
			year,
			this.index.all("workout").map((w) => w.note),
			this.index.all("day").map((d) => d.note),
			this.index.all("test").map((x) => x.note),
			this.context(),
		);
		const file = this.findYear(year) ?? (await this.writer.createNote(this.yearPath(year), { forma: "summary", schema: SCHEMA_VERSION, year }));
		await this.writer.setGeneratedBlock(file, renderYearlySummary(input));
		return file;
	}

	// ---------- Týdenní souhrn ----------

	weekPath(week: string): string {
		return joinPath(folderPath(this.settings().folders, "summaries"), t("Week {week}.md", { week }));
	}

	/** Pondělí týdne, pokud je daný soubor týdenní souhrn. */
	weekOf(file: TFile): string | null {
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
		const week = fm?.forma === "summary" ? String(fm.week ?? "") : "";
		return isIsoDate(week) ? week : null;
	}

	/**
	 * Vytvoří týdenní souhrn nebo obnoví jeho generovaný blok. `date` je libovolný den týdne;
	 * splnění plánu a průměr zátěže čtyř předchozích týdnů dodá volající (služba plánu).
	 */
	async generateWeek(date: string, plan: WeekPlanResult | null, averageLoad: number | null): Promise<TFile> {
		if (!isIsoDate(date)) throw new Error(t("Invalid week date."));
		const week = startOfWeek(date);
		const input = weekSummaryInput(
			week,
			this.index.all("workout").map((w) => w.note),
			this.index.all("day").map((d) => d.note),
			this.index.all("test").map((x) => x.note),
			this.context(),
		);
		const file =
			this.findSummary(this.weekPath(week), (fm) => String(fm.week) === week) ??
			(await this.writer.createNote(this.weekPath(week), { forma: "summary", schema: SCHEMA_VERSION, week }));
		await this.writer.setGeneratedBlock(file, renderWeeklySummary({ ...input, week, plan, averageLoad }));
		return file;
	}

	/** Souhrn minulého měsíce, pokud chybí a v měsíci je aspoň jeden trénink; jinak null. */
	async ensurePrevious(today: string): Promise<TFile | null> {
		const month = previousMonth(today.slice(0, 7));
		if (!this.hasWorkouts(month) || this.find(month)) return null;
		return this.generate(month);
	}
}
