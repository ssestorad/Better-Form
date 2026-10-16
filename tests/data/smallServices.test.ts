// Menší služby proti trezoru v paměti: suplementy, bolesti, boty, cíle a normy.
import { beforeEach, describe, expect, it } from "vitest";
import { DayService } from "../../src/data/DayService";
import { FormaIndex } from "../../src/data/FormaIndex";
import { GearService } from "../../src/data/GearService";
import { GoalService } from "../../src/data/GoalService";
import { NoteWriter } from "../../src/data/NoteWriter";
import { PainService } from "../../src/data/PainService";
import { SupplementService } from "../../src/data/SupplementService";
import { WorkoutService } from "../../src/data/WorkoutService";
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
	let changes = 0;
	const onChange = () => changes++;
	return {
		vault,
		settings,
		index,
		days,
		workouts,
		supplements: new SupplementService(index, writer, days, () => settings, onChange),
		pains: new PainService(index, writer, () => settings, onChange),
		gear: new GearService(index, writer, () => settings),
		goals: new GoalService(index, writer, () => settings, () => ({ info: () => undefined }), (a, b) => a === b, onChange),
		changes: () => changes,
	};
}

let w: ReturnType<typeof createWorld>;
beforeEach(() => {
	w = createWorld();
});

describe("SupplementService", () => {
	const draft = { name: "Kreatin", catalog: "creatine", dose: 5, unit: "g", timing: "any" as const, trainingDaysOnly: false };

	it("založení, odmítnutí duplicity bez ohledu na velikost písmen", async () => {
		const file = await w.supplements.create(draft, "2026-10-01");
		expect(file.path).toBe("Forma/Knihovna/Suplementy/Kreatin.md");
		expect(w.vault.frontmatter(file.path)).toMatchObject({ forma: "supplement", name: "Kreatin", catalog: "creatine", dose: 5, unit: "g", active: true, since: "2026-10-01" });
		await expect(w.supplements.create({ ...draft, name: " kreatin " }, "2026-10-02")).rejects.toThrow("už v seznamu je");
		await expect(w.supplements.create({ ...draft, name: "  " }, "2026-10-02")).rejects.toThrow("Chybí název");
	});

	it("vlastní přípravek z etikety: složení ve frontmatteru, fotka vedle poznámky; úprava dávky složení zachová", async () => {
		const ingredients = [{ name: "Zinek", amount: 10, unit: "mg", catalog: "zinc" }, { name: "Niacin", amount: 16, unit: "mg" }];
		const product = { name: "Multivitamin", dose: 1, unit: "tableta", timing: "morning" as const, trainingDaysOnly: false, ingredients };
		const file = await w.supplements.create(product, "2026-10-01", { extension: "jpg", data: new ArrayBuffer(4) });
		expect(w.vault.frontmatter(file.path)).toMatchObject({ name: "Multivitamin", dose: 1, unit: "tableta", ingredients });
		expect(w.vault.paths()).toContain("Forma/Knihovna/Suplementy/Multivitamin – etiketa.jpg");
		expect(w.vault.text(file.path)).toContain("![[Multivitamin – etiketa.jpg]]");
		await w.supplements.update(w.supplements.find("Multivitamin")!, { ...product, dose: 2, ingredients: undefined });
		expect(w.vault.frontmatter(file.path)).toMatchObject({ dose: 2, ingredients });
	});

	it("odškrtnutí se zapíše do denní poznámky; vypnutí zachová začátek, zapnutí ho posune", async () => {
		await w.supplements.create(draft, "2026-10-01");
		await w.supplements.setTaken("2026-10-03", "Kreatin", true);
		expect(w.vault.frontmatter("Forma/Deník/2026/2026-10-03.md").supplements).toEqual(["Kreatin"]);
		expect(w.supplements.taken("2026-10-03")).toEqual(["Kreatin"]);
		await w.supplements.setTaken("2026-10-03", "Kreatin", false);
		expect(w.vault.frontmatter("Forma/Deník/2026/2026-10-03.md").supplements).toBeUndefined();

		await w.supplements.setActive(w.supplements.find("Kreatin")!, false, "2026-10-05");
		expect(w.supplements.active()).toHaveLength(0);
		expect(w.supplements.find("Kreatin")!.note.since).toBe("2026-10-01");
		await w.supplements.setActive(w.supplements.find("Kreatin")!, true, "2026-10-09");
		expect(w.supplements.find("Kreatin")!.note).toMatchObject({ active: true, since: "2026-10-09" });
	});

	it("hmotnost: poslední zapsaná v check-inu, jinak z profilu, jinak null", async () => {
		expect(w.supplements.weightKg()).toBeNull();
		w.settings.profile.weightKg = 60;
		expect(w.supplements.weightKg()).toBe(60);
		await w.days.saveCheckIn({ date: "2026-10-01", weight_kg: 61.5 });
		await w.days.saveCheckIn({ date: "2026-10-03", weight_kg: 61 });
		await w.days.saveCheckIn({ date: "2026-10-04", quality: 4 });
		expect(w.supplements.weightKg()).toBe(61);
	});
});

