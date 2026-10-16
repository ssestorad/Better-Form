import { describe, expect, it } from "vitest";
import {
	asClockTime,
	asIsoDate,
	asNumber,
	parseBlock,
	parseDay,
	parseExercise,
	parseNote,
	parseProgram,
	parseProgramTarget,
	parseTemplate,
	parseTest,
	parseWorkout,
} from "../../src/model/parse";
import { programToFrontmatter } from "../../src/model/serialize";

describe("pomocné převody", () => {
	it("asNumber přijme číslo i řetězec s desetinnou čárkou", () => {
		expect(asNumber(78.4)).toBe(78.4);
		expect(asNumber("78,4")).toBe(78.4);
		expect(asNumber(" 62 ")).toBe(62);
		expect(asNumber("")).toBeUndefined();
		expect(asNumber("abc")).toBeUndefined();
		expect(asNumber(null)).toBeUndefined();
		expect(asNumber(Number.NaN)).toBeUndefined();
	});

	it("asIsoDate přijme text i objekt Date z YAML (UTC půlnoc)", () => {
		expect(asIsoDate("2026-09-28")).toBe("2026-09-28");
		expect(asIsoDate(new Date(Date.UTC(2026, 8, 28)))).toBe("2026-09-28");
		expect(asIsoDate("2026-02-30")).toBeUndefined();
		expect(asIsoDate("28. 9. 2026")).toBeUndefined();
	});
});

describe("parseDay (SPEC 4.1)", () => {
	const specExample = {
		forma: "day",
		schema: 1,
		date: "2026-09-28",
		sleep: {
			bedtime: "23:10",
			sleep_onset: "23:25",
			wake: "06:40",
			duration_min: 435,
			quality: 4,
			awakenings: 1,
			morning_feeling: 3,
		},
		check_in: { fatigue: 3, soreness: 3, mood: 4, stress: 3 },
		hrv: { rmssd_ms: 62, resting_hr: 52, elonga_readiness: 71 },
		body: { weight_kg: 78.4, body_fat_pct: null },
		notes: "",
	};

	it("načte příklad ze specifikace", () => {
		expect(parseDay(specExample)).toEqual({
			forma: "day",
			schema: 1,
			date: "2026-09-28",
			sleep: {
				bedtime: "23:10",
				sleep_onset: "23:25",
				wake: "06:40",
				duration_min: 435,
				quality: 4,
				awakenings: 1,
				morning_feeling: 3,
			},
			check_in: { fatigue: 3, soreness: 3, mood: 4, stress: 3 },
			hrv: { rmssd_ms: 62, resting_hr: 52, elonga_readiness: 71 },
			body: { weight_kg: 78.4 },
		});
	});

	it("bez data poznámku odmítne", () => {
		expect(parseDay({ forma: "day", sleep: {} })).toBeNull();
	});

	it("chybějící sekce a schema doplní prázdné / aktuální", () => {
		expect(parseDay({ forma: "day", date: "2026-09-28" })).toEqual({
			forma: "day",
			schema: 1,
			date: "2026-09-28",
			sleep: {},
			check_in: {},
			hrv: {},
			body: {},
		});
	});

	it("čas přečtený parserem YAML 1.1 jako číslo (16:54 → 1014) převede zpět", () => {
		// 16 × 60 + 54 = 1014; 1 × 60 = 60
		expect(asClockTime(1014)).toBe("16:54");
		expect(asClockTime(60)).toBe("01:00");
		expect(asClockTime(0)).toBe("00:00");
		expect(asClockTime(1440)).toBeUndefined();
		expect(asClockTime(12.5)).toBeUndefined();
	});

	it("normalizuje čas a zahodí neplatný", () => {
		const day = parseDay({ forma: "day", date: "2026-09-28", sleep: { bedtime: "7:05", wake: "25:00" } });
		expect(day?.sleep).toEqual({ bedtime: "07:05" });
	});
});

