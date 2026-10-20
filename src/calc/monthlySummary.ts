// Měsíční souhrn (SPEC 9.5): text generovaného bloku poznámky v Souhrny/.
// Bez závislosti na Obsidianu.

import { SPORT_LABELS, SPORTS } from "../model/constants";
import { formatDurationMin, formatNumber } from "../ui/format";
import type { DayNote, TestNote, WorkoutNote } from "../model/types";
import { periodLabel, periodOf, periodStats, shiftPeriod, type Period, type PeriodStats, type TonnageContext } from "./overview";
import { allRecords, newRecords, type RecordContext } from "./records";
import { nightMin } from "./sleep";
import { mean } from "./stats";
import { t, tn } from "../i18n";

/** Čísla jednoho období (měsíc, týden) se srovnáním s předchozím. */
export interface PeriodSummary {
	stats: PeriodStats;
	previous: PeriodStats;
	/** Texty rekordů překonaných v měsíci. */
	records: string[];
	/** Průměrná délka spánku v minutách; null bez dat. */
	sleepAvgMin: number | null;
	previousSleepAvgMin: number | null;
	/** Změna hmotnosti za období (první vs. poslední vážení); null bez dvou vážení. */
	weightChangeKg: number | null;
}

export interface MonthSummaryInput extends PeriodSummary {
	/** Měsíc ve tvaru YYYY-MM. */
	month: string;
}

/** „2026-09“ → platný měsíc? */
export function isMonth(value: string): boolean {
	const match = value.match(/^(\d{4})-(\d{2})$/);
	return !!match && Number(match[2]) >= 1 && Number(match[2]) <= 12;
}

