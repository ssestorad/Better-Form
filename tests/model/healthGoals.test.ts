import { describe, expect, it } from "vitest";
import { exerciseRecords, recordOneRm } from "../../src/calc/records";
import { parseGoal, parseNorm, parseNote, parsePain } from "../../src/model/parse";
import { goalToFrontmatter, normToFrontmatter, painToFrontmatter } from "../../src/model/serialize";
import type { GoalNote, NormNote, PainNote } from "../../src/model/types";
import { painText } from "../../src/ui/body/text";
import { formatSigned } from "../../src/ui/format";

describe("bolest (4.6)", () => {
	const pain: PainNote = {
		forma: "pain",
		schema: 1,
		name: "Pravé koleno",
		muscle: "quads",
		side: "right",
		level: 3,
		since: "2026-09-20",
		trigger: "běh z kopce",
		status: "improving",
		history: [
			{ date: "2026-09-20", level: 4 },
			{ date: "2026-09-28", level: 3 },
		],
	};

	it("zápis a načtení vrátí stejná data", () => {
		expect(parsePain(painToFrontmatter(pain))).toEqual(pain);
		expect(parseNote(painToFrontmatter(pain))).toEqual(pain);
	});

	it("tolerantní čtení: neplatné záznamy historie zahodí, chybějící údaje dopočítá", () => {
		const parsed = parsePain({
			forma: "pain",
			name: "Loket",
			muscle: "triceps",
			side: "nahoře",
			history: [{ date: "2026-09-28", level: 2 }, { date: "nesmysl", level: 3 }, { date: "2026-09-25", level: 14 }, { date: "2026-09-20", level: "4" }],
		})!;
		expect(parsed.history).toEqual([
			{ date: "2026-09-20", level: 4 },
			{ date: "2026-09-28", level: 2 },
		]);
		expect(parsed).toMatchObject({ since: "2026-09-20", level: 2, status: "active" });
		expect(parsed.side).toBeUndefined();
	});

	it("bez názvu, partie nebo začátku se poznámka odmítne", () => {
		expect(parsePain({ forma: "pain", muscle: "quads", since: "2026-09-20" })).toBeNull();
		expect(parsePain({ forma: "pain", name: "X", muscle: "koleno", since: "2026-09-20" })).toBeNull();
		expect(parsePain({ forma: "pain", name: "X", muscle: "quads" })).toBeNull();
	});
});

describe("cíl (4.6)", () => {
	const goal: GoalNote = {
		forma: "goal",
		schema: 1,
		name: "Bench press 100 kg",
		type: "lift_1rm",
		target: 100,
		exercise: "Bench press",
		created: "2026-09-01",
		deadline: "2026-12-31",
		start_value: 92.5,
		status: "active",
	};

	it("zápis a načtení vrátí stejná data; cvik je wikiodkaz", () => {
		const fm = goalToFrontmatter(goal);
		expect(fm.exercise).toBe("[[Bench press]]");
		expect(parseGoal(fm)).toEqual(goal);
	});

	it("norma jako cíl nepotřebuje cílovou hodnotu; ostatní typy ano", () => {
		const norm: GoalNote = { forma: "goal", schema: 1, name: "Splnit testy", type: "norm", norm: "Fyzické testy", created: "2026-09-01", status: "active" };
		expect(parseGoal(goalToFrontmatter(norm))).toEqual(norm);
		expect(parseGoal({ forma: "goal", name: "X", type: "run_time", created: "2026-09-01" })).toBeNull();
		expect(parseGoal({ forma: "goal", name: "X", type: "neznámý", target: 5, created: "2026-09-01" })).toBeNull();
		expect(parseGoal({ forma: "goal", name: "X", type: "reps_max", target: 5 })).toBeNull();
	});
});

describe("norma (4.6)", () => {
	const norm: NormNote = {
		forma: "norm",
		schema: 1,
		name: "Fyzické testy",
		items: [
			{ exercise: "Kliky", kind: "reps", time_limit_s: 120, rows: [{ value: 30 }, { sex: "male", age_from: 30, age_to: 39, value: 36 }] },
			{ exercise: "Běh", kind: "run_time", distance_km: 3, rows: [{ sex: "female", value: 960 }] },
		],
	};

	it("zápis a načtení vrátí stejná data", () => {
		const fm = normToFrontmatter(norm);
		expect((fm.items as { exercise: string }[])[0]!.exercise).toBe("[[Kliky]]");
		expect(parseNorm(fm)).toEqual(norm);
	});

	it("disciplína bez platného řádku se zahodí", () => {
		const parsed = parseNorm({ forma: "norm", name: "N", items: [{ exercise: "Kliky", kind: "reps", rows: [{ value: 0 }] }, { exercise: "Shyby", kind: "reps", rows: [{ value: "8" }] }] })!;
		expect(parsed.items).toEqual([{ exercise: "Shyby", kind: "reps", rows: [{ value: 8 }] }]);
	});
});

describe("drobnosti k fázi 4", () => {
	it("1RM u cviku s vlastní vahou jen ze série s přívažkem", () => {
		const pullUp = { name: "Shyby", kind: "grind" as const, measure: "reps_bw" as const, bodyweight_fraction: 0.95 };
		expect(recordOneRm({ reps: 6 }, pullUp, 80)).toBeNull();
		expect(recordOneRm({ reps: 6, added_kg: -10 }, pullUp, 80)).toBeNull();
		// (80 × 0,95 + 10) × (1 + 3/30) = 94,6
		expect(recordOneRm({ reps: 3, added_kg: 10 }, pullUp, 80)).toBeCloseTo(94.6, 6);
		const records = exerciseRecords(
			[{ forma: "workout", schema: 1, date: "2026-09-01", sport: "calisthenics", source: "manual", pain: [], blocks: [{ type: "sets", exercise: "Shyby", sets: [{ reps: 8 }] }] }],
			[],
			{ info: () => pullUp, bodyweightKg: 80 },
		);
		expect(records[0]!.oneRm).toBeUndefined();
		expect(records[0]!.maxReps!.value).toBe(8);
	});

	it("řádek bolesti v detailu partie", () => {
		expect(painText([])).toBe("Bez evidované bolesti.");
		expect(painText([{ name: "Koleno", level: 3, days: 10, seeProfessional: true }, { name: "Stehno", level: 1, days: 1, seeProfessional: false }])).toBe("Koleno 3/10 (10 dní) · Stehno 1/10 (1 den)");
	});

	it("typografické minus jen pro zobrazení", () => {
		expect(formatSigned(-6, 0)).toBe("−6");
		expect(formatSigned(12.5)).toBe("12,5");
		expect(formatSigned(-0.01)).toBe("0");
	});
});
