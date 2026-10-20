// Nastavení – skupiny Knihovna, programy a složky; Záloha a export; Pokročilé (prahy výpočtů).

import { Notice, type SettingDefinitionGroup, type SettingGroupItem } from "obsidian";
import { PROGRAM_FILE_EXAMPLE } from "../calc/programFile";
import { normalizeVaultPath } from "../data/paths";
import { t, translated } from "../i18n";
import { confirmAction } from "../ui/modals/ConfirmModal";
import { DEFAULT_FOLDERS, DEFAULT_SETTINGS, DEFAULT_THRESHOLDS, type FolderSettings } from "./settings";
import { note, type SettingsHost } from "./settingsUi";
import { THRESHOLD_GROUPS } from "./thresholdFields";

const FOLDER_LABELS: Record<Exclude<keyof FolderSettings, "root">, string> = translated({
	days: "Journal (daily notes)",
	workouts: "Workouts",
	exercises: "Exercise library",
	templates: "Workout templates",
	programs: "Programs",
	supplements: "Supplements",
	goals: "Goals",
	pains: "Pain and injuries",
	gear: "Equipment",
	tests: "Max tests",
	summaries: "Summaries",
	exports: "CSV export",
	plans: "Weekly plans",
});

/** Výsledek kontroly cesty ke složce: chybová hláška, nebo nic. */
function folderError(value: string): string | undefined {
	return normalizeVaultPath(value) === "" ? t("Enter a folder path.") : undefined;
}

/** Řádek s tlačítkem, které spustí akci pluginu. */
function button(name: string, desc: string, label: string, onClick: () => void): SettingGroupItem {
	return { name, desc, render: (s) => void s.addButton((b) => b.setButtonText(label).onClick(onClick)) };
}

export function libraryGroup(host: SettingsHost): SettingDefinitionGroup {
	const { plugin } = host;
	return {
		type: "group",
		heading: t("Library, programs and folders"),
		items: [
			button(t("Add to library"), t("Creates missing exercises, built-in programs and workout templates. Existing notes aren't changed."), t("Add", undefined, "missing"), () => void plugin.seedLibrary(true)),
			button(t("Add exercise descriptions"), t("Adds the description, technique and common mistakes where they're missing in an exercise note. Existing text isn't overwritten."), t("Add", undefined, "missing"), () => void plugin.fillExerciseTexts()),
			button(t("Restore built-in programs"), t("Replaces the description and settings of the built-in programs with the current version from the plugin (after confirmation). Your own programs aren't changed."), t("Restore"), () => void plugin.refreshBuiltinPrograms()),
			button(t("Program from file"), t("Choose an .md, .txt, .json or .yaml file – it becomes your own program in the library (inactive). The file stays on your computer and isn't sent anywhere."), t("Choose file"), () => plugin.pickProgramFile()),
			button(t("Program from pasted text"), t("Same formats as the file – handy for text copied from a friend."), t("Paste text"), () => plugin.openProgramImport()),
			programHelp(),
			folders(host),
		],
	};
}

function programHelp(): SettingGroupItem {
	const targets = [
		t("3×10 – sets × reps"),
		t("3×45 s, 2 min – hold or time"),
		t("5 km, 800 m – distance"),
		t("100 daily – daily total (counter)"),
		t("3× max – max-rep sets"),
		t("3×60 % – sets at a percentage of your max test"),
		t("EMOM 10 min × 5 – 5 reps every minute"),
		t("ladder 1-2-3-4-5 – ladder"),
	];
	return {
		type: "page",
		name: t("What the file should look like"),
		items: [
			{
				type: "group",
				items: [
					note(t("The simplest is a plain list: the heading is the program name, a heading with days (e.g. “Monday and Friday”) applies to the bullets below it, and each bullet is “Exercise: target”. You can also write days as a line “Days: Mon, Wed, Fri” or in brackets after an item.")),
					note(createFragment((f) => f.createEl("pre", { text: PROGRAM_FILE_EXAMPLE }))),
					note(createFragment((f) => {
						const list = f.createEl("ul");
						for (const line of targets) list.createEl("li", { text: line });
					})),
					note(t("It also reads a program note from this plugin (with a front matter block between --- lines) and JSON or YAML with the same keys: name, days, duration_weeks, items (exercise, target). Lines the plugin doesn't understand are listed after the import. Exercises that aren't in the library are saved under the given name.")),
				],
			},
		],
	};
}

