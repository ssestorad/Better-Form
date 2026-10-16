// Předpřipravené žebříčky kalistenických dovedností (SPEC 5.6). Žebříček je dán
// polem `progression` v poznámkách cviků (`ladder` = název, `level` = stupeň),
// takže si ho uživatel upraví přímo v knihovně. Pořadí stupňů je trenérská
// praxe, ne výsledek výzkumu. Anglický zdroj, názvy v jiných jazycích v src/locales/<kód>/programs.ts.
// Bez závislosti na Obsidianu.

import { getLanguage, type Language } from "../i18n";
import { builtinName, exerciseId } from "./localize";

export interface SeedLadder {
	id: string;
	/** Název žebříčku = cíl odkazu v `progression.ladder`. */
	name: string;
	/** Id cviků od nejlehčího (src/seed/exerciseData.ts). */
	steps: string[];
}

export const SKILL_LADDERS: SeedLadder[] = [
	{ id: "push-up-progression", name: "Push-up – progression", steps: ["incline-push-up", "knee-push-up", "push-up", "diamond-push-up", "decline-push-up", "archer-push-up", "one-arm-push-up"] },
	{ id: "pull-up-progression", name: "Pull-up – progression", steps: ["dead-hang", "inverted-row", "negative-pull-up", "band-assisted-pull-up", "chin-up", "pull-up", "wide-grip-pull-up"] },
	{ id: "dip-progression", name: "Dip – progression", steps: ["bench-dip", "negative-dip", "dip"] },
	{ id: "single-leg-squat-progression", name: "Single-leg squat – progression", steps: ["bodyweight-squat", "lunge", "bulgarian-split-squat", "assisted-pistol-squat", "pistol-squat"] },
	{ id: "handstand-progression", name: "Handstand – progression", steps: ["pike-push-up", "wall-handstand", "handstand", "handstand-push-up"] },
	{ id: "l-sit-progression", name: "L-sit – progression", steps: ["hollow-hold", "tuck-l-sit", "l-sit"] },
	{ id: "front-lever-progression", name: "Front lever – progression", steps: ["tuck-front-lever", "advanced-tuck-front-lever", "front-lever"] },
	{ id: "muscle-up-progression", name: "Muscle-up – progression", steps: ["chest-to-bar-pull-up", "negative-muscle-up", "muscle-up"] },
	{ id: "planche-progression", name: "Planche – progression", steps: ["planche-lean", "tuck-planche", "planche"] },
	{ id: "abs-progression", name: "Abs – progression", steps: ["crunch", "sit-up", "v-up", "hanging-knee-raise", "hanging-leg-raise"] },
];

let byExercise: Map<string, { ladder: string; level: number }> | null = null;

/** Žebříček (název v jazyce) a stupeň vestavěného cviku; cvik jde zadat v kterémkoli jazyce. */
export function progressionFor(exercise: string, language: Language = getLanguage()): { ladder: string; level: number } | undefined {
	byExercise ??= new Map(SKILL_LADDERS.flatMap((ladder) => ladder.steps.map((step, index) => [step, { ladder: ladder.id, level: index + 1 }] as const)));
	const id = exerciseId(exercise);
	const found = id ? byExercise.get(id) : undefined;
	return found ? { ladder: builtinName("ladder", found.ladder, language), level: found.level } : undefined;
}

/** Shyby bez dopomoci (id cviků) – pro odznak „první shyb“. */
export const PULL_UP_EXERCISES = ["pull-up", "chin-up", "wide-grip-pull-up", "chest-to-bar-pull-up"];
