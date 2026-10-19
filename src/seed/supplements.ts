// Katalog suplementů s doporučeními v jazyce rozhraní: data anglicky v supplementData.ts,
// překlady v src/locales/<kód>/supplements.ts. Texty jen shrnují, co zdroje říkají –
// nejsou zdravotní radou. Bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import { getLanguage, LANGUAGES, type Language } from "../i18n";
import { contentOf } from "./localize";
import { SUPPLEMENT_DATA } from "./supplementData";
import type { CatalogEntry, CatalogVariant, StudyFinding } from "./supplementModel";

export type { StudyFinding };

/** Nejmenší počet zdrojů, které se u každé látky srovnávají. */
export const MIN_STUDIES = 4;

/** Nejmenší počet zdrojů u každého druhu látky (zdroje, které druhy porovnávají). */
export const MIN_VARIANT_STUDIES = 4;

export interface CatalogSupplement extends CatalogEntry {
	/** Zdroje (všechny srovnávané) a štítek. */
	basis: Basis;
}

/** Katalog ve zdrojovém jazyce (angličtina). */
export const SUPPLEMENT_CATALOG: CatalogSupplement[] = SUPPLEMENT_DATA.map((entry) => ({
	...entry,
	basis: { sourceIds: entry.studies.map((s) => s.source), evidence: entry.evidence },
}));

/** Obecná upozornění zobrazená pod doporučeními. */
export const SUPPLEMENT_DISCLAIMER =
	"Supplements don't replace food, sleep or training, and they aren't medicines. Each substance is compared across at least four sources, and the evidence is graded separately for each area of benefit; the information summarizes those sources and isn't medical advice – if you're ill, take medication or are pregnant, ask a doctor or pharmacist.";

export const SUPPLEMENT_CONTAMINATION_NOTE =
	"Supplements can contain undeclared banned substances (in one analysis about 15 % of more than 600 products contained prohormones). If you're subject to doping control, choose only products tested by an independent laboratory.";

function normalize(text: string): string {
	return text.trim().toLowerCase();
}

/** Text bez diakritiky a velikosti písmen – pro hledání („horcik“ najde „Hořčík“). */
function foldText(text: string): string {
	return normalize(text).normalize("NFD").replace(/\p{M}/gu, "");
}

const variantNames = (variant: CatalogVariant) => [variant.name, ...(variant.aliases ?? [])];

/** Hledání v knihovně: část názvu nebo aliasu látky či jejího druhu, bez ohledu na diakritiku. Prázdný dotaz = vše. */
export function matchesCatalogQuery(item: Pick<CatalogSupplement, "name" | "aliases" | "variants">, query: string): boolean {
	const q = foldText(query);
	if (!q) return true;
	return [item.name, ...item.aliases, ...(item.variants ?? []).flatMap(variantNames)].some((text) => foldText(text).includes(q));
}

/** Druh látky, který hledání našlo („bisglycinát“ → glycinát hořčíku); undefined, když dotaz sedí na látku samotnou. */
export function matchingVariant(item: Pick<CatalogSupplement, "name" | "aliases" | "variants">, query: string): string | undefined {
	const q = foldText(query);
	if (!q || [item.name, ...item.aliases].some((text) => foldText(text).includes(q))) return undefined;
	return item.variants?.find((variant) => variantNames(variant).some((text) => foldText(text).includes(q)))?.id;
}

/** Název druhu v jazyce rozhraní; undefined, když látka druh nezná. */
export function variantName(catalogId: string | undefined, variantId: string | undefined): string | undefined {
	return variantId ? catalogSupplement(catalogId)?.variants?.find((v) => v.id === variantId)?.name : undefined;
}

/**
 * ID látky katalogu pro název z etikety. Z vitaminů B jen B6: horní limit
 * u „Vitaminy B“ platí pro něj, niacin nebo B12 by vůči němu dávaly falešné varování.
 */
export function labelCatalogId(name: string): string | undefined {
	const key = normalize(name);
	if (/pyridoxin|\bb\s?6\b/.test(key)) return "vitamin_b";
	if (/^vitamin[ey]?\s+b/.test(key)) return undefined;
	return findCatalogSupplement(key)?.id;
}

/** Položka v jazyce; názvy ve zdroji zůstanou jako aliasy pro hledání. */
function localizeEntry(item: CatalogSupplement, language: Language): CatalogSupplement {
	const local = contentOf(language)?.supplements[item.id];
	if (!local) return item;
	return {
		...item,
		name: local.name,
		aliases: [...new Set([item.name, ...item.aliases, ...(local.aliases ?? [])])].filter((alias) => alias !== local.name),
		summary: local.summary,
		studies: item.studies.map((study, i) => ({ ...study, finding: local.studies[i] ?? study.finding })),
		agreement: local.agreement,
		dosing: local.dosing,
		forWhom: local.forWhom,
		risks: local.risks,
		benefits: item.benefits.map((benefit, i) => (local.benefits[i] ? { ...benefit, note: local.benefits[i] } : benefit)),
		...(local.safetyNote !== undefined ? { safetyNote: local.safetyNote } : {}),
		...(local.unit !== undefined ? { defaults: { ...item.defaults, unit: local.unit } } : {}),
		...(item.variants ? { variants: item.variants.map((variant) => localizeVariant(variant, local.variants?.[variant.id])) } : {}),
	};
}

function localizeVariant(variant: CatalogVariant, local: { name: string; aliases?: string[]; summary: string; studies: string[] } | undefined): CatalogVariant {
	if (!local) return variant;
	return {
		...variant,
		name: local.name,
		aliases: [...new Set([variant.name, ...(variant.aliases ?? []), ...(local.aliases ?? [])])].filter((alias) => alias !== local.name),
		summary: local.summary,
		studies: variant.studies.map((study, i) => ({ ...study, finding: local.studies[i] ?? study.finding })),
	};
}

const catalogs = new Map<Language, CatalogSupplement[]>();

/** Katalog v jazyce (výchozí = jazyk rozhraní). */
export function catalog(language: Language = getLanguage()): CatalogSupplement[] {
	let items = catalogs.get(language);
	if (!items) catalogs.set(language, (items = SUPPLEMENT_CATALOG.map((item) => localizeEntry(item, language))));
	return items;
}

export function catalogSupplement(id: string | undefined): CatalogSupplement | undefined {
	return id ? catalog().find((s) => s.id === id) : undefined;
}

/** Položka katalogu (v jazyce rozhraní) podle názvu nebo aliasu látky či jejího druhu v kterémkoli jazyce, bez ohledu na velikost písmen. */
export function findCatalogSupplement(name: string): CatalogSupplement | undefined {
	const key = normalize(name);
	if (!key) return undefined;
	const matches = (s: CatalogSupplement) =>
		[s.name, ...s.aliases, ...(s.variants ?? []).flatMap(variantNames)].some((text) => normalize(text) === key);
	for (const language of LANGUAGES) {
		const found = catalog(language).find(matches);
		if (found) return catalogSupplement(found.id);
	}
	return undefined;
}
