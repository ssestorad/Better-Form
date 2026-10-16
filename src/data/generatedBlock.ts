// Generovaný obsah v poznámkách smí být jen mezi značkami forma:start / forma:end.
// Text mimo značky se nikdy nemění. Bez závislosti na Obsidianu.

export const BLOCK_START = "<!-- forma:start -->";
export const BLOCK_END = "<!-- forma:end -->";

export type BlockUpdate =
	| { status: "replaced" | "appended" | "unchanged"; text: string }
	/** Značky jsou poškozené (chybí konec, obrácené pořadí) – nic se nezměnilo. */
	| { status: "malformed"; text: string };

function findBlock(text: string): { start: number; end: number } | "none" | "malformed" {
	const start = text.indexOf(BLOCK_START);
	const end = text.indexOf(BLOCK_END);
	if (start < 0 && end < 0) return "none";
	if (start < 0 || end < 0 || end < start) return "malformed";
	return { start, end };
}

/** Nahradí obsah prvního generovaného bloku; pokud blok chybí, přidá ho na konec poznámky. */
export function replaceGeneratedBlock(text: string, content: string): BlockUpdate {
	const block = `${BLOCK_START}\n${content.trim()}\n${BLOCK_END}`;
	const found = findBlock(text);
	if (found === "malformed") return { status: "malformed", text };
	if (found === "none") {
		const base = text.replace(/\s*$/, "");
		const separator = base === "" ? "" : "\n\n";
		return { status: "appended", text: `${base}${separator}${block}\n` };
	}
	const next = text.slice(0, found.start) + block + text.slice(found.end + BLOCK_END.length);
	return { status: next === text ? "unchanged" : "replaced", text: next };
}

/** Obsah generovaného bloku bez značek, nebo null. */
export function extractGeneratedBlock(text: string): string | null {
	const found = findBlock(text);
	if (typeof found === "string") return null;
	return text.slice(found.start + BLOCK_START.length, found.end).trim();
}
