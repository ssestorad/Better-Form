import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, mergeSettings, parseNumberList, parseTextList } from "../../src/settings/settings";

describe("mergeSettings", () => {
	it("bez uložených dat vrátí výchozí nastavení (kopii)", () => {
		const settings = mergeSettings(null);
		expect(settings).toEqual(DEFAULT_SETTINGS);
		settings.kettlebellsKg.push(16);
		settings.thresholds.acwrWarn = 9;
		expect(DEFAULT_SETTINGS.kettlebellsKg).toEqual([]);
		expect(DEFAULT_SETTINGS.thresholds.acwrWarn).toBe(1.5);
	});

	it("Strava je ve výchozím stavu nepřipojená a bez údajů; uložené tokeny se zachovají", () => {
		const { strava } = DEFAULT_SETTINGS;
		expect(strava.clientId).toBe("");
		expect(strava.clientSecret).toBe("");
		expect(strava.refreshToken).toBe("");
		expect(strava.initialDays).toBe(90);
		expect(strava.activityTypes).toEqual(["Run", "TrailRun", "VirtualRun"]);
		const merged = mergeSettings({ strava: { clientId: "123", refreshToken: "abc", expiresAt: 1790000000, activityTypes: ["Run"] } });
		expect(merged.strava.clientId).toBe("123");
		expect(merged.strava.refreshToken).toBe("abc");
		expect(merged.strava.expiresAt).toBe(1790000000);
		expect(merged.strava.activityTypes).toEqual(["Run"]);
		expect(merged.strava.initialDays).toBe(90);
	});

	it("výchozí profil neobsahuje osobní údaje", () => {
		const { profile } = DEFAULT_SETTINGS;
		expect(profile.name).toBe("");
		expect(profile.sex).toBeNull();
		expect(profile.birthYear).toBeNull();
		expect(profile.heightCm).toBeNull();
		expect(profile.weightKg).toBeNull();
	});

	it("doplní chybějící klíče, zachová uložené a zahodí neznámé", () => {
		const settings = mergeSettings({
			mode: "basic",
			profile: { heightCm: 180, sex: "male" },
			thresholds: { acwrWarn: 1.4 },
			folders: { root: "Trénink" },
			neznamy: 1,
		});
		expect(settings.mode).toBe("basic");
		expect(settings.profile.heightCm).toBe(180);
		expect(settings.profile.sex).toBe("male");
		expect(settings.profile.goal).toBe("maintain");
		expect(settings.thresholds.acwrWarn).toBe(1.4);
		expect(settings.thresholds.monotonyWarn).toBe(2);
		expect(settings.folders.root).toBe("Trénink");
		// Chybějící složky doplní výchozí (anglické) hodnoty.
		expect(settings.folders.days).toBe("Journal");
		expect("neznamy" in settings).toBe(false);
	});

	it("špatně typované hodnoty nahradí výchozími", () => {
		const settings = mergeSettings({
			weeklyWorkoutGoal: "pět",
			kettlebellsKg: "16",
			sports: { run: "ano" },
			profile: { birthYear: { rok: 1990 } },
		});
		expect(settings.weeklyWorkoutGoal).toBe(3);
		expect(settings.kettlebellsKg).toEqual([]);
		expect(settings.sports.run).toBe(true);
		expect(settings.profile.birthYear).toBeNull();
	});
});

describe("migrace nastavení", () => {
	it("verze 1: do cviků režimu Základ přidá běh, zbytek zachová", () => {
		const settings = mergeSettings({ settingsVersion: 1, basicExercises: ["Kliky", "Dipy"] });
		expect(settings.basicExercises).toEqual(["Kliky", "Dipy", "Running"]);
		expect(settings.settingsVersion).toBe(2);
		// Běh se doplní v jazyce vaultu; už zapsaný (v kterémkoli jazyce) se nezdvojí.
		expect(mergeSettings({ settingsVersion: 1, language: "cs", basicExercises: ["Kliky"] }).basicExercises).toEqual(["Kliky", "Běh"]);
		expect(mergeSettings({ settingsVersion: 1, basicExercises: ["Kliky", "Běh"] }).basicExercises).toEqual(["Kliky", "Běh"]);
	});

	it("aktuální verze: seznam cviků se nemění (běh mohl uživatel odebrat)", () => {
		const settings = mergeSettings({ settingsVersion: 2, basicExercises: ["Kliky"] });
		expect(settings.basicExercises).toEqual(["Kliky"]);
	});

	it("běh se nepřidá podruhé", () => {
		expect(mergeSettings({ settingsVersion: 1, basicExercises: ["běh", "Kliky"] }).basicExercises).toEqual(["běh", "Kliky"]);
	});

	it("starší nastavení dostane výchozí výživu, složku exportu a záloh; neplatná rovnice se opraví", () => {
		const settings = mergeSettings({ settingsVersion: 2, nutrition: { rmrFormula: "neznámá", lossRatePctMax: 0.8 } });
		expect(settings.nutrition).toEqual({ ...DEFAULT_SETTINGS.nutrition, lossRatePctMax: 0.8 });
		expect(settings.nutrition.activityFactors).toEqual({ sedentary: 1.2, light: 1.4, active: 1.6 });
		expect(settings.folders.exports).toBe("Export");
		expect(settings.backupFolder).toBe("Better Form backups");
	});
});

describe("parseNumberList", () => {
	it("různé oddělovače, řazení, bez duplicit a neplatných", () => {
		expect(parseNumberList("24, 12;16 16  8")).toEqual([8, 12, 16, 24]);
		expect(parseNumberList("20.5, x, -4, 0")).toEqual([20.5]);
		expect(parseNumberList("")).toEqual([]);
	});
});

describe("léky v profilu", () => {
	it("výchozí bez léků; neznámé skupiny se při načtení zahodí", () => {
		expect(DEFAULT_SETTINGS.profile.medications).toEqual([]);
		const settings = mergeSettings({ profile: { medications: ["thyroid", "nesmysl", "antidepressants"] } });
		expect(settings.profile.medications).toEqual(["antidepressants", "thyroid"]);
	});
});

describe("parseTextList", () => {
	it("položky oddělené čárkou, bez mezer na krajích a bez prázdných", () => {
		expect(parseTextList(" Run, TrailRun , ,VirtualRun ")).toEqual(["Run", "TrailRun", "VirtualRun"]);
		expect(parseTextList("")).toEqual([]);
	});
});
