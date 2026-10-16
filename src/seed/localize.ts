// Názvy vestavěného obsahu podle id. Anglický zdroj je v src/seed, překlady v src/locales/<kód>/.
// Poznámky ve vaultu se jmenují podle jazyka, ve kterém vznikly; název z kteréhokoli jazyka
// (i alias) najde stejnou položku. Bez závislosti na Obsidianu.

import { getLanguage, type Language } from "../i18n";
import { LOCALES } from "../locales";
import type { ContentLocale } from "../locales/types";
import { EXERCISE_ROWS } from "./exerciseData";
import { PROGRAM_DATA, TEMPLATE_DATA } from "./programData";
import { SKILL_LADDERS } from "./skills";

/** Vestavěný obsah v jazyce; angličtina je zdroj, proto undefined. */
export function contentOf(language: Language): ContentLocale | undefined {
	return language === "en" ? undefined : LOCALES[language].content;
}

const contents = (): ContentLocale[] => Object.values(LOCALES).map((locale) => locale.content);
const key = (name: string) => name.trim().toLowerCase();

export type BuiltinKind = "exercise" | "ladder" | "program" | "template";

/** Anglické názvy a aliasy podle id. */
function sourceNames(kind: BuiltinKind): [id: string, name: string, aliases: string[]][] {
	switch (kind) {
		case "exercise":
			return EXERCISE_ROWS.map((row) => [row.id, row.name, row.aliases]);
		case "ladder":
			return SKILL_LADDERS.map((ladder) => [ladder.id, ladder.name, []]);
		case "program":
			return PROGRAM_DATA.map((program) => [program.id, program.note.name, []]);
		case "template":
			return TEMPLATE_DATA.map((template) => [template.id, template.note.name, []]);
	}
}

/** Názvy a aliasy jedné položky v jazyce překladu. */
function localeNames(content: ContentLocale, kind: BuiltinKind, id: string): { name?: string; aliases: string[] } {
	switch (kind) {
		case "exercise": {
			const entry = content.exercises[id];
			return { name: entry?.name, aliases: entry?.aliases ?? [] };
		}
		case "ladder":
			return { name: content.ladders[id], aliases: [] };
		case "program":
			return { name: content.programs[id]?.name, aliases: [] };
		case "template":
			return { name: content.templates[id], aliases: [] };
	}
}

const indexes = new Map<BuiltinKind, Map<string, string>>();

/** Rejstřík název → id: nejdřív hlavní názvy ve všech jazycích, potom aliasy. */
function index(kind: BuiltinKind): Map<string, string> {
	let map = indexes.get(kind);
	if (map) return map;
	const built = new Map<string, string>();
	const add = (id: string, name: string | undefined) => {
		if (name !== undefined && !built.has(key(name))) built.set(key(name), id);
	};
	const source = sourceNames(kind);
	for (const [id, name] of source) add(id, name);
	for (const content of contents()) for (const [id] of source) add(id, localeNames(content, kind, id).name);
	for (const [id, , aliases] of source) for (const alias of aliases) add(id, alias);
	for (const content of contents()) for (const [id] of source) for (const alias of localeNames(content, kind, id).aliases) add(id, alias);
	indexes.set(kind, (map = built));
	return map;
}

/** Id vestavěné položky podle názvu nebo aliasu v kterémkoli jazyce (bez ohledu na velikost písmen). */
export function builtinId(kind: BuiltinKind, name: string): string | undefined {
	return index(kind).get(key(name));
}

/** Název vestavěné položky v jazyce; neznámé id vrátí beze změny. */
export function builtinName(kind: BuiltinKind, id: string, language: Language = getLanguage()): string {
	const content = contentOf(language);
	const local = content ? localeNames(content, kind, id).name : undefined;
	return local ?? sourceNames(kind).find(([sourceId]) => sourceId === id)?.[1] ?? id;
}

/** Všechny názvy a aliasy položky ve všech jazycích – aliasy poznámky, aby ji našel odkaz v kterémkoli jazyce. */
export function allNames(kind: BuiltinKind, id: string): string[] {
	const source = sourceNames(kind).find(([sourceId]) => sourceId === id);
	const names = source ? [source[1], ...source[2]] : [];
	for (const content of contents()) {
		const local = localeNames(content, kind, id);
		if (local.name) names.push(local.name);
		names.push(...local.aliases);
	}
	return [...new Set(names)];
}

export const exerciseId = (name: string) => builtinId("exercise", name);

/** Název cviku v jazyce, jde-li o vestavěný cvik; vlastní cvik beze změny. */
export function exerciseNameIn(name: string, language: Language = getLanguage()): string {
	const id = exerciseId(name);
	return id ? builtinName("exercise", id, language) : name;
}

/** Název vestavěné šablony nebo programu (v kterémkoli jazyce) v jazyce `language`; u vlastní poznámky undefined. */
export function builtinNameIn(kind: BuiltinKind, name: string, language: Language): string | undefined {
	const id = builtinId(kind, name);
	return id ? builtinName(kind, id, language) : undefined;
}
