// Texty karty Cíle (SPEC 5.8): hodnoty podle jednotky cíle, stav a předpověď.
// Bez závislosti na Obsidianu.

import type { ForecastStatus, GoalEvaluation, GoalUnit } from "../../calc/goals";
import { formatClockDuration, parseClockDuration } from "../../calc/performance";
import type { GoalType } from "../../model/constants";
import { formatCzechDate, formatNumber, formatSeconds } from "../format";
import { t, tn, translated } from "../../i18n";

/** Hodnota cíle v jeho jednotce: „49:30“, „100 kg“, „15 opak.“, „stupeň 4“, „40 km“, „88 %“. */
export function formatGoalValue(value: number, unit: GoalUnit): string {
	switch (unit) {
		case "time":
			return formatClockDuration(value);
		case "kg":
			return `${formatNumber(value, 1)} kg`;
		case "reps":
			return tn(Math.round(value), ["{n} rep", "{n} reps"]);
		case "sec":
			return formatSeconds(value);
		case "level":
			return t("level {v}", { v: formatNumber(value, 0) });
		case "km":
			return `${formatNumber(value, 1)} km`;
		case "pct":
			return `${formatNumber(value, 0)} %`;
	}
}

/** Jednotka cílové hodnoty podle typu cíle (před uložením, kdy ještě není vyhodnocení). */
export function targetUnit(type: GoalType, holdExercise: boolean): GoalUnit {
	switch (type) {
		case "run_time":
			return "time";
		case "lift_1rm":
		case "body_weight":
			return "kg";
		case "reps_max":
			return holdExercise ? "sec" : "reps";
		case "skill_level":
			return "level";
		case "weekly_volume":
			return "km";
		case "norm":
			return "pct";
	}
}

/** Nápověda k zadání cílové hodnoty. */
export function targetHint(unit: GoalUnit): string {
	switch (unit) {
		case "time":
			return t("time as mm:ss or h:mm:ss");
		case "kg":
			return "kg";
		case "reps":
			return t("reps");
		case "sec":
			return "sekundy";
		case "level":
			return t("level number in the ladder");
		case "km":
			return t("km per week");
		case "pct":
			return "";
	}
}

/** Cílová hodnota z textu: čas „49:30“ → sekundy, jinak číslo (i s desetinnou čárkou). Neplatné → null. */
export function parseGoalTarget(text: string, unit: GoalUnit): number | null {
	const trimmed = text.trim();
	if (trimmed === "") return null;
	if (unit === "time") {
		// Samotné číslo by parseClockDuration bral jako minuty; u cíle chceme výslovný zápis s dvojtečkou.
		if (!trimmed.includes(":")) return null;
		const seconds = parseClockDuration(trimmed);
		return seconds !== null && seconds > 0 ? seconds : null;
	}
	const value = Number(trimmed.replace(",", "."));
	return Number.isFinite(value) && value > 0 ? value : null;
}

export const STATUS_LABELS: Record<ForecastStatus, string> = translated({
	reached: "done",
	on_track: "on track",
	at_risk: "at risk",
	no_data: "collecting data",
});

/** Věta o předpovědi splnění. */
export function forecastText(e: GoalEvaluation, deadline: string | undefined): string {
	if (e.status === "reached") return t("Target reached – you can mark the goal as done.");
	if (e.current === null) return t("No result yet to determine progress from.");
	if (e.overdue) return t("The deadline has passed. Move it or edit the goal.");
	if (e.status === "no_data") return t("Collecting data for a forecast – at least 3 results spread over 2 weeks in the last 2 months are needed.");
	const pace = e.perWeek !== null ? t(" ({v}{v2} per week)", { v: e.perWeek > 0 ? "+" : "−", v2: formatGoalValue(Math.abs(e.perWeek), e.unit === "time" ? "sec" : e.unit) }) : "";
	if (e.eta === null) return t("The trend of recent weeks isn't heading towards the goal{pace}.", { pace });
	const when = t("At the current trend{pace} you'll reach it on {v}", { pace, v: formatCzechDate(e.eta, false) });
	if (e.status === "at_risk" && deadline) return t("{when} – that's after the deadline {v}.", { when, v: formatCzechDate(deadline, false) });
	return `${when}.`;
}
