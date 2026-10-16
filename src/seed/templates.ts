// Předpřipravené šablony tréninků v jazyce: data anglicky v programData.ts, název z překladu,
// cviky pod názvem v tom jazyce. Do vaultu se zakládají jen chybějící, existující se nepřepisují.
// Počty sérií a opakování jsou výchozí bod z běžné praxe.

import { getLanguage, tIn, type Language } from "../i18n";
import type { TemplateNote } from "../model/types";
import { contentOf, exerciseNameIn } from "./localize";
import { TEMPLATE_DATA } from "./programData";

export function seedTemplates(language: Language = getLanguage()): TemplateNote[] {
	return TEMPLATE_DATA.map(({ id, note }) => ({
		...note,
		name: contentOf(language)?.templates[id] ?? note.name,
		blocks: note.blocks.map((block) => (block.exercise ? { ...block, exercise: exerciseNameIn(String(block.exercise), language) } : block)),
	}));
}

/** Text do těla poznámky šablony v jazyce. */
export function templateNoteBody(language: Language): string {
	return tIn(
		language,
		"A built-in template – adjust the exercises, sets and reps to suit you. The numbers are a starting point from common practice; end your sets 1–3 reps short of failure.\n",
	);
}
