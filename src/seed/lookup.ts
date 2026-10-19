// Dohledání vestavěných textů ke cviku. Poznámka cviku má vždy přednost;
// vestavěný text se použije jen tam, kde v poznámce chybí. Bez Obsidianu.

import type { ExerciseNote } from "../model/types";
import { getLanguage } from "../i18n";
import { builtinExerciseIn } from "./exercises";
import { exerciseId } from "./localize";

const TEXT_FIELDS = ["description", "technique", "mistakes"] as const;
export type ExerciseTextField = (typeof TEXT_FIELDS)[number];

/** Vestavěný cvik se stejným názvem nebo aliasem v kterémkoli jazyce; název a texty v jazyce rozhraní. */
export function builtinExercise(name: string): ExerciseNote | undefined {
	const id = exerciseId(name);
	return id === undefined ? undefined : builtinExerciseIn(id, getLanguage());
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

/** Cvik pro zobrazení: texty a vybavení z poznámky, chybějící doplněné z vestavěné knihovny. */
export function withBuiltinTexts(note: ExerciseNote): ExerciseNote {
	const equipment = note.equipment ?? builtinExercise(note.name)?.equipment;
	return { ...note, ...missingTexts(note), ...(equipment ? { equipment } : {}) };
}

/** Odrážkový text („- a\n- b“) → řádky. */
export function bulletLines(text: string | undefined): string[] {
	if (!text) return [];
	return text
		.split("\n")
		.map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
		.filter((line) => line !== "");
}
