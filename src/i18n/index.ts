// Překlad rozhraní bez knihovny. Zdrojem je angličtina přímo v kódu; ostatní jazyky jsou
// slovníky v src/locales/<kód>/ (klíč = anglický text). Chybějící překlad se ukáže anglicky;
// test v tests/i18n.test.ts hlídá úplnost každého jazyka. t() se volá až při vykreslení –
// konstanty modulu se vyhodnotí dřív, než se načte nastavení, proto tabulky popisků obaluje translated().

import { LOCALES } from "../locales";

export type Language = "en" | keyof typeof LOCALES;
export const LANGUAGES: readonly Language[] = ["en", ...(Object.keys(LOCALES) as (keyof typeof LOCALES)[])];
export const LANGUAGE_LABELS = Object.fromEntries([
	["en", "English"],
	...Object.entries(LOCALES).map(([code, locale]) => [code, locale.label]),
]) as Record<Language, string>;

/** Oddělovač kontextu v klíči slovníku („kontext\u0004text“), jako msgctxt v gettextu. */
export const CONTEXT_SEPARATOR = "\u0004";

export function isLanguage(value: unknown): value is Language {
	return (LANGUAGES as readonly unknown[]).includes(value);
}

let current: Language = "en";

/** Jazyk pro první spuštění podle jazyka Obsidianu („cs“, „pt-BR“…): zaregistrovaný jazyk, jinak angličtina. */
export function initialLanguage(obsidianLanguage: string | null): Language {
	const code = obsidianLanguage?.toLowerCase() ?? "";
	return LANGUAGES.find((language) => code === language || code.startsWith(`${language}-`)) ?? "en";
}

export function setLanguage(language: Language): void {
	current = language;
}

export function getLanguage(): Language {
	return current;
}

/** Kód jazyka pro Intl (formát čísel a dat). */
export function intlCode(language: Language = current): string {
	return language === "en" ? "en" : LOCALES[language].code;
}

type Vars = Record<string, string | number>;

const fill = (text: string, vars?: Vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m)) : text);

const keyOf = (text: string, context?: string) => (context ? `${context}${CONTEXT_SEPARATOR}${text}` : text);

/** Text s kontextem pro tabulky v translated() a jiná místa, kde nejde předat argument `context`. */
export function inContext(context: string, text: string): string {
	return keyOf(text, context);
}

const entry = (key: string) => (current === "en" ? undefined : LOCALES[current].ui[key]);

/**
 * Text v aktuálním jazyce; `{jmeno}` v textu nahradí hodnotou z `vars`. `context` odliší stejný
 * anglický text, který jiný jazyk potřebuje v jiném tvaru (např. „high“ u intenzity a u stresu).
 */
export function t(text: string, vars?: Vars, context?: string): string {
	const sep = text.indexOf(CONTEXT_SEPARATOR);
	if (sep >= 0) return t(text.slice(sep + 1), vars, text.slice(0, sep));
	const found = entry(keyOf(text, context));
	return fill(typeof found === "string" ? found : text, vars);
}

/** Text v daném jazyce (nezávisle na jazyce rozhraní) – např. obsah zakládané poznámky. */
export function tIn(language: Language, text: string, vars?: Vars): string {
	const found = language === "en" ? undefined : LOCALES[language].ui[text];
	return fill(typeof found === "string" ? found : text, vars);
}

const pluralRules = new Map<string, Intl.PluralRules>();
const pluralCategory = (code: string, n: number) => {
	let rules = pluralRules.get(code);
	if (!rules) pluralRules.set(code, (rules = new Intl.PluralRules(code)));
	return rules.select(n);
};

/**
 * Text s číslem ve správném tvaru: anglicky [jednotné, množné]; jiný jazyk má ve slovníku pod
 * anglickým množným tvarem své tvary podle Intl.PluralRules (čeština one / few / other). `{n}` = číslo.
 */
export function tn(n: number, forms: readonly [one: string, other: string], vars?: Vars, context?: string): string {
	const all = { n, ...vars };
	const found = entry(keyOf(forms[1], context));
	if (typeof found === "object") return fill(found[pluralCategory(intlCode(), n)] ?? found.other, all);
	return fill(pluralCategory("en", n) === "one" ? forms[0] : forms[1], all);
}

/**
 * Tabulka (objekt nebo pole, i vnořené), která při čtení vrací texty v aktuálním jazyce.
 * Hodnoty bez překladu (id, zkratky) zůstanou, jak jsou.
 */
export function translated<T extends object>(table: T): T {
	return new Proxy(table, {
		get(target, key, receiver) {
			const value: unknown = Reflect.get(target, key, receiver);
			if (typeof value === "string") return t(value);
			return typeof value === "object" && value !== null ? translated(value) : value;
		},
	});
}
