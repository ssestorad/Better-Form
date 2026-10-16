import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EN } from "../src/i18n/en";
import { getLanguage, setLanguage, t, tn, translated } from "../src/i18n";
import { describeDays } from "../src/calc/programText";
import { parseDays } from "../src/calc/programFile";
import { WEEKDAYS } from "../src/model/constants";
import { formatCzechDate, formatNumber } from "../src/ui/format";

const ROOT = join(__dirname, "..");
const CZECH = /[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/;
const STRING = /"((?:[^"\\\n]|\\.)*)"/g;

function files(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path) : /\.(ts|svelte)$/.test(name) ? [path] : [];
	});
}

const ALL = files(join(ROOT, "src")).filter((f) => !f.includes(`${join("src", "i18n")}`));
/** Části přeložené celé (fáze 1 a 2): každý český text v nich musí mít anglický překlad. Obsah knihovny (src/seed, zdroje) přijde ve fázi 3. */
const TRANSLATED_SCOPE = [
	join("src", "ui"),
	join("src", "settings"),
	join("src", "strava"),
	join("src", "main.ts"),
	join("src", "calc"),
	join("src", "rules"),
	join("src", "data"),
	join("src", "model"),
	join("src", "evidence", "sourceTypes.ts"),
	join("src", "evidence", "sources.ts"),
];
const inScope = (file: string) => TRANSLATED_SCOPE.some((part) => file.includes(part));

