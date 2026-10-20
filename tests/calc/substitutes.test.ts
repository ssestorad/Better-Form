import { describe, expect, it } from "vitest";
import { substitutes } from "../../src/calc/substitutes";
import type { ExerciseNote } from "../../src/model/types";
import { seedExercises } from "../../src/seed/exercises";

function ex(name: string, partial: Partial<ExerciseNote>): ExerciseNote {
	return {
		forma: "exercise",
		schema: 1,
		name,
		category: "strength",
		kind: "grind",
		measure: "reps_kg",
		muscles: { primary: [], secondary: [] },
		aliases: [],
		...partial,
	};
}

describe("náhrada cviku", () => {
	const bench = ex("Bench", { muscles: { primary: ["chest"], secondary: ["triceps", "shoulders"] }, equipment: ["barbell", "bench", "rack"] });

	it("pořadí podle skóre ručně: 2 × shoda hlavních + shoda vedlejších + 0,5 za jiné vybavení", () => {
		const library = [
			bench,
			// 2 × 1 + 1 + 0 = 3 (stejné vybavení)
			ex("Decline", { muscles: { primary: ["chest"], secondary: ["triceps", "shoulders"] }, equipment: ["rack", "bench", "barbell"] }),
			// 2 × 1 + 1 + 0,5 = 3,5
			ex("Jednoručky", { muscles: { primary: ["chest"], secondary: ["triceps", "shoulders"] }, equipment: ["dumbbell", "bench"] }),
			// 2 × 1 + 2·2/5 = 0,8 + 0,5 = 3,3
			ex("Kliky", { category: "calisthenics", muscles: { primary: ["chest"], secondary: ["triceps", "shoulders", "abs"] }, equipment: ["none"] }),
			// 2 × 2·1/3 ≈ 1,33 + 2·1/3 ≈ 0,67 + 0,5 = 2,5
			ex("Dipy", { category: "calisthenics", muscles: { primary: ["triceps", "chest"], secondary: ["shoulders"] }, equipment: ["dip_bars"] }),
			// bez společného hlavního svalu
			ex("Tricepsy", { muscles: { primary: ["triceps"], secondary: ["chest"] }, equipment: ["cable"] }),
			// kardio se silovým cvikem nemíchá
			ex("Veslo", { category: "cardio", muscles: { primary: ["chest", "lats"], secondary: [] }, equipment: ["rowing_machine"] }),
		];
		const result = substitutes(bench, library);
		expect(result.map((s) => s.exercise.name)).toEqual(["Jednoručky", "Kliky", "Decline", "Dipy"]);
		expect(result[0]!.otherEquipment).toBe(true);
		expect(result[2]!.otherEquipment).toBe(false);
		expect(result[3]!.shared).toEqual(["chest"]);
		expect(substitutes(bench, library, 2)).toHaveLength(2);
	});

	it("z každé sady vybavení jen nejlepší cvik", () => {
		const library = [
			ex("Kliky", { category: "calisthenics", muscles: { primary: ["chest"], secondary: ["triceps", "shoulders", "abs"] }, equipment: ["none"] }),
			// stejné vybavení jako kliky, vyšší skóre (3,5) → kliky vypadnou
			ex("Kliky na kolenou", { category: "calisthenics", muscles: { primary: ["chest"], secondary: ["triceps", "shoulders"] }, equipment: ["none"] }),
			ex("Jednoručky", { muscles: { primary: ["chest"], secondary: ["triceps", "shoulders"] }, equipment: ["bench", "dumbbell"] }),
		];
		expect(substitutes(bench, library).map((s) => s.exercise.name)).toEqual(["Jednoručky", "Kliky na kolenou"]);
	});

	it("cvik bez svalů nemá náhradu", () => {
		expect(substitutes(ex("Vlastní", {}), [bench])).toEqual([]);
	});

	it("vestavěná knihovna: bench press nahradí jiným vybavením, nikdy sám sebou", () => {
		const library = seedExercises("en");
		const benchPress = library.find((e) => e.name === "Bench press")!;
		const result = substitutes(benchPress, library);
		const names = result.map((s) => s.exercise.name);
		expect(result).toHaveLength(5);
		expect(names).not.toContain("Bench press");
		expect(names).toContain("Dumbbell bench press");
		expect(new Set(result.map((s) => [...(s.exercise.equipment ?? [])].sort().join())).size).toBe(5);
		expect(result.every((s) => s.otherEquipment && s.shared.includes("chest"))).toBe(true);
	});
});
