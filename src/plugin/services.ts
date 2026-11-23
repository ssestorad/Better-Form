// Služby pluginu a jejich propojení. Bez registrace v Obsidianu (view, příkazy, události),
// takže je jde sestavit i mimo Obsidian – náhled a kontrola rozhraní (tools/preview).

import { Notice } from "obsidian";
import { workoutTonnage } from "../calc/overview";
import { ExportService } from "../data/ExportService";
import { nutritionLine } from "../ui/nutrition/text";
import { GoalService } from "../data/GoalService";
import { InsightService } from "../data/InsightService";
import { PainService } from "../data/PainService";
import { PlanService } from "../data/PlanService";
import { RunImportService } from "../data/RunImportService";
import { HistoryImportService } from "../data/HistoryImportService";
import { SummaryService } from "../data/SummaryService";
import { SupplementService } from "../data/SupplementService";
import { GearService } from "../data/GearService";
import { StravaAuth } from "../strava/StravaAuth";
import { StravaSync } from "../strava/StravaSync";
import { GarminSync } from "../garmin/GarminSync";
import { DayService } from "../data/DayService";
import { FormaIndex } from "../data/FormaIndex";
import { NoteWriter } from "../data/NoteWriter";
import { ProgramService } from "../data/ProgramService";
import { WorkoutService } from "../data/WorkoutService";
import { t } from "../i18n";
import { announceRecords } from "./exports";
import { nutritionCheck, nutritionPlanFor } from "./nutrition";
import { mirrorDailyNotes } from "./sync";
import type BetterFormPlugin from "../main";

/** Vytvoří služby pluginu a propojí je; index se v Obsidianu registruje až potom. */
export function createServices(plugin: BetterFormPlugin): void {
	plugin.writer = new NoteWriter(plugin.app);
	plugin.index = new FormaIndex(plugin.app);
	plugin.days = new DayService(plugin.app, plugin.index, plugin.writer, () => plugin.settings);
	plugin.workouts = new WorkoutService(plugin.app, plugin.index, plugin.writer, plugin.days, () => plugin.settings);
	plugin.programs = new ProgramService(
		plugin.app,
		plugin.index,
		plugin.writer,
		plugin.workouts,
		() => plugin.settings,
		() => plugin.indexVersion.update((n) => n + 1),
	);
	plugin.days.isCounterWorkout = (note) => plugin.programs.isCounterWorkout(note);
	plugin.strava = new StravaAuth(
		() => plugin.settings,
		() => plugin.saveSettings(),
	);
	plugin.stravaSync = new StravaSync(
		plugin.strava,
		plugin.index,
		plugin.workouts,
		() => plugin.settings,
		() => plugin.saveSettings(),
	);
	plugin.runImport = new RunImportService(plugin.index, plugin.workouts);
	plugin.garminSync = new GarminSync(plugin.index, plugin.days, plugin.runImport, () => plugin.settings, () => plugin.saveSettings());
	plugin.historyImport = new HistoryImportService(plugin.index, plugin.workouts);
	plugin.gear = new GearService(plugin.index, plugin.writer, () => plugin.settings);
	plugin.supplements = new SupplementService(plugin.index, plugin.writer, plugin.days, () => plugin.settings, () =>
		plugin.indexVersion.update((n) => n + 1),
	);
	plugin.summaries = new SummaryService(plugin.app, plugin.index, plugin.writer, () => plugin.settings, () => plugin.statsContext());
	const notify = () => plugin.indexVersion.update((n) => n + 1);
	plugin.pains = new PainService(plugin.index, plugin.writer, () => plugin.settings, notify);
	plugin.goals = new GoalService(
		plugin.index,
		plugin.writer,
		() => plugin.settings,
		() => plugin.statsContext(),
		(a, b) => plugin.workouts.isSameExercise(a, b),
		notify,
	);
	plugin.plans = new PlanService(plugin.app, plugin.index, plugin.writer, () => plugin.settings, notify);
	plugin.plans.isCounterWorkout = (note) => plugin.programs.isCounterWorkout(note);
	plugin.plans.isProgramSession = (note) => plugin.programs.isPlanSession(note);
	plugin.plans.programsOn = (date) => (plugin.moduleOn("programs.plan_days") ? plugin.programs.planDays(date) : []);
	plugin.insights = new InsightService(
		plugin.index,
		plugin.programs,
		plugin.goals,
		plugin.plans,
		() => plugin.settings,
		(exercise) => plugin.exerciseInfo(exercise),
		() => plugin.bodyweightKg(),
	);
	plugin.insights.nutritionCheck = (today) => nutritionCheck(plugin, today);
	plugin.exporter = new ExportService(plugin.app, plugin.index, plugin.writer, () => plugin.settings, (w) => workoutTonnage(w, plugin.statsContext()));
	// Doporučená výživa v denní poznámce (SPEC 4.1) – jen když jsou v profilu potřebné údaje.
	plugin.days.nutritionLine = (date, workouts) => {
		if (!plugin.moduleOn("nutrition.day_note")) return null;
		// Denní poznámka je záznam – počítá jen se zapsanými tréninky, ne s plánem.
		const plan = nutritionPlanFor(plugin, date, undefined, workouts, false);
		return plan ? nutritionLine(plan) : null;
	};
	// Po uložení tréninku: metriky dne, nové maximum ze „sérií na maximum“ a rekordy.
	plugin.workouts.onSaved = async (note, file, isNew) => {
		void mirrorDailyNotes(plugin, [note.date]);
		plugin.programs.forget(file);
		for (const max of await plugin.programs.recordMaxes(note)) {
			new Notice(t("New max logged: {exercise} – {reps} reps", { exercise: max.exercise, reps: max.reps }));
		}
		if (isNew) announceRecords(plugin, note, file);
	};
}
