import { describe, expect, it } from "vitest";
import { defaultModules, moduleOn, researchCardOn } from "../../src/settings/modules";
import { rulesForModules } from "../../src/rules/engine";
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
		expect(settings.settingsVersion).toBe(3);
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

describe("moduly", () => {
	it("starý přepínač sérií se převede na modul; uložené moduly přežijí načtení, nesmysly ne", () => {
		expect(mergeSettings({ settingsVersion: 2, showStreaks: false }).modules).toEqual({ badges: false });
		expect(mergeSettings({ settingsVersion: 2, showStreaks: true }).modules).toEqual({});
		expect(mergeSettings({ modules: { running: false, "running.taper": false, nutrition: "ne" } }).modules).toEqual({ running: false, "running.taper": false });
		expect(mergeSettings(null).modules).toEqual({});
	});

	it("podmodul jen se zapnutým hlavním modulem; chybějící = zapnuto", () => {
		expect(moduleOn({}, "running.taper")).toBe(true);
		expect(moduleOn({ running: false }, "running")).toBe(false);
		expect(moduleOn({ running: false }, "running.taper")).toBe(false);
		expect(moduleOn({ "running.taper": false }, "running")).toBe(true);
		expect(moduleOn({ "running.taper": false }, "running.taper")).toBe(false);
		expect(researchCardOn({ "research.practice": false }, "practice")).toBe(false);
		expect(researchCardOn({ "research.practice": false }, "research")).toBe(true);
		expect(defaultModules({ run: false, strength: true })).toEqual({ running: false });
		expect(defaultModules({ run: true })).toEqual({});
	});

	it("pravidla vypnutých modulů nevydají doporučení; bezpečnostní platí vždy", () => {
		const ids = (modules: Record<string, boolean>) => rulesForModules(modules).map((r) => r.id);
		const all = ids({});
		expect(all).toEqual(expect.arrayContaining(["pain", "sleep", "hrv", "nutrition_check", "run_spike", "goal", "challenge"]));
		const off = ids({ nutrition: false, running: false, goals: false, programs: false, body: false, badges: false, research: false, supplements: false, skills: false });
		expect(off).not.toEqual(expect.arrayContaining(["nutrition_check"]));
		for (const id of ["nutrition_check", "run_spike", "goal", "challenge", "recovery", "volume"]) expect(off).not.toContain(id);
		for (const id of ["pain", "sleep", "hrv", "acwr", "deload"]) expect(off).toContain(id);
		expect(ids({ "nutrition.weight_check": false })).not.toContain("nutrition_check");
	});
});
