// Evidence bolestí a zranění (SPEC 4.6, 5.10): poznámky `forma: pain`.

import type { TFile } from "obsidian";
import { isOpenPain, recordPain, type PainReport } from "../calc/pain";
import { SCHEMA_VERSION, type BodySide, type MuscleId } from "../model/constants";
import { painToFrontmatter } from "../model/serialize";
import type { PainNote } from "../model/types";
import type { BetterFormSettings } from "../settings/settings";
import type { FormaIndex, IndexEntry } from "./FormaIndex";
import type { NoteWriter } from "./NoteWriter";
import { namedNotePath } from "./paths";
import { t } from "../i18n";

export type PainEntryRef = IndexEntry<PainNote>;

export interface PainDraft {
	name: string;
	muscle: MuscleId;
	side?: BodySide;
	level: number;
	trigger?: string;
}

/** Klíče spravované pluginem (při úpravě se ostatní zachovají). */
const PAIN_KEYS = ["forma", "schema", "name", "muscle", "side", "level", "since", "trigger", "status", "history", "notes"] as const;

function sameName(a: string, b: string): boolean {
	return a.trim().toLocaleLowerCase("cs") === b.trim().toLocaleLowerCase("cs");
}

export class PainService {
	constructor(
		private readonly index: FormaIndex,
		private readonly writer: NoteWriter,
		private readonly settings: () => BetterFormSettings,
		private readonly onChange: () => void,
	) {}

	/** Všechny záznamy: otevřené první (podle intenzity), pak vyřešené od nejnovějších. */
	all(): PainEntryRef[] {
		return this.index.all("pain").sort((a, b) => {
			const open = Number(isOpenPain(b.note)) - Number(isOpenPain(a.note));
			if (open !== 0) return open;
			return b.note.level - a.note.level || b.note.since.localeCompare(a.note.since);
		});
	}

	open(): PainEntryRef[] {
		return this.all().filter((e) => isOpenPain(e.note));
	}

	find(name: string): PainEntryRef | undefined {
		return this.index.all("pain").find((e) => sameName(e.note.name, name) || sameName(e.file.basename, name));
	}

	async create(draft: PainDraft, date: string): Promise<TFile> {
		const name = draft.name.trim();
		if (!name) throw new Error(t("The pain needs a description."));
		if (this.find(name)) throw new Error(t("The entry “{name}” already exists – log the new intensity in it.", { name }));
		const level = Math.min(10, Math.max(0, Math.round(draft.level)));
		const note: PainNote = {
			forma: "pain",
			schema: SCHEMA_VERSION,
			name,
			muscle: draft.muscle,
			side: draft.side,
			level,
			since: date,
			trigger: draft.trigger?.trim() || undefined,
			status: "active",
			history: [{ date, level }],
		};
		const file = await this.writer.createNote(namedNotePath(this.settings().folders, "pains", name), painToFrontmatter(note));
		this.onChange();
		return file;
	}

	/** Zapíše intenzitu k datu; 0 záznam uzavře jako vyřešený. */
	async record(entry: PainEntryRef, date: string, level: number): Promise<void> {
		if (entry.schemaStatus === "newer") throw new Error(t("The note is from a newer version of the plugin – update the plugin."));
		const next = painToFrontmatter(recordPain(entry.note, date, level));
		await this.writer.updateFrontmatter(entry.file, (frontmatter) => {
			for (const key of PAIN_KEYS) delete frontmatter[key];
			Object.assign(frontmatter, next);
		});
		this.onChange();
	}

	/** Bolest zapsaná při tréninku: aktualizuje existující záznam nebo založí nový; vrátí cíl odkazu. */
	async report(report: PainReport, date: string): Promise<string> {
		if (report.existing) {
			const entry = this.find(report.existing);
			if (!entry) throw new Error(t("Can't find the pain entry “{existing}”.", { existing: report.existing }));
			await this.record(entry, date, report.level);
			return entry.file.basename;
		}
		if (!report.draft) throw new Error(t("The pain needs a description."));
		const file = await this.create({ ...report.draft, level: report.level }, date);
		return file.basename;
	}
}
