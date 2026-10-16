import { debounce, Notice, Plugin, type TFile, type WorkspaceLeaf } from "obsidian";
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
import { languageDefaults, mergeSettings, type BetterFormSettings, type RmrFormulaSetting } from "./settings/settings";
import { BetterFormSettingTab } from "./settings/SettingsTab";
import { BetterFormView, VIEW_TYPE_BETTER_FORM } from "./ui/BetterFormView";
import { initialLanguage, type Language, setLanguage, t } from "./i18n";
import { CheckInModal } from "./ui/modals/CheckInModal";
import { missingTexts } from "./seed/lookup";
import { SEED_PROGRAMS, seedPrograms } from "./seed/programs";
import { programName } from "./seed/localize";
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
				new Notice(t("Nové maximum zapsáno: {exercise} – {reps} opak.", { exercise: max.exercise, reps: max.reps }));
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
			name: t("Otevřít přehled"),
			callback: () => {
				void this.activateView();
			},
		});
		this.addCommand({
			id: "check-in",
			name: t("Ranní check-in"),
			callback: () => this.openCheckIn(),
		});
		this.addCommand({
			id: "log-workout",
			name: t("Zapsat trénink"),
			callback: () => this.openWorkout({}),
		});
		this.addCommand({
			id: "week-plan",
			name: t("Plán týdne"),
			callback: () => {
				void this.activateView().then(() => this.showTab("plan"));
			},
		});
		this.addCommand({
			id: "plan-workout",
			name: t("Naplánovat trénink"),
			callback: () => this.openPlanItem({ date: toIsoDate(new Date()) }),
		});
		this.addCommand({
			id: "edit-workout",
			name: t("Upravit otevřený trénink"),
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const isWorkout = !!file && this.index.all("workout").some((e) => e.file === file);
				if (!checking && file && isWorkout) this.openWorkout({ file });
				return isWorkout;
			},
		});
		this.addCommand({
			id: "exercise-library",
			name: t("Knihovna cviků"),
			callback: () => this.openLibrary({}),
		});
		this.addCommand({
			id: "fill-exercise-texts",
			name: t("Doplnit popisy cviků z knihovny"),
			callback: () => void this.fillExerciseTexts(),
		});
		this.addCommand({
			id: "refresh-builtin-programs",
			name: t("Obnovit předpřipravené programy"),
			callback: () => void this.refreshBuiltinPrograms(),
		});
		this.addCommand({
			id: "test-max",
			name: t("Test maxima"),
			callback: () => this.openTest({}),
		});
		this.addCommand({
			id: "import-program",
			name: t("Importovat program"),
			callback: () => this.openProgramImport(),
		});
		this.addCommand({
			id: "sync-strava",
			name: t("Synchronizovat Stravu"),
			callback: () => void this.syncStrava(),
		});
		this.addCommand({
			id: "import-run-file",
			name: t("Importovat běh ze souboru (GPX, TCX, FIT)"),
			callback: () => this.pickRunFiles(),
		});
		this.addCommand({
			id: "import-history",
			name: t("Importovat historii ze Strong nebo Hevy (CSV)"),
			callback: () => this.pickHistoryFile("kg"),
		});
		this.addCommand({
			id: "import-daily",
			name: t("Importovat denní data z CSV (kroky, spánek, HRV, váha)"),
			callback: () => this.pickDailyFile(),
		});
		this.addCommand({
			id: "monthly-summary",
			name: t("Vytvořit nebo obnovit měsíční souhrn"),
			callback: () => void this.monthlySummary(),
		});
		this.addCommand({
			id: "weekly-summary",
			name: t("Vytvořit nebo obnovit týdenní souhrn"),
			callback: () => void this.weeklySummary(),
		});
		this.addCommand({
			id: "yearly-summary",
			name: t("Vytvořit nebo obnovit roční souhrn"),
			callback: () => void this.yearlySummary(),
		});
		this.addCommand({
			id: "fill-skill-ladders",
			name: t("Doplnit žebříčky dovedností do knihovny"),
			callback: () => void this.fillSkillLadders(),
		});
		this.addCommand({
			id: "open-today",
			name: t("Otevřít dnešní denní poznámku"),
			callback: () => {
				void this.days.openDayNote(toIsoDate(new Date())).catch((err) => this.fail(t("Denní poznámku nejde otevřít"), err));
			},
		});
		this.addCommand({
			id: "refresh-day-block",
			name: t("Obnovit souhrn v denní poznámce"),
			callback: () => void this.refreshDayBlock(),
		});
		this.addCommand({
			id: "onboarding",
			name: t("Průvodce nastavením"),
			callback: () => this.openOnboarding(),
		});
		this.addCommand({
			id: "export-csv",
			name: t("Exportovat tréninky a denní data do CSV"),
			callback: () => void this.exportCsv(),
		});
		this.addCommand({
			id: "backup",
			name: t("Zálohovat složku do ZIP"),
			callback: () => void this.backup(),
		});
		this.addCommand({
			id: "create-folders",
			name: t("Vytvořit chybějící složky"),
			callback: () => {
				void this.createFolders(true);
			},
		});
		this.addCommand({
			id: "seed-library",
			name: t("Doplnit knihovnu cviků, programy a šablony"),
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
			this.settings.language = initialLanguage(window.localStorage.getItem("language"));
		}
		// Nový vault: složky a cviky v jeho jazyce.
		if (!stored) Object.assign(this.settings, languageDefaults(this.settings.language));
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
			new Notice(t("Strava není připojená – připoj ji v nastavení Better Form."));
			return;
		}
		this.stravaBusy.set(true);
		try {
			new Notice(describeSync(await this.stravaSync.sync()), 8000);
		} catch (err) {
			// Jen text chyby – nikdy celý objekt (mohl by nést token).
			new Notice(`Strava: ${err instanceof Error ? err.message : "synchronizace se nepodařila."}`, 8000);
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
		if (!(await confirmAction(this.app, prompt.title, prompt.message, t("Smazat")))) return false;
		try {
			// trashFile respektuje nastavení koše; ve starším Obsidianu systémový koš.
			if (typeof this.app.fileManager.trashFile === "function") await this.app.fileManager.trashFile(file);
			else await this.app.vault.trash(file, true);
		} catch (err) {
			this.fail(t("Smazání se nepodařilo"), err);
			return false;
		}
		this.indexVersion.update((n) => n + 1);
		new Notice(t("Smazáno: „{name}“ je v koši.", { name }));
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
				console.error(t("Better Form: souhrn dne se po smazání tréninku nepodařilo obnovit"), err);
			}
		}
		return true;
	}

	/** Export tréninků, sérií a denních dat do CSV (SPEC 5.12). */
	async exportCsv(): Promise<void> {
		try {
			const result = await this.exporter.exportCsv();
			new Notice(t("Export hotový: {workouts} tréninků a {days} dnů ve složce „{folder}“.", { workouts: result.workouts, days: result.days, folder: result.folder }), 8000);
		} catch (err) {
			this.fail(t("Export se nepodařil"), err);
		}
	}

	/** Záloha kořenové složky do ZIP (SPEC 5.12). */
	async backup(): Promise<void> {
		try {
			const result = await this.exporter.backup();
			new Notice(t("Záloha hotová: {files} souborů, {v} kB – „{path}“.", { files: result.files, v: Math.max(1, Math.round(result.bytes / 1024)), path: result.path }), 8000);
		} catch (err) {
			this.fail(t("Zálohu se nepodařilo vytvořit"), err);
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
		if (fresh.length > MAX_RECORD_LINES) lines.push(t("… a další {MAX_RECORD_LINES}", { MAX_RECORD_LINES: fresh.length - MAX_RECORD_LINES }));
		new Notice(`${fresh.length === 1 ? "Nový osobní rekord" : "Nové osobní rekordy"}\n${lines.join("\n")}`, 12000);
	}

	/** Souhrn otevřené poznámky se souhrnem, jinak za uplynulý měsíc; otevře ho. */
	async monthlySummary(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const month = (active && this.summaries.monthOf(active)) ?? previousMonth(toIsoDate(new Date()).slice(0, 7));
		try {
			const file = await this.summaries.generate(month);
			await this.app.workspace.getLeaf(false).openFile(file);
		} catch (err) {
			this.fail(t("Souhrn se nepodařilo vytvořit"), err);
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
			this.fail(t("Roční souhrn se nepodařilo vytvořit"), err);
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
			this.fail(t("Týdenní souhrn se nepodařilo vytvořit"), err);
		}
	}

	private async autoSummary(): Promise<void> {
		if (!this.index.isReady) return;
		try {
			const file = await this.summaries.ensurePrevious(toIsoDate(new Date()));
			if (file) new Notice(t("Better Form: souhrn za uplynulý měsíc je v poznámce „{basename}“.", { basename: file.basename }));
		} catch (err) {
			console.error(t("Better Form: měsíční souhrn se nepodařilo vytvořit"), err);
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
					? t("Žebříčky doplněny: {exercises} nových cviků, {updated} cviků zařazeno.", { exercises: seeded.exercises, updated })
					: t("Žebříčky už v knihovně jsou."),
			);
			this.indexVersion.update((n) => n + 1);
		} catch (err) {
			this.fail(t("Žebříčky se nepodařilo doplnit"), err);
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
		new Notice(next === 0 ? t("Korekce výdeje zrušena.") : t("Doporučený příjem posunutý o {v}{v2} kcal denně.", { v: next > 0 ? "+" : "−", v2: Math.abs(next) }));
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
			new Notice(t("Položka už v plánu není."));
			return;
		}
		try {
			await this.plans.move(item, move.to);
			new Notice(t("Přesunuto na {v}: {v2}.", { v: formatShortDate(move.to), v2: planItemTitle(item) }));
		} catch (err) {
			this.fail(t("Plán se nepodařilo upravit"), err);
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
		const input = document.createElement("input");
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
			new Notice(t("Program ze souboru se nepodařilo vytvořit: {v}", { v: err instanceof Error ? err.message : String(err) }), 10000);
		}
	}

	/** Výběr souborů GPX / TCX / FIT s běhy (ze Stravy, MapMyRun, hodinek) a jejich import. */
	pickRunFiles(): void {
		const input = document.createElement("input");
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
				counts.failed.push({ name: file.name, reason: err instanceof Error ? err.message : t("soubor se nepodařilo načíst.") });
			}
		}
		this.indexVersion.update((n) => n + 1);
		new Notice(describeRunImport(counts), 10000);
		return counts;
	}

	/** Výběr CSV exportu ze Strong nebo Hevy. `unit` = jednotka váhy v exportu Strong (Hevy ji má v souboru). */
	pickHistoryFile(unit: WeightUnit): void {
		const input = document.createElement("input");
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
				t("Založí se tréninků: {fresh_length}{v}. Ke každému dni vznikne i denní poznámka.", { fresh_length: fresh.length, v: duplicates > 0 ? t("; už v deníku: {duplicates}", { duplicates }) : "" }),
				parsed.format === "strong" ? t("Váhy beru jako {v} – jednotku export Strong neobsahuje.", { v: unit === "kg" ? "kilogramy" : t("libry (převedu na kg)") }) : "",
				parsed.skippedRows > 0 ? t("Řádků přeskočeno: {skippedRows} (běh a jiné kardio, prázdné série).", { skippedRows: parsed.skippedRows }) : "",
				unknownExercises.length > 0
					? t("Cviky, které knihovna nezná ({unknownExercises_length}), zůstanou pod původním názvem: {v}{v2}.", { unknownExercises_length: unknownExercises.length, v: unknownExercises.slice(0, 8).join(", "), v2: unknownExercises.length > 8 ? "…" : "" })
					: "",
				t("RPE celého tréninku tyto aplikace nemají – do zátěže se importované tréninky započítají, až ho doplníš."),
			].filter((line) => line !== "");
			if (!(await confirmAction(this.app, t("Importovat historii tréninků?"), lines.join("\n\n"), t("Importovat")))) return;
			const progress = new Notice(t("Importuji… {done} z {total}", { done: 0, total: fresh.length }), 0);
			try {
				await this.historyImport.save(fresh, (done) => {
					if (done % 10 === 0 || done === fresh.length) progress.setMessage(t("Importuji… {done} z {total}", { done, total: fresh.length }));
				});
			} finally {
				progress.hide();
			}
			this.indexVersion.update((n) => n + 1);
			new Notice(t("Import hotový: tréninků {fresh_length}.", { fresh_length: fresh.length }), 8000);
		} catch (err) {
			this.fail(t("Import historie se nepodařil"), err);
		}
	}

	/** Výběr CSV s denními hodnotami z hodinek nebo aplikace. */
	pickDailyFile(): void {
		const input = document.createElement("input");
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
			const found = t("V souboru: dnů {rows_length}{span}; veličiny: {v}.", { rows_length: parsed.rows.length, span, v: parsed.fields.map((f) => DAILY_FIELD_LABELS[f]).join(", ") });
			if (plan.length === 0) {
				new Notice(t("{found} Nic k doplnění – všechno už v deníku je.", { found }), 10000);
				return;
			}
			const perField = DAILY_FIELDS.map((f) => ({ f, n: plan.filter((p) => p.missing[f] !== undefined).length })).filter((x) => x.n > 0);
			const newNotes = plan.filter((p) => !this.index.day(p.row.date)).length;
			const lines = [
				found,
				t("Doplní se do {plan_length} dnů: {v}. Hodnoty, které už máš zapsané, zůstanou.", { plan_length: plan.length, v: perField.map((x) => `${DAILY_FIELD_LABELS[x.f]} ${x.n}×`).join(", ") }),
				newNotes > 0 ? t("Založí se nových denních poznámek: {newNotes}.", { newNotes }) : "",
				parsed.fields.includes("duration_min") ? t("Délku spánku zapíšu ke dni, který je v souboru – má to být den probuzení.") : "",
				parsed.skippedRows > 0 ? t("Řádků bez platného data přeskočeno: {skippedRows}.", { skippedRows: parsed.skippedRows }) : "",
			].filter((line) => line !== "");
			if (!(await confirmAction(this.app, t("Importovat denní data?"), lines.join("\n\n"), t("Importovat")))) return;
			const progress = new Notice(t("Importuji… {done} z {total}", { done: 0, total: plan.length }), 0);
			let result = { days: 0, values: 0 };
			try {
				result = await this.days.fillMissing(
					plan.map((p) => p.row),
					(done) => {
						if (done % 10 === 0 || done === plan.length) progress.setMessage(t("Importuji… {done} z {total}", { done, total: plan.length }));
					},
				);
			} finally {
				progress.hide();
			}
			this.indexVersion.update((n) => n + 1);
			new Notice(t("Import hotový: doplněno hodnot {values} do {days} dnů.", { values: result.values, days: result.days }), 8000);
		} catch (err) {
			this.fail(t("Import denních dat se nepodařil"), err);
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
			new Notice(updated > 0 ? t("Popisy doplněny u {updated} cviků.", { updated }) : t("Všechny cviky už popisy mají."));
		} catch (err) {
			this.fail(t("Popisy se nepodařilo doplnit"), err);
		}
	}

	/**
	 * Přepíše předpřipravené programy (builtin: true) aktuální verzí z pluginu.
	 * Vlastní programy a kopie se nemění; aktivace zůstane. Vyžaduje potvrzení.
	 */
	async refreshBuiltinPrograms(): Promise<void> {
		const local = seedPrograms();
		const pairs = SEED_PROGRAMS.flatMap((cs, i) => {
			const seed = local[i]!;
			const names = [cs.note.name, programName(cs.note.name, "en")];
			const entry = this.programs.programs().find((p) => p.note.builtin && names.includes(p.note.name));
			return entry && entry.schemaStatus !== "newer" ? [{ seed, entry }] : [];
		});
		if (pairs.length === 0) {
			new Notice(t("Žádné předpřipravené programy k obnovení – použij „Doplnit knihovnu“."));
			return;
		}
		const ok = await confirmAction(
			this.app,
			t("Obnovit předpřipravené programy?"),
			t("Popis a nastavení {pairs_length} předpřipravených programů se přepíše aktuální verzí z pluginu. Tvoje úpravy v těchto poznámkách se ztratí; vlastní programy, kopie a aktivace zůstanou.", { pairs_length: pairs.length }),
			t("Obnovit"),
		);
		if (!ok) return;
		try {
			for (const { seed, entry } of pairs) await this.programs.refreshBuiltin(entry, seed.note, seed.description);
			new Notice(t("Obnoveno programů: {pairs_length}.", { pairs_length: pairs.length }));
		} catch (err) {
			this.fail(t("Programy se nepodařilo obnovit"), err);
		}
	}

	openSettings(): void {
		const setting = (this.app as unknown as { setting?: SettingsApi }).setting;
		try {
			if (!setting) throw new Error(t("API nastavení není k dispozici"));
			setting.open();
			setting.openTabById(this.manifest.id);
		} catch {
			new Notice(t("Nastavení najdeš v Nastavení → Better Form."));
		}
	}

	/** Obnoví souhrn v aktivní denní poznámce, jinak v dnešní. */
	private async refreshDayBlock(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const date = (active && this.days.dateOfDayFile(active)) ?? toIsoDate(new Date());
		try {
			const done = await this.days.refreshBlock(date);
			new Notice(done ? t("Souhrn v denní poznámce obnoven.") : t("Pro tento den zatím denní poznámka není."));
		} catch (err) {
			this.fail(t("Souhrn nejde obnovit"), err);
		}
	}

	/** Vytvoří chybějící složky podle nastavení. */
	async createFolders(notify: boolean): Promise<void> {
		try {
			const created = await ensureFolders(this.writer, this.settings.folders);
			if (notify) {
				new Notice(created > 0 ? t("Vytvořeno složek: {created}.", { created }) : t("Všechny složky už existují."));
			}
		} catch (err) {
			this.fail(t("Složky se nepodařilo vytvořit"), err);
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
						? t("Doplněno: {exercises} cviků, {programs} programů, {templates} šablon.", { exercises: result.exercises, programs: result.programs, templates: result.templates })
						: t("Knihovna je kompletní, nic nechybělo."),
				);
			}
		} catch (err) {
			this.fail(t("Knihovnu se nepodařilo doplnit"), err);
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
		new Notice(t("Better Form: připravena složka „{root}“ s knihovnou cviků, programů a šablon.", { root: this.settings.folders.root }));
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
