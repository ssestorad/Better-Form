// Nastavení – skupiny Knihovna, programy a složky; Záloha a export; Pokročilé (prahy výpočtů).

import { Notice, Setting } from "obsidian";
import { PROGRAM_FILE_EXAMPLE } from "../calc/programFile";
import { normalizeVaultPath } from "../data/paths";
import { t, translated } from "../i18n";
import { confirmAction } from "../ui/modals/ConfirmModal";
import { DEFAULT_FOLDERS, DEFAULT_SETTINGS, DEFAULT_THRESHOLDS, type FolderSettings } from "./settings";
import { collapsible, numberSetting, type SettingsHost } from "./settingsUi";
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

export function displayLibrary(el: HTMLElement, host: SettingsHost): void {
	const { plugin } = host;
	new Setting(el).setName(t("Library, programs and folders")).setHeading();
	new Setting(el)
		.setName(t("Add to library"))
		.setDesc(t("Creates missing exercises, built-in programs and workout templates. Existing notes aren't changed."))
		.addButton((b) => b.setButtonText(t("Add", undefined, "missing")).onClick(() => void plugin.seedLibrary(true)));
	new Setting(el)
		.setName(t("Add exercise descriptions"))
		.setDesc(t("Adds the description, technique and common mistakes where they're missing in an exercise note. Existing text isn't overwritten."))
		.addButton((b) => b.setButtonText(t("Add", undefined, "missing")).onClick(() => void plugin.fillExerciseTexts()));
	new Setting(el)
		.setName(t("Restore built-in programs"))
		.setDesc(t("Replaces the description and settings of the built-in programs with the current version from the plugin (after confirmation). Your own programs aren't changed."))
		.addButton((b) => b.setButtonText(t("Restore")).onClick(() => void plugin.refreshBuiltinPrograms()));
	new Setting(el)
		.setName(t("Program from file"))
		.setDesc(t("Choose an .md, .txt, .json or .yaml file – it becomes your own program in the library (inactive). The file stays on your computer and isn't sent anywhere."))
		.addButton((b) => b.setButtonText(t("Choose file")).onClick(() => plugin.pickProgramFile()));
	new Setting(el)
		.setName(t("Program from pasted text"))
		.setDesc(t("Same formats as the file – handy for text copied from a friend."))
		.addButton((b) => b.setButtonText(t("Paste text")).onClick(() => plugin.openProgramImport()));

	const help = collapsible(el, t("What the file should look like"));
	help.createEl("p", {
		cls: "setting-item-description",
		text: t("The simplest is a plain list: the heading is the program name, a heading with days (e.g. “Monday and Friday”) applies to the bullets below it, and each bullet is “Exercise: target”. You can also write days as a line “Days: Mon, Wed, Fri” or in brackets after an item."),
	});
	help.createEl("pre", { text: PROGRAM_FILE_EXAMPLE });
	const targets = help.createEl("ul", { cls: "setting-item-description" });
	for (const line of [
		t("3×10 – sets × reps"),
		t("3×45 s, 2 min – hold or time"),
		t("5 km, 800 m – distance"),
		t("100 daily – daily total (counter)"),
		t("3× max – max-rep sets"),
		t("3×60 % – sets at a percentage of your max test"),
		t("EMOM 10 min × 5 – 5 reps every minute"),
		t("ladder 1-2-3-4-5 – ladder"),
	]) {
		targets.createEl("li", { text: line });
	}
	help.createEl("p", {
		cls: "setting-item-description",
		text: t("It also reads a program note from this plugin (with a front matter block between --- lines) and JSON or YAML with the same keys: name, days, duration_weeks, items (exercise, target). Lines the plugin doesn't understand are listed after the import. Exercises that aren't in the library are saved under the given name."),
	});

	displayFolders(el, host);
}

