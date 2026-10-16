// Texty karty Výživa a řádku v denní poznámce. Bez závislosti na Obsidianu.

import type { NutritionPlan, Range } from "../../calc/nutrition";
import type { BalanceCheck, WeightTrend } from "../../calc/weight";
import type { BodyGoal } from "../../settings/settings";
import { formatNumber, formatSigned } from "../format";
import { t } from "../../i18n";

/** Celé číslo s mezerou po tisících: 2450 → „2 450“. */
export function formatWhole(value: number): string {
	const n = Math.round(value);
	const sign = n < 0 ? "−" : "";
	return sign + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** „2 450–2 700 kcal“; stejné meze = jedno číslo. */
export function rangeText(range: Range, unit: string): string {
	const min = formatWhole(range.min);
	const max = formatWhole(range.max);
	return `${min === max ? min : `${min}–${max}`}\u00a0${unit}`;
}

/** „−0,25 kg za týden (−0,4 % hmotnosti), tedy asi −275 kcal denně“. */
export function trendText(trend: Extract<WeightTrend, { ready: true }>): string {
	const kcal = Math.round(trend.kcalPerDay / 10) * 10;
	const signed = (value: number, decimals: number) => `${value > 0 ? "+" : ""}${formatSigned(value, decimals)}`;
	return t("{v} kg per week ({v2} % of body weight), a balance of about {v3}{v4} kcal a day", { v: signed(trend.kgPerWeek, 2), v2: signed(trend.pctPerWeek, 1), v3: kcal > 0 ? "+" : "", v4: formatWhole(kcal) });
}

/** „přidej asi 250 kcal denně“ / „uber asi 250 kcal denně“; prázdné, když není co měnit. */
export function adjustText(adjustKcal: number): string {
	if (adjustKcal === 0) return "";
	return t("{v} about {v2} kcal a day", { v: adjustKcal > 0 ? t("add") : "uber", v2: formatWhole(Math.abs(adjustKcal)) });
}

/** Co trend váhy znamená vůči cíli (SPEC 11.6). */
export function balanceText(check: BalanceCheck, goal: BodyGoal, lossRatePctMax: number): string {
	const adjust = adjustText(check.adjustKcal);
	const then = adjust ? t(" If that's not intended, {adjust}.", { adjust }) : "";
	const fix = adjust ? t(" Try this: {adjust}.", { adjust }) : "";
	if (goal === "maintain") {
		if (check.status === "on_track") return t("Your weight is stable – intake matches expenditure.");
		return check.direction === "down"
			? t("Your goal is to maintain, but your weight is dropping – you're eating less than you burn.{then}", { then })
			: t("Your goal is to maintain, but your weight is rising – you're eating more than you burn.{then}", { then });
	}
	if (goal === "lose") {
		switch (check.status) {
			case "on_track":
				return t("You're losing weight at a pace that matches your goal.");
			case "fast":
				return t("You're losing more than {v} % of your body weight a week – at that pace you lose more muscle and performance suffers.{fix}", { v: formatNumber(lossRatePctMax), fix });
			case "opposite":
				return t("Your goal is to lose weight, but your weight is rising.{fix}", { fix });
			default:
				return t("You're losing weight more slowly than your goal, or your weight isn't moving.{fix}", { fix });
		}
	}
	switch (check.status) {
		case "on_track":
			return t("You're gaining at a pace that matches your chosen surplus.");
		case "fast":
			return t("You're gaining faster than your chosen surplus.{fix}", { fix });
		case "opposite":
			return t("Your goal is to gain, but your weight is dropping.{fix}", { fix });
		default:
			return t("You're gaining more slowly than your goal, or your weight isn't moving.{fix}", { fix });
	}
}

/** Řádek do generovaného bloku denní poznámky. */
export function nutritionLine(plan: NutritionPlan): string {
	return [
		t("about {v} kcal ({v2})", { v: formatWhole(plan.target), v2: rangeText(plan.intake, "kcal") }),
		t("protein {v}", { v: rangeText(plan.protein, "g") }),
		t("carbohydrates {v}", { v: rangeText(plan.carbs, "g") }),
		t("fats {v}", { v: rangeText(plan.fat, "g") }),
	].join(" · ");
}
