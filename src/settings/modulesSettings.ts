// Nastavení → Moduly: zapnutí a vypnutí modulů a podmodulů (settings/modules.ts).
// Klíče podmodulů obsahují tečku („running.taper“), proto vlastní přepínače místo obecného ukládání podle cesty.

import type { Setting, SettingGroupItem } from "obsidian";
import { t } from "../i18n";
import { MODULE_IDS, MODULE_LABELS, MODULE_TREE, moduleOn, type ModuleKey } from "./modules";
import { note, type SettingsHost } from "./settingsUi";
import { QUICK_ACTION_PROTOCOL } from "../data/quickAction";

function toggle(host: SettingsHost, key: ModuleKey, child: boolean): SettingGroupItem {
	const { label, desc } = MODULE_LABELS[key];
	return {
		name: child ? `— ${label}` : label,
		desc,
		// Podmodul jen u zapnutého hlavního modulu.
		visible: child ? () => moduleOn(host.settings.modules, key.split(".")[0] as ModuleKey) : undefined,
		render: (s) =>
			void s.addToggle((control) =>
				control.setValue(host.settings.modules[key] !== false).onChange((on) => {
					// Zapnuté je výchozí – ukládá se jen vypnutí, ať se nové moduly po aktualizaci ukážou.
					if (on) delete host.settings.modules[key];
					else host.settings.modules[key] = false;
					host.save();
					host.plugin.settingsVersion.update((n) => n + 1);
					if (!child) host.update();
				}),
			),
	};
}

export function modulesPage(host: SettingsHost): SettingGroupItem {
	const off = () => MODULE_IDS.filter((id) => !moduleOn(host.settings.modules, id)).length;
	return {
		type: "page",
		name: t("Modules"),
		desc: t("Turn off parts of the plugin you don't use. Nothing is deleted – turning a module back on shows everything again, including its history."),
		displayValue: () => (off() > 0 ? t("Turned off: {v}", { v: off() }) : ""),
		items: [
			{
				type: "group",
				items: [
					note(t("The pain log and the advice to see a professional for pain of 4/10 or more or lasting over 7 days can't be turned off.")),
					...MODULE_IDS.flatMap((id) => [toggle(host, id, false), ...MODULE_TREE[id].map((sub) => toggle(host, `${id}.${sub}` as ModuleKey, true))]),
				],
			},
		],
	};
}

/** Hotové odkazy obsidian://better-form?… ke zkopírování – pro zástupce na ploše telefonu a Zkratky. */
export function quickLinksPage(host: SettingsHost): SettingGroupItem {
	const vault = encodeURIComponent(host.app.vault.getName());
	const link = (query: string) => `obsidian://${QUICK_ACTION_PROTOCOL}?vault=${vault}&${query}`;
	const firstTemplate = host.plugin.index.all("template")[0]?.note.name;
	// Příklad počítadla s programem z vaultu (název je v jazyce vaultu), jinak anglický název vestavěného.
	const counterProgram = host.plugin.index.all("program").find((p) => p.note.items.some((i) => i.target.kind === "daily_total"))?.note.name ?? "100 push-ups a day";
	const rows: { name: string; desc: string; url: string }[] = [
		{ name: t("Morning check-in"), desc: t("Opens the check-in for today."), url: link("action=checkin") },
		{ name: t("Log workout"), desc: t("Opens an empty workout form."), url: link("action=log") },
		...(firstTemplate ? [{ name: t("Log workout from a template"), desc: t("Change the template name at the end of the link."), url: link(`action=log&template=${encodeURIComponent(firstTemplate)}`) }] : []),
		{ name: t("Weekly plan"), desc: t("Opens the panel on the Plan tab (other tabs: today, log, overview, body…)."), url: link("action=tab&tab=plan") },
		{ name: t("Add to a daily counter"), desc: t("Adds reps to a program's daily counter, e.g. 20 push-ups – change the program name and number."), url: link(`action=counter&program=${encodeURIComponent(counterProgram)}&reps=20`) },
		{ name: t("Sync Garmin"), desc: t("Also works with service=strava or service=runna."), url: link("action=sync&service=garmin") },
	];
	return {
		type: "page",
		name: t("Quick links for your phone"),
		desc: t("Links for a home-screen shortcut, iOS Shortcuts or a widget. Commands like Check-in or Log workout can also be added to the mobile toolbar (Obsidian settings → Toolbar)."),
		items: [
			{
				type: "group",
				items: rows.map(
					(row): SettingGroupItem => ({
						name: row.name,
						desc: `${row.desc} ${row.url}`,
						render: (s) =>
							void s.addButton((b) =>
								b.setButtonText(t("Copy")).onClick(() => {
									void navigator.clipboard.writeText(row.url).then(() => b.setButtonText(t("Copied")));
								}),
							),
					}),
				),
			},
		],
	};
}

/** Metriky dne (bf_…) do vlastní denní poznámky uživatele – volitelné, pro Bases a Dataview. */
export function dailyMirrorPage(host: SettingsHost): SettingGroupItem {
	const mirror = host.settings.dailyMirror;
	const text = (value: () => string, set: (v: string) => void, placeholder: string) => (s: Setting) =>
		void s.addText((field) =>
			field
				.setPlaceholder(placeholder)
				.setValue(value())
				.onChange((v) => {
					set(v.trim());
					host.save();
				}),
		);
	return {
		type: "page",
		name: t("Metrics in your daily note"),
		desc: t("Writes the day's readiness, load, sleep, HRV, resting heart rate, weight, steps and workouts into your own daily note as properties starting with bf_ – so Bases or Dataview can use them even without the plugin."),
		displayValue: () => (mirror.enabled ? t("On") : ""),
		items: [
			{
				type: "group",
				items: [
					{ name: t("Write metrics"), desc: t("Only into a daily note that already exists; only the bf_ properties change, nothing else in the note."), control: { type: "toggle", key: "dailyMirror.enabled" } },
					{ name: t("Daily notes folder"), desc: t("The same as in Obsidian's Daily notes plugin; empty = vault root."), render: text(() => mirror.folder, (v) => (mirror.folder = v.replace(/^\/+|\/+$/g, "")), "Daily") },
					{ name: t("Date format"), desc: t("Like in the Daily notes plugin, e.g. YYYY-MM-DD or D. M. YYYY (supported: YYYY, YY, MMMM, MMM, MM, M, DD, D, dddd, ddd and text in [brackets])."), render: text(() => mirror.format, (v) => (mirror.format = v || "YYYY-MM-DD"), "YYYY-MM-DD") },
					note(t("Properties: bf_readiness, bf_load, bf_sleep_h, bf_hrv, bf_rhr, bf_weight, bf_steps, bf_workouts, bf_workout_min, bf_run_km. The full description of the plugin's own notes is in docs/schema.md on GitHub.")),
				],
			},
		],
	};
}
