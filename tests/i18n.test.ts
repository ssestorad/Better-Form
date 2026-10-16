import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CONTEXT_SEPARATOR, getLanguage, inContext, initialLanguage, LANGUAGE_LABELS, LANGUAGES, setLanguage, t, tn, translated } from "../src/i18n";
import { LOCALES } from "../src/locales";
import type { Dictionary } from "../src/locales/types";
import { describeDays } from "../src/calc/programText";
import { parseDays } from "../src/calc/programFile";
import { WEEKDAYS } from "../src/model/constants";
import { formatCzechDate, formatNumber, formatShortDate } from "../src/ui/format";

const ROOT = join(__dirname, "..");
const CZECH = /[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/;
const STRING = /"((?:[^"\\\n]|\\.)*)"/g;

function files(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path) : /\.(ts|svelte)$/.test(name) ? [path] : [];
	});
}

const ALL = files(join(ROOT, "src")).filter((f) => !f.includes(join("src", "locales")));

const source = (file: string) =>
	readFileSync(file, "utf8")
		.replace(/<style[\s\S]*?<\/style>/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.split("\n")
		.filter((line) => !line.includes("i18n-ignore"))
		.map((line) => line.replace(/^\s*\/\/.*$/, "").replace(/\s\/\/ .*$/, ""))
		.join("\n");

const unquote = (literal: string) => JSON.parse(`"${literal}"`) as string;

/** Konec řetězce (uvozovky) začínajícího na i. */
function stringEnd(s: string, i: number): number {
	for (let j = i + 1; j < s.length; j++) {
		if (s[j] === "\\") j++;
		else if (s[j] === s[i]) return j;
	}
	return s.length;
}

/** Argumenty volání `name(…)` – každý jako text, rozdělené čárkami na nejvyšší úrovni. */
function callArgs(text: string, name: string): string[][] {
	const out: string[][] = [];
	for (const m of text.matchAll(new RegExp(`(?<![\\w.$])${name}\\(`, "g"))) {
		const args: string[] = [];
		let depth = 0;
		let start = m.index + m[0].length;
		for (let j = start; j < text.length; j++) {
			const c = text[j]!;
			if (c === '"' || c === "'" || c === "`") j = stringEnd(text, j);
			else if ("([{".includes(c)) depth++;
			else if (")]}".includes(c)) {
				if (depth === 0) {
					args.push(text.slice(start, j).trim());
					break;
				}
				depth--;
			} else if (c === "," && depth === 0) {
				args.push(text.slice(start, j).trim());
				start = j + 1;
			}
		}
		out.push(args);
	}
	return out;
}

const literal = (arg: string | undefined) => (arg && /^"(?:[^"\\]|\\.)*"$/.test(arg) ? unquote(arg.slice(1, -1)) : undefined);
const withContext = (text: string, context: string | undefined) => (context ? `${context}${CONTEXT_SEPARATOR}${text}` : text);

/** Vlastnosti v translated(…), které nejsou text (id, ikona, značka, jednotka). */
const NOT_TEXT = new Set(["id", "icon", "key", "symbol", "unit"]);

