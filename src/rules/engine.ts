// Vyhodnocení pravidel a sestavení jejich kontextu z dat (SPEC kap. 10).
// Čisté funkce bez závislosti na Obsidianu.

import { daySamples } from "../calc/chartData";
import { checkInTrend, deloadSignals, stagnation } from "../calc/deload";
import { acwr, fitnessSeries, loadDataDays, lowFormDays, monotony } from "../calc/fitness";
import { baseline, daysInStatus, hrvBaseline, type BaselineOptions } from "../calc/hrv";
import { dailyLoads } from "../calc/load";
import { recovery, volumeHistory, weeklySets, type Recovery, type VolumeContext } from "../calc/muscleVolume";
import { assessPain, isOpenPain } from "../calc/pain";
import type { SessionBest } from "../calc/records";
import { intensityShare } from "../calc/running";
import { sleepDurationMin } from "../calc/sleep";
import { mean } from "../calc/stats";
import { MUSCLES, type MuscleId } from "../model/constants";
import { addDays } from "../model/dates";
import type { DayNote, PainNote, WorkoutNote } from "../model/types";
import type { ThresholdSettings } from "../settings/settings";
import { RULES } from "./rules";
import type { Recommendation, RecommendationLevel, Rule, RuleContext, RuleGoal, RulePlan } from "./types";

const LEVEL_ORDER: Record<RecommendationLevel, number> = { warn: 0, suggest: 1, info: 2 };

/** Kolik doporučení se ukáže na kartě Dnes hned; zbytek je rozbalitelný. */
export const MAX_MAIN_RECOMMENDATIONS = 3;

/**
 * Vyhodnotí pravidla a seřadí doporučení podle závažnosti (varování, návrhy,
 * informace); při shodě rozhoduje pořadí pravidel. Zdroje a štítek se berou
 * z definice pravidla, takže je má každé doporučení.
 */
export function evaluateRules(ctx: RuleContext, rules: readonly Rule[] = RULES): Recommendation[] {
	const out: Recommendation[] = [];
	for (const rule of rules) {
		const result = rule.evaluate(ctx);
		if (result) out.push({ ...result, ruleId: rule.id, sourceIds: [...rule.sources], evidence: rule.evidence });
	}
	return out
		.map((rec, index) => ({ rec, index }))
		.sort((a, b) => LEVEL_ORDER[a.rec.level] - LEVEL_ORDER[b.rec.level] || a.index - b.index)
		.map(({ rec }) => rec);
}

// ---------- Kontext ----------

/** Osobní průměr spánku: předchozích 28 dní, aspoň 7 nocí. */
export const SLEEP_AVERAGE_DAYS = 28;
export const SLEEP_AVERAGE_MIN_NIGHTS = 7;
/** Pravidlo o objemu se ozve, jen když jsou za tolik dní zapsané nějaké efektivní série. */
export const VOLUME_DATA_DAYS = 28;
/** Okno, ve kterém se počítají dny s HRV pod normou (SPEC 9.4). */
export const HRV_LOW_WINDOW_DAYS = 7;

export interface ContextInput {
	today: string;
	/** Aktuální čas v ms (pro hodiny od posledního tréninku partie). */
	nowMs: number;
	workouts: readonly WorkoutNote[];
	days: readonly DayNote[];
	pains: readonly PainNote[];
	thresholds: ThresholdSettings;
	focusMuscles: MuscleId[];
	volume: VolumeContext;
	/** Nejlepší výkony cviků po dnech (records.exerciseSeries). */
	series: ReadonlyMap<string, readonly SessionBest[]>;
	/** Cviky z dnešních nesplněných úkolů programů. */
	plannedExercises: readonly string[];
	/** Aktivní denní výzvy bez volných dnů a jejich cviky. */
	challenges: readonly { name: string; exercises: readonly string[] }[];
	goals: RuleGoal[];
	/** Plán týdne (dnešní nesplněné položky, výhled zátěže). */
	plan?: RulePlan | null;
	/** Týdenní kontrola výživy podle váhy. */
	nutritionCheck?: { stepKcal: number } | null;
}

function sleepOf(day: DayNote | undefined): number | null {
	if (!day) return null;
	const minutes = day.sleep.duration_min ?? sleepDurationMin(day.sleep);
	return minutes !== null && minutes !== undefined && minutes > 0 ? minutes : null;
}

