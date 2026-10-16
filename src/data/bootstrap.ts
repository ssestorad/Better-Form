// Vytvoření struktury složek (SPEC kap. 3) a naplnění knihovny.
// Existující složky ani soubory se nikdy nemění.

import { exerciseToFrontmatter, programToFrontmatter, templateToFrontmatter } from "../model/serialize";
import { getLanguage } from "../i18n";
import { seedExercises } from "../seed/exercises";
import { programName, templateName } from "../seed/localize";
import { SEED_PROGRAMS, seedPrograms } from "../seed/programs";
import { exerciseNoteBody } from "../seed/exerciseTexts";
import { SEED_TEMPLATES, seedTemplates, templateNoteBody } from "../seed/templates";
import type { FolderSettings } from "../settings/settings";
import type { NoteWriter } from "./NoteWriter";
import { allFolderPaths, namedNotePath } from "./paths";

/** Vytvoří chybějící složky; vrátí počet nově vytvořených. */
export async function ensureFolders(writer: NoteWriter, folders: FolderSettings): Promise<number> {
	let created = 0;
	for (const path of allFolderPaths(folders)) {
		if (await writer.ensureFolder(path)) created++;
	}
	return created;
}

export interface SeedLookup {
	/** Existuje už cvik s tímto názvem nebo aliasem (kdekoli ve vaultu)? */
	hasExercise(name: string): boolean;
	/** Existuje už program s tímto názvem? */
	hasProgram(name: string): boolean;
	/** Existuje už šablona tréninku s tímto názvem? */
	hasTemplate(name: string): boolean;
}

export interface SeedResult {
	exercises: number;
	programs: number;
	templates: number;
}

/**
 * Doplní knihovnu cviků, předpřipravené programy a šablony tréninků v jazyce rozhraní. Přeskočí vše,
 * co už existuje – podle cesty i podle názvu v kterémkoli jazyce (uživatel mohl poznámku přesunout
 * nebo knihovnu založit v druhém jazyce).
 */
export async function seedLibrary(
	writer: NoteWriter,
	folders: FolderSettings,
	lookup: SeedLookup,
): Promise<SeedResult> {
	const result: SeedResult = { exercises: 0, programs: 0, templates: 0 };
	const language = getLanguage();
	for (const exercise of seedExercises(language)) {
		if (lookup.hasExercise(exercise.name) || exercise.aliases.some((a) => lookup.hasExercise(a))) continue;
		const file = await writer.createNoteIfMissing(
			namedNotePath(folders, "exercises", exercise.name),
			exerciseToFrontmatter(exercise),
			exerciseNoteBody(language),
		);
		if (file) result.exercises++;
	}
	const programs = seedPrograms(language);
	for (const [i, { note, description }] of programs.entries()) {
		const cs = SEED_PROGRAMS[i]!.note.name;
		if (lookup.hasProgram(cs) || lookup.hasProgram(programName(cs, "en"))) continue;
		const file = await writer.createNoteIfMissing(
			namedNotePath(folders, "programs", note.name),
			programToFrontmatter(note),
			description,
		);
		if (file) result.programs++;
	}
	for (const [i, note] of seedTemplates(language).entries()) {
		const cs = SEED_TEMPLATES[i]!.name;
		if (lookup.hasTemplate(cs) || lookup.hasTemplate(templateName(cs, "en"))) continue;
		const file = await writer.createNoteIfMissing(namedNotePath(folders, "templates", note.name), templateToFrontmatter(note), templateNoteBody(language));
		if (file) result.templates++;
	}
	return result;
}
