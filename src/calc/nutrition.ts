// Doporučený denní příjem (SPEC kap. 11): klidový výdej, výdej z tréninku, běžná
// aktivita, úprava podle cíle, pojistka energetické dostupnosti a makroživiny.
// Výsledky jsou rozsahy, ne jedno číslo. Bez závislosti na Obsidianu.

import type { Sport } from "../model/constants";
import type { DayNote, WorkoutNote } from "../model/types";
import type { ActivityLevel, BodyGoal, NutritionSettings, RmrFormulaSetting, SettingsSex } from "../settings/settings";
import { t, translated } from "../i18n";
import { formatNumber } from "../ui/format";

// ---------- 11.1 Klidový výdej (RMR) ----------

export type RmrFormula = RmrFormulaSetting;

export const RMR_FORMULA_LABELS: Record<RmrFormula, string> = translated({
	ten_haaf: "ten Haaf & Weijs 2014 – pro pravidelně sportující 18–35 let",
	mifflin: "Mifflin–St Jeor 1990 – běžná populace",
	ten_haaf_ffm: "ten Haaf & Weijs 2014 (beztuková hmota)",
	cunningham: "Cunningham 1980 (beztuková hmota)",
});

/** Přesnost odhadu RMR: u ten Haafovy rovnice je 80 % sportovců v ±10 % změřené hodnoty. */
export const RMR_UNCERTAINTY = 0.1;

/**
 * ten Haaf & Weijs 2014, rovnice z hmotnosti (kcal/den):
 * 11,936 × kg + 587,728 × výška v m − 8,129 × věk + 191,027 × muž + 29,279.
 */
export function rmrTenHaaf(weightKg: number, heightM: number, age: number, male: boolean): number {
	return 11.936 * weightKg + 587.728 * heightM - 8.129 * age + 191.027 * (male ? 1 : 0) + 29.279;
}

/**
 * Mifflin–St Jeor 1990 (kcal/den): 9,99 × kg + 6,25 × výška v cm − 4,92 × věk + 166 × muž − 161.
 * V běžné populaci nejspolehlivější z běžných rovnic (Frankenfield 2005).
 */
export function rmrMifflin(weightKg: number, heightCm: number, age: number, male: boolean): number {
	return 9.99 * weightKg + 6.25 * heightCm - 4.92 * age + 166 * (male ? 1 : 0) - 161;
}

/** ten Haaf & Weijs 2014, rovnice z beztukové hmoty: 22,771 × FFM + 484,264. */
export function rmrTenHaafFfm(ffmKg: number): number {
	return 22.771 * ffmKg + 484.264;
}

/** Cunningham 1980: 500 + 22 × FFM. */
export function rmrCunningham(ffmKg: number): number {
	return 500 + 22 * ffmKg;
}

/** Beztuková hmota z hmotnosti a % tuku; bez % tuku null. */
export function fatFreeMass(weightKg: number, bodyFatPct: number | null | undefined): number | null {
	if (bodyFatPct === null || bodyFatPct === undefined || !(bodyFatPct > 0 && bodyFatPct < 70)) return null;
	return weightKg * (1 - bodyFatPct / 100);
}

export interface NutritionProfile {
	sex: SettingsSex | null;
	age: number | null;
	heightCm: number | null;
	weightKg: number | null;
	bodyFatPct: number | null;
	activity: ActivityLevel;
	goal: BodyGoal;
	/** Průměr hodin tréninku týdně za poslední 4 týdny; null = neznámo. */
	trainingHoursPerWeek?: number | null;
	/** Běžná aktivita podle zapsaných kroků; chybí = použije se úroveň z nastavení. */
	steps?: StepsActivity | null;
}

/** Věk v letech podle roku narození (přesnost na rok stačí). */
export function ageFromBirthYear(birthYear: number | null, today: string): number | null {
	if (birthYear === null) return null;
	const age = Number(today.slice(0, 4)) - birthYear;
	return age > 0 && age < 120 ? age : null;
}

export interface RmrResult {
	kcal: number;
	formula: RmrFormula;
	/** Zvolená rovnice potřebuje % tuku, které chybí – použila se rovnice z hmotnosti. */
	fallback: boolean;
}

