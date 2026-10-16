// Datová vrstva proti trezoru v paměti (tests/helpers/fakeVault.ts): co služby
// opravdu zapíšou do poznámek a že nikdy nepřepíšou uživatelův text.
import { beforeEach, describe, expect, it } from "vitest";
import { DayService } from "../../src/data/DayService";
import { ExportService } from "../../src/data/ExportService";
import { FormaIndex } from "../../src/data/FormaIndex";
import { NoteWriter } from "../../src/data/NoteWriter";
import { ProgramService } from "../../src/data/ProgramService";
import { WorkoutService } from "../../src/data/WorkoutService";
import { crc32 } from "../../src/data/zip";
import type { WorkoutNote } from "../../src/model/types";
import { LEGACY_FOLDERS, mergeSettings, type BetterFormSettings } from "../../src/settings/settings";
import { createFakeVault, type FakeVault } from "../helpers/fakeVault";

const START = "<!-- forma:start -->";
const END = "<!-- forma:end -->";

interface World {
	vault: FakeVault;
	settings: BetterFormSettings;
	index: FormaIndex;
	writer: NoteWriter;
	days: DayService;
	workouts: WorkoutService;
	programs: ProgramService;
	exporter: ExportService;
}

function createWorld(): World {
	const vault = createFakeVault();
	// Vault ze starší verze s českými složkami (výchozí jsou anglicky – hlídá paths.test.ts).
	const settings = { ...mergeSettings(null), folders: { ...LEGACY_FOLDERS } };
	const index = new FormaIndex(vault.app);
	index.register(vault.plugin);
	const writer = new NoteWriter(vault.app);
	const days = new DayService(vault.app, index, writer, () => settings);
	const workouts = new WorkoutService(vault.app, index, writer, days, () => settings);
	const programs = new ProgramService(vault.app, index, writer, workouts, () => settings, () => {});
	const exporter = new ExportService(vault.app, index, writer, () => settings, () => 0);
	return { vault, settings, index, writer, days, workouts, programs, exporter };
}

function workout(partial: Partial<WorkoutNote> = {}): WorkoutNote {
	return { forma: "workout", schema: 1, date: "2026-10-03", sport: "strength", source: "manual", blocks: [], pain: [], ...partial };
}

let w: World;
beforeEach(() => {
	w = createWorld();
});

describe("NoteWriter", () => {
	it("založí poznámku i s nadřazenými složkami a existující nikdy nepřepíše", async () => {
		const first = await w.writer.createNote("Forma/Cíle/Bench 100.md", { forma: "goal", name: "Bench 100" }, "Popis.");
		const second = await w.writer.createNote("Forma/Cíle/Bench 100.md", { forma: "goal", name: "Bench 100" });
		expect(first.path).toBe("Forma/Cíle/Bench 100.md");
		expect(second.path).toBe("Forma/Cíle/Bench 100 (2).md");
		expect(w.vault.text(first.path)).toContain("Popis.");
		expect(await w.writer.createNoteIfMissing("Forma/Cíle/Bench 100.md", {})).toBeNull();
	});

	it("generovaný blok se přepisuje jen mezi značkami, text okolo zůstane", async () => {
		const file = w.vault.write("Forma/Deník/2026/2026-10-03.md", `---\n{"forma": "day", "schema": 1, "date": "2026-10-03"}\n---\nMoje poznámka nahoře.\n\n${START}\nstarý obsah\n${END}\n\nMoje poznámka dole.\n`);
		await w.writer.setGeneratedBlock(file, "nový obsah");
		const text = w.vault.text(file.path);
		expect(text).toContain("Moje poznámka nahoře.");
		expect(text).toContain("Moje poznámka dole.");
		expect(text).toContain(`${START}\nnový obsah\n${END}`);
		expect(text).not.toContain("starý obsah");
	});

	it("poškozené značky ohlásí a soubor nechá být", async () => {
		const original = `---\n{"forma": "day"}\n---\n${START}\nbez konce\n`;
		const file = w.vault.write("Forma/Deník/2026/x.md", original);
		await expect(w.writer.setGeneratedBlock(file, "nový")).rejects.toThrow("poškozené značky");
		expect(w.vault.text(file.path)).toBe(original);
	});
});

