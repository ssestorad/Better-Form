// Předpřipravené programy (SPEC 5.7) v jazyce: data anglicky v programData.ts,
// název a popis z překladu, cviky v položkách pod názvem v tom jazyce.

import { getLanguage, type Language } from "../i18n";
import type { ProgramNote } from "../model/types";
import { contentOf, exerciseNameIn } from "./localize";
import { PROGRAM_DATA, type ProgramData } from "./programData";

export { COUCH_TO_5K_SCHEDULE, ROPE_FITNESS, ROPE_START } from "./programData";

export interface SeedProgram {
	id: string;
	note: ProgramNote;
	/** Popis do těla poznámky (jen při založení, pak patří uživateli). */
	description: string;
}

function localizeProgram(data: ProgramData, language: Language): SeedProgram {
	const local = contentOf(language)?.programs[data.id];
	const name = (exercise: string) => exerciseNameIn(exercise, language);
	const note: ProgramNote = {
		...data.note,
		name: local?.name ?? data.note.name,
		items: data.note.items.map((item) => ({
			...item,
			exercise: name(item.exercise),
			...(item.max_from ? { max_from: item.max_from.map(name) } : {}),
			...(item.schedule ? { schedule: item.schedule.map((s) => (s.exercise ? { ...s, exercise: name(s.exercise) } : s)) } : {}),
		})),
	};
	return { id: data.id, note, description: local?.description ?? data.description };
}

const cache = new Map<Language, SeedProgram[]>();

export function seedPrograms(language: Language = getLanguage()): SeedProgram[] {
	let programs = cache.get(language);
	if (!programs) cache.set(language, (programs = PROGRAM_DATA.map((data) => localizeProgram(data, language))));
	return programs;
}