/** Klidový výdej podle zvolené rovnice; null, když chybí údaje (viz `missingProfile`). */
export function restingRmr(profile: NutritionProfile, formula: RmrFormula): RmrResult | null {
	const { weightKg } = profile;
	if (weightKg === null) return null;
	const ffm = fatFreeMass(weightKg, profile.bodyFatPct);
	if (needsFfm(formula) && ffm !== null) {
		return { kcal: formula === "cunningham" ? rmrCunningham(ffm) : rmrTenHaafFfm(ffm), formula, fallback: false };
	}
	if (profile.sex === null || profile.age === null || profile.heightCm === null) return null;
	const male = profile.sex === "male";
	if (formula === "mifflin") return { kcal: rmrMifflin(weightKg, profile.heightCm, profile.age, male), formula, fallback: false };
	return { kcal: rmrTenHaaf(weightKg, profile.heightCm / 100, profile.age, male), formula: "ten_haaf", fallback: needsFfm(formula) };
}

function needsFfm(formula: RmrFormula): boolean {
	return formula === "ten_haaf_ffm" || formula === "cunningham";
}

/**
 * Na kom vznikla rovnice ten Haaf & Weijs 2014 (tabulka účastníků): rekreační sportovci
 * 18–35 let trénující aspoň 3 h týdně; rozsah hmotnosti a BMI zvlášť pro muže a ženy.
 */
export const TEN_HAAF_SAMPLE = {
	age: [18, 35],
	hoursPerWeekMin: 3,
	male: { kg: [62.1, 100.3], bmi: [18.6, 27.0] },
	female: { kg: [52.8, 78.3], bmi: [17.9, 26.7] },
} as const;

const outside = (value: number, [min, max]: readonly [number, number]) => value < min || value > max;

/**
 * V čem je profil mimo skupinu, na které vznikla ten Haafova rovnice – tam je odhad
 * méně spolehlivý (u lehčích a méně trénujících spíš nadsazený). Prázdné = v rozsahu.
 */
export function tenHaafOutOfRange(profile: NutritionProfile): string[] {
	const notes: string[] = [];
	const { age, weightKg, heightCm, sex } = profile;
	if (age !== null && outside(age, TEN_HAAF_SAMPLE.age)) notes.push(t("věk mimo {v}–{v2} let", { v: TEN_HAAF_SAMPLE.age[0], v2: TEN_HAAF_SAMPLE.age[1] }));
	if (sex !== null && weightKg !== null) {
		const sample = TEN_HAAF_SAMPLE[sex];
		if (outside(weightKg, sample.kg)) notes.push(t("hmotnost mimo {v}–{v2} kg", { v: Math.round(sample.kg[0]), v2: Math.round(sample.kg[1]) }));
		if (heightCm !== null) {
			const bmi = weightKg / (heightCm / 100) ** 2;
			if (outside(bmi, sample.bmi)) notes.push(t("BMI mimo {v}–{v2}", { v: formatNumber(sample.bmi[0]), v2: formatNumber(sample.bmi[1]) }));
		}
	}
	const hours = profile.trainingHoursPerWeek;
	if (hours !== null && hours !== undefined && hours < TEN_HAAF_SAMPLE.hoursPerWeekMin) {
		notes.push(t("méně než {hoursPerWeekMin} h tréninku týdně", { hoursPerWeekMin: TEN_HAAF_SAMPLE.hoursPerWeekMin }));
	}
	return notes;
}

/**
 * Rovnice, která se k profilu hodí nejvíc. Pořadí vychází ze zdrojů, samo pravidlo je praxe:
 * 1. profil odpovídá skupině, na které vznikla ten Haafova rovnice z hmotnosti → ta
 *    (v metaanalýze u sportovců nejpřesnější: 80 % odhadů do ±10 %, ostatní rovnice 41–64 %);
 * 2. pravidelně trénující mimo tuto skupinu (věk, hmotnost, BMI) se zapsaným podílem tuku →
 *    Cunningham z beztukové hmoty (u sportovců bez soustavné odchylky a nezávisí na průměrné stavbě skupiny);
 * 3. jinak Mifflin–St Jeor (běžná populace, Frankenfield 2005).
 * Metaanalýza radí vybírat rovnici podle skupiny s podobnými vlastnostmi. Rovnici přepíná
 * uživatel, plugin sám ne – na hranici skupiny by doporučený příjem přeskakoval asi o desetinu
 * podle toho, kolik zrovna ukázala váha.
 */