describe("DayService", () => {
	it("check-in založí denní poznámku s frontmatterem a souhrnem", async () => {
		const file = await w.days.saveCheckIn({ date: "2026-10-03", wake: "06:40", bedtime: "23:10", quality: 4, weight_kg: 61.2 });
		expect(file.path).toBe("Forma/Deník/2026/2026-10-03.md");
		expect(w.vault.frontmatter(file.path)).toMatchObject({
			forma: "day",
			schema: 1,
			date: "2026-10-03",
			sleep: { wake: "06:40", bedtime: "23:10", quality: 4, duration_min: 450 },
			body: { weight_kg: 61.2 },
		});
		const text = w.vault.text(file.path);
		expect(text).toContain("**Spánek:** 7 h 30 min");
		expect(text).toContain("**Váha:** 61,2 kg");
		expect(w.index.day("2026-10-03")?.note.body.weight_kg).toBe(61.2);
	});

	it("import denních hodnot doplní jen to, co chybí; zapsané hodnoty a spánek z časů nechá být", async () => {
		// 3. 10.: uživatel má váhu, kroky a spánek z časů (7 h 30 min); 4. 10. poznámka neexistuje.
		await w.days.saveCheckIn({ date: "2026-10-03", wake: "06:40", bedtime: "23:10", weight_kg: 61.2 });
		await w.days.setSteps("2026-10-03", 5000);
		const result = await w.days.fillMissing([
			{ date: "2026-10-03", steps: 9999, duration_min: 300, weight_kg: 70, rmssd_ms: 58, resting_hr: 52 },
			{ date: "2026-10-04", steps: 8431, duration_min: 465 },
			{ date: "2026-10-05" },
		]);
		// 3. 10. přibude HRV a klidový tep (2 hodnoty), 4. 10. kroky a spánek (2 hodnoty); 5. 10. nic.
		expect(result).toEqual({ days: 2, values: 4 });
		expect(w.vault.frontmatter("Forma/Deník/2026/2026-10-03.md")).toMatchObject({
			steps: 5000,
			sleep: { wake: "06:40", bedtime: "23:10", duration_min: 450 },
			body: { weight_kg: 61.2 },
			hrv: { rmssd_ms: 58, resting_hr: 52 },
		});
		expect(w.vault.frontmatter("Forma/Deník/2026/2026-10-04.md")).toMatchObject({ forma: "day", date: "2026-10-04", steps: 8431, sleep: { duration_min: 465 } });
		expect(w.vault.paths()).not.toContain("Forma/Deník/2026/2026-10-05.md");
		// Podruhé už není co doplnit.
		expect(await w.days.fillMissing([{ date: "2026-10-04", steps: 1, duration_min: 1 }])).toEqual({ days: 0, values: 0 });
	});

	it("úprava check-inu nepřepíše text, který si uživatel dopsal, ani cizí klíče ve frontmatteru", async () => {
		const file = await w.days.saveCheckIn({ date: "2026-10-03", quality: 3 });
		w.vault.write(file.path, `${w.vault.text(file.path)}\nDnes jsem měl těžký den.\n`.replace('"forma": "day"', '"forma": "day",\n "tags": ["deník"]'));
		await w.days.saveCheckIn({ date: "2026-10-03", quality: 5, mood: 4 });
		expect(w.vault.text(file.path)).toContain("Dnes jsem měl těžký den.");
		expect(w.vault.frontmatter(file.path)).toMatchObject({ tags: ["deník"], sleep: { quality: 5 }, check_in: { mood: 4 } });
		expect(w.vault.paths()).toEqual(["Forma/Deník/2026/2026-10-03.md"]);
	});

	it("kroky: zápis, řádek v souhrnu a smazání; bez poznámky se mazáním nic nezaloží", async () => {
		await w.days.setSteps("2026-10-02", undefined);
		expect(w.vault.paths()).toEqual([]);
		await w.days.setSteps("2026-10-02", 8200.4);
		const path = "Forma/Deník/2026/2026-10-02.md";
		expect(w.vault.frontmatter(path).steps).toBe(8200);
		expect(w.vault.text(path)).toContain("**Kroky:** 8200");
		await w.days.setSteps("2026-10-02", undefined);
		expect(w.vault.frontmatter(path).steps).toBeUndefined();
		expect(w.vault.text(path)).not.toContain("Kroky");
	});

	it("suplementy dne a řádek s výživou z pluginu", async () => {
		w.days.nutritionLine = (date, workouts) => `asi 2 000 kcal (${date}, tréninků ${workouts.length})`;
		expect(await w.days.updateSupplements("2026-10-03", (list) => [...list, "Kreatin"])).toEqual(["Kreatin"]);
		const text = w.vault.text("Forma/Deník/2026/2026-10-03.md");
		expect(text).toContain("**Suplementy:** Kreatin");
		expect(text).toContain("**Výživa – doporučení:** asi 2 000 kcal (2026-10-03, tréninků 0)");
		expect(await w.days.updateSupplements("2026-10-03", () => [])).toEqual([]);
		expect(w.vault.frontmatter("Forma/Deník/2026/2026-10-03.md").supplements).toBeUndefined();
	});
});

