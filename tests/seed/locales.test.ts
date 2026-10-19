import { afterEach, describe, expect, it } from "vitest";
import { isSourceId } from "../../src/evidence/sources";
import { setLanguage } from "../../src/i18n";
import { LOCALES } from "../../src/locales";
import type { ContentLocale } from "../../src/locales/types";
import { AMINO_ACIDS, aminoAcids } from "../../src/seed/aminoAcids";
import { EXERCISE_ROWS } from "../../src/seed/exerciseData";
import { seedExercises, translateExerciseFrontmatter } from "../../src/seed/exercises";
import { exerciseToFrontmatter } from "../../src/model/serialize";
import { builtinId, builtinName, builtinNameIn, exerciseId, exerciseNameIn } from "../../src/seed/localize";
import { builtinExercise } from "../../src/seed/lookup";
import { PROGRAM_DATA, TEMPLATE_DATA } from "../../src/seed/programData";
import { seedPrograms } from "../../src/seed/programs";
import { RESEARCH_TOPICS, researchTopic } from "../../src/seed/research";
import { SKILL_LADDERS } from "../../src/seed/skills";
import { SUPPLEMENT_CATALOG, catalog, findCatalogSupplement } from "../../src/seed/supplements";
import { seedTemplates } from "../../src/seed/templates";

afterEach(() => setLanguage("cs"));

describe("vestavěný obsah – anglický zdroj", () => {
	it("názvy jsou jednoznačné a vedou zpět na své id", () => {
		for (const row of EXERCISE_ROWS) expect(exerciseId(row.name), row.name).toBe(row.id);
		for (const ladder of SKILL_LADDERS) expect(builtinId("ladder", ladder.name), ladder.name).toBe(ladder.id);
		for (const program of PROGRAM_DATA) expect(builtinId("program", program.note.name), program.note.name).toBe(program.id);
		for (const template of TEMPLATE_DATA) expect(builtinId("template", template.note.name), template.note.name).toBe(template.id);
	});

	it("programy, šablony a žebříčky odkazují na cviky z knihovny", () => {
		const ids = new Set(EXERCISE_ROWS.map((row) => row.id));
		for (const ladder of SKILL_LADDERS) for (const step of ladder.steps) expect(ids, `${ladder.id}: ${step}`).toContain(step);
		for (const { id, note } of PROGRAM_DATA) {
			for (const item of note.items) {
				for (const name of [item.exercise, ...(item.max_from ?? []), ...(item.schedule ?? []).flatMap((s) => (s.exercise ? [s.exercise] : []))]) {
					expect(exerciseId(name), `${id}: ${name}`).toBeDefined();
				}
			}
		}
		for (const { id, note } of TEMPLATE_DATA) for (const block of note.blocks) if (block.exercise) expect(exerciseId(String(block.exercise)), `${id}: ${block.exercise}`).toBeDefined();
	});
});

describe.each(Object.entries(LOCALES) as [string, { content: ContentLocale }][])("vestavěný obsah – %s", (code, { content }) => {
	it("každý cvik má název a texty; název vede zpět na tentýž cvik", () => {
		for (const row of EXERCISE_ROWS) {
			const local = content.exercises[row.id];
			expect(local, row.id).toBeDefined();
			expect(exerciseId(local!.name), `${row.id}: ${local!.name}`).toBe(row.id);
			if (row.text) {
				expect(local!.about, row.id).toBeTruthy();
				expect(local!.how?.length ?? 0, row.id).toBeGreaterThan(0);
				expect(local!.mistakes?.length ?? 0, row.id).toBeGreaterThan(0);
			}
		}
		expect(Object.keys(content.exercises).sort()).toEqual(EXERCISE_ROWS.map((row) => row.id).sort());
	});

	it("programy, šablony a žebříčky mají název (a programy popis)", () => {
		for (const { id } of PROGRAM_DATA) {
			expect(content.programs[id]?.name, id).toBeTruthy();
			expect(content.programs[id]!.description.length, id).toBeGreaterThan(40);
			expect(builtinId("program", content.programs[id]!.name), id).toBe(id);
		}
		for (const { id } of TEMPLATE_DATA) expect(builtinId("template", content.templates[id] ?? ""), id).toBe(id);
		for (const { id } of SKILL_LADDERS) expect(builtinId("ladder", content.ladders[id] ?? ""), id).toBe(id);
	});

	it("výzkum, suplementy a aminokyseliny: úplné, studie a oblasti ve stejném pořadí", () => {
		for (const topic of RESEARCH_TOPICS) expect(content.research[topic.id]?.studies.length, topic.id).toBe(topic.studies.length);
		for (const item of SUPPLEMENT_CATALOG) {
			const local = content.supplements[item.id];
			expect(local, item.id).toBeDefined();
			expect(local!.studies.length, item.id).toBe(item.studies.length);
			expect(local!.benefits.length, item.id).toBe(item.benefits.length);
			local!.benefits.forEach((note, i) => expect(note === null, `${item.id} oblast ${i}`).toBe(item.benefits[i]!.note === undefined));
			expect(local!.safetyNote !== undefined, item.id).toBe(item.safetyNote !== undefined);
			expect(Object.keys(local!.variants ?? {}), item.id).toEqual((item.variants ?? []).map((v) => v.id));
			for (const v of item.variants ?? []) expect(local!.variants![v.id]!.studies.length, `${item.id}/${v.id}`).toBe(v.studies.length);
		}
		for (const amino of AMINO_ACIDS) expect(content.amino[amino.id]?.name, amino.id).toBeTruthy();
	});

	it("překlady zdrojů patří existujícím zdrojům", () => {
		for (const id of Object.keys(content.sources)) expect(isSourceId(id), id).toBe(true);
	});
});

