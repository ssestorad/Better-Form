// Přepis odkazů ve frontmatteru po přejmenování poznámek (cviky, šablony, programy) – např. při
// překladu vestavěné knihovny do jiného jazyka. Bez závislosti na Obsidianu.

import { parseLink, toLink } from "../model/links";

/**
 * Text poznámky s tělem přeloženým na `target`, pokud se tělo (bez okrajových mezer) přesně shoduje
 * s některým z `seeded` – textů, které plugin vložil při založení. Cokoli jiného (uživatel do těla
 * psal) vrátí null. Frontmatter zůstane, jak je.
 */
export function translateSeedBody(text: string, seeded: readonly string[], target: string): string | null {
	const match = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(text);
	const head = match ? match[0] : "";
	const body = text.slice(head.length);
	const trimmed = body.trim();
	if (trimmed === target.trim() || !seeded.some((seed) => seed.trim() === trimmed)) return null;
	const lead = body.slice(0, body.length - body.trimStart().length);
	return `${head}${lead}${target.trim()}\n`;
}

/** Klíč ve frontmatteru → přejmenování (starý název malými písmeny → nový název). */
export type RenameMaps = Readonly<Record<string, ReadonlyMap<string, string>>>;

/**
 * Hodnota frontmatteru s odkazy pod danými klíči (kdekoli ve vnořené struktuře – bloky tréninku,
 * položky programu…) přepsanými na nové názvy. Wikiodkaz zůstane wikiodkazem, prostý text textem.
 */
export function relinkFrontmatter(value: unknown, maps: RenameMaps): { value: unknown; changed: boolean } {
	let changed = false;
	const swap = (text: unknown, map: ReadonlyMap<string, string>): unknown => {
		if (typeof text !== "string") return text;
		const to = map.get(parseLink(text).toLowerCase());
		if (to === undefined) return text;
		changed = true;
		return /^\s*\[\[/.test(text) ? toLink(to) : to;
	};
	const walk = (node: unknown): unknown => {
		if (Array.isArray(node)) return node.map(walk);
		if (typeof node !== "object" || node === null) return node;
		return Object.fromEntries(
			Object.entries(node).map(([key, child]) => {
				const map = maps[key];
				if (!map) return [key, walk(child)];
				return [key, Array.isArray(child) ? child.map((item) => swap(item, map)) : swap(child, map)];
			}),
		);
	};
	const result = walk(value);
	return { value: changed ? result : value, changed };
}
