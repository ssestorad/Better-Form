// Názvy vestavěného obsahu v jazyce rozhraní. Zdrojem jsou české názvy (klíče v src/seed/en/*);
// poznámky ve vaultu se jmenují podle jazyka, ve kterém vznikly, a druhý jazyk mají cviky jako alias.
// Bez závislosti na Obsidianu.

import { getLanguage, type Language } from "../i18n";
import { EXERCISES_EN } from "./en/exercises";
import { LADDERS_EN, PROGRAMS_EN, TEMPLATES_EN } from "./en/programs";

const key = (name: string) => name.trim().toLocaleLowerCase("cs");

const reverse = (map: Record<string, string>) => new Map(Object.entries(map).map(([cs, en]) => [key(en), cs]));
const CS_EXERCISE = reverse(Object.fromEntries(Object.entries(EXERCISES_EN).map(([cs, en]) => [cs, en.name])));
const CS_PROGRAM = reverse(Object.fromEntries(Object.entries(PROGRAMS_EN).map(([cs, en]) => [cs, en.name])));

/** Český (zdrojový) název vestavěného cviku k názvu v kterémkoli jazyce; neznámý název beze změny. */
export function csExerciseName(name: string): string {
	return CS_EXERCISE.get(key(name)) ?? name;
}

/** Název vestavěného cviku v jazyce. */
export function exerciseName(cs: string, language: Language = getLanguage()): string {
	return language === "en" ? (EXERCISES_EN[cs]?.name ?? cs) : cs;
}

/** Český název vestavěného programu k názvu v kterémkoli jazyce. */
export function csProgramName(name: string): string {
	return CS_PROGRAM.get(key(name)) ?? name;
}

export function programName(cs: string, language: Language = getLanguage()): string {
	return language === "en" ? (PROGRAMS_EN[cs]?.name ?? cs) : cs;
}

export function templateName(cs: string, language: Language = getLanguage()): string {
	return language === "en" ? (TEMPLATES_EN[cs] ?? cs) : cs;
}

export function ladderName(cs: string, language: Language = getLanguage()): string {
	return language === "en" ? (LADDERS_EN[cs] ?? cs) : cs;
}
