// Texty plánu týdne (SPEC 5.16): název a detaily položky a čitelný přehled týdne
// do generovaného bloku poznámky. Bez závislosti na Obsidianu.

import { weekDates } from "../calc/weekPlan";
import { DAY_OFF_LABELS, PLAN_INTENSITY_LABELS, SPORT_LABELS } from "../model/constants";
import type { PlanDayOff, PlanItem } from "../model/types";
import { formatDurationMin, formatNumber, formatShortDate } from "../ui/format";
import { t } from "../i18n";

/** „Běh – Tempo“, „Posilovna – Push“ (ze šablony), jinak jen sport. */
export function planItemTitle(item: PlanItem): string {
	const sport = SPORT_LABELS[item.sport];
	const name = item.title ?? item.template;
	return name ? `${sport} – ${name}` : sport;
}

/**
 * „8 km · 50 min · lehká“. `minutes` je délka včetně odhadu z tempa
 * (calc/weekPlan.plannedMinutes); odhad se označí „asi“.
 */
export function planItemDetails(item: PlanItem, minutes?: { minutes: number; estimated: boolean } | null): string {
	const duration = minutes ?? (item.duration_min !== undefined ? { minutes: item.duration_min, estimated: false } : null);
	return [
		item.distance_km !== undefined ? `${formatNumber(item.distance_km)} km` : null,
		duration ? (duration.estimated ? t("about {v}", { v: formatDurationMin(duration.minutes) }) : formatDurationMin(duration.minutes)) : null,
		PLAN_INTENSITY_LABELS[item.intensity],
	]
		.filter((part): part is string => part !== null)
		.join(" · ");
}

/** Do buňky tabulky: bez svislítek a zalomení. */
const cell = (text: string) => text.replace(/\|/g, "/").replace(/\s+/g, " ").trim();

/** Program s úkolem na daný den; `item` jen když se den programu do plánu počítá (má délku tréninku). */
export interface PlanProgramRow {
	date: string;
	name: string;
	item?: PlanItem;
}

/** Přehled týdne po dnech jako tabulka: naplánované položky a dny aktivních programů; prázdný den má „volno“. */
export function planBlock(week: string, items: readonly PlanItem[], programs: readonly PlanProgramRow[] = [], off: readonly PlanDayOff[] = []): string {
	const lines = [t("| Day | Plan |"), "| --- | --- |"];
	for (const date of weekDates(week)) {
		const reason = off.find((o) => o.date === date)?.reason;
		const texts = [
			...(reason ? [`**${DAY_OFF_LABELS[reason]}**`] : []),
			...items.filter((i) => i.date === date).map((i) => cell(`${planItemTitle(i)} (${planItemDetails(i)})${i.notes ? ` – ${i.notes}` : ""}`)),
			...programs.filter((p) => p.date === date).map((p) => cell(`Program ${p.name}${p.item ? ` (${planItemDetails(p.item)})` : ""}`)),
		];
		lines.push(`| ${formatShortDate(date)} | ${texts.length > 0 ? texts.join("<br>") : "volno"} |`);
	}
	return lines.join("\n");
}