export function recommendedRmrFormula(profile: NutritionProfile): RmrFormula {
	if (tenHaafOutOfRange(profile).length === 0) return "ten_haaf";
	const trains = (profile.trainingHoursPerWeek ?? 0) >= TEN_HAAF_SAMPLE.hoursPerWeekMin;
	return trains && profile.weightKg !== null && fatFreeMass(profile.weightKg, profile.bodyFatPct) !== null ? "cunningham" : "mifflin";
}

/** Průměr hodin tréninku týdně za 4 týdny před datem (včetně); u kratší historie za dobu od prvního tréninku, nejméně týden. */
export function weeklyTrainingHours(workouts: readonly WorkoutNote[], date: string, daysBetween: (from: string, to: string) => number): number | null {
	if (workouts.length === 0) return null;
	const first = workouts.reduce((min, w) => (w.date < min ? w.date : min), workouts[0]!.date);
	if (first > date) return null;
	const span = Math.min(28, Math.max(7, daysBetween(first, date) + 1));
	let minutes = 0;
	for (const w of workouts) {
		const age = daysBetween(w.date, date);
		if (age < 0 || age >= span) continue;
		minutes += w.duration_min ?? (w.run?.moving_time_s !== undefined ? w.run.moving_time_s / 60 : 0);
	}
	return minutes / 60 / (span / 7);
}

/** Co v profilu chybí pro výpočet (texty pro „doplň v nastavení“). */
export function missingProfile(profile: NutritionProfile, formula: RmrFormula): string[] {
	const missing: string[] = [];
	if (profile.weightKg === null) missing.push(t("hmotnost (check-in nebo profil)"));
	const ffmReady = needsFfm(formula) && profile.weightKg !== null && fatFreeMass(profile.weightKg, profile.bodyFatPct) !== null;
	if (!ffmReady) {
		if (profile.sex === null) missing.push(t("pohlaví"));
		if (profile.age === null) missing.push(t("rok narození"));
		if (profile.heightCm === null) missing.push(t("výška"));
	}
	return missing;
}

// ---------- 11.3 Běžná aktivita podle kroků ----------

/**
 * Úroveň běžné aktivity podle kroků za den (Tudor-Locke & Bassett 2004): pod 5 000
 * sedavý způsob života, 5 000–9 999 málo až středně aktivní, od 10 000 aktivní.
 * Přiřazení tříd ke koeficientům 1,2 / 1,4 / 1,6 je odhad – praxe.
 */
export const STEP_LEVELS = { light: 5000, active: 10000 } as const;

export function activityFromSteps(steps: number): ActivityLevel {
	if (steps >= STEP_LEVELS.active) return "active";
	return steps >= STEP_LEVELS.light ? "light" : "sedentary";
}

/**
 * Koeficient běžné aktivity z kroků – plynule, aby pár kroků kolem hranice neznamenalo skok
 * o stovky kcal: střed pásma sedavého (2 500 kroků) = koeficient „sedavá“, střed pásma
 * 5 000–9 999 (7 500) = „lehce aktivní“, 12 500 (velmi aktivní) = „aktivní“; mezi nimi přímka.
 */
export const STEP_ANCHORS: Record<ActivityLevel, number> = { sedentary: 2500, light: 7500, active: 12500 };

export function stepsFactor(steps: number, factors: Record<ActivityLevel, number>): number {
	const { sedentary, light, active } = STEP_ANCHORS;
	if (steps <= sedentary) return factors.sedentary;
	if (steps >= active) return factors.active;
	if (steps <= light) return factors.sedentary + ((steps - sedentary) / (light - sedentary)) * (factors.light - factors.sedentary);
	return factors.light + ((steps - light) / (active - light)) * (factors.active - factors.light);
}

/** Kroky naběhané při běhu se od denních kroků odečítají (běh se počítá zvlášť jako trénink) – asi 1 000 kroků na km, praxe. */
export const RUN_STEPS_PER_KM = 1000;
/** Bez kroků za daný den se bere průměr za předchozích 7 dní, pokud je v nich aspoň tolik záznamů. */
export const STEPS_AVERAGE_DAYS = 7;
export const STEPS_AVERAGE_MIN = 3;

export interface StepsActivity {
	level: ActivityLevel;
	/** Kroky mimo běh, ze kterých úroveň vyšla. */
	steps: number;
	/** Z kroků toho dne, nebo z průměru předchozích dnů. */
	source: "day" | "average";
	/** Počet dnů v průměru (u jednoho dne 1). */
	days: number;
}

