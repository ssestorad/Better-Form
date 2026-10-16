// Popis prahů pro obrazovku nastavení. Výchozí hodnoty jsou v DEFAULT_THRESHOLDS.

import type { ThresholdSettings } from "./settings";
import { t } from "../i18n";

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
		title: "Zátěž (SPEC 8.2–8.4)",
		fields: [
			{ key: "ctlDays", label: "Kondice (CTL) – časová konstanta", unit: "dní", min: 7, max: 90, step: 1 },
			{ key: "atlDays", label: "Únava (ATL) – časová konstanta", unit: "dní", min: 2, max: 21, step: 1 },
			{ key: "loadModelMinDays", label: "Minimum dat pro model kondice", unit: "dní", min: 7, max: 90, step: 1 },
			{ key: "acwrAcuteDays", label: "ACWR – akutní okno", unit: "dní", min: 3, max: 14, step: 1 },
			{ key: "acwrChronicDays", label: "ACWR – chronické okno", unit: "dní", min: 14, max: 60, step: 1 },
			{ key: "acwrWarn", label: "ACWR – upozornit nad", min: 1, max: 3, step: 0.05 },
			{ key: "monotonyWarn", label: "Monotónnost – upozornit nad", min: 1, max: 5, step: 0.1 },
		],
	},
	{
		title: "Svalový objem a regenerace (SPEC 8.5)",
		fields: [
			{ key: "weeklySetsLow", label: "Nízký objem – pod", unit: "sérií/týden", min: 0, max: 30, step: 1 },
			{ key: "weeklySetsTargetMin", label: "Doporučený objem – od", unit: "sérií/týden", min: 1, max: 40, step: 1 },
			{ key: "weeklySetsTargetMax", label: "Doporučený objem – do", unit: "sérií/týden", min: 1, max: 60, step: 1 },
			{ key: "effectiveRirMax", label: "Efektivní série – RIR nejvýš", min: 0, max: 10, step: 1 },
			{
				key: "effectiveMinPct1rm",
				label: "Efektivní série bez RIR – aspoň",
				desc: "Procento odhadovaného 1RM u posilovny, když chybí RIR.",
				unit: "% 1RM",
				min: 0,
				max: 100,
				step: 1,
			},
			{ key: "holdEffectivePctOfMax", label: "Efektivní výdrž – aspoň", unit: "% maxima", min: 0, max: 100, step: 1 },
			{ key: "blockEffectiveMinRpe", label: "EMOM/AMRAP/komplex se počítá od RPE", min: 0, max: 10, step: 1 },
			{ key: "recoveryMinSets", label: "Regenerace – trénink partie od", unit: "efekt. sérií", min: 1, max: 10, step: 1 },
			{ key: "recoveryHours1", label: "Regenerace – 1. pásmo", unit: "h", min: 1, max: 168, step: 1 },
			{ key: "recoveryHours2", label: "Regenerace – 2. pásmo", unit: "h", min: 1, max: 168, step: 1 },
			{ key: "recoveryHours3", label: "Regenerace – 3. pásmo", unit: "h", min: 1, max: 168, step: 1 },
		],
	},
	{
		title: "Progrese (SPEC 9.3)",
		fields: [
			{ key: "progressionRirMin", label: "Navýšit, když všechny série měly RIR aspoň", min: 0, max: 5, step: 1 },
			{ key: "incrementUpperKg", label: "Navýšení – horní polovina těla", unit: "kg", min: 0, max: 20, step: 0.25 },
			{ key: "incrementLowerKg", label: "Navýšení – dolní polovina těla", unit: "kg", min: 0, max: 40, step: 0.25 },
		],
	},
	{
		title: "Dovednosti (SPEC 5.6)",
		fields: [
			{ key: "skillSets", label: "Postup na další stupeň – sérií v tréninku", min: 1, max: 10, step: 1 },
			{ key: "skillReps", label: "Postup – opakování v každé sérii", min: 1, max: 50, step: 1 },
			{ key: "skillHoldSec", label: "Postup – výdrž v každé sérii", unit: "s", min: 1, max: 300, step: 1 },
		],
	},
	{
		title: "Odlehčený týden (SPEC 9.4)",
		fields: [
			{ key: "deloadTsbPct", label: "Forma pod −X % kondice", unit: "%", min: 5, max: 100, step: 1 },
			{ key: "deloadTsbDays", label: "… po tolik dní", unit: "dní", min: 1, max: 28, step: 1 },
			{ key: "deloadHrvLowDays", label: "HRV pod normou aspoň", desc: "Z posledních 7 dní.", unit: "dní", min: 1, max: 7, step: 1 },
			{ key: "stagnationWeeks", label: "Stagnace výkonů", unit: "týdnů", min: 1, max: 12, step: 1 },
		],
	},
	{
		title: "HRV a spánek (SPEC 8.8–8.9)",
		fields: [
			{ key: "hrvWindowDays", label: "HRV – klouzavý průměr", unit: "dní", min: 3, max: 14, step: 1 },
			{ key: "hrvBaselineDays", label: "HRV – osobní norma z posledních", unit: "dní", min: 14, max: 180, step: 1 },
			{ key: "hrvMinSamples", label: "HRV – minimum měření pro normu", min: 5, max: 60, step: 1 },
			{ key: "hrvSdFactor", label: "HRV – šířka normy", unit: "× SD", min: 0.1, max: 2, step: 0.1 },
			{ key: "sleepTargetHours", label: "Cílová délka spánku", unit: "h", min: 4, max: 12, step: 0.25 },
		],
	},
	{
		title: "Běh a vybavení (SPEC 8.7, 5.10)",
		fields: [
			{ key: "intenseShareWarnPct", label: "Podíl intenzivního času – upozornit nad", unit: "%", min: 0, max: 100, step: 1 },
			{ key: "shoeLimitKm", label: "Limit bot", unit: "km", min: 100, max: 3000, step: 10 },
		],
	},
	{
		title: "Zdraví a výživa (SPEC 10, 11.4)",
		fields: [
			{ key: "painProfessionalLevel", label: "Doporučit odborníka od bolesti", unit: "/10", min: 1, max: 10, step: 1 },
			{ key: "painProfessionalDays", label: "Doporučit odborníka po", unit: "dní bez zlepšení", min: 1, max: 60, step: 1 },
			{
				key: "eaMinKcalPerKgFfm",
				label: "Energetická dostupnost – minimum",
				desc: "Orientační práh (IOC REDs 2023).",
				unit: "kcal/kg FFM",
				min: 20,
				max: 45,
				step: 1,
			},
		],
	},
];
