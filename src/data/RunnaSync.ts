// Plán z Runny (nebo jiné trenérské aplikace) přes soukromý odkaz na kalendář iCal.
// Jen čtení; spouští ji uživatel. Odkaz je tajný – nikdy se neloguje ani nevypisuje.

import { requestUrl } from "obsidian";
import { parseIcs } from "../calc/ics";
import { EXTERNAL_PLAN_WEEKS, externalPlanItems } from "../calc/plannedImport";
import { addDays, startOfWeek } from "../model/dates";
import type { BetterFormSettings } from "../settings/settings";
import { t } from "../i18n";
import type { PlanService } from "./PlanService";

export const RUNNA_SOURCE = "Runna";

/** „webcal://…“ → „https://…“; null u odkazu, který není https. */
export function calendarUrl(text: string): string | null {
	const url = text.trim().replace(/^webcal:\/\//i, "https://");
	return /^https:\/\/\S+$/i.test(url) ? url : null;
}

export async function syncRunna(plans: PlanService, settings: BetterFormSettings, save: () => Promise<void>, today: string): Promise<{ added: number; updated: number; removed: number }> {
	const url = calendarUrl(settings.runna.url);
	if (!url) throw new Error(t("The calendar link must start with https:// or webcal://."));
	// Chyba sítě se nepřeposílá – její text by mohl obsahovat odkaz.
	const response = await requestUrl({ url, throw: false }).catch(() => {
		throw new Error(t("The calendar couldn't be downloaded – check the link and your connection."));
	});
	// Stav bez odkazu – ten je tajný.
	if (response.status >= 400) throw new Error(t("The calendar couldn't be downloaded (HTTP {v}).", { v: response.status }));
	if (!response.text.includes("BEGIN:VCALENDAR")) throw new Error(t("The link doesn't lead to a calendar."));
	const events = parseIcs(response.text);
	const to = addDays(startOfWeek(today), EXTERNAL_PLAN_WEEKS * 7 - 1);
	const result = await plans.syncExternal(RUNNA_SOURCE, externalPlanItems(events, today, to, RUNNA_SOURCE), today);
	settings.runna.lastSync = today;
	await save();
	return result;
}