describe("parseWorkout (SPEC 4.2)", () => {
	const specExample = {
		forma: "workout",
		schema: 1,
		date: "2026-09-28",
		start: "17:30",
		sport: "strength",
		title: "Push",
		template: "[[Push day]]",
		program: "[[Základ 4]]",
		duration_min: 62,
		rpe: 7,
		source: "manual",
		strava_id: null,
		blocks: [
			{
				type: "sets",
				exercise: "[[Bench press]]",
				sets: [
					{ reps: 6, kg: 80, rir: 2 },
					{ reps: 6, kg: 80, rir: 1 },
				],
			},
			{ type: "hold", exercise: "[[L-sit]]", sets: [{ sec: 15 }, { sec: 12 }] },
			{ type: "emom", minutes: 10, exercise: "[[Kettlebell swing]]", reps_per_min: 15, kg: 24 },
			{ type: "sets", exercise: "[[Shyby]]", sets: [{ reps: 6, added_kg: 10, rir: 2 }] },
		],
		pain: [],
		notes: "",
	};

	it("načte příklad ze specifikace, odkazy bez závorek", () => {
		expect(parseWorkout(specExample)).toEqual({
			forma: "workout",
			schema: 1,
			date: "2026-09-28",
			start: "17:30",
			sport: "strength",
			title: "Push",
			template: "Push day",
			program: "Základ 4",
			duration_min: 62,
			rpe: 7,
			source: "manual",
			blocks: [
				{
					type: "sets",
					exercise: "Bench press",
					sets: [
						{ reps: 6, kg: 80, rir: 2 },
						{ reps: 6, kg: 80, rir: 1 },
					],
				},
				{ type: "hold", exercise: "L-sit", sets: [{ sec: 15 }, { sec: 12 }] },
				{ type: "emom", exercise: "Kettlebell swing", minutes: 10, reps_per_min: 15, kg: 24 },
				{ type: "sets", exercise: "Shyby", sets: [{ reps: 6, added_kg: 10, rir: 2 }] },
			],
			pain: [],
		});
	});

	it("běh ze Stravy", () => {
		const workout = parseWorkout({
			forma: "workout",
			date: "2026-09-28",
			sport: "run",
			source: "strava",
			strava_id: 12345,
			run: {
				distance_km: 10.2,
				moving_time_s: 3310,
				avg_hr: 152,
				type: "easy",
				shoes: "[[Pegasus 40]]",
				hr_zone_s: [600, 1800, 700, 200, 10],
			},
		});
		expect(workout?.source).toBe("strava");
		expect(workout?.strava_id).toBe(12345);
		expect(workout?.run).toEqual({
			distance_km: 10.2,
			moving_time_s: 3310,
			avg_hr: 152,
			type: "easy",
			shoes: "Pegasus 40",
			hr_zone_s: [600, 1800, 700, 200, 10],
		});
		expect(workout?.blocks).toEqual([]);
	});

	it("neznámý sport = other, neplatné bloky a prázdné série vynechá", () => {
		const workout = parseWorkout({
			forma: "workout",
			date: "2026-09-28",
			sport: "curling",
			blocks: [
				{ type: "yoga", exercise: "[[X]]" },
				{ type: "sets", sets: [{ reps: 5 }] },
				{ type: "sets", exercise: "Dřepy", sets: [{ reps: 5 }, {}, "x"] },
			],
		});
		expect(workout?.sport).toBe("other");
		expect(workout?.blocks).toEqual([{ type: "sets", exercise: "Dřepy", sets: [{ reps: 5 }] }]);
	});
});

describe("rozcvičovací série", () => {
	it("warmup: true se zachová, jiná hodnota = pracovní série", () => {
		expect(
			parseBlock({
				type: "sets",
				exercise: "Bench press",
				sets: [
					{ reps: 10, kg: 40, warmup: true },
					{ reps: 6, kg: 80, warmup: false },
					{ reps: 6, kg: 80, warmup: "ano" },
					{ warmup: true },
				],
			}),
		).toEqual({
			type: "sets",
			exercise: "Bench press",
			sets: [
				{ reps: 10, kg: 40, warmup: true },
				{ reps: 6, kg: 80 },
				{ reps: 6, kg: 80 },
			],
		});
	});
});

describe("parseBlock – ostatní typy bloků", () => {
	it("AMRAP s více cviky", () => {
		expect(
			parseBlock({
				type: "amrap",
				minutes: 12,
				items: [{ exercise: "[[Kliky]]", reps: 10 }, { exercise: "[[Dřepy]]", reps: 15 }, { reps: 3 }],
				rounds: 5,
				extra_reps: 7,
				rpe: 8,
			}),
		).toEqual({
			type: "amrap",
			minutes: 12,
			items: [
				{ exercise: "Kliky", reps: 10 },
				{ exercise: "Dřepy", reps: 15 },
			],
			rounds: 5,
			extra_reps: 7,
			rpe: 8,
		});
	});

	it("žebřík, komplex, na čas", () => {
		expect(parseBlock({ type: "ladder", exercise: "Shyby", steps: [1, 2, 3, "4"] })).toEqual({
			type: "ladder",
			exercise: "Shyby",
			steps: [1, 2, 3, 4],
		});
		expect(
			parseBlock({ type: "complex", kg: 16, rounds: 5, items: [{ exercise: "Clean", reps: 2 }] }),
		).toEqual({ type: "complex", kg: 16, rounds: 5, items: [{ exercise: "Clean", reps: 2 }] });
		expect(parseBlock({ type: "timed", exercise: "Swing", sec: 300, reps: 100, kg: 24 })).toEqual({
			type: "timed",
			exercise: "Swing",
			sec: 300,
			reps: 100,
			kg: 24,
		});
	});

	it("blok bez povinných údajů odmítne", () => {
		expect(parseBlock({ type: "emom", exercise: "Swing", minutes: 10 })).toBeNull();
		expect(parseBlock({ type: "ladder", exercise: "Shyby", steps: [] })).toBeNull();
		expect(parseBlock({ type: "timed", exercise: "Swing" })).toBeNull();
	});
});

