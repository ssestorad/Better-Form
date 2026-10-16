// Programy (SPEC 5.7): dnešní úkoly, aktivace, kopie, import/export,
// denní počítadlo, testy maxima a trénink z programu.

import { getFrontMatterInfo, parseYaml, type App, type TFile } from "obsidian";
import { asOwnProgram, copyName, importName } from "../calc/programEdit";
import { readProgramFile, type ProgramFileFormat } from "../calc/programFile";
import {
	addCounterSet,
	addSet,
	bestReps,
	newCounterWorkout,
	removeLastCounterSet,
	tasksForDate,
	type ProgramTask,
} from "../calc/programTasks";
import { planForDate, programWeek } from "../calc/programs";
import { describeTarget } from "../calc/programText";
import { SCHEMA_VERSION, type PlanIntensity, type Sport } from "../model/constants";
import { MAX_PLAN_MINUTES, parseProgram } from "../model/parse";
import { programToFrontmatter, testToFrontmatter } from "../model/serialize";
import type { ProgramNote, SetEntry, TestNote, WorkoutNote } from "../model/types";
import type { BetterFormSettings } from "../settings/settings";
import type { WorkoutDraft } from "../ui/workout/draft";
import { programToDraft } from "../ui/workout/programDraft";
import { normalizeSearch } from "../ui/workout/search";
import type { FormaIndex, IndexEntry } from "./FormaIndex";
import { migrateFrontmatter } from "./migrations";
import type { NoteWriter } from "./NoteWriter";
import { namedNotePath } from "./paths";
import type { PlanProgram } from "./PlanService";
import type { WorkoutService } from "./WorkoutService";
import { t, translated } from "../i18n";

export type ProgramEntry = IndexEntry<ProgramNote>;

/** Výsledek importu programu ze souboru. */
export interface ProgramImportReport {
	file: TFile;
	name: string;
	format: ProgramFileFormat;
	/** Počet načtených položek. */
	items: number;
	/** Položky ze strukturovaného souboru, které se nepodařilo načíst. */
	dropped: number;
	/** Řádky seznamu, kterým se nepodařilo porozumět. */
	skipped: string[];
	/** Cviky, které nejsou v knihovně. */
	unknownExercises: string[];
	/** Dny v souboru chyběly – použily se výchozí (po, st, pá). */
	defaultDays: boolean;
}

export interface ProgramToday {
	entry: ProgramEntry;
	/** Týden programu (1 = první). */
	week: number;
	tasks: ProgramTask[];
}

/** Klíče programu spravované pluginem (při úpravě se ostatní zachovají). */
const PROGRAM_KEYS = [
	"forma",
	"schema",
	"name",
	"builtin",
	"evidence",
	"sources",
	"duration_weeks",
	"days",
	"items",
	"progression",
	"retest_every_weeks",
	"active",
	"active_since",
	"session_min",
	"intensity",
	"notes",
] as const;

const TEST_LABELS: Record<TestNote["test_type"], string> = translated({
	max_reps: "max opakování",
	max_reps_timed: "max opakování na čas",
	max_hold: "max výdrž",
	"1rm": "1RM",
	run_time: "čas běhu",
});

/** Právě zapsaný trénink počítadla – index se aktualizuje se zpožděním. */
interface FreshCounter {
	file: TFile;
	note: WorkoutNote;
	at: number;
}
const FRESH_MS = 5000;

/** Název denního tréninku z rychlého zápisu bez programu (režim Základ). */
export const BASIC_TITLE = "Základ"; // i18n-ignore: název tréninku, podle kterého se páruje (data)

