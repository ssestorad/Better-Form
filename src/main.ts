import { debounce, getLanguage as obsidianLanguage, Notice, Platform, Plugin, TFile, type WorkspaceLeaf } from "obsidian";
import { titleForTap } from "./ui/touchTitles";
import { moduleOn, type ModuleKey } from "./settings/modules";
import { parseQuickAction, QUICK_ACTION_PROTOCOL } from "./data/quickAction";
import { installErrorLog } from "./ui/errorLog";
import { ExportService } from "./data/ExportService";
import { trashPrompt, type TrashKind } from "./data/trash";
import { GoalService } from "./data/GoalService";
import { InsightService } from "./data/InsightService";
import { PainService } from "./data/PainService";
import { PlanService } from "./data/PlanService";
import { RunImportService } from "./data/RunImportService";
import { HistoryImportService } from "./data/HistoryImportService";
import { SummaryService } from "./data/SummaryService";
import { type TabId } from "./ui/tabs";
import type { ExerciseNote, WorkoutNote } from "./model/types";
import { writable } from "svelte/store";
import { SupplementService } from "./data/SupplementService";
import { GearService } from "./data/GearService";
import { StravaAuth } from "./strava/StravaAuth";
import { StravaSync } from "./strava/StravaSync";
import { GarminSync } from "./garmin/GarminSync";
import { registerCommands } from "./commands";
import { DayService } from "./data/DayService";
import { workoutLabel } from "./data/dayBlock";
import { planItemTitle } from "./data/planBlock";
import { formatShortDate } from "./ui/format";
import { FormaIndex } from "./data/FormaIndex";
import { NoteWriter } from "./data/NoteWriter";
import { ProgramService, type ProgramEntry } from "./data/ProgramService";
import { WorkoutService } from "./data/WorkoutService";
import { startOfWeek, toIsoDate } from "./model/dates";
import { LEGACY_FOLDERS, mergeSettings, type BetterFormSettings } from "./settings/settings";
import { BetterFormSettingTab } from "./settings/SettingsTab";
import { BetterFormView, VIEW_TYPE_BETTER_FORM } from "./ui/BetterFormView";
import { initialLanguage, type Language, setLanguage, t } from "./i18n";
import { CheckInModal } from "./ui/modals/CheckInModal";
import { confirmAction } from "./ui/modals/ConfirmModal";
import { EntryTestModal } from "./ui/modals/EntryTestModal";
import { LibraryModal, type LibraryModalOptions } from "./ui/modals/LibraryModal";
import { OnboardingModal } from "./ui/modals/OnboardingModal";
import { PlanItemModal, type PlanItemModalOptions } from "./ui/modals/PlanItemModal";
import { ProgramEditorModal, ProgramImportModal } from "./ui/modals/ProgramModals";
import { TestModal, type TestModalOptions } from "./ui/modals/TestModal";
import { WorkoutModal, type WorkoutModalOptions } from "./ui/modals/WorkoutModal";
import { autoSummary } from "./plugin/exports";
import { firstRun, seedOnce } from "./plugin/library";
import { mirrorDailyNotes, runQuickAction } from "./plugin/sync";
import { createServices } from "./plugin/services";
import "./styles.css";

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
	garminSync!: GarminSync;
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
	readonly garminBusy = writable(false);
	readonly runnaBusy = writable(false);
	/** Zvýší se při každém uložení nastavení. */
	readonly settingsVersion = writable(0);

	/** Uložení nastavení se odkládá, aby se při psaní neukládalo po každém znaku. */
	readonly requestSaveSettings = debounce(() => void this.saveSettings(), 400, true);

	override async onload(): Promise<void> {
		this.register(installErrorLog(window));
		await this.loadSettings();
		createServices(this);
		this.index.register(this);
		this.registerEvent(this.index.onUpdated(() => this.indexVersion.update((n) => n + 1)));

		this.registerView(VIEW_TYPE_BETTER_FORM, (leaf) => new BetterFormView(leaf, this));
		this.addSettingTab(new BetterFormSettingTab(this.app, this));

		this.addRibbonIcon("dumbbell", "Better Form", () => {
			void this.activateView();
		});

		registerCommands(this);
		// Metriky dne do vlastní denní poznámky uživatele (volitelné) – po každé změně dat jen pro dnešek.
		this.registerEvent(this.index.onUpdated(() => this.mirrorSoon()));
		// Rychlé akce z odkazu obsidian://better-form?action=… (zástupce na ploše telefonu, Zkratky).
		this.registerObsidianProtocolHandler(QUICK_ACTION_PROTOCOL, (params) => {
			const action = parseQuickAction(params);
			if (action) void runQuickAction(this, action);
			else new Notice(t("Better Form: unknown link action."));
		});
		// Na telefonu se bublina po najetí myší neukáže – klepnutí ji zobrazí jako hlášku.
		if (Platform.isMobile) {
			this.registerDomEvent(activeDocument, "click", (event) => {
				const text = titleForTap(event.target);
				if (text) new Notice(text, 6000);
			});
		}

		this.app.workspace.onLayoutReady(() => {
			if (!this.settings.initialized) void firstRun(this);
			else if (!this.settings.librarySeeded) void seedOnce(this);
			// Souhrn za uplynulý měsíc (SPEC 9.5) – až po načtení poznámek do indexu.
			window.setTimeout(() => void autoSummary(this), AUTO_SUMMARY_DELAY_MS);
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

	exerciseInfo(exercise: string): ExerciseNote | undefined {
		return this.index.findExercise(exercise)?.note;
	}

	/** Tělesná hmotnost pro výpočty: poslední zapsaná, jinak z profilu. */
	bodyweightKg(): number | undefined {
		return this.supplements.weightKg() ?? undefined;
	}

	/** Metriky dne do denní poznámky uživatele – nejvýš jednou za 2 s po změně dat. */
	private readonly mirrorSoon = debounce(() => void mirrorDailyNotes(this, [toIsoDate(new Date())]), 2000, true);

	/** Je modul nebo podmodul zapnutý (nastavení → Moduly)? */
	moduleOn(key: ModuleKey): boolean {
		return moduleOn(this.settings.modules, key);
	}

	/** Modul Menstruační cyklus platí jen u ženského profilu. */
	cycleOn(): boolean {
		return this.settings.profile.sex === "female" && this.moduleOn("cycle");
	}

	statsContext(): { info: (exercise: string) => ExerciseNote | undefined; bodyweightKg?: number } {
		return { info: (exercise) => this.exerciseInfo(exercise), bodyweightKg: this.bodyweightKg() };
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

	openProgramImport(): void {
		new ProgramImportModal(this).open();
	}

	/** Knihovna cviků: prohlížení, filtr podle partie, detail cviku s panáčkem. */
	openLibrary(options: LibraryModalOptions): void {
		new LibraryModal(this, options).open();
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

	fail(message: string, err: unknown): void {
		console.error(`Better Form: ${message}`, err);
		new Notice(`${message}: ${err instanceof Error ? err.message : String(err)}`);
	}

	async activateView(): Promise<void> {
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
