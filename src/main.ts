import { debounce, getLanguage as obsidianLanguage, Notice, Plugin, type TFile, type WorkspaceLeaf } from "obsidian";
import { ageFromBirthYear, clampCorrection, nutritionPlan, stepsActivity, weeklyTrainingHours, type DayLoad, type NutritionPlan, type NutritionProfile } from "./calc/nutrition";
import { assessBalance, correctionAdvice, weightPoints, weightTrend } from "./calc/weight";
import { workoutTonnage } from "./calc/overview";
import { allRecords, newRecords } from "./calc/records";
import { ExportService } from "./data/ExportService";
import { trashPrompt, type TrashKind } from "./data/trash";
import { PROGRAM_FILE_EXTENSIONS, describeImport } from "./calc/programFile";
import { nutritionLine } from "./ui/nutrition/text";
import { GoalService } from "./data/GoalService";
import { InsightService } from "./data/InsightService";
import { PainService } from "./data/PainService";
import { PlanService } from "./data/PlanService";
import { RunImportService } from "./data/RunImportService";
import { HistoryImportService } from "./data/HistoryImportService";
import { DAILY_FIELDS, DAILY_FIELD_LABELS, missingValues, parseDailyCsv } from "./calc/dailyImport";
import { describeHistory, type WeightUnit } from "./calc/historyImport";
import { describeRunImport, RUN_FILE_EXTENSIONS, type RunImportCounts } from "./calc/runFile";
import { SummaryService } from "./data/SummaryService";
import type { TabId } from "./ui/tabs";
import { toLink } from "./model/links";
import { renderWorkoutBlock } from "./data/workoutBlock";
import { joinPath, sanitizeFileName } from "./data/paths";
import type { ExerciseNote, WorkoutNote } from "./model/types";
import { progressionFor } from "./seed/skills";
import { writable } from "svelte/store";
import { ensureFolders, seedLibrary } from "./data/bootstrap";
import { SupplementService } from "./data/SupplementService";
import { GearService } from "./data/GearService";
import { StravaAuth } from "./strava/StravaAuth";
import { describeSync } from "./strava/activities";
import { StravaSync } from "./strava/StravaSync";
import { DayService } from "./data/DayService";
import { workoutLabel } from "./data/dayBlock";
import { planItemTitle } from "./data/planBlock";
import { formatCzechDate, formatShortDate } from "./ui/format";
import { FormaIndex } from "./data/FormaIndex";
import { NoteWriter } from "./data/NoteWriter";
import { ProgramService, type ProgramEntry } from "./data/ProgramService";
import { WorkoutService } from "./data/WorkoutService";
import { previousMonth } from "./calc/monthlySummary";
import { addDays, daysBetween, startOfWeek, toIsoDate } from "./model/dates";
import { LEGACY_FOLDERS, mergeSettings, type BetterFormSettings, type RmrFormulaSetting } from "./settings/settings";
import { BetterFormSettingTab } from "./settings/SettingsTab";
import { BetterFormView, VIEW_TYPE_BETTER_FORM } from "./ui/BetterFormView";
import { initialLanguage, LANGUAGES, type Language, setLanguage, t, tn } from "./i18n";
import { CheckInModal } from "./ui/modals/CheckInModal";
import { missingTexts } from "./seed/lookup";
import { seedPrograms } from "./seed/programs";
import { PROGRAM_DATA } from "./seed/programData";
import { builtinId, builtinName, exerciseNameIn, type BuiltinKind } from "./seed/localize";
import { translateExerciseFrontmatter } from "./seed/exercises";
import { relinkFrontmatter, translateSeedBody, type RenameMaps } from "./calc/relink";
import { exerciseNoteBody } from "./seed/exerciseTexts";
import { templateNoteBody } from "./seed/templates";
import { confirmAction } from "./ui/modals/ConfirmModal";
import { EntryTestModal } from "./ui/modals/EntryTestModal";
import { LibraryModal, type LibraryModalOptions } from "./ui/modals/LibraryModal";
import { OnboardingModal } from "./ui/modals/OnboardingModal";
import { PlanItemModal, type PlanItemModalOptions } from "./ui/modals/PlanItemModal";
import { ProgramEditorModal, ProgramImportModal } from "./ui/modals/ProgramModals";
import { TestModal, type TestModalOptions } from "./ui/modals/TestModal";
import { WorkoutModal, type WorkoutModalOptions } from "./ui/modals/WorkoutModal";
import "./styles.css";

/** Kolik rekordů se vypíše v jedné hlášce. */
const MAX_RECORD_LINES = 5;
/** Jak dlouho po startu se zkusí vytvořit souhrn za uplynulý měsíc. */
const AUTO_SUMMARY_DELAY_MS = 8000;

/** Neveřejné API Obsidianu pro otevření nastavení; nemusí existovat. */
interface SettingsApi {
	open(): void;
	openTabById(id: string): void;
}

export default class BetterFormPlugin extends Plugin {
	declare settings: BetterFormSettings;
	index!: FormaIndex;
	writer!: NoteWriter;
	days!: DayService;
	workouts!: WorkoutService;
	programs!: ProgramService;
	supplements!: SupplementService;
	strava!: StravaAuth;
	stravaSync!: StravaSync;
	gear!: GearService;
	summaries!: SummaryService;
	pains!: PainService;
	goals!: GoalService;
	insights!: InsightService;
	exporter!: ExportService;
	plans!: PlanService;
	runImport!: RunImportService;
	historyImport!: HistoryImportService;

	/** Zvýší se při každé změně indexu – Svelte komponenty podle toho přepočítají data. */
	readonly indexVersion = writable(0);
	/** Právě běží synchronizace se Stravou. */
	readonly stravaBusy = writable(false);
	/** Zvýší se při každém uložení nastavení. */
	readonly settingsVersion = writable(0);

	/** Uložení nastavení se odkládá, aby se při psaní neukládalo po každém znaku. */
	readonly requestSaveSettings = debounce(() => void this.saveSettings(), 400, true);

