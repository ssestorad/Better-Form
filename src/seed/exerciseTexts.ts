// Texty k cvikům (popis, provedení, časté chyby) – data jsou u cviků v src/seed/exerciseData.ts,
// překlady v src/locales/<kód>/exercises.ts. Obecné zásady – úroveň „praxe“, ne náhrada trenéra.

import { tIn, type Language } from "../i18n";

export interface ExerciseText {
	/** Co cvik je a k čemu slouží. */
	about: string;
	/** Provedení krok za krokem. */
	how: string[];
	/** Časté chyby. */
	mistakes: string[];
}

/** Text do těla nově zakládané poznámky cviku v jazyce. */
export function exerciseNoteBody(language: Language): string {
	return tIn(
		language,
		"The technique description is a general guide (practice), not a substitute for a coach. Stop the exercise if it hurts; if the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.",
	);
}

/** Odrážkový text z řádků. */
export function bullets(lines: string[]): string {
	return lines.map((line) => `- ${line}`).join("\n");
}
