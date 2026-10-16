// Index datových poznámek ve vaultu. Čte frontmatter z app.metadataCache,
// převede ho na aktuální schéma a typovaný model a drží ho v paměti.
// Indexuje celý vault podle klíče `forma`, takže přesunuté poznámky se neztratí.

import { debounce, Events, TFile, type App, type EventRef, type Plugin, type TAbstractFile } from "obsidian";
import type { FormaType } from "../model/constants";
import { parseNote } from "../model/parse";
import type {
	DayNote,
	ExerciseNote,
	FormaNote,
	GearNote,
	GoalNote,
	NormNote,
	PainNote,
	PlanNote,
	ProgramNote,
	SupplementNote,
	TemplateNote,
	TestNote,
	WorkoutNote,
} from "../model/types";
import { migrateFrontmatter } from "./migrations";
import { t } from "../i18n";

export interface NoteByType {
	day: DayNote;
	workout: WorkoutNote;
	exercise: ExerciseNote;
	template: TemplateNote;
	program: ProgramNote;
	test: TestNote;
	supplement: SupplementNote;
	gear: GearNote;
	pain: PainNote;
	goal: GoalNote;
	norm: NormNote;
	plan: PlanNote;
}
export type IndexedType = keyof NoteByType;

export interface IndexEntry<T extends FormaNote = FormaNote> {
	file: TFile;
	note: T;
	/** "newer" = poznámka z novější verze pluginu; jen číst, nezapisovat. */
	schemaStatus: "current" | "migrated" | "newer";
}

export interface IndexIssue {
	path: string;
	reason: string;
}

export class FormaIndex extends Events {
	private readonly entries = new Map<string, IndexEntry>();
	private readonly issues = new Map<string, string>();
	private exerciseLookup: Map<string, IndexEntry<ExerciseNote> | undefined> | null = null;
	private ready = false;

	private readonly notifyUpdated = debounce(() => this.trigger("updated"), 150, true);

	constructor(private readonly app: App) {
		super();
	}

	/** Zaregistruje události a po načtení layoutu sestaví index. */
	register(plugin: Plugin): void {
		const { metadataCache, vault, workspace } = this.app;
		plugin.registerEvent(
			metadataCache.on("changed", (file) => {
				if (this.indexFile(file)) this.changed();
			}),
		);
		plugin.registerEvent(
			vault.on("delete", (file) => {
				if (this.remove(file.path)) this.changed();
			}),
		);
		plugin.registerEvent(
			vault.on("rename", (file: TAbstractFile, oldPath: string) => {
				const removed = this.remove(oldPath);
				const added = file instanceof TFile && this.indexFile(file);
				if (removed || added) this.changed();
			}),
		);
		workspace.onLayoutReady(() => this.rebuild());
		// Při prvním otevření vaultu může cache doběhnout až po načtení layoutu;
		// `resolved` se pak opakuje po každé změně, proto jen jednou.
		const resolvedRef = metadataCache.on("resolved", () => {
			metadataCache.offref(resolvedRef);
			this.rebuild();
		});
		plugin.registerEvent(resolvedRef);
	}

	get isReady(): boolean {
		return this.ready;
	}

	rebuild(): void {
		this.entries.clear();
		this.issues.clear();
		for (const file of this.app.vault.getMarkdownFiles()) this.indexFile(file);
		this.ready = true;
		this.changed();
	}

	onUpdated(callback: () => void): EventRef {
		return this.on("updated", callback);
	}

	// ---------- Dotazy ----------

	all<K extends IndexedType>(type: K): IndexEntry<NoteByType[K]>[] {
		const result: IndexEntry<NoteByType[K]>[] = [];
		for (const entry of this.entries.values()) {
			if (entry.note.forma === type) result.push(entry as IndexEntry<NoteByType[K]>);
		}
		return result;
	}

	/** Denní poznámka pro datum (při duplicitách ta s abecedně první cestou). */
	day(date: string): IndexEntry<DayNote> | undefined {
		return this.all("day")
			.filter((e) => e.note.date === date)
			.sort((a, b) => a.file.path.localeCompare(b.file.path))[0];
	}

	/** Tréninky od nejnovějšího. */
	workouts(): IndexEntry<WorkoutNote>[] {
		return this.all("workout").sort((a, b) =>
			(b.note.date + (b.note.start ?? "")).localeCompare(a.note.date + (a.note.start ?? "")),
		);
	}

	/** Najde cvik podle názvu, aliasu nebo názvu souboru (bez ohledu na velikost písmen). */
	findExercise(name: string): IndexEntry<ExerciseNote> | undefined {
		if (!this.exerciseLookup) {
			this.exerciseLookup = new Map();
			for (const entry of this.all("exercise")) {
				for (const key of [entry.file.basename, entry.note.name, ...entry.note.aliases]) {
					const normalized = key.trim().toLocaleLowerCase("cs");
					if (!this.exerciseLookup.has(normalized)) this.exerciseLookup.set(normalized, entry);
				}
			}
		}
		// Výpočty se ptají na tentýž text z tréninků tisíckrát a toLocaleLowerCase je drahé,
		// proto si výsledek (i „nenalezeno“) pamatujeme i pod textem tak, jak přišel.
		if (!this.exerciseLookup.has(name)) this.exerciseLookup.set(name, this.exerciseLookup.get(name.trim().toLocaleLowerCase("cs")));
		return this.exerciseLookup.get(name);
	}

	/** Poznámky s `forma`, které nešlo načíst (neplatná data nebo schéma). */
	problems(): IndexIssue[] {
		return [...this.issues].map(([path, reason]) => ({ path, reason }));
	}

	// ---------- Vnitřní ----------

	private changed(): void {
		this.exerciseLookup = null;
		if (this.ready) this.notifyUpdated();
	}

	/** Vrátí true, pokud se index změnil. */
	private indexFile(file: TFile): boolean {
		if (file.extension !== "md") return false;
		const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
		if (!frontmatter || frontmatter.forma === undefined) return this.remove(file.path);

		const migration = migrateFrontmatter(frontmatter);
		if (migration.status === "invalid") return this.setIssue(file.path, migration.reason);

		const note = parseNote(migration.data);
		if (!note) {
			const type = frontmatter.forma as FormaType;
			if (!isIndexedType(type)) return this.remove(file.path);
			return this.setIssue(file.path, t("Chybí povinné údaje (např. datum nebo název)."));
		}
		this.issues.delete(file.path);
		this.entries.set(file.path, { file, note, schemaStatus: migration.status });
		return true;
	}

	private setIssue(path: string, reason: string): boolean {
		this.entries.delete(path);
		this.issues.set(path, reason);
		return true;
	}

	private remove(path: string): boolean {
		const hadIssue = this.issues.delete(path);
		return this.entries.delete(path) || hadIssue;
	}
}

const INDEXED_TYPES: readonly string[] = ["day", "workout", "exercise", "template", "program", "test", "supplement", "gear", "pain", "goal", "norm", "plan"];

function isIndexedType(type: string): type is IndexedType {
	return INDEXED_TYPES.includes(type);
}