describe("WorkoutService", () => {
	it("stejný cvik: název, alias i velikost písmen; nový cvik v knihovně se projeví hned", () => {
		w.vault.write("Forma/Knihovna/Cviky/Shyby.md", `---
{"forma": "exercise", "schema": 1, "name": "Shyby", "aliases": ["Pull-up"]}
---
`);
		expect(w.workouts.isSameExercise("shyby", "Pull-up")).toBe(true);
		expect(w.workouts.isSameExercise(" SHYBY ", "Shyby")).toBe(true);
		expect(w.workouts.isSameExercise("Shyby", "Kliky")).toBe(false);
		// Vlastní cvik mimo knihovnu: rozhoduje jen název.
		expect(w.workouts.isSameExercise("Můj cvik", "můj cvik")).toBe(true);
		expect(w.workouts.isSameExercise("Můj cvik", "Shyby")).toBe(false);
		// „Nenalezeno“ si index pamatuje jen do další změny knihovny.
		expect(w.index.findExercise("Kliky")).toBeUndefined();
		w.vault.write("Forma/Knihovna/Cviky/Kliky.md", `---
{"forma": "exercise", "schema": 1, "name": "Kliky", "aliases": ["Push-up"]}
---
`);
		expect(w.index.findExercise("Kliky")?.note.name).toBe("Kliky");
		expect(w.workouts.isSameExercise("push-up", "Kliky")).toBe(true);
	});

	it("nový trénink: poznámka ve složce roku a řádek v denní poznámce", async () => {
		await w.days.saveCheckIn({ date: "2026-10-03", quality: 4 });
		const file = await w.workouts.saveNote(workout({ title: "Push", duration_min: 60, rpe: 7 }));
		expect(file.path).toBe("Forma/Tréninky/2026/2026-10-03 Posilovna – Push.md");
		expect(w.vault.frontmatter(file.path)).toMatchObject({ forma: "workout", date: "2026-10-03", sport: "strength", title: "Push", rpe: 7 });
		const day = w.vault.text("Forma/Deník/2026/2026-10-03.md");
		expect(day).toContain("[[2026-10-03 Posilovna – Push|Posilovna – Push]] · 60 min · RPE 7 · zátěž 420");
	});

	it("dva tréninky stejného názvu ve stejný den se nepřepíšou", async () => {
		const a = await w.workouts.saveNote(workout({ title: "Push" }));
		const b = await w.workouts.saveNote(workout({ title: "Push" }));
		expect(b.path).not.toBe(a.path);
		expect(w.index.all("workout")).toHaveLength(2);
	});

	it("úprava: změna data přesune řádek mezi denními poznámkami a zachová cizí klíče", async () => {
		await w.days.saveCheckIn({ date: "2026-10-03", quality: 4 });
		await w.days.saveCheckIn({ date: "2026-10-04", quality: 4 });
		const file = await w.workouts.saveNote(workout({ title: "Push", duration_min: 60, rpe: 7 }));
		w.vault.write(file.path, w.vault.text(file.path).replace('"forma": "workout"', '"forma": "workout",\n "můj_klíč": "zůstane"'));
		await w.workouts.saveNote(workout({ date: "2026-10-04", title: "Push", duration_min: 45, rpe: 6 }), file);
		expect(w.vault.frontmatter(file.path)).toMatchObject({ date: "2026-10-04", duration_min: 45, můj_klíč: "zůstane" });
		expect(w.vault.text("Forma/Deník/2026/2026-10-03.md")).toContain("Žádný zapsaný trénink.");
		expect(w.vault.text("Forma/Deník/2026/2026-10-04.md")).toContain("45 min · RPE 6");
	});

	it("po smazání tréninku zmizí z indexu a souhrn dne se obnoví", async () => {
		await w.days.saveCheckIn({ date: "2026-10-03", quality: 4 });
		const file = await w.workouts.saveNote(workout({ title: "Push", duration_min: 60, rpe: 7 }));
		await w.vault.app.fileManager.trashFile(file);
		expect(w.vault.trashed).toEqual([file.path]);
		expect(w.index.all("workout")).toHaveLength(0);
		await w.days.refreshBlock("2026-10-03", undefined, file);
		expect(w.vault.text("Forma/Deník/2026/2026-10-03.md")).toContain("Žádný zapsaný trénink.");
	});
});