describe("PainService", () => {
	it("založení, zlepšení a uzavření nulou; historie zůstává", async () => {
		const file = await w.pains.create({ name: "Pravé koleno", muscle: "quads", side: "right", level: 5, trigger: "běh z kopce" }, "2026-10-01");
		expect(file.path).toBe("Forma/Zdraví/Bolesti/Pravé koleno.md");
		await expect(w.pains.create({ name: "pravé koleno", muscle: "quads", level: 2 }, "2026-10-02")).rejects.toThrow("už existuje");

		await w.pains.record(w.pains.find("Pravé koleno")!, "2026-10-03", 3);
		expect(w.pains.find("Pravé koleno")!.note).toMatchObject({ level: 3, status: "improving" });
		expect(w.pains.open()).toHaveLength(1);

		await w.pains.record(w.pains.find("Pravé koleno")!, "2026-10-06", 0);
		const note = w.pains.find("Pravé koleno")!.note;
		expect(note).toMatchObject({ level: 0, status: "resolved", since: "2026-10-01" });
		expect(note.history).toEqual([
			{ date: "2026-10-01", level: 5 },
			{ date: "2026-10-03", level: 3 },
			{ date: "2026-10-06", level: 0 },
		]);
		expect(w.pains.open()).toHaveLength(0);
		expect(w.changes()).toBe(3);
	});

	it("bolest z tréninku: nový záznam, podruhé jen nová intenzita", async () => {
		const link = await w.pains.report({ level: 4, draft: { name: "Loket", muscle: "triceps" } }, "2026-10-01");
		expect(link).toBe("Loket");
		expect(await w.pains.report({ level: 6, existing: "Loket" }, "2026-10-02")).toBe("Loket");
		expect(w.index.all("pain")).toHaveLength(1);
		expect(w.pains.find("Loket")!.note.level).toBe(6);
		await expect(w.pains.report({ level: 3, existing: "Neexistuje" }, "2026-10-02")).rejects.toThrow("nejde najít");
	});
});

describe("GearService", () => {
	it("boty: kilometry = počáteční stav + běhy, které na ně odkazují; vyřazení je schová z výběru", async () => {
		await w.gear.create({ name: "Pegasus 40", startKm: 250, limitKm: 300 });
		await expect(w.gear.create({ name: "pegasus 40" })).rejects.toThrow("už v seznamu jsou");
		const run = (date: string, km: number, shoes?: string) =>
			w.workouts.saveNote({ forma: "workout", schema: 1, date, sport: "run", source: "manual", blocks: [], pain: [], run: { distance_km: km, shoes } });
		const first = await run("2026-10-01", 10, "Pegasus 40");
		await run("2026-10-02", 30, "pegasus 40");
		await run("2026-10-03", 5);
		// V poznámce je odkaz na boty zapsaný jako wikiodkaz.
		expect((w.vault.frontmatter(first.path).run as { shoes: string }).shoes).toBe("[[Pegasus 40]]");
		const entry = w.gear.shoes()[0]!;
		expect(w.gear.usage(entry)).toMatchObject({ km: 290, limitKm: 300, runs: 2, status: "near" });
		expect(w.gear.activeShoeNames()).toEqual(["Pegasus 40"]);
		await w.gear.setActive(entry, false);
		expect(w.gear.activeShoeNames()).toEqual([]);
		expect(w.gear.usage(w.gear.shoes()[0]!).km).toBe(290);
	});
});

describe("GoalService", () => {
	it("cíl hmotnosti: výchozí stav z vážení, uzavření a obnovení", async () => {
		await w.days.saveCheckIn({ date: "2026-10-01", weight_kg: 62 });
		await w.days.saveCheckIn({ date: "2026-10-03", weight_kg: 61 });
		const file = await w.goals.create({ name: "Váha 65 kg", type: "body_weight", target: 65 }, "2026-10-03");
		expect(file.path).toBe("Forma/Cíle/Váha 65 kg.md");
		// Aktuální stav = průměr vážení za 7 dní = 61,5 kg.
		expect(w.vault.frontmatter(file.path)).toMatchObject({ forma: "goal", type: "body_weight", target: 65, created: "2026-10-03", status: "active", start_value: 61.5 });
		await expect(w.goals.create({ name: "váha 65 kg", type: "body_weight", target: 66 }, "2026-10-04")).rejects.toThrow("už existuje");

		await w.goals.setStatus(w.goals.goals()[0]!, "done");
		expect(w.goals.goals()[0]!.note.status).toBe("done");
		await w.goals.updateGoal(w.goals.goals()[0]!, { target: 66, deadline: "2027-01-01" });
		expect(w.goals.goals()[0]!.note).toMatchObject({ target: 66, deadline: "2027-01-01", start_value: 61.5 });
	});

	it("norma se ukládá do složky Testy; prázdnou ani duplicitní nevezme", async () => {
		const items = [{ exercise: "Kliky", kind: "reps" as const, rows: [{ value: 30 }] }];
		const file = await w.goals.saveNorm({ name: "Fyzické testy", items });
		expect(file.path).toBe("Forma/Testy/Fyzické testy.md");
		await expect(w.goals.saveNorm({ name: "Fyzické testy", items })).rejects.toThrow("už existuje");
		await expect(w.goals.saveNorm({ name: "Prázdná", items: [] })).rejects.toThrow("nemá žádnou disciplínu");
		// Úprava existující normy přepíše jen spravované klíče.
		await w.goals.saveNorm({ name: "Fyzické testy", items: [{ exercise: "Kliky", kind: "reps", rows: [{ value: 40 }] }] }, w.goals.norms()[0]);
		expect(w.goals.norms()[0]!.note.items[0]!.rows[0]!.value).toBe(40);
		expect(w.index.all("norm")).toHaveLength(1);
	});
});
