import { describe, expect, it } from "vitest";
import { relinkFrontmatter, translateSeedBody } from "../../src/calc/relink";

const exercises = new Map([
	["kliky", "Push-up"],
	["shyby", "Pull-up"],
]);
const templates = new Map([["push – posilovna", "Push – gym"]]);
const maps = { exercise: exercises, max_from: exercises, template: templates };

describe("překlad těla vloženého pluginem", () => {
	const cs = "Popis techniky je obecný návod.";
	const en = "The technique description is a general guide.";
	const note = (body: string) => `---\nforma: exercise\nname: Back extension\n---\n\n${body}`;

	it("tělo shodné s vloženým textem se přeloží, frontmatter zůstane", () => {
		expect(translateSeedBody(note(`${cs}\n`), [cs, en], en)).toBe(note(`${en}\n`));
	});

	it("tělo, do kterého uživatel psal, nebo už přeložené, zůstane", () => {
		expect(translateSeedBody(note(`${cs}\n\nMoje poznámka.`), [cs, en], en)).toBeNull();
		expect(translateSeedBody(note(`${en}\n`), [cs, en], en)).toBeNull();
		expect(translateSeedBody(note(""), [cs, en], en)).toBeNull();
	});
});

describe("přepis odkazů po přejmenování", () => {
	it("cviky v blocích tréninku i vnořených položkách; wikiodkaz zůstane wikiodkazem", () => {
		const fm = {
			forma: "workout",
			title: "Kliky",
			template: "[[Push – posilovna]]",
			blocks: [
				{ type: "sets", exercise: "[[Kliky]]", sets: [{ reps: 10 }] },
				{ type: "complex", items: [{ exercise: "Shyby", reps: 5 }, { exercise: "[[Můj cvik]]", reps: 3 }] },
			],
		};
		const { value, changed } = relinkFrontmatter(fm, maps);
		expect(changed).toBe(true);
		expect(value).toEqual({
			forma: "workout",
			title: "Kliky",
			template: "[[Push – gym]]",
			blocks: [
				{ type: "sets", exercise: "[[Push-up]]", sets: [{ reps: 10 }] },
				{ type: "complex", items: [{ exercise: "Pull-up", reps: 5 }, { exercise: "[[Můj cvik]]", reps: 3 }] },
			],
		});
		// Původní objekt se nemění.
		expect(fm.blocks[0]!.exercise).toBe("[[Kliky]]");
	});

	it("pole odkazů (max_from) a bez shody beze změny", () => {
		expect(relinkFrontmatter({ items: [{ exercise: "[[KLIKY]]", max_from: ["[[Kliky]]", "[[Dipy]]"] }] }, maps).value).toEqual({
			items: [{ exercise: "[[Push-up]]", max_from: ["[[Push-up]]", "[[Dipy]]"] }],
		});
		const untouched = { blocks: [{ exercise: "[[Dipy]]" }] };
		expect(relinkFrontmatter(untouched, maps)).toEqual({ value: untouched, changed: false });
	});
});
