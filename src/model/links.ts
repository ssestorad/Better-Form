// Práce s wikiodkazy ve frontmatteru ("[[Cíl|popisek]]").

/** Vrátí cíl odkazu bez závorek, popisku a kotvy; u prostého textu vrátí text. */
export function parseLink(value: string): string {
	let text = value.trim();
	const match = text.match(/^\[\[([^\]]*)\]\]$/);
	if (match) text = match[1] ?? "";
	const pipe = text.indexOf("|");
	if (pipe >= 0) text = text.slice(0, pipe);
	const hash = text.indexOf("#");
	if (hash >= 0) text = text.slice(0, hash);
	return text.trim();
}

/** Zabalí cíl do wikiodkazu. */
export function toLink(target: string): string {
	return `[[${target}]]`;
}
