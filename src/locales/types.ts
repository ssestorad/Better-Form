// Typy překladu do jednoho jazyka. Zdrojovým jazykem je angličtina (texty přímo v kódu);
// každý další jazyk je složka src/locales/<kód>/ zapsaná v src/locales/index.ts.

/** Tvary podle čísla podle Intl.PluralRules daného jazyka; `other` je povinný a slouží jako záloha. */
export type PluralForms = Partial<Record<"zero" | "one" | "two" | "few" | "many", string>> & { other: string };

/**
 * Texty rozhraní: klíč = anglický text z kódu (u tn() jeho tvar pro „other“), s kontextem
 * „kontext\u0004text“ – stejný anglický text, který jiný jazyk potřebuje v jiném tvaru (rod, pád).
 */
export type Dictionary = Record<string, string | PluralForms>;

export interface Locale {
	/** Kód jazyka pro Intl (čísla, data, tvary podle čísla), např. "cs". */
	code: string;
	/** Název jazyka v tom jazyce – přepínač v nastavení. */
	label: string;
	/** Texty rozhraní. */
	ui: Dictionary;
	/** Vestavěný obsah: cviky, programy, šablony, žebříčky… */
	content: ContentLocale;
}

/** Cvik: název, aliasy v tom jazyce a texty (popis, provedení, chyby). */
export interface ExerciseLocale {
	name: string;
	aliases?: string[];
	about?: string;
	how?: string[];
	mistakes?: string[];
}

export interface ProgramLocale {
	name: string;
	/** Popis do těla poznámky programu (Markdown). */
	description: string;
}

/** Téma „Co říká výzkum“; `studies` ve stejném pořadí jako ve zdroji. */
export interface ResearchLocale {
	title: string;
	summary: string;
	practical: string;
	studies: string[];
}

/** Látka katalogu suplementů; `studies` a `benefits` (poznámky k oblastem, null = bez poznámky) ve stejném pořadí jako ve zdroji. */
export interface SupplementLocale {
	name: string;
	aliases?: string[];
	summary: string;
	studies: string[];
	agreement: string;
	dosing: string;
	forWhom: string;
	risks: string;
	benefits: (string | null)[];
	safetyNote?: string;
	/** Výchozí jednotka dávky, když je slovem (tablet). */
	unit?: string;
	/** Druhy látky; klíč = id druhu, `studies` ve stejném pořadí jako ve zdroji. */
	variants?: Record<string, { name: string; aliases?: string[]; summary: string; studies: string[] }>;
}

/** Vestavěný obsah v jazyce; klíč = id položky v anglickém zdroji (src/seed, src/evidence). Co chybí, zůstane anglicky. */
export interface ContentLocale {
	exercises: Record<string, ExerciseLocale>;
	ladders: Record<string, string>;
	programs: Record<string, ProgramLocale>;
	templates: Record<string, string>;
	research: Record<string, ResearchLocale>;
	supplements: Record<string, SupplementLocale>;
	amino: Record<string, { name: string; role: string }>;
	/** Popisek, citace a poznámka zdroje – jen tam, kde se liší od angličtiny. */
	sources: Record<string, { short?: string; citation?: string; note?: string }>;
}
