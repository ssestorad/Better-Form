import { afterEach, describe, expect, it } from "vitest";
import { setLanguage } from "../../src/i18n";
import { AMINO_ACIDS, aminoAcids } from "../../src/seed/aminoAcids";
import { EXERCISES_EN } from "../../src/seed/en/exercises";
import { LADDERS_EN, PROGRAMS_EN, TEMPLATES_EN } from "../../src/seed/en/programs";
import { RESEARCH_EN } from "../../src/seed/en/research";
import { SUPPLEMENTS_EN } from "../../src/seed/en/supplements";
import { AMINO_EN } from "../../src/seed/en/amino";
import { SEED_EXERCISES, seedExercises } from "../../src/seed/exercises";
import { csExerciseName, csProgramName, exerciseName, programName } from "../../src/seed/localize";
import { builtinExercise } from "../../src/seed/lookup";
import { SEED_PROGRAMS, seedPrograms } from "../../src/seed/programs";
import { RESEARCH_TOPICS, researchTopic } from "../../src/seed/research";
import { SKILL_LADDERS } from "../../src/seed/skills";
import { SUPPLEMENT_CATALOG, catalog, findCatalogSupplement } from "../../src/seed/supplements";
import { SEED_TEMPLATES, seedTemplates } from "../../src/seed/templates";

const CZECH = /[ěščřžůťďňĚŠČŘŽŮŤĎŇ]/;
const lower = (s: string) => s.toLocaleLowerCase("cs");

afterEach(() => setLanguage("cs"));

describe("anglický obsah knihovny", () => {
	it("každý vestavěný cvik má anglický název bez češtiny a názvy se nepletou", () => {
		const csKeys = new Map(SEED_EXERCISES.flatMap((e) => [e.name, ...e.aliases].map((n) => [lower(n), e.name] as const)));
		const seen = new Set<string>();
		for (const e of SEED_EXERCISES) {
			const en = EXERCISES_EN[e.name];
			expect(en, e.name).toBeDefined();
			expect(en!.name, e.name).not.toMatch(CZECH);
			expect(seen.has(lower(en!.name)), en!.name).toBe(false);
			seen.add(lower(en!.name));
			const owner = csKeys.get(lower(en!.name));
			if (owner) expect(owner, en!.name).toBe(e.name);
			expect(csExerciseName(en!.name)).toBe(e.name);
		}
	});

	it("anglická knihovna cviků drží český název jako alias", () => {
		setLanguage("en");
		const bench = seedExercises("en").find((e) => e.aliases.includes("Bench press") || e.name === "Bench press");
		expect(bench).toBeDefined();
		for (const e of seedExercises("en")) {
			const cs = csExerciseName(e.name);
			if (cs !== e.name) expect(e.aliases).toContain(cs);
		}
		expect(builtinExercise("Dřep s činkou")?.name).toBe(exerciseName("Dřep s činkou", "en"));
	});

	it("programy, šablony a žebříčky mají překlad a cviky v nich existují v anglické knihovně", () => {
		const names = new Set(seedExercises("en").flatMap((e) => [e.name, ...e.aliases].map(lower)));
		for (const p of SEED_PROGRAMS) expect(PROGRAMS_EN[p.note.name], p.note.name).toBeDefined();
		for (const t of SEED_TEMPLATES) expect(TEMPLATES_EN[t.name], t.name).toBeDefined();
		for (const l of SKILL_LADDERS) expect(LADDERS_EN[l.name], l.name).toBeDefined();
		for (const p of seedPrograms("en")) {
			expect(PROGRAMS_EN[csProgramName(p.note.name)]?.name).toBe(p.note.name);
			for (const item of p.note.items) {
				for (const n of [item.exercise, ...(item.max_from ?? []), ...(item.schedule ?? []).flatMap((s) => (s.exercise ? [s.exercise] : []))]) {
					expect(names.has(lower(n)), `${p.note.name}: ${n}`).toBe(true);
					expect(n, `${p.note.name}: ${n}`).not.toMatch(CZECH);
				}
			}
		}
		for (const t of seedTemplates("en")) {
			for (const b of t.blocks) if (b.exercise) expect(names.has(lower(String(b.exercise))), `${t.name}: ${b.exercise}`).toBe(true);
		}
		expect(programName(SEED_PROGRAMS[0]!.note.name, "en")).toBe(seedPrograms("en")[0]!.note.name);
	});

	it("katalog suplementů má úplný překlad ve stejném pořadí studií a oblastí", () => {
		for (const s of SUPPLEMENT_CATALOG) {
			const en = SUPPLEMENTS_EN[s.id];
			expect(en, s.id).toBeDefined();
			expect(en!.studies.length, s.id).toBe(s.studies.length);
			expect(en!.benefits.length, s.id).toBe(s.benefits.length);
			en!.benefits.forEach((b, i) => expect(b === null, `${s.id} benefit ${i}`).toBe(s.benefits[i]!.note === undefined));
			expect(en!.safetyNote !== undefined, s.id).toBe(s.safetyNote !== undefined);
			for (const text of [en!.name, en!.summary, en!.agreement, en!.dosing, en!.forWhom, en!.risks, ...en!.studies]) expect(text, s.id).not.toMatch(CZECH);
		}
		expect(Object.keys(SUPPLEMENTS_EN).sort()).toEqual(SUPPLEMENT_CATALOG.map((s) => s.id).sort());
	});

	it("suplement se najde podle názvu v obou jazycích", () => {
		setLanguage("en");
		expect(catalog().find((s) => s.id === "creatine")?.name).toBe("Creatine");
		expect(findCatalogSupplement("kreatin")?.name).toBe("Creatine");
		expect(findCatalogSupplement("creatine")?.id).toBe("creatine");
		expect(catalog().find((s) => s.id === "multivitamin")?.defaults.unit).toBe("tablet");
	});

	it("výzkum a aminokyseliny mají překlad", () => {
		for (const topic of RESEARCH_TOPICS) {
			const en = RESEARCH_EN[topic.id];
			expect(en, topic.id).toBeDefined();
			expect(en!.studies.length, topic.id).toBe(topic.studies.length);
		}
		for (const a of AMINO_ACIDS) expect(AMINO_EN[a.id], a.id).toBeDefined();
		setLanguage("en");
		expect(researchTopic(RESEARCH_TOPICS[0]!.id)?.title).toBe(RESEARCH_EN[RESEARCH_TOPICS[0]!.id]!.title);
		expect(aminoAcids().every((a) => !CZECH.test(a.name))).toBe(true);
	});
});
