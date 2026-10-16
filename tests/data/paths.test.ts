import { describe, expect, it } from "vitest";
import {
	allFolderPaths,
	dayNotePath,
	folderPath,
	namedNotePath,
	normalizeVaultPath,
	sanitizeFileName,
	uniquePath,
	workoutNotePath,
} from "../../src/data/paths";
import { DEFAULT_FOLDERS } from "../../src/settings/settings";

describe("cesty", () => {
	it("normalizeVaultPath", () => {
		expect(normalizeVaultPath("\\Forma\\\\Deník/ ")).toBe("Forma/Deník");
		expect(normalizeVaultPath("./Forma/./Cíle/")).toBe("Forma/Cíle");
		expect(normalizeVaultPath("  ")).toBe("");
	});

	it("výchozí struktura podle SPEC kap. 3", () => {
		expect(folderPath(DEFAULT_FOLDERS, "exercises")).toBe("Forma/Knihovna/Cviky");
		expect(dayNotePath(DEFAULT_FOLDERS, "2026-09-28")).toBe("Forma/Deník/2026/2026-09-28.md");
		expect(workoutNotePath(DEFAULT_FOLDERS, "2026-09-28", "Posilovna – Push")).toBe(
			"Forma/Tréninky/2026/2026-09-28 Posilovna – Push.md",
		);
		expect(namedNotePath(DEFAULT_FOLDERS, "exercises", "Bench press")).toBe(
			"Forma/Knihovna/Cviky/Bench press.md",
		);
	});

	it("allFolderPaths obsahuje i nadřazené složky, od kořene", () => {
		const paths = allFolderPaths(DEFAULT_FOLDERS);
		expect(paths[0]).toBe("Forma");
		expect(paths.indexOf("Forma/Knihovna")).toBeLessThan(paths.indexOf("Forma/Knihovna/Cviky"));
		expect([...paths].sort()).toEqual(
			[
				"Forma",
				"Forma/Cíle",
				"Forma/Deník",
				"Forma/Export",
				"Forma/Knihovna",
				"Forma/Knihovna/Cviky",
				"Forma/Knihovna/Suplementy",
				"Forma/Knihovna/Programy",
				"Forma/Knihovna/Šablony tréninků",
				"Forma/Plán",
				"Forma/Souhrny",
				"Forma/Testy",
				"Forma/Tréninky",
				"Forma/Vybavení",
				"Forma/Zdraví",
				"Forma/Zdraví/Bolesti",
			].sort(),
		);
	});

	it("sanitizeFileName odstraní zakázané znaky", () => {
		expect(sanitizeFileName('Push: den #1 [A]/B?')).toBe("Push den 1 A B");
		expect(sanitizeFileName("  ...  ")).toBe("Bez názvu");
		expect(sanitizeFileName("Konec tečkou.")).toBe("Konec tečkou");
		expect(sanitizeFileName("x".repeat(200))).toHaveLength(120);
	});

	it("uniquePath přidá pořadové číslo", () => {
		const existing = new Set(["A/X.md", "A/X (2).md"]);
		expect(uniquePath("A/Y.md", (p) => existing.has(p))).toBe("A/Y.md");
		expect(uniquePath("A/X.md", (p) => existing.has(p))).toBe("A/X (3).md");
		expect(uniquePath("A.b/X", (p) => p === "A.b/X")).toBe("A.b/X (2)");
	});
});