/** Složky se mění zřídka – sbalené. */
function displayFolders(el: HTMLElement, host: SettingsHost): void {
	const folders = host.settings.folders;
	const box = collapsible(el, t("Folders"));
	box.createEl("p", { cls: "setting-item-description", text: t("Subfolders are inside the root folder. Renaming doesn't move existing notes.") });
	new Setting(box)
		.setName(t("Root folder"))
		.setDesc(t("Default: {root}", { root: DEFAULT_FOLDERS.root }))
		.addText((text) =>
			text.setValue(folders.root).onChange((v) => {
				const path = normalizeVaultPath(v);
				text.inputEl.toggleClass("bf-invalid", path === "");
				if (path) {
					folders.root = path;
					host.save();
				}
			}),
		);
	for (const key of Object.keys(FOLDER_LABELS) as (keyof typeof FOLDER_LABELS)[]) {
		new Setting(box)
			.setName(FOLDER_LABELS[key])
			.setDesc(t("Default: {v}", { v: DEFAULT_FOLDERS[key] }))
			.addText((text) =>
				text.setValue(folders[key]).onChange((v) => {
					const path = normalizeVaultPath(v);
					text.inputEl.toggleClass("bf-invalid", path === "");
					if (path) {
						folders[key] = path;
						host.save();
					}
				}),
			);
	}
	new Setting(box).setName(t("Create missing folders")).addButton((b) => b.setButtonText(t("Create")).onClick(() => void host.plugin.createFolders(true)));
}

export function displayBackup(el: HTMLElement, host: SettingsHost): void {
	const { plugin, settings } = host;
	new Setting(el).setName(t("Export and backup")).setHeading();
	new Setting(el)
		.setName(t("CSV export"))
		.setDesc(t("Saves workouts and daily data as CSV (semicolon separator, decimal comma – opens in Excel) to the folder {root}/{exports}.", { root: settings.folders.root, exports: settings.folders.exports }))
		.addButton((b) => b.setButtonText(t("Export", undefined, "action")).onClick(() => void plugin.exportCsv()));
	new Setting(el)
		.setName(t("Backup folder"))
		.setDesc(t("A path in the vault outside the root folder. Default: {v}.", { v: DEFAULT_SETTINGS.backupFolder }))
		.addText((text) =>
			text.setValue(settings.backupFolder).onChange((v) => {
				const path = normalizeVaultPath(v);
				const root = settings.folders.root;
				const inside = path === root || path.startsWith(`${root}/`);
				text.inputEl.toggleClass("bf-invalid", path === "" || inside);
				if (path && !inside) {
					settings.backupFolder = path;
					host.save();
				}
			}),
		);
	new Setting(el)
		.setName(t("Back up"))
		.setDesc(t("Packs the whole root folder into one .zip file in the backup folder."))
		.addButton((b) => b.setButtonText(t("Back up")).onClick(() => void plugin.backup()));
}

/** Prahy a okna výpočtů – technické, každá skupina sbalená. */
export function displayAdvanced(el: HTMLElement, host: SettingsHost): void {
	new Setting(el)
		.setName(t("Advanced"))
		.setDesc(t("Calculation thresholds and windows. Defaults match the sources listed with each calculation."))
		.setHeading();
	const thresholds = host.settings.thresholds;
	for (const group of THRESHOLD_GROUPS) {
		const details = collapsible(el, t(group.title));
		for (const field of group.fields) {
			const unit = field.unit ? ` (${t(field.unit)})` : "";
			const desc = (field.desc ? `${t(field.desc)} ` : "") + t("Default: {value}{unit}.", { value: DEFAULT_THRESHOLDS[field.key], unit });
			numberSetting(host, details, t(field.label), desc, thresholds[field.key], (v) => {
				if (v !== null) thresholds[field.key] = v;
			}, field);
		}
	}
	new Setting(el).setName(t("Restore default thresholds")).addButton((b) =>
		b
			.setButtonText(t("Restore"))
			.setWarning()
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
				host.display();
			}),
	);
}