export function baselineOptions(th: ThresholdSettings): BaselineOptions {
	return { windowDays: th.hrvWindowDays, baselineDays: th.hrvBaselineDays, minSamples: th.hrvMinSamples, sdFactor: th.hrvSdFactor };
}

/** Sestaví kontext pravidel z tréninků, denních poznámek, bolestí a nastavení. */
export function buildContext(input: ContextInput): RuleContext {
	const { today, thresholds: t, workouts, days } = input;
	const options = baselineOptions(t);

	// Spánek.
	const byDay = new Map(days.map((d) => [d.date, d]));
	const nights: number[] = [];
	for (let i = 1; i <= SLEEP_AVERAGE_DAYS; i++) {
		const minutes = sleepOf(byDay.get(addDays(today, -i)));
		if (minutes !== null) nights.push(minutes);
	}

	// HRV a klidový tep.
	const hrvSamples = daySamples(days, (d) => d.hrv.rmssd_ms);
	const rhrSamples = daySamples(days, (d) => d.hrv.resting_hr);
	const hrv = hrvSamples.length > 0 ? hrvBaseline(hrvSamples, today, options) : null;
	const restingHr = rhrSamples.length > 0 ? baseline(rhrSamples, today, options) : null;

	// Zátěž.
	const { byDate } = dailyLoads(workouts.filter((w) => w.date <= today));
	const modelReady = loadDataDays(byDate, today) >= t.loadModelMinDays;
	const fitness = modelReady ? fitnessSeries(byDate, addDays(today, -(t.deloadTsbDays - 1)), today, t.ctlDays, t.atlDays) : [];
	const lastPoint = fitness[fitness.length - 1];

	// Svalový objem a regenerace.
	const history = volumeHistory(workouts, input.volume);
	const recoveryThresholds = { minSets: t.recoveryMinSets, hours1: t.recoveryHours1, hours2: t.recoveryHours2, hours3: t.recoveryHours3 };
	const recoveries = Object.fromEntries(MUSCLES.map((m) => [m, recovery(history, m, input.nowMs, recoveryThresholds)])) as Record<MuscleId, Recovery>;
	const primaryOf = (exercises: readonly string[]): MuscleId[] => [...new Set(exercises.flatMap((e) => input.volume.info(e)?.muscles.primary ?? []))];

	const pains = input.pains.filter((p) => isOpenPain(p) && p.level > 0).map((p) => assessPain(p, today, { professionalLevel: t.painProfessionalLevel, professionalDays: t.painProfessionalDays }));
	const checkIn = checkInTrend(days, today);

	return {
		today,
		thresholds: t,
		sleep: { lastMin: sleepOf(byDay.get(today)), averageMin: nights.length >= SLEEP_AVERAGE_MIN_NIGHTS ? mean(nights) : null },
		hrv,
		restingHr,
		acwr: acwr(byDate, today, t.acwrAcuteDays, t.acwrChronicDays),
		monotony: monotony(byDate, today, 7),
		form: lastPoint ? { ctl: lastPoint.ctl, tsb: lastPoint.tsb } : null,
		weeklySets: weeklySets(history, today),
		hasVolumeData: history.some((h) => h.date > addDays(today, -VOLUME_DATA_DAYS) && h.date <= today && Object.keys(h.muscles).length > 0),
		focusMuscles: input.focusMuscles,
		recoveries,
		plannedMuscles: primaryOf(input.plannedExercises),
		intensity: intensityShare(workouts, today, 28),
		pains,
		checkIn,
		deload: deloadSignals({
			lowFormDays: modelReady ? lowFormDays(fitness, t.deloadTsbDays, t.deloadTsbPct) : null,
			tsbDays: t.deloadTsbDays,
			tsbPct: t.deloadTsbPct,
			hrvLowDays: hrv?.ready ? daysInStatus(hrvSamples.filter((s) => s.value > 0), today, HRV_LOW_WINDOW_DAYS, "below", options, Math.log) : null,
			hrvDaysNeeded: t.deloadHrvLowDays,
			checkIn,
			stagnation: stagnation(input.series, today, t.stagnationWeeks),
			stagnationWeeks: t.stagnationWeeks,
		}),
		goals: input.goals,
		challenges: input.challenges.map((c) => ({ name: c.name, muscles: primaryOf(c.exercises) })),
		plan: input.plan ?? null,
		nutritionCheck: input.nutritionCheck ?? null,
	};
}
