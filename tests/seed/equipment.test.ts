import { describe, expect, it } from "vitest";
import { EQUIPMENT } from "../../src/model/constants";
import { parseExercise } from "../../src/model/parse";
import { exerciseToFrontmatter } from "../../src/model/serialize";
import { EXERCISE_ROWS } from "../../src/seed/exerciseData";
import { EXERCISE_EQUIPMENT } from "../../src/seed/exerciseEquipment";
import { seedExercises } from "../../src/seed/exercises";
import { withBuiltinTexts } from "../../src/seed/lookup";

describe("vybavení cviků", () => {
	it("každý vestavěný cvik má vybavení a jen známá id bez opakování", () => {
		const ids = new Set(EXERCISE_ROWS.map((r) => r.id));
		expect(Object.keys(EXERCISE_EQUIPMENT).sort()).toEqual([...ids].sort());
		for (const [id, list] of Object.entries(EXERCISE_EQUIPMENT)) {
			expect(list.length, id).toBeGreaterThan(0);
			expect(new Set(list).size, id).toBe(list.length);
			for (const e of list) expect(EQUIPMENT, `${id}: ${e}`).toContain(e);
		}
	});

	it("každé vybavení má aspoň jeden cvik", () => {
		const used = new Set(Object.values(EXERCISE_EQUIPMENT).flat());
		for (const e of EQUIPMENT) expect(used.has(e), e).toBe(true);
	});

	it("vestavěná poznámka nese vybavení a projde zápisem i čtením", () => {
		const bench = seedExercises("en").find((e) => e.name === "Bench press")!;
		expect(bench.equipment).toEqual(["barbell", "bench", "rack"]);
		const back = parseExercise(exerciseToFrontmatter(bench))!;
		expect(back.equipment).toEqual(["barbell", "bench", "rack"]);
	});

	it("neznámé vybavení se zahodí; prázdný seznam = údaj chybí", () => {
		expect(parseExercise({ forma: "exercise", name: "Vlastní", equipment: ["cable", "trampolína"] })!.equipment).toEqual(["cable"]);
		expect(parseExercise({ forma: "exercise", name: "Vlastní", equipment: [] })!.equipment).toBeUndefined();
	});

	it("starší poznámka bez vybavení ho dostane z vestavěné knihovny, vlastní údaj má přednost", () => {
		const old = parseExercise({ forma: "exercise", name: "Leg curl" })!;
		expect(withBuiltinTexts(old).equipment).toEqual(["leg_curl_machine"]);
		const own = parseExercise({ forma: "exercise", name: "Leg curl", equipment: ["band"] })!;
		expect(withBuiltinTexts(own).equipment).toEqual(["band"]);
		expect(withBuiltinTexts(parseExercise({ forma: "exercise", name: "Můj cvik" })!).equipment).toBeUndefined();
	});
});
