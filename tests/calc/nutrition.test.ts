import { describe, expect, it } from "vitest";
import {
	MET_TABLE,
	ageFromBirthYear,
	dayLoad,
	fatFreeMass,
	intensityOfRpe,
	missingProfile,
	nutritionPlan,
	recommendedRmrFormula,
	restingRmr,
	rmrCunningham,
	rmrMifflin,
	rmrTenHaaf,
	rmrTenHaafFfm,
	tenHaafOutOfRange,
	weeklyTrainingHours,
	workoutEnergy,
	type NutritionProfile,
} from "../../src/calc/nutrition";
import { SPORTS } from "../../src/model/constants";
import { daysBetween } from "../../src/model/dates";
import type { WorkoutNote } from "../../src/model/types";
import { DEFAULT_NUTRITION, type NutritionSettings } from "../../src/settings/settings";
import { nutritionLine, rangeText } from "../../src/ui/nutrition/text";

function workout(partial: Partial<WorkoutNote>): WorkoutNote {
	return { forma: "workout", schema: 1, date: "2026-10-03", sport: "strength", source: "manual", blocks: [], pain: [], ...partial };
}

const man: NutritionProfile = { sex: "male", age: 30, heightCm: 180, weightKg: 80, bodyFatPct: null, activity: "light", goal: "maintain" };
const woman: NutritionProfile = { sex: "female", age: 25, heightCm: 165, weightKg: 60, bodyFatPct: 25, activity: "sedentary", goal: "lose" };
const settings = (patch: Partial<NutritionSettings> = {}): NutritionSettings => ({ ...structuredClone(DEFAULT_NUTRITION), ...patch });

describe("klidový výdej (SPEC 11.1)", () => {
	// Koeficienty ověřené proti originální publikaci (ten Haaf & Weijs 2014, PLoS One, rovnice v kcal/den).
	it("ten Haaf z hmotnosti: muž 80 kg, 1,80 m, 30 let = 1 989,2 kcal", () => {
		// 11,936·80 + 587,728·1,8 − 8,129·30 + 191,027 + 29,279 = 954,88 + 1057,9104 − 243,87 + 191,027 + 29,279
		expect(rmrTenHaaf(80, 1.8, 30, true)).toBeCloseTo(1989.2264, 4);
	});

	it("ten Haaf z hmotnosti: žena 60 kg, 1,65 m, 25 let = 1 512,0 kcal", () => {
		// 716,16 + 969,7512 − 203,225 + 0 + 29,279
		expect(rmrTenHaaf(60, 1.65, 25, false)).toBeCloseTo(1511.9652, 4);
	});

	it("ten Haaf z beztukové hmoty a Cunningham: FFM 65 kg", () => {
		expect(rmrTenHaafFfm(65)).toBeCloseTo(1964.379, 4); // 22,771·65 + 484,264
		expect(rmrCunningham(65)).toBe(1930); // 500 + 22·65
	});

	it("Mifflin–St Jeor: muž 60 kg, 180 cm, 25 let = 1 606,4 kcal; žena 60 kg, 165 cm, 25 let = 1 346,7 kcal", () => {
		// 9,99·60 + 6,25·180 − 4,92·25 + 166 − 161 = 599,4 + 1125 − 123 + 5
		expect(rmrMifflin(60, 180, 25, true)).toBeCloseTo(1606.4, 4);
		// 599,4 + 1031,25 − 123 − 161
		expect(rmrMifflin(60, 165, 25, false)).toBeCloseTo(1346.65, 4);
		expect(restingRmr({ ...man, weightKg: 60, heightCm: 180, age: 25 }, "mifflin")).toEqual({ kcal: rmrMifflin(60, 180, 25, true), formula: "mifflin", fallback: false });
	});

	it("ten Haaf mimo skupinu, na které vznikl: lehký a málo trénující muž", () => {
		const slim: NutritionProfile = { ...man, weightKg: 60, heightCm: 180, age: 25, trainingHoursPerWeek: 1.9 };
		// BMI 60 / 1,80² = 18,5 (studie 18,6–27), hmotnost pod 62 kg, trénink pod 3 h týdně
		expect(tenHaafOutOfRange(slim)).toEqual(["hmotnost mimo 62–100 kg", "BMI mimo 18,6–27", "méně než 3 h tréninku týdně"]);
		expect(tenHaafOutOfRange({ ...man, trainingHoursPerWeek: 5 })).toEqual([]);
		expect(tenHaafOutOfRange({ ...man, age: 45 })).toEqual(["věk mimo 18–35 let"]);
		// Bez údaje o tréninku se trénink nehodnotí.
		expect(tenHaafOutOfRange({ ...man, trainingHoursPerWeek: null })).toEqual([]);
	});

	it("hodiny tréninku týdně: průměr za 4 týdny, u kratší historie nejméně za týden", () => {
		const w = (date: string, min: number) => workout({ date, duration_min: min });
		expect(weeklyTrainingHours([], "2026-10-04", daysBetween)).toBeNull();
		// První trénink před 5 dny → počítá se jeden týden: (35 + 80) min = 1,92 h
		expect(weeklyTrainingHours([w("2026-09-30", 35), w("2026-10-01", 80)], "2026-10-04", daysBetween)).toBeCloseTo(115 / 60, 6);
		// Delší historie: jen posledních 28 dní, 4 × 60 min = 1 h týdně
		const long = [w("2026-08-01", 300), w("2026-09-10", 60), w("2026-09-17", 60), w("2026-09-24", 60), w("2026-10-01", 60)];
		expect(weeklyTrainingHours(long, "2026-10-04", daysBetween)).toBeCloseTo(1, 6);
	});

	it("beztuková hmota jen s platným % tuku", () => {
		expect(fatFreeMass(80, 15)).toBeCloseTo(68, 6);
		expect(fatFreeMass(80, null)).toBeNull();
		expect(fatFreeMass(80, 0)).toBeNull();
	});

	it("věk z roku narození", () => {
		expect(ageFromBirthYear(1996, "2026-10-03")).toBe(30);
		expect(ageFromBirthYear(null, "2026-10-03")).toBeNull();
		expect(ageFromBirthYear(2030, "2026-10-03")).toBeNull();
	});

	it("rovnice z FFM bez % tuku spadne na rovnici z hmotnosti; s % tuku ji použije", () => {
		expect(restingRmr(man, "cunningham")).toMatchObject({ formula: "ten_haaf", fallback: true });
		expect(restingRmr({ ...man, bodyFatPct: 15 }, "cunningham")).toEqual({ kcal: 500 + 22 * 68, formula: "cunningham", fallback: false });
	});

	it("chybějící údaje: bez hmotnosti nic; z FFM stačí hmotnost a % tuku", () => {
		const empty: NutritionProfile = { ...man, sex: null, age: null, heightCm: null, weightKg: null };
		expect(restingRmr(empty, "ten_haaf")).toBeNull();
		expect(missingProfile(empty, "ten_haaf")).toEqual(["hmotnost (check-in nebo profil)", "pohlaví", "rok narození", "výška"]);
		expect(missingProfile({ ...empty, weightKg: 70, bodyFatPct: 20 }, "ten_haaf_ffm")).toEqual([]);
	});
});

