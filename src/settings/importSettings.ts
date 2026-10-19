// Nastavení – skupina Import dat: běh ze souboru, denní data z CSV, historie ze Strong a Hevy, Strava.

import { Notice, Setting } from "obsidian";
import type { WeightUnit } from "../calc/historyImport";
import { intlCode, t } from "../i18n";
import { LOCAL_AUTH_PORT } from "../strava/oauth";
import { StravaCodeModal } from "../ui/modals/StravaCodeModal";
import { collapsible, numberSetting, type SettingsHost } from "./settingsUi";

export function displayImports(el: HTMLElement, host: SettingsHost): void {
	new Setting(el)
		.setName(t("Import data"))
		.setDesc(t("Files are read only on this device and aren't sent anywhere."))
		.setHeading();
	displayRunImport(el, host);
	displayDailyImport(el, host);
	displayHistoryImport(el, host);
	displayStrava(el, host);
}

function displayRunImport(el: HTMLElement, host: SettingsHost): void {
	new Setting(el)
		.setName(t("Import run from file"))
		.setDesc(t("A run from a GPX, TCX or FIT file – works without a Strava subscription. The file is read only on this device and isn't sent anywhere."))
		.addButton((b) => b.setButtonText(t("Choose files")).onClick(() => host.plugin.pickRunFiles()));
	const guide = collapsible(el, t("Guide: where to get the file"));
	const list = guide.createEl("ul");
	const strava = list.createEl("li");
	strava.createEl("strong", { text: "Strava: " });
	strava.appendText(t("on strava.com, open your activity, click the three dots (More) and choose Export GPX. The mobile app has no export."));
	const mapMyRun = list.createEl("li");
	mapMyRun.createEl("strong", { text: "MapMyRun: " });
	mapMyRun.appendText(t("on mapmyrun.com, open the workout, click the three dots and choose Download as TCX."));
	const watch = list.createEl("li");
	watch.createEl("strong", { text: t("Watches and other apps: ") });
	watch.appendText(t("most can export to GPX, TCX or FIT (Garmin Connect, Polar Flow, Suunto, Coros). A FIT file from a watch includes heart rate too."));
	guide.createEl("p", {
		cls: "setting-item-description",
		text: t("The run's date and time, distance, moving time, heart rate, elevation gain and fastest splits are read. Distance from GPS positions and elevation gain are estimates – they can differ from the app's numbers by a few percent. You add RPE, run type and shoes afterwards in the list of runs to complete. The same file a second time is skipped; a manually logged run on the same day with the same distance gets the measured data added."),
	});
}

function displayDailyImport(el: HTMLElement, host: SettingsHost): void {
	new Setting(el)
		.setName(t("Import daily data from CSV"))
		.setDesc(t("Steps, sleep duration, HRV, resting heart rate and weight from a watch or app export. Only fills in values missing from the journal; logged values aren't overwritten. The file is read only on this device."))
		.addButton((b) => b.setButtonText(t("Choose file")).onClick(() => host.plugin.pickDailyFile()));
	const guide = collapsible(el, t("Which files it reads"));
	guide.createEl("p", {
		cls: "setting-item-description",
		text: t("A CSV with a date column and at least one column recognized by its name (Czech or English): steps (Steps, Step count), sleep duration (Sleep duration – hours, minutes, seconds or 7:45), HRV (HRV, rMSSD), resting heart rate (Resting heart rate) or weight (Weight). Scores, goals and sleep stages are skipped. Several rows for one day are merged."),
	});
	guide.createEl("p", {
		cls: "setting-item-description",
		text: t("Example: Google Fit via Google Takeout – the file Daily activity metrics.csv contains steps. Elonga has no export, so its HRV is still copied by hand. Tested only on hand-built files; before writing you'll see what will be added."),
	});
}

function displayHistoryImport(el: HTMLElement, host: SettingsHost): void {
	let unit: WeightUnit = "kg";
	new Setting(el)
		.setName(t("History import from Strong and Hevy"))
		.setDesc(t("Brings over strength workouts from a CSV export: exercises, sets, weights, warm-up and drop sets, supersets. The file is read only on this device."))
		.addDropdown((d) =>
			d
				.addOption("kg", t("Strong in kilograms"))
				.addOption("lb", t("Strong in pounds"))
				.setValue(unit)
				.onChange((v) => (unit = v === "lb" ? "lb" : "kg")),
		)
		.addButton((b) => b.setButtonText(t("Choose file")).onClick(() => host.plugin.pickHistoryFile(unit)));
	const guide = collapsible(el, t("Guide: where to get the export and what to expect"));
	const list = guide.createEl("ul");
	const strong = list.createEl("li");
	strong.createEl("strong", { text: "Strong: " });
	strong.appendText(t("in the app, open Settings and choose Export Workouts (under Data Management). The file doesn't include the weight unit – pick it in the menu above according to what you log in the app."));
	const hevy = list.createEl("li");
	hevy.createEl("strong", { text: "Hevy: " });
	hevy.appendText(t("in the app settings, find the data export and download the workout file (workout data, CSV). The file includes the unit."));
	guide.createEl("p", {
		cls: "setting-item-description",
		text: t("Exercise names are matched with the library (English names too); unknown exercises keep their original name. Set RPE is converted to RIR (10 − RPE). Runs and other cardio are skipped – import runs from a GPX or TCX file. Before the import you'll see a summary and confirm it; workouts already in the journal are skipped. The import has only been tested on files built according to both apps' help pages – try it on a backup first."),
	});
}