/** Běžná aktivita dne z kroků; null, když nejsou kroky toho dne ani dost záznamů za poslední týden. */
export function stepsActivity(days: readonly DayNote[], workouts: readonly WorkoutNote[], date: string, daysBetween: (from: string, to: string) => number): StepsActivity | null {
	const runKm = new Map<string, number>();
	for (const w of workouts) {
		const km = w.sport === "run" ? w.run?.distance_km : undefined;
		if (km !== undefined && km > 0) runKm.set(w.date, (runKm.get(w.date) ?? 0) + km);
	}
	const net = (day: DayNote) => Math.max(0, (day.steps ?? 0) - (runKm.get(day.date) ?? 0) * RUN_STEPS_PER_KM);
	const withSteps = days.filter((d) => d.steps !== undefined);
	const today = withSteps.find((d) => d.date === date);
	if (today) return { level: activityFromSteps(net(today)), steps: Math.round(net(today)), source: "day", days: 1 };
	const recent = withSteps.filter((d) => {
		const age = daysBetween(d.date, date);
		return age >= 1 && age <= STEPS_AVERAGE_DAYS;
	});
	if (recent.length < STEPS_AVERAGE_MIN) return null;
	const average = recent.reduce((sum, d) => sum + net(d), 0) / recent.length;
	return { level: activityFromSteps(average), steps: Math.round(average), source: "average", days: recent.length };
}

// ---------- 11.2 Výdej z tréninku ----------

export type Intensity = "low" | "mid" | "high";

export const INTENSITY_LABELS: Record<Intensity, string> = translated({ low: "nízká", mid: "střední", high: "vysoká" });

/** RPE (CR-10) → intenzita: do 4 nízká, 5–6 střední, od 7 vysoká; bez RPE střední – praxe. */
export function intensityOfRpe(rpe: number | undefined): Intensity {
	if (rpe === undefined) return "mid";
	if (rpe <= 4) return "low";
	return rpe <= 6 ? "mid" : "high";
}

interface MetEntry {
	met: number;
	/** Kód aktivity v Compendium of Physical Activities 2024. */
	code: string;
}

/** MET podle sportu a intenzity (Compendium 2024, kódy aktivit). */
export const MET_TABLE: Record<Sport, Record<Intensity, MetEntry>> = {
	run: { low: { met: 7.5, code: "12020" }, mid: { met: 8.0, code: "12150" }, high: { met: 10.0, code: "12180" } },
	strength: { low: { met: 3.5, code: "02054" }, mid: { met: 5.0, code: "02052" }, high: { met: 6.0, code: "02050" } },
	calisthenics: { low: { met: 2.8, code: "02024" }, mid: { met: 3.8, code: "02022" }, high: { met: 7.5, code: "02020" } },
	kettlebell: { low: { met: 3.5, code: "02054" }, mid: { met: 6.0, code: "02050" }, high: { met: 9.8, code: "02058" } },
	swim: { low: { met: 5.8, code: "18240" }, mid: { met: 8.0, code: "18290" }, high: { met: 9.8, code: "18230" } },
	rope: { low: { met: 9.0, code: "02069" }, mid: { met: 11.0, code: "02068" }, high: { met: 11.0, code: "02068" } },
	other: { low: { met: 3.5, code: "02030" }, mid: { met: 5.5, code: "02060" }, high: { met: 7.8, code: "02062" } },
};

export interface WorkoutEnergy {
	/** Čistý výdej nad klidový (kcal); null = chybí délka tréninku. */
	netKcal: number | null;
	method: "run_distance" | "met" | "none";
	intensity: Intensity;
	met?: number;
	code?: string;
}

/**
 * Čistý výdej jednoho tréninku. Běh se vzdáleností: celkem ≈ 1 kcal × kg × km
 * (Margaria 1963) minus klidový výdej za dobu běhu. Ostatní: (MET − 1) × kg × hodiny.
 */
