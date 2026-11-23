// Výživa: profil pro výpočet, doporučený příjem a osobní korekce výdeje.

import { Notice } from "obsidian";
import { effectiveGoal } from "../calc/weight";
import { ageFromBirthYear, clampCorrection, nutritionPlan as computeNutritionPlan, stepsActivity, weeklyTrainingHours, type DayLoad, type NutritionPlan, type NutritionProfile } from "../calc/nutrition";
import { assessBalance, correctionAdvice, weightPoints, weightTrend } from "../calc/weight";
import type { WorkoutNote } from "../model/types";
import { daysBetween, toIsoDate } from "../model/dates";
import { type RmrFormulaSetting } from "../settings/settings";
import { t } from "../i18n";
import type BetterFormPlugin from "../main";

/** Přepne rovnici klidového výdeje (karta Výživa nabízí tu, která se k profilu hodí). */
export async function setRmrFormula(plugin: BetterFormPlugin, formula: RmrFormulaSetting): Promise<void> {
	plugin.settings.nutrition.rmrFormula = formula;
	await plugin.saveSettings();
}

/** Údaje profilu pro výživu: hmotnost z check-inu (jinak profil), % tuku z posledního měření (jinak profil). */
export function nutritionProfile(plugin: BetterFormPlugin, date: string): NutritionProfile {
	const p = plugin.settings.profile;
	const days = plugin.index.all("day").map((e) => e.note);
	const workouts = plugin.index.all("workout").map((e) => e.note);
	const measured = days
		.filter((d) => d.date <= date && d.body.body_fat_pct !== undefined)
		.sort((a, b) => b.date.localeCompare(a.date))[0];
	return {
		sex: p.sex,
		age: ageFromBirthYear(p.birthYear, date),
		heightCm: p.heightCm,
		weightKg: plugin.bodyweightKg() ?? null,
		bodyFatPct: measured?.body.body_fat_pct ?? p.bodyFatPct,
		activity: p.activity,
		// Po konci fáze hubnutí nebo nabírání platí udržování.
		goal: effectiveGoal(p.goal, p.goalUntil, date),
		trainingHoursPerWeek: weeklyTrainingHours(workouts, date, daysBetween),
		steps: stepsActivity(days, workouts, date, daysBetween),
	};
}

/** Doporučený příjem pro den (SPEC kap. 11); null, když v profilu chybí údaje. */
export function nutritionPlanFor(plugin: BetterFormPlugin, date: string, loadOverride?: DayLoad, workouts?: WorkoutNote[], withPlan = true): NutritionPlan | null {
	return computeNutritionPlan({
		planned: withPlan ? plugin.plans.plannedWorkouts(date, toIsoDate(new Date())) : [],
		profile: nutritionProfile(plugin, date),
		settings: plugin.settings.nutrition,
		eaMin: plugin.settings.thresholds.eaMinKcalPerKgFfm,
		workouts: workouts ?? plugin.index.all("workout").map((e) => e.note).filter((w) => w.date === date),
		loadOverride,
	});
}

/** Nastaví osobní korekci odhadu výdeje (0 = zrušit) a zapamatuje si datum – viz týdenní kontrola výživy. */
export async function setNutritionCorrection(plugin: BetterFormPlugin, kcal: number): Promise<void> {
	const next = clampCorrection(kcal);
	plugin.settings.nutrition.correctionKcal = next;
	plugin.settings.nutrition.correctionDate = next === 0 ? "" : toIsoDate(new Date());
	await plugin.saveSettings();
	new Notice(next === 0 ? t("Expenditure correction removed.") : t("Recommended intake shifted by {v}{v2} kcal a day.", { v: next > 0 ? "+" : "−", v2: Math.abs(next) }));
}

/** Týdenní kontrola výživy pro doporučení: o kolik by šlo odhad výdeje posunout; null = není co řešit. */
export function nutritionCheck(plugin: BetterFormPlugin, today: string): { stepKcal: number } | null {
	const plan = nutritionPlanFor(plugin, today);
	if (!plan) return null;
	const trend = weightTrend(weightPoints(plugin.index.all("day").map((e) => e.note)), today);
	if (!trend.ready) return null;
	const n = plugin.settings.nutrition;
	const advice = correctionAdvice(assessBalance(trend, plugin.settings.profile.goal, plan.goalAdjust), n.correctionKcal, n.correctionDate, today, plan.raisedFor.length > 0);
	return advice.kind === "offer" ? { stepKcal: advice.stepKcal } : null;
}