/** Složky se mění zřídka – na vlastní stránce. */
function folders(host: SettingsHost): SettingGroupItem {
	return {
		type: "page",
		name: t("Folders"),
		desc: t("Subfolders are inside the root folder. Renaming doesn't move existing notes."),
		items: [
			{
				type: "group",
				items: [
					{
						name: t("Root folder"),
						desc: t("Default: {root}", { root: DEFAULT_FOLDERS.root }),
						control: { type: "folder", key: "folders.root", validate: folderError },
					},
					...(Object.keys(FOLDER_LABELS) as (keyof typeof FOLDER_LABELS)[]).map(
						(key): SettingGroupItem => ({
							name: FOLDER_LABELS[key],
							desc: t("Default: {v}", { v: DEFAULT_FOLDERS[key] }),
							control: { type: "folder", key: `folders.${key}`, validate: folderError },
						}),
					),
					button(t("Create missing folders"), "", t("Create"), () => void host.plugin.createFolders(true)),
				],
			},
		],
	};
}

export function backupGroup(host: SettingsHost): SettingDefinitionGroup {
	const { plugin, settings } = host;
	return {
		type: "group",
		heading: t("Export and backup"),
		items: [
			{
				name: t("CSV export"),
				// Popis s cestou až při vykreslení – složky se mění na podstránce bez update().
				render: (s) =>
					void s
						.setDesc(t("Saves workouts and daily data as CSV (semicolon separator, decimal comma – opens in Excel) to the folder {root}/{exports}.", { root: settings.folders.root, exports: settings.folders.exports }))
						.addButton((b) => b.setButtonText(t("Export", undefined, "action")).onClick(() => void plugin.exportCsv())),
			},
			{
				name: t("Backup folder"),
				desc: t("A path in the vault outside the root folder. Default: {v}.", { v: DEFAULT_SETTINGS.backupFolder }),
				control: {
					type: "folder",
					key: "backupFolder",
					validate: (value) => {
						const path = normalizeVaultPath(value);
						const root = settings.folders.root;
						if (path === root || path.startsWith(`${root}/`)) return t("The backup folder must be outside the root folder.");
						return folderError(value);
					},
				},
			},
			button(t("Back up"), t("Packs the whole root folder into one .zip file in the backup folder."), t("Back up"), () => void plugin.backup()),
		],
	};
}

/** Prahy a okna výpočtů – technické, každá skupina na vlastní stránce. */
export function advancedGroup(host: SettingsHost): SettingDefinitionGroup {
	return {
		type: "group",
		heading: t("Advanced"),
		items: [
			note(t("Calculation thresholds and windows. Defaults match the sources listed with each calculation.")),
			...THRESHOLD_GROUPS.map(
				(group): SettingGroupItem => ({
					type: "page",
					name: t(group.title),
					items: [
						{
							type: "group",
							items: group.fields.map((field): SettingGroupItem => {
								const unit = field.unit ? ` (${t(field.unit)})` : "";
								return {
									name: t(field.label),
									desc: (field.desc ? `${t(field.desc)} ` : "") + t("Default: {value}{unit}.", { value: DEFAULT_THRESHOLDS[field.key], unit }),
									control: { type: "number", key: `thresholds.${field.key}`, min: field.min, max: field.max, step: field.step, defaultValue: DEFAULT_THRESHOLDS[field.key] },
								};
							}),
						},
					],
				}),
			),
			{
				name: t("Restore default thresholds"),
				render: (s) =>
					void s.addButton((b) =>
						b
							.setButtonText(t("Restore"))
							.setDestructive()
							.onClick(async () => {
								const ok = await confirmAction(
									host.app,
									t("Restore default thresholds?"),
									t("All calculation thresholds and windows will be reset to their defaults. Your profile and other settings stay."),
									t("Restore"),
								);
								if (!ok) return;
								host.settings.thresholds = structuredClone(DEFAULT_THRESHOLDS);
								host.save();
								new Notice(t("Thresholds restored to defaults."));
								host.update();
							}),
					),
			},
		],
	};
}
