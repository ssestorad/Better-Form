// Program ze souboru (SPEC 5.7): přečte JSON, YAML, poznámku programu s frontmatterem
// nebo obyčejný seznam v Markdownu a vrátí surový objekt programu pro `parseProgram`.
// Bez závislosti na Obsidianu – čtení YAML se předává jako funkce.

import { WEEKDAYS, type Weekday } from "../model/constants";
import type { ProgramTarget } from "../model/types";
import { t } from "../i18n";

export type ProgramFileFormat = "json" | "note" | "yaml" | "list";

export interface ProgramFileResult {
	/** Surový objekt programu (klíče jako ve frontmatteru, SPEC 4.5). */
	raw: Record<string, unknown>;
	/** Text pod frontmatter nové poznámky (popis programu). */
	body: string;
	format: ProgramFileFormat;
	/** Řádky seznamu, kterým se nepodařilo porozumět. */
	skipped: string[];
	/** Dny nebyly v souboru uvedené – použily se výchozí. */
	defaultDays: boolean;
}

export const PROGRAM_FILE_EXTENSIONS = [".md", ".markdown", ".txt", ".json", ".yaml", ".yml"] as const;

/** Výchozí dny, když je soubor neuvádí. */
export const DEFAULT_PROGRAM_DAYS: Weekday[] = ["mon", "wed", "fri"];

const fold = (text: string) =>
	text
		.toLocaleLowerCase("cs")
		.normalize("NFD")
		.replace(/\p{M}/gu, "");

const DAY_WORDS: Record<string, Weekday> = {
	po: "mon", pon: "mon", pondeli: "mon", mon: "mon", monday: "mon",
	ut: "tue", ute: "tue", utery: "tue", tue: "tue", tuesday: "tue",
	st: "wed", str: "wed", streda: "wed", wed: "wed", wednesday: "wed",
	ct: "thu", ctv: "thu", ctvrtek: "thu", thu: "thu", thursday: "thu",
	pa: "fri", pat: "fri", patek: "fri", fri: "fri", friday: "fri",
	so: "sat", sob: "sat", sobota: "sat", sat: "sat", saturday: "sat",
	ne: "sun", ned: "sun", nedele: "sun", sun: "sun", sunday: "sun",
};

/** Dny v textu („po, st a pá“, „Pondělí + čtvrtek“, „denně“); v pořadí týdne, bez duplicit. */
export function parseDays(text: string): Weekday[] {
	const folded = fold(text);
	if (/\b(denne|kazdy den|daily|every day)\b/.test(folded)) return [...WEEKDAYS];
	const found = new Set<Weekday>();
	for (const word of folded.split(/[^a-z]+/)) {
		const day = DAY_WORDS[word];
		if (day) found.add(day);
	}
	return WEEKDAYS.filter((d) => found.has(d));
}

const num = (text: string) => Number(text.replace(",", "."));

/**
 * Cíl položky zapsaný slovy: „3×10“, „3×30 s“, „2 min“, „5 km“, „800 m“, „100 denně“,
 * „3× max“, „3×60 %“, „EMOM 10 min × 5“, „žebřík 1-2-3-4-5“. Nerozpoznaný text = null.
 */
