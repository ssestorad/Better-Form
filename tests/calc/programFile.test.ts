import { t } from "../../src/i18n";
import { describe, expect, it } from "vitest";
import { PROGRAM_FILE_EXAMPLE, baseName, describeImport, parseDays, parseItemLine, parseTargetText, readProgramFile } from "../../src/calc/programFile";
import { validateProgram } from "../../src/calc/programEdit";
import { parseProgram } from "../../src/model/parse";

/** Náhrada parseYaml z Obsidianu – v testech stačí JSON (je to platný YAML). */
const yaml = (text: string) => JSON.parse(text) as unknown;

describe("dny v textu", () => {
	it("zkratky, celé názvy, angličtina, denně", () => {
		expect(parseDays("po, st a pá")).toEqual(["mon", "wed", "fri"]);
		expect(parseDays("Pondělí + Čtvrtek")).toEqual(["mon", "thu"]);
		expect(parseDays("Sat, Sunday")).toEqual(["sat", "sun"]);
		expect(parseDays("denně")).toHaveLength(7);
		expect(parseDays("Poznámky k programu")).toEqual([]);
	});
});

describe("cíl položky slovy", () => {
	it("série a opakování, čas, vzdálenost, denní součet", () => {
		expect(parseTargetText("3×10")).toEqual({ kind: "sets_reps", sets: 3, reps: 10 });
		expect(parseTargetText("4 x 8 opakování")).toEqual({ kind: "sets_reps", sets: 4, reps: 8 });
		expect(parseTargetText("3×45 s")).toEqual({ kind: "time", sets: 3, time_s: 45 });
		expect(parseTargetText("3x1,5 min")).toEqual({ kind: "time", sets: 3, time_s: 90 });
		expect(parseTargetText("20 min")).toEqual({ kind: "time", time_s: 1200 });
		expect(parseTargetText("5 km")).toEqual({ kind: "distance", distance_km: 5 });
		expect(parseTargetText("800 m")).toEqual({ kind: "distance", distance_km: 0.8 });
		expect(parseTargetText("100 denně")).toEqual({ kind: "daily_total", daily_total: 100 });
	});

	it("maximum, procenta, EMOM, žebřík", () => {
		expect(parseTargetText("3× max")).toEqual({ kind: "max_sets", sets: 3 });
		expect(parseTargetText("3×60 % maxima")).toEqual({ kind: "pct_of_max", sets: 3, pct_of_max: 60 });
		expect(parseTargetText("EMOM 10 min × 5")).toEqual({ kind: "emom", minutes: 10, reps: 5 });
		expect(parseTargetText("žebřík 1-2-3-4-5")).toEqual({ kind: "ladder", steps: [1, 2, 3, 4, 5], rounds: 1 });
	});

	it("nesmysl ani procenta nad 100 neprojdou", () => {
		expect(parseTargetText("hodně")).toBeNull();
		expect(parseTargetText("3×150 %")).toBeNull();
		expect(parseTargetText("3× týdně")).toBeNull();
	});
});

describe("řádek seznamu", () => {
	it("cvik a cíl s dvojtečkou, pomlčkou i bez oddělovače", () => {
		expect(parseItemLine("- Kliky: 3×10")).toEqual({ exercise: "Kliky", target: { kind: "sets_reps", sets: 3, reps: 10 }, days: undefined });
		expect(parseItemLine("* Dřep s činkou – 5×5")).toMatchObject({ exercise: "Dřep s činkou", target: { kind: "sets_reps", sets: 5, reps: 5 } });
		expect(parseItemLine("1. Běh 5 km")).toMatchObject({ exercise: "Běh", target: { kind: "distance", distance_km: 5 } });
		expect(parseItemLine("- [ ] [[Plank]]: 3×30 s")).toMatchObject({ exercise: "Plank", target: { kind: "time", sets: 3, time_s: 30 } });
	});

	it("číslo v názvu cviku, dny v závorce, denní součet", () => {
		expect(parseItemLine("- Swing 2 ruce: 10×10")).toMatchObject({ exercise: "Swing 2 ruce", target: { kind: "sets_reps", sets: 10, reps: 10 } });
		expect(parseItemLine("- Shyby: 3× max (po, čt)")).toEqual({ exercise: "Shyby", target: { kind: "max_sets", sets: 3 }, days: ["mon", "thu"] });
		expect(parseItemLine("- 100 kliků denně")).toMatchObject({ exercise: "Kliků", target: { kind: "daily_total", daily_total: 100 } });
	});

	it("řádek bez cíle se nepřečte", () => {
		expect(parseItemLine("- Protáhnout se")).toBeNull();
		expect(parseItemLine("- Kliky: hodně")).toBeNull();
	});
});

