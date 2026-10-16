import { describe, expect, it } from "vitest";
import {
	describeHistory,
	historyToNotes,
	isImportedAlready,
	parseCsv,
	parseHistoryCsv,
	parseHistoryDate,
	parseStrongDuration,
	rirFromSetRpe,
	type LibraryExercise,
} from "../../src/calc/historyImport";

// Export Strong: řádek = série; jednotka váhy v souboru není.
const STRONG = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2021-07-24 10:37:18,"Push, den A",1h 9m,Bench Press (Barbell),W,40,10,0,0,,"Šlo to, ale spal jsem málo",
2021-07-24 10:37:18,"Push, den A",1h 9m,Bench Press (Barbell),1,80,6,0,0,,"Šlo to, ale spal jsem málo",8
2021-07-24 10:37:18,"Push, den A",1h 9m,Bench Press (Barbell),2,80,5,0,0,,"Šlo to, ale spal jsem málo",9.5
2021-07-24 10:37:18,"Push, den A",1h 9m,Pull Up,1,10,8,0,0,,"Šlo to, ale spal jsem málo",
2021-07-24 10:37:18,"Push, den A",1h 9m,Plank,1,0,0,0,60,,"Šlo to, ale spal jsem málo",
2021-07-24 10:37:18,"Push, den A",1h 9m,Running,1,0,0,5,1800,,"Šlo to, ale spal jsem málo",
2021-07-26 18:00:00,Legs,45m,Squat (Barbell),1,100,5,0,0,,,
`;

// Export Hevy: jednotka v názvu sloupce, typ série a superset.
const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_lbs","reps","distance_miles","duration_seconds","rpe"
"Upper","15 Jul 2026, 09:52","15 Jul 2026, 10:47","","Bench Press (Barbell)","","",0,"warmup",135,10,,,
"Upper","15 Jul 2026, 09:52","15 Jul 2026, 10:47","","Bench Press (Barbell)","","",1,"normal",225,5,,,8
"Upper","15 Jul 2026, 09:52","15 Jul 2026, 10:47","","Bicep Curl (Dumbbell)","1","",0,"normal",30,12,,,
"Upper","15 Jul 2026, 09:52","15 Jul 2026, 10:47","","Triceps Pushdown","1","",0,"dropset",50,15,,,
"Upper","15 Jul 2026, 09:52","15 Jul 2026, 10:47","","Triceps Pushdown","1","",1,"failure",40,12,,,
`;

const LIBRARY: Record<string, LibraryExercise> = {
	"bench press (barbell)": { name: "Bench press", category: "strength", measure: "reps_kg" },
	"pull up": { name: "Shyby", category: "calisthenics", measure: "reps_bw" },
	plank: { name: "Plank", category: "calisthenics", measure: "seconds" },
	"squat (barbell)": { name: "Dřep s činkou", category: "strength", measure: "reps_kg" },
};
const resolve = (name: string) => LIBRARY[name.toLowerCase()];

describe("čtení CSV", () => {
	it("uvozovky, čárky a konce řádků uvnitř buněk, zdvojené uvozovky, BOM", () => {
		expect(parseCsv('﻿a,b,c\r\n1,"x, y","řekl ""ahoj"""\n"víc\nřádků",2,\n\n')).toEqual([
			["a", "b", "c"],
			["1", "x, y", 'řekl "ahoj"'],
			["víc\nřádků", "2", ""],
		]);
	});

	it("středník jako oddělovač (starší exporty Strong)", () => {
		expect(parseCsv("Date;Exercise Name;Weight\n2021-01-01 10:00:00;Squat;100,5")).toEqual([
			["Date", "Exercise Name", "Weight"],
			["2021-01-01 10:00:00", "Squat", "100,5"],
		]);
	});

	it("data a délky", () => {
		expect(parseHistoryDate("2021-07-24 10:37:18")).toEqual({ date: "2021-07-24", start: "10:37" });
		expect(parseHistoryDate("15 Jul 2026, 09:52")).toEqual({ date: "2026-07-15", start: "09:52" });
		expect(parseHistoryDate("5 September 2024 7:05")).toEqual({ date: "2024-09-05", start: "07:05" });
		expect(parseHistoryDate("včera")).toBeNull();
		expect(parseHistoryDate("2021-13-40 10:00:00")).toBeNull();
		expect(parseStrongDuration("1h 9m")).toBe(69);
		expect(parseStrongDuration("45m")).toBe(45);
		expect(parseStrongDuration("2h")).toBe(120);
		expect(parseStrongDuration("5400")).toBe(90);
		expect(parseStrongDuration("")).toBeUndefined();
	});
});

