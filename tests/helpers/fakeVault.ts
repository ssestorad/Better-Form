// Trezor Obsidianu v paměti pro testy služeb: soubory, složky, frontmatter,
// události změn a koš. Chová se jako skutečné API v tom, na čem služby stojí:
// `create` nepřepíše existující soubor, `processFrontMatter` nechá text pod
// frontmatterem být a každá změna se hned promítne do metadataCache.

import { Events, TFile, TFolder, getFrontMatterInfo, parseYaml, stringifyYaml, type App, type Plugin } from "obsidian";

interface Stored {
	file: TFile | TFolder;
	text?: string;
	binary?: ArrayBuffer;
}

export interface FakeVault {
	app: App;
	/** Zástupce pluginu pro `index.register`. */
	plugin: Plugin;
	/** Text souboru; chyba, když neexistuje. */
	text(path: string): string;
	/** Frontmatter poznámky jako objekt. */
	frontmatter(path: string): Record<string, unknown>;
	/** Všechny cesty souborů (bez složek), seřazené. */
	paths(): string[];
	/** Cesty přesunuté do koše. */
	trashed: string[];
	/** Zapíše soubor mimo plugin (jako by ho uživatel upravil ručně). */
	write(path: string, text: string): TFile;
	/** Posune hodiny trezoru (mtime nových souborů). */
	now: number;
}

function makeFile(path: string, mtime: number): TFile {
	const name = path.split("/").pop() ?? path;
	const dot = name.lastIndexOf(".");
	return Object.assign(new TFile(), {
		path,
		name,
		basename: dot > 0 ? name.slice(0, dot) : name,
		extension: dot > 0 ? name.slice(dot + 1) : "",
		stat: { mtime, ctime: mtime, size: 0 },
	});
}

function makeFolder(path: string): TFolder {
	return Object.assign(new TFolder(), { path, name: path.split("/").pop() ?? path });
}

export function createFakeVault(): FakeVault {
	const store = new Map<string, Stored>();
	const vaultEvents = new Events();
	const cacheEvents = new Events();
	const state = { now: Date.UTC(2026, 9, 3, 12, 0, 0) };
	const trashed: string[] = [];

	const stored = (file: { path: string }): Stored => {
		const entry = store.get(file.path);
		if (!entry) throw new Error(`Soubor „${file.path}“ neexistuje.`);
		return entry;
	};
	const parentExists = (path: string) => {
		const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
		return parent === "" || store.get(parent)?.file instanceof TFolder;
	};
	const changed = (file: TFile) => {
		file.stat.mtime = state.now;
		if (file.extension === "md") cacheEvents.trigger("changed", file);
	};
	const put = (path: string, text: string): TFile => {
		const existing = store.get(path);
		if (existing?.file instanceof TFile) {
			existing.text = text;
			changed(existing.file);
			return existing.file;
		}
		const file = makeFile(path, state.now);
		store.set(path, { file, text });
		changed(file);
		return file;
	};

	const vault = {
		getAbstractFileByPath: (path: string) => store.get(path)?.file ?? null,
		async createFolder(path: string) {
			if (store.has(path)) throw new Error("Folder already exists.");
			if (!parentExists(path)) throw new Error(`Nadřazená složka pro „${path}“ neexistuje.`);
			const folder = makeFolder(path);
			store.set(path, { file: folder });
			return folder;
		},
		async create(path: string, text: string) {
			if (store.has(path)) throw new Error("File already exists.");
			if (!parentExists(path)) throw new Error(`Složka pro „${path}“ neexistuje.`);
			return put(path, text);
		},
		async createBinary(path: string, data: ArrayBuffer) {
			if (store.has(path)) throw new Error("File already exists.");
			if (!parentExists(path)) throw new Error(`Složka pro „${path}“ neexistuje.`);
			const file = makeFile(path, state.now);
			store.set(path, { file, binary: data });
			return file;
		},
		read: async (file: TFile) => stored(file).text ?? "",
		async readBinary(file: TFile) {
			const entry = stored(file);
			if (entry.binary) return entry.binary;
			const bytes = new TextEncoder().encode(entry.text ?? "");
			return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
		},
		async process(file: TFile, fn: (text: string) => string) {
			const entry = stored(file);
			entry.text = fn(entry.text ?? "");
			changed(file);
			return entry.text;
		},
		getFiles: () => [...store.values()].flatMap((e) => (e.file instanceof TFile ? [e.file] : [])),
		getMarkdownFiles: () => [...store.values()].flatMap((e) => (e.file instanceof TFile && e.file.extension === "md" ? [e.file] : [])),
		async trash(file: TFile) {
			stored(file);
			store.delete(file.path);
			trashed.push(file.path);
			vaultEvents.trigger("delete", file);
		},
		on: vaultEvents.on.bind(vaultEvents),
		offref: vaultEvents.offref.bind(vaultEvents),
	};

	const frontmatterOf = (text: string): Record<string, unknown> | undefined => {
		const info = getFrontMatterInfo(text);
		if (!info.exists) return undefined;
		try {
			const data = parseYaml(info.frontmatter);
			return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : undefined;
		} catch {
			return undefined;
		}
	};

	const metadataCache = {
		getFileCache(file: TFile) {
			const frontmatter = frontmatterOf(store.get(file.path)?.text ?? "");
			return frontmatter ? { frontmatter } : {};
		},
		fileToLinktext: (file: TFile) => file.basename,
		on: cacheEvents.on.bind(cacheEvents),
		offref: cacheEvents.offref.bind(cacheEvents),
	};

	const fileManager = {
		async processFrontMatter(file: TFile, fn: (frontmatter: Record<string, unknown>) => void) {
			const entry = stored(file);
			const text = entry.text ?? "";
			const info = getFrontMatterInfo(text);
			const frontmatter = structuredClone(frontmatterOf(text) ?? {});
			fn(frontmatter);
			entry.text = `---\n${stringifyYaml(frontmatter)}---\n${text.slice(info.contentStart)}`;
			changed(file);
		},
		trashFile: (file: TFile) => vault.trash(file),
	};

	const workspace = { onLayoutReady: (callback: () => void) => callback() };

	return {
		app: { vault, metadataCache, fileManager, workspace } as unknown as App,
		plugin: { registerEvent() {} } as unknown as Plugin,
		text: (path) => {
			const entry = store.get(path);
			if (!entry || entry.text === undefined) throw new Error(`Soubor „${path}“ neexistuje.`);
			return entry.text;
		},
		frontmatter: (path) => frontmatterOf(store.get(path)?.text ?? "") ?? {},
		paths: () => vault.getFiles().map((f) => f.path).sort(),
		trashed,
		write(path, text) {
			// Nadřazené složky vzniknou samy – jako při ručním založení souboru v průzkumníku.
			const parts = path.split("/");
			for (let i = 1; i < parts.length; i++) {
				const folder = parts.slice(0, i).join("/");
				if (!store.has(folder)) store.set(folder, { file: makeFolder(folder) });
			}
			return put(path, text);
		},
		get now() {
			return state.now;
		},
		set now(value: number) {
			state.now = value;
		},
	};
}
