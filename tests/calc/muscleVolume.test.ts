import { describe, expect, it } from "vitest";
import {
	cardioLoad,
	muscleExercises,
	recovery,
	setsBetween,
	volumeCategory,
	volumeHistory,
	weeklySets,
	weeklyTrend,
	weeklyUncounted,
	type VolumeContext,
	type VolumeExercise,
} from "../../src/calc/muscleVolume";
import type { Block, WorkoutNote } from "../../src/model/types";

const LIBRARY: Record<string, VolumeExercise> = {
	"bench press": { name: "Bench press", kind: "grind", measure: "reps_kg", muscles: { primary: ["chest"], secondary: ["triceps", "shoulders"] } },
	kliky: { name: "Kliky", kind: "grind", measure: "reps_bw", muscles: { primary: ["chest"], secondary: ["triceps"] }, bodyweight_fraction: 0.64 },
	"push-ups": { name: "Kliky", kind: "grind", measure: "reps_bw", muscles: { primary: ["chest"], secondary: ["triceps"] }, bodyweight_fraction: 0.64 },
	plank: { name: "Plank", kind: "hold", measure: "seconds", muscles: { primary: ["abs"], secondary: ["obliques"] } },
	"kettlebell swing": { name: "Kettlebell swing", kind: "ballistic", measure: "reps_kg", muscles: { primary: ["glutes", "hamstrings"], secondary: ["lowback"] } },
	dřep: { name: "Dřep", kind: "grind", measure: "reps_kg", muscles: { primary: ["quads", "glutes"], secondary: ["hamstrings"] } },
};

const ctx: VolumeContext = {
	info: (exercise) => LIBRARY[exercise.trim().toLowerCase()],
	options: { rirMax: 4, minPct1rm: 60, holdPctOfMax: 70, blockMinRpe: 7 },
	bodyweightKg: 80,
};

function workout(date: string, blocks: Block[], extra: Partial<WorkoutNote> = {}): WorkoutNote {
	return { forma: "workout", schema: 1, date, sport: "strength", source: "manual", blocks, pain: [], ...extra };
}