describe("ExportService", () => {
	it("export uloží tři CSV soubory a při opakování nic nepřepíše", async () => {
		await w.days.saveCheckIn({ date: "2026-10-03", quality: 4, weight_kg: 61 });
		await w.workouts.saveNote(workout({ title: "Push", duration_min: 60, rpe: 7, blocks: [{ type: "sets", exercise: "Kliky", sets: [{ reps: 20 }] }] }));
		const when = new Date(2026, 9, 3, 14, 5);
		const first = await w.exporter.exportCsv(when);
		expect(first).toMatchObject({ folder: "Forma/Export", workouts: 1, days: 1 });
		expect(first.files).toEqual([
			"Forma/Export/Tréninky 2026-10-03 14-05.csv",
			"Forma/Export/Série 2026-10-03 14-05.csv",
			"Forma/Export/Dny 2026-10-03 14-05.csv",
		]);
		expect(w.vault.text(first.files[1]!)).toContain("2026-10-03;Posilovna – Push;série;1;Kliky;1;20");
		const second = await w.exporter.exportCsv(when);
		expect(second.files[0]).toBe("Forma/Export/Tréninky 2026-10-03 14-05 (2).csv");
	});

	it("záloha zabalí celou kořenovou složku do ZIP mimo ni", async () => {
		await w.days.saveCheckIn({ date: "2026-10-03", quality: 4 });
		w.vault.write("Jiné/poznámka.md", "nepatří do zálohy");
		const result = await w.exporter.backup(new Date(2026, 9, 3, 14, 5));
		expect(result.path).toBe("Better Form backups/Forma 2026-10-03 14-05.zip");
		expect(result.files).toBe(1);
		const zip = new Uint8Array(await w.vault.app.vault.readBinary(w.vault.app.vault.getAbstractFileByPath(result.path) as never));
		expect(zip.length).toBe(result.bytes);
		// Název jediného souboru v archivu a kontrolní součet jeho obsahu.
		const view = new DataView(zip.buffer);
		const nameLength = view.getUint16(26, true);
		expect(new TextDecoder().decode(zip.subarray(30, 30 + nameLength))).toBe("Forma/Deník/2026/2026-10-03.md");
		expect(view.getUint32(14, true)).toBe(crc32(new TextEncoder().encode(w.vault.text("Forma/Deník/2026/2026-10-03.md"))));
		// Další záloha tu předchozí nezahrne (je mimo kořen) a nepřepíše ji.
		const again = await w.exporter.backup(new Date(2026, 9, 3, 14, 5));
		expect(again.path).toBe("Better Form backups/Forma 2026-10-03 14-05 (2).zip");
		expect(again.files).toBe(1);
	});

	it("záloha odmítne složku uvnitř kořene a prázdný kořen", async () => {
		await expect(w.exporter.backup()).rejects.toThrow("není co zálohovat");
		await w.days.saveCheckIn({ date: "2026-10-03", quality: 4 });
		w.settings.backupFolder = "Forma/Zálohy";
		await expect(w.exporter.backup()).rejects.toThrow("nesmí být uvnitř kořenové složky");
	});
});

