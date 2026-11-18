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

// ---------- Síť: podvržený requestUrl ----------

export interface FakeRequest {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string | ArrayBuffer;
	throw?: boolean;
}

export interface FakeResponse {
	status: number;
	text?: string;
	json?: unknown;
	arrayBuffer?: ArrayBuffer;
}

let requestHandler: ((request: FakeRequest) => FakeResponse | Promise<FakeResponse>) | null = null;
/** Všechny požadavky od posledního `setRequestHandler`. */
export const requestLog: FakeRequest[] = [];

/** Nastaví odpovědi „serveru“; handler může vyhodit chybu (výpadek sítě). */
export function setRequestHandler(handler: ((request: FakeRequest) => FakeResponse | Promise<FakeResponse>) | null): void {
	requestHandler = handler;
	requestLog.length = 0;
}

export async function requestUrl(request: FakeRequest) {
	requestLog.push(request);
	if (!requestHandler) throw new Error("requestUrl: v testu není nastavený handler");
	const response = await requestHandler(request);
	const text = response.text ?? (response.json !== undefined ? JSON.stringify(response.json) : "");
	return {
		status: response.status,
		text,
		// Jako v Obsidianu: JSON se čte až při přístupu (text nemusí být JSON).
		get json(): unknown {
			return response.json ?? (JSON.parse(text) as unknown);
		},
		arrayBuffer: response.arrayBuffer ?? new TextEncoder().encode(text).buffer,
		headers: {},
	};
}

export const Platform = { isDesktop: true, isDesktopApp: true, isMobile: false };