describe("parseExercise (SPEC 4.3)", () => {
	it("načte cvik a vynechá neznámé partie", () => {
		expect(
			parseExercise({
				forma: "exercise",
				schema: 1,
				name: "Kliky",
				category: "calisthenics",
				kind: "grind",
				measure: "reps_bw",
				muscles: { primary: ["chest"], secondary: ["triceps", "shoulders", "neck"] },
				bodyweight_fraction: 0.64,
				bodyweight_fraction_source: "ebben2011",
				aliases: ["Push-up", ""],
			}),
		).toEqual({
			bodyweight_fraction_source: "ebben2011",
			forma: "exercise",
			schema: 1,
			name: "Kliky",
			category: "calisthenics",
			kind: "grind",
			measure: "reps_bw",
			muscles: { primary: ["chest"], secondary: ["triceps", "shoulders"] },
			bodyweight_fraction: 0.64,
			aliases: ["Push-up"],
		});
	});
});

describe("parseTemplate (SPEC 4.4)", () => {
	it("cílová váha „z minula“ i číslo", () => {
		const template = parseTemplate({
			forma: "template",
			name: "Push day",
			sport: "strength",
			blocks: [
				{ type: "sets", exercise: "[[Bench press]]", sets: 3, reps: 6, kg: "last" },
				{ type: "sets", exercise: "Kliky", sets: 3, reps: 15 },
				{ type: "complex", kg: 16, rounds: 5, items: [{ exercise: "Clean", reps: 2 }] },
				{ type: "sets" },
			],
		});
		expect(template?.blocks).toEqual([
			{ type: "sets", exercise: "Bench press", sets: 3, reps: 6, kg: "last" },
			{ type: "sets", exercise: "Kliky", sets: 3, reps: 15 },
			{ type: "complex", kg: 16, rounds: 5, items: [{ exercise: "Clean", reps: 2 }] },
		]);
	});
});