describe("výdej z tréninku (SPEC 11.2)", () => {
	it("RPE → intenzita: do 4 nízká, 5–6 střední, od 7 vysoká, bez RPE střední", () => {
		expect([3, 4, 5, 6, 7, undefined].map(intensityOfRpe)).toEqual(["low", "low", "mid", "mid", "high", "mid"]);
	});

	it("MET tabulka pokrývá všechny sporty a intenzity", () => {
		for (const sport of SPORTS) for (const i of ["low", "mid", "high"] as const) expect(MET_TABLE[sport][i].met, sport).toBeGreaterThan(1);
	});

	it("běh 10 km za 50 min, 70 kg: 700 kcal celkem − 62,5 klidových = 637,5", () => {
		const e = workoutEnergy(workout({ sport: "run", run: { distance_km: 10, moving_time_s: 3000 }, duration_min: 55 }), 70, 1800);
		expect(e.method).toBe("run_distance");
		expect(e.netKcal).toBeCloseTo(637.5, 6);
	});

	it("posilovna 60 min, RPE 8, 80 kg: (6,0 − 1) · 80 · 1 = 400 kcal", () => {
		expect(workoutEnergy(workout({ duration_min: 60, rpe: 8 }), 80, 1800)).toMatchObject({ netKcal: 400, method: "met", met: 6, code: "02050" });
	});

	it("kalistenika 30 min bez RPE: (3,8 − 1) · 80 · 0,5 = 112 kcal", () => {
		expect(workoutEnergy(workout({ sport: "calisthenics", duration_min: 30 }), 80, 1800).netKcal).toBeCloseTo(112, 6);
	});

	it("bez délky se trénink nepočítá (null, ne NaN)", () => {
		expect(workoutEnergy(workout({}), 80, 1800)).toMatchObject({ netKcal: null, method: "none" });
	});
});