describe("program ze souboru", () => {
	it("seznam v Markdownu: název, délka, dny z nadpisů, položky podle dnů", () => {
		const result = readProgramFile(t(PROGRAM_FILE_EXAMPLE), "sila.md", yaml);
		expect(result.format).toBe("list");
		expect(result.skipped).toEqual([]);
		expect(result.defaultDays).toBe(false);
		const program = parseProgram({ schema: 1, ...result.raw })!;
		expect(program).toMatchObject({ name: "Síla 3× týdně", duration_weeks: 8, days: ["mon", "wed", "fri"], builtin: false, active: false });
		expect(program.items.map((i) => [i.exercise, i.target.kind, i.days])).toEqual([
			["Dřep s činkou", "sets_reps", ["mon", "fri"]],
			["Bench press", "sets_reps", ["mon", "fri"]],
			["Plank", "time", ["mon", "fri"]],
			["Shyby", "max_sets", ["wed"]],
			["Kliky", "pct_of_max", ["wed"]],
			["Běh", "distance", ["wed"]],
		]);
		expect(validateProgram(program)).toEqual([]);
		// Původní text zůstane jako popis v poznámce.
		expect(result.body).toContain("## Středa");
	});

	it("seznam bez dnů: řádek „Dny:“, jinak výchozí po–st–pá; nečitelné odrážky se ohlásí, věty ne", () => {
		const text = "Trénuj 3× týdně, vždy 60 min.\nDny: út, čt\n- Kliky: 3×10\n- Protáhnout se\n";
		const withDays = readProgramFile(text, "C:\\plány\\Můj plán.txt", yaml);
		expect(withDays.raw).toMatchObject({ name: "Můj plán", days: ["tue", "thu"] });
		expect(withDays.raw.items).toEqual([{ exercise: "Kliky", target: { kind: "sets_reps", sets: 3, reps: 10 } }]);
		expect(withDays.skipped).toEqual(["- Protáhnout se"]);
		const noDays = readProgramFile("- Kliky: 3×10", "plan.md", yaml);
		expect(noDays.raw.days).toEqual(["mon", "wed", "fri"]);
		expect(noDays.defaultDays).toBe(true);
	});

	it("JSON: program přímo nebo v klíči program; název ze souboru, když chybí", () => {
		const program = { days: ["mon"], items: [{ exercise: "Kliky", target: { sets: 3, reps: 10 } }], description: "Popis." };
		const direct = readProgramFile(JSON.stringify(program), "kliky.json", yaml);
		expect(direct).toMatchObject({ format: "json", body: "Popis." });
		expect(direct.raw).toMatchObject({ forma: "program", name: "kliky" });
		const wrapped = readProgramFile(JSON.stringify({ program: { ...program, name: "Kliky 3×10" } }), "x.json", yaml);
		expect(parseProgram({ schema: 1, ...wrapped.raw })).toMatchObject({ name: "Kliky 3×10", items: [{ exercise: "Kliky", target: { kind: "sets_reps", sets: 3, reps: 10 } }] });
	});

	it("poznámka programu s frontmatterem a YAML soubor", () => {
		const fm = JSON.stringify({ forma: "program", name: "Základ", days: ["mon", "thu"], items: [{ exercise: "Dřepy", target: { daily_total: 50 } }] });
		const note = readProgramFile(`---\n${fm}\n---\n\nPopis programu.\n`, "zaklad.md", yaml);
		expect(note).toMatchObject({ format: "note", body: "Popis programu." });
		expect(parseProgram({ schema: 1, ...note.raw })?.items).toEqual([{ exercise: "Dřepy", target: { kind: "daily_total", daily_total: 50 } }]);
		// YAML soubor (čtení YAML dodává Obsidian – tady ho zastoupí hotový objekt).
		const fromYaml = readProgramFile("name: Základ\ndays: [mon, thu]\n", "zaklad.yaml", () => JSON.parse(fm) as unknown);
		expect(fromYaml.format).toBe("yaml");
		expect(fromYaml.raw).toMatchObject({ name: "Základ", days: ["mon", "thu"] });
	});

	it("frontmatter bez položek: položky se vezmou ze seznamu pod ním", () => {
		const result = readProgramFile('---\n{"name": "Z poznámky", "tags": ["plán"]}\n---\n- Běh: 5 km\n', "x.md", yaml);
		expect(result.format).toBe("list");
		expect(result.raw).toMatchObject({ name: "Z poznámky", items: [{ exercise: "Běh", target: { kind: "distance", distance_km: 5 } }] });
	});

	it("srozumitelné chyby", () => {
		expect(() => readProgramFile("  \n", "x.md", yaml)).toThrow("Soubor je prázdný.");
		expect(() => readProgramFile("{ nedopsaný", "x.json", yaml)).toThrow("Soubor není platný JSON.");
		expect(() => readProgramFile("[1, 2]", "x.json", yaml)).toThrow("JSON musí obsahovat objekt programu");
	});

	it("hláška po importu: co vzniklo a co zkontrolovat", () => {
		const clean = { name: "Síla", items: 6, dropped: 0, skipped: [], unknownExercises: [], defaultDays: false };
		expect(describeImport(clean)).toBe("Program „Síla“ vytvořen (položky: 6). Je v knihovně na kartě Programy, zatím neaktivní.");
		const text = describeImport({ ...clean, dropped: 1, skipped: ["- a", "- b", "- c", "- d"], unknownExercises: ["Kliků"], defaultDays: true });
		expect(text.split("\n")).toEqual([
			"Program „Síla“ vytvořen (položky: 6). Je v knihovně na kartě Programy, zatím neaktivní.",
			"Dny v souboru chyběly – nastaveno po, st, pá.",
			"Nenačtených položek: 1 (chybí cvik nebo cíl).",
			"Nepřečtené řádky (4): - a; - b; - c…",
			"Cviky mimo knihovnu: Kliků – přidej je do knihovny, ať se počítají do partií.",
		]);
	});

	it("název souboru bez přípony a cesty", () => {
		expect(baseName("C:\\Users\\x\\Plán síla.md")).toBe("Plán síla");
		expect(baseName("slozka/plan.v2.json")).toBe("plan.v2");
		expect(baseName("")).toBe("");
	});
});
