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
	return `${min === max ? min : `${min}–${max}`} ${unit}`;
}

/** „−0,25 kg za týden (−0,4 % hmotnosti), tedy asi −275 kcal denně“. */
export function trendText(trend: Extract<WeightTrend, { ready: true }>): string {
	const kcal = Math.round(trend.kcalPerDay / 10) * 10;
	const signed = (value: number, decimals: number) => `${value > 0 ? "+" : ""}${formatSigned(value, decimals)}`;
	return t("{v} kg za týden ({v2} % hmotnosti), tedy bilance asi {v3}{v4} kcal denně", { v: signed(trend.kgPerWeek, 2), v2: signed(trend.pctPerWeek, 1), v3: kcal > 0 ? "+" : "", v4: formatWhole(kcal) });
}

/** „přidej asi 250 kcal denně“ / „uber asi 250 kcal denně“; prázdné, když není co měnit. */
export function adjustText(adjustKcal: number): string {
	if (adjustKcal === 0) return "";
	return t("{v} asi {v2} kcal denně", { v: adjustKcal > 0 ? t("přidej") : "uber", v2: formatWhole(Math.abs(adjustKcal)) });
}

/** Co trend váhy znamená vůči cíli (SPEC 11.6). */
export function balanceText(check: BalanceCheck, goal: BodyGoal, lossRatePctMax: number): string {
	const adjust = adjustText(check.adjustKcal);
	const then = adjust ? t(" Pokud to není záměr, {adjust}.", { adjust }) : "";
	const fix = adjust ? t(" Zkus to: {adjust}.", { adjust }) : "";
	if (goal === "maintain") {
		if (check.status === "on_track") return t("Váha drží – příjem odpovídá výdeji.");
		return check.direction === "down"
			? t("Cíl je udržování, ale váha klesá – jíš méně, než vydáš.{then}", { then })
			: t("Cíl je udržování, ale váha roste – jíš víc, než vydáš.{then}", { then });
	}
	if (goal === "lose") {
		switch (check.status) {
			case "on_track":
				return t("Hubneš tempem, které odpovídá cíli.");
			case "fast":
				return t("Hubneš rychleji než {v} % hmotnosti týdně – při takovém tempu se víc ztrácejí svaly a trpí výkon.{fix}", { v: formatNumber(lossRatePctMax), fix });
			case "opposite":
				return t("Cíl je hubnutí, ale váha roste.{fix}", { fix });
			default:
				return t("Hubneš pomaleji, než odpovídá cíli, nebo váha stojí.{fix}", { fix });
		}
	}
	switch (check.status) {
		case "on_track":
			return t("Přibíráš tempem, které odpovídá zvolenému přebytku.");
		case "fast":
			return t("Přibíráš rychleji, než odpovídá zvolenému přebytku.{fix}", { fix });
		case "opposite":
			return t("Cíl je nabírání, ale váha klesá.{fix}", { fix });
		default:
			return t("Přibíráš pomaleji, než odpovídá cíli, nebo váha stojí.{fix}", { fix });
	}
}

/** Řádek do generovaného bloku denní poznámky. */
export function nutritionLine(plan: NutritionPlan): string {
	return [
		t("asi {v} kcal ({v2})", { v: formatWhole(plan.target), v2: rangeText(plan.intake, "kcal") }),
		t("bílkoviny {v}", { v: rangeText(plan.protein, "g") }),
		t("sacharidy {v}", { v: rangeText(plan.carbs, "g") }),
		t("tuky {v}", { v: rangeText(plan.fat, "g") }),
	].join(" · ");
}