export function workoutEnergy(workout: WorkoutNote, weightKg: number, rmrKcalPerDay: number): WorkoutEnergy {
	const intensity = intensityOfRpe(workout.rpe);
	const distance = workout.run?.distance_km;
	const minutes = workout.run?.moving_time_s !== undefined ? workout.run.moving_time_s / 60 : workout.duration_min;
	if (workout.sport === "run" && distance !== undefined && distance > 0) {
		const total = weightKg * distance;
		const resting = minutes !== undefined ? (rmrKcalPerDay / 1440) * minutes : 0;
		return { netKcal: Math.max(0, total - resting), method: "run_distance", intensity };
	}
	if (workout.duration_min === undefined || workout.duration_min <= 0) return { netKcal: null, method: "none", intensity };
	const { met, code } = MET_TABLE[workout.sport][intensity];
	return { netKcal: (met - 1) * weightKg * (workout.duration_min / 60), method: "met", intensity, met, code };
}

// ---------- 11.5 Kategorie dne pro sacharidy ----------

export type DayLoad = "light" | "moderate" | "high" | "very_high";

export const DAY_LOADS: readonly DayLoad[] = ["light", "moderate", "high", "very_high"];

export const DAY_LOAD_LABELS: Record<DayLoad, string> = translated({
	light: "lehký den nebo volno",
	moderate: "střední (asi 1 h tréninku)",
	high: "vysoký (1–3 h střední až vysoké intenzity)",
	very_high: "velmi vysoký (4–5 h)",
});

/** Sacharidy v g/kg podle zátěže dne (Thomas 2016, ACSM/AND/DC). */
export const CARB_RANGES: Record<DayLoad, [number, number]> = {
	light: [3, 5],
	moderate: [5, 7],
	high: [6, 10],
	very_high: [8, 12],
};

/**
 * Zátěž dne z délky a intenzity tréninků – praxe (hranice nejsou z výzkumu):
 * pod 45 min nebo jen nízká intenzita lehký; do 1,5 h střední; do 4 h vysoký; od 4 h velmi vysoký.
 * Tréninky z denního počítadla bez délky se nepočítají.
 */
export function dayLoad(workouts: readonly WorkoutNote[]): DayLoad {
	let minutes = 0;
	let hardMinutes = 0;
	for (const w of workouts) {
		const m = w.duration_min ?? (w.run?.moving_time_s !== undefined ? w.run.moving_time_s / 60 : 0);
		minutes += m;
		if (intensityOfRpe(w.rpe) !== "low") hardMinutes += m;
	}
	if (minutes >= 240) return "very_high";
	if (minutes < 45 || hardMinutes < 30) return "light";
	return minutes < 90 ? "moderate" : "high";
}

// ---------- Celý plán dne ----------

/** Energie: 1 kg tělesné hmotnosti ≈ 7 700 kcal – praxe (hrubý odhad pro tempo hubnutí). */
export const KCAL_PER_KG = 7700;
/** Tuky nejméně 20 % energie (Thomas 2016). */
export const MIN_FAT_SHARE = 0.2;
/** Bílkoviny v deficitu: 2,3–3,1 g/kg beztukové hmoty (Helms 2014). */
export const CUT_PROTEIN_G_PER_KG_FFM: [number, number] = [2.3, 3.1];
/** Rozsah bílkovin bez deficitu: 1,6–2,2 g/kg (Morton 2018). */
export const PROTEIN_G_PER_KG: [number, number] = [1.6, 2.2];

export interface Range {
	min: number;
	max: number;
}

export interface WorkoutEnergyRow {
	workout: WorkoutNote;
	energy: WorkoutEnergy;
	/** Trénink z plánu týdne, který ještě není zapsaný (odhad z plánované délky a intenzity). */
	planned?: boolean;
}

