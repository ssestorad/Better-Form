// Úvodní průvodce: hodnoty formuláře, kontrola a zápis do nastavení.
// Bez závislosti na Obsidianu.

import { SPORTS, type Sport } from "../model/constants";
import type { ActivityLevel, AppMode, BetterFormSettings, BodyGoal, SettingsSex } from "./settings";
import { t } from "../i18n";

export interface OnboardingValues {
	/** Prázdné = nevyplněno. */
	sex: SettingsSex | "";
	/** Čísla: undefined = prázdné pole, NaN = uživatel napsal něco, co není číslo. */
	birthYear?: number;
	heightCm?: number;
	weightKg?: number;
	bodyFatPct?: number;
	goal: BodyGoal;
	activity: ActivityLevel;
	mode: AppMode;
	sports: Record<Sport, boolean>;
	weeklyWorkoutGoal?: number;
}

type NumberField = "birthYear" | "heightCm" | "weightKg" | "bodyFatPct" | "weeklyWorkoutGoal";

/** Povolené rozsahy (stejné jako v nastavení). */
export function onboardingLimits(currentYear: number): Record<NumberField, { min: number; max: number; integer: boolean }> {
	return {
		birthYear: { min: 1900, max: currentYear, integer: true },
		heightCm: { min: 100, max: 250, integer: false },
		weightKg: { min: 30, max: 250, integer: false },
		bodyFatPct: { min: 3, max: 60, integer: false },
		weeklyWorkoutGoal: { min: 1, max: 21, integer: true },
	};
}

export function onboardingFromSettings(settings: BetterFormSettings): OnboardingValues {
	const p = settings.profile;
	return {
		sex: p.sex ?? "",
		birthYear: p.birthYear ?? undefined,
		heightCm: p.heightCm ?? undefined,
		weightKg: p.weightKg ?? undefined,
		bodyFatPct: p.bodyFatPct ?? undefined,
		goal: p.goal,
		activity: p.activity,
		mode: settings.mode,
		sports: { ...settings.sports },
		weeklyWorkoutGoal: settings.weeklyWorkoutGoal,
	};
}

export type OnboardingErrors = Partial<Record<NumberField | "sports", string>>;

/** Chyby podle pole; prázdný objekt = lze uložit. Prázdná pole profilu jsou v pořádku (doplní se později). */
export function validateOnboarding(values: OnboardingValues, currentYear: number): OnboardingErrors {
	const errors: OnboardingErrors = {};
	const limits = onboardingLimits(currentYear);
	for (const field of Object.keys(limits) as NumberField[]) {
		const value = values[field];
		if (value === undefined) continue;
		const { min, max, integer } = limits[field];
		if (Number.isNaN(value)) errors[field] = t("Není číslo.");
		else if (integer && !Number.isInteger(value)) errors[field] = t("Zadej celé číslo.");
		else if (value < min || value > max) errors[field] = t("Rozsah {min}–{max}.", { min, max });
	}
	if (!SPORTS.some((s) => values.sports[s])) errors.sports = t("Nech zapnutý aspoň jeden sport.");
	return errors;
}

/** Co ještě chybí pro výpočet výživy (pro shrnutí v průvodci). */
export function onboardingMissing(values: OnboardingValues): string[] {
	const missing: string[] = [];
	if (values.sex === "") missing.push(t("pohlaví"));
	if (values.birthYear === undefined) missing.push(t("rok narození"));
	if (values.heightCm === undefined) missing.push(t("výška"));
	if (values.weightKg === undefined) missing.push("hmotnost");
	return missing;
}

/** Zapíše hodnoty průvodce do nastavení (mění předaný objekt) a označí průvodce za dokončený. */
export function applyOnboarding(settings: BetterFormSettings, values: OnboardingValues): void {
	const p = settings.profile;
	p.sex = values.sex === "" ? null : values.sex;
	p.birthYear = values.birthYear ?? null;
	p.heightCm = values.heightCm ?? null;
	p.weightKg = values.weightKg ?? null;
	p.bodyFatPct = values.bodyFatPct ?? null;
	p.goal = values.goal;
	p.activity = values.activity;
	settings.mode = values.mode;
	settings.sports = { ...values.sports };
	if (values.weeklyWorkoutGoal !== undefined) settings.weeklyWorkoutGoal = values.weeklyWorkoutGoal;
	settings.onboarded = true;
}
