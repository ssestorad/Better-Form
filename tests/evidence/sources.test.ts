import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EVIDENCE_LEVELS } from "../../src/model/constants";
import { getSource, isSourceId, SOURCE_PARTS, SOURCES } from "../../src/evidence/sources";

describe("katalog zdrojů", () => {
	const entries = Object.entries(SOURCES);

	it("každý zdroj má krátký popisek, citaci a platný štítek", () => {
		for (const [id, source] of entries) {
			expect(source.short.trim(), id).not.toBe("");
			expect(source.citation.trim(), id).not.toBe("");
			if (source.evidence !== null) expect(EVIDENCE_LEVELS, id).toContain(source.evidence);
		}
	});

	it("krátké popisky jsou jednoznačné", () => {
		const shorts = entries.map(([, s]) => s.short);
		expect(new Set(shorts).size).toBe(shorts.length);
	});

	it("odkazy jsou https", () => {
		for (const [id, source] of entries) {
			if ("url" in source) expect(source.url, id).toMatch(/^https:\/\//);
		}
	});

	it("heuristika je označená jako praxe, ne výzkum", () => {
		expect(getSource("practice").evidence).toBe("practice");
	});

	it("isSourceId", () => {
		expect(isSourceId("foster2001")).toBe(true);
		expect(isSourceId("vymysleny2099")).toBe(false);
		expect(isSourceId("toString")).toBe(false);
	});

	it("ID se mezi částmi katalogu neopakují (pozdější část by dřívější tiše přepsala)", () => {
		const ids = SOURCE_PARTS.flatMap((part) => Object.keys(part));
		const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
		expect(repeated).toEqual([]);
		expect(ids).toHaveLength(entries.length);
	});
});

// SPEC.md není v repozitáři (.gitignore) – kontrola běží jen lokálně, kde soubor je.
const SPEC_PATH = fileURLToPath(new URL("../../SPEC.md", import.meta.url));

describe.skipIf(!existsSync(SPEC_PATH))("katalog zdrojů a SPEC kap. 14", () => {
	const spec = existsSync(SPEC_PATH) ? readFileSync(SPEC_PATH, "utf8") : "";
	const chapter = spec.slice(spec.indexOf("\n## 14. Zdroje"));

	it("kapitola 14 ve SPEC existuje", () => {
		expect(chapter.length).toBeGreaterThan(1000);
	});

	it("každý zdroj s DOI je uvedený ve SPEC kap. 14 – nový zdroj se přidává na obě místa", () => {
		const missing = Object.entries(SOURCES)
			.filter(([, source]) => "url" in source && source.url.startsWith("https://doi.org/"))
			.filter(([, source]) => "url" in source && !chapter.toLowerCase().includes(source.url.toLowerCase()))
			.map(([id]) => id);
		expect(missing).toEqual([]);
	});
});
