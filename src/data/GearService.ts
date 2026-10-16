// Vybavení (SPEC 5.10): běžecké boty a jejich najeté kilometry.

import type { TFile } from "obsidian";
import { shoeUsage, type ShoeUsage } from "../calc/running";
import { SCHEMA_VERSION } from "../model/constants";
import { gearToFrontmatter } from "../model/serialize";
import type { GearNote } from "../model/types";
import type { BetterFormSettings } from "../settings/settings";
import type { FormaIndex, IndexEntry } from "./FormaIndex";
import type { NoteWriter } from "./NoteWriter";
import { namedNotePath } from "./paths";
import { t } from "../i18n";

export type ShoeEntry = IndexEntry<GearNote>;

export interface ShoeDraft {
	name: string;
	startKm?: number;
	limitKm?: number;
}

function normalize(text: string): string {
	return text.trim().toLocaleLowerCase("cs");
}

export class GearService {
	constructor(
		private readonly index: FormaIndex,
		private readonly writer: NoteWriter,
		private readonly settings: () => BetterFormSettings,
	) {}

	/** Boty: aktivní první, pak podle názvu. */
	shoes(): ShoeEntry[] {
		return this.index
			.all("gear")
			.sort((a, b) => Number(b.note.active) - Number(a.note.active) || a.note.name.localeCompare(b.note.name, "cs"));
	}

	activeShoeNames(): string[] {
		return this.shoes()
			.filter((e) => e.note.active)
			.map((e) => e.note.name);
	}

	/** Limit bot: vlastní, jinak výchozí z nastavení. */
	limitKm(note: GearNote): number {
		return note.limit_km ?? this.settings().thresholds.shoeLimitKm;
	}

	/** Najeté kilometry: počáteční stav + běhy, které na boty odkazují názvem nebo souborem. */
	usage(entry: ShoeEntry): ShoeUsage {
		const names = new Set([normalize(entry.note.name), normalize(entry.file.basename)]);
		const workouts = this.index.all("workout").map((w) => w.note);
		return shoeUsage(entry.note.start_km, this.limitKm(entry.note), workouts, (link) => names.has(normalize(link)));
	}

	async create(draft: ShoeDraft): Promise<TFile> {
		const name = draft.name.trim();
		if (!name) throw new Error(t("Chybí název bot."));
		if (this.shoes().some((e) => normalize(e.note.name) === normalize(name))) {
			throw new Error(t("Boty „{name}“ už v seznamu jsou.", { name }));
		}
		const note: GearNote = {
			forma: "gear",
			schema: SCHEMA_VERSION,
			kind: "shoes",
			name,
			start_km: draft.startKm !== undefined && draft.startKm > 0 ? draft.startKm : 0,
			limit_km: draft.limitKm !== undefined && draft.limitKm > 0 ? draft.limitKm : undefined,
			active: true,
		};
		return this.writer.createNote(namedNotePath(this.settings().folders, "gear", name), gearToFrontmatter(note));
	}

	/** Vyřadí nebo vrátí boty; kilometry a historie zůstávají. */
	async setActive(entry: ShoeEntry, active: boolean): Promise<void> {
		if (entry.schemaStatus === "newer") throw new Error(t("Poznámka je z novější verze pluginu – aktualizuj plugin."));
		await this.writer.updateFrontmatter(entry.file, (frontmatter) => {
			frontmatter.active = active;
		});
	}
}