describe("export Strong", () => {
	const parsed = parseHistoryCsv(STRONG, "kg");

	it("řádky se seskupí do tréninků; řádek jen se vzdáleností se přeskočí", () => {
		expect(parsed.format).toBe("strong");
		expect(parsed.workouts.map((w) => [w.date, w.start, w.title, w.durationMin, w.sets.length])).toEqual([
			["2021-07-24", "10:37", "Push, den A", 69, 5],
			["2021-07-26", "18:00", "Legs", 45, 1],
		]);
		expect(parsed.workouts[0]!.notes).toBe("Šlo to, ale spal jsem málo");
		// Běh (vzdálenost a čas bez opakování) do silového deníku nepatří – nahrává se z GPX / TCX.
		expect(parsed.skippedRows).toBe(1);
		expect(parsed.workouts[0]!.sets.at(-1)).toEqual({ exercise: "Plank", sec: 60 });
	});

	it("tréninky → poznámky: bloky, názvy z knihovny, přívažek u vlastní váhy, RIR z RPE", () => {
		const { notes, unknownExercises } = historyToNotes(parsed.workouts, resolve, 1);
		expect(unknownExercises).toEqual([]);
		// Tři série benche proti dvěma s vlastní vahou → posilovna.
		expect(notes[0]).toMatchObject({ forma: "workout", date: "2021-07-24", start: "10:37", sport: "strength", title: "Push, den A", duration_min: 69, source: "manual", notes: "Šlo to, ale spal jsem málo" });
		expect(notes[0]!.rpe).toBeUndefined();
		expect(notes[0]!.blocks).toEqual([
			{ type: "sets", exercise: "Bench press", sets: [{ reps: 10, kg: 40, warmup: true }, { reps: 6, kg: 80, rir: 2 }, { reps: 5, kg: 80, rir: 0.5 }] },
			{ type: "sets", exercise: "Shyby", sets: [{ reps: 8, added_kg: 10 }] },
			{ type: "hold", exercise: "Plank", sets: [{ sec: 60 }] },
		]);
		expect(notes[1]).toMatchObject({ sport: "strength", blocks: [{ type: "sets", exercise: "Dřep s činkou", sets: [{ reps: 5, kg: 100 }] }] });
	});

	it("váha v librách se převede na kilogramy", () => {
		const lb = parseHistoryCsv(STRONG, "lb");
		// 80 lb × 0,45359237 = 36,29 kg
		expect(lb.workouts[0]!.sets[1]!.kg).toBe(36.29);
	});
});

describe("export Hevy", () => {
	const parsed = parseHistoryCsv(HEVY, "kg");

	it("jednotka z názvu sloupce, délka z konce tréninku, typ série a superset", () => {
		expect(parsed.format).toBe("hevy");
		expect(parsed.workouts).toHaveLength(1);
		const workout = parsed.workouts[0]!;
		expect(workout).toMatchObject({ date: "2026-07-15", start: "09:52", title: "Upper", durationMin: 55 });
		// 225 lb = 102,06 kg bez ohledu na zvolenou jednotku (soubor má sloupec weight_lbs).
		expect(workout.sets[1]).toEqual({ exercise: "Bench Press (Barbell)", reps: 5, kg: 102.06, rpe: 8 });
		expect(workout.sets[0]).toMatchObject({ warmup: true, kg: 61.23 });
		expect(workout.sets.slice(2).map((s) => [s.tag, s.supersetId])).toEqual([
			[undefined, "1"],
			["drop", "1"],
			["failure", "1"],
		]);
	});

	it("superset se propíše do bloků, označení sérií zůstane", () => {
		const { notes, unknownExercises } = historyToNotes(parsed.workouts, resolve, 1);
		expect(unknownExercises).toEqual(["Bicep Curl (Dumbbell)", "Triceps Pushdown"]);
		expect(notes[0]!.blocks).toEqual([
			{ type: "sets", exercise: "Bench press", sets: [{ reps: 10, kg: 61.23, warmup: true }, { reps: 5, kg: 102.06, rir: 2 }] },
			{ type: "sets", exercise: "Bicep Curl (Dumbbell)", sets: [{ reps: 12, kg: 13.61 }] },
			{ type: "sets", exercise: "Triceps Pushdown", superset: true, sets: [{ reps: 15, kg: 22.68, tag: "drop" }, { reps: 12, kg: 18.14, tag: "failure" }] },
		]);
	});
});

describe("pomocné funkce importu", () => {
	it("RIR z RPE série: 10 − RPE, jen pro RPE 5–10", () => {
		expect(rirFromSetRpe(10)).toBe(0);
		expect(rirFromSetRpe(8)).toBe(2);
		expect(rirFromSetRpe(7.5)).toBe(2.5);
		expect(rirFromSetRpe(4)).toBeUndefined();
		expect(rirFromSetRpe(undefined)).toBeUndefined();
	});

	it("cizí soubor se odmítne; duplicita se pozná podle dne a začátku", () => {
		expect(() => parseHistoryCsv("datum,km\n2026-10-01,5", "kg")).toThrow("není export ze Strong ani z Hevy");
		const { notes } = historyToNotes(parseHistoryCsv(STRONG, "kg").workouts, resolve, 1);
		expect(isImportedAlready(notes[0]!, [{ date: "2021-07-24", start: "10:37" }])).toBe(true);
		expect(isImportedAlready(notes[0]!, [{ date: "2021-07-24", start: "18:00" }])).toBe(false);
		expect(isImportedAlready(notes[0]!, [{ date: "2021-07-24" }])).toBe(false);
	});

	it("shrnutí před importem", () => {
		const text = describeHistory(parseHistoryCsv(STRONG, "kg"), (iso) => iso);
		expect(text).toBe("Strong: tréninků 2 (2021-07-24 – 2021-07-26), sérií 6.");
		expect(describeHistory({ format: "hevy", workouts: [], skippedRows: 3 }, (iso) => iso)).toBe("Hevy: v souboru není žádný použitelný trénink.");
	});
});
