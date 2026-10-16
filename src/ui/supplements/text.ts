// Texty karty Suplementy. Bez závislosti na Obsidianu.

import {
	CAFFEINE_EXCESS_MG_PER_KG,
	adherenceRatio,
	betaAlanineDoseG,
	caffeineDoseMg,
	proteinTargetG,
	type Adherence,
	type CombinedWarning,
	type LimitCheck,
} from "../../calc/supplements";
import { formatNumber } from "../format";
import { t } from "../../i18n";

/** "5 g", "1000 IU"; bez dávky prázdný řetězec. */
export function doseLabel(dose: number | undefined, unit: string | undefined): string {
	if (dose === undefined) return "";
	return unit ? `${formatNumber(dose, 2)} ${unit}` : formatNumber(dose, 2);
}

/** Miligramy čitelně: pod 1 mg v mikrogramech. */
export function formatMg(mg: number): string {
	return mg < 1 ? `${formatNumber(mg * 1000, 0)} µg` : `${formatNumber(mg, 1)} mg`;
}

/** Součet v mg čitelně: od 1 g v gramech ("43,7 g"), jinak v mg nebo µg. */
export function formatAmount(mg: number): string {
	return mg >= 1000 ? `${formatNumber(mg / 1000, 1)} g` : formatMg(mg);
}

/** Kofein večer: Drake 2013 – i 6 h před ulehnutím zkrátil spánek o víc než hodinu. */
export const CAFFEINE_EVENING_WARNING =
	"Caffeine less than 6 hours before bed shortens sleep (Drake 2013, research) – take it in the morning or before an afternoon workout instead.";

/** Upozornění na překročený horní limit; jinak null. */
export function limitMessage(check: LimitCheck): string | null {
	if (check.status !== "over") return null;
	const scope = check.supplementsOnly ? t("from supplements") : t("from all sources including food");
	return t("The dose {v} is above the upper limit of {v2} a day ({scope}).", { v: formatMg(check.doseMg), v2: formatMg(check.limitMg), scope });
}

/** Upozornění na látku, které je moc až v součtu z více suplementů. `name` = název látky. */
export function combinedMessage(warning: CombinedWarning, name: string): string {
	const head = t("{name} total {v} a day ({v2})", { name, v: formatMg(warning.mg), v2: warning.from.join(" + ") });
	if (warning.kind === "caffeine") {
		return t("{head} – from {CAFFEINE_EXCESS_MG_PER_KG} mg/kg ({v} at your weight) side effects increase with no further benefit (IOC 2018, consensus).", { head, CAFFEINE_EXCESS_MG_PER_KG, v: formatMg(warning.limitMg) });
	}
	return t("{head} – above the upper limit of {v} ({v2}).", { head, v: formatMg(warning.limitMg), v2: warning.supplementsOnly ? t("from supplements") : t("from all sources including food") });
}

/** Dávka přepočtená na hmotnost uživatele, pokud ji látka má; jinak null. */
export function personalDose(catalogId: string | undefined, weightKg: number | null): string | null {
	if (weightKg === null || weightKg <= 0) return null;
	const kg = formatNumber(weightKg, 1);
	switch (catalogId) {
		case "caffeine": {
			const d = caffeineDoseMg(weightKg);
			return t("For your {kg} kg: {v}–{v2} mg before exercise.", { kg, v: formatNumber(d.min, 0), v2: formatNumber(d.max, 0) });
		}
		case "protein": {
			const d = proteinTargetG(weightKg);
			return t("For your {kg} kg: {v}–{v2} g of protein a day in total (food + supplements).", { kg, v: formatNumber(d.min, 0), v2: formatNumber(d.max, 0) });
		}
		case "beta_alanine":
			return t("For your {kg} kg: about {v} g a day, split into doses.", { kg, v: formatNumber(betaAlanineDoseG(weightKg), 1) });
		default:
			return null;
	}
}

/**
 * Dodržování do přehledu: „86 % (6 ze 7)“. Dokud okno není celé sledované,
 * přidá „sbírám data (X z Y dní)“; bez dat jen tento stav.
 */
export function adherenceLabel(a: Adherence, tracked: number, windowDays: number): string {
	const collecting = tracked < windowDays ? t("collecting data ({tracked} of {windowDays} days)", { tracked, windowDays }) : null;
	const ratio = adherenceRatio(a);
	if (ratio === null) return collecting ?? t("no planned days");
	const value = t("{pct} % ({taken} of {due})", { pct: formatNumber(ratio * 100, 0), taken: a.taken, due: a.due });
	return collecting ? `${value} · ${collecting}` : value;
}
