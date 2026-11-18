// Předpřipravené šablony tréninků v jazyce: data anglicky v programData.ts, název z překladu,
// cviky pod názvem v tom jazyce. Do vaultu se zakládají jen chybějící, existující se nepřepisují.
// Počty sérií a opakování jsou výchozí bod z běžné praxe.

import { getLanguage, tIn, type Language } from "../i18n";
import type { TemplateNote } from "../model/types";
import { contentOf, exerciseNameIn } from "./localize";
import { STRETCH_TEMPLATE_IDS, TEMPLATE_DATA } from "./programData";

export function seedTemplates(language: Language = getLanguage()): TemplateNote[] {
	return TEMPLATE_DATA.map(({ id, note }) => ({
		...note,
		name: contentOf(language)?.templates[id] ?? note.name,
		blocks: note.blocks.map((block) => (block.exercise ? { ...block, exercise: exerciseNameIn(String(block.exercise), language) } : block)),
	}));
}

/** Text do těla poznámky šablony v jazyce; šablony protažení mají vlastní. */
export function templateNoteBody(language: Language, id?: string): string {
	if (id !== undefined && STRETCH_TEMPLATE_IDS.includes(id)) {
		return tIn(
			language,
			"A built-in stretching template – adjust the stretches to suit you. Hold each stretch about 30 seconds, gently and without pain, twice; do one-sided stretches on each side. Stretch after training or on a separate day – doing it regularly matters more than how long or hard you stretch (Konrad 2024 – research). Before training keep static stretches short and follow them with dynamic movement (Behm 2016 – research; Jebavý 2014 – practice).\n",
		);
	}
	return tIn(
		language,
		"A built-in template – adjust the exercises, sets and reps to suit you. The numbers are a starting point from common practice; end your sets 1–3 reps short of failure.\n",
	);
}