const source = (file: string) =>
	readFileSync(file, "utf8")
		.replace(/<style[\s\S]*?<\/style>/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.split("\n")
		.filter((line) => !line.includes("i18n-ignore"))
		.map((line) => line.replace(/^\s*\/\/.*$/, "").replace(/\s\/\/ .*$/, ""))
		.join("\n");

const unquote = (literal: string) => JSON.parse(`"${literal}"`) as string;

/** Klíče volané přes t("…") a tn(n, ["…", "…", "…"]). */
function calls(text: string): { singular: string[]; plural: string[] } {
	const singular = [...text.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => unquote(m[1]!));
	const plural = [...text.matchAll(/\btn\([^[]*\[\s*"(?:[^"\\]|\\.)*",\s*"(?:[^"\\]|\\.)*",\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => unquote(m[1]!));
	return { singular, plural };
}

/** Vlastnosti v translated(…), které nejsou text (id, ikona, značka, jednotka). */
const NOT_TEXT = new Set(["id", "icon", "key", "symbol", "unit"]);

/** Textové hodnoty tabulek obalených translated(…), i v polích a vnořených tabulkách; čísla („5 km“) se nepřekládají. */
function mapValues(text: string): string[] {
	return blocks(text, "translated(").flatMap((block) =>
		[...block.matchAll(/(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"/g)].filter((m) => !NOT_TEXT.has(m[1]!) && !/^\d/.test(m[2]!)).map((m) => unquote(m[2]!)),
	);
}

/** Obsah volání `start…)` se správně spárovanými závorkami. */
function blocks(text: string, start: string): string[] {
	const out: string[] = [];
	for (let at = text.indexOf(start); at >= 0; at = text.indexOf(start, at + 1)) {
		let depth = 0;
		let end = at + start.length - 1;
		for (; end < text.length; end++) {
			if (text[end] === "(") depth++;
			else if (text[end] === ")" && --depth === 0) break;
		}
		out.push(text.slice(at, end));
	}
	return out;
}

/** Všechny řetězce uvnitř translated(…), i polí a vnořených tabulek – slovník je smí používat. */
function tableLiterals(text: string): string[] {
	return blocks(text, "translated(").flatMap((block) => [...block.matchAll(STRING)].map((m) => unquote(m[1]!)));
}

/** České texty v souborech přeložené části, které nejsou klíčem t()/tn() – musí být ve slovníku (překládají se při použití). */
function looseCzech(text: string): string[] {
	const stripped = text.replace(/\btn\([^[]*\[[^\]]*\]/g, "").replace(/\bt\(\s*"(?:[^"\\]|\\.)*"/g, "");
	return [...stripped.matchAll(STRING)].map((m) => unquote(m[1]!)).filter((s) => CZECH.test(s));
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

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("překlad do angličtiny", () => {
	afterEach(() => setLanguage("cs"));

	const keys = new Set<string>();
	const pluralKeys = new Set<string>();
	const missing: string[] = [];
	for (const file of ALL) {
		const text = source(file);
		const { singular, plural } = calls(text);
		const loose = inScope(file) ? looseCzech(text) : [];
		for (const key of tableLiterals(text)) keys.add(key);
		for (const key of [...singular, ...mapValues(text), ...loose]) {
			keys.add(key);
			if (typeof EN[key] !== "string") missing.push(`${file.slice(ROOT.length + 1)}: ${key}`);
		}
		for (const key of plural) {
			pluralKeys.add(key);
			if (!Array.isArray(EN[key])) missing.push(`${file.slice(ROOT.length + 1)}: [tn] ${key}`);
		}
	}

	it("každý text má anglický překlad", () => {
		if (process.env.I18N_DUMP) require("node:fs").writeFileSync(process.env.I18N_DUMP, JSON.stringify({ missing, leftovers: null }, null, 1));
		expect(missing).toEqual([]);
	});

	it("v přeložené části nezůstal český text mimo t()", () => {
		const leftovers = ALL.filter(inScope).flatMap((file) => {
			if (!file.endsWith(".svelte")) return [];
			// Text v šabloně Svelte (mimo <script>) bez t(): jakákoli česká písmena mezi tagy.
			const markup = source(file).replace(/<script[\s\S]*?<\/script>/g, "");
			const text = withoutExpressions(markup).replace(/<[^>]*>/g, "\n");
			return text
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => CZECH.test(line))
				.map((line) => `${file.slice(ROOT.length + 1)}: ${line}`);
		});
		expect(leftovers).toEqual([]);
	});

	it("slovník nemá nepoužité položky", () => {
		// Text předaný do t() proměnnou (konstanta, tabulka) stačí najít jako řetězec ve zdrojácích.
		const literals = new Set(ALL.flatMap((file) => [...source(file).matchAll(STRING)].map((m) => unquote(m[1]!))));
		const unused = Object.keys(EN).filter((key) => !keys.has(key) && !pluralKeys.has(key) && !literals.has(key));
		expect(unused).toEqual([]);
	});

	it("zástupné značky {…} v překladu odpovídají originálu", () => {
		const bad = Object.entries(EN).flatMap(([key, value]) => {
			const forms = typeof value === "string" ? [value] : [...value];
			return forms.filter((form) => {
				const need = placeholders(key).filter((p) => p !== "n");
				const have = placeholders(form).filter((p) => p !== "n");
				return need.join() !== have.join();
			}).map((form) => `${key} → ${form}`);
		});
		expect(bad).toEqual([]);
	});

	it("výpočty v angličtině: dny programu, čísla a data; import přečte anglické dny", () => {
		setLanguage("en");
		expect(describeDays([...WEEKDAYS])).toBe("every day");
		expect(describeDays(["mon", "fri"])).toBe("mon, fri");
		expect(parseDays(describeDays(["mon", "fri"]))).toEqual(["mon", "fri"]);
		expect(parseDays(describeDays([...WEEKDAYS]))).toEqual([...WEEKDAYS]);
		expect(formatNumber(78.45, 1)).toBe("78.5");
		expect(formatCzechDate("2026-09-30")).toBe("Wednesday 30 Sep 2026");
		setLanguage("cs");
		expect(formatNumber(78.45, 1)).toBe("78,5");
		expect(formatCzechDate("2026-09-30")).toBe("středa 30. 9. 2026");
	});

	it("t, tn a translated přepínají jazyk", () => {
		expect(getLanguage()).toBe("cs");
		const labels = translated({ a: "Uložit" });
		expect(t("Uložit")).toBe("Uložit");
		expect(tn(3, ["{n} den", "{n} dny", "{n} dní"])).toBe("3 dny");
		expect(tn(5, ["{n} den", "{n} dny", "{n} dní"])).toBe("5 dní");
		expect(tn(1.5, ["{n} den", "{n} dny", "{n} dní"])).toBe("1.5 dní");
		setLanguage("en");
		expect(t("Uložit")).toBe(EN["Uložit"]);
		expect(labels.a).toBe(EN["Uložit"]);
		expect(tn(1, ["{n} den", "{n} dny", "{n} dní"])).toBe("1 day");
		expect(tn(3, ["{n} den", "{n} dny", "{n} dní"])).toBe("3 days");
		// Neznámý text zůstane česky; značky se doplní v obou jazycích.
		expect(t("Neznámý text {x}", { x: 5 })).toBe("Neznámý text 5");
	});
});
