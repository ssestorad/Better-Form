import { describe, expect, it } from "vitest";
import {
	BLOCK_END,
	BLOCK_START,
	extractGeneratedBlock,
	replaceGeneratedBlock,
} from "../../src/data/generatedBlock";

const FRONTMATTER = "---\nforma: day\ndate: 2026-09-28\n---\n";

describe("generovaný blok", () => {
	it("přidá blok na konec a uživatelův text nechá", () => {
		const text = `${FRONTMATTER}\nMůj text.\n\n`;
		const result = replaceGeneratedBlock(text, "Tréninky: 1");
		expect(result.status).toBe("appended");
		expect(result.text).toBe(`${FRONTMATTER}\nMůj text.\n\n${BLOCK_START}\nTréninky: 1\n${BLOCK_END}\n`);
	});

	it("do prázdné poznámky", () => {
		expect(replaceGeneratedBlock("", "A").text).toBe(`${BLOCK_START}\nA\n${BLOCK_END}\n`);
	});

	it("nahradí jen obsah mezi značkami", () => {
		const text = `${FRONTMATTER}Před.\n${BLOCK_START}\nstaré\n${BLOCK_END}\nPo.\n`;
		const result = replaceGeneratedBlock(text, "nové");
		expect(result.status).toBe("replaced");
		expect(result.text).toBe(`${FRONTMATTER}Před.\n${BLOCK_START}\nnové\n${BLOCK_END}\nPo.\n`);
	});

	it("stejný obsah = beze změny", () => {
		const text = `Před.\n${BLOCK_START}\nobsah\n${BLOCK_END}\n`;
		expect(replaceGeneratedBlock(text, "obsah")).toEqual({ status: "unchanged", text });
	});

	it("poškozené značky: nic nemění", () => {
		const missingEnd = `Text\n${BLOCK_START}\nobsah\n`;
		expect(replaceGeneratedBlock(missingEnd, "x")).toEqual({ status: "malformed", text: missingEnd });
		const reversed = `${BLOCK_END}\n${BLOCK_START}`;
		expect(replaceGeneratedBlock(reversed, "x").status).toBe("malformed");
	});

	it("extractGeneratedBlock", () => {
		expect(extractGeneratedBlock(`a\n${BLOCK_START}\n  obsah \n${BLOCK_END}`)).toBe("obsah");
		expect(extractGeneratedBlock("bez bloku")).toBeNull();
	});
});
