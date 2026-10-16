import { describe, expect, it } from "vitest";
import { MUSCLES } from "../../src/model/constants";
import { parseExercise, parseProgram, parseTemplate } from "../../src/model/parse";
import { exerciseToFrontmatter, programToFrontmatter, templateToFrontmatter } from "../../src/model/serialize";
import { SEED_TEMPLATES } from "../../src/seed/templates";
import { sanitizeFileName } from "../../src/data/paths";
import { SEED_EXERCISES } from "../../src/seed/exercises";
import { MORE_EXERCISES } from "../../src/seed/exercisesMore";
import { COUCH_TO_5K_SCHEDULE, ROPE_FITNESS, ROPE_START, SEED_PROGRAMS } from "../../src/seed/programs";
import { resolveTarget } from "../../src/calc/programs";
import type { ProgramTarget } from "../../src/model/types";
import { EXERCISE_TEXTS } from "../../src/seed/exerciseTexts";
import { builtinExercise, bulletLines, missingTexts, withBuiltinTexts } from "../../src/seed/lookup";
import type { ExerciseNote } from "../../src/model/types";
import { intervalTotalSeconds, intervalWorkSeconds } from "../../src/calc/programs";
import { DEFAULT_SETTINGS } from "../../src/settings/settings";
import { getSource } from "../../src/evidence/sources";

const lower = (s: string) => s.toLocaleLowerCase("cs");
const exerciseKeys = new Set(SEED_EXERCISES.flatMap((e) => [e.name, ...e.aliases].map(lower)));

describe("knihovna cviků", () => {
	it("aspoň 60 cviků ve všech kategoriích (SPEC 13)", () => {
		expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(60);
		const categories = new Set(SEED_EXERCISES.map((e) => e.category));
		for (const category of ["strength", "calisthenics", "kettlebell", "cardio"]) {
			expect(categories, category).toContain(category);
		}
	});

	it("rozšíření knihovny je její součástí, s texty a ve všech kategoriích včetně mobility", () => {
		expect(MORE_EXERCISES.length).toBeGreaterThanOrEqual(70);
		expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(190);
		const names = new Set(SEED_EXERCISES.map((e) => e.name));
		for (const e of MORE_EXERCISES) {
			expect(names, e.name).toContain(e.name);
			expect(EXERCISE_TEXTS[e.name], e.name).toBe(e.text);
			expect(e.text.how.length, e.name).toBeGreaterThanOrEqual(3);
			expect(e.text.mistakes.length, e.name).toBeGreaterThanOrEqual(2);
		}
		expect(new Set(MORE_EXERCISES.map((e) => e.category))).toEqual(new Set(["strength", "calisthenics", "kettlebell", "cardio", "mobility"]));
	});

	it("názvy a aliasy jsou jednoznačné (bez ohledu na velikost písmen)", () => {
		const all = SEED_EXERCISES.flatMap((e) => [e.name, ...e.aliases].map(lower));
		const duplicates = all.filter((key, i) => all.indexOf(key) !== i);
		expect(duplicates).toEqual([]);
	});

	it("název je zároveň platný název souboru", () => {
		for (const e of SEED_EXERCISES) expect(sanitizeFileName(e.name), e.name).toBe(e.name);
	});

	it("každý cvik má hlavní partii a partie jsou platné a neopakují se", () => {
		for (const e of SEED_EXERCISES) {
			expect(e.muscles.primary.length, e.name).toBeGreaterThan(0);
			const all = [...e.muscles.primary, ...e.muscles.secondary];
			for (const m of all) expect(MUSCLES, e.name).toContain(m);
			expect(new Set(all).size, e.name).toBe(all.length);
		}
	});

	it("každá partie panáčka má aspoň jeden cvik", () => {
		const covered = new Set(SEED_EXERCISES.flatMap((e) => e.muscles.primary));
		for (const m of MUSCLES) expect(covered, m).toContain(m);
	});

	it("podíl tělesné hmotnosti jen u cviků s vlastní vahou, v rozsahu 0–1", () => {
		for (const e of SEED_EXERCISES) {
			if (e.bodyweight_fraction === undefined) continue;
			expect(e.measure, e.name).toBe("reps_bw");
			expect(e.bodyweight_fraction, e.name).toBeGreaterThan(0);
			expect(e.bodyweight_fraction, e.name).toBeLessThanOrEqual(1);
		}
	});

	it("kliky: 0,64 podle Ebben 2011, ostatní bez zdroje (= praxe)", () => {
		const pushUp = SEED_EXERCISES.find((e) => e.name === "Kliky");
		expect(pushUp?.bodyweight_fraction).toBe(0.64);
		expect(pushUp?.bodyweight_fraction_source).toBe("ebben2011");
		const withSource = SEED_EXERCISES.filter((e) => e.bodyweight_fraction_source !== undefined);
		expect(withSource.map((e) => e.name)).toEqual(["Kliky"]);
	});

	it("švihové cviky nemají podíl hmotnosti (1RM se u nich nepočítá)", () => {
		for (const e of SEED_EXERCISES.filter((x) => x.kind === "ballistic")) {
			expect(e.bodyweight_fraction, e.name).toBeUndefined();
		}
	});

	it("cviky režimu Základ a alternativy k sedům-lehům existují", () => {
		for (const name of [...DEFAULT_SETTINGS.basicExercises, "Zkracovačky", "Plank"]) {
			expect(exerciseKeys, name).toContain(lower(name));
		}
	});

	it("každý cvik má popis, provedení a časté chyby; žádný text nepatří neexistujícímu cviku", () => {
		for (const e of SEED_EXERCISES) {
			expect(e.technique, e.name).toMatch(/^- .+/);
			expect(e.mistakes, e.name).toMatch(/^- .+/);
			expect(e.description?.length ?? 0, e.name).toBeGreaterThan(20);
		}
		const names = new Set(SEED_EXERCISES.map((e) => e.name));
		for (const key of Object.keys(EXERCISE_TEXTS)) expect(names, key).toContain(key);
	});

	it("zápis a načtení vrátí stejná data", () => {
		for (const e of SEED_EXERCISES) {
			expect(parseExercise(exerciseToFrontmatter(e)), e.name).toEqual(e);
		}
	});
});

