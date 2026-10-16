// Roční souhrn „Rok v číslech“ (SPEC 9.5): text generovaného bloku poznámky
// v Souhrny/RRRR.md. Bez závislosti na Obsidianu.

import { SPORT_LABELS, SPORTS } from "../model/constants";
import type { DayNote, TestNote, WorkoutNote } from "../model/types";
import { formatDurationMin, formatNumber, formatShortDate } from "../ui/format";
import { percentChange } from "./monthlySummary";
import { periodLabel, periodOf, periodStats, shiftPeriod, type PeriodStats, type TonnageContext } from "./overview";
import { allRecords, newRecords, type RecordContext } from "./records";
import { sleepDurationMin } from "./sleep";
import { mean } from "./stats";
import { t } from "../i18n";

export interface YearMonthRow {
	/** Měsíc ve tvaru YYYY-MM. */
	month: string;
	stats: PeriodStats;
}

export interface YearSummaryInput {
	year: number;
	stats: PeriodStats;
	previous: PeriodStats;
	/** Všech dvanáct měsíců roku. */
	months: YearMonthRow[];
	/** Texty rekordů překonaných během roku. */
	records: string[];
	sleepAvgMin: number | null;
	previousSleepAvgMin: number | null;
	/** Změna hmotnosti od prvního do posledního vážení v roce; null bez dvou vážení. */
	weightChangeKg: number | null;
	/** Nejdelší běh roku. */
	longestRun: { km: number; date: string } | null;
	/** Nejdelší trénink roku podle délky. */
	longestWorkout: { minutes: number; date: string } | null;
	/** Nejvíc tréninků za jeden kalendářní týden (po–ne). */
	bestWeek: { workouts: number; from: string } | null;
}

/** Platný rok pro souhrn (čtyři číslice, rozumný rozsah). */
export function isYear(value: number): boolean {
	return Number.isInteger(value) && value >= 1970 && value <= 2200;
}

/** 1 trénink, 2–4 tréninky, 5 a víc tréninků. */
const workoutsText = (n: number) => `${n} ${n === 1 ? "trénink" : n >= 2 && n <= 4 ? "tréninky" : "tréninků"}`;

function row(label: string, current: string, previous: string, change: string): string {
	return `| ${label} | ${current} | ${previous} | ${change} |`;
}

/** Vstup ročního souhrnu z tréninků, denních poznámek a testů. */
export function yearSummaryInput(
	year: number,
	workouts: readonly WorkoutNote[],
	days: readonly DayNote[],
	tests: readonly TestNote[],
	ctx: RecordContext & TonnageContext,
): YearSummaryInput {
	const period = periodOf("year", `${year}-01-01`);
	const before = shiftPeriod(period, -1);
	const inYear = workouts.filter((w) => w.date >= period.from && w.date <= period.to);
	const sleepAvg = (from: string, to: string): number | null =>
		mean(
			days
				.filter((d) => d.date >= from && d.date <= to)
				.map((d) => d.sleep.duration_min ?? sleepDurationMin(d.sleep))
				.filter((v): v is number => v !== null && v !== undefined && v > 0),
		);
	const weights = days
		.filter((d) => d.date >= period.from && d.date <= period.to && d.body.weight_kg !== undefined)
		.sort((a, b) => a.date.localeCompare(b.date))
		.map((d) => d.body.weight_kg!);

	let longestRun: YearSummaryInput["longestRun"] = null;
	let longestWorkout: YearSummaryInput["longestWorkout"] = null;
	const perWeek = new Map<string, number>();
	for (const w of inYear) {
		const km = w.sport === "run" ? w.run?.distance_km : undefined;
		if (km !== undefined && km > 0 && (longestRun === null || km > longestRun.km)) longestRun = { km, date: w.date };
		const minutes = w.duration_min;
		if (minutes !== undefined && minutes > 0 && (longestWorkout === null || minutes > longestWorkout.minutes)) longestWorkout = { minutes, date: w.date };
		const week = periodOf("week", w.date).from;
		perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
	}
	let bestWeek: YearSummaryInput["bestWeek"] = null;
	for (const [from, count] of [...perWeek].sort(([a], [b]) => a.localeCompare(b))) {
		if (bestWeek === null || count > bestWeek.workouts) bestWeek = { workouts: count, from };
	}

	const recordsBefore = allRecords(
		workouts.filter((w) => w.date < period.from),
		tests.filter((x) => x.date < period.from),
		ctx,
	);
	const recordsAfter = allRecords(
		workouts.filter((w) => w.date <= period.to),
		tests.filter((x) => x.date <= period.to),
		ctx,
	);
	return {
		year,
		stats: periodStats(workouts, period.from, period.to, ctx),
		previous: periodStats(workouts, before.from, before.to, ctx),
		months: Array.from({ length: 12 }, (_, i) => {
			const month = periodOf("month", `${year}-${String(i + 1).padStart(2, "0")}-01`);
			return { month: month.from.slice(0, 7), stats: periodStats(workouts, month.from, month.to, ctx) };
		}),
		records: newRecords(recordsBefore, recordsAfter).map((r) => r.text),
		sleepAvgMin: sleepAvg(period.from, period.to),
		previousSleepAvgMin: sleepAvg(before.from, before.to),
		weightChangeKg: weights.length >= 2 ? weights[weights.length - 1]! - weights[0]! : null,
		longestRun,
		longestWorkout,
		bestWeek,
	};
}