describe("obsah podle jazyka", () => {
	it("cvik, program a šablona najdou název v kterémkoli jazyce", () => {
		expect(exerciseNameIn("Dřep s činkou", "en")).toBe("Back squat");
		expect(exerciseNameIn("back squat", "cs")).toBe("Dřep s činkou");
		expect(exerciseNameIn("Můj cvik", "en")).toBe("Můj cvik");
		expect(builtinNameIn("template", "Push – posilovna", "en")).toBe("Push – gym");
		expect(builtinNameIn("template", "push – gym", "cs")).toBe("Push – posilovna");
		expect(builtinNameIn("program", "Základ 4", "en")).toBe("Basic 4");
		expect(builtinNameIn("program", "Basic 4", "cs")).toBe("Základ 4");
		expect(builtinNameIn("program", "Grease the groove", "en")).toBe("Grease the groove");
		expect(builtinNameIn("template", "Moje nohy", "en")).toBeUndefined();
		expect(builtinName("ladder", "push-up-progression", "cs")).toBe("Kliky – progrese");
	});

	it("knihovna v jazyce: názvy z překladu, ostatní jazyky jako aliasy, cviky v programech a šablonách v tomtéž jazyce", () => {
		const cs = seedExercises("cs").find((e) => e.name === "Kliky")!;
		expect(cs.aliases).toContain("Push-up");
		const en = seedExercises("en").find((e) => e.name === "Push-up")!;
		expect(en.aliases).toContain("Kliky");
		expect(en.description).toBe(EXERCISE_ROWS.find((r) => r.id === "push-up")!.text!.about);
		expect(seedPrograms("cs").find((p) => p.id === "100-push-ups-a-day")!.note.items[0]!.exercise).toBe("Kliky");
		expect(seedPrograms("en").find((p) => p.id === "100-push-ups-a-day")!.note.items[0]!.exercise).toBe("Push-up");
		expect(seedTemplates("cs").map((t) => t.name)).toContain("Push – posilovna");
		expect(seedTemplates("en").map((t) => t.name)).toContain("Push – gym");
	});

	it("překlad poznámky cviku: název, aliasy, neupravené texty a žebříček; upravený text zůstane", () => {
		const czech = exerciseToFrontmatter(seedExercises("cs").find((e) => e.name === "Kliky")!) as Record<string, unknown>;
		czech.aliases = [...(czech.aliases as string[]), "Moje kliky"];
		czech.mistakes = "- Moje vlastní poznámka";
		expect(translateExerciseFrontmatter(czech, "push-up", "en")).toBe(true);
		const english = seedExercises("en").find((e) => e.name === "Push-up")!;
		expect(czech.name).toBe("Push-up");
		expect(czech.aliases).toContain("Kliky");
		expect(czech.aliases).toContain("Moje kliky");
		expect(czech.aliases).not.toContain("Push-up");
		expect(czech.description).toBe(english.description);
		expect(czech.technique).toBe(english.technique);
		expect(czech.mistakes).toBe("- Moje vlastní poznámka");
		expect((czech.progression as { ladder: string }).ladder).toBe("[[Push-up – progression]]");
		// Podruhé už není co měnit.
		expect(translateExerciseFrontmatter(czech, "push-up", "en")).toBe(false);
	});

	it("vestavěné texty, výzkum, suplementy a aminokyseliny v jazyce rozhraní", () => {
		expect(builtinExercise("Push-up")?.name).toBe("Kliky");
		setLanguage("en");
		expect(builtinExercise("Kliky")?.name).toBe("Push-up");
		expect(researchTopic(RESEARCH_TOPICS[0]!.id)?.title).toBe(RESEARCH_TOPICS[0]!.title);
		expect(catalog().find((s) => s.id === "creatine")?.name).toBe("Creatine");
		expect(findCatalogSupplement("kreatin")?.name).toBe("Creatine");
		expect(catalog().find((s) => s.id === "multivitamin")?.defaults.unit).toBe("tablet");
		expect(aminoAcids()[0]!.name).toBe("Leucine");
		setLanguage("cs");
		expect(findCatalogSupplement("creatine")?.name).toBe("Kreatin");
		expect(catalog().find((s) => s.id === "multivitamin")?.defaults.unit).toBe("tableta");
		expect(aminoAcids()[0]!.name).toBe("Leucin");
	});
});