describe("ProgramService – program ze souboru", () => {
	const LIST = "# Můj plán\n\n## Pondělí a pátek\n- pushups: 3×10\n- Vzpory na bradlech: 3×8\n\n## Středa\n- Běh: 5 km\n- Protáhnout se\n";

	beforeEach(async () => {
		// Knihovna: „Kliky“ s aliasem a „Běh“.
		await w.writer.createNote("Forma/Knihovna/Cviky/Kliky.md", { forma: "exercise", schema: 1, name: "Kliky", aliases: ["pushups"], category: "calisthenics", kind: "grind", measure: "reps_bw", muscles: { primary: ["chest"], secondary: [] } });
		await w.writer.createNote("Forma/Knihovna/Cviky/Běh.md", { forma: "exercise", schema: 1, name: "Běh", aliases: [], category: "cardio", kind: "grind", measure: "distance", muscles: { primary: [], secondary: [] } });
	});

	it("seznam v Markdownu: vlastní neaktivní program, názvy cviků podle knihovny, hlášení", async () => {
		const report = await w.programs.importFile("plan.md", LIST);
		expect(report).toMatchObject({ name: "Můj plán", format: "list", items: 3, dropped: 0, skipped: ["- Protáhnout se"], unknownExercises: ["Vzpory na bradlech"], defaultDays: false });
		expect(report.file.path).toBe("Forma/Knihovna/Programy/Můj plán.md");
		const fm = w.vault.frontmatter(report.file.path);
		expect(fm).toMatchObject({ forma: "program", name: "Můj plán", builtin: false, active: false, days: ["mon", "wed", "fri"] });
		const program = w.index.all("program")[0]!.note;
		expect(program.items.map((i) => [i.exercise, i.target.kind, i.days])).toEqual([
			["Kliky", "sets_reps", ["mon", "fri"]],
			["Vzpory na bradlech", "sets_reps", ["mon", "fri"]],
			["Běh", "distance", ["wed"]],
		]);
		// Původní text zůstane v poznámce jako popis.
		expect(w.vault.text(report.file.path)).toContain("## Pondělí a pátek");
	});

	it("stejný název podruhé dostane pořadové číslo; soubor bez položek se odmítne", async () => {
		await w.programs.importFile("plan.md", LIST);
		const second = await w.programs.importFile("plan.md", LIST);
		expect(second.name).toBe("Můj plán (2)");
		await expect(w.programs.importFile("prazdny.md", "Jen text bez odrážek.")).rejects.toThrow("nenašel žádnou položku");
		expect(w.index.all("program")).toHaveLength(2);
	});

	it("JSON i vložený text bez názvu souboru", async () => {
		const json = JSON.stringify({ name: "Z JSONu", days: ["tue"], items: [{ exercise: "Kliky", target: { sets: 3, reps: 12 } }, { exercise: "Bez cíle" }] });
		const report = await w.programs.importFile("", json);
		expect(report).toMatchObject({ name: "Z JSONu", format: "json", items: 1, dropped: 1, unknownExercises: [] });
		expect((await w.programs.importText("- Běh: 3 km")).basename).toBe("Importovaný program");
	});
});
