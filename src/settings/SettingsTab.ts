// Stránka nastavení pluginu – deklarativně přes getSettingDefinitions (Obsidian 1.13), ať ji najde i hledání v nastavení.
// Skupiny: bez nadpisu jazyk a režim, Profil a výživa, Trénink a vybavení, Import dat (importSettings.ts),
// Knihovna, programy a složky, Záloha a export, Pokročilé (librarySettings.ts).

import { PluginSettingTab, type App, type SettingDefinitionItem, type SettingGroupItem } from "obsidian";
import type BetterFormPlugin from "../main";
import { MUSCLE_LABELS, MUSCLES, SPORT_LABELS, SPORTS } from "../model/constants";
import { DEFAULT_NUTRITION, DEFAULT_SETTINGS, RMR_FORMULAS, parseNumberList, parseTextList, type ActivityLevel, type SettingsSex } from "./settings";
import { RMR_FORMULA_LABELS } from "../calc/nutrition";
import { MEDICATION_LABELS, MEDICATIONS } from "../calc/supplementSafety";
import { normalizeVaultPath } from "../data/paths";
import { isLanguage, LANGUAGE_LABELS, LANGUAGES, t } from "../i18n";
import { importGroup } from "./importSettings";
import { advancedGroup, backupGroup, libraryGroup } from "./librarySettings";
import { getPath, note, optionalNumber, setPath, type SettingsHost } from "./settingsUi";

export class BetterFormSettingTab extends PluginSettingTab implements SettingsHost {
	constructor(
		app: App,
		readonly plugin: BetterFormPlugin,
	) {
		super(app, plugin);
	}

