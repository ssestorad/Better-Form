// Zápis do vaultu. Jen přes app.vault a app.fileManager (CLAUDE.md).

import { normalizePath, stringifyYaml, TFile, TFolder, type App } from "obsidian";
import { replaceGeneratedBlock } from "./generatedBlock";
import { uniquePath } from "./paths";
import { t } from "../i18n";

export class NoteWriter {
	constructor(private readonly app: App) {}

	/** Vytvoří složku včetně nadřazených; existující nechá být. */
	async ensureFolder(path: string): Promise<boolean> {
		const normalized = normalizePath(path);
		if (!normalized || normalized === "/") return false;
		let created = false;
		const parts = normalized.split("/");
		for (let i = 1; i <= parts.length; i++) {
			const current = parts.slice(0, i).join("/");
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (existing instanceof TFolder) continue;
			if (existing) throw new Error(t("“{current}” is a file, not a folder.", { current }));
			try {
				await this.app.vault.createFolder(current);
				created = true;
			} catch (err) {
				// Složku mohl mezitím vytvořit jiný zápis.
				if (!(this.app.vault.getAbstractFileByPath(current) instanceof TFolder)) throw err;
			}
		}
		return created;
	}

	/** Založí novou poznámku; pokud cesta existuje, přidá k názvu číslo. Nikdy nepřepíše existující soubor. */
	async createNote(path: string, frontmatter: Record<string, unknown>, body = ""): Promise<TFile> {
		const normalized = normalizePath(path);
		const parent = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : "";
		if (parent) await this.ensureFolder(parent);
		const target = uniquePath(normalized, (p) => this.app.vault.getAbstractFileByPath(p) !== null);
		return this.app.vault.create(target, buildNoteContent(frontmatter, body));
	}

	/** Uloží přílohu (např. fotku etikety); existující soubor nepřepíše, přidá k názvu číslo. */
	async createAttachment(path: string, data: ArrayBuffer): Promise<TFile> {
		const normalized = normalizePath(path);
		const parent = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : "";
		if (parent) await this.ensureFolder(parent);
		return this.app.vault.createBinary(uniquePath(normalized, (p) => this.app.vault.getAbstractFileByPath(p) !== null), data);
	}

	/** Založí poznámku jen tehdy, když na dané cestě nic není; jinak vrátí null. */
	async createNoteIfMissing(
		path: string,
		frontmatter: Record<string, unknown>,
		body = "",
	): Promise<TFile | null> {
		const normalized = normalizePath(path);
		if (this.app.vault.getAbstractFileByPath(normalized)) return null;
		return this.createNote(normalized, frontmatter, body);
	}

	/** Úprava frontmatteru; tělo poznámky zůstane beze změny. */
	async updateFrontmatter(file: TFile, mutate: (frontmatter: Record<string, unknown>) => void): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, mutate);
	}

	/** Přepíše jen generovaný blok mezi značkami forma:start/end. */
	async setGeneratedBlock(file: TFile, content: string): Promise<void> {
		// Beze změny se nezapisuje (hromadné obnovení bloků nesahá na poznámky, které už sedí).
		const current = await this.app.vault.read(file);
		const preview = replaceGeneratedBlock(current, content);
		if (preview.status !== "malformed" && preview.text === current) return;
		await this.app.vault.process(file, (text) => {
			const result = replaceGeneratedBlock(text, content);
			if (result.status === "malformed") {
				throw new Error(
					t("The forma:start / forma:end markers in the note “{path}” are damaged – fix them manually.", { path: file.path }),
				);
			}
			return result.text;
		});
	}
}

export function buildNoteContent(frontmatter: Record<string, unknown>, body: string): string {
	const yaml = stringifyYaml(frontmatter);
	const trimmedBody = body.trim();
	return `---\n${yaml.endsWith("\n") ? yaml : `${yaml}\n`}---\n${trimmedBody ? `\n${trimmedBody}\n` : ""}`;
}
