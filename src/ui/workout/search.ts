// Vyhledávání cviků v knihovně podle názvu a aliasů. Bez závislosti na Obsidianu.

import type { ExerciseCategory } from "../../model/constants";

export interface ExerciseOption {
	name: string;
	aliases: string[];
	category: ExerciseCategory;
}

export interface ExerciseMatch {
	option: ExerciseOption;
	/** Alias, přes který se cvik našel (když neodpovídá název). */
	via?: string;
}

/** Malá písmena bez diakritiky: „Dřepy“ → „drepy“. */
export function normalizeSearch(text: string): string {
	return text
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.trim();
}

function score(text: string, query: string): number {
	const t = normalizeSearch(text);
	if (t === query) return 0;
	if (t.startsWith(query)) return 1;
	if (t.split(/[\s–-]+/).some((word) => word.startsWith(query))) return 2;
	if (t.includes(query)) return 3;
	return Number.POSITIVE_INFINITY;
}

/**
 * Seřazené shody: přesná shoda < začátek názvu < začátek slova < obsahuje;
 * při shodě skóre dřív cviky z preferovaných kategorií, pak abecedně.
 */
export function searchExercises(
	options: ExerciseOption[],
	query: string,
	preferred: ExerciseCategory[] = [],
	limit = 12,
): ExerciseMatch[] {
	const q = normalizeSearch(query);
	const scored = options.map((option) => {
		if (q === "") return { option, best: 4, via: undefined as string | undefined };
		let best = score(option.name, q);
		let via: string | undefined;
		for (const alias of option.aliases) {
			const s = score(alias, q);
			if (s < best) {
				best = s;
				via = alias;
			}
		}
		return { option, best, via };
	});
	return scored
		.filter((s) => Number.isFinite(s.best))
		.sort((a, b) => {
			if (a.best !== b.best) return a.best - b.best;
			const pa = preferred.includes(a.option.category) ? 0 : 1;
			const pb = preferred.includes(b.option.category) ? 0 : 1;
			if (pa !== pb) return pa - pb;
			return a.option.name.localeCompare(b.option.name, "cs");
		})
		.slice(0, limit)
		.map(({ option, via }) => (via ? { option, via } : { option }));
}