describe("doplnění textů z vestavěné knihovny", () => {
	const bare = (name: string, extra: Partial<ExerciseNote> = {}): ExerciseNote => ({
		forma: "exercise",
		schema: 1,
		name,
		category: "calisthenics",
		kind: "grind",
		measure: "reps_bw",
		muscles: { primary: ["chest"], secondary: [] },
		aliases: [],
		...extra,
	});

	it("doplní jen chybějící pole, text uživatele nepřepíše", () => {
		const note = bare("kliky", { technique: "- Moje vlastní technika" });
		const missing = missingTexts(note);
		expect(Object.keys(missing).sort()).toEqual(["description", "mistakes"]);
		const shown = withBuiltinTexts(note);
		expect(shown.technique).toBe("- Moje vlastní technika");
		expect(shown.description).toBe(builtinExercise("Kliky")!.description);
	});

	it("vlastní cvik mimo knihovnu zůstane beze změny", () => {
		const note = bare("Můj speciální cvik");
		expect(missingTexts(note)).toEqual({});
		expect(withBuiltinTexts(note)).toEqual(note);
	});

	it("odrážky na řádky", () => {
		expect(bulletLines("- první\n- druhý\n\n* třetí\nčtvrtý")).toEqual(["první", "druhý", "třetí", "čtvrtý"]);
		expect(bulletLines(undefined)).toEqual([]);
	});
});