describe("volumeHistory – efektivní série", () => {
	it("série s RIR ≤ 4 se počítají; hlavní partie 1, vedlejší 0,5; rozcvičovací ne", () => {
		const history = volumeHistory(
			[
				workout("2026-09-28", [
					{
						type: "sets",
						exercise: "Bench press",
						sets: [
							{ reps: 10, kg: 40, warmup: true },
							{ reps: 6, kg: 80, rir: 2 },
							{ reps: 6, kg: 80, rir: 1 },
							{ reps: 6, kg: 80, rir: 5 }, // příliš lehká
						],
					},
				]),
			],
			ctx,
		);
		// 2 efektivní série: hrudník 2, triceps a ramena po 1.
		expect(history[0]!.muscles).toEqual({ chest: 2, triceps: 1, shoulders: 1 });
		expect(history[0]!.uncounted).toBe(0);
	});

	it("bez RIR v posilovně rozhoduje 60 % odhadu 1RM", () => {
		// Nejlepší série 80 kg × 6 → 1RM = 80 × (1 + 6/30) = 96 kg; 60 % = 57,6 kg.
		const history = volumeHistory(
			[
				workout("2026-09-28", [
					{
						type: "sets",
						exercise: "Bench press",
						sets: [
							{ reps: 6, kg: 80 }, // 83 % → počítá se
							{ reps: 8, kg: 60 }, // 62,5 % → počítá se
							{ reps: 10, kg: 50 }, // 52 % → nepočítá se
						],
					},
				]),
			],
			ctx,
		);
		expect(history[0]!.muscles.chest).toBe(2);
		expect(history[0]!.uncounted).toBe(0);
	});

	const pushUps = (date: string, sets: { reps: number; rir?: number; added_kg?: number; tag?: "failure" }[]) =>
		workout(date, [{ type: "sets", exercise: "Kliky", sets }], { sport: "calisthenics" });

	it("vlastní váha bez RIR a bez doloženého maxima: maximem je nejdelší zapsaná série a série se hlásí jako odhadnuté", () => {
		const history = volumeHistory([pushUps("2026-09-28", [{ reps: 20 }, { reps: 18 }, { reps: 15 }])], ctx);
		// Maximum 20: 20 → rezerva 0, 18 → rezerva 2, 15 → rezerva 5 → 15/20 = 0,75; dohromady 2,75
		expect(history[0]!.muscles).toEqual({ chest: 2.75, triceps: 1.375 });
		expect(history[0]!.uncounted).toBe(0);
		expect(history[0]!.assumed).toBe(3);
		// Série bez opakování posoudit nejde.
		expect(volumeHistory([workout("2026-09-28", [{ type: "sets", exercise: "Kliky", sets: [{}] }], { sport: "calisthenics" })], ctx)[0]!.uncounted).toBe(1);
	});

	it("vlastní váha bez RIR: rezerva se odhadne z testu maxima; série blízko maxima je celá", () => {
		const tested: VolumeContext = { ...ctx, maxTests: [{ date: "2026-09-20", exercise: "Push-ups", reps: 30 }] };
		// Maximum 30: 27 opakování = rezerva 3 → efektivní; 26 = rezerva 4 → efektivní; 25 = rezerva 5 → 25/30 série.
		const history = volumeHistory([pushUps("2026-09-28", [{ reps: 27 }, { reps: 26 }, { reps: 25 }])], tested);
		// 1 + 1 + 0,83 = 2,83; triceps polovina = 1,415
		expect(history[0]!.muscles.chest).toBeCloseTo(2.83, 9);
		expect(history[0]!.muscles.triceps).toBeCloseTo(1.415, 9);
		expect(history[0]!.uncounted).toBe(0);
		expect(history[0]!.assumed).toBe(0);
		// Test z pozdějšího data starší trénink neovlivní – tam se bere nejdelší zapsaná série (odhad).
		expect(volumeHistory([pushUps("2026-09-10", [{ reps: 27 }])], tested)[0]).toMatchObject({ muscles: { chest: 1 }, assumed: 1 });
	});

	it("submaximální série se počítají poměrem k maximu: 10 × 10 kliků při maximu 30 = 3,33 série", () => {
		const tested: VolumeContext = { ...ctx, maxTests: [{ date: "2026-09-20", exercise: "Kliky", reps: 30 }] };
		const history = volumeHistory([pushUps("2026-09-28", Array.from({ length: 10 }, () => ({ reps: 10 })))], tested);
		// 10 × (10 / 30) = 3,33
		expect(history[0]!.muscles).toEqual({ chest: 3.33, triceps: 1.665 });
	});

	it("maximum doloží i série se zapsaným RIR nebo do selhání; série bez RIR ho jen posune", () => {
		// 15 opakování s rezervou 1 → maximum 16. První série (20) ho překonala → maximum 20, rezerva 0; 18 → rezerva 2.
		const calibrated = volumeHistory([pushUps("2026-09-28", [{ reps: 20 }, { reps: 18 }, { reps: 15, rir: 1 }])], ctx);
		expect(calibrated[0]!.muscles).toEqual({ chest: 3, triceps: 1.5 });
		expect(calibrated[0]!.uncounted).toBe(0);
		// Série do selhání 20 → maximum 20; 12 opakování = rezerva 8 → 12/20 = 0,6 série.
		const failure = volumeHistory([pushUps("2026-09-28", [{ reps: 20, tag: "failure" }, { reps: 12 }])], ctx);
		expect(failure[0]!.muscles.chest).toBeCloseTo(1.6, 9);
		// Zapsaná rezerva 6 při 10 opakováních: maximum 16, série se počítá 10/16 = 0,63 (dřív nula).
		expect(volumeHistory([pushUps("2026-09-28", [{ reps: 10, rir: 6 }])], ctx)[0]!.muscles.chest).toBeCloseTo(0.63, 9);
	});

	it("přívažek: maximum platí pro stejnou nebo menší zátěž, ne pro větší", () => {
		const tested: VolumeContext = { ...ctx, maxTests: [{ date: "2026-09-20", exercise: "Kliky", reps: 30 }] };
		// S 10 kg navíc test bez zátěže nic neříká → maximem je sama série (odhad).
		expect(volumeHistory([pushUps("2026-09-28", [{ reps: 12, added_kg: 10 }])], tested)[0]).toMatchObject({ muscles: { chest: 1 }, assumed: 1 });
		// Série s 10 kg do selhání (15) doloží maximum pro 10 kg i pro lehčí zátěž; bez zátěže dál platí vyšší maximum 30.
		const history = volumeHistory(
			[pushUps("2026-09-28", [{ reps: 15, added_kg: 10, tag: "failure" }]), pushUps("2026-09-30", [{ reps: 12, added_kg: 10 }, { reps: 12, added_kg: 5 }, { reps: 12 }])],
			tested,
		);
		// 12 s 10 kg: rezerva 3 → 1; 12 s 5 kg: maximum aspoň 15 → rezerva 3 → 1; 12 bez zátěže: maximum 30 → 12/30 = 0,4
		expect(history[1]!.muscles.chest).toBeCloseTo(2.4, 9);
	});

	it("alias cviku se počítá ke stejnému cviku", () => {
		const history = volumeHistory([workout("2026-09-28", [{ type: "sets", exercise: "Push-ups", sets: [{ reps: 15, rir: 2 }] }])], ctx);
		expect(history[0]!.muscles.chest).toBe(1);
	});

	it("výdrž se počítá od 70 % osobního maxima", () => {
		const history = volumeHistory(
			[
				workout("2026-09-20", [{ type: "hold", exercise: "Plank", sets: [{ sec: 100 }] }]),
				// Maximum 100 s → hranice 70 s.
				workout("2026-09-28", [{ type: "hold", exercise: "Plank", sets: [{ sec: 80 }, { sec: 70 }, { sec: 60 }] }]),
			],
			ctx,
		);
		expect(history[0]!.muscles).toEqual({ abs: 1, obliques: 0.5 });
		expect(history[1]!.muscles).toEqual({ abs: 2, obliques: 1 });
	});

	it("maximum se bere jen z historie do daného tréninku – pozdější rekord starší týdny nemění", () => {
		const history = volumeHistory(
			[
				workout("2026-09-01", [{ type: "sets", exercise: "Bench press", sets: [{ reps: 5, kg: 60 }, { reps: 5, kg: 50 }] }]),
				workout("2026-09-28", [{ type: "sets", exercise: "Bench press", sets: [{ reps: 5, kg: 100 }, { reps: 5, kg: 50 }] }]),
			],
			ctx,
		);
		// 1. 9.: 1RM = 60 × 7/6 = 70 → 50 kg je 71 % → obě série.
		expect(history[0]!.muscles.chest).toBe(2);
		// 28. 9.: 1RM = 100 × 7/6 = 116,7 → 50 kg je 43 % → jen jedna.
		expect(history[1]!.muscles.chest).toBe(1);
	});

	it("EMOM, AMRAP a komplex: série = počet kol, jen při RPE ≥ 7", () => {
		const emom: Block = { type: "emom", exercise: "Kettlebell swing", minutes: 10, reps_per_min: 15, kg: 24 };
		const hard = volumeHistory([workout("2026-09-28", [emom], { rpe: 7 })], ctx);
		expect(hard[0]!.muscles).toEqual({ glutes: 10, hamstrings: 10, lowback: 5 });
		const easy = volumeHistory([workout("2026-09-28", [emom], { rpe: 6 })], ctx);
		expect(easy[0]!.muscles).toEqual({});
		// RPE bloku má přednost před RPE tréninku; nedokončená kola podle `rounds`.
		const partial = volumeHistory([workout("2026-09-28", [{ ...emom, rounds: 8, rpe: 8 }], { rpe: 5 })], ctx);
		expect(partial[0]!.muscles.glutes).toBe(8);

		const amrap: Block = { type: "amrap", minutes: 12, rounds: 4, items: [{ exercise: "Kliky", reps: 10 }, { exercise: "Dřep", reps: 15 }] };
		const circuit = volumeHistory([workout("2026-09-28", [amrap], { rpe: 8 })], ctx);
		// Kliky 4 kola → hrudník 4, triceps 2; dřep 4 kola → stehna 4, hýždě 4, zadní stehna 2.
		expect(circuit[0]!.muscles).toEqual({ chest: 4, triceps: 2, quads: 4, glutes: 4, hamstrings: 2 });
	});

	it("neznámý cvik se nepočítá a výpočet nespadne", () => {
		expect(volumeHistory([workout("2026-09-28", [{ type: "sets", exercise: "Neznámý", sets: [{ reps: 8, kg: 20, rir: 1 }] }])], ctx)[0]!.muscles).toEqual({});
	});
});

