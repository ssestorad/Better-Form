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
import { DEFAULT_FOLDERS, LEGACY_FOLDERS } from "../../src/settings/settings";

describe("cesty", () => {
	it("normalizeVaultPath", () => {
		expect(normalizeVaultPath("\\Forma\\\\Deník/ ")).toBe("Forma/Deník");
		expect(normalizeVaultPath("./Forma/./Cíle/")).toBe("Forma/Cíle");
		expect(normalizeVaultPath("  ")).toBe("");
	});

	it("výchozí struktura podle SPEC kap. 3 – nový vault anglicky", () => {
		expect(folderPath(DEFAULT_FOLDERS, "exercises")).toBe("Better Form/Library/Exercises");
		expect(dayNotePath(DEFAULT_FOLDERS, "2026-09-28")).toBe("Better Form/Journal/2026/2026-09-28.md");
		expect(workoutNotePath(DEFAULT_FOLDERS, "2026-09-28", "Gym – Push")).toBe("Better Form/Workouts/2026/2026-09-28 Gym – Push.md");
		expect(namedNotePath(DEFAULT_FOLDERS, "exercises", "Bench press")).toBe("Better Form/Library/Exercises/Bench press.md");
	});

	it("starší vault s českými složkami (LEGACY_FOLDERS) dál funguje", () => {
		expect(dayNotePath(LEGACY_FOLDERS, "2026-09-28")).toBe("Forma/Deník/2026/2026-09-28.md");
	});

	it("allFolderPaths obsahuje i nadřazené složky, od kořene", () => {
		const paths = allFolderPaths(DEFAULT_FOLDERS);
		expect(paths[0]).toBe("Better Form");
		expect(paths.indexOf("Better Form/Library")).toBeLessThan(paths.indexOf("Better Form/Library/Exercises"));
		expect([...paths].sort()).toEqual(
			[
				"Better Form",
				"Better Form/Equipment",
				"Better Form/Export",
				"Better Form/Goals",
				"Better Form/Health",
				"Better Form/Health/Pain",
				"Better Form/Journal",
				"Better Form/Library",
				"Better Form/Library/Exercises",
				"Better Form/Library/Programs",
				"Better Form/Library/Supplements",
				"Better Form/Library/Workout templates",
				"Better Form/Plan",
				"Better Form/Summaries",
				"Better Form/Tests",
				"Better Form/Workouts",
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
