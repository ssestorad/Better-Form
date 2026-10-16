// Import běhu ze souboru proti trezoru v paměti: nový trénink, duplicita, sloučení s ručním zápisem.
import { beforeEach, describe, expect, it } from "vitest";
import { pendingImports } from "../../src/calc/running";
import { DayService } from "../../src/data/DayService";
import { FormaIndex } from "../../src/data/FormaIndex";
import { NoteWriter } from "../../src/data/NoteWriter";
import { RunImportService } from "../../src/data/RunImportService";
import { WorkoutService } from "../../src/data/WorkoutService";
import { parseWorkout } from "../../src/model/parse";
import { workoutToFrontmatter } from "../../src/model/serialize";
import type { WorkoutNote } from "../../src/model/types";
import { LEGACY_FOLDERS, mergeSettings } from "../../src/settings/settings";
import { createFakeVault } from "../helpers/fakeVault";

function createWorld() {
	const vault = createFakeVault();
	// Vault ze starší verze s českými složkami (výchozí jsou anglicky – hlídá paths.test.ts).
	const settings = { ...mergeSettings(null), folders: { ...LEGACY_FOLDERS } };
	const index = new FormaIndex(vault.app);
	index.register(vault.plugin);
	const writer = new NoteWriter(vault.app);
	const days = new DayService(vault.app, index, writer, () => settings);
	const workouts = new WorkoutService(vault.app, index, writer, days, () => settings);
	return { vault, index, workouts, runImport: new RunImportService(index, workouts) };
}

let w: ReturnType<typeof createWorld>;
beforeEach(() => {
	w = createWorld();
});

// 2 km za 10 minut, start v poledne UTC (v každém běžném časovém pásmu tentýž den).
function tcx(day: string, meters = 2000): string {
	const point = (time: string, dist: number) => `<Trackpoint><Time>${day}T${time}Z</Time><DistanceMeters>${dist}</DistanceMeters><HeartRateBpm><Value>150</Value></HeartRateBpm></Trackpoint>`;
	return `<TrainingCenterDatabase><Activities><Activity Sport="Running"><Lap StartTime="${day}T12:00:00Z"><TotalTimeSeconds>600</TotalTimeSeconds><DistanceMeters>${meters}</DistanceMeters><Track>${point("12:00:00", 0)}${point("12:05:00", meters / 2)}${point("12:10:00", meters)}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
}

const runPaths = () => w.vault.paths().filter((p) => p.startsWith("Forma/Tréninky/"));

describe("RunImportService", () => {
	it("nový běh ze souboru je trénink k doplnění s měřenými údaji", async () => {
		const result = await w.runImport.importText(tcx("2026-10-03"));
		expect(result.action).toBe("created");
		expect(result.file.path).toBe("Forma/Tréninky/2026/2026-10-03 Běh.md");
		expect(w.vault.frontmatter(result.file.path)).toMatchObject({
			forma: "workout",
			date: "2026-10-03",
			sport: "run",
			source: "file",
			duration_min: 10,
			run: { distance_km: 2, moving_time_s: 600, avg_hr: 150, max_hr: 150, best_s: { "1k": 300 } },
		});
		expect(w.vault.frontmatter(result.file.path).rpe).toBeUndefined();
		// Je v seznamu k doplnění stejně jako běhy ze Stravy.
		expect(pendingImports(w.index.all("workout")).map((e) => e.file.path)).toEqual([result.file.path]);
		// A denní poznámka o něm ví.
		expect(w.vault.text("Forma/Deník/2026/2026-10-03.md")).toContain("Běh");
	});

	it("tentýž soubor podruhé se přeskočí, i hned po sobě", async () => {
		const first = await w.runImport.importText(tcx("2026-10-03"));
		const second = await w.runImport.importText(tcx("2026-10-03"));
		expect(second.action).toBe("duplicate");
		expect(second.file.path).toBe(first.file.path);
		expect(runPaths()).toHaveLength(1);
		// Jiný den nebo výrazně jiná vzdálenost je jiný běh.
		expect((await w.runImport.importText(tcx("2026-10-04"))).action).toBe("created");
		expect(runPaths()).toHaveLength(2);
	});

	it("ručně zapsaný běh se doplní o měřené údaje a údaje uživatele zůstanou", async () => {
		const manual: WorkoutNote = { forma: "workout", schema: 1, date: "2026-10-03", sport: "run", title: "Okruh", rpe: 6, source: "manual", run: { distance_km: 2.1, type: "easy", shoes: "Pegasus 40" }, blocks: [], pain: [], notes: "foukalo" };
		const file = await w.workouts.saveNote(manual);
		const result = await w.runImport.importText(tcx("2026-10-03"));
		expect(result.action).toBe("merged");
		expect(result.file.path).toBe(file.path);
		expect(runPaths()).toHaveLength(1);
		const merged = parseWorkout(w.vault.frontmatter(file.path))!;
		expect(merged).toMatchObject({ source: "file", title: "Okruh", rpe: 6, notes: "foukalo", start: expect.any(String), duration_min: 10 });
		expect(merged.run).toMatchObject({ distance_km: 2, moving_time_s: 600, avg_hr: 150, type: "easy", shoes: "Pegasus 40" });
		expect(merged.strava_id).toBeUndefined();
		// Běh s RPE k doplnění není.
		expect(pendingImports(w.index.all("workout"))).toEqual([]);
	});

	it("importFile: text i binární FIT; FIT bez bodů s časem se odmítne", async () => {
		const result = await w.runImport.importFile(new TextEncoder().encode(tcx("2026-10-03")).buffer as ArrayBuffer);
		expect(result.action).toBe("created");
		// hlavička FIT bez dat: platný soubor, ale žádný záznam aktivity
		const emptyFit = new Uint8Array([12, 0x20, 0, 0, 0, 0, 0, 0, 0x2e, 0x46, 0x49, 0x54]).buffer;
		await expect(w.runImport.importFile(emptyFit)).rejects.toThrow("nejsou časy");
	});

	it("vadný soubor nic nezapíše", async () => {
		await expect(w.runImport.importText("ahoj")).rejects.toThrow("není GPX, TCX ani FIT");
		await expect(w.runImport.importText("<gpx><trk><trkseg><trkpt lat=\"50\" lon=\"14\"/></trkseg></trk></gpx>")).rejects.toThrow("nejsou časy");
		expect(w.vault.paths()).toEqual([]);
	});

	it("zdroj „file“ přežije zápis a čtení; neznámý zdroj je ruční zápis", () => {
		const note: WorkoutNote = { forma: "workout", schema: 1, date: "2026-10-03", sport: "run", source: "file", blocks: [], pain: [] };
		expect(parseWorkout(workoutToFrontmatter(note))?.source).toBe("file");
		expect(parseWorkout({ ...workoutToFrontmatter(note), source: "garmin" })?.source).toBe("manual");
	});
});
