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
	days: "Deník (denní poznámky)",
	workouts: "Tréninky",
	exercises: "Knihovna cviků",
	templates: "Šablony tréninků",
	programs: "Programy",
	supplements: "Suplementy",
	goals: "Cíle",
	pains: "Bolesti a zranění",
	gear: "Vybavení",
	tests: "Testy maxim",
	summaries: "Měsíční souhrny",
	exports: "Export do CSV",
	plans: "Plány týdne",
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
			.setName("Language / Jazyk")
			.setDesc(t("Interface and newly created notes. Command names change after the plugin restarts. / Rozhraní a nově zakládané poznámky. Názvy příkazů se změní po restartu pluginu."))
			.addDropdown((d) => {
				for (const language of LANGUAGES) d.addOption(language, LANGUAGE_LABELS[language]);
				d.setValue(this.settings.language).onChange(async (value) => {
					if (!isLanguage(value)) return;
					await this.plugin.setLanguage(value);
					this.display();
				});
			});
	}

	private displayProfile(el: HTMLElement): void {
		const profile = this.settings.profile;
		new Setting(el)
			.setName(t("Profil"))
			.setDesc(t("Údaje pro výpočty (tepové zóny, výživa). Nic se neodesílá mimo vault."))
			.setHeading();
		new Setting(el)
			.setName(t("Průvodce nastavením"))
			.setDesc(t("Profil, cíl, režim a sporty v jednom krátkém formuláři."))
			.addButton((b) => b.setButtonText(t("Spustit průvodce")).onClick(() => this.plugin.openOnboarding()));

		new Setting(el).setName(t("Jméno")).setDesc(t("Volitelné.")).addText((t) =>
			t.setValue(profile.name).onChange((v) => {
				profile.name = v.trim();
				this.save();
			}),
		);
		new Setting(el).setName(t("Pohlaví")).setDesc(t("Používá se ve vzorci klidového výdeje.")).addDropdown((d) =>
			d
				.addOptions({ "": t("Nevyplněno"), male: t("Muž"), female: t("Žena") })
				.setValue(profile.sex ?? "")
				.onChange((v) => {
					profile.sex = v === "" ? null : (v as SettingsSex);
					this.save();
				}),
		);
		this.numberSetting(el, t("Rok narození"), "", profile.birthYear, (v) => (profile.birthYear = v), {
			min: 1900,
			max: new Date().getFullYear(),
			optional: true,
		});
		this.numberSetting(el, t("Výška"), "cm", profile.heightCm, (v) => (profile.heightCm = v), {
			min: 100,
			max: 250,
			optional: true,
		});
		this.numberSetting(
			el,
			t("Výchozí hmotnost"),
			t("kg – používá se, dokud nezapíšeš hmotnost v ranním check-inu."),
			profile.weightKg,
			(v) => (profile.weightKg = v),
			{ min: 30, max: 250, step: 0.1, optional: true },
		);
		this.numberSetting(el, t("Podíl tuku"), t("% – volitelně."), profile.bodyFatPct, (v) => (profile.bodyFatPct = v), {
			min: 3,
			max: 60,
			step: 0.1,
			optional: true,
		});
		this.numberSetting(
			el,
			t("Maximální tep (HRmax)"),
			t("Změřená hodnota; když chybí, odhadne se z věku (Tanaka 2001)."),
			profile.hrMax,
			(v) => (profile.hrMax = v),
			{ min: 120, max: 230, optional: true },
		);
		new Setting(el)
			.setName(t("Aktivita mimo trénink"))
			.setDesc(t("Běžný den bez tréninku – tréninky se ve výživě počítají zvlášť. Sedavá = většinu dne sedíš (škola, kancelář); lehce aktivní = část dne na nohou nebo hodně chodíš; aktivní = fyzická práce."))
			.addDropdown((d) =>
			d
				.addOptions({ sedentary: t("Sedavá"), light: t("Lehce aktivní"), active: t("Aktivní práce") })
				.setValue(profile.activity)
				.onChange((v) => {
					profile.activity = v as ActivityLevel;
					this.save();
				}),
		);
		new Setting(el).setName(t("Cíl")).addDropdown((d) =>
			d
				.addOptions({ lose: t("Hubnutí"), maintain: t("Udržování"), gain: t("Nabírání") })
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
			.setName(t("Výživa"))
			.setDesc(t("Výpočet doporučeného příjmu (karta Výživa). Výchozí hodnoty podle zdrojů uvedených na kartě."))
			.setHeading();
		new Setting(el)
			.setName(t("Rovnice klidového výdeje"))
			.setDesc(t("ten Haaf vznikl na sportovcích 18–35 let trénujících aspoň 3 h týdně a u nich je nejpřesnější; pro ostatní je spolehlivější Mifflin–St Jeor. Rovnice z beztukové hmoty potřebují vyplněný podíl tuku; bez něj se použije ten Haaf z hmotnosti. Karta Výživa napíše, když se k tvému profilu hodí jiná rovnice, a nabídne přepnutí."))
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
			["sedentary", t("Koeficient – sedavá")],
			["light", t("Koeficient – lehce aktivní")],
			["active", t("Koeficient – aktivní práce")],
		];
		for (const [level, label] of factors) {
			this.numberSetting(
				el,
				label,
				t("Násobek klidového výdeje za běžnou aktivitu mimo trénink (odhad – praxe). Výchozí: {v}.", { v: DEFAULT_NUTRITION.activityFactors[level] }),
				nutrition.activityFactors[level],
				(v) => {
					if (v !== null) nutrition.activityFactors[level] = v;
				},
				{ min: 1, max: 2.5, step: 0.05 },
			);
		}
		this.numberSetting(el, t("Hubnutí – nejpomalejší tempo"), t("% hmotnosti za týden (Helms 2014). Výchozí: 0,5."), nutrition.lossRatePctMin, (v) => {
			if (v !== null) nutrition.lossRatePctMin = v;
		}, { min: 0.1, max: 1.5, step: 0.1 });
		this.numberSetting(el, t("Hubnutí – nejrychlejší tempo"), t("% hmotnosti za týden (Helms 2014). Výchozí: 1."), nutrition.lossRatePctMax, (v) => {
			if (v !== null) nutrition.lossRatePctMax = v;
		}, { min: 0.1, max: 1.5, step: 0.1 });
		this.numberSetting(el, t("Nabírání – přebytek od"), t("% výdeje (praxe). Výchozí: 5."), nutrition.gainSurplusPctMin, (v) => {
			if (v !== null) nutrition.gainSurplusPctMin = v;
		}, { min: 0, max: 25 });
		this.numberSetting(el, t("Nabírání – přebytek do"), t("% výdeje (praxe). Výchozí: 10."), nutrition.gainSurplusPctMax, (v) => {
			if (v !== null) nutrition.gainSurplusPctMax = v;
		}, { min: 0, max: 25 });
		this.numberSetting(
			el,
			t("Bílkoviny"),
			t("g na kg hmotnosti – horní hranice doporučení (rozsah 1,6–2,2; Morton 2018). Výchozí: 2."),
			nutrition.proteinGPerKg,
			(v) => {
				if (v !== null) nutrition.proteinGPerKg = v;
			},
			{ min: 1.2, max: 3.5, step: 0.1 },
		);
	}

	private displayPrograms(el: HTMLElement): void {
		new Setting(el).setName(t("Programy")).setHeading();
		new Setting(el)
			.setName(t("Program ze souboru"))
			.setDesc(t("Vyber soubor .md, .txt, .json nebo .yaml – vznikne z něj vlastní program v knihovně (neaktivní). Soubor zůstává v počítači, nikam se neodesílá."))
			.addButton((b) => b.setButtonText(t("Vybrat soubor")).setCta().onClick(() => this.plugin.pickProgramFile()));
		new Setting(el)
			.setName(t("Program z vloženého textu"))
			.setDesc(t("Stejné formáty jako u souboru – hodí se pro text zkopírovaný od kamaráda."))
			.addButton((b) => b.setButtonText(t("Vložit text")).onClick(() => this.plugin.openProgramImport()));

		const help = el.createEl("details", { cls: "bf-settings-details" });
		help.createEl("summary", { text: t("Jak má soubor vypadat") });
		help.createEl("p", {
			cls: "setting-item-description",
			text: t("Nejjednodušší je obyčejný seznam: nadpis = název programu, nadpis se dny (např. „Pondělí a pátek“) platí pro odrážky pod ním, každá odrážka je „Cvik: cíl“. Dny jde napsat i řádkem „Dny: po, st, pá“ nebo do závorky za položku."),
		});
		help.createEl("pre", { text: PROGRAM_FILE_EXAMPLE });
		const targets = help.createEl("ul", { cls: "setting-item-description" });
		for (const line of [
			t("3×10 – série × opakování"),
			t("3×45 s, 2 min – výdrž nebo čas"),
			t("5 km, 800 m – vzdálenost"),
			t("100 denně – denní součet (počítadlo)"),
			t("3× max – série na maximum"),
			t("3×60 % – série s procentem z testu maxima"),
			t("EMOM 10 min × 5 – každou minutu 5 opakování"),
			t("žebřík 1-2-3-4-5 – žebřík"),
		]) {
			targets.createEl("li", { text: line });
		}
		help.createEl("p", {
			cls: "setting-item-description",
			text: t("Čte se i poznámka programu z tohoto pluginu (s úvodním blokem mezi řádky ---) a JSON nebo YAML se stejnými klíči: name, days, duration_weeks, items (exercise, target). Řádky, kterým plugin neporozumí, vypíše po importu. Cviky, které nejsou v knihovně, se uloží pod zadaným názvem."),
		});
	}

	private displayBackup(el: HTMLElement): void {
		new Setting(el).setName(t("Export a záloha")).setHeading();
		new Setting(el)
			.setName("Export do CSV")
			.setDesc(t("Uloží tréninky a denní data jako CSV (oddělovač středník, desetinná čárka – otevře se v Excelu) do složky {root}/{exports}.", { root: this.settings.folders.root, exports: this.settings.folders.exports }))
			.addButton((b) => b.setButtonText(t("Exportovat")).onClick(() => void this.plugin.exportCsv()));
		new Setting(el)
			.setName(t("Složka záloh"))
			.setDesc(t("Cesta ve vaultu mimo kořenovou složku. Výchozí: Forma zálohy."))
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
			.setName(t("Zálohovat"))
			.setDesc(t("Zabalí celou kořenovou složku do jednoho souboru .zip ve složce záloh."))
			.addButton((b) => b.setButtonText(t("Zálohovat")).onClick(() => void this.plugin.backup()));
	}

	private displayMode(el: HTMLElement): void {
		new Setting(el).setName(t("Režim")).setHeading();
		new Setting(el)
			.setName(t("Režim zobrazení"))
			.setDesc(t("Základ = karty základních cviků a běhu s rychlým zápisem; pokročilé karty jsou skryté. Data zůstávají stejná."))
			.addDropdown((d) =>
				d
					.addOptions({ full: t("Plný"), basic: t("Základ") })
					.setValue(this.settings.mode)
					.onChange((v) => {
						this.settings.mode = v as AppMode;
						this.save();
					}),
			);
		new Setting(el)
			.setName(t("Cviky v režimu Základ"))
			.setDesc(t("Názvy cviků z knihovny oddělené čárkou; kardio cviky (Běh, Švihadlo) dostanou kartu s přehledem."))
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
		new Setting(el).setName(t("Trénink a vybavení")).setHeading();

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
			t("Týdenní cíl tréninků"),
			t("Počet tréninků za týden (pro série splněných týdnů)."),
			this.settings.weeklyWorkoutGoal,
			(v) => (this.settings.weeklyWorkoutGoal = v ?? 3),
			{ min: 1, max: 21 },
		);

		new Setting(el)
			.setName(t("Série a odznaky"))
			.setDesc(t("Zobrazovat série splněných týdnů a dnů programu a odznaky na kartě Přehled. Nemoc a dovolená zapsané v plánu týdne sérii nepřeruší."))
			.addToggle((t) =>
				t.setValue(this.settings.showStreaks).onChange((v) => {
					this.settings.showStreaks = v;
					this.save();
				}),
			);

		new Setting(el)
			.setName("Kettlebelly")
			.setDesc(t("Hmotnosti tvých zvonů v kg, oddělené čárkou (např. 12, 16, 24)."))
			.addText((t) =>
				t.setValue(this.settings.kettlebellsKg.join(", ")).onChange((v) => {
					this.settings.kettlebellsKg = parseNumberList(v);
					this.save();
				}),
			);

		this.numberSetting(
			el,
			t("Osa velké činky (kg)"),
			t("Pro kalkulačku kotoučů a rozcvičovacích sérií v zápisu tréninku. Olympijská osa má 20 kg, dámská 15 kg."),
			this.settings.barbellKg,
			(v) => (this.settings.barbellKg = v ?? 20),
			{ min: 1, max: 60, step: 0.5 },
		);
		new Setting(el)
			.setName(t("Kotouče"))
			.setDesc(t("Hmotnosti kotoučů, které máš k dispozici, v kg oddělené čárkou nebo mezerou (desetinná tečka: 2.5)."))
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
			.setName(t("Tlačítka denního počítadla"))
			.setDesc(t("Kolik opakování přidávají rychlá tlačítka, např. 5, 10, 15."))
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
			text: t("Partie, které cíleně trénuji ({focusMuscles_length})", { focusMuscles_length: this.settings.focusMuscles.length }),
		});
		muscles.createEl("p", {
			cls: "setting-item-description",
			text: t("U těchto partií plugin upozorní na nízký týdenní objem."),
		});
		for (const muscle of MUSCLES) {
			new Setting(muscles).setName(MUSCLE_LABELS[muscle]).addToggle((toggle) =>
				toggle.setValue(this.settings.focusMuscles.includes(muscle)).onChange((v) => {
					const set = new Set(this.settings.focusMuscles);
					if (v) set.add(muscle);
					else set.delete(muscle);
					this.settings.focusMuscles = MUSCLES.filter((m) => set.has(m));
					muscles.querySelector("summary")?.setText(
						t("Partie, které cíleně trénuji ({focusMuscles_length})", { focusMuscles_length: this.settings.focusMuscles.length }),
					);
					this.save();
				}),
			);
		}
	}

	private displayRunImport(el: HTMLElement): void {
		new Setting(el)
			.setName(t("Import běhu ze souboru"))
			.setDesc(t("Běh ze souboru GPX, TCX nebo FIT – funguje bez předplatného Stravy. Soubor se čte jen v tomto zařízení a nikam se neposílá."))
			.setHeading();
		const guide = el.createEl("details", { cls: "bf-settings-details" });
		guide.createEl("summary", { text: t("Návod: kde soubor vzít") });
		const list = guide.createEl("ul");
		const strava = list.createEl("li");
		strava.createEl("strong", { text: "Strava: " });
		strava.appendText(t("na webu strava.com otevři svou aktivitu, klikni na tři tečky (Více) a zvol Export GPX. V mobilní aplikaci export není."));
		const mapMyRun = list.createEl("li");
		mapMyRun.createEl("strong", { text: "MapMyRun: " });
		mapMyRun.appendText(t("na webu mapmyrun.com otevři trénink, klikni na tři tečky a zvol Download as TCX."));
		const watch = list.createEl("li");
		watch.createEl("strong", { text: t("Hodinky a jiné aplikace: ") });
		watch.appendText(t("většina umí export do GPX, TCX nebo FIT (Garmin Connect, Polar Flow, Suunto, Coros). FIT z hodinek obsahuje i tep."));
		guide.createEl("p", {
			cls: "setting-item-description",
			text: t("Z běhu se načte datum a čas, vzdálenost, čas v pohybu, tep, převýšení a nejrychlejší úseky. Vzdálenost z poloh a převýšení jsou odhad – od čísel v aplikaci se můžou o pár procent lišit. RPE, typ běhu a boty doplníš potom v seznamu běhů k doplnění. Tentýž soubor podruhé se přeskočí; ručně zapsaný běh ze stejného dne se stejnou vzdáleností se doplní o měřené údaje."),
		});
		new Setting(el)
			.setName(t("Importovat běhy"))
			.setDesc(t("Vyber jeden nebo víc souborů .gpx, .tcx nebo .fit."))
			.addButton((b) => b.setButtonText(t("Vybrat soubory")).onClick(() => this.plugin.pickRunFiles()));
	}

	private displayDailyImport(el: HTMLElement): void {
		new Setting(el)
			.setName(t("Import denních dat z CSV"))
			.setDesc(t("Kroky, délka spánku, HRV, klidový tep a váha z exportu hodinek nebo aplikace. Doplní jen hodnoty, které v deníku chybí; zapsané nepřepíše. Soubor se čte jen v tomto zařízení."))
			.setHeading();
		const guide = el.createEl("details", { cls: "bf-settings-details" });
		guide.createEl("summary", { text: t("Jaký soubor to přečte") });
		guide.createEl("p", {
			cls: "setting-item-description",
			text: t("CSV se sloupcem s datem a aspoň jedním sloupcem, který se pozná podle názvu (česky nebo anglicky): kroky (Steps, Step count), délka spánku (Sleep duration – hodiny, minuty, sekundy nebo 7:45), HRV (HRV, rMSSD), klidový tep (Resting heart rate) nebo váha (Weight). Skóre, cíle a fáze spánku se přeskočí. Víc řádků jednoho dne se sloučí."),
		});
		guide.createEl("p", {
			cls: "setting-item-description",
			text: t("Příklad: Google Fit přes Google Takeout – soubor Daily activity metrics.csv obsahuje kroky. Elonga export nenabízí, HRV z ní se dál opisuje ručně. Vyzkoušeno jen na ručně sestavených souborech; před zápisem se ukáže, co se doplní."),
		});
		new Setting(el)
			.setName(t("Importovat denní data"))
			.setDesc(t("Vyber soubor .csv."))
			.addButton((b) => b.setButtonText(t("Vybrat soubor")).onClick(() => this.plugin.pickDailyFile()));
	}

	private displayHistoryImport(el: HTMLElement): void {
		new Setting(el)
			.setName(t("Import historie ze Strong a Hevy"))
			.setDesc(t("Přenese silové tréninky z exportu CSV: cviky, série, váhy, rozcvičovací a drop série, supersety. Soubor se čte jen v tomto zařízení."))
			.setHeading();
		const guide = el.createEl("details", { cls: "bf-settings-details" });
		guide.createEl("summary", { text: t("Návod: kde export vzít a co čekat") });
		const list = guide.createEl("ul");
		const strong = list.createEl("li");
		strong.createEl("strong", { text: "Strong: " });
		strong.appendText(t("v aplikaci otevři Nastavení a zvol Export Workouts (v části Data Management). Jednotku váhy soubor neobsahuje – vyber ji níže podle toho, v čem v aplikaci zapisuješ."));
		const hevy = list.createEl("li");
		hevy.createEl("strong", { text: "Hevy: " });
		hevy.appendText(t("v nastavení aplikace najdi export dat a stáhni soubor s tréninky (workout data, CSV). Jednotku má soubor v sobě."));
		guide.createEl("p", {
			cls: "setting-item-description",
			text: t("Názvy cviků se sjednotí s knihovnou (i přes anglické názvy); neznámé cviky zůstanou pod původním názvem. RPE série se převede na RIR (10 − RPE). Běh a jiné kardio se přeskočí – běhy nahraj ze souboru GPX nebo TCX. Před importem uvidíš souhrn a import potvrdíš; tréninky, které v deníku už jsou, se přeskočí. Import je ověřený jen na souborech sestavených podle nápovědy obou aplikací – nejdřív si ho vyzkoušej na záloze."),
		});
		let unit: WeightUnit = "kg";
		new Setting(el)
			.setName(t("Importovat historii"))
			.setDesc(t("Vyber soubor CSV. Jednotka platí jen pro export ze Strong."))
			.addDropdown((d) =>
				d
					.addOption("kg", "Strong v kilogramech")
					.addOption("lb", t("Strong v librách"))
					.setValue(unit)
					.onChange((v) => (unit = v === "lb" ? "lb" : "kg")),
			)
			.addButton((b) => b.setButtonText(t("Vybrat soubor")).onClick(() => this.plugin.pickHistoryFile(unit)));
	}

	private displayStrava(el: HTMLElement): void {
		const strava = this.settings.strava;
		const auth = this.plugin.strava;
		new Setting(el)
			.setName("Strava")
			.setDesc(t("Import běhů ze Stravy. Každý uživatel používá vlastní API aplikaci – údaje zůstávají jen v tomto vaultu."))
			.setHeading();

		const guide = el.createEl("details", { cls: "bf-settings-details" });
		guide.createEl("summary", { text: t("Návod: jak založit API aplikaci na Stravě") });
		guide.createEl("p", {
			cls: "setting-item-description",
			text: t("Od června 2026 Strava dovoluje založit API aplikaci jen účtům s placeným předplatným. Bez něj propojení nejde nastavit – běhy pak nahrávej ze souboru (viz výše) nebo zapisuj ručně."),
		});
		const steps = guide.createEl("ol");
		const first = steps.createEl("li", { text: t("Přihlas se na Stravě a otevři ") });
		first.createEl("a", { text: "strava.com/settings/api", href: "https://www.strava.com/settings/api" });
		first.appendText(".");
		steps.createEl("li", { text: t("Vyplň název aplikace (libovolný, např. „Můj deník“), kategorii a web (stačí http://localhost).") });
		steps.createEl("li", { text: t("Do pole Authorization Callback Domain napiš přesně: localhost") });
		steps.createEl("li", { text: t("Nahraj libovolný obrázek jako ikonu – Strava ho vyžaduje.") });
		steps.createEl("li", { text: t("Zkopíruj Client ID a Client Secret do polí níže a klikni na Připojit.") });
		guide.createEl("p", {
			cls: "setting-item-description",
			text: t("Client Secret nikomu neposílej. Nová aplikace smí připojit jen tebe – to pro osobní deník stačí."),
		});

		new Setting(el).setName("Client ID").addText((t) =>
			t.setValue(strava.clientId).onChange((v) => {
				strava.clientId = v.trim();
				this.save();
			}),
		);
		new Setting(el)
			.setName("Client Secret")
			.setDesc(t("Ukládá se jen do souboru data.json tohoto pluginu."))
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
			.setName(t("Typy aktivit"))
			.setDesc(t("Které typy aktivit Stravy se importují jako běh, oddělené čárkou. Výchozí: Run, TrailRun, VirtualRun."))
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
			t("První synchronizace"),
			t("Kolik dnů zpět stáhnout při první synchronizaci."),
			strava.initialDays,
			(v) => (strava.initialDays = v ?? 90),
			{ min: 1, max: 3650 },
		);

		if (auth.isConnected) {
			const last = strava.lastSyncAt > 0 ? new Date(strava.lastSyncAt * 1000).toLocaleString("cs-CZ") : t("zatím neproběhla");
			new Setting(el)
				.setName(t("Synchronizace"))
				.setDesc(t("Stáhne nové běhy; spouští se jen ručně. Poslední: {last}.", { last }))
				.addButton((b) =>
					b.setButtonText("Synchronizovat").onClick(async () => {
						b.setDisabled(true);
						await this.plugin.syncStrava();
						this.display();
					}),
				);
			new Setting(el)
				.setName(strava.athleteName ? t("Připojeno: {athleteName}", { athleteName: strava.athleteName }) : t("Připojeno"))
				.setDesc(t("Odpojení smaže přihlášení jen v tomto zařízení. Přístup aplikace zrušíš na Stravě v Nastavení → Moje aplikace."))
				.addButton((b) => b.setButtonText("Odpojit").onClick(() => void run(() => auth.disconnect(), "Strava odpojena.")));
		} else {
			if (auth.canUseLocalServer) {
				new Setting(el)
					.setName(t("Připojit"))
					.setDesc(t("Otevře Stravu v prohlížeči a po povolení se vrátí sama (dočasný server na localhost:{LOCAL_AUTH_PORT}).", { LOCAL_AUTH_PORT }))
					.addButton((b) =>
						b
							.setButtonText(t("Připojit"))
							.setCta()
							.onClick(() => {
								b.setDisabled(true).setButtonText(t("Čekám na povolení…"));
								void run(() => auth.connectWithLocalServer(), t("Strava připojena."));
							}),
					);
			}
			new Setting(el)
				.setName(auth.canUseLocalServer ? t("Připojit ručně") : t("Připojit"))
				.setDesc(t("Otevře Stravu; po povolení zkopíruješ adresu z prohlížeče a vložíš ji sem. Funguje i na mobilu."))
				.addButton((b) => {
					b.setButtonText(t("Připojit ručně")).onClick(() => {
						try {
							this.plugin.requestSaveSettings.run();
							auth.openManualAuthorization();
						} catch (err) {
							new Notice(`Strava: ${err instanceof Error ? err.message : String(err)}`);
							return;
						}
						new StravaCodeModal(this.app, (text) => run(() => auth.connectWithPastedCode(text), t("Strava připojena."))).open();
					});
					if (!auth.canUseLocalServer) b.setCta();
				});
		}
	}

	private displayFolders(el: HTMLElement): void {
		new Setting(el)
			.setName(t("Složky"))
			.setDesc(t("Podsložky jsou uvnitř kořenové složky. Změna názvu nepřesouvá existující poznámky."))
			.setHeading();
		const folders = this.settings.folders;
		new Setting(el)
			.setName(t("Kořenová složka"))
			.setDesc(t("Výchozí: {root}", { root: DEFAULT_FOLDERS.root }))
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
				.setDesc(t("Výchozí: {v}", { v: DEFAULT_FOLDERS[key] }))
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
		new Setting(el).setName(t("Vytvořit chybějící složky")).addButton((b) =>
			b.setButtonText(t("Vytvořit")).onClick(async () => {
				await this.plugin.createFolders(true);
			}),
		);
		new Setting(el)
			.setName(t("Doplnit knihovnu"))
			.setDesc(t("Založí chybějící cviky, předpřipravené programy a šablony tréninků. Existující poznámky se nemění."))
			.addButton((b) =>
				b.setButtonText(t("Doplnit")).onClick(async () => {
					await this.plugin.seedLibrary(true);
				}),
			);
		new Setting(el)
			.setName(t("Doplnit popisy cviků"))
			.setDesc(t("Doplní popis, provedení a časté chyby tam, kde v poznámce cviku chybí. Existující text se nepřepíše."))
			.addButton((b) =>
				b.setButtonText(t("Doplnit")).onClick(async () => {
					await this.plugin.fillExerciseTexts();
				}),
			);
		new Setting(el)
			.setName(t("Obnovit předpřipravené programy"))
			.setDesc(t("Přepíše popis a nastavení předpřipravených programů aktuální verzí z pluginu (po potvrzení). Vlastní programy se nemění."))
			.addButton((b) =>
				b.setButtonText(t("Obnovit")).onClick(async () => {
					await this.plugin.refreshBuiltinPrograms();
				}),
			);
	}

	private displayThresholds(el: HTMLElement): void {
		new Setting(el)
			.setName(t("Prahy a okna výpočtů"))
			.setDesc(t("Výchozí hodnoty odpovídají zdrojům uvedeným u jednotlivých výpočtů."))
			.setHeading();
		const thresholds = this.settings.thresholds;
		for (const group of THRESHOLD_GROUPS) {
			const details = el.createEl("details", { cls: "bf-settings-details" });
			details.createEl("summary", { text: t(group.title) });
			for (const field of group.fields) {
				const unit = field.unit ? ` (${t(field.unit)})` : "";
				const desc = (field.desc ? `${t(field.desc)} ` : "") + t("Výchozí: {value}{unit}.", { value: DEFAULT_THRESHOLDS[field.key], unit });
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
		new Setting(el).setName(t("Obnovit výchozí prahy")).addButton((b) =>
			b
				.setButtonText(t("Obnovit"))
				.setWarning()
				.onClick(async () => {
					const ok = await confirmAction(
						this.app,
						t("Obnovit výchozí prahy?"),
						t("Všechny prahy a okna výpočtů se nastaví na výchozí hodnoty. Profil a ostatní nastavení zůstanou."),
						t("Obnovit"),
					);
					if (!ok) return;
					this.settings.thresholds = structuredClone(DEFAULT_THRESHOLDS);
					this.save();
					new Notice(t("Prahy obnoveny na výchozí hodnoty."));
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