	override async onload(): Promise<void> {
		await this.loadSettings();
		this.writer = new NoteWriter(this.app);
		this.index = new FormaIndex(this.app);
		this.index.register(this);
		this.registerEvent(this.index.onUpdated(() => this.indexVersion.update((n) => n + 1)));
		this.days = new DayService(this.app, this.index, this.writer, () => this.settings);
		this.workouts = new WorkoutService(this.app, this.index, this.writer, this.days, () => this.settings);
		this.programs = new ProgramService(
			this.app,
			this.index,
			this.writer,
			this.workouts,
			() => this.settings,
			() => this.indexVersion.update((n) => n + 1),
		);
		this.days.isCounterWorkout = (note) => this.programs.isCounterWorkout(note);
		this.strava = new StravaAuth(
			() => this.settings,
			() => this.saveSettings(),
		);
		this.stravaSync = new StravaSync(
			this.strava,
			this.index,
			this.workouts,
			() => this.settings,
			() => this.saveSettings(),
		);
		this.runImport = new RunImportService(this.index, this.workouts);
		this.historyImport = new HistoryImportService(this.index, this.workouts);
		this.gear = new GearService(this.index, this.writer, () => this.settings);
		this.supplements = new SupplementService(this.index, this.writer, this.days, () => this.settings, () =>
			this.indexVersion.update((n) => n + 1),
		);
		// Po uložení tréninku z programu zapsat nové maximum ze „sérií na maximum“.
		this.summaries = new SummaryService(this.app, this.index, this.writer, () => this.settings, () => this.statsContext());
		const notify = () => this.indexVersion.update((n) => n + 1);
		this.pains = new PainService(this.index, this.writer, () => this.settings, notify);
		this.goals = new GoalService(
			this.index,
			this.writer,
			() => this.settings,
			() => this.statsContext(),
			(a, b) => this.workouts.isSameExercise(a, b),
			notify,
		);
		this.plans = new PlanService(this.app, this.index, this.writer, () => this.settings, notify);
		this.plans.isCounterWorkout = (note) => this.programs.isCounterWorkout(note);
		this.plans.isProgramSession = (note) => this.programs.isPlanSession(note);
		this.plans.programsOn = (date) => this.programs.planDays(date);
		this.insights = new InsightService(
			this.index,
			this.programs,
			this.goals,
			this.plans,
			() => this.settings,
			(exercise) => this.exerciseInfo(exercise),
			() => this.bodyweightKg(),
		);
		this.insights.nutritionCheck = (today) => this.nutritionCheck(today);
		this.exporter = new ExportService(this.app, this.index, this.writer, () => this.settings, (w) => workoutTonnage(w, this.statsContext()));
		// Doporučená výživa v denní poznámce (SPEC 4.1) – jen když jsou v profilu potřebné údaje.
		this.days.nutritionLine = (date, workouts) => {
			// Denní poznámka je záznam – počítá jen se zapsanými tréninky, ne s plánem.
			const plan = this.nutritionPlan(date, undefined, workouts, false);
			return plan ? nutritionLine(plan) : null;
		};
		this.workouts.onSaved = async (note, file, isNew) => {
			this.programs.forget(file);
			for (const max of await this.programs.recordMaxes(note)) {
				new Notice(t("New max logged: {exercise} – {reps} reps", { exercise: max.exercise, reps: max.reps }));
			}
			if (isNew) this.announceRecords(note, file);
		};

		this.registerView(VIEW_TYPE_BETTER_FORM, (leaf) => new BetterFormView(leaf, this));
		this.addSettingTab(new BetterFormSettingTab(this.app, this));

		this.addRibbonIcon("dumbbell", "Better Form", () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-view",
			name: t("Open overview"),
			callback: () => {
				void this.activateView();
			},
		});
		this.addCommand({
			id: "check-in",
			name: t("Morning check-in"),
			callback: () => this.openCheckIn(),
		});
		this.addCommand({
			id: "log-workout",
			name: t("Log workout"),
			callback: () => this.openWorkout({}),
		});
		this.addCommand({
			id: "week-plan",
			name: t("Weekly plan"),
			callback: () => {
				void this.activateView().then(() => this.showTab("plan"));
			},
		});
		this.addCommand({
			id: "plan-workout",
			name: t("Plan a workout"),
			callback: () => this.openPlanItem({ date: toIsoDate(new Date()) }),
		});
		this.addCommand({
			id: "edit-workout",
			name: t("Edit open workout"),
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const isWorkout = !!file && this.index.all("workout").some((e) => e.file === file);
				if (!checking && file && isWorkout) this.openWorkout({ file });
				return isWorkout;
			},
		});
		this.addCommand({
			id: "exercise-library",
			name: t("Exercise library"),
			callback: () => this.openLibrary({}),
		});
		this.addCommand({
			id: "fill-exercise-texts",
			name: t("Add exercise descriptions from the library"),
			callback: () => void this.fillExerciseTexts(),
		});
		this.addCommand({
			id: "refresh-builtin-programs",
			name: t("Restore built-in programs"),
			callback: () => void this.refreshBuiltinPrograms(),
		});
		this.addCommand({
			id: "rename-builtin-to-language",
			name: t("Translate the library and generated texts to the interface language"),
			callback: () => void this.renameBuiltinToLanguage(),
		});
		this.addCommand({
			id: "test-max",
			name: t("Max test"),
			callback: () => this.openTest({}),
		});
		this.addCommand({
			id: "import-program",
			name: t("Import program"),
			callback: () => this.openProgramImport(),
		});
		this.addCommand({
			id: "sync-strava",
			name: t("Sync Strava"),
			callback: () => void this.syncStrava(),
		});
		this.addCommand({
			id: "import-run-file",
			name: t("Import run from file (GPX, TCX, FIT)"),
			callback: () => this.pickRunFiles(),
		});
		this.addCommand({
			id: "import-history",
			name: t("Import history from Strong or Hevy (CSV)"),
			callback: () => this.pickHistoryFile("kg"),
		});
		this.addCommand({
			id: "import-daily",
			name: t("Import daily data from CSV (steps, sleep, HRV, weight)"),
			callback: () => this.pickDailyFile(),
		});
		this.addCommand({
			id: "monthly-summary",
			name: t("Create or refresh monthly summary"),
			callback: () => void this.monthlySummary(),
		});
		this.addCommand({
			id: "weekly-summary",
			name: t("Create or refresh weekly summary"),
			callback: () => void this.weeklySummary(),
		});
		this.addCommand({
			id: "yearly-summary",
			name: t("Create or refresh yearly summary"),
			callback: () => void this.yearlySummary(),
		});
		this.addCommand({
			id: "fill-skill-ladders",
			name: t("Add skill ladders to the library"),
			callback: () => void this.fillSkillLadders(),
		});
		this.addCommand({
			id: "open-today",
			name: t("Open today's daily note"),
			callback: () => {
				void this.days.openDayNote(toIsoDate(new Date())).catch((err) => this.fail(t("Can't open the daily note"), err));
			},
		});
		this.addCommand({
			id: "refresh-day-block",
			name: t("Refresh summary in the daily note"),
			callback: () => void this.refreshDayBlock(),
		});
		this.addCommand({
			id: "onboarding",
			name: t("Setup guide"),
			callback: () => this.openOnboarding(),
		});
		this.addCommand({
			id: "export-csv",
			name: t("Export workouts and daily data to CSV"),
			callback: () => void this.exportCsv(),
		});
		this.addCommand({
			id: "backup",
			name: t("Back up folder to ZIP"),
			callback: () => void this.backup(),
		});
		this.addCommand({
			id: "create-folders",
			name: t("Create missing folders"),
			callback: () => {
				void this.createFolders(true);
			},
		});
		this.addCommand({
			id: "seed-library",
			name: t("Add missing exercises, programs and templates to the library"),
			callback: () => {
				void this.seedLibrary(true);
			},
		});

		this.app.workspace.onLayoutReady(() => {
			if (!this.settings.initialized) void this.firstRun();
			else if (!this.settings.librarySeeded) void this.seedOnce();
			// Souhrn za uplynulý měsíc (SPEC 9.5) – až po načtení poznámek do indexu.
			window.setTimeout(() => void this.autoSummary(), AUTO_SUMMARY_DELAY_MS);
		});
	}

	override onunload(): void {
		// Neuložené změny nastavení zapsat hned.
		this.requestSaveSettings.run();
		this.strava.dispose();
	}

	async loadSettings(): Promise<void> {
		const stored: unknown = await this.loadData();
		this.settings = mergeSettings(stored);
		// Vault bez uloženého jazyka (nová instalace nebo starší verze): podle jazyka Obsidianu.
		if (!(typeof stored === "object" && stored !== null && "language" in stored)) {
			this.settings.language = initialLanguage(obsidianLanguage());
		}
		// Vault ze starší verze bez uložených složek: původní výchozí složky, aby se data našla.
		if (typeof stored === "object" && stored !== null && !("folders" in stored)) this.settings.folders = { ...LEGACY_FOLDERS };
		setLanguage(this.settings.language);
		// Nastavení ze starší verze pluginu se po migraci hned uloží.
		const storedVersion = (stored as { settingsVersion?: unknown } | null)?.settingsVersion;
		if (stored && storedVersion !== this.settings.settingsVersion) await this.saveData(this.settings);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.settingsVersion.update((n) => n + 1);
	}

	/** data.json změněný zvenku (např. synchronizací mezi zařízeními). */
	override async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings();
		this.settingsVersion.update((n) => n + 1);
	}

	/** Ruční synchronizace běhů ze Stravy; výsledek oznámí hláškou. */
	async syncStrava(): Promise<void> {
		if (this.stravaSync.isRunning) return;
		if (!this.strava.isConnected) {
			new Notice(t("Strava isn't connected – connect it in the Better Form settings."));
			return;
		}
		this.stravaBusy.set(true);
		try {
			new Notice(describeSync(await this.stravaSync.sync()), 8000);
		} catch (err) {
			// Jen text chyby – nikdy celý objekt (mohl by nést token).
			new Notice(`Strava: ${err instanceof Error ? err.message : "sync failed."}`, 8000);
		} finally {
			this.stravaBusy.set(false);
			this.indexVersion.update((n) => n + 1);
		}
	}

	// ---------- Společné podklady pro výpočty ----------

	/** Cvik z knihovny podle názvu, aliasu nebo názvu souboru. */
	exerciseInfo(exercise: string): ExerciseNote | undefined {
		return this.index.findExercise(exercise)?.note;
	}

	/** Tělesná hmotnost pro výpočty: poslední zapsaná, jinak z profilu. */
	bodyweightKg(): number | undefined {
		return this.supplements.weightKg() ?? undefined;
	}

	/** Přepne rovnici klidového výdeje (karta Výživa nabízí tu, která se k profilu hodí). */
	async setRmrFormula(formula: RmrFormulaSetting): Promise<void> {
		this.settings.nutrition.rmrFormula = formula;
		await this.saveSettings();
	}

	/** Kontext pro rekordy, objem a přehledy. */
	statsContext(): { info: (exercise: string) => ExerciseNote | undefined; bodyweightKg?: number } {
		return { info: (exercise) => this.exerciseInfo(exercise), bodyweightKg: this.bodyweightKg() };
	}

	/** Údaje profilu pro výživu: hmotnost z check-inu (jinak profil), % tuku z posledního měření (jinak profil). */
	nutritionProfile(date: string): NutritionProfile {
		const p = this.settings.profile;
		const days = this.index.all("day").map((e) => e.note);
		const workouts = this.index.all("workout").map((e) => e.note);
		const measured = days
			.filter((d) => d.date <= date && d.body.body_fat_pct !== undefined)
			.sort((a, b) => b.date.localeCompare(a.date))[0];
		return {
			sex: p.sex,
			age: ageFromBirthYear(p.birthYear, date),
			heightCm: p.heightCm,
			weightKg: this.bodyweightKg() ?? null,
			bodyFatPct: measured?.body.body_fat_pct ?? p.bodyFatPct,
			activity: p.activity,
			goal: p.goal,
			trainingHoursPerWeek: weeklyTrainingHours(workouts, date, daysBetween),
			steps: stepsActivity(days, workouts, date, daysBetween),
		};
	}

	/** Doporučený příjem pro den (SPEC kap. 11); null, když v profilu chybí údaje. */
	nutritionPlan(date: string, loadOverride?: DayLoad, workouts?: WorkoutNote[], withPlan = true): NutritionPlan | null {
		return nutritionPlan({
			planned: withPlan ? this.plans.plannedWorkouts(date, toIsoDate(new Date())) : [],
			profile: this.nutritionProfile(date),
			settings: this.settings.nutrition,
			eaMin: this.settings.thresholds.eaMinKcalPerKgFfm,
			workouts: workouts ?? this.index.all("workout").map((e) => e.note).filter((w) => w.date === date),
			loadOverride,
		});
	}

	/**
	 * Smaže poznámku z rozhraní: po potvrzení ji přesune do koše podle nastavení
	 * Obsidianu (nikdy trvale). Vrací true, když se smazala.
	 */
	async trashNote(file: TFile, kind: TrashKind, name: string, extra = ""): Promise<boolean> {
		const prompt = trashPrompt(kind, name, extra);
		if (!(await confirmAction(this.app, prompt.title, prompt.message, t("Delete")))) return false;
		try {
			// trashFile respektuje nastavení koše v Obsidianu.
			await this.app.fileManager.trashFile(file);
		} catch (err) {
			this.fail(t("Couldn't delete"), err);
			return false;
		}
		this.indexVersion.update((n) => n + 1);
		new Notice(t("Deleted: “{name}” is in the trash.", { name }));
		return true;
	}

	/** Smaže trénink a obnoví souhrn v denní poznámce toho dne. */
	async deleteWorkout(file: TFile): Promise<boolean> {
		const note = this.index.all("workout").find((e) => e.file === file)?.note;
		const label = note ? `${note.date} ${workoutLabel(note)}` : file.basename;
		if (!(await this.trashNote(file, "workout", label))) return false;
		this.programs.forget(file);
		if (note) {
			try {
				await this.days.refreshBlock(note.date, undefined, file);
			} catch (err) {
				console.error(t("Better Form: couldn't refresh the day summary after deleting the workout"), err);
			}
		}
		return true;
	}

	/** Export tréninků, sérií a denních dat do CSV (SPEC 5.12). */
	async exportCsv(): Promise<void> {
		try {
			const result = await this.exporter.exportCsv();
			new Notice(t("Export done – workouts: {workouts}, days: {days}, folder “{folder}”.", { workouts: result.workouts, days: result.days, folder: result.folder }), 8000);
		} catch (err) {
			this.fail(t("Export failed"), err);
		}
	}

	/** Záloha kořenové složky do ZIP (SPEC 5.12). */
	async backup(): Promise<void> {
		try {
			const result = await this.exporter.backup();
			new Notice(tn(result.files, ["Backup done: {n} file, {v} kB – “{path}”.", "Backup done: {n} files, {v} kB – “{path}”."], { v: Math.max(1, Math.round(result.bytes / 1024)), path: result.path }), 8000);
		} catch (err) {
			this.fail(t("Couldn't create the backup"), err);
		}
	}

	/**
	 * Tréninky, které se počítají jako tréninková jednotka (týdenní cíl, odznaky):
	 * záznamy denního počítadla jen ve dnech, kdy není jiný trénink – a to jednou.
	 */
	sessionWorkouts(): WorkoutNote[] {
		const all = this.index.all("workout").map((w) => w.note);
		const regular = all.filter((w) => !this.programs.isCounterWorkout(w));
		const days = new Set(regular.map((w) => w.date));
		for (const workout of all) {
			if (days.has(workout.date)) continue;
			days.add(workout.date);
			regular.push(workout);
		}
		return regular;
	}

	/** Po uložení nového tréninku ohlásí překonané osobní rekordy (SPEC 5.3, 9.1). */
	private announceRecords(note: WorkoutNote, file: TFile): void {
		const others = this.index
			.all("workout")
			.filter((w) => w.file !== file)
			.map((w) => w.note);
		const tests = this.index.all("test").map((t) => t.note);
		const ctx = this.statsContext();
		const fresh = newRecords(allRecords(others, tests, ctx), allRecords([...others, note], tests, ctx));
		if (fresh.length === 0) return;
		const lines = fresh.slice(0, MAX_RECORD_LINES).map((r) => `• ${r.text}`);
		if (fresh.length > MAX_RECORD_LINES) lines.push(t("… and {MAX_RECORD_LINES} more", { MAX_RECORD_LINES: fresh.length - MAX_RECORD_LINES }));
		new Notice(`${tn(fresh.length, ["New personal record", "New personal records"])}\n${lines.join("\n")}`, 12000);
	}

	/** Souhrn otevřené poznámky se souhrnem, jinak za uplynulý měsíc; otevře ho. */
	async monthlySummary(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const month = (active && this.summaries.monthOf(active)) ?? previousMonth(toIsoDate(new Date()).slice(0, 7));
		try {
			const file = await this.summaries.generate(month);
			await this.app.workspace.getLeaf(false).openFile(file);
		} catch (err) {
			this.fail(t("Couldn't create the summary"), err);
		}
	}

	/** Roční souhrn: pro otevřený roční souhrn ho obnoví, jinak vytvoří souhrn letošního roku. */
	async yearlySummary(year?: number): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const target = year ?? (active && this.summaries.yearOf(active)) ?? Number(toIsoDate(new Date()).slice(0, 4));
		try {
			const file = await this.summaries.generateYear(target);
			await this.app.workspace.getLeaf(false).openFile(file);
		} catch (err) {
			this.fail(t("Couldn't create the yearly summary"), err);
		}
	}

	/** Týdenní souhrn: daný týden, jinak týden otevřeného souhrnu, jinak minulý (dokončený) týden. */
	async weeklySummary(date?: string): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const today = toIsoDate(new Date());
		const week = startOfWeek(date ?? (active && this.summaries.weekOf(active)) ?? addDays(today, -7));
		try {
			const view = this.plans.view(week, today);
			const file = await this.summaries.generateWeek(week, view.summary, view.outlook.average);
			await this.app.workspace.getLeaf(false).openFile(file);
		} catch (err) {
			this.fail(t("Couldn't create the weekly summary"), err);
		}
	}

	private async autoSummary(): Promise<void> {
		if (!this.index.isReady) return;
		try {
			const file = await this.summaries.ensurePrevious(toIsoDate(new Date()));
			if (file) new Notice(t("Better Form: last month's summary is in the note “{basename}”.", { basename: file.basename }));
		} catch (err) {
			console.error(t("Better Form: couldn't create the monthly summary"), err);
		}
	}

	/**
	 * Doplní do knihovny cviky žebříčků dovedností a u vestavěných cviků zapíše
	 * žebříček a stupeň – jen tam, kde `progression` chybí (nic se nepřepisuje).
	 */
	async fillSkillLadders(): Promise<void> {
		try {
			const seeded = await seedLibrary(this.writer, this.settings.folders, {
				hasExercise: (name) => this.index.findExercise(name) !== undefined,
				hasProgram: () => true,
				hasTemplate: () => true,
			});
			let updated = 0;
			for (const entry of this.index.all("exercise")) {
				if (entry.schemaStatus === "newer" || entry.note.progression?.ladder) continue;
				const progression = progressionFor(entry.note.name);
				if (!progression) continue;
				await this.writer.updateFrontmatter(entry.file, (fm) => {
					if (fm.progression === undefined || fm.progression === null) {
						fm.progression = { ladder: toLink(progression.ladder), level: progression.level };
					}
				});
				updated++;
			}
			new Notice(
				seeded.exercises + updated > 0
					? t("Skill ladders added – new exercises: {exercises}, exercises assigned: {updated}.", { exercises: seeded.exercises, updated })
					: t("The skill ladders are already in the library."),
			);
			this.indexVersion.update((n) => n + 1);
		} catch (err) {
			this.fail(t("Couldn't add the skill ladders"), err);
		}
	}

	/** Přepne jazyk: uloží ho a otevřená view vykreslí znovu (názvy příkazů až po restartu pluginu). */
	async setLanguage(language: Language): Promise<void> {
		this.settings.language = language;
		setLanguage(language);
		await this.saveSettings();
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_BETTER_FORM)) {
			if (leaf.view instanceof BetterFormView) await leaf.view.remount();
		}
	}

	/** Přepne otevřené view na danou kartu (např. z doporučení). */
	showTab(tab: TabId): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_BETTER_FORM)) {
			if (leaf.view instanceof BetterFormView) leaf.view.showTab(tab);
		}
	}

	/** Úvodní průvodce: profil, cíl, režim a sporty na jednom místě. */
	openOnboarding(first = false): void {
		new OnboardingModal(this, first).open();
	}

	openCheckIn(date: string = toIsoDate(new Date())): void {
		new CheckInModal(this, date).open();
	}

	/** Nastaví osobní korekci odhadu výdeje (0 = zrušit) a zapamatuje si datum – viz týdenní kontrola výživy. */
	async setNutritionCorrection(kcal: number): Promise<void> {
		const next = clampCorrection(kcal);
		this.settings.nutrition.correctionKcal = next;
		this.settings.nutrition.correctionDate = next === 0 ? "" : toIsoDate(new Date());
		await this.saveSettings();
		new Notice(next === 0 ? t("Expenditure correction removed.") : t("Recommended intake shifted by {v}{v2} kcal a day.", { v: next > 0 ? "+" : "−", v2: Math.abs(next) }));
	}

	/** Týdenní kontrola výživy pro doporučení: o kolik by šlo odhad výdeje posunout; null = není co řešit. */
	nutritionCheck(today: string): { stepKcal: number } | null {
		const plan = this.nutritionPlan(today);
		if (!plan) return null;
		const trend = weightTrend(weightPoints(this.index.all("day").map((e) => e.note)), today);
		if (!trend.ready) return null;
		const n = this.settings.nutrition;
		const advice = correctionAdvice(assessBalance(trend, this.settings.profile.goal, plan.goalAdjust), n.correctionKcal, n.correctionDate, today, plan.raisedFor.length > 0);
		return advice.kind === "offer" ? { stepKcal: advice.stepKcal } : null;
	}

	/** Přidání nebo úprava položky plánu týdne. */
	openPlanItem(options: PlanItemModalOptions): void {
		new PlanItemModal(this, options).open();
	}

	/** Přesune položku plánu na jiný den (z doporučení „Přesunout na zítra“) a oznámí výsledek. */
	async movePlanItem(move: { itemId: string; from: string; to: string }): Promise<void> {
		const item = this.plans.items(startOfWeek(move.from)).find((i) => i.id === move.itemId && i.date === move.from);
		if (!item) {
			new Notice(t("The item is no longer in the plan."));
			return;
		}
		try {
			await this.plans.move(item, move.to);
			new Notice(t("Moved to {v}: {v2}.", { v: formatShortDate(move.to), v2: planItemTitle(item) }));
		} catch (err) {
			this.fail(t("Couldn't update the plan"), err);
		}
	}

	/** Zápis tréninku: nový (volitelně sport), ze šablony, nebo úprava existujícího. */
	openWorkout(options: Partial<WorkoutModalOptions>): void {
		new WorkoutModal(this, { ...options, date: options.date ?? toIsoDate(new Date()) }).open();
	}

	/** Přepne režim zobrazení (plný / Základ); data zůstávají stejná. */
	async setMode(mode: BetterFormSettings["mode"]): Promise<void> {
		this.settings.mode = mode;
		await this.saveSettings();
	}

	/** Vstupní test / retest maxim cviků režimu Základ. */
	openEntryTest(): void {
		new EntryTestModal(this).open();
	}

	openTest(options: Partial<TestModalOptions>): void {
		new TestModal(this, { ...options, date: options.date ?? toIsoDate(new Date()) }).open();
	}

	/** Nový vlastní program, nebo úprava existujícího. */
	openProgramEditor(entry?: ProgramEntry): void {
		new ProgramEditorModal(this, entry).open();
	}

	/** Nechá vybrat soubor (.md, .txt, .json, .yaml) a vytvoří z něj vlastní program. */
	pickProgramFile(): void {
		const input = createEl("input");
		input.type = "file";
		input.accept = PROGRAM_FILE_EXTENSIONS.join(",");
		input.addEventListener("change", () => {
			const file = input.files?.[0];
			if (file) void this.importProgramFile(file.name, () => file.text());
		});
		input.click();
	}

	/** Vytvoří program z textu souboru a oznámí, co vzniklo a co zkontrolovat. */
	async importProgramFile(fileName: string, read: () => Promise<string>): Promise<void> {
		try {
			const report = await this.programs.importFile(fileName, await read());
			this.indexVersion.update((n) => n + 1);
			new Notice(describeImport(report), 12000);
		} catch (err) {
			new Notice(t("Couldn't create a program from the file: {v}", { v: err instanceof Error ? err.message : String(err) }), 10000);
		}
	}

	/** Výběr souborů GPX / TCX / FIT s běhy (ze Stravy, MapMyRun, hodinek) a jejich import. */
	pickRunFiles(): void {
		const input = createEl("input");
		input.type = "file";
		input.multiple = true;
		input.accept = RUN_FILE_EXTENSIONS.join(",");
		input.addEventListener("change", () => {
			const files = [...(input.files ?? [])];
			if (files.length > 0) void this.importRunFiles(files.map((file) => ({ name: file.name, read: () => file.arrayBuffer() })));
		});
		input.click();
	}

	/** Importuje běhy ze souborů jeden po druhém a oznámí, co vzniklo; vadný soubor ostatní nezastaví. */
	async importRunFiles(files: { name: string; read: () => Promise<ArrayBuffer> }[]): Promise<RunImportCounts> {
		const counts: RunImportCounts = { created: 0, merged: 0, duplicates: 0, withoutHr: 0, failed: [] };
		for (const file of files) {
			try {
				const result = await this.runImport.importFile(await file.read());
				if (result.action === "created") counts.created++;
				else if (result.action === "merged") counts.merged++;
				else counts.duplicates++;
				if (result.action !== "duplicate" && result.note.sport === "run" && !result.hasHeartRate) counts.withoutHr++;
			} catch (err) {
				counts.failed.push({ name: file.name, reason: err instanceof Error ? err.message : t("couldn't read the file.") });
			}
		}
		this.indexVersion.update((n) => n + 1);
		new Notice(describeRunImport(counts), 10000);
		return counts;
	}

	/** Výběr CSV exportu ze Strong nebo Hevy. `unit` = jednotka váhy v exportu Strong (Hevy ji má v souboru). */
	pickHistoryFile(unit: WeightUnit): void {
		const input = createEl("input");
		input.type = "file";
		input.accept = ".csv";
		input.addEventListener("change", () => {
			const file = input.files?.[0];
			if (file) void file.text().then((text) => this.importHistory(text, unit));
		});
		input.click();
	}

	/** Ukáže, co v souboru je, a po potvrzení založí tréninky; duplicity přeskočí. */
	async importHistory(text: string, unit: WeightUnit): Promise<void> {
		try {
			const preview = this.historyImport.preview(text, unit);
			const { fresh, duplicates, unknownExercises, parsed } = preview;
			if (fresh.length === 0) {
				new Notice(`${describeHistory(parsed, (iso) => formatCzechDate(iso, false))}${duplicates > 0 ? ` Všechny už v deníku jsou (${duplicates}).` : ""}`, 10000);
				return;
			}
			const lines = [
				describeHistory(parsed, (iso) => formatCzechDate(iso, false)),
				t("Workouts to create: {fresh_length}{v}. A daily note will be created for each day too.", { fresh_length: fresh.length, v: duplicates > 0 ? t("; already in the journal: {duplicates}", { duplicates }) : "" }),
				parsed.format === "strong" ? t("Treating weights as {v} – the Strong export doesn't include the unit.", { v: unit === "kg" ? "kilogramy" : t("pounds (converted to kg)") }) : "",
				parsed.skippedRows > 0 ? t("Rows skipped: {skippedRows} (runs and other cardio, empty sets).", { skippedRows: parsed.skippedRows }) : "",
				unknownExercises.length > 0
					? t("Exercises the library doesn't know ({unknownExercises_length}) keep their original name: {v}{v2}.", { unknownExercises_length: unknownExercises.length, v: unknownExercises.slice(0, 8).join(", "), v2: unknownExercises.length > 8 ? "…" : "" })
					: "",
				t("These apps don't record RPE for the whole workout – imported workouts count towards load once you add it."),
			].filter((line) => line !== "");
			if (!(await confirmAction(this.app, t("Import workout history?"), lines.join("\n\n"), t("Import")))) return;
			const progress = new Notice(t("Importing… {done} of {total}", { done: 0, total: fresh.length }), 0);
			try {
				await this.historyImport.save(fresh, (done) => {
					if (done % 10 === 0 || done === fresh.length) progress.setMessage(t("Importing… {done} of {total}", { done, total: fresh.length }));
				});
			} finally {
				progress.hide();
			}
			this.indexVersion.update((n) => n + 1);
			new Notice(t("Import done – workouts: {fresh_length}.", { fresh_length: fresh.length }), 8000);
		} catch (err) {
			this.fail(t("History import failed"), err);
		}
	}

	/** Výběr CSV s denními hodnotami z hodinek nebo aplikace. */
	pickDailyFile(): void {
		const input = createEl("input");
		input.type = "file";
		input.accept = ".csv";
		input.addEventListener("change", () => {
			const file = input.files?.[0];
			if (file) void file.text().then((text) => this.importDaily(text));
		});
		input.click();
	}

	/** Import denních hodnot: ukáže, co se doplní, a po potvrzení zapíše jen chybějící hodnoty. */
	async importDaily(text: string): Promise<void> {
		try {
			const parsed = parseDailyCsv(text);
			const plan = parsed.rows.map((row) => ({ row, missing: missingValues(row, this.index.day(row.date)?.note) })).filter((p) => Object.keys(p.missing).length > 0);
			const span = parsed.rows.length > 0 ? ` (${formatCzechDate(parsed.rows[0]!.date, false)} – ${formatCzechDate(parsed.rows[parsed.rows.length - 1]!.date, false)})` : "";
			const found = t("In the file – days: {rows_length}{span}; values: {v}.", { rows_length: parsed.rows.length, span, v: parsed.fields.map((f) => DAILY_FIELD_LABELS[f]).join(", ") });
			if (plan.length === 0) {
				new Notice(t("{found} Nothing to add – everything is already in the journal.", { found }), 10000);
				return;
			}
			const perField = DAILY_FIELDS.map((f) => ({ f, n: plan.filter((p) => p.missing[f] !== undefined).length })).filter((x) => x.n > 0);
			const newNotes = plan.filter((p) => !this.index.day(p.row.date)).length;
			const lines = [
				found,
				tn(plan.length, ["Will fill in {n} day: {v}. Values you've already logged stay.", "Will fill in {n} days: {v}. Values you've already logged stay."], { v: perField.map((x) => `${DAILY_FIELD_LABELS[x.f]} ${x.n}×`).join(", ") }),
				newNotes > 0 ? t("New daily notes to create: {newNotes}.", { newNotes }) : "",
				parsed.fields.includes("duration_min") ? t("Sleep duration goes to the day stated in the file – it should be the day you woke up.") : "",
				parsed.skippedRows > 0 ? t("Rows without a valid date skipped: {skippedRows}.", { skippedRows: parsed.skippedRows }) : "",
			].filter((line) => line !== "");
			if (!(await confirmAction(this.app, t("Import daily data?"), lines.join("\n\n"), t("Import")))) return;
			const progress = new Notice(t("Importing… {done} of {total}", { done: 0, total: plan.length }), 0);
			let result = { days: 0, values: 0 };
			try {
				result = await this.days.fillMissing(
					plan.map((p) => p.row),
					(done) => {
						if (done % 10 === 0 || done === plan.length) progress.setMessage(t("Importing… {done} of {total}", { done, total: plan.length }));
					},
				);
			} finally {
				progress.hide();
			}
			this.indexVersion.update((n) => n + 1);
			new Notice(t("Import done – values added: {values}, days: {days}.", { values: result.values, days: result.days }), 8000);
		} catch (err) {
			this.fail(t("Daily data import failed"), err);
		}
	}

	openProgramImport(): void {
		new ProgramImportModal(this).open();
	}

	/** Knihovna cviků: prohlížení, filtr podle partie, detail cviku s panáčkem. */
	openLibrary(options: LibraryModalOptions): void {
		new LibraryModal(this, options).open();
	}

	/**
	 * Doplní do poznámek cviků popis, provedení a časté chyby z vestavěné knihovny –
	 * jen tam, kde pole chybí. Existující text se nikdy nepřepíše.
	 */
	async fillExerciseTexts(): Promise<void> {
		let updated = 0;
		try {
			for (const entry of this.index.all("exercise")) {
				if (entry.schemaStatus === "newer") continue;
				const missing = missingTexts(entry.note);
				if (Object.keys(missing).length === 0) continue;
				await this.writer.updateFrontmatter(entry.file, (fm) => {
					for (const [key, value] of Object.entries(missing)) {
						if (fm[key] === undefined || fm[key] === null || fm[key] === "") fm[key] = value;
					}
				});
				updated++;
			}
			new Notice(updated > 0 ? tn(updated, ["Descriptions added to {n} exercise.", "Descriptions added to {n} exercises."]) : t("All exercises already have descriptions."));
		} catch (err) {
			this.fail(t("Couldn't add the descriptions"), err);
		}
	}

	/**
	 * Přepíše předpřipravené programy (builtin: true) aktuální verzí z pluginu.
	 * Vlastní programy a kopie se nemění; aktivace zůstane. Vyžaduje potvrzení.
	 */
	async refreshBuiltinPrograms(): Promise<void> {
		// Program se obnoví v jazyce, ve kterém je poznámka (podle jejího názvu).
		const pairs = PROGRAM_DATA.flatMap(({ id }) => {
			const entry = this.programs.programs().find((p) => p.note.builtin && builtinId("program", p.note.name) === id);
			if (!entry || entry.schemaStatus === "newer") return [];
			const language = LANGUAGES.find((l) => builtinName("program", id, l) === entry.note.name) ?? "en";
			const seed = seedPrograms(language).find((p) => p.id === id)!;
			return [{ seed, entry }];
		});
		if (pairs.length === 0) {
			new Notice(t("No built-in programs to restore – use “Add to library”."));
			return;
		}
		const ok = await confirmAction(
			this.app,
			t("Restore built-in programs?"),
			t("The description and settings of {pairs_length} built-in programs will be replaced with the current version from the plugin. Your edits in these notes will be lost; your own programs, copies and activations stay.", { pairs_length: pairs.length }),
			t("Restore"),
		);
		if (!ok) return;
		try {
			for (const { seed, entry } of pairs) await this.programs.refreshBuiltin(entry, seed.note, seed.description);
			new Notice(t("Programs restored: {pairs_length}.", { pairs_length: pairs.length }));
		} catch (err) {
			this.fail(t("Couldn't restore the programs"), err);
		}
	}

	/**
	 * Přeloží vestavěnou knihovnu založenou v jiném jazyce do jazyka rozhraní: cviky (název, aliasy,
	 * texty, které uživatel neupravil, žebříček), šablony a programy (název). Poznámky přejmenuje
	 * a odkazy na ně v trénincích, šablonách, programech, cílech, testech, normách a plánech opraví,
	 * pokud je neopravil Obsidian. Vlastní poznámky a upravené texty se nemění. Vyžaduje potvrzení.
	 */
	async renameBuiltinToLanguage(): Promise<void> {
		const language = this.settings.language;
		const frontmatter = (file: TFile) => structuredClone((this.app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>);
		// Text, který plugin vložil do těla při založení – v každém jazyce (přeloží se jen beze změny).
		const seededBody = (kind: BuiltinKind, id: string, l: Language): string | undefined =>
			kind === "exercise" ? exerciseNoteBody(l) : kind === "template" ? templateNoteBody(l) : seedPrograms(l).find((p) => p.id === id)?.description;
		type Job = { kind: "exercise" | "template" | "program"; id: string; file: TFile; name: string; to: string; body: string | null };
		const jobs: Job[] = [];
		for (const kind of ["exercise", "template", "program"] as const) {
			for (const e of this.index.all(kind)) {
				const id = builtinId(kind, e.note.name);
				if (id === undefined || e.schemaStatus === "newer") continue;
				const to = builtinName(kind, id, language);
				const target = seededBody(kind, id, language);
				const seeded = LANGUAGES.map((l) => seededBody(kind, id, l)).filter((x): x is string => x !== undefined);
				const body = target === undefined ? null : translateSeedBody(await this.app.vault.read(e.file), seeded, target);
				const frontmatterChanged = kind === "exercise" && translateExerciseFrontmatter(frontmatter(e.file), id, language);
				if (frontmatterChanged || to !== e.note.name || body !== null) jobs.push({ kind, id, file: e.file, name: e.note.name, to, body: target ?? null });
			}
		}
		const exercises = jobs.filter((job) => job.kind === "exercise");
		const library =
			jobs.length === 0
				? t("The built-in library is already in the interface language.")
				: `${t("Exercises: {exercises}, templates and programs: {other}.", { exercises: exercises.length, other: jobs.length - exercises.length })} ${t("The notes are renamed and links to them in workouts, templates, programs, goals and plans are updated. Texts you edited and your own exercises, templates and programs stay unchanged.")}`;
		const ok = await confirmAction(
			this.app,
			t("Translate to the interface language?"),
			`${library} ${t("Texts generated in daily notes, workouts, weekly plans and summaries are rewritten in the interface language; your own text in notes stays.")}`,
			t("Translate"),
		);
		if (!ok) return;
		const renamed: Record<"exercise" | "template" | "program", Map<string, string>> = { exercise: new Map(), template: new Map(), program: new Map() };
		try {
			for (const job of jobs) {
				const oldNames = [job.file.basename, job.name];
				await this.app.fileManager.processFrontMatter(job.file, (fm: Record<string, unknown>) => {
					if (job.kind === "exercise") translateExerciseFrontmatter(fm, job.id, language);
					else fm.name = job.to;
				});
				const target = job.body;
				if (target !== null) {
					const seeded = LANGUAGES.map((l) => seededBody(job.kind, job.id, l)).filter((x): x is string => x !== undefined);
					await this.app.vault.process(job.file, (text) => translateSeedBody(text, seeded, target) ?? text);
				}
				const path = joinPath(job.file.parent?.path ?? "", `${sanitizeFileName(job.to)}.md`);
				if (path !== job.file.path && this.app.vault.getAbstractFileByPath(path) === null) await this.app.fileManager.renameFile(job.file, path);
				for (const old of oldNames) if (old !== job.file.basename) renamed[job.kind].set(old.toLowerCase(), job.file.basename);
			}
			await this.relinkRenamed({ exercise: renamed.exercise, max_from: renamed.exercise, template: renamed.template, program: renamed.program });
			this.settings.basicExercises = this.settings.basicExercises.map((name) => exerciseNameIn(name, language));
			if (this.settings.situpAlternative) this.settings.situpAlternative = exerciseNameIn(this.settings.situpAlternative, language);
			await this.saveSettings();
			const blocks = await this.refreshGeneratedBlocks();
			new Notice(t("Translated library notes: {n}; notes with updated texts: {blocks}.", { n: jobs.length, blocks }));
		} catch (err) {
			this.fail(t("Translating the library failed"), err);
		}
	}

	/**
	 * Generované bloky (mezi forma:start / forma:end) ve všech poznámkách znovu v jazyce rozhraní:
	 * tréninky, denní poznámky, plány týdne a souhrny. Zapisuje jen tam, kde se blok liší. Vrací počet
	 * poznámek, které se změnily.
	 */
	async refreshGeneratedBlocks(): Promise<number> {
		let changed = 0;
		const count = async (file: TFile, write: () => Promise<unknown>) => {
			const before = await this.app.vault.read(file);
			await write();
			if ((await this.app.vault.read(file)) !== before) changed++;
		};
		for (const { file, note, schemaStatus } of this.index.workouts()) {
			if (schemaStatus === "newer") continue;
			await count(file, () => this.writer.setGeneratedBlock(file, renderWorkoutBlock(note, (e) => this.workouts.measureOf(e))));
		}
		for (const { file, note } of this.index.all("day")) await count(file, () => this.days.refreshBlock(note.date));
		for (const { file, note } of this.index.all("plan")) await count(file, () => this.plans.refreshBlock(note.week));
		const today = toIsoDate(new Date());
		for (const file of this.app.vault.getMarkdownFiles()) {
			const month = this.summaries.monthOf(file);
			const year = this.summaries.yearOf(file);
			const week = this.summaries.weekOf(file);
			if (month) await count(file, () => this.summaries.generate(month));
			else if (week) {
				const view = this.plans.view(week, today);
				await count(file, () => this.summaries.generateWeek(week, view.summary, view.outlook.average));
			} else if (year !== null) await count(file, () => this.summaries.generateYear(year));
		}
		return changed;
	}

	/** Odkazy na přejmenované poznámky ve frontmatteru ostatních poznámek (cviky, šablony, programy). */
	private async relinkRenamed(maps: RenameMaps): Promise<void> {
		if (Object.values(maps).every((map) => map.size === 0)) return;
		for (const type of ["workout", "template", "program", "goal", "test", "norm", "plan"] as const) {
			for (const { file } of this.index.all(type)) {
				const cached = this.app.metadataCache.getFileCache(file)?.frontmatter;
				if (!cached || !relinkFrontmatter(cached, maps).changed) continue;
				await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
					const { value, changed } = relinkFrontmatter(fm, maps);
					if (!changed) return;
					for (const key of Object.keys(fm)) delete fm[key];
					Object.assign(fm, value);
				});
			}
		}
	}

	openSettings(): void {
		const setting = (this.app as unknown as { setting?: SettingsApi }).setting;
		try {
			if (!setting) throw new Error(t("Settings API isn't available"));
			setting.open();
			setting.openTabById(this.manifest.id);
		} catch {
			new Notice(t("You'll find the settings under Settings → Better Form."));
		}
	}

	/** Obnoví souhrn v aktivní denní poznámce, jinak v dnešní. */
	private async refreshDayBlock(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const date = (active && this.days.dateOfDayFile(active)) ?? toIsoDate(new Date());
		try {
			const done = await this.days.refreshBlock(date);
			new Notice(done ? t("Summary in the daily note refreshed.") : t("There's no daily note for this day yet."));
		} catch (err) {
			this.fail(t("Can't refresh the summary"), err);
		}
	}

	/** Vytvoří chybějící složky podle nastavení. */
	async createFolders(notify: boolean): Promise<void> {
		try {
			const created = await ensureFolders(this.writer, this.settings.folders);
			if (notify) {
				new Notice(created > 0 ? t("Folders created: {created}.", { created }) : t("All folders already exist."));
			}
		} catch (err) {
			this.fail(t("Couldn't create the folders"), err);
		}
	}

	/** Doplní chybějící cviky, předpřipravené programy a šablony tréninků; nic nepřepisuje. */
	async seedLibrary(notify: boolean): Promise<void> {
		try {
			const sameName = (a: string, b: string) => a.toLocaleLowerCase("cs") === b.toLocaleLowerCase("cs");
			const result = await seedLibrary(this.writer, this.settings.folders, {
				hasExercise: (name) => this.index.findExercise(name) !== undefined,
				hasProgram: (name) => this.index.all("program").some((e) => sameName(e.note.name, name)),
				hasTemplate: (name) => this.index.all("template").some((e) => sameName(e.note.name, name)),
			});
			if (notify) {
				new Notice(
					result.exercises + result.programs + result.templates > 0
						? t("Added – exercises: {exercises}, programs: {programs}, templates: {templates}.", { exercises: result.exercises, programs: result.programs, templates: result.templates })
						: t("The library is complete, nothing was missing."),
				);
			}
		} catch (err) {
			this.fail(t("Couldn't fill the library"), err);
		}
	}

	private fail(message: string, err: unknown): void {
		console.error(`Better Form: ${message}`, err);
		new Notice(`${message}: ${err instanceof Error ? err.message : String(err)}`);
	}

	private async firstRun(): Promise<void> {
		await this.createFolders(false);
		await this.seedLibrary(false);
		this.settings.initialized = true;
		this.settings.librarySeeded = true;
		await this.saveSettings();
		new Notice(t("Better Form: folder “{root}” is ready with a library of exercises, programs and templates.", { root: this.settings.folders.root }));
		this.openOnboarding(true);
	}

	/** Vault, kde plugin běžel ještě před zavedením knihovny: naplnit jednou. */
	private async seedOnce(): Promise<void> {
		await this.seedLibrary(true);
		this.settings.librarySeeded = true;
		await this.saveSettings();
	}

	private async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_BETTER_FORM)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getLeftLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: VIEW_TYPE_BETTER_FORM, active: true });
		}
		await workspace.revealLeaf(leaf);
	}
}