/** Klíče slovníku použité v souboru: t(), tn() (anglický tvar „other“), inContext() a texty tabulek v translated(). */
function usedKeys(text: string): { singular: string[]; plural: string[] } {
	const singular: string[] = [];
	const plural: string[] = [];
	for (const [first, , context] of callArgs(text, "t")) {
		const key = literal(first);
		if (key !== undefined) singular.push(withContext(key, literal(context)));
	}
	for (const [, forms, , context] of callArgs(text, "tn")) {
		const other = forms?.match(/^\[\s*"(?:[^"\\]|\\.)*"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]$/);
		if (other) plural.push(withContext(unquote(other[1]!), literal(context)));
	}
	for (const [context, key] of callArgs(text, "inContext")) {
		if (literal(context) && literal(key)) singular.push(withContext(literal(key)!, literal(context)));
	}
	for (const [table] of callArgs(text, "translated")) {
		for (const m of (table ?? "").matchAll(/(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
			if (!NOT_TEXT.has(m[1]!) && !/^\d/.test(m[2]!)) singular.push(unquote(m[2]!));
		}
	}
	return { singular, plural };
}

/** Šablona bez výrazů {…} (i vnořených). */
function withoutExpressions(markup: string): string {
	let out = "";
	let depth = 0;
	for (const ch of markup) {
		if (ch === "{") depth++;
		else if (ch === "}") depth = Math.max(0, depth - 1);
		else if (depth === 0) out += ch;
	}
	return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((p) => p !== "n").sort().join();

const singular = new Map<string, string>();
const plural = new Map<string, string>();
for (const file of ALL) {
	const used = usedKeys(source(file));
	const where = file.slice(ROOT.length + 1);
	for (const key of used.singular) singular.set(key, where);
	for (const key of used.plural) plural.set(key, where);
}
const literals = new Set(ALL.flatMap((file) => [...source(file).matchAll(STRING)].map((m) => unquote(m[1]!))));

describe("registr jazyků", () => {
	it("angličtina je zdroj, ostatní jazyky z registru; volba podle jazyka Obsidianu", () => {
		expect(LANGUAGES[0]).toBe("en");
		expect(LANGUAGES).toEqual(["en", ...Object.keys(LOCALES)]);
		for (const language of LANGUAGES) expect(LANGUAGE_LABELS[language]).toBeTruthy();
		expect(initialLanguage("cs")).toBe("cs");
		expect(initialLanguage("cs-CZ")).toBe("cs");
		expect(initialLanguage("de")).toBe("en");
		expect(initialLanguage(null)).toBe("en");
	});
});

describe.each(Object.entries(LOCALES) as [string, { ui: Dictionary }][])("překlad %s", (code, locale) => {
	it("každý text z kódu má překlad", () => {
		const missing = [
			...[...singular].filter(([key]) => typeof locale.ui[key] !== "string").map(([key, where]) => `${where}: ${key}`),
			...[...plural].filter(([key]) => typeof locale.ui[key] !== "object").map(([key, where]) => `${where}: [tn] ${key}`),
		];
		if (process.env.I18N_DUMP) require("node:fs").writeFileSync(process.env.I18N_DUMP.replace("{code}", code), JSON.stringify(missing, null, 1));
		expect(missing).toEqual([]);
	});

	it("slovník nemá nepoužité položky", () => {
		// Text předaný do t() proměnnou (konstanta, tabulka) stačí najít jako řetězec ve zdrojácích.
		const unused = Object.keys(locale.ui).filter((key) => {
			const text = key.slice(key.indexOf(CONTEXT_SEPARATOR) + 1);
			return !singular.has(key) && !plural.has(key) && !literals.has(text);
		});
		expect(unused).toEqual([]);
	});

	it("zástupné značky {…} v překladu odpovídají originálu; tvary podle čísla mají „other“", () => {
		const bad = Object.entries(locale.ui).flatMap(([key, value]) => {
			const forms = typeof value === "string" ? [value] : Object.values(value);
			if (typeof value === "object" && value.other === undefined) return [`${key}: chybí other`];
			return forms.filter((form) => placeholders(form) !== placeholders(key)).map((form) => `${key} → ${form}`);
		});
		expect(bad).toEqual([]);
	});
});

describe("zdrojový jazyk", () => {
	afterEach(() => setLanguage("cs"));

	it("v kódu mimo src/locales nezůstal český text", () => {
		const leftovers = ALL.flatMap((file) => {
			const text = source(file);
			const markup = file.endsWith(".svelte") ? withoutExpressions(text.replace(/<script[\s\S]*?<\/script>/g, "")).replace(/<[^>]*>/g, "\n").split("\n") : [];
			const strings = [...text.matchAll(STRING)].map((m) => m[1]!);
			// Citace s rokem vydání („Fernández 2022“) mají diakritiku ve jménech autorů – nejde o češtinu.
			return [...strings, ...markup].filter((s) => CZECH.test(s) && !/\b(19|20)\d{2}\b/.test(s)).map((s) => `${file.slice(ROOT.length + 1)}: ${s.trim().slice(0, 100)}`);
		});
		expect(leftovers).toEqual([]);
	});

	it("výpočty v obou jazycích: dny programu, čísla a data; import přečte anglické dny", () => {
		setLanguage("en");
		expect(describeDays([...WEEKDAYS])).toBe("every day");
		expect(describeDays(["mon", "fri"])).toBe("mon, fri");
		expect(parseDays(describeDays(["mon", "fri"]))).toEqual(["mon", "fri"]);
		expect(parseDays(describeDays([...WEEKDAYS]))).toEqual([...WEEKDAYS]);
		expect(formatNumber(78.45, 1)).toBe("78.5");
		expect(formatCzechDate("2026-09-30")).toBe("Wednesday 30 Sep 2026");
		expect(formatShortDate("2026-09-30")).toBe("Wed 30 Sep");
		setLanguage("cs");
		expect(formatNumber(78.45, 1)).toBe("78,5");
		expect(formatCzechDate("2026-09-30")).toBe("středa 30. 9. 2026");
		expect(formatCzechDate("2026-09-30", false)).toBe("30. 9. 2026");
		expect(formatShortDate("2026-09-30")).toBe("st 30. 9.");
	});

	it("t, tn, kontext a translated přepínají jazyk", () => {
		expect(getLanguage()).toBe("cs");
		const labels = translated({ a: "Save" });
		expect(t("Save")).toBe("Uložit");
		expect(labels.a).toBe("Uložit");
		expect(tn(1, ["{n} day", "{n} days"])).toBe("1 den");
		expect(tn(3, ["{n} day", "{n} days"])).toBe("3 dny");
		expect(tn(5, ["{n} day", "{n} days"])).toBe("5 dní");
		expect(tn(1.5, ["{n} day", "{n} days"])).toBe("1.5 dní");
		// Věty s číslem mají tvar podle čísla v obou jazycích (dřív „2 týdnů“, „1 days“).
		expect(tn(1, ["{n} day ago", "{n} days ago"])).toBe("Před 1 dnem");
		expect(tn(3, ["{n} day ago", "{n} days ago"])).toBe("Před 3 dny");
		expect([1, 3, 6].map((n) => tn(n, [" · {n} week", " · {n} weeks"]))).toEqual([" · 1 týden", " · 3 týdny", " · 6 týdnů"]);
		expect(tn(2, ["Last {n} day", "Last {n} days"])).toBe("Poslední 2 dny");
		// Stejný anglický text, jiný český tvar podle kontextu.
		expect(t("high")).toBe("vysoká");
		expect(t("high", undefined, "stress")).toBe("velký");
		expect(t(inContext("stress", "high"))).toBe("velký");
		setLanguage("en");
		expect(t("Save")).toBe("Save");
		expect(labels.a).toBe("Save");
		expect(t(inContext("stress", "high"))).toBe("high");
		expect(tn(1, ["{n} day", "{n} days"])).toBe("1 day");
		expect(tn(3, ["{n} day", "{n} days"])).toBe("3 days");
		// Neznámý text zůstane anglicky; značky se doplní v obou jazycích.
		setLanguage("cs");
		expect(t("Unknown text {x}", { x: 5 })).toBe("Unknown text 5");
	});
});
