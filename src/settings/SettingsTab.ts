import { Notice, PluginSettingTab, Setting, type App } from "obsidian";
import type BetterFormPlugin from "../main";
import { MUSCLE_LABELS, MUSCLES, SPORT_LABELS, SPORTS } from "../model/constants";
import { normalizeVaultPath } from "../data/paths";
import { LOCAL_AUTH_PORT } from "../strava/oauth";
import { confirmAction } from "../ui/modals/ConfirmModal";
import { StravaCodeModal } from "../ui/modals/StravaCodeModal";
import {
	DEFAULT_FOLDERS,
	DEFAULT_NUTRITION,
	DEFAULT_SETTINGS,
	DEFAULT_THRESHOLDS,
	RMR_FORMULAS,
	parseNumberList,
	type ActivityLevel,
	type AppMode,
	type BodyGoal,
	type FolderSettings,
	type RmrFormulaSetting,
	type SettingsSex,
} from "./settings";
import { RMR_FORMULA_LABELS } from "../calc/nutrition";
import type { WeightUnit } from "../calc/historyImport";
import { PROGRAM_FILE_EXAMPLE } from "../calc/programFile";
import { THRESHOLD_GROUPS } from "./thresholdFields";
import { isLanguage, LANGUAGE_LABELS, LANGUAGES, t, translated } from "../i18n";

interface NumberOptions {
	min: number;
	max: number;
	step?: number;
	/** Prázdné pole = null. */
	optional?: boolean;
}

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

