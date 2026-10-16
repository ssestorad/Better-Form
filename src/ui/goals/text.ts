// Texty karty Cíle (SPEC 5.8): hodnoty podle jednotky cíle, stav a předpověď.
// Bez závislosti na Obsidianu.

import type { ForecastStatus, GoalEvaluation, GoalUnit } from "../../calc/goals";
import { formatClockDuration, parseClockDuration } from "../../calc/performance";
import type { GoalType } from "../../model/constants";
import { formatCzechDate, formatNumber, formatSeconds } from "../format";
import { t, translated } from "../../i18n";

/** Hodnota cíle v jeho jednotce: „49:30“, „100 kg“, „15 opak.“, „stupeň 4“, „40 km“, „88 %“. */
export function formatGoalValue(value: number, unit: GoalUnit): string {
	switch (unit) {
		case "time":
			return formatClockDuration(value);
		case "kg":
			return `${formatNumber(value, 1)} kg`;
		case "reps":
			return t("{n} opak.", { n: formatNumber(value, 0) });
		case "sec":
			return formatSeconds(value);
		case "level":
			return t("stupeň {v}", { v: formatNumber(value, 0) });
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
			return t("čas jako mm:ss nebo h:mm:ss");
		case "kg":
			return "kg";
		case "reps":
			return t("opakování");
		case "sec":
			return "sekundy";
		case "level":
			return t("číslo stupně v žebříčku");
		case "km":
			return t("km za týden");
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
	reached: "splněno",
	on_track: "na dobré cestě",
	at_risk: "ohrožený",
	no_data: "sbírám data",
});

/** Věta o předpovědi splnění. */
export function forecastText(e: GoalEvaluation, deadline: string | undefined): string {
	if (e.status === "reached") return t("Cílová hodnota je dosažená – cíl můžeš označit jako splněný.");
	if (e.current === null) return t("Zatím žádný výkon, ze kterého by šel stav určit.");
	if (e.overdue) return t("Termín už uplynul. Posuň ho, nebo cíl uprav.");
	if (e.status === "no_data") return t("Sbírám data pro předpověď – jsou potřeba aspoň 3 výkony v rozmezí 2 týdnů za poslední 2 měsíce.");
	const pace = e.perWeek !== null ? t(" ({v}{v2} za týden)", { v: e.perWeek > 0 ? "+" : "−", v2: formatGoalValue(Math.abs(e.perWeek), e.unit === "time" ? "sec" : e.unit) }) : "";
	if (e.eta === null) return t("Trend posledních týdnů k cíli nevede{pace}.", { pace });
	const when = t("Podle trendu{pace} vyjde splnění na {v}", { pace, v: formatCzechDate(e.eta, false) });
	if (e.status === "at_risk" && deadline) return t("{when} – to je po termínu {v}.", { when, v: formatCzechDate(deadline, false) });
	return `${when}.`;
}