export interface NutritionPlan {
	rmr: RmrResult;
	/** RMR ± přesnost rovnice. */
	rmrRange: Range;
	/** Proč může být odhad RMR méně spolehlivý (profil mimo skupinu, na které rovnice vznikla). */
	rmrNotes: string[];
	/** Střed doporučení – „asi tolik“; rozsah je v `intake`. */
	target: number;
	/** Úroveň běžné aktivity, která se použila (z kroků, jinak z nastavení). */
	activity: ActivityLevel;
	activityFactor: number;
	workouts: WorkoutEnergyRow[];
	/** Součet čistého výdeje tréninků (tréninky bez délky = 0). */
	exerciseKcal: number;
	/** Osobní korekce podle vývoje váhy, která je ve výdeji započtená (kcal/den; 0 = žádná). */
	correctionKcal: number;
	/** TDEE = RMR × koeficient + výdej z tréninků + osobní korekce. */
	tdee: number;
	tdeeRange: Range;
	/** Doporučený příjem po úpravě podle cíle a pojistkách. */
	intake: Range;
	/** Úprava podle cíle (kcal, záporná = deficit) – pro rozpad výpočtu. */
	goalAdjust: Range;
	ffmKg: number | null;
	/** Energetická dostupnost u spodní hranice doporučení (kcal/kg FFM). */
	energyAvailability: number;
	/** EA se počítala s celou hmotností, protože chybí % tuku (přísnější odhad). */
	eaUsesBodyWeight: boolean;
	/** Spodní hranice musela jít nahoru kvůli EA nebo RMR. */
	raisedFor: ("ea" | "rmr")[];
	load: DayLoad;
	protein: Range;
	carbs: Range;
	fat: Range;
	/** Sacharidy se do energie nevešly v doporučeném rozsahu. */
	carbsShort: boolean;
}

export interface NutritionInput {
	profile: NutritionProfile;
	settings: NutritionSettings;
	/** Práh energetické dostupnosti (kcal/kg FFM/den) z nastavení. */
	eaMin: number;
	/** Tréninky daného dne. */
	workouts: readonly WorkoutNote[];
	/** Nesplněné položky plánu týdne jako tréninky (calc/weekPlan.plannedWorkout) – počítají se stejně jako zapsané. */
	planned?: readonly WorkoutNote[];
	/** Ruční volba zátěže dne (dnešek, kdy trénink ještě není zapsaný). */
	loadOverride?: DayLoad;
}

/** Největší osobní korekce výdeje – větší rozdíl už nejspíš není chyba odhadu, ale jiný příjem, než je doporučení. */
export const MAX_CORRECTION_KCAL = 500;

/** Korekce v povoleném rozsahu; neplatná hodnota = 0. */
export function clampCorrection(kcal: number | undefined): number {
	if (kcal === undefined || !Number.isFinite(kcal)) return 0;
	return Math.min(MAX_CORRECTION_KCAL, Math.max(-MAX_CORRECTION_KCAL, Math.round(kcal)));
}

const round = (n: number, step = 10) => Math.round(n / step) * step;

