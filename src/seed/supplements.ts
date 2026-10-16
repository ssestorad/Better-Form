// Katalog suplementů s doporučeními. Každá položka srovnává nejméně tři zdroje
// (src/evidence/sources.ts), má štítek úrovně důkazu a hodnocení zvlášť v každé
// oblasti přínosu (src/seed/supplementModel.ts). Texty jen shrnují, co zdroje
// říkají – nejsou zdravotní radou. Látky jsou ve třech souborech stejného tvaru:
// supplementsBase.ts, supplementsNew.ts a supplementsMore.ts. Bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import type { CatalogEntry, StudyFinding } from "./supplementModel";
import { BASE_ENTRIES } from "./supplementsBase";
import { MORE_ENTRIES } from "./supplementsMore";
import { NEW_ENTRIES } from "./supplementsNew";
import { getLanguage, type Language } from "../i18n";
import { SUPPLEMENTS_EN } from "./en/supplements";

export type { StudyFinding };

/** Nejmenší počet zdrojů, které se u každé látky srovnávají. */
export const MIN_STUDIES = 3;

export interface CatalogSupplement extends CatalogEntry {
	/** Zdroje (všechny srovnávané) a štítek. */
	basis: Basis;
}

export const SUPPLEMENT_CATALOG: CatalogSupplement[] = [...BASE_ENTRIES, ...NEW_ENTRIES, ...MORE_ENTRIES].map((entry) => ({
	...entry,
	basis: { sourceIds: entry.studies.map((s) => s.source), evidence: entry.evidence },
}));

/** Obecná upozornění zobrazená pod doporučeními. */
export const SUPPLEMENT_DISCLAIMER =
	"Doplňky stravy nenahradí jídlo, spánek ani trénink a nejsou to léky. U každé látky jsou srovnané nejméně tři zdroje a důkazy jsou hodnocené zvlášť pro každou oblast přínosu; informace je shrnují a nejsou zdravotní radou – při nemoci, užívání léků nebo v těhotenství se poraď s lékařem nebo lékárníkem.";

export const SUPPLEMENT_CONTAMINATION_NOTE =
	"Doplňky mohou obsahovat nedeklarované zakázané látky (v jedné analýze asi 15 % z více než 600 výrobků obsahovalo prohormony). Pokud podléháš dopingovým kontrolám, vybírej jen výrobky testované nezávislou laboratoří.";

function normalize(text: string): string {
	return text.trim().toLocaleLowerCase("cs");
}

/** Text bez diakritiky a velikosti písmen – pro hledání („horcik“ najde „Hořčík“). */
function foldText(text: string): string {
	return normalize(text).normalize("NFD").replace(/\p{M}/gu, "");
}

/** Hledání v knihovně: část názvu nebo aliasu, bez ohledu na diakritiku. Prázdný dotaz = vše. */
export function matchesCatalogQuery(item: Pick<CatalogSupplement, "name" | "aliases">, query: string): boolean {
	const q = foldText(query);
	if (!q) return true;
	return [item.name, ...item.aliases].some((text) => foldText(text).includes(q));
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

/** Položka v angličtině; český název a aliasy zůstanou jako aliasy pro hledání. */
function localizeEntry(item: CatalogSupplement): CatalogSupplement {
	const en = SUPPLEMENTS_EN[item.id];
	if (!en) return item;
	return {
		...item,
		name: en.name,
		aliases: [...new Set([item.name, ...item.aliases, ...(en.aliases ?? [])])].filter((alias) => alias !== en.name),
		summary: en.summary,
		studies: item.studies.map((study, i) => ({ ...study, finding: en.studies[i] ?? study.finding })),
		agreement: en.agreement,
		dosing: en.dosing,
		forWhom: en.forWhom,
		risks: en.risks,
		benefits: item.benefits.map((benefit, i) => (en.benefits[i] ? { ...benefit, note: en.benefits[i]! } : benefit)),
		...(en.safetyNote !== undefined ? { safetyNote: en.safetyNote } : {}),
		...(en.unit !== undefined ? { defaults: { ...item.defaults, unit: en.unit } } : {}),
	};
}

let englishCatalog: CatalogSupplement[] | null = null;

/** Katalog v jazyce rozhraní. */
export function catalog(language: Language = getLanguage()): CatalogSupplement[] {
	if (language === "cs") return SUPPLEMENT_CATALOG;
	englishCatalog ??= SUPPLEMENT_CATALOG.map(localizeEntry);
	return englishCatalog;
}

export function catalogSupplement(id: string | undefined): CatalogSupplement | undefined {
	return id ? catalog().find((s) => s.id === id) : undefined;
}

/** Položka katalogu (v jazyce rozhraní) podle názvu nebo aliasu v kterémkoli jazyce, bez ohledu na velikost písmen. */
export function findCatalogSupplement(name: string): CatalogSupplement | undefined {
	const key = normalize(name);
	if (!key) return undefined;
	const matches = (s: CatalogSupplement) => normalize(s.name) === key || s.aliases.some((a) => normalize(a) === key);
	const found = SUPPLEMENT_CATALOG.find(matches) ?? catalog("en").find(matches);
	return found && catalogSupplement(found.id);
}
