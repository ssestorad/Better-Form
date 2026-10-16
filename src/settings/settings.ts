// Nastavení pluginu (SPEC kap. 12). Nic osobního napevno – profil je ve výchozím stavu prázdný.
// Bez závislosti na Obsidianu.

import { isLanguage, type Language } from "../i18n";
import { SPORTS, type MuscleId, type Sport } from "../model/constants";
import { builtinName, exerciseId } from "../seed/localize";

export type SettingsSex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "active";
export type BodyGoal = "lose" | "maintain" | "gain";
export type AppMode = "full" | "basic";
export type Diet = "omnivore" | "vegetarian" | "vegan";

export interface ProfileSettings {
	name: string;
	sex: SettingsSex | null;
	birthYear: number | null;
	heightCm: number | null;
	/** Používá se, dokud uživatel nezapíše hmotnost v check-inu. */
	weightKg: number | null;
	bodyFatPct: number | null;
	/** Změřená maximální tepová frekvence; prázdné = odhad (Tanaka). */
	hrMax: number | null;
	activity: ActivityLevel;
	goal: BodyGoal;
}

export const RMR_FORMULAS = ["ten_haaf", "mifflin", "ten_haaf_ffm", "cunningham"] as const;
export type RmrFormulaSetting = (typeof RMR_FORMULAS)[number];

/** Výživa (SPEC kap. 11) – výchozí hodnoty podle SPEC. */
export interface NutritionSettings {
	/** Rovnice klidového výdeje; rovnice z beztukové hmoty potřebují % tuku. */
	rmrFormula: RmrFormulaSetting;
	/** Koeficient běžné aktivity mimo trénink (11.3) – praxe. */
	activityFactors: Record<ActivityLevel, number>;
	/** Tempo hubnutí v % hmotnosti za týden (Helms 2014). */
	lossRatePctMin: number;
	lossRatePctMax: number;
	/** Přebytek při nabírání v % výdeje – praxe. */
	gainSurplusPctMin: number;
	gainSurplusPctMax: number;
	/** Výchozí bílkoviny v g/kg (rozsah 1,6–2,2). */
	proteinGPerKg: number;
	/** Osobní korekce odhadu výdeje podle vývoje váhy (kcal/den, kladná = výdej je vyšší) – 11.6. */
	correctionKcal: number;
	/** Kdy byla korekce naposledy upravena (YYYY-MM-DD); prázdné = nikdy. */
	correctionDate: string;
}

/** Podsložky jsou relativní ke kořenové složce. */
export interface FolderSettings {
	root: string;
	days: string;
	workouts: string;
	exercises: string;
	templates: string;
	programs: string;
	supplements: string;
	goals: string;
	pains: string;
	gear: string;
	tests: string;
	summaries: string;
	/** Exporty do CSV. */
	exports: string;
	/** Plány týdne. */
	plans: string;
}
export type SubfolderKey = Exclude<keyof FolderSettings, "root">;

/** Prahy a okna výpočtů (SPEC kap. 8–11); výchozí hodnoty podle SPEC. */
export interface ThresholdSettings {
	ctlDays: number;
	atlDays: number;
	loadModelMinDays: number;
	acwrAcuteDays: number;
	acwrChronicDays: number;
	acwrWarn: number;
	monotonyWarn: number;
	weeklySetsLow: number;
	weeklySetsTargetMin: number;
	weeklySetsTargetMax: number;
	effectiveRirMax: number;
	effectiveMinPct1rm: number;
	holdEffectivePctOfMax: number;
	blockEffectiveMinRpe: number;
	recoveryMinSets: number;
	recoveryHours1: number;
	recoveryHours2: number;
	recoveryHours3: number;
	progressionRirMin: number;
	incrementUpperKg: number;
	incrementLowerKg: number;
	hrvWindowDays: number;
	hrvBaselineDays: number;
	hrvMinSamples: number;
	hrvSdFactor: number;
	sleepTargetHours: number;
	intenseShareWarnPct: number;
	shoeLimitKm: number;
	painProfessionalLevel: number;
	painProfessionalDays: number;
	eaMinKcalPerKgFfm: number;
	skillSets: number;
	skillReps: number;
	skillHoldSec: number;
	deloadTsbPct: number;
	deloadTsbDays: number;
	deloadHrvLowDays: number;
	stagnationWeeks: number;
}

/**
 * Propojení se Stravou (SPEC 6.1). Tokeny a Client Secret jsou jen v data.json
 * (necommitovat, nelogovat). Prázdný řetězec / 0 = nevyplněno.
 */
export interface StravaSettings {
	clientId: string;
	clientSecret: string;
	accessToken: string;
	refreshToken: string;
	/** Konec platnosti access tokenu, unixový čas v sekundách. */
	expiresAt: number;
	athleteName: string;
	/** Čas poslední úspěšné synchronizace, unixový čas v sekundách. */
	lastSyncAt: number;
	/** Kolik dnů zpět stáhnout při první synchronizaci. */
	initialDays: number;
	/** Typy aktivit Stravy, které se importují jako běh. */
	activityTypes: string[];
}