describe("týdenní součty", () => {
	const bench = (date: string, count: number): WorkoutNote =>
		workout(date, [{ type: "sets", exercise: "Bench press", sets: Array.from({ length: count }, () => ({ reps: 6, kg: 80, rir: 2 })) }]);
	const history = volumeHistory([bench("2026-09-21", 3), bench("2026-09-22", 4), bench("2026-09-28", 5), bench("2026-08-10", 2)], ctx);

	it("posledních 7 dní včetně dneška (22.–28. 9.)", () => {
		const sets = weeklySets(history, "2026-09-28");
		expect(sets.chest).toBe(9); // 4 + 5; 21. 9. už je mimo okno
		expect(sets.triceps).toBe(4.5);
		expect(sets.calves).toBe(0);
	});

	it("setsBetween a trend po sedmidenních oknech", () => {
		expect(setsBetween(history, "2026-09-21", "2026-09-21").chest).toBe(3);
		const trend = weeklyTrend(history, "2026-09-28", 8);
		expect(trend).toHaveLength(8);
		expect(trend[7]).toMatchObject({ from: "2026-09-22" });
		expect(trend.map((w) => w.sets.chest)).toEqual([2, 0, 0, 0, 0, 0, 3, 9]);
		// Okno začínající 4. 8. (4.–10. 8.) obsahuje trénink z 10. 8.
		expect(trend[0]!.from).toBe("2026-08-04");
	});

	it("neposouzené a odhadnuté série za týden", () => {
		// Kettlebell swing bez RIR mimo posilovnu posoudit nejde; kliky bez RIR se odhadnou podle nejdelší série.
		const h = volumeHistory(
			[workout("2026-09-27", [{ type: "sets", exercise: "Kettlebell swing", sets: [{ reps: 20, kg: 24 }, { reps: 20, kg: 24 }] }, { type: "sets", exercise: "Kliky", sets: [{ reps: 20 }] }], { sport: "kettlebell" })],
			ctx,
		);
		expect(weeklyUncounted(h, "2026-09-28")).toBe(2);
		expect(weeklyUncounted(h, "2026-09-28", "assumed")).toBe(1);
		expect(weeklyUncounted(h, "2026-10-10")).toBe(0);
	});
});

