import { describe, expect, it } from "vitest";
import { getSource, isSourceId } from "../../src/evidence/sources";
import { DRUG_INTERACTIONS, MEDICATIONS, WADA_NOTES, drugWarnings, interactionsFor, ownCombinations } from "../../src/calc/supplementSafety";
import { runPacePoints } from "../../src/calc/performance";
import { comparePeriods, TRIAL_MIN_SESSIONS } from "../../src/calc/supplementTrial";
import { addDays } from "../../src/model/dates";
import type { WorkoutNote } from "../../src/model/types";
import { catalogSupplement } from "../../src/seed/supplements";

describe("interakce s léky", () => {
	it("každý řádek míří na látky z katalogu a má ověřený zdroj; každá skupina léků má aspoň jeden řádek", () => {
		for (const row of DRUG_INTERACTIONS) {
			for (const s of row.substances) expect(catalogSupplement(s), s).toBeDefined();
			expect(row.sources.length).toBeGreaterThan(0);
			for (const id of row.sources) {
				expect(isSourceId(id), id).toBe(true);
				expect(getSource(id).url, id).toBeDefined();
			}
		}
		for (const m of MEDICATIONS) expect(DRUG_INTERACTIONS.some((r) => r.medications.includes(m)), m).toBe(true);
	});

	it("upozorní jen na kombinaci vlastního suplementu a vlastního léku", () => {
		expect(drugWarnings(["iron", "creatine"], [])).toEqual([]);
		expect(drugWarnings(["creatine"], ["antibiotics"])).toEqual([]);
		const hits = drugWarnings(["iron", "zinc", "methylene_blue"], ["antibiotics", "antidepressants"]);
		expect(hits.map((h) => h.substances)).toEqual([["methylene_blue"], ["iron", "zinc"]]);
		expect(hits[0]!.interaction.avoid).toBe(true);
		// Železo a štítná žláza: jiný řádek než antibiotika.
		expect(drugWarnings(["iron"], ["thyroid"])).toHaveLength(1);
		expect(interactionsFor("iron").map((i) => i.medications[0])).toEqual(["thyroid", "antibiotics"]);
	});
});

describe("kombinace mezi vlastními suplementy", () => {
	it("najde dvojice z tabulky Co nebrat spolu", () => {
		expect(ownCombinations(["iron"])).toEqual([]);
		expect(ownCombinations(["iron", "calcium"]).map((c) => c.combination.id)).toEqual(["iron-calcium"]);
		expect(ownCombinations(["iron", "calcium", "zinc"]).map((c) => c.combination.id)).toEqual(["iron-calcium", "zinc-iron", "zinc-calcium"]);
		const stimulants = ownCombinations(["preworkout", "synephrine", "yohimbine"]);
		expect(stimulants.map((c) => c.combination.id)).toEqual(["stimulants"]);
		expect(stimulants[0]!.sides).toEqual([["preworkout"], ["synephrine", "yohimbine"]]);
		// Synefrin s johimbinem bez kofeinu tabulka nepokrývá.
		expect(ownCombinations(["synephrine", "yohimbine"])).toEqual([]);
	});
});

describe("antidoping", () => {
	it("poznámky WADA jen u látek z katalogu", () => {
		for (const id of Object.keys(WADA_NOTES)) expect(catalogSupplement(id), id).toBeDefined();
	});
});

describe("osobní test s výkonem", () => {
	const since = "2026-08-29";
	const today = "2026-09-27";

	it("tempo běhu po dnech: víc běhů za den se sečte", () => {
		const run = (date: string, km: number, sec: number): WorkoutNote => ({ forma: "workout", schema: 1, date, sport: "run", source: "manual", blocks: [], pain: [], run: { distance_km: km, moving_time_s: sec } });
		// 5 km za 25 min + 5 km za 30 min = 10 km za 3300 s → 330 s/km
		expect(runPacePoints([run("2026-09-01", 5, 1500), run("2026-09-01", 5, 1800), run("2026-09-03", 4, 1200)])).toEqual([
			{ date: "2026-09-01", value: 330 },
			{ date: "2026-09-03", value: 300 },
		]);
	});

	it("u výkonu stačí 3 měření v každém období", () => {
		const points = [-20, -10, -3, 2, 9, 16].map((d, i) => ({ date: addDays(since, d), value: i < 3 ? 100 : 104 }));
		expect(comparePeriods(points, since, today, TRIAL_MIN_SESSIONS)).toMatchObject({ ready: true, before: 100, during: 104, diff: 4, samplesBefore: 3, samplesDuring: 3 });
		expect(comparePeriods(points.slice(1), since, today, TRIAL_MIN_SESSIONS)).toMatchObject({ ready: false, samplesBefore: 2 });
	});
});
