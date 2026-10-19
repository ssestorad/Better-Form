// Stránka nastavení pluginu. Skupiny: bez nadpisu jazyk a režim, Profil a výživa, Trénink a vybavení,
// Import dat (importSettings.ts), Knihovna, programy a složky, Záloha a export, Pokročilé (librarySettings.ts).

import { PluginSettingTab, Setting, type App } from "obsidian";
import type BetterFormPlugin from "../main";
import { MUSCLE_LABELS, MUSCLES, SPORT_LABELS, SPORTS } from "../model/constants";
import { DEFAULT_NUTRITION, RMR_FORMULAS, parseNumberList, type ActivityLevel, type AppMode, type BodyGoal, type RmrFormulaSetting, type SettingsSex } from "./settings";
import { RMR_FORMULA_LABELS } from "../calc/nutrition";
import { isLanguage, LANGUAGE_LABELS, LANGUAGES, t } from "../i18n";
import { displayImports } from "./importSettings";
import { displayAdvanced, displayBackup, displayLibrary } from "./librarySettings";
import { collapsible, numberSetting, type NumberOptions, type SettingsHost } from "./settingsUi";

export class BetterFormSettingTab extends PluginSettingTab implements SettingsHost {
	constructor(
		app: App,
		readonly plugin: BetterFormPlugin,
	) {
		super(app, plugin);
	}

	override display(): void {
		const el = this.containerEl;
		el.empty();
		// První skupina bez nadpisu (pravidla Obsidianu): jazyk, průvodce a režim.
		this.displayLanguage(el);
		this.displayMode(el);
		this.displayProfile(el);
		this.displayTraining(el);
		displayImports(el, this);
		displayLibrary(el, this);
		displayBackup(el, this);
		displayAdvanced(el, this);
	}

	get settings() {
		return this.plugin.settings;
	}

	save(): void {
		this.plugin.requestSaveSettings();
	}

	private numberSetting(el: HTMLElement, name: string, desc: string, value: number | null, apply: (value: number | null) => void, options: NumberOptions): void {
		numberSetting(this, el, name, desc, value, apply, options);
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
			.setName(t("Profile and nutrition"))
			.setDesc(t("Data for calculations (heart rate zones, nutrition). Nothing leaves the vault."))
			.setHeading();

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
		this.displayNutrition(el);
	}

	/** Výpočet výživy – podrobné koeficienty, sbalené pod profilem. */
	private displayNutrition(parent: HTMLElement): void {
		const nutrition = this.settings.nutrition;
		const el = collapsible(parent, t("Nutrition calculation"));
		el.createEl("p", {
			cls: "setting-item-description",
			text: t("How the recommended intake is calculated (Nutrition tab). Defaults follow the sources listed on the tab."),
		});
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

	private displayMode(el: HTMLElement): void {
		new Setting(el)
			.setName(t("Setup guide"))
			.setDesc(t("Profile, goal, mode and sports in one short form."))
			.addButton((b) => b.setButtonText(t("Start guide")).onClick(() => this.plugin.openOnboarding()));
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
			new Setting(el).setName(t("Sport: {v}", { v: SPORT_LABELS[sport] })).addToggle((t) =>
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
			.setName(t("Kettlebells"))
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


}