/** Měsíc před daným měsícem (YYYY-MM). */
export function previousMonth(month: string): string {
	const [y, m] = month.split("-").map(Number) as [number, number];
	return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** „+12 %“, „−8 %“, „beze změny“; bez srovnání (minule 0) „—“. */
export function percentChange(current: number, previous: number): string {
	if (previous <= 0) return "—";
	const pct = Math.round(((current - previous) / previous) * 100);
	if (pct === 0) return t("no change");
	return `${pct > 0 ? "+" : "−"}${Math.abs(pct)} %`;
}

function row(label: string, current: string, previous: string, change: string): string {
	return `| ${label} | ${current} | ${previous} | ${change} |`;
}

/** Markdown souhrnu: tabulka čísel se srovnáním, sporty, rekordy. */
export function renderMonthlySummary(input: MonthSummaryInput): string {
	const { stats } = input;
	const title = periodLabel(periodOf("month", `${input.month}-01`));
	const lines: string[] = [t("**Summary for {title}**", { title }), ""];

	if (stats.workouts === 0) {
		lines.push(t("No workout logged this month."));
	} else {
		lines.push(t("| | This month | Last month | Change |"), ...statsLines(input));
	}
	if (input.weightChangeKg !== null) lines.push("", weightLine(input.weightChangeKg, t("per month")));
	lines.push("", t("**New records**"));
	if (input.records.length === 0) lines.push(t("None this month."));
	else for (const record of input.records) lines.push(`- ${record}`);
	return lines.join("\n");
}

const weightLine = (kg: number, span: string) => t("**Weight:** {v}{v2} kg {span}", { v: kg > 0 ? "+" : kg < 0 ? "−" : "", v2: formatNumber(Math.abs(kg), 1), span });

/** Řádky tabulky čísel se srovnáním (pod hlavičkou), sporty a poznámka o chybějící zátěži – stejné pro měsíc i týden. */
function statsLines(input: PeriodSummary): string[] {
	const { stats, previous } = input;
	const lines = ["| --- | ---: | ---: | ---: |"];
	lines.push(row(t("Workouts"), String(stats.workouts), String(previous.workouts), percentChange(stats.workouts, previous.workouts)));
	lines.push(row(t("Training days"), String(stats.activeDays), String(previous.activeDays), percentChange(stats.activeDays, previous.activeDays)));
	lines.push(row(t("Time"), formatDurationMin(stats.durationMin), formatDurationMin(previous.durationMin), percentChange(stats.durationMin, previous.durationMin)));
	lines.push(row(t("Load (sRPE)"), formatNumber(stats.load, 0), formatNumber(previous.load, 0), percentChange(stats.load, previous.load)));
	if (stats.runKm > 0 || previous.runKm > 0) {
		lines.push(row(t("Run"), `${formatNumber(stats.runKm, 1)} km`, `${formatNumber(previous.runKm, 1)} km`, percentChange(stats.runKm, previous.runKm)));
	}
	if (stats.swimM > 0 || previous.swimM > 0) {
		lines.push(row(t("Swim"), `${formatNumber(stats.swimM, 0)} m`, `${formatNumber(previous.swimM, 0)} m`, percentChange(stats.swimM, previous.swimM)));
	}
	if (stats.tonnageKg > 0 || previous.tonnageKg > 0) {
		lines.push(
			row(t("Lifted"), `${formatNumber(stats.tonnageKg / 1000, 1)} t`, `${formatNumber(previous.tonnageKg / 1000, 1)} t`, percentChange(stats.tonnageKg, previous.tonnageKg)),
		);
	}
	if (input.sleepAvgMin !== null) {
		lines.push(
			row(
				t("Sleep (average)"),
				formatDurationMin(input.sleepAvgMin),
				input.previousSleepAvgMin !== null ? formatDurationMin(input.previousSleepAvgMin) : "—",
				input.previousSleepAvgMin !== null ? percentChange(input.sleepAvgMin, input.previousSleepAvgMin) : "—",
			),
		);
	}
	const sports = SPORTS.filter((s) => (stats.bySport[s] ?? 0) > 0).map((s) => `${SPORT_LABELS[s].toLocaleLowerCase("cs")} ${stats.bySport[s]}×`);
	lines.push("", t("**By sport:** {v}", { v: sports.join(" · ") }));
	if (stats.missingLoad > 0) {
		lines.push(tn(stats.missingLoad, ["*{n} workout is missing RPE or duration – not counted in load.*", "*{n} workouts are missing RPE or duration – not counted in load.*"]));
	}
	return lines;
}

// ---------- Týdenní souhrn ----------

/** Splnění plánu týdne – dodá služba plánu. */
export interface WeekPlanResult {
	planned: number;
	done: number;
	missed: number;
	postponed: number;
}

export interface WeekSummaryInput extends PeriodSummary {
	/** Pondělí týdne. */
	week: string;
	plan: WeekPlanResult | null;
	/** Průměrná týdenní zátěž čtyř předchozích týdnů; null bez historie. */
	averageLoad: number | null;
}

/** Markdown týdenního souhrnu: čísla proti minulému týdnu, plán, zátěž proti průměru, rekordy. */
export function renderWeeklySummary(input: WeekSummaryInput): string {
	const lines: string[] = [t("**Week summary {v}**", { v: periodLabel(periodOf("week", input.week)) }), ""];
	if (input.stats.workouts === 0) lines.push(t("No workout logged this week."));
	else lines.push(t("| | This week | Last week | Change |"), ...statsLines(input));
	if (input.plan && input.plan.planned > 0) {
		const { planned, done, missed, postponed } = input.plan;
		const rest = [missed > 0 ? t("missed {missed}", { missed }) : "", postponed > 0 ? t("postponed {postponed}", { postponed }) : ""].filter((x) => x !== "");
		lines.push("", t("**Plan:** done {done} of {planned}{v}", { done, planned, v: rest.length > 0 ? ` · ${rest.join(" · ")}` : "" }));
	}
	if (input.averageLoad !== null && input.averageLoad > 0 && input.stats.load > 0) {
		lines.push(
			"",
			t("**Load vs average:** {v}× the average of the four previous weeks ({v2} AU)", { v: formatNumber(input.stats.load / input.averageLoad, 2), v2: formatNumber(input.averageLoad, 0) }),
		);
	}
	if (input.weightChangeKg !== null) lines.push("", weightLine(input.weightChangeKg, t("per week")));
	if (input.records.length > 0) {
		lines.push("", t("**New records**"));
		for (const record of input.records) lines.push(`- ${record}`);
	}
	return lines.join("\n");
}

/** Vstup týdenního souhrnu; `week` je pondělí. Plán a průměr zátěže doplní volající. */
export function weekSummaryInput(
	week: string,
	workouts: readonly WorkoutNote[],
	days: readonly DayNote[],
	tests: readonly TestNote[],
	ctx: RecordContext & TonnageContext,
): PeriodSummary {
	return periodSummary(periodOf("week", week), workouts, days, tests, ctx);
}

// ---------- Sestavení vstupu z dat ----------

/** Vstup souhrnu z tréninků, denních poznámek a testů (rekordy = zlepšení během měsíce). */
export function monthSummaryInput(
	month: string,
	workouts: readonly WorkoutNote[],
	days: readonly DayNote[],
	tests: readonly TestNote[],
	ctx: RecordContext & TonnageContext,
): MonthSummaryInput {
	return { month, ...periodSummary(periodOf("month", `${month}-01`), workouts, days, tests, ctx) };
}

function periodSummary(period: Period, workouts: readonly WorkoutNote[], days: readonly DayNote[], tests: readonly TestNote[], ctx: RecordContext & TonnageContext): PeriodSummary {
	const before = shiftPeriod(period, -1);
	const sleepAvg = (from: string, to: string): number | null =>
		mean(
			days
				.filter((d) => d.date >= from && d.date <= to)
				.map((d) => nightMin(d.sleep))
				.filter((v): v is number => v !== null),
		);
	const weights = days
		.filter((d) => d.date >= period.from && d.date <= period.to && d.body.weight_kg !== undefined)
		.sort((a, b) => a.date.localeCompare(b.date))
		.map((d) => d.body.weight_kg!);
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
		stats: periodStats(workouts, period.from, period.to, ctx),
		previous: periodStats(workouts, before.from, before.to, ctx),
		records: newRecords(recordsBefore, recordsAfter).map((r) => r.text),
		sleepAvgMin: sleepAvg(period.from, period.to),
		previousSleepAvgMin: sleepAvg(before.from, before.to),
		weightChangeKg: weights.length >= 2 ? weights[weights.length - 1]! - weights[0]! : null,
	};
}