/** Doporučený denní příjem; null, když chybí údaje v profilu (viz `missingProfile`). */
export function nutritionPlan(input: NutritionInput): NutritionPlan | null {
	const { profile, settings } = input;
	const rmr = restingRmr(profile, settings.rmrFormula);
	if (rmr === null || profile.weightKg === null) return null;
	const kg = profile.weightKg;
	const activity = profile.steps?.level ?? profile.activity;
	const factor = profile.steps ? stepsFactor(profile.steps.steps, settings.activityFactors) : settings.activityFactors[activity];

	const dayWorkouts = [...input.workouts, ...(input.planned ?? [])];
	const workouts: WorkoutEnergyRow[] = [
		...input.workouts.map((workout) => ({ workout, energy: workoutEnergy(workout, kg, rmr.kcal) })),
		...(input.planned ?? []).map((workout) => ({ workout, energy: workoutEnergy(workout, kg, rmr.kcal), planned: true })),
	];
	const exerciseKcal = workouts.reduce((sum, w) => sum + (w.energy.netKcal ?? 0), 0);
	// Osobní korekce podle vývoje váhy (11.6): posune celý odhad výdeje.
	const correctionKcal = clampCorrection(settings.correctionKcal);
	const tdee = rmr.kcal * factor + exerciseKcal + correctionKcal;
	const tdeeRange = {
		min: rmr.kcal * (1 - RMR_UNCERTAINTY) * factor + exerciseKcal + correctionKcal,
		max: rmr.kcal * (1 + RMR_UNCERTAINTY) * factor + exerciseKcal + correctionKcal,
	};

	// 11.4 Úprava podle cíle.
	let goalAdjust: Range;
	if (profile.goal === "lose") {
		const perDay = (pct: number) => (kg * (pct / 100) * KCAL_PER_KG) / 7;
		goalAdjust = { min: -perDay(settings.lossRatePctMax), max: -perDay(settings.lossRatePctMin) };
	} else if (profile.goal === "gain") {
		goalAdjust = { min: (tdee * settings.gainSurplusPctMin) / 100, max: (tdee * settings.gainSurplusPctMax) / 100 };
	} else {
		goalAdjust = { min: tdeeRange.min - tdee, max: tdeeRange.max - tdee };
	}
	let intake: Range = { min: tdee + goalAdjust.min, max: tdee + goalAdjust.max };

	// Pojistky: nikdy pod RMR, energetická dostupnost aspoň eaMin.
	const ffm = fatFreeMass(kg, profile.bodyFatPct);
	const eaMass = ffm ?? kg;
	const raisedFor: ("ea" | "rmr")[] = [];
	const eaFloor = input.eaMin * eaMass + exerciseKcal;
	const floor = Math.max(eaFloor, rmr.kcal);
	// Hlásí se jen pojistka, která opravdu rozhodla (vyšší z obou hranic). Při udržování a nabírání
	// je spodní konec rozsahu jen nejistota odhadu, ne záměr jíst míň – hlásí se až doporučení samo.
	const intended = profile.goal === "lose" ? intake.min : tdee + (goalAdjust.min + goalAdjust.max) / 2;
	if (intended < floor) raisedFor.push(eaFloor >= rmr.kcal ? "ea" : "rmr");
	if (intake.min < floor) intake = { min: floor, max: Math.max(intake.max, floor) };
	intake = { min: round(intake.min), max: round(intake.max) };
	const target = Math.min(intake.max, Math.max(intake.min, round(tdee + (goalAdjust.min + goalAdjust.max) / 2)));

	// 11.5 Makroživiny.
	const load = input.loadOverride ?? dayLoad(dayWorkouts);
	const protein: Range =
		profile.goal === "lose" && ffm !== null
			? { min: CUT_PROTEIN_G_PER_KG_FFM[0] * ffm, max: CUT_PROTEIN_G_PER_KG_FFM[1] * ffm }
			: { min: PROTEIN_G_PER_KG[0] * kg, max: Math.max(PROTEIN_G_PER_KG[1], settings.proteinGPerKg) * kg };
	const [cMin, cMax] = CARB_RANGES[load];
	const fatMin = (MIN_FAT_SHARE * intake.min) / 9;
	// Priorita: bílkoviny → minimum tuků → sacharidy (SPEC 11.5).
	const carbRoom = (kcal: number, proteinG: number) => Math.max(0, (kcal - proteinG * 4 - ((MIN_FAT_SHARE * kcal) / 9) * 9) / 4);
	const carbs: Range = {
		min: Math.min(cMin * kg, carbRoom(intake.min, protein.min)),
		max: Math.min(cMax * kg, carbRoom(intake.max, protein.min)),
	};
	const carbsShort = carbRoom(intake.min, protein.min) < cMin * kg;
	// Tuky = zbytek energie, ale aspoň 20 %. Horní mez při středních bílkovinách a sacharidech,
	// ať rozsah nevychází z extrémní kombinace (nejméně bílkovin i sacharidů zároveň).
	const fatRest = (kcal: number, proteinG: number, carbG: number) => (kcal - proteinG * 4 - carbG * 4) / 9;
	const mid = (r: Range) => (r.min + r.max) / 2;
	const fat: Range = {
		min: Math.max(fatMin, fatRest(intake.min, protein.max, carbs.max)),
		max: Math.max(fatMin, fatRest(intake.max, mid(protein), mid(carbs))),
	};
	if (fat.max < fat.min) fat.max = fat.min;

	return {
		rmr,
		rmrRange: { min: rmr.kcal * (1 - RMR_UNCERTAINTY), max: rmr.kcal * (1 + RMR_UNCERTAINTY) },
		rmrNotes: rmr.formula === "ten_haaf" || rmr.formula === "ten_haaf_ffm" ? tenHaafOutOfRange(profile) : [],
		target,
		activity,
		activityFactor: factor,
		workouts,
		exerciseKcal,
		correctionKcal,
		tdee,
		tdeeRange,
		intake,
		goalAdjust,
		ffmKg: ffm,
		energyAvailability: (intake.min - exerciseKcal) / eaMass,
		eaUsesBodyWeight: ffm === null,
		raisedFor,
		load,
		protein: { min: round(protein.min, 5), max: round(protein.max, 5) },
		carbs: { min: round(carbs.min, 5), max: round(carbs.max, 5) },
		fat: { min: round(fat.min, 5), max: round(fat.max, 5) },
		carbsShort,
	};
}
