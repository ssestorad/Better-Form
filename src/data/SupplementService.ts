// Suplementace: poznámky `forma: supplement`, denní odškrtávání a dodržování.

import type { TFile } from "obsidian";
import { adherence, isTaken, toggleTaken, type Adherence } from "../calc/supplements";
import { SCHEMA_VERSION, type SupplementTiming } from "../model/constants";
import { supplementToFrontmatter } from "../model/serialize";
import type { SupplementIngredient, SupplementNote } from "../model/types";
import type { BetterFormSettings } from "../settings/settings";
import type { DayService } from "./DayService";
import type { FormaIndex, IndexEntry } from "./FormaIndex";
import type { NoteWriter } from "./NoteWriter";
import { namedNotePath } from "./paths";
import { t } from "../i18n";

export type SupplementEntry = IndexEntry<SupplementNote>;

/** Údaje z formuláře „Moje suplementy“. */
export interface SupplementDraft {
	name: string;
	catalog?: string;
	dose?: number;
	unit?: string;
	timing: SupplementTiming;
	trainingDaysOnly: boolean;
	/** Složení vlastního přípravku (z etikety); `dose` je pak počet porcí denně. */
	ingredients?: SupplementIngredient[];
}

/** Fotka etikety přikládaná k novému suplementu. */
export interface LabelPhoto {
	/** Přípona bez tečky (jpg, png…). */
	extension: string;
	data: ArrayBuffer;
}

/** Klíče spravované pluginem (při úpravě se ostatní zachovají). */
const SUPPLEMENT_KEYS = [
	"forma",
	"schema",
	"name",
	"catalog",
	"dose",
	"unit",
	"timing",
	"training_days_only",
	"active",
	"since",
	"notes",
	"ingredients",
] as const;

/** Právě uložený denní seznam – index se aktualizuje se zpožděním. */
interface FreshList {
	list: string[];
	at: number;
}
const FRESH_MS = 5000;

function sameName(a: string, b: string): boolean {
	return a.trim().toLocaleLowerCase("cs") === b.trim().toLocaleLowerCase("cs");
}

export class SupplementService {
	private readonly fresh = new Map<string, FreshList>();
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly index: FormaIndex,
		private readonly writer: NoteWriter,
		private readonly days: DayService,
		private readonly settings: () => BetterFormSettings,
		private readonly onChange: () => void,
	) {}

	/** Všechny suplementy podle názvu. */
	all(): SupplementEntry[] {
		return this.index.all("supplement").sort((a, b) => a.note.name.localeCompare(b.note.name, "cs"));
	}

	active(): SupplementEntry[] {
		return this.all().filter((e) => e.note.active);
	}

	find(name: string): SupplementEntry | undefined {
		return this.all().find((e) => sameName(e.note.name, name));
	}

	/** Názvy suplementů vzatých daný den. */
	taken(date: string): string[] {
		const fresh = this.fresh.get(date);
		if (fresh && Date.now() - fresh.at < FRESH_MS) return fresh.list;
		return this.index.day(date)?.note.supplements ?? [];
	}

	/** Odškrtne (nebo vrátí) suplement v denní poznámce; zápisy jdou za sebou. */
	setTaken(date: string, name: string, taken: boolean): Promise<void> {
		const run = this.queue.then(async () => {
			const list = await this.days.updateSupplements(date, (current) => toggleTaken(current, name, taken));
			this.fresh.set(date, { list, at: Date.now() });
			this.onChange();
		});
		this.queue = run.catch(() => undefined);
		return run;
	}

	/** Dodržování za posledních `windowDays` dnů včetně dneška. */
	adherence(note: SupplementNote, today: string, windowDays: number): Adherence {
		const trained = new Set(this.index.all("workout").map((w) => w.note.date));
		return adherence(
			{ since: note.since, trainingDaysOnly: note.training_days_only },
			(date) => isTaken(this.taken(date), note.name),
			(date) => trained.has(date),
			today,
			windowDays,
		);
	}

	hasWorkout(date: string): boolean {
		return this.index.all("workout").some((w) => w.note.date === date);
	}

	/** Hmotnost pro dávky podle kg: poslední zapsaná váha, jinak z profilu. */
	weightKg(): number | null {
		const days = this.index
			.all("day")
			.filter((d) => d.note.body.weight_kg !== undefined)
			.sort((a, b) => b.note.date.localeCompare(a.note.date));
		return days[0]?.note.body.weight_kg ?? this.settings().profile.weightKg ?? null;
	}

	/** Založí suplement; fotka etikety se uloží vedle poznámky a vloží do jejího textu. */
	async create(draft: SupplementDraft, today: string, photo?: LabelPhoto): Promise<TFile> {
		const name = draft.name.trim();
		if (!name) throw new Error(t("The supplement needs a name."));
		if (this.find(name)) throw new Error(t("The supplement “{name}” is already in the list.", { name }));
		const note: SupplementNote = {
			forma: "supplement",
			schema: SCHEMA_VERSION,
			name,
			catalog: draft.catalog,
			dose: draft.dose,
			unit: draft.unit?.trim() || undefined,
			timing: draft.timing,
			training_days_only: draft.trainingDaysOnly,
			active: true,
			since: today,
			ingredients: draft.ingredients && draft.ingredients.length > 0 ? draft.ingredients : undefined,
		};
		const path = namedNotePath(this.settings().folders, "supplements", name);
		const image = photo ? await this.writer.createAttachment(path.replace(/\.md$/, ` – etiketa.${photo.extension}`), photo.data) : null;
		return this.writer.createNote(path, supplementToFrontmatter(note), image ? `![[${image.name}]]` : "");
	}

	/** Upraví dávku a časování; název (a tím i historie v deníku) zůstává. */
	async update(entry: SupplementEntry, draft: SupplementDraft): Promise<void> {
		await this.write(entry, {
			...entry.note,
			dose: draft.dose,
			unit: draft.unit?.trim() || undefined,
			timing: draft.timing,
			training_days_only: draft.trainingDaysOnly,
		});
	}

	/** Zapne nebo vypne suplement; při opětovném zapnutí se dodržování počítá od dneška. */
	async setActive(entry: SupplementEntry, active: boolean, today: string): Promise<void> {
		await this.write(entry, { ...entry.note, active, since: active ? today : entry.note.since });
	}

	private async write(entry: SupplementEntry, note: SupplementNote): Promise<void> {
		if (entry.schemaStatus === "newer") {
			throw new Error(t("The note is from a newer version of the plugin – update the plugin."));
		}
		const next = supplementToFrontmatter(note);
		await this.writer.updateFrontmatter(entry.file, (frontmatter) => {
			for (const key of SUPPLEMENT_KEYS) delete frontmatter[key];
			Object.assign(frontmatter, next);
		});
	}
}