export interface BetterFormSettings {
	settingsVersion: number;
	/** Složky už byly při prvním spuštění vytvořeny. */
	initialized: boolean;
	/** Knihovna už byla jednou automaticky naplněna (dál jen na příkaz). */
	librarySeeded: boolean;
	/** Úvodní průvodce byl dokončen (uložen). */
	onboarded: boolean;
	/** Jazyk rozhraní a nově zakládaných poznámek. */
	language: Language;
	profile: ProfileSettings;
	mode: AppMode;
	/** Názvy cviků (poznámek v knihovně) pro karty režimu Základ – silové i kardio (běh). */
	basicExercises: string[];
	/** Šetrnější cvik místo sedů-lehů v režimu Základ; prázdné = sedy-lehy. */
	situpAlternative: string;
	folders: FolderSettings;
	sports: Record<Sport, boolean>;
	/** Zobrazovat série dnů a týdnů a odznaky (9.2); někomu pomáhají, někoho stresují. */
	showStreaks: boolean;
	kettlebellsKg: number[];
	/** Hmotnost osy velké činky (kg) – pro kalkulačku kotoučů a rozcvičovací série. */
	barbellKg: number;
	/** Kotouče, které jsou k dispozici (kg). */
	platesKg: number[];
	weeklyWorkoutGoal: number;
	focusMuscles: MuscleId[];
	/** Oblasti přínosu, které uživatele u suplementů zajímají (src/seed/supplementModel.ts); prázdné = všechny. */
	supplementGoals: string[];
	/** Způsob stravování – u veganů a vegetariánů připomínka vitaminu B12. */
	diet: Diet;
	counterSteps: number[];
	units: "metric";
	thresholds: ThresholdSettings;
	nutrition: NutritionSettings;
	/** Složka záloh (zip) – relativně k vaultu, mimo kořenovou složku, aby se zálohy nezálohovaly. */
	backupFolder: string;
	strava: StravaSettings;
}

/** Verze nastavení; při změně výchozích hodnot přidat krok do migrateSettings. */
export const SETTINGS_VERSION = 2;

export const DEFAULT_THRESHOLDS: ThresholdSettings = {
	ctlDays: 42,
	atlDays: 7,
	loadModelMinDays: 28,
	acwrAcuteDays: 7,
	acwrChronicDays: 28,
	acwrWarn: 1.5,
	monotonyWarn: 2.0,
	weeklySetsLow: 6,
	weeklySetsTargetMin: 10,
	weeklySetsTargetMax: 20,
	effectiveRirMax: 4,
	effectiveMinPct1rm: 60,
	holdEffectivePctOfMax: 70,
	blockEffectiveMinRpe: 7,
	recoveryMinSets: 3,
	recoveryHours1: 24,
	recoveryHours2: 48,
	recoveryHours3: 72,
	progressionRirMin: 2,
	incrementUpperKg: 2.5,
	incrementLowerKg: 5,
	hrvWindowDays: 7,
	hrvBaselineDays: 60,
	hrvMinSamples: 14,
	hrvSdFactor: 0.5,
	sleepTargetHours: 7,
	intenseShareWarnPct: 30,
	shoeLimitKm: 700,
	painProfessionalLevel: 4,
	painProfessionalDays: 7,
	eaMinKcalPerKgFfm: 30,
	skillSets: 3,
	skillReps: 8,
	skillHoldSec: 10,
	deloadTsbPct: 20,
	deloadTsbDays: 7,
	deloadHrvLowDays: 5,
	stagnationWeeks: 3,
};

/**
 * Složky, které jako výchozí měly verze do 0.2 – použijí se jen u vaultu, jehož uložené
 * nastavení složky neobsahuje (jinak by se data po aktualizaci hledala jinde).
 */
export const LEGACY_FOLDERS: FolderSettings = {
	root: "Forma",
	days: "Deník", // i18n-ignore: název složky ve starších vaultech (data)
	workouts: "Tréninky", // i18n-ignore: název složky ve starších vaultech (data)
	exercises: "Knihovna/Cviky",
	templates: "Knihovna/Šablony tréninků", // i18n-ignore: název složky ve starších vaultech (data)
	programs: "Knihovna/Programy",
	supplements: "Knihovna/Suplementy",
	goals: "Cíle", // i18n-ignore: název složky ve starších vaultech (data)
	pains: "Zdraví/Bolesti", // i18n-ignore: název složky ve starších vaultech (data)
	gear: "Vybavení", // i18n-ignore: název složky ve starších vaultech (data)
	tests: "Testy",
	summaries: "Souhrny",
	exports: "Export",
	plans: "Plán", // i18n-ignore: název složky ve starších vaultech (data)
};

