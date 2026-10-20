// Nastavení – skupina Import dat: běh ze souboru, denní data z CSV, historie ze Strong a Hevy, Strava.

import { Notice, type SettingDefinitionGroup, type SettingGroupItem } from "obsidian";
import type { WeightUnit } from "../calc/historyImport";
import { intlCode, t } from "../i18n";
import { LOCAL_AUTH_PORT } from "../strava/oauth";
import { StravaCodeModal } from "../ui/modals/StravaCodeModal";
import { DEFAULT_SETTINGS, parseTextList } from "./settings";
import { note, type SettingsHost } from "./settingsUi";

export function importGroup(host: SettingsHost): SettingDefinitionGroup {
	return {
		type: "group",
		heading: t("Import data"),
		items: [note(t("Files are read only on this device and aren't sent anywhere.")), ...runImport(host), ...dailyImport(host), ...historyImport(host), strava(host)],
	};
}

/** Stránka s textem návodu: řádky jen s popisem. */
function guidePage(name: string, rows: { name?: string; desc: string | DocumentFragment }[]): SettingGroupItem {
	return { type: "page", name, items: [{ type: "group", items: rows.map((r) => note(r.desc, r.name)) }] };
}

function runImport(host: SettingsHost): SettingGroupItem[] {
	return [
		{
			name: t("Import run from file"),
			desc: t("A run from a GPX, TCX or FIT file – works without a Strava subscription. The file is read only on this device and isn't sent anywhere."),
			aliases: ["GPX", "TCX", "FIT"],
			render: (s) => void s.addButton((b) => b.setButtonText(t("Choose files")).onClick(() => host.plugin.pickRunFiles())),
		},
		guidePage(t("Guide: where to get the file"), [
			{ name: "Strava", desc: t("on strava.com, open your activity, click the three dots (More) and choose Export GPX. The mobile app has no export.") },
			{ name: "MapMyRun", desc: t("on mapmyrun.com, open the workout, click the three dots and choose Download as TCX.") },
			{ name: t("Watches and other apps"), desc: t("most can export to GPX, TCX or FIT (Garmin Connect, Polar Flow, Suunto, Coros). A FIT file from a watch includes heart rate too.") },
			{
				desc: t("The run's date and time, distance, moving time, heart rate, elevation gain and fastest splits are read. Distance from GPS positions and elevation gain are estimates – they can differ from the app's numbers by a few percent. You add RPE, run type and shoes afterwards in the list of runs to complete. The same file a second time is skipped; a manually logged run on the same day with the same distance gets the measured data added."),
			},
		]),
	];
}

function dailyImport(host: SettingsHost): SettingGroupItem[] {
	return [
		{
			name: t("Import daily data from CSV"),
			desc: t("Steps, sleep duration, HRV, resting heart rate and weight from a watch or app export. Only fills in values missing from the journal; logged values aren't overwritten. The file is read only on this device."),
			render: (s) => void s.addButton((b) => b.setButtonText(t("Choose file")).onClick(() => host.plugin.pickDailyFile())),
		},
		guidePage(t("Which files it reads"), [
			{
				desc: t("A CSV with a date column and at least one column recognized by its name (Czech or English): steps (Steps, Step count), sleep duration (Sleep duration – hours, minutes, seconds or 7:45), HRV (HRV, rMSSD), resting heart rate (Resting heart rate) or weight (Weight). Scores, goals and sleep stages are skipped. Several rows for one day are merged."),
			},
			{
				desc: t("Example: Google Fit via Google Takeout – the file Daily activity metrics.csv contains steps. Elonga has no export, so its HRV is still copied by hand. Tested only on hand-built files; before writing you'll see what will be added."),
			},
		]),
	];
}

function historyImport(host: SettingsHost): SettingGroupItem[] {
	let unit: WeightUnit = "kg";
	return [
		{
			name: t("History import from Strong and Hevy"),
			desc: t("Brings over strength workouts from a CSV export: exercises, sets, weights, warm-up and drop sets, supersets. The file is read only on this device."),
			aliases: ["Strong", "Hevy"],
			render: (s) =>
				void s
					.addDropdown((d) =>
						d
							.addOption("kg", t("Strong in kilograms"))
							.addOption("lb", t("Strong in pounds"))
							.setValue(unit)
							.onChange((v) => (unit = v === "lb" ? "lb" : "kg")),
					)
					.addButton((b) => b.setButtonText(t("Choose file")).onClick(() => host.plugin.pickHistoryFile(unit))),
		},
		guidePage(t("Guide: where to get the export and what to expect"), [
			{ name: "Strong", desc: t("in the app, open Settings and choose Export Workouts (under Data Management). The file doesn't include the weight unit – pick it in the menu above according to what you log in the app.") },
			{ name: "Hevy", desc: t("in the app settings, find the data export and download the workout file (workout data, CSV). The file includes the unit.") },
			{
				desc: t("Exercise names are matched with the library (English names too); unknown exercises keep their original name. Set RPE is converted to RIR (10 − RPE). Runs and other cardio are skipped – import runs from a GPX or TCX file. Before the import you'll see a summary and confirm it; workouts already in the journal are skipped. The import has only been tested on files built according to both apps' help pages – try it on a backup first."),
			},
		]),
	];
}