describe("zátěž dne pro sacharidy (SPEC 11.5)", () => {
	it("podle délky a intenzity", () => {
		expect(dayLoad([])).toBe("light");
		expect(dayLoad([workout({ duration_min: 40, rpe: 7 })])).toBe("light");
		expect(dayLoad([workout({ duration_min: 60, rpe: 3 })])).toBe("light");
		expect(dayLoad([workout({ duration_min: 60, rpe: 6 })])).toBe("moderate");
		expect(dayLoad([workout({ duration_min: 120, rpe: 7 })])).toBe("high");
		expect(dayLoad([workout({ duration_min: 150 }), workout({ duration_min: 100 })])).toBe("very_high");
	});
});

describe("doporučený příjem (SPEC 11.3–11.5)", () => {
	it("udržování: muž 80 kg, lehce aktivní, posilovna 60 min RPE 8 – ruční výpočet", () => {
		const plan = nutritionPlan({ profile: man, settings: settings(), eaMin: 30, workouts: [workout({ duration_min: 60, rpe: 8 })] })!;
		// RMR 1989,2264; TDEE = 1989,2264 · 1,4 + 400 = 3184,917
		expect(plan.tdee).toBeCloseTo(3184.917, 3);
		// Rozsah z přesnosti RMR ±10 %: 2906,4 – 3463,4 → zaokrouhleno na desítky
		expect(plan.intake).toEqual({ min: 2910, max: 3460 });
		expect(plan.target).toBe(3180);
		expect(plan.rmrNotes).toEqual([]);
		expect(plan.raisedFor).toEqual([]);
		expect(plan.eaUsesBodyWeight).toBe(true);
		expect(plan.energyAvailability).toBeCloseTo((2910 - 400) / 80, 6);
		expect(plan.load).toBe("moderate");
		// Bílkoviny 1,6–2,2 g/kg = 128–176 g; sacharidy 5–7 g/kg = 400–560 g
		expect(plan.protein).toEqual({ min: 130, max: 175 });
		expect(plan.carbs).toEqual({ min: 400, max: 560 });
		// Tuky: aspoň 20 % ze 2910 kcal = 64,7 g; nahoře zbytek při středních hodnotách (3460 − 152·4 − 480·4) / 9 = 103,6 g
		expect(plan.fat).toEqual({ min: 65, max: 105 });
		expect(plan.carbsShort).toBe(false);
	});

	it("pojistka energetické dostupnosti zvedne příliš nízký příjem při hubnutí", () => {
		const run = workout({ sport: "run", run: { distance_km: 10, moving_time_s: 3000 } });
		const plan = nutritionPlan({ profile: woman, settings: settings(), eaMin: 30, workouts: [run] })!;
		// RMR 1511,97; běh 600 − 52,50 = 547,50; TDEE = 1511,97 · 1,2 + 547,50 = 2361,86
		expect(plan.tdee).toBeCloseTo(2361.859, 2);
		// Deficit 0,5–1 % z 60 kg týdně = 330–660 kcal/den → 1701,9–2031,9; EA pojistka 30 · 45 + 547,5 = 1897,5
		expect(plan.raisedFor).toEqual(["ea"]);
		expect(plan.intake).toEqual({ min: 1900, max: 2030 });
		expect(plan.energyAvailability).toBeGreaterThanOrEqual(30);
		expect(plan.eaUsesBodyWeight).toBe(false);
		// Bílkoviny v deficitu 2,3–3,1 g/kg FFM (45 kg) = 103,5–139,5 g
		expect(plan.protein).toEqual({ min: 105, max: 140 });
	});

	it("příjem nikdy pod klidový výdej", () => {
		const plan = nutritionPlan({ profile: { ...man, goal: "lose", activity: "sedentary" }, settings: settings({ lossRatePctMax: 3 }), eaMin: 0, workouts: [] })!;
		expect(plan.raisedFor).toEqual(["rmr"]);
		expect(plan.intake.min).toBe(1990);
		expect(plan.intake.min).toBeGreaterThanOrEqual(plan.rmr.kcal);
	});

	it("rovnice podle profilu: skupina ten Haaf → ten Haaf; trénující mimo ni s podílem tuku → Cunningham; jinak Mifflin", () => {
		// Muž 80 kg, 180 cm, 30 let je uvnitř skupiny (62–100 kg, BMI 24,7, 18–35 let).
		expect(recommendedRmrFormula(man)).toBe("ten_haaf");
		expect(recommendedRmrFormula({ ...man, trainingHoursPerWeek: 5 })).toBe("ten_haaf");
		// Stejný člověk, který trénuje hodinu týdně, nebo je mu 40, do skupiny nepatří.
		expect(recommendedRmrFormula({ ...man, trainingHoursPerWeek: 1 })).toBe("mifflin");
		expect(recommendedRmrFormula({ ...man, age: 40 })).toBe("mifflin");
		// 60 kg na 180 cm: pod 62 kg i pod BMI 18,6 (60 / 1,80² = 18,5).
		const slim: NutritionProfile = { ...man, age: 25, heightCm: 180, weightKg: 60 };
		expect(recommendedRmrFormula(slim)).toBe("mifflin");
		// Trénuje aspoň 3 h týdně a zná podíl tuku → beztuková hmota: 60 kg × 0,9 = 54 kg → 500 + 22 × 54 = 1 688 kcal.
		expect(recommendedRmrFormula({ ...slim, bodyFatPct: 10, trainingHoursPerWeek: 4 })).toBe("cunningham");
		// Bez pravidelného tréninku (nebo bez záznamů) zůstává rovnice pro běžnou populaci, i s podílem tuku.
		expect(recommendedRmrFormula({ ...slim, bodyFatPct: 10, trainingHoursPerWeek: 1.9 })).toBe("mifflin");
		expect(recommendedRmrFormula({ ...slim, bodyFatPct: 10 })).toBe("mifflin");
		// Uvnitř skupiny má přednost ten Haaf, i když je podíl tuku známý.
		expect(recommendedRmrFormula({ ...man, bodyFatPct: 15, trainingHoursPerWeek: 5 })).toBe("ten_haaf");
		expect(restingRmr({ ...slim, bodyFatPct: 10 }, "cunningham")?.kcal).toBeCloseTo(1688, 6);
		// Tři odhady pro téhož člověka: ten Haaf 1 791,2; Cunningham 1 688,0; Mifflin 1 606,4.
		// ten Haaf: 11,936·60 + 587,728·1,80 − 8,129·25 + 191,027 + 29,279 = 716,16 + 1057,9104 − 203,225 + 220,306
		expect(restingRmr(slim, "ten_haaf")?.kcal).toBeCloseTo(1791.1514, 4);
		expect(restingRmr(slim, "mifflin")?.kcal).toBeCloseTo(1606.4, 4);
	});

	it("při udržování se pojistka hlásí, až když zvedne doporučení samo, ne jen spodní konec rozsahu", () => {
		// Mifflin 1 606,4 × 1,2 = 1 927,7; rozsah ±10 % = 1 734,9–2 120,4; pojistka EA z celé hmotnosti 30 × 60 = 1 800.
		const slim: NutritionProfile = { sex: "male", age: 25, heightCm: 180, weightKg: 60, bodyFatPct: null, activity: "sedentary", goal: "maintain" };
		const plan = nutritionPlan({ profile: slim, settings: settings({ rmrFormula: "mifflin" }), eaMin: 30, workouts: [] })!;
		// Spodní konec se drží na pojistce, ale doporučení 1 930 kcal je nad ní – žádné varování.
		expect(plan.intake.min).toBe(1800);
		expect(plan.target).toBe(1930);
		expect(plan.raisedFor).toEqual([]);
		// Korekce −300 kcal stáhne samotné doporučení (1 628) pod pojistku – teď se hlásí.
		const pushed = nutritionPlan({ profile: slim, settings: settings({ rmrFormula: "mifflin", correctionKcal: -300 }), eaMin: 30, workouts: [] })!;
		expect(pushed.raisedFor).toEqual(["ea"]);
		expect(pushed.target).toBe(1800);
	});

	it("den bez tréninku: 60 kg, 180 cm, 25 let – ten Haaf × 1,4 proti Mifflin × 1,2", () => {
		const slim: NutritionProfile = { ...man, weightKg: 60, heightCm: 180, age: 25, trainingHoursPerWeek: 1.9 };
		// ten Haaf 1791,15 · 1,4 = 2507,6; rozsah ±10 % = 2256,9–2758,4
		const athlete = nutritionPlan({ profile: slim, settings: settings(), eaMin: 30, workouts: [] })!;
		expect(athlete.target).toBe(2510);
		expect(athlete.intake).toEqual({ min: 2260, max: 2760 });
		expect(athlete.rmrNotes).toHaveLength(3);
		// Mifflin 1606,4 · 1,2 = 1927,7; spodní mez 1734,9 zvedne pojistka EA 30 · 60 = 1800 (bez % tuku z celé hmotnosti)
		const general = nutritionPlan({ profile: { ...slim, activity: "sedentary" }, settings: settings({ rmrFormula: "mifflin" }), eaMin: 30, workouts: [] })!;
		expect(general.target).toBe(1930);
		expect(general.intake).toEqual({ min: 1800, max: 2120 });
		expect(general.rmrNotes).toEqual([]);
	});

	it("nabírání: +5 až 10 % výdeje", () => {
		const plan = nutritionPlan({ profile: { ...man, goal: "gain" }, settings: settings(), eaMin: 30, workouts: [] })!;
		// TDEE = 1989,2264 · 1,4 = 2784,917 → 2924,2 – 3063,4
		expect(plan.intake).toEqual({ min: 2920, max: 3060 });
	});

	it("když se sacharidy nevejdou, ohlásí to a nepůjdou pod nulu", () => {
		const plan = nutritionPlan({
			profile: { ...woman, bodyFatPct: null },
			settings: settings(),
			eaMin: 0,
			workouts: [],
			loadOverride: "very_high",
		})!;
		expect(plan.carbsShort).toBe(true);
		expect(plan.carbs.min).toBeGreaterThanOrEqual(0);
		expect(plan.carbs.max).toBeLessThan(8 * 60);
	});

	it("trénink z plánu týdne se počítá stejně jako zapsaný a je označený", () => {
		const session = workout({ duration_min: 60, rpe: 8 });
		const logged = nutritionPlan({ profile: man, settings: settings(), eaMin: 30, workouts: [session] })!;
		const planned = nutritionPlan({ profile: man, settings: settings(), eaMin: 30, workouts: [], planned: [session] })!;
		expect(planned.tdee).toBeCloseTo(logged.tdee, 6);
		expect(planned.intake).toEqual(logged.intake);
		expect(planned.load).toBe("moderate");
		expect(planned.workouts.map((w) => w.planned)).toEqual([true]);
		expect(logged.workouts.map((w) => w.planned)).toEqual([undefined]);
		// Zapsaný i plánovaný trénink ve stejný den se sečtou: 2 × 400 kcal a 120 minut = vysoká zátěž.
		const both = nutritionPlan({ profile: man, settings: settings(), eaMin: 30, workouts: [session], planned: [session] })!;
		expect(both.exerciseKcal).toBeCloseTo(800, 6);
		expect(both.load).toBe("high");
	});

	it("bez údajů v profilu null; texty bez NaN", () => {
		expect(nutritionPlan({ profile: { ...man, heightCm: null }, settings: settings(), eaMin: 30, workouts: [] })).toBeNull();
		const plan = nutritionPlan({ profile: man, settings: settings(), eaMin: 30, workouts: [workout({})] })!;
		expect(plan.exerciseKcal).toBe(0);
		expect(nutritionLine(plan)).not.toMatch(/NaN/);
		expect(rangeText({ min: 2450, max: 2700 }, "kcal")).toBe("2 450–2 700 kcal");
		expect(rangeText({ min: 65, max: 65 }, "g")).toBe("65 g");
	});
});

