// Dohledání vestavěných textů ke cviku. Poznámka cviku má vždy přednost;
// vestavěný text se použije jen tam, kde v poznámce chybí. Bez Obsidianu.

import type { ExerciseNote } from "../model/types";
import { getLanguage } from "../i18n";
import { seedExercises } from "./exercises";
import { csExerciseName, exerciseName } from "./localize";

const TEXT_FIELDS = ["description", "technique", "mistakes"] as const;
export type ExerciseTextField = (typeof TEXT_FIELDS)[number];

const key = (name: string) => name.trim().toLocaleLowerCase("cs");
const byName = new Map<string, Map<string, ExerciseNote>>();

/** Vestavěný cvik se stejným názvem v kterémkoli jazyce (bez ohledu na velikost písmen); texty v jazyce rozhraní. */
export function builtinExercise(name: string): ExerciseNote | undefined {
	const language = getLanguage();
	let map = byName.get(language);
	if (!map) byName.set(language, (map = new Map(seedExercises(language).map((e) => [key(e.name), e]))));
	return map.get(key(exerciseName(csExerciseName(name), language)));
}

/** Texty, které v poznámce chybí a vestavěná knihovna je má. */
export function missingTexts(note: ExerciseNote): Partial<Record<ExerciseTextField, string>> {
	const builtin = builtinExercise(note.name);
	const missing: Partial<Record<ExerciseTextField, string>> = {};
	if (!builtin) return missing;
	for (const field of TEXT_FIELDS) {
		const value = builtin[field];
		if (note[field] === undefined && value !== undefined) missing[field] = value;
	}
	return missing;
}

/** Cvik pro zobrazení: texty z poznámky, chybějící doplněné z vestavěné knihovny. */
export function withBuiltinTexts(note: ExerciseNote): ExerciseNote {
	return { ...note, ...missingTexts(note) };
}

/** Odrážkový text („- a\n- b“) → řádky. */
export function bulletLines(text: string | undefined): string[] {
	if (!text) return [];
	return text
		.split("\n")
		.map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
		.filter((line) => line !== "");
}