export class ProgramService {
	private readonly fresh = new Map<string, FreshCounter>();
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly app: App,
		private readonly index: FormaIndex,
		private readonly writer: NoteWriter,
		private readonly workouts: WorkoutService,
		private readonly settings: () => BetterFormSettings,
		/** Oznámí UI změnu dřív, než ji zachytí index. */
		private readonly notify: () => void,
	) {}

	// ---------- Dotazy ----------

	programs(): ProgramEntry[] {
		return this.index.all("program").sort((a, b) => a.note.name.localeCompare(b.note.name, "cs"));
	}

	/** Cíl odkazu, kterým se trénink váže na program. */
	linkOf(entry: ProgramEntry): string {
		return entry.file.basename;
	}

	private isLinked(workout: WorkoutNote, entry: ProgramEntry): boolean {
		if (!workout.program) return false;
		const link = normalizeSearch(workout.program);
		return link === normalizeSearch(entry.file.basename) || link === normalizeSearch(entry.note.name);
	}

	/** Program, ke kterému trénink patří. */
	programOf(workout: WorkoutNote): ProgramEntry | undefined {
		return workout.program ? this.programs().find((p) => this.isLinked(workout, p)) : undefined;
	}

	private freshFor(entry: ProgramEntry, date: string): FreshCounter | undefined {
		const fresh = this.fresh.get(`${entry.file.path}|${date}`);
		return fresh && Date.now() - fresh.at < FRESH_MS ? fresh : undefined;
	}

	/** Tréninky dne navázané na program (včetně právě zapsaného počítadla). */
	private linkedWorkouts(entry: ProgramEntry, date: string): { file: TFile; note: WorkoutNote }[] {
		const fresh = this.freshFor(entry, date);
		const fromIndex = this.index
			.workouts()
			.filter((w) => w.note.date === date && this.isLinked(w.note, entry) && w.file !== fresh?.file)
			.map((w) => ({ file: w.file, note: w.note }));
		return fresh ? [...fromIndex, { file: fresh.file, note: fresh.note }] : fromIndex;
	}

	tasks(entry: ProgramEntry, date: string): ProgramTask[] {
		return tasksForDate(entry.note, date, {
			workouts: this.linkedWorkouts(entry, date).map((w) => w.note),
			tests: this.index.all("test").map((x) => x.note),
			isSameExercise: (a, b) => this.workouts.isSameExercise(a, b),
		});
	}

	/** Aktivní programy s úkoly na daný den (i bez úkolů – pro kartu Programy). */
	active(date: string): ProgramToday[] {
		const result: ProgramToday[] = [];
		for (const entry of this.programs()) {
			const week = programWeek(entry.note, date);
			if (week === null) continue;
			result.push({ entry, week: week + 1, tasks: this.tasks(entry, date) });
		}
		return result;
	}

	/**
	 * Programy v daném dni – podklad pro plán týdne (SPEC 5.16): aktivní programy
	 * s úkolem na ten den a k nim historie, tedy programy, ze kterých je ten den
	 * zapsaný trénink, i když už neběží (pozastavené, skončené, znovu spuštěné od
	 * jiného data). Odtrénovaný den tak z plánu nezmizí.
	 * Délku tréninku dostane jen den, který se zapisuje jako trénink: denní
	 * počítadlo nemá délku ani RPE a do zátěže se nepočítá ani po zapsání.
	 */
	planDays(date: string): PlanProgram[] {
		const scheduled = new Set<ProgramEntry>();
		const days: PlanProgram[] = this.active(date)
			.filter((p) => p.tasks.length > 0)
			.map(({ entry, tasks }) => {
				scheduled.add(entry);
				const loggable = tasks.filter((x) => x.target.kind !== "daily_total");
				const first = loggable[0] ?? tasks[0]!;
				const session = this.linkedWorkouts(entry, date).find((w) => w.note.duration_min !== undefined);
				const day: PlanProgram = {
					name: entry.note.name,
					file: entry.file,
					sport: this.sportFor(first.exercise),
					done: loggable.length > 0 ? session !== undefined || loggable.every((x) => x.done) : tasks.every((x) => x.done),
					text: tasks.map((x) => `${x.exercise} ${describeTarget(x.target)}`).join(", "),
					loggable: loggable.length > 0,
				};
				if (loggable.length > 0 && entry.note.session_min !== undefined) day.sessionMin = entry.note.session_min;
				if (entry.note.intensity !== undefined) day.intensity = entry.note.intensity;
				if (session) day.workoutFile = session.file;
				return day;
			});
		for (const entry of this.programs()) {
			if (scheduled.has(entry)) continue;
			const linked = this.linkedWorkouts(entry, date);
			const workout = linked.find((w) => w.note.duration_min !== undefined) ?? linked[0];
			if (!workout) continue;
			const day: PlanProgram = { name: entry.note.name, file: entry.file, sport: workout.note.sport, done: true, text: t("zapsaný trénink"), loggable: true, workoutFile: workout.file };
			if (entry.note.session_min !== undefined) day.sessionMin = entry.note.session_min;
			if (entry.note.intensity !== undefined) day.intensity = entry.note.intensity;
			days.push(day);
		}
		return days;
	}

	/** Trénink z programu, jehož dny se počítají do plánu týdne (program má délku tréninku). */
	isPlanSession(workout: WorkoutNote): boolean {
		return this.programOf(workout)?.note.session_min !== undefined && !this.isCounterWorkout(workout);
	}

	/** Trénink vzniklý jen z denního počítadla (nepřipomíná se u něj RPE). */
	isCounterWorkout(workout: WorkoutNote): boolean {
		const entry = this.programOf(workout);
		if (!entry) return false;
		const kinds = entry.note.items
			.map((item) => planForDate(entry.note, item, workout.date)?.target.kind)
			.filter((kind) => kind !== undefined);
		return kinds.length > 0 && kinds.every((kind) => kind === "daily_total");
	}

	sportFor(exercise: string): Sport {
		const info = this.workouts.exerciseInfo(exercise);
		switch (info?.category) {
			case "strength":
				return "strength";
			case "calisthenics":
				return "calisthenics";
			case "kettlebell":
				return "kettlebell";
			case "cardio": {
				// Podle názvu cviku v knihovně (i když je v programu uveden alias).
				const name = normalizeSearch(this.index.findExercise(exercise)?.note.name ?? exercise);
				if (name.includes("plav")) return "swim";
				return name.includes("svihadl") || name.includes("dvojsvih") ? "rope" : "run";
			}
			default:
				return "other";
		}
	}

	/** Předvyplněný trénink z dnešních úkolů programu. */
	draftFor(entry: ProgramEntry, date: string): WorkoutDraft {
		return programToDraft(entry.note, this.linkOf(entry), date, this.tasks(entry, date), {
			...this.workouts.prefillContext(date),
			sportFor: (exercise) => this.sportFor(exercise),
		});
	}

	// ---------- Aktivace, kopie, vytvoření, import/export ----------

	async activate(entry: ProgramEntry, date: string): Promise<void> {
		await this.writer.updateFrontmatter(entry.file, (fm) => {
			fm.active = true;
			fm.active_since = date;
		});
	}

	/**
	 * Obvyklá délka a intenzita tréninku programu – s vyplněnou délkou se dny
	 * programu počítají do plánu týdne (SPEC 5.16). Prázdná délka = nepočítat.
	 */
	async setSession(entry: ProgramEntry, sessionMin: number | undefined, intensity: PlanIntensity | undefined): Promise<void> {
		if (entry.schemaStatus === "newer") throw new Error(t("Poznámka je z novější verze pluginu – aktualizuj plugin."));
		if (sessionMin !== undefined && !(sessionMin > 0 && sessionMin <= MAX_PLAN_MINUTES)) throw new Error(t("Délka tréninku musí být kladná, nejvýš 24 hodin."));
		await this.writer.updateFrontmatter(entry.file, (fm) => {
			if (sessionMin === undefined) delete fm.session_min;
			else fm.session_min = Math.round(sessionMin);
			if (intensity === undefined) delete fm.intensity;
			else fm.intensity = intensity;
		});
		this.notify();
	}

	async deactivate(entry: ProgramEntry): Promise<void> {
		await this.writer.updateFrontmatter(entry.file, (fm) => {
			fm.active = false;
		});
	}

	private nameExists(name: string): boolean {
		return this.programs().some((p) => normalizeSearch(p.note.name) === normalizeSearch(name));
	}

	/** Text poznámky programu bez frontmatteru (popis). */
	async body(entry: ProgramEntry): Promise<string> {
		return this.bodyOf(entry.file);
	}

	private async bodyOf(file: TFile): Promise<string> {
		const text = await this.app.vault.cachedRead(file);
		return text.slice(getFrontMatterInfo(text).contentStart).trim();
	}

	/** Vlastní upravitelná kopie programu (např. předpřipraveného). */
	async copy(entry: ProgramEntry): Promise<TFile> {
		const name = copyName(entry.note.name, (n) => this.nameExists(n));
		return this.create(asOwnProgram(entry.note, name), await this.bodyOf(entry.file));
	}

	async create(note: ProgramNote, body = ""): Promise<TFile> {
		return this.writer.createNote(
			namedNotePath(this.settings().folders, "programs", note.name),
			programToFrontmatter(note),
			body,
		);
	}

	/** Úprava programu z editoru; cizí klíče a text poznámky zůstanou. */
	async update(entry: ProgramEntry, note: ProgramNote): Promise<void> {
		const frontmatter = programToFrontmatter(note);
		await this.writer.updateFrontmatter(entry.file, (fm) => {
			for (const key of PROGRAM_KEYS) delete fm[key];
			Object.assign(fm, frontmatter);
		});
	}

	/**
	 * Přepíše předpřipravený program (builtin: true) aktuální verzí z pluginu:
	 * nastavení i popis. Aktivace zůstane. Volá se jen po potvrzení uživatelem.
	 */
	async refreshBuiltin(entry: ProgramEntry, note: ProgramNote, description: string): Promise<void> {
		const next: ProgramNote = { ...note, active: entry.note.active };
		if (entry.note.active_since) next.active_since = entry.note.active_since;
		// Délku a intenzitu tréninku pro plán týdne si nastavuje uživatel – zůstávají.
		if (entry.note.session_min !== undefined) next.session_min = entry.note.session_min;
		if (entry.note.intensity !== undefined) next.intensity = entry.note.intensity;
		await this.update(entry, next);
		await this.app.vault.process(entry.file, (text) => {
			const info = getFrontMatterInfo(text);
			return `${text.slice(0, info.contentStart).trimEnd()}\n\n${description.trim()}\n`;
		});
	}

	/** Celý text poznámky programu (pro sdílení). */
	async exportText(entry: ProgramEntry): Promise<string> {
		return this.app.vault.read(entry.file);
	}

	/** Import programu z vloženého textu; uloží se jako vlastní a neaktivní. */
	async importText(text: string): Promise<TFile> {
		return (await this.importFile("", text)).file;
	}

	/**
	 * Program ze souboru nebo textu: JSON, YAML, poznámka programu s frontmatterem,
	 * nebo obyčejný seznam v Markdownu (viz src/calc/programFile.ts). Uloží se jako
	 * vlastní a neaktivní; názvy cviků se sjednotí s knihovnou.
	 */
	async importFile(fileName: string, text: string): Promise<ProgramImportReport> {
		const read = readProgramFile(text, fileName, parseYaml);
		const rawItems = Array.isArray(read.raw.items) ? read.raw.items.length : 0;
		const migration = migrateFrontmatter({ schema: SCHEMA_VERSION, ...read.raw });
		const parsed = migration.status === "invalid" ? null : parseProgram(migration.data);
		if (!parsed) throw new Error(t("Soubor není platný program – chybí název nebo je z novější verze pluginu."));
		if (parsed.items.length === 0) {
			throw new Error(
				read.format === "list"
					? t("V souboru jsem nenašel žádnou položku. Piš je jako odrážky, např. „- Kliky: 3×10“ nebo „- Běh: 5 km“.")
					: t("Program v souboru nemá žádnou platnou položku (items s exercise a target)."),
			);
		}
		// Názvy cviků podle knihovny (alias → název); neznámé se ohlásí.
		const unknown = new Set<string>();
		const canonical = (exercise: string) => {
			const found = this.index.findExercise(exercise)?.note.name;
			if (!found) unknown.add(exercise);
			return found ?? exercise;
		};
		const note: ProgramNote = {
			...parsed,
			items: parsed.items.map((item) => ({
				...item,
				exercise: canonical(item.exercise),
				schedule: item.schedule?.map((week) => (week.exercise ? { ...week, exercise: canonical(week.exercise) } : week)),
			})),
		};
		const name = importName(note.name, (n) => this.nameExists(n));
		const file = await this.create(asOwnProgram(note, name), read.body);
		return {
			file,
			name,
			format: read.format,
			items: note.items.length,
			dropped: Math.max(0, rawItems - note.items.length),
			skipped: read.skipped,
			unknownExercises: [...unknown],
			defaultDays: read.defaultDays,
		};
	}

	// ---------- Denní počítadlo ----------

	/** Přidá dávku opakování; zápisy jdou za sebou, aby se rychlá kliknutí nepřepsala. */
	addToCounter(entry: ProgramEntry, exercise: string, reps: number, date: string): Promise<void> {
		return this.enqueue(async () => {
			const isExercise = (other: string) => this.workouts.isSameExercise(exercise, other);
			const current = this.counterWorkout(entry, date);
			const base =
				current?.note ??
				newCounterWorkout(date, this.sportFor(exercise), entry.note.name, this.linkOf(entry), SCHEMA_VERSION);
			await this.writeCounter(entry, date, addCounterSet(base, exercise, reps, isExercise), current?.file);
		});
	}

	/** Vrátí poslední dávku cviku. */
	undoCounter(entry: ProgramEntry, exercise: string, date: string): Promise<void> {
		return this.enqueue(async () => {
			const current = this.counterWorkout(entry, date);
			if (!current) return;
			const next = removeLastCounterSet(current.note, (other) => this.workouts.isSameExercise(exercise, other));
			if (next) await this.writeCounter(entry, date, next, current.file);
		});
	}

	private counterWorkout(entry: ProgramEntry, date: string): { file: TFile; note: WorkoutNote } | undefined {
		const linked = this.linkedWorkouts(entry, date);
		return linked[linked.length - 1];
	}

	private async writeCounter(entry: ProgramEntry, date: string, note: WorkoutNote, existing?: TFile): Promise<void> {
		const file = await this.workouts.saveNote(note, existing);
		this.fresh.set(`${entry.file.path}|${date}`, { file, note, at: Date.now() });
		this.notify();
	}

	private enqueue(task: () => Promise<void>): Promise<void> {
		const run = this.queue.then(task, task);
		this.queue = run.catch(() => undefined);
		return run;
	}

	/** Trénink uložený formulářem přebíjí čerstvou kopii z počítadla. */
	forget(file: TFile): void {
		for (const [key, fresh] of this.fresh) if (fresh.file === file) this.fresh.delete(key);
	}

	// ---------- Rychlý zápis série (režim Základ) ----------

	/**
	 * Kam se zapisují rychlé série cviku: do tréninku programu, který má cvik
	 * dnes v plánu (mimo denní počítadlo), jinak do denního tréninku „Základ“.
	 */
	private quickTarget(exercise: string, date: string): { key: string; entry?: ProgramEntry; current?: { file: TFile; note: WorkoutNote } } {
		const entry = this.active(date).find((p) =>
			p.tasks.some((x) => x.target.kind !== "daily_total" && this.workouts.isSameExercise(x.exercise, exercise)),
		)?.entry;
		if (entry) {
			const current = this.counterWorkout(entry, date);
			return current ? { key: `${entry.file.path}|${date}`, entry, current } : { key: `${entry.file.path}|${date}`, entry };
		}
		const key = `${BASIC_TITLE}|${date}`;
		const fresh = this.fresh.get(key);
		if (fresh && Date.now() - fresh.at < FRESH_MS) return { key, current: { file: fresh.file, note: fresh.note } };
		const found = this.index
			.workouts()
			.find((w) => w.note.date === date && !w.note.program && w.note.title === BASIC_TITLE);
		return found ? { key, current: { file: found.file, note: found.note } } : { key };
	}

	/** Všechny tréninky; právě zapsané (počítadlo, rychlý zápis) nahrazují verzi z indexu. */
	workoutNotes(): WorkoutNote[] {
		const fresh = [...this.fresh.values()].filter((f) => Date.now() - f.at < FRESH_MS);
		const files = new Set(fresh.map((f) => f.file));
		return [
			...this.index
				.workouts()
				.filter((w) => !files.has(w.file))
				.map((w) => w.note),
			...fresh.map((f) => f.note),
		];
	}

	/** Dnešní trénink, do kterého jdou rychlé série cviku (včetně právě zapsaných). */
	quickWorkout(exercise: string, date: string): WorkoutNote | undefined {
		return this.quickTarget(exercise, date).current?.note;
	}

	/** Zapíše jednu sérii cviku do dnešního tréninku. */
	quickLog(exercise: string, set: SetEntry, date: string): Promise<void> {
		return this.enqueue(async () => {
			const { key, entry, current } = this.quickTarget(exercise, date);
			const base =
				current?.note ??
				newCounterWorkout(
					date,
					this.sportFor(exercise),
					entry ? entry.note.name : BASIC_TITLE,
					entry ? this.linkOf(entry) : undefined,
					SCHEMA_VERSION,
				);
			const next = addSet(base, exercise, set, (other) => this.workouts.isSameExercise(exercise, other));
			await this.writeQuick(key, next, current?.file);
			// U „sérií na maximum“ se nejlepší série rovnou zapíše jako nové maximum.
			if (entry) await this.recordMaxes(next);
		});
	}

	/** Vrátí poslední rychle zapsanou sérii cviku. */
	undoQuickLog(exercise: string, date: string): Promise<void> {
		return this.enqueue(async () => {
			const { key, current } = this.quickTarget(exercise, date);
			if (!current) return;
			const next = removeLastCounterSet(current.note, (other) => this.workouts.isSameExercise(exercise, other));
			if (next) await this.writeQuick(key, next, current.file);
		});
	}

	private async writeQuick(key: string, note: WorkoutNote, existing?: TFile): Promise<void> {
		const file = await this.workouts.saveNote(note, existing);
		this.fresh.set(key, { file, note, at: Date.now() });
		this.notify();
	}

	// ---------- Testy maxima ----------

	/** Uloží test maxima; test stejného cviku, typu a dne se přepíše. */
	async saveTest(test: Omit<TestNote, "forma" | "schema">): Promise<TFile> {
		const existing = this.index
			.all("test")
			.find(
				(x) =>
					x.note.date === test.date &&
					x.note.test_type === test.test_type &&
					this.workouts.isSameExercise(x.note.exercise, test.exercise),
			);
		const note: TestNote = { forma: "test", schema: SCHEMA_VERSION, ...test };
		const frontmatter = testToFrontmatter(note);
		if (existing) {
			await this.writer.updateFrontmatter(existing.file, (fm) => Object.assign(fm, frontmatter));
			return existing.file;
		}
		const file = await this.writer.createNote(
			namedNotePath(this.settings().folders, "tests", `${test.date} ${test.exercise} – ${TEST_LABELS[test.test_type]}`),
			frontmatter,
		);
		this.notify();
		return file;
	}

	/**
	 * Po uložení tréninku z programu: u položek „série na maximum“ zapíše
	 * nejlepší sérii jako nový test maxima. Vrátí zapsaná maxima.
	 */
	async recordMaxes(note: WorkoutNote): Promise<{ exercise: string; reps: number }[]> {
		const entry = this.programOf(note);
		if (!entry) return [];
		const recorded: { exercise: string; reps: number }[] = [];
		for (const item of entry.note.items) {
			const plan = planForDate(entry.note, item, note.date);
			if (plan?.target.kind !== "max_sets") continue;
			const reps = bestReps(note, (other) => this.workouts.isSameExercise(plan.exercise, other));
			if (reps === undefined || reps <= 0) continue;
			await this.saveTest({ date: note.date, exercise: plan.exercise, test_type: "max_reps", result: reps });
			recorded.push({ exercise: plan.exercise, reps });
		}
		return recorded;
	}
}
