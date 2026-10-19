// Předplněná knihovna cviků (SPEC 3, 13 – fáze 1). Vytvoří se jen poznámky,
// které ve vaultu ještě nejsou; existující se nikdy nepřepisují. Data jsou anglicky
// v exerciseData.ts, překlady v src/locales/<kód>/exercises.ts.
//
// Podíl tělesné hmotnosti (`bodyweight_fraction`, SPEC 8.5): u kliků 0,64
// podle Ebben 2011 (výzkum). Ostatní hodnoty jsou orientační odhady (praxe) –
// proto u nich chybí `bodyweight_fraction_source`. Uživatel si je může upravit.

import { getLanguage, LANGUAGES, type Language } from "../i18n";
import { SCHEMA_VERSION, type ExerciseCategory, type ExerciseKind, type ExerciseMeasure, type MuscleId } from "../model/constants";
import { parseLink, toLink } from "../model/links";
import type { ExerciseNote } from "../model/types";
import { EXERCISE_ROWS } from "./exerciseData";
import { EXERCISE_EQUIPMENT } from "./exerciseEquipment";
import { bullets, type ExerciseText } from "./exerciseTexts";
import { allNames, builtinId, builtinName, contentOf } from "./localize";
import { progressionFor } from "./skills";

export interface ExerciseRow {
	/** Stálé id – klíč překladů. */
	id: string;
	name: string;
	aliases: string[];
	category: ExerciseCategory;
	kind: ExerciseKind;
	measure: ExerciseMeasure;
	primary: MuscleId[];
	secondary: MuscleId[];
	bw?: number;
	text?: ExerciseText;
}

/** Cviky, u kterých má podíl tělesné hmotnosti ověřený zdroj (podle id). */
const BODYWEIGHT_SOURCES: Record<string, "ebben2011"> = { "push-up": "ebben2011" };

/**
 * Poznámka cviku v jazyce: název a texty z překladu (jinak anglicky), názvy ve všech
 * ostatních jazycích jako aliasy – odkazy i staré záznamy tak najdou stejný cvik.
 */
function exerciseNote(row: ExerciseRow, language: Language): ExerciseNote {
	const local = contentOf(language)?.exercises[row.id];
	const name = local?.name ?? row.name;
	const note: ExerciseNote = {
		forma: "exercise",
		schema: SCHEMA_VERSION,
		name,
		category: row.category,
		kind: row.kind,
		measure: row.measure,
		muscles: { primary: row.primary, secondary: row.secondary },
		aliases: allNames("exercise", row.id).filter((alias) => alias !== name),
	};
	const equipment = EXERCISE_EQUIPMENT[row.id];
	if (equipment) note.equipment = equipment;
	if (row.bw !== undefined) note.bodyweight_fraction = row.bw;
	const source = BODYWEIGHT_SOURCES[row.id];
	if (source) note.bodyweight_fraction_source = source;
	const progression = progressionFor(row.name, language);
	if (progression) note.progression = progression;
	const text = local?.about !== undefined ? { about: local.about, how: local.how ?? [], mistakes: local.mistakes ?? [] } : row.text;
	if (text) {
		note.description = text.about;
		note.technique = bullets(text.how);
		note.mistakes = bullets(text.mistakes);
	}
	return note;
}

const cache = new Map<Language, ExerciseNote[]>();

/** Vestavěný cvik podle id v jazyce. */
export function builtinExerciseIn(id: string, language: Language): ExerciseNote | undefined {
	const index = EXERCISE_ROWS.findIndex((row) => row.id === id);
	return index >= 0 ? seedExercises(language)[index] : undefined;
}

const TEXT_FIELDS = ["description", "technique", "mistakes"] as const;

/**
 * Přeloží frontmatter poznámky vestavěného cviku do jazyka: název, aliasy (doplní názvy ve všech
 * jazycích, vlastní ponechá), popis, provedení, chyby a název žebříčku. Text, který se neshoduje
 * s vestavěným v žádném jazyce (uživatel ho upravil), zůstane. Vrací, jestli se něco změnilo.
 */
export function translateExerciseFrontmatter(fm: Record<string, unknown>, id: string, language: Language): boolean {
	const target = builtinExerciseIn(id, language);
	if (!target) return false;
	let changed = false;
	const set = (key: string, value: unknown) => {
		if (JSON.stringify(fm[key]) === JSON.stringify(value)) return;
		fm[key] = value;
		changed = true;
	};
	set("name", target.name);
	const own = Array.isArray(fm.aliases) ? fm.aliases.filter((a): a is string => typeof a === "string") : [];
	set("aliases", [...new Set([...own, ...target.aliases])].filter((alias) => alias !== target.name));
	for (const field of TEXT_FIELDS) {
		const value = fm[field];
		if (typeof value !== "string" || target[field] === undefined) continue;
		if (LANGUAGES.some((other) => builtinExerciseIn(id, other)?.[field] === value)) set(field, target[field]);
	}
	const progression = fm.progression;
	if (typeof progression === "object" && progression !== null && "ladder" in progression && typeof progression.ladder === "string") {
		const ladderId = builtinId("ladder", parseLink(progression.ladder));
		if (ladderId) {
			const name = builtinName("ladder", ladderId, language);
			set("progression", { ...progression, ladder: /^\s*\[\[/.test(progression.ladder) ? toLink(name) : name });
		}
	}
	return changed;
}

/** Knihovna cviků v jazyce (pořadí jako v exerciseData.ts). */
export function seedExercises(language: Language = getLanguage()): ExerciseNote[] {
	let notes = cache.get(language);
	if (!notes) cache.set(language, (notes = EXERCISE_ROWS.map((row) => exerciseNote(row, language))));
	return notes;
}
