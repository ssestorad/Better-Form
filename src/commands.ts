// Příkazy pluginu v paletě příkazů (Ctrl+P). Jen registrace – logika je v metodách pluginu.

import type BetterFormPlugin from "./main";
import { t } from "./i18n";
import { toIsoDate } from "./model/dates";

export function registerCommands(plugin: BetterFormPlugin): void {
	plugin.addCommand({
		id: "open-view",
		name: t("Open overview"),
		callback: () => {
			void plugin.activateView();
		},
	});
	plugin.addCommand({
		id: "check-in",
		name: t("Morning check-in"),
		callback: () => plugin.openCheckIn(),
	});
	plugin.addCommand({
		id: "log-workout",
		name: t("Log workout"),
		callback: () => plugin.openWorkout({}),
	});
	plugin.addCommand({
		id: "week-plan",
		name: t("Weekly plan"),
		callback: () => {
			void plugin.activateView().then(() => plugin.showTab("plan"));
		},
	});
	plugin.addCommand({
		id: "plan-workout",
		name: t("Plan a workout"),
		callback: () => plugin.openPlanItem({ date: toIsoDate(new Date()) }),
	});
	plugin.addCommand({
		id: "edit-workout",
		name: t("Edit open workout"),
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			const isWorkout = !!file && plugin.index.all("workout").some((e) => e.file === file);
			if (!checking && file && isWorkout) plugin.openWorkout({ file });
			return isWorkout;
		},
	});
	plugin.addCommand({
		id: "exercise-library",
		name: t("Exercise library"),
		callback: () => plugin.openLibrary({}),
	});
	plugin.addCommand({
		id: "fill-exercise-texts",
		name: t("Add exercise descriptions from the library"),
		callback: () => void plugin.fillExerciseTexts(),
	});
	plugin.addCommand({
		id: "refresh-builtin-programs",
		name: t("Restore built-in programs"),
		callback: () => void plugin.refreshBuiltinPrograms(),
	});
	plugin.addCommand({
		id: "rename-builtin-to-language",
		name: t("Translate the library and generated texts to the interface language"),
		callback: () => void plugin.renameBuiltinToLanguage(),
	});
	plugin.addCommand({
		id: "test-max",
		name: t("Max test"),
		callback: () => plugin.openTest({}),
	});
	plugin.addCommand({
		id: "import-program",
		name: t("Import program"),
		callback: () => plugin.openProgramImport(),
	});
	plugin.addCommand({
		id: "sync-strava",
		name: t("Sync Strava"),
		callback: () => void plugin.syncStrava(),
	});
	plugin.addCommand({
		id: "sync-garmin",
		name: t("Sync Garmin Connect"),
		callback: () => void plugin.syncGarmin(),
	});
	plugin.addCommand({
		id: "sync-runna",
		name: t("Sync plan from Runna"),
		callback: () => void plugin.syncRunnaPlan(),
	});
	plugin.addCommand({
		id: "import-run-file",
		name: t("Import run from file (GPX, TCX, FIT)"),
		callback: () => plugin.pickRunFiles(),
	});
	plugin.addCommand({
		id: "import-history",
		name: t("Import history from Strong or Hevy (CSV)"),
		callback: () => plugin.pickHistoryFile("kg"),
	});
	plugin.addCommand({
		id: "import-daily",
		name: t("Import daily data (steps, sleep, HRV, weight)"),
		callback: () => plugin.pickDailyFile(),
	});
	plugin.addCommand({
		id: "monthly-summary",
		name: t("Create or refresh monthly summary"),
		callback: () => void plugin.monthlySummary(),
	});
	plugin.addCommand({
		id: "weekly-summary",
		name: t("Create or refresh weekly summary"),
		callback: () => void plugin.weeklySummary(),
	});
	plugin.addCommand({
		id: "yearly-summary",
		name: t("Create or refresh yearly summary"),
		callback: () => void plugin.yearlySummary(),
	});
	plugin.addCommand({
		id: "fill-skill-ladders",
		name: t("Add skill ladders to the library"),
		callback: () => void plugin.fillSkillLadders(),
	});
	plugin.addCommand({
		id: "open-today",
		name: t("Open today's daily note"),
		callback: () => {
			void plugin.days.openDayNote(toIsoDate(new Date())).catch((err) => plugin.fail(t("Can't open the daily note"), err));
		},
	});
	plugin.addCommand({
		id: "refresh-day-block",
		name: t("Refresh summary in the daily note"),
		callback: () => void plugin.refreshDayBlock(),
	});
	plugin.addCommand({
		id: "onboarding",
		name: t("Setup guide"),
		callback: () => plugin.openOnboarding(),
	});
	plugin.addCommand({
		id: "export-csv",
		name: t("Export workouts and daily data to CSV"),
		callback: () => void plugin.exportCsv(),
	});
	plugin.addCommand({
		id: "backup",
		name: t("Back up folder to ZIP"),
		callback: () => void plugin.backup(),
	});
	plugin.addCommand({
		id: "create-folders",
		name: t("Create missing folders"),
		callback: () => {
			void plugin.createFolders(true);
		},
	});
	plugin.addCommand({
		id: "seed-library",
		name: t("Add missing exercises, programs and templates to the library"),
		callback: () => {
			void plugin.seedLibrary(true);
		},
	});
}
