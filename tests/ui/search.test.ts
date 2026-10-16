import { describe, expect, it } from "vitest";
import { normalizeSearch, searchExercises, type ExerciseOption } from "../../src/ui/workout/search";

const OPTIONS: ExerciseOption[] = [
	{ name: "Dřepy", aliases: ["Air squat", "Dřep"], category: "calisthenics" },
	{ name: "Dřep s činkou", aliases: ["Back squat", "Squat"], category: "strength" },
	{ name: "Bench press", aliases: ["Tlak na lavici"], category: "strength" },
	{ name: "Kliky", aliases: ["Push-up"], category: "calisthenics" },
	{ name: "Goblet dřep", aliases: ["Goblet squat"], category: "kettlebell" },
];

const names = (query: string, preferred: ExerciseOption["category"][] = []) =>
	searchExercises(OPTIONS, query, preferred).map((m) => m.option.name);

describe("vyhledávání cviků", () => {
	it("bez diakritiky a velikosti písmen", () => {
		expect(normalizeSearch("Dřepy S Činkou")).toBe("drepy s cinkou");
		// „Dřepy“ mají alias „Dřep“ = přesná shoda; pak začátek názvu; pak začátek slova
		expect(names("drep")).toEqual(["Dřepy", "Dřep s činkou", "Goblet dřep"]);
	});

	it("preferovaná kategorie při stejném skóre", () => {
		expect(names("dre", ["strength"])).toEqual(["Dřep s činkou", "Dřepy", "Goblet dřep"]);
		expect(names("dre", ["calisthenics"])).toEqual(["Dřepy", "Dřep s činkou", "Goblet dřep"]);
		expect(names("squat", ["kettlebell"])).toEqual(["Dřep s činkou", "Goblet dřep", "Dřepy"]);
	});

	it("přes alias, s informací, kterým aliasem", () => {
		expect(searchExercises(OPTIONS, "tlak")).toEqual([{ option: OPTIONS[2], via: "Tlak na lavici" }]);
		expect(names("push")).toEqual(["Kliky"]);
	});

	it("prázdný dotaz = vše abecedně, nic nenalezeno = prázdné", () => {
		expect(names("")).toEqual(["Bench press", "Dřep s činkou", "Dřepy", "Goblet dřep", "Kliky"]);
		expect(names("xyz")).toEqual([]);
	});
});