describe("volumeCategory", () => {
	const t = { low: 6, targetMin: 10, targetMax: 20 };
	it("pásma < 6 / 6–9 / 10–20 / > 20", () => {
		expect([0, 5.5, 6, 9.5, 10, 20, 20.5].map((s) => volumeCategory(s, t))).toEqual([0, 0, 1, 1, 2, 2, 3]);
	});
});

describe("recovery", () => {
	const t = { minSets: 3, hours1: 24, hours2: 48, hours3: 72 };
	const sets = (n: number) => Array.from({ length: n }, () => ({ reps: 6, kg: 80, rir: 2 }));
	const now = new Date(2026, 8, 28, 18, 0).getTime(); // 28. 9. 2026 18:00

	it("čas od posledního dne s aspoň 3 efektivními sériemi", () => {
		const history = volumeHistory(
			[
				workout("2026-09-26", [{ type: "sets", exercise: "Bench press", sets: sets(4) }], { start: "18:00" }),
				// Jen 2 série – jako trénink partie se nepočítá.
				workout("2026-09-28", [{ type: "sets", exercise: "Bench press", sets: sets(2) }], { start: "08:00" }),
			],
			ctx,
		);
		const r = recovery(history, "chest", now, t);
		expect(r.lastDate).toBe("2026-09-26");
		expect(r.hours).toBe(48);
		expect(r.percent).toBe(67); // 48 / 72
		expect(r.category).toBe(2);
	});

	it("tréninky jednoho dne se sčítají; vedlejší partie po 0,5", () => {
		const history = volumeHistory(
			[
				workout("2026-09-28", [{ type: "sets", exercise: "Bench press", sets: sets(2) }], { start: "07:00" }),
				workout("2026-09-28", [{ type: "sets", exercise: "Kliky", sets: sets(2) }], { start: "12:00" }),
			],
			ctx,
		);
		// Hrudník 2 + 2 = 4 série → trénink ve 12:00, před 6 hodinami.
		expect(recovery(history, "chest", now, t)).toMatchObject({ hours: 6, percent: 8, category: 0 });
		// Triceps 1 + 1 = 2 → pod hranicí, bere se jako netrénovaný.
		expect(recovery(history, "triceps", now, t)).toEqual({ lastAt: null, lastDate: null, hours: null, percent: 100, category: 3 });
	});

	it("bez času tréninku se bere poledne; starší než 72 h je 100 %", () => {
		const history = volumeHistory([workout("2026-09-24", [{ type: "sets", exercise: "Bench press", sets: sets(3) }])], ctx);
		const r = recovery(history, "chest", now, t);
		expect(r.hours).toBe(102); // 24. 9. 12:00 → 28. 9. 18:00
		expect(r.percent).toBe(100);
		expect(r.category).toBe(3);
	});
});

