// Cesty k poznámkám ve vaultu (SPEC kap. 3). Bez závislosti na Obsidianu.

import type { FolderSettings, SubfolderKey } from "../settings/settings";
import { t } from "../i18n";

/** Sjednotí oddělovače na "/", odstraní prázdné části a okrajová lomítka. */
export function normalizeVaultPath(path: string): string {
	return path
		.replace(/\\/g, "/")
		.split("/")
		.map((part) => part.trim())
		.filter((part) => part !== "" && part !== ".")
		.join("/");
}

/** „2026-10-03 14-05“ – datum a čas do názvu souboru (bez dvojtečky kvůli Windows). */
export function fileStamp(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

export function joinPath(...parts: string[]): string {
	return normalizeVaultPath(parts.join("/"));
}

/** Cesta k podsložce včetně kořene, např. "Forma/Knihovna/Cviky". */
export function folderPath(folders: FolderSettings, key: SubfolderKey): string {
	return joinPath(folders.root, folders[key]);
}

/** Všechny složky, které má plugin vytvořit, včetně nadřazených, v pořadí od kořene. */
export function allFolderPaths(folders: FolderSettings): string[] {
	const result = new Set<string>();
	const root = normalizeVaultPath(folders.root);
	if (root) result.add(root);
	for (const key of Object.keys(folders) as (keyof FolderSettings)[]) {
		if (key === "root") continue;
		const parts = folderPath(folders, key).split("/");
		for (let i = 1; i <= parts.length; i++) {
			const path = parts.slice(0, i).join("/");
			if (path) result.add(path);
		}
	}
	return [...result].sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
}

const FORBIDDEN_CHARS = /[\\/:*?"<>|#^[\]\u0000-\u001f]/g;
const MAX_NAME_LENGTH = 120;

/** Bezpečný název souboru pro Windows, Android i odkazy Obsidianu. */
export function sanitizeFileName(name: string): string {
	const cleaned = name
		.replace(FORBIDDEN_CHARS, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, MAX_NAME_LENGTH)
		.replace(/[.\s]+$/, "")
		.replace(/^\.+/, "");
	return cleaned || t("Bez názvu");
}

/** Denní poznámka: <root>/Deník/2026/2026-09-28.md */
export function dayNotePath(folders: FolderSettings, date: string): string {
	return joinPath(folderPath(folders, "days"), date.slice(0, 4), `${date}.md`);
}

/** Trénink: <root>/Tréninky/2026/2026-09-28 Posilovna – Push.md */
export function workoutNotePath(folders: FolderSettings, date: string, label: string): string {
	return joinPath(
		folderPath(folders, "workouts"),
		date.slice(0, 4),
		`${sanitizeFileName(`${date} ${label}`)}.md`,
	);
}

/** Plán týdne: <root>/Plán/2026/Týden 2026-10-05.md (`week` = pondělí týdne). */
export function planNotePath(folders: FolderSettings, week: string): string {
	// Poznámka se hledá podle frontmatteru (`week`), název souboru je jen popisek v jazyce rozhraní.
	return joinPath(folderPath(folders, "plans"), week.slice(0, 4), t("Týden {week}.md", { week }));
}

/** Poznámka v knihovně / jiné podsložce pojmenovaná podle názvu, např. cvik. */
export function namedNotePath(folders: FolderSettings, key: SubfolderKey, name: string): string {
	return joinPath(folderPath(folders, key), `${sanitizeFileName(name)}.md`);
}

/** Pokud cesta existuje, přidá číslo: "X.md" → "X (2).md" → "X (3).md" … */
export function uniquePath(path: string, exists: (path: string) => boolean): string {
	if (!exists(path)) return path;
	const dot = path.lastIndexOf(".");
	const base = dot > path.lastIndexOf("/") ? path.slice(0, dot) : path;
	const ext = dot > path.lastIndexOf("/") ? path.slice(dot) : "";
	for (let i = 2; ; i++) {
		const candidate = `${base} (${i})${ext}`;
		if (!exists(candidate)) return candidate;
	}
}