/** Markdown ročního souhrnu: srovnání s loňskem, měsíce, nej roku a rekordy. */
export function renderYearlySummary(input: YearSummaryInput): string {
	const { stats, previous } = input;
	const lines: string[] = [t("**Rok {year} v číslech**", { year: input.year }), ""];
	if (stats.workouts === 0) {
		lines.push(t("V tomto roce není zapsaný žádný trénink."));
		return lines.join("\n");
	}

	lines.push(t("| | Letos | Loni | Změna |"), "| --- | ---: | ---: | ---: |");
	lines.push(row(t("Tréninky"), String(stats.workouts), String(previous.workouts), percentChange(stats.workouts, previous.workouts)));
	lines.push(row(t("Dny s tréninkem"), String(stats.activeDays), String(previous.activeDays), percentChange(stats.activeDays, previous.activeDays)));
	lines.push(row(t("Čas"), formatDurationMin(stats.durationMin), formatDurationMin(previous.durationMin), percentChange(stats.durationMin, previous.durationMin)));
	lines.push(row(t("Zátěž (sRPE)"), formatNumber(stats.load, 0), formatNumber(previous.load, 0), percentChange(stats.load, previous.load)));
	if (stats.runKm > 0 || previous.runKm > 0) {
		lines.push(row(t("Běh"), `${formatNumber(stats.runKm, 1)} km`, `${formatNumber(previous.runKm, 1)} km`, percentChange(stats.runKm, previous.runKm)));
	}
	if (stats.swimM > 0 || previous.swimM > 0) {
		lines.push(row(t("Plavání"), `${formatNumber(stats.swimM / 1000, 1)} km`, `${formatNumber(previous.swimM / 1000, 1)} km`, percentChange(stats.swimM, previous.swimM)));
	}
	if (stats.tonnageKg > 0 || previous.tonnageKg > 0) {
		lines.push(row(t("Zvednuto"), `${formatNumber(stats.tonnageKg / 1000, 1)} t`, `${formatNumber(previous.tonnageKg / 1000, 1)} t`, percentChange(stats.tonnageKg, previous.tonnageKg)));
	}
	if (input.sleepAvgMin !== null) {
		lines.push(
			row(
				t("Spánek (průměr)"),
				formatDurationMin(input.sleepAvgMin),
				input.previousSleepAvgMin !== null ? formatDurationMin(input.previousSleepAvgMin) : "—",
				input.previousSleepAvgMin !== null ? percentChange(input.sleepAvgMin, input.previousSleepAvgMin) : "—",
			),
		);
	}

	const sports = SPORTS.filter((s) => (stats.bySport[s] ?? 0) > 0).map((s) => `${SPORT_LABELS[s].toLocaleLowerCase("cs")} ${stats.bySport[s]}×`);
	lines.push("", t("**Podle sportu:** {v}", { v: sports.join(" · ") }));
	if (stats.missingLoad > 0) {
		lines.push(t("*{missingLoad} {v} RPE nebo délku – do zátěže se nepočítá.*", { missingLoad: stats.missingLoad, v: stats.missingLoad === 1 ? t("trénink nemá") : t("tréninků nemá") }));
	}

	const showRun = stats.runKm > 0;
	lines.push("", t("**Po měsících**"), "", t("| Měsíc | Tréninky | Čas |{v} Zátěž |", { v: showRun ? t(" Běh |") : "" }), `| --- | ---: | ---: |${showRun ? " ---: |" : ""} ---: |`);
	for (const { month, stats: m } of input.months) {
		const name = periodLabel(periodOf("month", `${month}-01`)).replace(` ${input.year}`, "");
		const run = showRun ? ` ${m.runKm > 0 ? `${formatNumber(m.runKm, 1)} km` : "—"} |` : "";
		lines.push(`| ${name} | ${m.workouts > 0 ? m.workouts : "—"} | ${m.durationMin > 0 ? formatDurationMin(m.durationMin) : "—"} |${run} ${m.load > 0 ? formatNumber(m.load, 0) : "—"} |`);
	}

	const best: string[] = [];
	const busiest = [...input.months].sort((a, b) => b.stats.workouts - a.stats.workouts || a.month.localeCompare(b.month))[0];
	if (busiest && busiest.stats.workouts > 0) {
		best.push(t("- Nejaktivnější měsíc: {v} ({v2})", { v: periodLabel(periodOf("month", `${busiest.month}-01`)).replace(` ${input.year}`, ""), v2: workoutsText(busiest.stats.workouts) }));
	}
	if (input.bestWeek) best.push(t("- Nejvíc tréninků za týden: {workouts} (týden od {v})", { workouts: input.bestWeek.workouts, v: formatShortDate(input.bestWeek.from) }));
	if (input.longestRun) best.push(t("- Nejdelší běh: {v} km ({v2})", { v: formatNumber(input.longestRun.km, 1), v2: formatShortDate(input.longestRun.date) }));
	if (input.longestWorkout) best.push(t("- Nejdelší trénink: {v} ({v2})", { v: formatDurationMin(input.longestWorkout.minutes), v2: formatShortDate(input.longestWorkout.date) }));
	if (best.length > 0) lines.push("", t("**Nej roku**"), ...best);

	if (input.weightChangeKg !== null) {
		const sign = input.weightChangeKg > 0 ? "+" : input.weightChangeKg < 0 ? "−" : "";
		lines.push("", t("**Hmotnost:** {sign}{v} kg od prvního do posledního vážení v roce", { sign, v: formatNumber(Math.abs(input.weightChangeKg), 1) }));
	}
	lines.push("", t("**Nové rekordy**"));
	if (input.records.length === 0) lines.push(t("V tomto roce žádný."));
	else for (const record of input.records) lines.push(`- ${record}`);
	return lines.join("\n");
}