describe("muscleExercises", () => {
	const workouts = [
		// Předchozí 4 týdny (4.–31. 8. vzhledem k 28. 9.): 75 kg × 6 → 1RM 90.
		workout("2026-08-20", [{ type: "sets", exercise: "Bench press", sets: [{ reps: 6, kg: 75, rir: 2 }] }]),
		workout("2026-08-21", [{ type: "sets", exercise: "Kliky", sets: [{ reps: 18, rir: 1 }] }]),
		// Poslední 4 týdny: 80 kg × 6 → 1RM 96.
		workout("2026-09-20", [{ type: "sets", exercise: "Bench press", sets: [{ reps: 10, kg: 40, warmup: true }, { reps: 6, kg: 80, rir: 2 }, { reps: 8, kg: 70, rir: 2 }] }]),
		workout("2026-09-22", [{ type: "sets", exercise: "Push-ups", sets: [{ reps: 20, rir: 1 }, { reps: 22, rir: 0 }] }]),
		workout("2026-09-23", [{ type: "hold", exercise: "Plank", sets: [{ sec: 60 }] }]),
	];

	it("nejlepší série, odhad 1RM a změna proti předchozím 4 týdnům", () => {
		const rows = muscleExercises(workouts, "chest", ctx, "2026-09-28");
		expect(rows.map((r) => r.name)).toEqual(["Bench press", "Kliky"]);
		const bench = rows[0]!;
		expect(bench.best).toEqual({ reps: 6, kg: 80, addedKg: undefined, sec: undefined });
		expect(bench.oneRm).toBeCloseTo(96, 10);
		expect(bench.change).toEqual({ value: 6, unit: "kg" });
		expect(bench.sets).toBe(2);
		// Kliky: 80 kg × 0,64 = 51,2 kg; nad 10 opakování se 1RM nepočítá → srovnání podle opakování.
		const pushups = rows[1]!;
		expect(pushups.oneRm).toBeNull();
		expect(pushups.best?.reps).toBe(22);
		expect(pushups.change).toEqual({ value: 4, unit: "reps" });
	});

	it("vedlejší partie a cvik bez předchozího období", () => {
		const triceps = muscleExercises(workouts, "triceps", ctx, "2026-09-28");
		expect(triceps.every((r) => !r.primary)).toBe(true);
		const abs = muscleExercises(workouts, "abs", ctx, "2026-09-28");
		expect(abs).toHaveLength(1);
		expect(abs[0]).toMatchObject({ name: "Plank", primary: true, oneRm: null, change: null });
		expect(abs[0]!.best?.sec).toBe(60);
	});

	it("cvik necvičený v posledních 4 týdnech v seznamu není", () => {
		expect(muscleExercises(workouts, "chest", ctx, "2026-12-01")).toEqual([]);
	});
});

describe("cardioLoad", () => {
	const run = (date: string, km: number): WorkoutNote => workout(date, [], { sport: "run", run: { distance_km: km } });
	const swim = (date: string, m: number): WorkoutNote => workout(date, [], { sport: "swim", swim: { distance_m: m } });
	const workouts = [run("2026-09-23", 8), run("2026-09-27", 10), run("2026-09-10", 20), swim("2026-09-25", 2400)];

	it("běh zatěžuje nohy, plavání záda a ramena; jen posledních 7 dní", () => {
		expect(cardioLoad(workouts, "calves", "2026-09-28")).toEqual([{ sport: "run", count: 2, distance: 18 }]);
		expect(cardioLoad(workouts, "lats", "2026-09-28")).toEqual([{ sport: "swim", count: 1, distance: 2400 }]);
		expect(cardioLoad(workouts, "chest", "2026-09-28")).toEqual([]);
	});
});
