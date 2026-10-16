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
	"Kofein méně než 6 hodin před spaním zkracuje spánek (Drake 2013, výzkum) – ber ho raději ráno nebo před odpoledním tréninkem.";

/** Upozornění na překročený horní limit; jinak null. */
export function limitMessage(check: LimitCheck): string | null {
	if (check.status !== "over") return null;
	const scope = check.supplementsOnly ? t("z doplňků") : t("ze všech zdrojů včetně jídla");
	return t("Dávka {v} je nad horním limitem {v2} denně ({scope}).", { v: formatMg(check.doseMg), v2: formatMg(check.limitMg), scope });
}

/** Upozornění na látku, které je moc až v součtu z více suplementů. `name` = název látky. */
export function combinedMessage(warning: CombinedWarning, name: string): string {
	const head = t("{name} celkem {v} denně ({v2})", { name, v: formatMg(warning.mg), v2: warning.from.join(" + ") });
	if (warning.kind === "caffeine") {
		return t("{head} – od {CAFFEINE_EXCESS_MG_PER_KG} mg/kg ({v} při tvé váze) přibývá nežádoucích účinků bez dalšího přínosu (IOC 2018, konsenzus).", { head, CAFFEINE_EXCESS_MG_PER_KG, v: formatMg(warning.limitMg) });
	}
	return t("{head} – nad horním limitem {v} ({v2}).", { head, v: formatMg(warning.limitMg), v2: warning.supplementsOnly ? t("z doplňků") : t("ze všech zdrojů včetně jídla") });
}

/** Dávka přepočtená na hmotnost uživatele, pokud ji látka má; jinak null. */
export function personalDose(catalogId: string | undefined, weightKg: number | null): string | null {
	if (weightKg === null || weightKg <= 0) return null;
	const kg = formatNumber(weightKg, 1);
	switch (catalogId) {
		case "caffeine": {
			const d = caffeineDoseMg(weightKg);
			return t("Pro tvých {kg} kg: {v}–{v2} mg před výkonem.", { kg, v: formatNumber(d.min, 0), v2: formatNumber(d.max, 0) });
		}
		case "protein": {
			const d = proteinTargetG(weightKg);
			return t("Pro tvých {kg} kg: {v}–{v2} g bílkovin denně celkem (jídlo + doplňky).", { kg, v: formatNumber(d.min, 0), v2: formatNumber(d.max, 0) });
		}
		case "beta_alanine":
			return t("Pro tvých {kg} kg: asi {v} g denně, rozděleně.", { kg, v: formatNumber(betaAlanineDoseG(weightKg), 1) });
		default:
			return null;
	}
}

/**
 * Dodržování do přehledu: „86 % (6 ze 7)“. Dokud okno není celé sledované,
 * přidá „sbírám data (X z Y dní)“; bez dat jen tento stav.
 */
export function adherenceLabel(a: Adherence, tracked: number, windowDays: number): string {
	const collecting = tracked < windowDays ? t("sbírám data ({tracked} z {windowDays} dní)", { tracked, windowDays }) : null;
	const ratio = adherenceRatio(a);
	if (ratio === null) return collecting ?? t("bez plánovaných dnů");
	const value = t("{pct} % ({taken} z {due})", { pct: formatNumber(ratio * 100, 0), taken: a.taken, due: a.due });
	return collecting ? `${value} · ${collecting}` : value;
}
