// Popis prahů pro obrazovku nastavení. Výchozí hodnoty jsou v DEFAULT_THRESHOLDS.

import type { ThresholdSettings } from "./settings";

export interface ThresholdField {
	key: keyof ThresholdSettings;
	label: string;
	desc?: string;
	unit?: string;
	min: number;
	max: number;
	step: number;
}

export interface ThresholdGroup {
	title: string;
	fields: ThresholdField[];
}

export const THRESHOLD_GROUPS: ThresholdGroup[] = [
	{
		title: "Load (SPEC 8.2–8.4)",
		fields: [
			{ key: "ctlDays", label: "Fitness (CTL) – time constant", unit: "days", min: 7, max: 90, step: 1 },
			{ key: "atlDays", label: "Fatigue (ATL) – time constant", unit: "days", min: 2, max: 21, step: 1 },
			{ key: "loadModelMinDays", label: "Minimum dat pro model kondice", unit: "days", min: 7, max: 90, step: 1 },
			{ key: "acwrAcuteDays", label: "ACWR – acute window", unit: "days", min: 3, max: 14, step: 1 },
			{ key: "acwrChronicDays", label: "ACWR – chronic window", unit: "days", min: 14, max: 60, step: 1 },
			{ key: "acwrWarn", label: "ACWR – upozornit nad", min: 1, max: 3, step: 0.05 },
			{ key: "monotonyWarn", label: "Monotony – warn above", min: 1, max: 5, step: 0.1 },
		],
	},
	{
		title: "Muscle volume and recovery (SPEC 8.5)",
		fields: [
			{ key: "weeklySetsLow", label: "Low volume – below", unit: "sets/week", min: 0, max: 30, step: 1 },
			{ key: "weeklySetsTargetMin", label: "Recommended volume – from", unit: "sets/week", min: 1, max: 40, step: 1 },
			{ key: "weeklySetsTargetMax", label: "Recommended volume – to", unit: "sets/week", min: 1, max: 60, step: 1 },
			{ key: "effectiveRirMax", label: "Effective set – RIR at most", min: 0, max: 10, step: 1 },
			{
				key: "effectiveMinPct1rm",
				label: "Effective set without RIR – at least",
				desc: "Percentage of estimated 1RM in the gym when RIR is missing.",
				unit: "% 1RM",
				min: 0,
				max: 100,
				step: 1,
			},
			{ key: "holdEffectivePctOfMax", label: "Effective hold – at least", unit: "% maxima", min: 0, max: 100, step: 1 },
			{ key: "blockEffectiveMinRpe", label: "EMOM/AMRAP/complex counts from RPE", min: 0, max: 10, step: 1 },
			{ key: "recoveryMinSets", label: "Recovery – trained muscle group from", unit: "effective sets", min: 1, max: 10, step: 1 },
			{ key: "recoveryHours1", label: "Recovery – band 1", unit: "h", min: 1, max: 168, step: 1 },
			{ key: "recoveryHours2", label: "Recovery – band 2", unit: "h", min: 1, max: 168, step: 1 },
			{ key: "recoveryHours3", label: "Recovery – band 3", unit: "h", min: 1, max: 168, step: 1 },
		],
	},
	{
		title: "Progrese (SPEC 9.3)",
		fields: [
			{ key: "progressionRirMin", label: "Increase when all sets had RIR of at least", min: 0, max: 5, step: 1 },
			{ key: "incrementUpperKg", label: "Increase – upper body", unit: "kg", min: 0, max: 20, step: 0.25 },
			{ key: "incrementLowerKg", label: "Increase – lower body", unit: "kg", min: 0, max: 40, step: 0.25 },
		],
	},
	{
		title: "Dovednosti (SPEC 5.6)",
		fields: [
			{ key: "skillSets", label: "Move to the next level – sets in a workout", min: 1, max: 10, step: 1 },
			{ key: "skillReps", label: "Progression – reps in every set", min: 1, max: 50, step: 1 },
			{ key: "skillHoldSec", label: "Progression – hold in every set", unit: "s", min: 1, max: 300, step: 1 },
		],
	},
	{
		title: "Deload week (SPEC 9.4)",
		fields: [
			{ key: "deloadTsbPct", label: "Forma pod −X % kondice", unit: "%", min: 5, max: 100, step: 1 },
			{ key: "deloadTsbDays", label: "… for this many days", unit: "days", min: 1, max: 28, step: 1 },
			{ key: "deloadHrvLowDays", label: "HRV below normal at least", desc: "Out of the last 7 days.", unit: "days", min: 1, max: 7, step: 1 },
			{ key: "stagnationWeeks", label: "Performance plateau", unit: "weeks", min: 1, max: 12, step: 1 },
		],
	},
	{
		title: "HRV and sleep (SPEC 8.8–8.9)",
		fields: [
			{ key: "hrvWindowDays", label: "HRV – rolling average", unit: "days", min: 3, max: 14, step: 1 },
			{ key: "hrvBaselineDays", label: "HRV – personal baseline from the last", unit: "days", min: 14, max: 180, step: 1 },
			{ key: "hrvMinSamples", label: "HRV – minimum readings for the baseline", min: 5, max: 60, step: 1 },
			{ key: "hrvSdFactor", label: "HRV – width of the normal range", unit: "× SD", min: 0.1, max: 2, step: 0.1 },
			{ key: "sleepTargetHours", label: "Target sleep duration", unit: "h", min: 4, max: 12, step: 0.25 },
		],
	},
	{
		title: "Running and equipment (SPEC 8.7, 5.10)",
		fields: [
			{ key: "intenseShareWarnPct", label: "Share of high-intensity time – warn above", unit: "%", min: 0, max: 100, step: 1 },
			{ key: "shoeLimitKm", label: "Limit bot", unit: "km", min: 100, max: 3000, step: 10 },
		],
	},
	{
		title: "Health and nutrition (SPEC 10, 11.4)",
		fields: [
			{ key: "painProfessionalLevel", label: "Recommend a professional from pain level", unit: "/10", min: 1, max: 10, step: 1 },
			{ key: "painProfessionalDays", label: "Recommend a professional after", unit: "days without improvement", min: 1, max: 60, step: 1 },
			{
				key: "eaMinKcalPerKgFfm",
				label: "Energy availability – minimum",
				desc: "Rough threshold (IOC REDs 2023).",
				unit: "kcal/kg FFM",
				min: 20,
				max: 45,
				step: 1,
			},
		],
	},
];