describe("osobní korekce výdeje (SPEC 11.6)", () => {
	it("posune výdej i doporučení; pojistky platí dál", async () => {
		const { clampCorrection } = await import("../../src/calc/nutrition");
		const base = nutritionPlan({ profile: man, settings: settings(), eaMin: 30, workouts: [] })!;
		const lower = nutritionPlan({ profile: man, settings: settings({ correctionKcal: -200 }), eaMin: 30, workouts: [] })!;
		expect(base.correctionKcal).toBe(0);
		expect(lower.correctionKcal).toBe(-200);
		expect(lower.tdee).toBeCloseTo(base.tdee - 200, 6);
		expect(lower.tdeeRange.min).toBeCloseTo(base.tdeeRange.min - 200, 6);
		expect(lower.target).toBe(base.target - 200);
		// Ani velká záporná korekce nedostane doporučení pod klidový výdej.
		const extreme = nutritionPlan({ profile: { ...man, activity: "sedentary" }, settings: settings({ correctionKcal: -5000 }), eaMin: 0, workouts: [] })!;
		expect(extreme.correctionKcal).toBe(-500);
		expect(extreme.intake.min).toBeGreaterThanOrEqual(Math.floor(extreme.rmr.kcal / 10) * 10);
		expect(clampCorrection(Number.NaN)).toBe(0);
		expect(clampCorrection(undefined)).toBe(0);
		expect(clampCorrection(749.6)).toBe(500);
	});
});
