// Předpřipravené šablony tréninků push / pull. Jen plán (série × opakování, váha „z minula“);
// existující poznámky se nepřepisují. Výběr cviků a počty sérií jsou běžná praxe, ne výsledek studie.
// Bez závislosti na Obsidianu.

import { SCHEMA_VERSION, type Sport } from "../model/constants";
import { getLanguage, type Language } from "../i18n";
import { exerciseName, templateName } from "./localize";
import type { TemplateBlock, TemplateNote } from "../model/types";

const sets = (exercise: string, count: number, reps: number, weighted = false): TemplateBlock => ({
	type: "sets",
	exercise,
	sets: count,
	reps,
	...(weighted ? { kg: "last" as const } : {}),
});

const template = (name: string, sport: Sport, blocks: TemplateBlock[]): TemplateNote => ({ forma: "template", schema: SCHEMA_VERSION, name, sport, blocks });

/** Text do těla poznámky šablony (jen při založení, pak patří uživateli). */
export const TEMPLATE_NOTE_BODY =
	"Předpřipravená šablona – uprav si cviky, série i opakování podle sebe. Počty jsou výchozí bod z běžné praxe; série ukončuj 1–3 opakování před selháním.\n";

export const SEED_TEMPLATES: TemplateNote[] = [
	template("Push – posilovna", "strength", [
		sets("Bench press", 4, 6, true),
		sets("Tlak nad hlavu", 3, 8, true),
		sets("Tlak na šikmé lavici", 3, 10, true),
		sets("Upažování", 3, 12, true),
		sets("Stahování kladky na triceps", 3, 12, true),
	]),
	template("Pull – posilovna", "strength", [
		sets("Přítahy v předklonu", 4, 8, true),
		sets("Stahování kladky", 3, 10, true),
		sets("Přítahy kladky vsedě", 3, 10, true),
		sets("Face pull", 3, 15, true),
		sets("Bicepsový zdvih", 3, 12, true),
	]),
	template("Push – vlastní váha", "calisthenics", [
		sets("Dipy", 4, 8),
		sets("Kliky", 4, 12),
		sets("Pike kliky", 3, 8),
		sets("Diamantové kliky", 3, 10),
	]),
	template("Pull – vlastní váha", "calisthenics", [
		sets("Shyby", 4, 6),
		sets("Shyby podhmatem", 3, 6),
		sets("Australské přítahy", 4, 10),
		{ type: "hold", exercise: "Vis na hrazdě", sets: 3, sec: 30 },
	]),
];

export function seedTemplates(language: Language = getLanguage()): TemplateNote[] {
	if (language === "cs") return SEED_TEMPLATES;
	return SEED_TEMPLATES.map((note) => ({
		...note,
		name: templateName(note.name, language),
		blocks: note.blocks.map((block) => (block.exercise ? { ...block, exercise: exerciseName(String(block.exercise), language) } : block)),
	}));
}

/** Text do těla poznámky šablony v jazyce. */
export function templateNoteBody(language: Language = getLanguage()): string {
	return language === "cs" ? TEMPLATE_NOTE_BODY : "A built-in template – adjust the exercises, sets and reps to suit you. The numbers are a starting point from common practice; end your sets 1–3 reps short of failure.\n";
}
