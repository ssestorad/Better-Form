// Náhrada modulu „obsidian“ pro testy datové vrstvy (alias ve vitest.config.ts).
// Obsahuje jen to, co služby v src/data za běhu opravdu potřebují. YAML zastupuje
// JSON (je to platný YAML) – testy čtou jen poznámky, které samy zapsaly.

export class TAbstractFile {
	path = "";
	name = "";
}

export class TFile extends TAbstractFile {
	basename = "";
	extension = "";
	stat = { mtime: 0, ctime: 0, size: 0 };
}

export class TFolder extends TAbstractFile {}

export interface EventRef {
	name: string;
	callback: (...args: unknown[]) => void;
}

export class Events {
	private readonly handlers: EventRef[] = [];

	on(name: string, callback: (...args: never[]) => void): EventRef {
		const ref: EventRef = { name, callback: callback as (...args: unknown[]) => void };
		this.handlers.push(ref);
		return ref;
	}

	offref(ref: EventRef): void {
		const index = this.handlers.indexOf(ref);
		if (index >= 0) this.handlers.splice(index, 1);
	}

	trigger(name: string, ...args: unknown[]): void {
		for (const handler of [...this.handlers]) if (handler.name === name) handler.callback(...args);
	}
}

/** V testech bez čekání: zavolá se hned. */
export function debounce<T extends (...args: never[]) => void>(fn: T): T & { run(): void; cancel(): void } {
	return Object.assign(((...args: never[]) => fn(...args)) as T, { run() {}, cancel() {} });
}

export function normalizePath(path: string): string {
	return path
		.replace(/\\/g, "/")
		.replace(/\/+/g, "/")
		.replace(/^\/|\/$/g, "");
}

export function stringifyYaml(value: unknown): string {
	return `${JSON.stringify(value, null, 1)}\n`;
}

export function parseYaml(text: string): unknown {
	return JSON.parse(text);
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export function getFrontMatterInfo(text: string): { exists: boolean; frontmatter: string; contentStart: number } {
	const match = text.match(FRONTMATTER);
	return match ? { exists: true, frontmatter: match[1] ?? "", contentStart: match[0].length } : { exists: false, frontmatter: "", contentStart: 0 };
}

// Stránka nastavení (tests/settings/settingsTab.test.ts) jen sestavuje definice – prvky rozhraní se nevytvářejí.
export class Modal {}
export class Setting {}
export class Notice {}
export class PluginSettingTab {
	constructor(
		readonly app: unknown,
		readonly plugin: unknown,
	) {}
	update(): void {}
}
