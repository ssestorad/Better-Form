import { describe, expect, it } from "vitest";
import { splitRecommendations } from "../../src/rules/engine";
import type { RecommendationLevel } from "../../src/rules/types";

const r = (level: RecommendationLevel) => ({ level });

describe("rozdělení doporučení na Dnes", () => {
	it("bez varování ukáže jedno doporučení", () => {
		const { main, rest } = splitRecommendations([r("suggest"), r("info")]);
		expect([main.length, rest.length]).toEqual([1, 1]);
		expect(main[0]!.level).toBe("suggest");
	});

	it("všechna varování zůstávají vidět i mimo pořadí", () => {
		const { main, rest } = splitRecommendations([r("suggest"), r("warn"), r("info"), r("warn")]);
		expect(main.map((x) => x.level)).toEqual(["warn", "warn"]);
		expect(rest).toHaveLength(2);
	});

	it("prázdný seznam", () => {
		expect(splitRecommendations([])).toEqual({ main: [], rest: [] });
	});
});
