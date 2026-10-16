// Import historie ze Strong proti trezoru v paměti: názvy podle knihovny, duplicity, zápis tréninků.
import { beforeEach, describe, expect, it } from "vitest";
import { exerciseNameCandidates } from "../../src/calc/historyImport";
import { DayService } from "../../src/data/DayService";
import { FormaIndex } from "../../src/data/FormaIndex";
import { HistoryImportService } from "../../src/data/HistoryImportService";
import { NoteWriter } from "../../src/data/NoteWriter";
import { WorkoutService } from "../../src/data/WorkoutService";
import { mergeSettings } from "../../src/settings/settings";
import { createFakeVault } from "../helpers/fakeVault";

function createWorld() {
	const vault = createFakeVault();
	const settings = mergeSettings(null);
	const index = new FormaIndex(vault.app);
	index.register(vault.plugin);
	const writer = new NoteWriter(vault.app);
	const days = new DayService(vault.app, index, writer, () => settings);
	const workouts = new WorkoutService(vault.app, index, writer, days, () => settings);
	return { vault, index, history: new HistoryImportService(index, workouts) };
}

const CSV = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2021-07-24 10:37:18,Push,1h 9m,Bench Press (Barbell),1,80,6,0,0,,,8
2021-07-24 10:37:18,Push,1h 9m,Bench Press (Dumbbell),1,30,10,0,0,,,
2021-07-24 10:37:18,Push,1h 9m,Pull Up,1,0,8,0,0,,,
2021-07-24 10:37:18,Push,1h 9m,Zottman Curl,1,12,10,0,0,,,
2021-07-26 18:00:00,Legs,45m,Squat (Barbell),1,100,5,0,0,,,
`;

const exercise = (name: string, aliases: string[], extra: Record<string, unknown> = {}) =>
	`---\n${JSON.stringify({ forma: "exercise", schema: 1, name, aliases, category: "strength", kind: "grind", measure: "reps_kg", muscles: { primary: ["chest"], secondary: [] }, ...extra })}\n---\n`;

let w: ReturnType<typeof createWorld>;
beforeEach(() => {
	w = createWorld();
	w.vault.write("Forma/Knihovna/Cviky/Bench press.md", exercise("Bench press", ["Tlak na lavici"]));
	w.vault.write("Forma/Knihovna/Cviky/Tlak s jednoručkami na lavici.md", exercise("Tlak s jednoručkami na lavici", ["Dumbbell bench press"]));
	w.vault.write("Forma/Knihovna/Cviky/Shyby.md", exercise("Shyby", ["Pull-up"], { category: "calisthenics", measure: "reps_bw" }));
	w.vault.write("Forma/Knihovna/Cviky/Dřep s činkou.md", exercise("Dřep s činkou", ["Squat", "Back squat"]));
});

describe("názvy cviků z jiných aplikací", () => {
	it("nářadí v závorce a chybějící spojovník", () => {
		expect(exerciseNameCandidates("Bench Press (Barbell)")).toEqual(["Bench Press (Barbell)", "Barbell Bench Press", "Bench Press"]);
		// U jednoruček samotný název cviku nestačí – byl by to jiný cvik.
		expect(exerciseNameCandidates("Bench Press (Dumbbell)")).toEqual(["Bench Press (Dumbbell)", "Dumbbell Bench Press"]);
		expect(exerciseNameCandidates("Pull Up")).toEqual(["Pull Up", "Pull-Up"]);
		expect(exerciseNameCandidates("Pull-up")).toEqual(["Pull-up", "Pull up"]);
	});
});

describe("HistoryImportService", () => {
	it("náhled: cviky podle knihovny, neznámé pod původním názvem, nic se nezapíše", () => {
		const preview = w.history.preview(CSV, "kg");
		expect(preview.parsed.format).toBe("strong");
		expect(preview.fresh).toHaveLength(2);
		expect(preview.duplicates).toBe(0);
		expect(preview.unknownExercises).toEqual(["Zottman Curl"]);
		expect(preview.fresh[0]!.blocks.map((b) => ("exercise" in b ? b.exercise : ""))).toEqual(["Bench press", "Tlak s jednoručkami na lavici", "Shyby", "Zottman Curl"]);
		// Shyby bez přívažku: váha 0 se nezapisuje.
		expect(preview.fresh[0]!.blocks[2]).toEqual({ type: "sets", exercise: "Shyby", sets: [{ reps: 8 }] });
		expect(w.vault.paths().filter((p) => p.startsWith("Forma/Tréninky"))).toEqual([]);
	});

	it("uloží tréninky i s denními poznámkami; druhý import téhož souboru nic nepřidá", async () => {
		const first = w.history.preview(CSV, "kg");
		const progress: number[] = [];
		const files = await w.history.save(first.fresh, (done) => progress.push(done));
		expect(files.map((f) => f.path)).toEqual(["Forma/Tréninky/2021/2021-07-24 Posilovna – Push.md", "Forma/Tréninky/2021/2021-07-26 Posilovna – Legs.md"]);
		expect(progress).toEqual([1, 2]);
		expect(w.vault.frontmatter(files[0]!.path)).toMatchObject({ forma: "workout", date: "2021-07-24", start: "10:37", sport: "strength", source: "manual", duration_min: 69 });
		expect(w.vault.paths()).toContain("Forma/Deník/2021/2021-07-24.md");

		const second = w.history.preview(CSV, "kg");
		expect(second.fresh).toEqual([]);
		expect(second.duplicates).toBe(2);
	});
});