/** Strava potřebuje vlastní API aplikaci a předplatné – na vlastní stránce, ať nepřekáží importu ze souboru. */
function strava(host: SettingsHost): SettingGroupItem {
	const { plugin, settings } = host;
	const strava = settings.strava;
	const auth = plugin.strava;

	const run = async (action: () => Promise<void>, done: string) => {
		try {
			// Právě napsané údaje uložit hned, ať je připojení vidí.
			plugin.requestSaveSettings.run();
			await action();
			new Notice(done);
		} catch (err) {
			new Notice(`Strava: ${err instanceof Error ? err.message : String(err)}`);
		}
		host.update();
	};

	const first = createFragment((f) => {
		f.appendText(t("Sign in to Strava and open "));
		f.createEl("a", { text: "strava.com/settings/api", href: "https://www.strava.com/settings/api" });
		f.appendText(".");
	});
	const last = strava.lastSyncAt > 0 ? new Date(strava.lastSyncAt * 1000).toLocaleString(intlCode()) : t("not yet");

	return {
		type: "page",
		name: "Strava",
		desc: t("Import runs from Strava. Each user uses their own API application – the credentials stay in this vault only."),
		displayValue: () => (auth.isConnected ? t("Connected") : ""),
		items: [
			{
				type: "group",
				items: [
					guidePage(t("Guide: how to create an API application on Strava"), [
						{ desc: t("Since June 2026, Strava only lets accounts with a paid subscription create an API application. Without one the connection can't be set up – import runs from a file instead (see above) or log them by hand.") },
						{ name: "1", desc: first },
						{ name: "2", desc: t("Fill in the application name (anything, e.g. “My journal”), the category and the website (http://localhost is enough).") },
						{ name: "3", desc: t("In the Authorization Callback Domain field, enter exactly: localhost") },
						{ name: "4", desc: t("Upload any image as the icon – Strava requires one.") },
						{ name: "5", desc: t("Copy the Client ID and Client Secret into the fields below and click Connect.") },
						{ desc: t("Never share the Client Secret. A new application can only connect you – that's enough for a personal journal.") },
					]),
					{
						name: "Client ID",
						render: (s) =>
							void s.addText((text) =>
								text.setValue(strava.clientId).onChange((v) => {
									strava.clientId = v.trim();
									host.save();
								}),
							),
					},
					{
						name: "Client Secret",
						desc: t("Stored only in this plugin's data.json file."),
						render: (s) =>
							void s.addText((text) => {
								text.inputEl.type = "password";
								text.inputEl.autocomplete = "off";
								text.setValue(strava.clientSecret).onChange((v) => {
									strava.clientSecret = v.trim();
									host.save();
								});
							}),
					},
					{
						name: t("Activity types"),
						desc: t("Which Strava activity types are imported as runs, separated by commas. Default: Run, TrailRun, VirtualRun."),
						render: (s) =>
							void s.addText((text) =>
								text.setValue(strava.activityTypes.join(", ")).onChange((v) => {
									const types = parseTextList(v);
									if (types.length > 0) {
										strava.activityTypes = types;
										host.save();
									}
								}),
							),
					},
					{
						name: t("First sync"),
						desc: t("How many days back to download on the first sync."),
						control: { type: "number", key: "strava.initialDays", min: 1, max: 3650, step: 1, defaultValue: DEFAULT_SETTINGS.strava.initialDays },
					},
					{
						name: t("Sync"),
						desc: t("Downloads new runs; only runs when you start it. Last: {last}.", { last }),
						visible: () => auth.isConnected,
						render: (s) =>
							void s.addButton((b) =>
								b.setButtonText(t("Sync now")).onClick(async () => {
									b.setDisabled(true);
									await plugin.syncStrava();
									host.update();
								}),
							),
					},
					{
						name: strava.athleteName ? t("Connected: {athleteName}", { athleteName: strava.athleteName }) : t("Connected"),
						desc: t("Disconnecting removes the sign-in on this device only. Revoke the app's access on Strava under Settings → My Apps."),
						visible: () => auth.isConnected,
						render: (s) => void s.addButton((b) => b.setButtonText(t("Disconnect")).onClick(() => void run(() => auth.disconnect(), t("Strava disconnected.")))),
					},
					{
						name: t("Connect"),
						desc: t("Opens Strava in the browser and returns by itself after you allow access (temporary server on localhost:{LOCAL_AUTH_PORT}).", { LOCAL_AUTH_PORT }),
						visible: () => !auth.isConnected && auth.canUseLocalServer,
						render: (s) =>
							void s.addButton((b) =>
								b
									.setButtonText(t("Connect"))
									.setCta()
									.onClick(() => {
										b.setDisabled(true).setButtonText(t("Waiting for approval…"));
										void run(() => auth.connectWithLocalServer(), t("Strava connected."));
									}),
							),
					},
					{
						name: auth.canUseLocalServer ? t("Connect manually") : t("Connect"),
						desc: t("Opens Strava; after you allow access, copy the address from the browser and paste it here. Works on mobile too."),
						visible: () => !auth.isConnected,
						render: (s) =>
							void s.addButton((b) => {
								b.setButtonText(t("Connect manually")).onClick(() => {
									try {
										plugin.requestSaveSettings.run();
										auth.openManualAuthorization();
									} catch (err) {
										new Notice(`Strava: ${err instanceof Error ? err.message : String(err)}`);
										return;
									}
									new StravaCodeModal(host.app, (text) => run(() => auth.connectWithPastedCode(text), t("Strava connected."))).open();
								});
								if (!auth.canUseLocalServer) b.setCta();
							}),
					},
				],
			},
		],
	};
}
