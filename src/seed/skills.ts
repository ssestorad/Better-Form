// Předpřipravené žebříčky kalistenických dovedností (SPEC 5.6). Žebříček je dán
// polem `progression` v poznámkách cviků (`ladder` = název, `level` = stupeň),
// takže si ho uživatel upraví přímo v knihovně. Pořadí stupňů je trenérská
// praxe, ne výsledek výzkumu. Bez závislosti na Obsidianu.

import { getLanguage, type Language } from "../i18n";
import { csExerciseName, ladderName } from "./localize";

export interface SeedLadder {
	/** Název žebříčku = cíl odkazu v `progression.ladder`. */
	name: string;
	/** Cviky od nejlehčího; názvy z knihovny (src/seed/exercises.ts). */
	steps: string[];
}

export const SKILL_LADDERS: SeedLadder[] = [
	{
		name: "Kliky – progrese",
		steps: ["Kliky o vyvýšení", "Kliky na kolenou", "Kliky", "Diamantové kliky", "Kliky s nohama na vyvýšení", "Archer kliky", "Kliky na jedné ruce"],
	},
	{
		name: "Shyby – progrese",
		steps: ["Vis na hrazdě", "Australské přítahy", "Negativní shyby", "Shyby s gumou", "Shyby podhmatem", "Shyby", "Shyby širokým úchopem"],
	},
	{ name: "Dipy – progrese", steps: ["Dipy na lavici", "Negativní dipy", "Dipy"] },
	{ name: "Dřep na jedné noze – progrese", steps: ["Dřepy", "Výpady", "Bulharský dřep", "Pistol squat s oporou", "Pistol squat"] },
	{ name: "Stojka – progrese", steps: ["Pike kliky", "Stojka u zdi", "Stojka", "Kliky ve stojce"] },
	{ name: "L-sit – progrese", steps: ["Hollow hold", "L-sit s pokrčenýma nohama", "L-sit"] },
	{ name: "Front lever – progrese", steps: ["Tuck front lever", "Advanced tuck front lever", "Front lever"] },
	{ name: "Muscle-up – progrese", steps: ["Shyby k hrudníku", "Negativní muscle-up", "Muscle-up"] },
	{ name: "Planche – progrese", steps: ["Planche lean", "Tuck planche", "Planche"] },
	{ name: "Břicho – progrese", steps: ["Zkracovačky", "Sedy-lehy", "Sklapovačky", "Zvedání kolen ve visu", "Zvedání nohou ve visu"] },
];

const key = (name: string) => name.trim().toLocaleLowerCase("cs");

const BY_EXERCISE = new Map<string, { ladder: string; level: number }>();
for (const ladder of SKILL_LADDERS) {
	ladder.steps.forEach((exercise, index) => BY_EXERCISE.set(key(exercise), { ladder: ladder.name, level: index + 1 }));
}

/** Žebříček (název v jazyce) a stupeň vestavěného cviku; cvik jde zadat v kterémkoli jazyce. */
export function progressionFor(exercise: string, language: Language = getLanguage()): { ladder: string; level: number } | undefined {
	const found = BY_EXERCISE.get(key(csExerciseName(exercise)));
	return found ? { ladder: ladderName(found.ladder, language), level: found.level } : undefined;
}

/** Shyby bez dopomoci – pro odznak „první shyb“. */
export const PULL_UP_EXERCISES = ["Shyby", "Shyby podhmatem", "Shyby širokým úchopem", "Shyby k hrudníku"];