describe("parseProgram (SPEC 4.5)", () => {
	it("načte příklad ze specifikace", () => {
		expect(
			parseProgram({
				forma: "program",
				schema: 1,
				name: "100 kliků denně",
				builtin: true,
				evidence: "practice",
				duration_weeks: null,
				days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
				items: [{ exercise: "[[Kliky]]", target: { daily_total: 100 } }],
				progression: { rule: "none" },
				retest_every_weeks: null,
				active_since: "2026-09-29",
			}),
		).toEqual({
			forma: "program",
			schema: 1,
			name: "100 kliků denně",
			builtin: true,
			evidence: "practice",
			days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
			items: [{ exercise: "Kliky", target: { kind: "daily_total", daily_total: 100 } }],
			progression: { rule: "none" },
			active: false,
			active_since: "2026-09-29",
		});
	});

	it("typ cíle odvodí z klíčů, nebo vezme z `kind`", () => {
		expect(parseProgramTarget({ sets: 3, reps: 10 })).toEqual({ kind: "sets_reps", sets: 3, reps: 10 });
		expect(parseProgramTarget({ sets: 4, pct_of_max: 60 })).toEqual({
			kind: "pct_of_max",
			sets: 4,
			pct_of_max: 60,
		});
		expect(parseProgramTarget({ time_s: 30, sets: 3 })).toEqual({ kind: "time", time_s: 30, sets: 3 });
		expect(parseProgramTarget({ distance_km: 5 })).toEqual({ kind: "distance", distance_km: 5 });
		expect(parseProgramTarget({ kind: "sets_reps", sets: 3, reps: 8, pct_of_max: 50 })).toEqual({
			kind: "sets_reps",
			sets: 3,
			reps: 8,
		});
		expect(parseProgramTarget({ reps: 8 })).toBeNull();
	});

	it("intervaly: typ z `steps`, výchozí 1 opakování, neplatné úseky vynechá", () => {
		expect(
			parseProgramTarget({
				warmup_s: 300,
				steps: [{ repeats: 7, work_s: 60, rest_s: 90 }, { work_s: 60 }, { rest_s: 30 }, { work_s: -5 }],
				cooldown_s: 300,
			}),
		).toEqual({
			kind: "intervals",
			warmup_s: 300,
			steps: [
				{ repeats: 7, work_s: 60, rest_s: 90 },
				{ repeats: 1, work_s: 60 },
			],
			cooldown_s: 300,
		});
		expect(parseProgramTarget({ kind: "intervals", steps: [] })).toBeNull();
	});

	it("žebřík, EMOM a série na maximum jen s výslovným `kind`", () => {
		expect(
			parseProgramTarget({ kind: "ladder", steps: [1, 2, 3, 2, 1], rounds: 2, rest_per_rep_s: 10, round_rest_s: 120 }),
		).toEqual({ kind: "ladder", steps: [1, 2, 3, 2, 1], rounds: 2, rest_per_rep_s: 10, round_rest_s: 120 });
		expect(parseProgramTarget({ kind: "ladder", open: true, start: 2, step: 2, rest_per_rep_s: 2.5 })).toEqual({
			kind: "ladder",
			open: true,
			start: 2,
			step: 2,
			rest_per_rep_s: 2.5,
		});
		expect(parseProgramTarget({ kind: "ladder" })).toBeNull();
		expect(parseProgramTarget({ kind: "emom", pct_of_max: 33.33, until_failure: true, max_minutes: 15 })).toEqual({
			kind: "emom",
			pct_of_max: 33.33,
			until_failure: true,
			max_minutes: 15,
		});
		expect(parseProgramTarget({ kind: "emom", minutes: 10 })).toBeNull();
		expect(parseProgramTarget({ kind: "max_sets", sets: 5, rest_s: 120 })).toEqual({ kind: "max_sets", sets: 5, rest_s: 120 });
		expect(parseProgramTarget({ kind: "max_sets" })).toBeNull();
	});

	it("rotace cviku v týdenním plánu a max_from", () => {
		const program = parseProgram({
			forma: "program",
			name: "Kliky",
			items: [
				{
					exercise: "[[Kliky]]",
					target: { kind: "emom", pct_of_max: 33.33, until_failure: true },
					max_from: ["[[Kliky]]", "[[Široké kliky]]"],
					schedule: [{ week: 2, exercise: "[[Široké kliky]]" }],
				},
			],
		});
		expect(program?.items[0]).toEqual({
			exercise: "Kliky",
			target: { kind: "emom", pct_of_max: 33.33, until_failure: true },
			max_from: ["Kliky", "Široké kliky"],
			schedule: [{ week: 2, exercise: "Široké kliky" }],
		});
		expect(parseProgram(programToFrontmatter(program!))).toEqual(program);
	});

	it("plán po týdnech: seřadí týdny, vynechá neplatné", () => {
		const program = parseProgram({
			forma: "program",
			name: "Běh",
			items: [
				{
					exercise: "[[Běh]]",
					target: { time_s: 600 },
					schedule: [
						{ week: 2, sessions: [{ time_s: 900 }, { distance_km: 3 }] },
						{ week: 1, target: { time_s: 600 } },
						{ week: 0, target: { time_s: 1 } },
						{ week: 3 },
					],
				},
			],
		});
		expect(program?.items[0]?.schedule).toEqual([
			{ week: 1, target: { kind: "time", time_s: 600 } },
			{
				week: 2,
				sessions: [
					{ kind: "time", time_s: 900 },
					{ kind: "distance", distance_km: 3 },
				],
			},
		]);
	});

	it("zdroje: jen platná ID z katalogu", () => {
		const program = parseProgram({ forma: "program", name: "X", sources: ["foster2001", "vymysleny2099", 5] });
		expect(program?.sources).toEqual(["foster2001"]);
	});

	it("bez dnů = všechny dny, bez štítku = praxe", () => {
		const program = parseProgram({ forma: "program", name: "Můj", items: [] });
		expect(program?.days).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
		expect(program?.evidence).toBe("practice");
		expect(program?.builtin).toBe(false);
	});
});

describe("parseTest (SPEC 4.6)", () => {
	it("test maxima opakování", () => {
		expect(
			parseTest({
				forma: "test",
				date: "2026-09-29",
				exercise: "[[Kliky]]",
				test_type: "max_reps",
				result: 32,
			}),
		).toEqual({
			forma: "test",
			schema: 1,
			date: "2026-09-29",
			exercise: "Kliky",
			test_type: "max_reps",
			result: 32,
		});
	});

	it("bez výsledku odmítne", () => {
		expect(parseTest({ forma: "test", date: "2026-09-29", exercise: "Kliky", test_type: "max_reps" })).toBeNull();
	});
});

describe("parseNote", () => {
	it("rozcestník podle `forma`", () => {
		expect(parseNote({ forma: "day", date: "2026-09-28" })?.forma).toBe("day");
		expect(parseNote({ forma: "goal", name: "x" })).toBeNull();
		expect(parseNote({ title: "Běžná poznámka" })).toBeNull();
		expect(parseNote(null)).toBeNull();
		expect(parseNote(["forma"])).toBeNull();
	});
});