/** Výchozí složky nového vaultu – vždy anglicky, bez ohledu na jazyk rozhraní. */
export const DEFAULT_FOLDERS: FolderSettings = {
	root: "Better Form",
	days: "Journal",
	workouts: "Workouts",
	exercises: "Library/Exercises",
	templates: "Library/Workout templates",
	programs: "Library/Programs",
	supplements: "Library/Supplements",
	goals: "Goals",
	pains: "Health/Pain",
	gear: "Equipment",
	tests: "Tests",
	summaries: "Summaries",
	exports: "Export",
	plans: "Plan",
};

export const DEFAULT_NUTRITION: NutritionSettings = {
	rmrFormula: "ten_haaf",
	activityFactors: { sedentary: 1.2, light: 1.4, active: 1.6 },
	lossRatePctMin: 0.5,
	lossRatePctMax: 1,
	gainSurplusPctMin: 5,
	gainSurplusPctMax: 10,
	proteinGPerKg: 2,
	correctionKcal: 0,
	correctionDate: "",
};

export const DEFAULT_SETTINGS: BetterFormSettings = {
	settingsVersion: SETTINGS_VERSION,
	initialized: false,
	librarySeeded: false,
	onboarded: false,
	language: "en",
	profile: {
		name: "",
		sex: null,
		birthYear: null,
		heightCm: null,
		weightKg: null,
		bodyFatPct: null,
		hrMax: null,
		activity: "light",
		goal: "maintain",
	},
	mode: "full",
	basicExercises: ["Push-up", "Pull-up", "Bodyweight squat", "Sit-up", "Running"],
	situpAlternative: "",
	folders: DEFAULT_FOLDERS,
	sports: Object.fromEntries(SPORTS.map((s) => [s, true])) as Record<Sport, boolean>,
	showStreaks: true,
	kettlebellsKg: [],
	barbellKg: 20,
	platesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
	weeklyWorkoutGoal: 3,
	focusMuscles: [],
	supplementGoals: [],
	diet: "omnivore",
	counterSteps: [5, 10, 15],
	units: "metric",
	thresholds: DEFAULT_THRESHOLDS,
	nutrition: DEFAULT_NUTRITION,
	backupFolder: "Better Form backups",
	strava: {
		clientId: "",
		clientSecret: "",
		accessToken: "",
		refreshToken: "",
		expiresAt: 0,
		athleteName: "",
		lastSyncAt: 0,
		initialDays: 90,
		activityTypes: ["Run", "TrailRun", "VirtualRun"],
	},
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeValue(def: unknown, loaded: unknown): unknown {
	if (isPlainObject(def)) {
		const source = isPlainObject(loaded) ? loaded : {};
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(def)) out[key] = mergeValue(def[key], source[key]);
		return out;
	}
	if (loaded === undefined) return structuredClone(def);
	if (Array.isArray(def)) return Array.isArray(loaded) ? structuredClone(loaded) : structuredClone(def);
	// Volitelné hodnoty (výchozí null) přijmou null, číslo nebo text.
	if (def === null) {
		return loaded === null || typeof loaded === "number" || typeof loaded === "string" ? loaded : null;
	}
	return typeof loaded === typeof def ? loaded : def;
}

/**
 * Sloučí uložená data s výchozím nastavením: chybějící nebo špatně typované
 * hodnoty doplní výchozími, neznámé klíče zahodí. Výsledek je nová kopie.
 */
export function mergeSettings(loaded: unknown): BetterFormSettings {
	const settings = mergeValue(DEFAULT_SETTINGS, loaded) as BetterFormSettings;
	return migrateSettings(settings);
}

/** Úpravy nastavení uloženého starší verzí pluginu. */
function migrateSettings(settings: BetterFormSettings): BetterFormSettings {
	// 1 → 2: do režimu Základ patří i běh (název v jazyce vaultu).
	if (settings.settingsVersion < 2 && !settings.basicExercises.some((e) => exerciseId(e) === "running")) {
		settings.basicExercises = [...settings.basicExercises, builtinName("exercise", "running", settings.language)];
	}
	if (!(RMR_FORMULAS as readonly string[]).includes(settings.nutrition.rmrFormula)) settings.nutrition.rmrFormula = DEFAULT_NUTRITION.rmrFormula;
	if (!isLanguage(settings.language)) settings.language = DEFAULT_SETTINGS.language;
	settings.settingsVersion = SETTINGS_VERSION;
	return settings;
}

/**
 * "8, 12; 16 20.5" → [8, 12, 16, 20.5]. Oddělovače: čárka, středník, mezera;
 * desetinná tečka (čárka tu oddělí položky). Kladná čísla, seřazená, bez duplicit.
 */
export function parseNumberList(text: string): number[] {
	const numbers = text
		.split(/[,;\s]+/)
		.filter((part) => part !== "")
		.map(Number)
		.filter((n) => Number.isFinite(n) && n > 0);
	return [...new Set(numbers)].sort((a, b) => a - b);
}