/** Strava potřebuje vlastní API aplikaci a předplatné – sbalené, ať nepřekáží importu ze souboru. */
function displayStrava(el: HTMLElement, host: SettingsHost): void {
	const { plugin, settings } = host;
	const strava = settings.strava;
	const auth = plugin.strava;
	const box = collapsible(el, auth.isConnected ? t("Strava – connected") : "Strava");
	box.createEl("p", {
		cls: "setting-item-description",
		text: t("Import runs from Strava. Each user uses their own API application – the credentials stay in this vault only."),
	});

	const guide = collapsible(box, t("Guide: how to create an API application on Strava"));
	guide.createEl("p", {
		cls: "setting-item-description",
		text: t("Since June 2026, Strava only lets accounts with a paid subscription create an API application. Without one the connection can't be set up – import runs from a file instead (see above) or log them by hand."),
	});
	const steps = guide.createEl("ol");
	const first = steps.createEl("li", { text: t("Sign in to Strava and open ") });
	first.createEl("a", { text: "strava.com/settings/api", href: "https://www.strava.com/settings/api" });
	first.appendText(".");
	steps.createEl("li", { text: t("Fill in the application name (anything, e.g. “My journal”), the category and the website (http://localhost is enough).") });
	steps.createEl("li", { text: t("In the Authorization Callback Domain field, enter exactly: localhost") });
	steps.createEl("li", { text: t("Upload any image as the icon – Strava requires one.") });
	steps.createEl("li", { text: t("Copy the Client ID and Client Secret into the fields below and click Connect.") });
	guide.createEl("p", {
		cls: "setting-item-description",
		text: t("Never share the Client Secret. A new application can only connect you – that's enough for a personal journal."),
	});

	new Setting(box).setName("Client ID").addText((text) =>
		text.setValue(strava.clientId).onChange((v) => {
			strava.clientId = v.trim();
			host.save();
		}),
	);
	new Setting(box)
		.setName("Client Secret")
		.setDesc(t("Stored only in this plugin's data.json file."))
		.addText((text) => {
			text.inputEl.type = "password";
			text.inputEl.autocomplete = "off";
			text.setValue(strava.clientSecret).onChange((v) => {
				strava.clientSecret = v.trim();
				host.save();
			});
		});

	const run = async (action: () => Promise<void>, done: string) => {
		try {
			// Právě napsané údaje uložit hned, ať je připojení vidí.
			plugin.requestSaveSettings.run();
			await action();
			new Notice(done);
		} catch (err) {
			new Notice(`Strava: ${err instanceof Error ? err.message : String(err)}`);
		}
		host.display();
	};

	new Setting(box)
		.setName(t("Activity types"))
		.setDesc(t("Which Strava activity types are imported as runs, separated by commas. Default: Run, TrailRun, VirtualRun."))
		.addText((text) =>
			text.setValue(strava.activityTypes.join(", ")).onChange((v) => {
				const types = v
					.split(",")
					.map((part) => part.trim())
					.filter((part) => part !== "");
				if (types.length > 0) {
					strava.activityTypes = types;
					host.save();
				}
			}),
		);
	numberSetting(host, box, t("First sync"), t("How many days back to download on the first sync."), strava.initialDays, (v) => (strava.initialDays = v ?? 90), {
		min: 1,
		max: 3650,
	});

	if (auth.isConnected) {
		const last = strava.lastSyncAt > 0 ? new Date(strava.lastSyncAt * 1000).toLocaleString(intlCode()) : t("not yet");
		new Setting(box)
			.setName(t("Sync"))
			.setDesc(t("Downloads new runs; only runs when you start it. Last: {last}.", { last }))
			.addButton((b) =>
				b.setButtonText(t("Sync now")).onClick(async () => {
					b.setDisabled(true);
					await plugin.syncStrava();
					host.display();
				}),
			);
		new Setting(box)
			.setName(strava.athleteName ? t("Connected: {athleteName}", { athleteName: strava.athleteName }) : t("Connected"))
			.setDesc(t("Disconnecting removes the sign-in on this device only. Revoke the app's access on Strava under Settings → My Apps."))
			.addButton((b) => b.setButtonText(t("Disconnect")).onClick(() => void run(() => auth.disconnect(), t("Strava disconnected."))));
	} else {
		if (auth.canUseLocalServer) {
			new Setting(box)
				.setName(t("Connect"))
				.setDesc(t("Opens Strava in the browser and returns by itself after you allow access (temporary server on localhost:{LOCAL_AUTH_PORT}).", { LOCAL_AUTH_PORT }))
				.addButton((b) =>
					b
						.setButtonText(t("Connect"))
						.setCta()
						.onClick(() => {
							b.setDisabled(true).setButtonText(t("Waiting for approval…"));
							void run(() => auth.connectWithLocalServer(), t("Strava connected."));
						}),
				);
		}
		new Setting(box)
			.setName(auth.canUseLocalServer ? t("Connect manually") : t("Connect"))
			.setDesc(t("Opens Strava; after you allow access, copy the address from the browser and paste it here. Works on mobile too."))
			.addButton((b) => {
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
			});
	}
}
