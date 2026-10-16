import { describe, expect, it } from "vitest";
import { applyOnboarding, onboardingFromSettings, onboardingMissing, validateOnboarding } from "../../src/settings/onboarding";
import { mergeSettings } from "../../src/settings/settings";

describe("úvodní průvodce", () => {
	it("výchozí hodnoty z prázdného nastavení; chybí vše pro výživu", () => {
		const values = onboardingFromSettings(mergeSettings(null));
		expect(values).toMatchObject({ sex: "", goal: "maintain", activity: "light", mode: "full", weeklyWorkoutGoal: 3 });
		expect(values.birthYear).toBeUndefined();
		expect(onboardingMissing(values)).toEqual(["pohlaví", "rok narození", "výška", "hmotnost"]);
		// Prázdný profil je v pořádku – dá se doplnit později.
		expect(validateOnboarding(values, 2026)).toEqual({});
	});

	it("kontrola rozsahů, celých čísel a aspoň jednoho sportu", () => {
		const values = onboardingFromSettings(mergeSettings(null));
		const none = Object.fromEntries(Object.keys(values.sports).map((s) => [s, false])) as typeof values.sports;
		expect(
			validateOnboarding({ ...values, birthYear: 2030, heightCm: 18.4, weightKg: Number.NaN, bodyFatPct: 2, weeklyWorkoutGoal: 2.5, sports: none }, 2026),
		).toEqual({
			birthYear: "Rozsah 1900–2026.",
			heightCm: "Rozsah 100–250.",
			weightKg: "Není číslo.",
			bodyFatPct: "Rozsah 3–60.",
			weeklyWorkoutGoal: "Zadej celé číslo.",
			sports: "Nech zapnutý aspoň jeden sport.",
		});
		expect(validateOnboarding({ ...values, birthYear: 2004, heightCm: 184, weightKg: 61.5, bodyFatPct: undefined }, 2026)).toEqual({});
	});

	it("uložení zapíše profil, režim a sporty a označí průvodce za dokončený", () => {
		const settings = mergeSettings(null);
		expect(settings.onboarded).toBe(false);
		const values = onboardingFromSettings(settings);
		applyOnboarding(settings, {
			...values,
			sex: "male",
			birthYear: 2004,
			heightCm: 184,
			weightKg: 61,
			goal: "gain",
			activity: "sedentary",
			mode: "basic",
			sports: { ...values.sports, swim: false },
			weeklyWorkoutGoal: 4,
		});
		expect(settings.profile).toMatchObject({ sex: "male", birthYear: 2004, heightCm: 184, weightKg: 61, bodyFatPct: null, goal: "gain", activity: "sedentary" });
		expect(settings.mode).toBe("basic");
		expect(settings.sports.swim).toBe(false);
		expect(settings.sports.run).toBe(true);
		expect(settings.weeklyWorkoutGoal).toBe(4);
		expect(settings.onboarded).toBe(true);
		expect(onboardingMissing(onboardingFromSettings(settings))).toEqual([]);
	});

	it("vymazané pole profilu se uloží jako nevyplněné", () => {
		const settings = mergeSettings({ profile: { sex: "female", heightCm: 170 } });
		applyOnboarding(settings, { ...onboardingFromSettings(settings), sex: "", heightCm: undefined });
		expect(settings.profile.sex).toBeNull();
		expect(settings.profile.heightCm).toBeNull();
	});
});