describe("předpřipravené programy", () => {
	it("programy ze SPEC 5.7 a vlastní program na kliky a shyby", () => {
		expect(SEED_PROGRAMS.map((p) => p.note.name)).toEqual([
			"Základ 4",
			"Kliky a shyby – 6 týdnů",
			"Od nuly k prvnímu shybu",
			"Od gauče k 5 km",
			"100 kliků denně",
			"Grease the groove",
			"Kettlebell denně",
			"Odlehčovací týden",
			"Švihadlo od nuly – 4 týdny",
			"Švihadlo – kondice 6 týdnů",
			"Švihadlo – 1000 přeskoků",
		]);
	});

	it("jsou předpřipravené, neaktivní a mají štítek i zdroj", () => {
		for (const { note } of SEED_PROGRAMS) {
			expect(note.builtin, note.name).toBe(true);
			expect(note.active, note.name).toBe(false);
			expect(note.sources?.length, note.name).toBeGreaterThan(0);
		}
	});

	it("štítek není silnější než nejslabší zdroj (heuristika ≠ výzkum)", () => {
		for (const { note } of SEED_PROGRAMS) {
			if (note.sources?.includes("practice")) expect(note.evidence, note.name).toBe("practice");
			for (const id of note.sources ?? []) expect(getSource(id), `${note.name}: ${id}`).toBeDefined();
		}
	});

	it("položky odkazují na cviky z knihovny", () => {
		for (const { note } of SEED_PROGRAMS) {
			for (const item of note.items) {
				const names = [item.exercise, ...(item.max_from ?? []), ...(item.schedule ?? []).flatMap((w) => (w.exercise ? [w.exercise] : []))];
				for (const name of names) expect(exerciseKeys, `${note.name}: ${name}`).toContain(lower(name));
			}
		}
	});

	it("100 kliků denně odpovídá příkladu ze SPEC 4.5", () => {
		const program = SEED_PROGRAMS.find((p) => p.note.name === "100 kliků denně")!.note;
		expect(program.days).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
		expect(program.items).toEqual([{ exercise: "Kliky", target: { kind: "daily_total", daily_total: 100 } }]);
	});

	it("Couch to 5K: celkové časy tréninků odpovídají plánu NHS", () => {
		// Časy „Total time (excluding stretches)“ z nhs.uk, včetně 5 min chůze na začátku a na konci.
		const expected: Record<number, number[]> = {
			1: [28.5 * 60], // 5 + 7 × (1 + 1,5) + 1 + 5 = 28,5 min
			2: [29 * 60], // 5 + 5 × (1,5 + 2) + 1,5 + 5 = 29 min
			3: [25 * 60], // 5 + 1,5 + 1,5 + 3 + 3 + 1,5 + 1,5 + 3 + 5 = 25 min
			4: [31.5 * 60], // 5 + 3 + 1,5 + 5 + 2,5 + 3 + 1,5 + 5 + 5 = 31,5 min
			5: [31 * 60, 31 * 60, 30 * 60],
			6: [34 * 60, 33 * 60, 35 * 60],
			7: [35 * 60],
			8: [38 * 60],
			9: [40 * 60],
		};
		expect(COUCH_TO_5K_SCHEDULE.map((w) => w.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		for (const week of COUCH_TO_5K_SCHEDULE) {
			const targets = week.sessions ?? [week.target!];
			const totals = targets.map((t) => (t.kind === "intervals" ? intervalTotalSeconds(t) : NaN));
			expect(totals, `týden ${week.week}`).toEqual(expected[week.week]);
		}
	});

	it("Couch to 5K: v 9. týdnu 30 min běhu v kuse", () => {
		const week9 = COUCH_TO_5K_SCHEDULE[8]!.target!;
		expect(week9.kind === "intervals" && intervalWorkSeconds(week9)).toBe(30 * 60);
	});

	it("švihadlo: délky tréninků odpovídají tabulkám v popisu", () => {
		const total = (t: ProgramTarget) => (t.kind === "intervals" ? intervalTotalSeconds(t) : NaN);
		// 8 × (20 + 40) = 480 s; 10 × 60 = 600 s; 10 × 60 = 600 s; 8 × (60 + 30) = 720 s
		expect(ROPE_START.map((w) => total(w.target!))).toEqual([480, 600, 600, 720]);
		expect(ROPE_FITNESS.map((w) => w.week)).toEqual([1, 2, 3, 4, 5, 6]);
		// týden 1: 10 × 60 = 600 s; 4 × (120 + 60) = 720 s; pyramida 1-2-3-2-1 min = 540 s + 4 × 45 s = 720 s
		expect(ROPE_FITNESS[0]!.sessions!.map(total)).toEqual([600, 720, 720]);
		// týden 5: 15 × 60 = 900 s; 5 × (180 + 60) = 1200 s; pyramida 2-3-4-3-2 min = 840 s + 4 × 45 s = 1020 s
		expect(ROPE_FITNESS[4]!.sessions!.map(total)).toEqual([900, 1200, 1020]);
	});

	it("1000 přeskoků: vlastní tlačítka počítadla", () => {
		const p = SEED_PROGRAMS.find((s) => s.note.name === "Švihadlo – 1000 přeskoků")!.note;
		expect(p.items[0]!.target).toEqual({ kind: "daily_total", daily_total: 1000, counter_steps: [50, 100, 200] });
		expect(resolveTarget(p.items[0]!.target, { week: 0, progression: p.progression })).toEqual({
			kind: "daily_total",
			total: 1000,
			steps: [50, 100, 200],
		});
	});

	it("popis je vyplněný", () => {
		for (const { note, description } of SEED_PROGRAMS) expect(description.length, note.name).toBeGreaterThan(40);
	});

	it("zápis a načtení vrátí stejná data, odkazy jsou [[wikiodkazy]]", () => {
		for (const { note } of SEED_PROGRAMS) {
			const frontmatter = programToFrontmatter(note);
			expect(parseProgram(frontmatter), note.name).toEqual(note);
			for (const item of frontmatter.items as { exercise: string }[]) expect(item.exercise).toMatch(/^\[\[.+\]\]$/);
		}
	});
});

describe("předpřipravené šablony tréninků", () => {
	it("push a pull pro posilovnu i vlastní váhu; cviky jsou v knihovně a zápis jde načíst zpět", () => {
		expect(SEED_TEMPLATES.map((t) => t.name)).toEqual(["Push – posilovna", "Pull – posilovna", "Push – vlastní váha", "Pull – vlastní váha"]);
		for (const template of SEED_TEMPLATES) {
			for (const block of template.blocks) expect(exerciseKeys.has(lower(String(block.exercise))), `${template.name}: ${block.exercise}`).toBe(true);
			expect(parseTemplate(templateToFrontmatter(template)), template.name).toEqual(template);
		}
	});
});