	override getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			// První skupina bez nadpisu (pravidla Obsidianu): jazyk, průvodce a režim.
			{ type: "group", items: [this.language(), ...this.mode()] },
			{ type: "group", heading: t("Profile and nutrition"), items: this.profile() },
			{ type: "group", heading: t("Training and equipment"), items: this.training() },
			importGroup(this),
			libraryGroup(this),
			backupGroup(this),
			advancedGroup(this),
		];
	}

	/** Nastavení jsou vnořená („thresholds.sleepTargetHours“) – klíč ovládacího prvku je cesta s tečkou. */
	override getControlValue(key: string): unknown {
		return getPath(this.settings, key);
	}

	override setControlValue(key: string, value: unknown): void {
		// Složky se ukládají v normalizovaném tvaru (bez lomítek na krajích).
		const folder = typeof value === "string" && (key.startsWith("folders.") || key === "backupFolder");
		setPath(this.settings, key, folder ? normalizeVaultPath(value) : value);
		this.save();
	}

	get settings() {
		return this.plugin.settings;
	}

	save(): void {
		this.plugin.requestSaveSettings();
	}

	// ---------- Sekce ----------

	/** Jazyk: vždy dvojjazyčně, ať ho najde i ten, kdo druhému jazyku nerozumí. */
	private language(): SettingGroupItem {
		return {
			// Anglický název zůstane i v jiném jazyce, aby přepínač našel každý.
			name: this.settings.language === "en" ? "Language" : `Language / ${t("Language")}`,
			desc: t("Interface language. Notes created earlier (library, texts generated in notes) switch over with Translate notes. Command names change after the plugin restarts."),
			render: (s) =>
				void s
					.addDropdown((d) => {
						for (const language of LANGUAGES) d.addOption(language, LANGUAGE_LABELS[language]);
						d.setValue(this.settings.language).onChange(async (value) => {
							if (!isLanguage(value)) return;
							await this.plugin.setLanguage(value);
							this.update();
						});
					})
					// Knihovnu a texty v poznámkách z dřívějška převede do zvoleného jazyka (s potvrzením).
					.addButton((b) => b.setButtonText(t("Translate notes")).onClick(() => void this.plugin.renameBuiltinToLanguage())),
		};
	}

	private mode(): SettingGroupItem[] {
		return [
			{
				name: t("Setup guide"),
				desc: t("Profile, goal, mode and sports in one short form."),
				render: (s) => void s.addButton((b) => b.setButtonText(t("Start guide")).onClick(() => this.plugin.openOnboarding())),
			},
			{
				name: t("Display mode"),
				desc: t("Basic = cards for basic exercises and running with quick logging; advanced tabs are hidden. The data stays the same."),
				control: { type: "dropdown", key: "mode", options: { full: t("Full"), basic: t("Basic") } },
			},
			{
				name: t("Exercises in Basic mode"),
				desc: t("Exercise names from the library, separated by commas; cardio exercises (running, jump rope) get a summary card."),
				render: (s) =>
					void s.addText((text) =>
						text.setValue(this.settings.basicExercises.join(", ")).onChange((v) => {
							this.settings.basicExercises = parseTextList(v);
							this.save();
						}),
					),
			},
		];
	}

	private profile(): SettingGroupItem[] {
		const profile = this.settings.profile;
		return [
			note(t("Data for calculations (heart rate zones, nutrition). Nothing leaves the vault.")),
			{
				name: t("Name", undefined, "person"),
				desc: t("Optional."),
				render: (s) =>
					void s.addText((text) =>
						text.setValue(profile.name).onChange((v) => {
							profile.name = v.trim();
							this.save();
						}),
					),
			},
			{
				name: t("Sex"),
				desc: t("Used in the resting energy equation."),
				render: (s) =>
					void s.addDropdown((d) =>
						d
							.addOptions({ "": t("Not set"), male: t("Male"), female: t("Female") })
							.setValue(profile.sex ?? "")
							.onChange((v) => {
								profile.sex = v === "" ? null : (v as SettingsSex);
								this.save();
							}),
					),
			},
			{
				name: t("Year of birth"),
				render: optionalNumber(this, "profile.birthYear", { min: 1900, max: new Date().getFullYear() }),
			},
			{ name: t("Height"), desc: "cm", render: optionalNumber(this, "profile.heightCm", { min: 100, max: 250 }) },
			{
				name: t("Default body weight"),
				desc: t("kg – used until you log your weight in the morning check-in."),
				render: optionalNumber(this, "profile.weightKg", { min: 30, max: 250, step: 0.1 }),
			},
			{
				name: t("Body fat"),
				desc: t("% – optional."),
				render: optionalNumber(this, "profile.bodyFatPct", { min: 3, max: 60, step: 0.1 }),
			},
			{
				name: t("Maximum heart rate (HRmax)"),
				desc: t("Measured value; if missing, it's estimated from age (Tanaka 2001)."),
				render: optionalNumber(this, "profile.hrMax", { min: 120, max: 230 }),
			},
			{
				name: t("Activity outside training"),
				desc: t("A normal day without training – workouts are counted separately in nutrition. Sedentary = you sit most of the day (school, office); lightly active = on your feet part of the day or walking a lot; active = physical work."),
				control: { type: "dropdown", key: "profile.activity", options: { sedentary: t("Sedentary"), light: t("Lightly active"), active: t("Active job") } },
			},
			{
				name: t("Goal"),
				control: { type: "dropdown", key: "profile.goal", options: { lose: t("Lose weight"), maintain: t("Maintain"), gain: t("Gain") } },
			},
			this.medications(),
			this.nutrition(),
		];
	}

	/** Léky – jen kvůli upozornění na interakce se suplementy (karta Suplementy). */
	private medications(): SettingGroupItem {
		const profile = this.settings.profile;
		return {
			type: "page",
			name: t("Medication I take"),
			desc: t("Only used to warn about interactions with supplements on the Supplements tab. It stays in this vault."),
			displayValue: () => (profile.medications.length > 0 ? String(profile.medications.length) : ""),
			items: [
				{
					type: "group",
					items: MEDICATIONS.map((medication): SettingGroupItem => ({
						name: MEDICATION_LABELS[medication],
						render: (s) =>
							void s.addToggle((toggle) =>
								toggle.setValue(profile.medications.includes(medication)).onChange((v) => {
									const set = new Set(profile.medications);
									if (v) set.add(medication);
									else set.delete(medication);
									profile.medications = MEDICATIONS.filter((m) => set.has(m));
									this.save();
									this.update();
								}),
							),
					})),
				},
			],
		};
	}

	/** Výpočet výživy – podrobné koeficienty na vlastní stránce pod profilem. */
	private nutrition(): SettingGroupItem {
		const factors: [ActivityLevel, string][] = [
			["sedentary", t("Factor – sedentary")],
			["light", t("Factor – lightly active")],
			["active", t("Factor – active job")],
		];
		const rate = (key: "lossRatePctMin" | "lossRatePctMax" | "gainSurplusPctMin" | "gainSurplusPctMax" | "proteinGPerKg", name: string, desc: string, min: number, max: number, step = 1): SettingGroupItem => ({
			name,
			desc,
			control: { type: "number", key: `nutrition.${key}`, min, max, step, defaultValue: DEFAULT_NUTRITION[key] },
		});
		return {
			type: "page",
			name: t("Nutrition calculation"),
			desc: t("How the recommended intake is calculated (Nutrition tab). Defaults follow the sources listed on the tab."),
			items: [
				{
					type: "group",
					items: [
						{
							name: t("Resting energy equation"),
							desc: t("ten Haaf was developed in athletes aged 18–35 training at least 3 h a week and is the most accurate for them; for everyone else Mifflin–St Jeor is more reliable. The fat-free mass equations need your body fat filled in; without it, ten Haaf by weight is used. The Nutrition tab tells you when a different equation suits your profile and offers to switch."),
							control: { type: "dropdown", key: "nutrition.rmrFormula", options: Object.fromEntries(RMR_FORMULAS.map((f) => [f, RMR_FORMULA_LABELS[f]])) },
						},
						...factors.map(([level, name]): SettingGroupItem => ({
							name,
							desc: t("Multiple of resting expenditure for everyday activity outside training (estimate – practice). Default: {v}.", { v: DEFAULT_NUTRITION.activityFactors[level] }),
							control: { type: "number", key: `nutrition.activityFactors.${level}`, min: 1, max: 2.5, step: 0.05, defaultValue: DEFAULT_NUTRITION.activityFactors[level] },
						})),
						rate("lossRatePctMin", t("Weight loss – slowest pace"), t("% of body weight per week (Helms 2014). Default: 0.5."), 0.1, 1.5, 0.1),
						rate("lossRatePctMax", t("Weight loss – fastest pace"), t("% of body weight per week (Helms 2014). Default: 1."), 0.1, 1.5, 0.1),
						rate("gainSurplusPctMin", t("Gaining – surplus from"), t("% of expenditure (practice). Default: 5."), 0, 25),
						rate("gainSurplusPctMax", t("Gaining – surplus up to"), t("% of expenditure (practice). Default: 10."), 0, 25),
						rate("proteinGPerKg", t("Protein"), t("g per kg of body weight – upper end of the recommendation (range 1.6–2.2; Morton 2018). Default: 2."), 1.2, 3.5, 0.1),
					],
				},
			],
		};
	}

	private training(): SettingGroupItem[] {
		const focusName = () => t("Muscle groups I'm focusing on ({focusMuscles_length})", { focusMuscles_length: this.settings.focusMuscles.length });
		return [
			...SPORTS.map((sport): SettingGroupItem => ({
				name: t("Sport: {v}", { v: SPORT_LABELS[sport] }),
				control: { type: "toggle", key: `sports.${sport}` },
			})),
			{
				name: t("Weekly workout goal"),
				desc: t("Number of workouts per week (for streaks of completed weeks)."),
				control: { type: "number", key: "weeklyWorkoutGoal", min: 1, max: 21, step: 1, defaultValue: DEFAULT_SETTINGS.weeklyWorkoutGoal },
			},
			{
				name: t("Streaks and badges"),
				desc: t("Show streaks of completed weeks and program days, and badges on the Overview tab. Illness and vacation logged in the weekly plan don't break a streak."),
				control: { type: "toggle", key: "showStreaks" },
			},
			{
				name: t("Kettlebells"),
				desc: t("Your kettlebell weights in kg, separated by commas (e.g. 12, 16, 24)."),
				render: (s) =>
					void s.addText((text) =>
						text.setValue(this.settings.kettlebellsKg.join(", ")).onChange((v) => {
							this.settings.kettlebellsKg = parseNumberList(v);
							this.save();
						}),
					),
			},
			{
				name: t("Barbell (kg)"),
				desc: t("For the plate and warm-up set calculator in workout logging. An Olympic bar weighs 20 kg, a women's bar 15 kg."),
				control: { type: "number", key: "barbellKg", min: 1, max: 60, step: 0.5, defaultValue: DEFAULT_SETTINGS.barbellKg },
			},
			{
				name: t("Plates"),
				desc: t("Plate weights you have available, in kg, separated by commas or spaces (decimal point: 2.5)."),
				render: (s) =>
					void s.addText((text) =>
						text.setValue(this.settings.platesKg.join(", ")).onChange((v) => {
							const plates = parseNumberList(v);
							if (plates.length > 0) {
								this.settings.platesKg = plates.sort((a, b) => b - a);
								this.save();
							}
						}),
					),
			},
			{
				name: t("Daily counter buttons"),
				desc: t("How many reps the quick buttons add, e.g. 5, 10, 15."),
				render: (s) =>
					void s.addText((text) =>
						text.setValue(this.settings.counterSteps.join(", ")).onChange((v) => {
							const steps = parseNumberList(v).filter(Number.isInteger);
							if (steps.length > 0) {
								this.settings.counterSteps = steps;
								this.save();
							}
						}),
					),
			},
			{
				type: "page",
				name: focusName(),
				desc: t("For these muscle groups the plugin warns about low weekly volume."),
				items: [
					{
						type: "group",
						items: MUSCLES.map((muscle): SettingGroupItem => ({
							name: MUSCLE_LABELS[muscle],
							render: (s) =>
								void s.addToggle((toggle) =>
									toggle.setValue(this.settings.focusMuscles.includes(muscle)).onChange((v) => {
										const set = new Set(this.settings.focusMuscles);
										if (v) set.add(muscle);
										else set.delete(muscle);
										this.settings.focusMuscles = MUSCLES.filter((m) => set.has(m));
										this.save();
										// Počet v názvu stránky.
										this.update();
									}),
								),
						})),
					},
				],
			},
		];
	}
}
