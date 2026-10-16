// Překlad rozhraní bez knihovny: zdrojem je český text, angličtina je ve slovníku en.ts
// (klíč = český text). Chybějící překlad se ukáže česky; test v tests/i18n.test.ts hlídá,
// aby žádný nechyběl. t() se volá až při vykreslení – konstanty modulu se vyhodnotí dřív,
// než se načte nastavení, proto tabulky popisků obaluje translated().

import { EN } from "./en";

export const LANGUAGES = ["en", "cs"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_LABELS: Record<Language, string> = { en: "English", cs: "Čeština" };

export function isLanguage(value: unknown): value is Language {
	return (LANGUAGES as readonly unknown[]).includes(value);
}

let current: Language = "en";

/** Jazyk pro první spuštění podle jazyka Obsidianu (null = angličtina): čeština, jinak angličtina. */
export function initialLanguage(obsidianLanguage: string | null): Language {
	return obsidianLanguage?.toLowerCase().startsWith("cs") ? "cs" : "en";
}

export function setLanguage(language: Language): void {
	current = language;
}

export function getLanguage(): Language {
	return current;
}

type Vars = Record<string, string | number>;

const fill = (text: string, vars?: Vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m)) : text);

/** Text v aktuálním jazyce; `{jmeno}` v textu nahradí hodnotou z `vars`. */
export function t(cs: string, vars?: Vars): string {
	const en = current === "en" ? EN[cs] : undefined;
	return fill(typeof en === "string" ? en : cs, vars);
}

/**
 * Text s číslem ve správném tvaru. Čeština má tři tvary [1, 2–4, 5 a víc], angličtina dva –
 * v en.ts jsou jako dvojice [1, ostatní] pod klíčem posledního českého tvaru. `{n}` = číslo.
 */
export function tn(n: number, cs: readonly [string, string, string], vars?: Vars): string {
	const all = { n, ...vars };
	if (current === "en") {
		const en = EN[cs[2]];
		if (Array.isArray(en)) return fill(n === 1 ? en[0] : en[1], all);
	}
	const abs = Math.abs(n);
	return fill(abs === 1 ? cs[0] : Number.isInteger(n) && abs >= 2 && abs <= 4 ? cs[1] : cs[2], all);
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