export function parseTargetText(text: string): ProgramTarget | null {
	const x = fold(text).replace(/×/g, "x").replace(/\s+/g, " ").trim();
	let m: RegExpMatchArray | null;

	if ((m = x.match(/^emom\D*(\d+)\s*(?:min\w*)?\s*[x,;:]?\s*(\d+)/))) {
		return { kind: "emom", minutes: Number(m[1]), reps: Number(m[2]) };
	}
	if ((m = x.match(/^(?:zebrik|ladder|pyramida)\s*:?\s*([\d\s,\-–]+)/))) {
		const steps = (m[1] ?? "").split(/[^\d]+/).filter((s) => s !== "").map(Number).filter((n) => n > 0);
		return steps.length > 0 ? { kind: "ladder", steps, rounds: 1 } : null;
	}
	if ((m = x.match(/^(\d+)\s*x\s*max/))) return { kind: "max_sets", sets: Number(m[1]) };
	if ((m = x.match(/^(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*%/))) {
		const pct = num(m[2]!);
		return pct > 0 && pct <= 100 ? { kind: "pct_of_max", sets: Number(m[1]), pct_of_max: pct } : null;
	}
	if ((m = x.match(/^(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(s|sec|sek|min)\b/))) {
		return { kind: "time", sets: Number(m[1]), time_s: num(m[2]!) * (m[3] === "min" ? 60 : 1) };
	}
	if ((m = x.match(/^(\d+)\s*x\s*(\d+)/))) return { kind: "sets_reps", sets: Number(m[1]), reps: Number(m[2]) };
	if ((m = x.match(/^(\d+)\s*(?:x\s*)?(?:denne|za den|\/ ?den|daily)/))) return { kind: "daily_total", daily_total: Number(m[1]) };
	if ((m = x.match(/^(\d+(?:[.,]\d+)?)\s*(km|m)\b/))) return { kind: "distance", distance_km: num(m[1]!) / (m[2] === "m" ? 1000 : 1) };
	if ((m = x.match(/^(\d+(?:[.,]\d+)?)\s*(s|sec|sek|min|h|hod)\b/))) {
		const unit = m[2] === "min" ? 60 : m[2] === "h" || m[2] === "hod" ? 3600 : 1;
		return { kind: "time", time_s: num(m[1]!) * unit };
	}
	return null;
}

interface ListItem {
	exercise: string;
	target: ProgramTarget;
	days?: Weekday[];
}

const BULLET = /^\s*(?:[-*+•]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/;
/** Začátek cíle uvnitř řádku: číslo, EMOM, žebřík. */
const TARGET_START = /(?:^|[\s:–—-])(emom\b|žebřík|zebrik|ladder|pyramida|\d)/i;

/** Jeden řádek seznamu: „Kliky: 3×10 (po, čt)“, „Běh 5 km“, „100 kliků denně“. */
export function parseItemLine(line: string): ListItem | null {
	let text = line.replace(BULLET, "").trim();
	if (text === "") return null;
	// Dny v závorce na konci.
	let days: Weekday[] | undefined;
	const paren = text.match(/\(([^()]*)\)\s*$/);
	if (paren) {
		const parsed = parseDays(paren[1] ?? "");
		if (parsed.length > 0) {
			days = parsed;
			text = text.slice(0, paren.index).trim();
		}
	}
	const clean = (name: string) =>
		name
			.replace(/\[\[([^\]|#]*)(?:[|#][^\]]*)?\]\]/g, "$1")
			.replace(/[*_`]/g, "")
			.replace(/[\s:–—-]+$/, "")
			.trim();

	// „100 kliků denně“ – číslo na začátku, cvik uprostřed.
	const daily = text.match(/^(\d+)\s+(.+?)\s+(denně|denne|za den)\s*$/i);
	if (daily) {
		const exercise = clean(daily[2] ?? "");
		if (exercise) return { exercise: exercise.charAt(0).toLocaleUpperCase("cs") + exercise.slice(1), target: { kind: "daily_total", daily_total: Number(daily[1]) }, days };
	}
	// „Cvik: cíl“ nebo „Cvik – cíl“: dělí se u posledního oddělovače, za kterým je platný cíl
	// (název cviku tak může obsahovat číslo, např. „Swing 2 ruce: 10×10“).
	for (const separator of [/:(?!.*:)/, /\s[–—-]\s(?!.*\s[–—-]\s)/]) {
		const at = text.search(separator);
		if (at <= 0) continue;
		const rest = text.slice(at).replace(/^[\s:–—-]+/, "");
		const target = parseTargetText(rest);
		const exercise = clean(text.slice(0, at));
		if (target && exercise) return { exercise, target, days };
	}
	const start = text.search(TARGET_START);
	if (start < 0) return null;
	// search vrací pozici oddělovače před cílem (nebo 0, když řádek cílem začíná).
	const splitAt = /^[\s:–—-]/.test(text.slice(start)) ? start + 1 : start;
	const exercise = clean(text.slice(0, splitAt));
	const target = parseTargetText(text.slice(splitAt).replace(/^[\s:–—-]+/, ""));
	if (!exercise || !target) return null;
	return { exercise, target, days };
}

/** Obyčejný seznam v Markdownu → surový program. */
function fromList(text: string, fallbackName: string): Pick<ProgramFileResult, "raw" | "skipped" | "defaultDays"> {
	let name: string | undefined;
	let programDays: Weekday[] | undefined;
	let weeks: number | undefined;
	let sectionDays: Weekday[] | undefined;
	const items: ListItem[] = [];
	const skipped: string[] = [];

	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed === "") continue;
		const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
		if (heading) {
			const title = (heading[2] ?? "").trim();
			const days = parseDays(title);
			// Nadpis se dny („## Pondělí a čtvrtek“) platí pro položky pod ním; první jiný nadpis je název.
			if (days.length > 0) sectionDays = days;
			else {
				sectionDays = undefined;
				name ??= title;
			}
			continue;
		}
		const meta = trimmed.match(/^([\p{L} ]+):\s*(.+)$/u);
		if (meta && !BULLET.test(line)) {
			const key = fold(meta[1] ?? "").trim();
			const value = meta[2] ?? "";
			if (/^(dny|days|kdy)$/.test(key)) {
				const days = parseDays(value);
				if (days.length > 0) programDays = days;
				continue;
			}
			if (/^(tydnu|tydny|delka|weeks|trvani)$/.test(key)) {
				const n = Number(value.match(/\d+/)?.[0]);
				if (n > 0) weeks = n;
				continue;
			}
			if (/^(nazev|name|program)$/.test(key)) {
				name = value.trim();
				continue;
			}
		}
		// Položky jsou jen odrážky a číslované řádky – běžný text (popis) se přeskočí,
		// aby se věta s číslem nestala cvikem.
		if (!BULLET.test(line)) continue;
		const item = parseItemLine(line);
		if (item) items.push({ ...item, days: item.days ?? sectionDays });
		else skipped.push(trimmed);
	}

	// Dny programu: řádek „Dny:“, jinak sjednocení dnů z nadpisů a položek, jinak výchozí.
	const used = new Set(items.flatMap((i) => i.days ?? []));
	let days = programDays;
	let defaultDays = false;
	if (!days && used.size > 0) days = WEEKDAYS.filter((d) => used.has(d));
	if (!days) {
		days = [...DEFAULT_PROGRAM_DAYS];
		defaultDays = true;
	}
	const sameDays = (a: Weekday[] | undefined) => a !== undefined && a.length === days.length && a.every((d) => days.includes(d));

	return {
		raw: {
			forma: "program",
			name: name ?? fallbackName,
			builtin: false,
			evidence: "practice",
			sources: ["practice"],
			...(weeks !== undefined ? { duration_weeks: weeks } : {}),
			days,
			items: items.map((i) => ({ exercise: i.exercise, target: i.target, ...(i.days && !sameDays(i.days) ? { days: i.days.filter((d) => days.includes(d)) } : {}) })),
			progression: { rule: "none" },
			active: false,
		},
		skipped,
		defaultDays,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Název souboru bez přípony a cesty. */
export function baseName(fileName: string): string {
	const file = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
	return file.replace(/\.[^.]+$/, "").trim();
}

/**
 * Přečte text souboru. Pořadí: JSON → poznámka s frontmatterem → YAML → seznam v Markdownu.
 * Vyhodí chybu se srozumitelným textem, když soubor nejde přečíst.
 */
export function readProgramFile(text: string, fileName: string, parseYaml: (text: string) => unknown): ProgramFileResult {
	const content = text.replace(/^﻿/, "");
	const trimmed = content.trim();
	const fallbackName = baseName(fileName) || t("Importovaný program");
	const ext = (fileName.match(/\.[^.]+$/)?.[0] ?? "").toLowerCase();
	if (trimmed === "") throw new Error(t("Soubor je prázdný."));

	const withDefaults = (raw: Record<string, unknown>): Record<string, unknown> => ({
		...raw,
		forma: "program",
		name: typeof raw.name === "string" && raw.name.trim() !== "" ? raw.name : fallbackName,
	});

	if (ext === ".json" || trimmed.startsWith("{")) {
		let data: unknown;
		try {
			data = JSON.parse(trimmed);
		} catch {
			throw new Error(t("Soubor není platný JSON."));
		}
		// Program může být přímo objekt, nebo zabalený v klíči `program`.
		const raw = isRecord(data) && isRecord(data.program) ? data.program : data;
		if (!isRecord(raw)) throw new Error(t("JSON musí obsahovat objekt programu (name, days, items)."));
		const body = typeof raw.description === "string" ? raw.description : typeof raw.popis === "string" ? raw.popis : "";
		return { raw: withDefaults(raw), body: body.trim(), format: "json", skipped: [], defaultDays: false };
	}

	const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
	if (fm) {
		let data: unknown;
		try {
			data = parseYaml(fm[1] ?? "");
		} catch {
			throw new Error(t("Úvodní blok mezi řádky --- se nepodařilo přečíst."));
		}
		const body = content.slice(fm[0].length).trim();
		if (isRecord(data) && Array.isArray(data.items)) return { raw: withDefaults(data), body, format: "note", skipped: [], defaultDays: false };
		// Frontmatter bez položek: položky se hledají v textu pod ním.
		const list = fromList(body, isRecord(data) && typeof data.name === "string" ? data.name : fallbackName);
		return { ...list, body, format: "list" };
	}

	if (ext === ".yaml" || ext === ".yml") {
		let data: unknown;
		try {
			data = parseYaml(trimmed);
		} catch {
			throw new Error(t("Soubor není platný YAML."));
		}
		if (!isRecord(data)) throw new Error(t("YAML musí obsahovat objekt programu (name, days, items)."));
		return { raw: withDefaults(data), body: typeof data.description === "string" ? data.description.trim() : "", format: "yaml", skipped: [], defaultDays: false };
	}

	return { ...fromList(content, fallbackName), body: trimmed, format: "list" };
}

export interface ImportSummary {
	name: string;
	items: number;
	dropped: number;
	skipped: string[];
	unknownExercises: string[];
	defaultDays: boolean;
}

/** Hláška po importu: co vzniklo a co je potřeba zkontrolovat. */
export function describeImport(report: ImportSummary): string {
	const parts = [t("Program „{report_name}“ vytvořen (položek: {items}). Je v knihovně na kartě Programy, zatím neaktivní.", { report_name: report.name, items: report.items })];
	if (report.defaultDays) parts.push(t("Dny v souboru chyběly – nastaveno po, st, pá."));
	if (report.dropped > 0) parts.push(t("Nenačtených položek: {dropped} (chybí cvik nebo cíl).", { dropped: report.dropped }));
	if (report.skipped.length > 0) {
		const shown = report.skipped.slice(0, 3).join("; ");
		parts.push(t("Nepřečtené řádky ({skipped_length}): {shown}{v}", { skipped_length: report.skipped.length, shown, v: report.skipped.length > 3 ? "…" : "" }));
	}
	if (report.unknownExercises.length > 0) {
		parts.push(t("Cviky mimo knihovnu: {v} – přidej je do knihovny, ať se počítají do partií.", { v: report.unknownExercises.join(", ") }));
	}
	return parts.join("\n");
}

/** Ukázka souboru se seznamem – do nápovědy v nastavení. */
export const PROGRAM_FILE_EXAMPLE = "# Síla 3× týdně\nTýdnů: 8\n\n## Pondělí a pátek\n- Dřep s činkou: 5×5\n- Bench press: 4×8\n- Plank: 3×45 s\n\n## Středa\n- Shyby: 3× max\n- Kliky: 3×60 %\n- Běh: 5 km";