export class BetterFormSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: BetterFormPlugin,
	) {
		super(app, plugin);
	}

	override display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.displayLanguage(containerEl);
		this.displayProfile(containerEl);
		this.displayNutrition(containerEl);
		this.displayMode(containerEl);
		this.displayTraining(containerEl);
		this.displayRunImport(containerEl);
		this.displayHistoryImport(containerEl);
		this.displayDailyImport(containerEl);
		this.displayStrava(containerEl);
		this.displayFolders(containerEl);
		this.displayPrograms(containerEl);
		this.displayBackup(containerEl);
		this.displayThresholds(containerEl);
	}

	private get settings() {
		return this.plugin.settings;
	}

	private save(): void {
		this.plugin.requestSaveSettings();
	}

	// ---------- Sekce ----------

	/** Jazyk: vždy dvojjazyčně, ať ho najde i ten, kdo druhému jazyku nerozumí. */
	private displayLanguage(el: HTMLElement): void {
		new Setting(el)
			// Anglický název zůstane i v jiném jazyce, aby přepínač našel každý.
			.setName(this.settings.language === "en" ? "Language" : `Language / ${t("Language")}`)
			.setDesc(t("Interface language. Notes created earlier (library, texts generated in notes) switch over with Translate notes. Command names change after the plugin restarts."))
			.addDropdown((d) => {
				for (const language of LANGUAGES) d.addOption(language, LANGUAGE_LABELS[language]);
				d.setValue(this.settings.language).onChange(async (value) => {
					if (!isLanguage(value)) return;
					await this.plugin.setLanguage(value);
					this.display();
				});
			})
			// Knihovnu a texty v poznámkách z dřívějška převede do zvoleného jazyka (s potvrzením).
			.addButton((b) => {
				b.setButtonText(t("Translate notes")).onClick(() => void this.plugin.renameBuiltinToLanguage());
			});
	}

	private displayProfile(el: HTMLElement): void {
		const profile = this.settings.profile;
		new Setting(el)
			.setName(t("Profile"))
			.setDesc(t("Data for calculations (heart rate zones, nutrition). Nothing leaves the vault."))
			.setHeading();
		new Setting(el)
			.setName(t("Setup guide"))
			.setDesc(t("Profile, goal, mode and sports in one short form."))
			.addButton((b) => b.setButtonText(t("Start guide")).onClick(() => this.plugin.openOnboarding()));

		new Setting(el).setName(t("Name", undefined, "person")).setDesc(t("Optional.")).addText((t) =>
			t.setValue(profile.name).onChange((v) => {
				profile.name = v.trim();
				this.save();
			}),
		);
		new Setting(el).setName(t("Sex")).setDesc(t("Used in the resting energy equation.")).addDropdown((d) =>
			d
				.addOptions({ "": t("Not set"), male: t("Male"), female: t("Female") })
				.setValue(profile.sex ?? "")
				.onChange((v) => {
					profile.sex = v === "" ? null : (v as SettingsSex);
					this.save();
				}),
		);
		this.numberSetting(el, t("Year of birth"), "", profile.birthYear, (v) => (profile.birthYear = v), {
			min: 1900,
			max: new Date().getFullYear(),
			optional: true,
		});
		this.numberSetting(el, t("Height"), "cm", profile.heightCm, (v) => (profile.heightCm = v), {
			min: 100,
			max: 250,
			optional: true,
		});
		this.numberSetting(
			el,
			t("Default body weight"),
			t("kg – used until you log your weight in the morning check-in."),
			profile.weightKg,
			(v) => (profile.weightKg = v),
			{ min: 30, max: 250, step: 0.1, optional: true },
		);
		this.numberSetting(el, t("Body fat"), t("% – optional."), profile.bodyFatPct, (v) => (profile.bodyFatPct = v), {
			min: 3,
			max: 60,
			step: 0.1,
			optional: true,
		});
		this.numberSetting(
			el,
			t("Maximum heart rate (HRmax)"),
			t("Measured value; if missing, it's estimated from age (Tanaka 2001)."),
			profile.hrMax,
			(v) => (profile.hrMax = v),
			{ min: 120, max: 230, optional: true },
		);
		new Setting(el)
			.setName(t("Activity outside training"))
			.setDesc(t("A normal day without training – workouts are counted separately in nutrition. Sedentary = you sit most of the day (school, office); lightly active = on your feet part of the day or walking a lot; active = physical work."))
			.addDropdown((d) =>
			d
				.addOptions({ sedentary: t("Sedentary"), light: t("Lightly active"), active: t("Active job") })
				.setValue(profile.activity)
				.onChange((v) => {
					profile.activity = v as ActivityLevel;
					this.save();
				}),
		);
		new Setting(el).setName(t("Goal")).addDropdown((d) =>
			d
				.addOptions({ lose: t("Lose weight"), maintain: t("Maintain"), gain: t("Gain") })
				.setValue(profile.goal)
				.onChange((v) => {
					profile.goal = v as BodyGoal;
					this.save();
				}),
		);
	}

	private displayNutrition(el: HTMLElement): void {
		const nutrition = this.settings.nutrition;
		new Setting(el)
			.setName(t("Nutrition"))
			.setDesc(t("How the recommended intake is calculated (Nutrition tab). Defaults follow the sources listed on the tab."))
			.setHeading();
		new Setting(el)
			.setName(t("Resting energy equation"))
			.setDesc(t("ten Haaf was developed in athletes aged 18–35 training at least 3 h a week and is the most accurate for them; for everyone else Mifflin–St Jeor is more reliable. The fat-free mass equations need your body fat filled in; without it, ten Haaf by weight is used. The Nutrition tab tells you when a different equation suits your profile and offers to switch."))
			.addDropdown((d) =>
				d
					.addOptions(Object.fromEntries(RMR_FORMULAS.map((f) => [f, RMR_FORMULA_LABELS[f]])))
					.setValue(nutrition.rmrFormula)
					.onChange((v) => {
						nutrition.rmrFormula = v as RmrFormulaSetting;
						this.save();
					}),
			);
		const factors: [ActivityLevel, string][] = [
			["sedentary", t("Factor – sedentary")],
			["light", t("Factor – lightly active")],
			["active", t("Factor – active job")],
		];
		for (const [level, label] of factors) {
			this.numberSetting(
				el,
				label,
				t("Multiple of resting expenditure for everyday activity outside training (estimate – practice). Default: {v}.", { v: DEFAULT_NUTRITION.activityFactors[level] }),
				nutrition.activityFactors[level],
				(v) => {
					if (v !== null) nutrition.activityFactors[level] = v;
				},
				{ min: 1, max: 2.5, step: 0.05 },
			);
		}
		this.numberSetting(el, t("Weight loss – slowest pace"), t("% of body weight per week (Helms 2014). Default: 0.5."), nutrition.lossRatePctMin, (v) => {
			if (v !== null) nutrition.lossRatePctMin = v;
		}, { min: 0.1, max: 1.5, step: 0.1 });
		this.numberSetting(el, t("Weight loss – fastest pace"), t("% of body weight per week (Helms 2014). Default: 1."), nutrition.lossRatePctMax, (v) => {
			if (v !== null) nutrition.lossRatePctMax = v;
		}, { min: 0.1, max: 1.5, step: 0.1 });
		this.numberSetting(el, t("Gaining – surplus from"), t("% of expenditure (practice). Default: 5."), nutrition.gainSurplusPctMin, (v) => {
			if (v !== null) nutrition.gainSurplusPctMin = v;
		}, { min: 0, max: 25 });
		this.numberSetting(el, t("Gaining – surplus up to"), t("% of expenditure (practice). Default: 10."), nutrition.gainSurplusPctMax, (v) => {
			if (v !== null) nutrition.gainSurplusPctMax = v;
		}, { min: 0, max: 25 });
		this.numberSetting(
			el,
			t("Protein"),
			t("g per kg of body weight – upper end of the recommendation (range 1.6–2.2; Morton 2018). Default: 2."),
			nutrition.proteinGPerKg,
			(v) => {
				if (v !== null) nutrition.proteinGPerKg = v;
			},
			{ min: 1.2, max: 3.5, step: 0.1 },
		);
	}

	private displayPrograms(el: HTMLElement): void {
		new Setting(el).setName(t("Programs")).setHeading();
		new Setting(el)
			.setName(t("Program from file"))
			.setDesc(t("Choose an .md, .txt, .json or .yaml file – it becomes your own program in the library (inactive). The file stays on your computer and isn't sent anywhere."))
			.addButton((b) => b.setButtonText(t("Choose file")).setCta().onClick(() => this.plugin.pickProgramFile()));
		new Setting(el)
			.setName(t("Program from pasted text"))
			.setDesc(t("Same formats as the file – handy for text copied from a friend."))
			.addButton((b) => b.setButtonText(t("Paste text")).onClick(() => this.plugin.openProgramImport()));

		const help = el.createEl("details", { cls: "bf-settings-details" });
		help.createEl("summary", { text: t("What the file should look like") });
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
	}

	private displayBackup(el: HTMLElement): void {
		new Setting(el).setName(t("Export and backup")).setHeading();
		new Setting(el)
			.setName("Export do CSV")
			.setDesc(t("Saves workouts and daily data as CSV (semicolon separator, decimal comma – opens in Excel) to the folder {root}/{exports}.", { root: this.settings.folders.root, exports: this.settings.folders.exports }))
			.addButton((b) => b.setButtonText(t("Export", undefined, "action")).onClick(() => void this.plugin.exportCsv()));
		new Setting(el)
			.setName(t("Backup folder"))
			.setDesc(t("A path in the vault outside the root folder. Default: {v}.", { v: DEFAULT_SETTINGS.backupFolder }))
			.addText((t) =>
				t.setValue(this.settings.backupFolder).onChange((v) => {
					const path = normalizeVaultPath(v);
					const root = this.settings.folders.root;
					const inside = path === root || path.startsWith(`${root}/`);
					t.inputEl.toggleClass("bf-invalid", path === "" || inside);
					if (path && !inside) {
						this.settings.backupFolder = path;
						this.save();
					}
				}),
			);
		new Setting(el)
			.setName(t("Back up"))
			.setDesc(t("Packs the whole root folder into one .zip file in the backup folder."))
			.addButton((b) => b.setButtonText(t("Back up")).onClick(() => void this.plugin.backup()));
	}

	private displayMode(el: HTMLElement): void {
		new Setting(el).setName(t("Mode")).setHeading();
		new Setting(el)
			.setName(t("Display mode"))
			.setDesc(t("Basic = cards for basic exercises and running with quick logging; advanced tabs are hidden. The data stays the same."))
			.addDropdown((d) =>
				d
					.addOptions({ full: t("Full"), basic: t("Basic") })
					.setValue(this.settings.mode)
					.onChange((v) => {
						this.settings.mode = v as AppMode;
						this.save();
					}),
			);
		new Setting(el)
			.setName(t("Exercises in Basic mode"))
			.setDesc(t("Exercise names from the library, separated by commas; cardio exercises (running, jump rope) get a summary card."))
			.addText((t) =>
				t.setValue(this.settings.basicExercises.join(", ")).onChange((v) => {
					this.settings.basicExercises = v
						.split(",")
						.map((s) => s.trim())
						.filter((s) => s !== "");
					this.save();
				}),
			);
	}

	private displayTraining(el: HTMLElement): void {
		new Setting(el).setName(t("Training and equipment")).setHeading();

		for (const sport of SPORTS) {
			new Setting(el).setName(`Sport: ${SPORT_LABELS[sport]}`).addToggle((t) =>
				t.setValue(this.settings.sports[sport]).onChange((v) => {
					this.settings.sports[sport] = v;
					this.save();
				}),
			);
		}

		this.numberSetting(
			el,
			t("Weekly workout goal"),
			t("Number of workouts per week (for streaks of completed weeks)."),
			this.settings.weeklyWorkoutGoal,
			(v) => (this.settings.weeklyWorkoutGoal = v ?? 3),
			{ min: 1, max: 21 },
		);

		new Setting(el)
			.setName(t("Streaks and badges"))
			.setDesc(t("Show streaks of completed weeks and program days, and badges on the Overview tab. Illness and vacation logged in the weekly plan don't break a streak."))
			.addToggle((t) =>
				t.setValue(this.settings.showStreaks).onChange((v) => {
					this.settings.showStreaks = v;
					this.save();
				}),
			);

		new Setting(el)
			.setName("Kettlebelly")
			.setDesc(t("Your kettlebell weights in kg, separated by commas (e.g. 12, 16, 24)."))
			.addText((t) =>
				t.setValue(this.settings.kettlebellsKg.join(", ")).onChange((v) => {
					this.settings.kettlebellsKg = parseNumberList(v);
					this.save();
				}),
			);

		this.numberSetting(
			el,
			t("Barbell (kg)"),
			t("For the plate and warm-up set calculator in workout logging. An Olympic bar weighs 20 kg, a women's bar 15 kg."),
			this.settings.barbellKg,
			(v) => (this.settings.barbellKg = v ?? 20),
			{ min: 1, max: 60, step: 0.5 },
		);
		new Setting(el)
			.setName(t("Plates"))
			.setDesc(t("Plate weights you have available, in kg, separated by commas or spaces (decimal point: 2.5)."))
			.addText((t) =>
				t.setValue(this.settings.platesKg.join(", ")).onChange((v) => {
					const plates = parseNumberList(v);
					if (plates.length > 0) {
						this.settings.platesKg = plates.sort((a, b) => b - a);
						this.save();
					}
				}),
			);

		new Setting(el)
			.setName(t("Daily counter buttons"))
			.setDesc(t("How many reps the quick buttons add, e.g. 5, 10, 15."))
			.addText((t) =>
				t.setValue(this.settings.counterSteps.join(", ")).onChange((v) => {
					const steps = parseNumberList(v).filter(Number.isInteger);
					if (steps.length > 0) {
						this.settings.counterSteps = steps;
						this.save();
					}
				}),
			);

		const muscles = el.createEl("details", { cls: "bf-settings-details" });
		muscles.createEl("summary", {
			text: t("Muscle groups I'm focusing on ({focusMuscles_length})", { focusMuscles_length: this.settings.focusMuscles.length }),
		});
		muscles.createEl("p", {
			cls: "setting-item-description",
			text: t("For these muscle groups the plugin warns about low weekly volume."),
		});
		for (const muscle of MUSCLES) {
			new Setting(muscles).setName(MUSCLE_LABELS[muscle]).addToggle((toggle) =>
				toggle.setValue(this.settings.focusMuscles.includes(muscle)).onChange((v) => {
					const set = new Set(this.settings.focusMuscles);
					if (v) set.add(muscle);
					else set.delete(muscle);
					this.settings.focusMuscles = MUSCLES.filter((m) => set.has(m));
					muscles.querySelector("summary")?.setText(
						t("Muscle groups I'm focusing on ({focusMuscles_length})", { focusMuscles_length: this.settings.focusMuscles.length }),
					);
					this.save();
				}),
			);
		}
	}

	private displayRunImport(el: HTMLElement): void {
		new Setting(el)
			.setName(t("Import run from file"))
			.setDesc(t("A run from a GPX, TCX or FIT file – works without a Strava subscription. The file is read only on this device and isn't sent anywhere."))
			.setHeading();
		const guide = el.createEl("details", { cls: "bf-settings-details" });
		guide.createEl("summary", { text: t("Guide: where to get the file") });
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
		new Setting(el)
			.setName(t("Import runs"))
			.setDesc(t("Choose one or more .gpx, .tcx or .fit files."))
			.addButton((b) => b.setButtonText(t("Choose files")).onClick(() => this.plugin.pickRunFiles()));
	}

	private displayDailyImport(el: HTMLElement): void {
		new Setting(el)
			.setName(t("Import daily data from CSV"))
			.setDesc(t("Steps, sleep duration, HRV, resting heart rate and weight from a watch or app export. Only fills in values missing from the journal; logged values aren't overwritten. The file is read only on this device."))
			.setHeading();
		const guide = el.createEl("details", { cls: "bf-settings-details" });
		guide.createEl("summary", { text: t("Which files it reads") });
		guide.createEl("p", {
			cls: "setting-item-description",
			text: t("A CSV with a date column and at least one column recognized by its name (Czech or English): steps (Steps, Step count), sleep duration (Sleep duration – hours, minutes, seconds or 7:45), HRV (HRV, rMSSD), resting heart rate (Resting heart rate) or weight (Weight). Scores, goals and sleep stages are skipped. Several rows for one day are merged."),
		});
		guide.createEl("p", {
			cls: "setting-item-description",
			text: t("Example: Google Fit via Google Takeout – the file Daily activity metrics.csv contains steps. Elonga has no export, so its HRV is still copied by hand. Tested only on hand-built files; before writing you'll see what will be added."),
		});
		new Setting(el)
			.setName(t("Import daily data"))
			.setDesc(t("Choose a .csv file."))
			.addButton((b) => b.setButtonText(t("Choose file")).onClick(() => this.plugin.pickDailyFile()));
	}

	private displayHistoryImport(el: HTMLElement): void {
		new Setting(el)
			.setName(t("History import from Strong and Hevy"))
			.setDesc(t("Brings over strength workouts from a CSV export: exercises, sets, weights, warm-up and drop sets, supersets. The file is read only on this device."))
			.setHeading();
		const guide = el.createEl("details", { cls: "bf-settings-details" });
		guide.createEl("summary", { text: t("Guide: where to get the export and what to expect") });
		const list = guide.createEl("ul");
		const strong = list.createEl("li");
		strong.createEl("strong", { text: "Strong: " });
		strong.appendText(t("in the app, open Settings and choose Export Workouts (under Data Management). The file doesn't include the weight unit – pick it below according to what you log in the app."));
		const hevy = list.createEl("li");
		hevy.createEl("strong", { text: "Hevy: " });
		hevy.appendText(t("in the app settings, find the data export and download the workout file (workout data, CSV). The file includes the unit."));
		guide.createEl("p", {
			cls: "setting-item-description",
			text: t("Exercise names are matched with the library (English names too); unknown exercises keep their original name. Set RPE is converted to RIR (10 − RPE). Runs and other cardio are skipped – import runs from a GPX or TCX file. Before the import you'll see a summary and confirm it; workouts already in the journal are skipped. The import has only been tested on files built according to both apps' help pages – try it on a backup first."),
		});
		let unit: WeightUnit = "kg";
		new Setting(el)
			.setName(t("Import history"))
			.setDesc(t("Choose a CSV file. The unit only applies to a Strong export."))
			.addDropdown((d) =>
				d
					.addOption("kg", "Strong v kilogramech")
					.addOption("lb", t("Strong in pounds"))
					.setValue(unit)
					.onChange((v) => (unit = v === "lb" ? "lb" : "kg")),
			)
			.addButton((b) => b.setButtonText(t("Choose file")).onClick(() => this.plugin.pickHistoryFile(unit)));
	}

	private displayStrava(el: HTMLElement): void {
		const strava = this.settings.strava;
		const auth = this.plugin.strava;
		new Setting(el)
			.setName("Strava")
			.setDesc(t("Import runs from Strava. Each user uses their own API application – the credentials stay in this vault only."))
			.setHeading();

		const guide = el.createEl("details", { cls: "bf-settings-details" });
		guide.createEl("summary", { text: t("Guide: how to create an API application on Strava") });
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

		new Setting(el).setName("Client ID").addText((t) =>
			t.setValue(strava.clientId).onChange((v) => {
				strava.clientId = v.trim();
				this.save();
			}),
		);
		new Setting(el)
			.setName("Client Secret")
			.setDesc(t("Stored only in this plugin's data.json file."))
			.addText((t) => {
				t.inputEl.type = "password";
				t.inputEl.autocomplete = "off";
				t.setValue(strava.clientSecret).onChange((v) => {
					strava.clientSecret = v.trim();
					this.save();
				});
			});

		const run = async (action: () => Promise<void>, done: string) => {
			try {
				// Právě napsané údaje uložit hned, ať je připojení vidí.
				this.plugin.requestSaveSettings.run();
				await action();
				new Notice(done);
			} catch (err) {
				new Notice(`Strava: ${err instanceof Error ? err.message : String(err)}`);
			}
			this.display();
		};

		new Setting(el)
			.setName(t("Activity types"))
			.setDesc(t("Which Strava activity types are imported as runs, separated by commas. Default: Run, TrailRun, VirtualRun."))
			.addText((t) =>
				t.setValue(strava.activityTypes.join(", ")).onChange((v) => {
					const types = v
						.split(",")
						.map((part) => part.trim())
						.filter((part) => part !== "");
					if (types.length > 0) {
						strava.activityTypes = types;
						this.save();
					}
				}),
			);
		this.numberSetting(
			el,
			t("First sync"),
			t("How many days back to download on the first sync."),
			strava.initialDays,
			(v) => (strava.initialDays = v ?? 90),
			{ min: 1, max: 3650 },
		);

		if (auth.isConnected) {
			const last = strava.lastSyncAt > 0 ? new Date(strava.lastSyncAt * 1000).toLocaleString("cs-CZ") : t("not yet");
			new Setting(el)
				.setName(t("Sync"))
				.setDesc(t("Downloads new runs; only runs when you start it. Last: {last}.", { last }))
				.addButton((b) =>
					b.setButtonText("Synchronizovat").onClick(async () => {
						b.setDisabled(true);
						await this.plugin.syncStrava();
						this.display();
					}),
				);
			new Setting(el)
				.setName(strava.athleteName ? t("Connected: {athleteName}", { athleteName: strava.athleteName }) : t("Connected"))
				.setDesc(t("Disconnecting removes the sign-in on this device only. Revoke the app's access on Strava under Settings → My Apps."))
				.addButton((b) => b.setButtonText("Odpojit").onClick(() => void run(() => auth.disconnect(), "Strava odpojena.")));
		} else {
			if (auth.canUseLocalServer) {
				new Setting(el)
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
			new Setting(el)
				.setName(auth.canUseLocalServer ? t("Connect manually") : t("Connect"))
				.setDesc(t("Opens Strava; after you allow access, copy the address from the browser and paste it here. Works on mobile too."))
				.addButton((b) => {
					b.setButtonText(t("Connect manually")).onClick(() => {
						try {
							this.plugin.requestSaveSettings.run();
							auth.openManualAuthorization();
						} catch (err) {
							new Notice(`Strava: ${err instanceof Error ? err.message : String(err)}`);
							return;
						}
						new StravaCodeModal(this.app, (text) => run(() => auth.connectWithPastedCode(text), t("Strava connected."))).open();
					});
					if (!auth.canUseLocalServer) b.setCta();
				});
		}
	}

	private displayFolders(el: HTMLElement): void {
		new Setting(el)
			.setName(t("Folders"))
			.setDesc(t("Subfolders are inside the root folder. Renaming doesn't move existing notes."))
			.setHeading();
		const folders = this.settings.folders;
		new Setting(el)
			.setName(t("Root folder"))
			.setDesc(t("Default: {root}", { root: DEFAULT_FOLDERS.root }))
			.addText((t) =>
				t.setValue(folders.root).onChange((v) => {
					const path = normalizeVaultPath(v);
					t.inputEl.toggleClass("bf-invalid", path === "");
					if (path) {
						folders.root = path;
						this.save();
					}
				}),
			);
		for (const key of Object.keys(FOLDER_LABELS) as (keyof typeof FOLDER_LABELS)[]) {
			new Setting(el)
				.setName(FOLDER_LABELS[key])
				.setDesc(t("Default: {v}", { v: DEFAULT_FOLDERS[key] }))
				.addText((t) =>
					t.setValue(folders[key]).onChange((v) => {
						const path = normalizeVaultPath(v);
						t.inputEl.toggleClass("bf-invalid", path === "");
						if (path) {
							folders[key] = path;
							this.save();
						}
					}),
				);
		}
		new Setting(el).setName(t("Create missing folders")).addButton((b) =>
			b.setButtonText(t("Create")).onClick(async () => {
				await this.plugin.createFolders(true);
			}),
		);
		new Setting(el)
			.setName(t("Add to library"))
			.setDesc(t("Creates missing exercises, built-in programs and workout templates. Existing notes aren't changed."))
			.addButton((b) =>
				b.setButtonText(t("Add", undefined, "missing")).onClick(async () => {
					await this.plugin.seedLibrary(true);
				}),
			);
		new Setting(el)
			.setName(t("Add exercise descriptions"))
			.setDesc(t("Adds the description, technique and common mistakes where they're missing in an exercise note. Existing text isn't overwritten."))
			.addButton((b) =>
				b.setButtonText(t("Add", undefined, "missing")).onClick(async () => {
					await this.plugin.fillExerciseTexts();
				}),
			);
		new Setting(el)
			.setName(t("Restore built-in programs"))
			.setDesc(t("Replaces the description and settings of the built-in programs with the current version from the plugin (after confirmation). Your own programs aren't changed."))
			.addButton((b) =>
				b.setButtonText(t("Restore")).onClick(async () => {
					await this.plugin.refreshBuiltinPrograms();
				}),
			);
	}

	private displayThresholds(el: HTMLElement): void {
		new Setting(el)
			.setName(t("Calculation thresholds and windows"))
			.setDesc(t("Defaults match the sources listed with each calculation."))
			.setHeading();
		const thresholds = this.settings.thresholds;
		for (const group of THRESHOLD_GROUPS) {
			const details = el.createEl("details", { cls: "bf-settings-details" });
			details.createEl("summary", { text: t(group.title) });
			for (const field of group.fields) {
				const unit = field.unit ? ` (${t(field.unit)})` : "";
				const desc = (field.desc ? `${t(field.desc)} ` : "") + t("Default: {value}{unit}.", { value: DEFAULT_THRESHOLDS[field.key], unit });
				this.numberSetting(
					details,
					t(field.label),
					desc,
					thresholds[field.key],
					(v) => {
						if (v !== null) thresholds[field.key] = v;
					},
					field,
				);
			}
		}
		new Setting(el).setName(t("Restore default thresholds")).addButton((b) =>
			b
				.setButtonText(t("Restore"))
				.setWarning()
				.onClick(async () => {
					const ok = await confirmAction(
						this.app,
						t("Restore default thresholds?"),
						t("All calculation thresholds and windows will be reset to their defaults. Your profile and other settings stay."),
						t("Restore"),
					);
					if (!ok) return;
					this.settings.thresholds = structuredClone(DEFAULT_THRESHOLDS);
					this.save();
					new Notice(t("Thresholds restored to defaults."));
					this.display();
				}),
		);
	}

	// ---------- Pomocné ----------

	private numberSetting(
		el: HTMLElement,
		name: string,
		desc: string,
		value: number | null,
		apply: (value: number | null) => void,
		options: NumberOptions,
	): void {
		new Setting(el)
			.setName(name)
			.setDesc(desc)
			.addText((t) => {
				t.inputEl.type = "number";
				t.inputEl.min = String(options.min);
				t.inputEl.max = String(options.max);
				t.inputEl.step = String(options.step ?? 1);
				t.inputEl.addClass("bf-number-input");
				t.setValue(value === null ? "" : String(value));
				t.onChange((raw) => {
					const text = raw.trim().replace(",", ".");
					const parsed = text === "" ? null : Number(text);
					const valid =
						parsed === null
							? options.optional === true
							: Number.isFinite(parsed) && parsed >= options.min && parsed <= options.max;
					t.inputEl.toggleClass("bf-invalid", !valid);
					if (!valid) return;
					apply(parsed);
					this.save();
				});
			});
	}
}
