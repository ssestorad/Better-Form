import { describe, expect, it } from "vitest";
import { migrateFrontmatter, MIGRATIONS, type MigrationTable } from "../../src/data/migrations";
import { SCHEMA_VERSION } from "../../src/model/constants";

describe("migrateFrontmatter", () => {
	it("aktuální verze projde beze změny", () => {
		const input = { forma: "day", schema: SCHEMA_VERSION, date: "2026-09-28" };
		expect(migrateFrontmatter(input)).toEqual({ status: "current", data: input });
	});

	it("chybějící schema se bere jako verze 1", () => {
		const result = migrateFrontmatter({ forma: "workout", date: "2026-09-28" }, {}, 1);
		expect(result.status).toBe("current");
	});

	it("novější verze se označí a nemigruje", () => {
		const input = { forma: "day", schema: SCHEMA_VERSION + 1 };
		expect(migrateFrontmatter(input)).toEqual({ status: "newer", data: input, version: SCHEMA_VERSION + 1 });
	});

	it("neplatná verze nebo typ", () => {
		expect(migrateFrontmatter({ forma: "day", schema: "jedna" }).status).toBe("invalid");
		expect(migrateFrontmatter({ forma: "day", schema: 0 }).status).toBe("invalid");
		expect(migrateFrontmatter({ forma: "neznamy" }).status).toBe("invalid");
		expect(migrateFrontmatter({ schema: 1 }).status).toBe("invalid");
	});

	it("provede kroky postupně a nezmění vstup", () => {
		const table: MigrationTable = {
			day: {
				1: (d) => ({ ...d, weight: undefined, body: { weight_kg: d.weight } }),
				2: (d) => ({ ...d, note_v3: true }),
			},
		};
		const input = { forma: "day", schema: 1, date: "2026-09-28", weight: 78 };
		const result = migrateFrontmatter(input, table, 3);
		expect(result).toEqual({
			status: "migrated",
			from: 1,
			data: {
				forma: "day",
				schema: 3,
				date: "2026-09-28",
				weight: undefined,
				body: { weight_kg: 78 },
				note_v3: true,
			},
		});
		expect(input).toEqual({ forma: "day", schema: 1, date: "2026-09-28", weight: 78 });
	});

	it("chybějící krok migrace je chyba", () => {
		const result = migrateFrontmatter({ forma: "program", schema: 1 }, { program: {} }, 2);
		expect(result.status).toBe("invalid");
	});

	it("každý typ má kroky pro všechny starší verze", () => {
		for (const [type, steps] of Object.entries(MIGRATIONS)) {
			for (let v = 1; v < SCHEMA_VERSION; v++) {
				expect(steps?.[v], `${type} ${v}→${v + 1}`).toBeTypeOf("function");
			}
		}
	});
});
