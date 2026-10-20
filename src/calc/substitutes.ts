// Náhrada cviku (stroj obsazený, vybavení chybí): cviky na stejné hlavní svaly, přednost má jiné vybavení.
// Heuristika podle shody svalů – úroveň „praxe“, ne výzkum.

import type { Basis } from "../evidence/sources";
import type { ExerciseCategory, MuscleId } from "../model/constants";
import type { ExerciseNote } from "../model/types";

export const SUBSTITUTES_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };

/** Kategorie, mezi kterými jde cvik nahradit: síla, kalistenika a kettlebell navzájem, kardio a mobilita jen samy se sebou. */
const CATEGORY_GROUP: Record<ExerciseCategory, string> = {
	strength: "resistance",
	calisthenics: "resistance",
	kettlebell: "resistance",
	cardio: "cardio",
	mobility: "mobility",
};

/** Bonus za jiné vybavení – stejné vybavení většinou nepomůže, když je obsazené. */
const OTHER_EQUIPMENT_BONUS = 0.5;

export interface Substitute {
	exercise: ExerciseNote;
	/** Hlavní svaly společné s původním cvikem. */
	shared: MuscleId[];
	/** Vybavení je jiné než u původního cviku. */
	otherEquipment: boolean;
}

/** Shoda dvou množin 0–1 (Diceův koeficient); dvě prázdné = 0. */
function overlap(a: readonly string[], b: readonly string[]): number {
	if (a.length + b.length === 0) return 0;
	return (2 * a.filter((x) => b.includes(x)).length) / (a.length + b.length);
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((x) => b.includes(x));
}

/**
 * Nejvýš `limit` náhrad: aspoň jeden společný hlavní sval, slučitelná kategorie.
 * Skóre = 2 × shoda hlavních svalů + shoda vedlejších + bonus za jiné vybavení;
 * při shodě skóre podle názvu. Z každé sady vybavení jen jeden cvik.
 */
export function substitutes(exercise: ExerciseNote, library: readonly ExerciseNote[], limit = 5): Substitute[] {
	const primary = exercise.muscles.primary;
	if (primary.length === 0) return [];
	const group = CATEGORY_GROUP[exercise.category];
	const equipment = exercise.equipment ?? [];
	return library
		.filter((e) => e.name !== exercise.name && CATEGORY_GROUP[e.category] === group)
		.map((e) => {
			const shared = e.muscles.primary.filter((m) => primary.includes(m));
			const otherEquipment = !sameSet(e.equipment ?? [], equipment);
			const score =
				2 * overlap(primary, e.muscles.primary) +
				overlap(exercise.muscles.secondary, e.muscles.secondary) +
				(otherEquipment ? OTHER_EQUIPMENT_BONUS : 0);
			return { exercise: e, shared, otherEquipment, score };
		})
		.filter((c) => c.shared.length > 0)
		.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))
		// Z každé sady vybavení jen nejlepší cvik – jinak by seznam zaplnily varianty kliků.
		.filter((c, i, all) => all.findIndex((o) => sameSet(o.exercise.equipment ?? [], c.exercise.equipment ?? [])) === i)
		.slice(0, limit);
}
