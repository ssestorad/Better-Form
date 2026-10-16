// Plán týdne proti trezoru v paměti: týdenní poznámka, položky, přesun, kopie.
import { beforeEach, describe, expect, it } from "vitest";
import { DayService } from "../../src/data/DayService";
import { FormaIndex } from "../../src/data/FormaIndex";
import { NoteWriter } from "../../src/data/NoteWriter";
import { planItemFromDraft, PlanService, type PlanDraft } from "../../src/data/PlanService";
import { planBlock, planItemDetails, planItemTitle } from "../../src/data/planBlock";
import { ProgramService } from "../../src/data/ProgramService";
import { WorkoutService } from "../../src/data/WorkoutService";
import { parsePlan } from "../../src/model/parse";
import { planItemToFrontmatter } from "../../src/model/serialize";
import type { PlanItem } from "../../src/model/types";
import { LEGACY_FOLDERS, mergeSettings } from "../../src/settings/settings";
import { createFakeVault } from "../helpers/fakeVault";

// Týden od pondělí 5. 10. 2026; „dnes“ je středa 7. 10.
const WEEK = "2026-10-05";
const TODAY = "2026-10-07";
const PATH = "Forma/Plán/2026/Týden 2026-10-05.md";

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
	const plans = new PlanService(vault.app, index, writer, () => settings, () => changes++);
	return { vault, settings, index, workouts, plans, changes: () => changes };
}

let w: ReturnType<typeof createWorld>;
beforeEach(() => {
	w = createWorld();
});

const run: PlanDraft = { date: "2026-10-08", sport: "run", title: "Tempo", durationMin: 50, intensity: "high", distanceKm: 9 };
const gym: PlanDraft = { date: "2026-10-06", sport: "strength", template: "Push", durationMin: 60, intensity: "mid" };

function workoutNote(date: string, sport: "run" | "strength", extra: Record<string, unknown> = {}): string {
	return `---\n${JSON.stringify({ forma: "workout", schema: 1, date, sport, source: "manual", blocks: [], pain: [], ...extra })}\n---\n`;
}

describe("model plánu", () => {
	it("čtení: týden musí být pondělí, položky mimo týden a bez sportu se přeskočí", () => {
		expect(parsePlan({ forma: "plan", week: "2026-10-06" })).toBeNull();
		const plan = parsePlan({
			forma: "plan",
			schema: 1,
			week: WEEK,
			items: [
				{ id: "a", date: "2026-10-05", sport: "run", distance_km: "8,5", duration_min: 50, intensity: "low", template: "[[Lehký běh]]" },
				{ date: "2026-10-06", sport: "strength", distance_km: 3, intensity: "nesmysl" },
				{ date: "2026-10-12", sport: "run" },
				{ date: "2026-10-07", sport: "šachy" },
				{ id: "a", date: "2026-10-07", sport: "swim", duration_min: -5 },
			],
		});
		expect(plan?.items).toEqual([
			{ id: "a", date: "2026-10-05", sport: "run", template: "Lehký běh", duration_min: 50, intensity: "low", distance_km: 8.5 },
			{ id: "p2", date: "2026-10-06", sport: "strength", intensity: "mid" },
			{ id: "p5", date: "2026-10-07", sport: "swim", intensity: "mid" },
		]);
	});

	it("zápis a zpětné čtení dá stejný plán", () => {
		const plan = parsePlan({ forma: "plan", schema: 1, week: WEEK, items: [{ id: "p1", date: "2026-10-05", sport: "run", template: "[[Lehký běh]]", intensity: "low", notes: "po práci" }] })!;
		const items = plan.items.map(planItemToFrontmatter);
		expect(items).toEqual([{ id: "p1", date: "2026-10-05", sport: "run", template: "[[Lehký běh]]", intensity: "low", notes: "po práci" }]);
		expect(parsePlan({ forma: "plan", schema: 1, week: WEEK, items })).toEqual(plan);
	});

	it("formulář: ověření hodnot", () => {
		expect(planItemFromDraft({ ...run, title: "  ", notes: " po práci " }, "p1")).toEqual({ id: "p1", date: "2026-10-08", sport: "run", duration_min: 50, intensity: "high", distance_km: 9, notes: "po práci" });
		// Vzdálenost patří jen k běhu.
		expect(planItemFromDraft({ ...gym, distanceKm: 5 }, "p1").distance_km).toBeUndefined();
		expect(() => planItemFromDraft({ ...run, durationMin: 0 }, "p1")).toThrow("Délka");
		expect(() => planItemFromDraft({ ...run, distanceKm: -1 }, "p1")).toThrow("Vzdálenost");
		expect(() => planItemFromDraft({ ...run, date: "zítra" }, "p1")).toThrow("Chybí den");
	});

	it("texty položky a tabulka týdne", () => {
		const item: PlanItem = { id: "p1", date: "2026-10-08", sport: "run", title: "Tempo", duration_min: 50, intensity: "high", distance_km: 9 };
		expect(planItemTitle(item)).toBe("Běh – Tempo");
		expect(planItemTitle({ ...item, title: undefined, template: "Okruh" })).toBe("Běh – Okruh");
		expect(planItemTitle({ ...item, title: undefined })).toBe("Běh");
		expect(planItemDetails(item)).toBe("9 km · 50 min · těžká");
		expect(planItemDetails({ ...item, duration_min: undefined }, { minutes: 54, estimated: true })).toBe("9 km · asi 54 min · těžká");
		const lines = planBlock(WEEK, [item, { id: "p2", date: "2026-10-08", sport: "strength", intensity: "low", notes: "jen | mobilita" }]).split("\n");
		expect(lines).toHaveLength(9);
		expect(lines[2]).toBe("| po 5. 10. | volno |");
		expect(lines[5]).toBe("| čt 8. 10. | Běh – Tempo (9 km · 50 min · těžká)<br>Posilovna (lehká) – jen / mobilita |");
	});
});

describe("PlanService", () => {
	it("první položka založí poznámku týdne s tabulkou; další se přidají do téže poznámky", async () => {
		await w.plans.add(run);
		await w.plans.add(gym);
		expect(w.vault.paths()).toEqual([PATH]);
		expect(w.vault.frontmatter(PATH)).toEqual({
			forma: "plan",
			schema: 1,
			week: WEEK,
			items: [
				{ id: "p2", date: "2026-10-06", sport: "strength", template: "[[Push]]", duration_min: 60, intensity: "mid" },
				{ id: "p1", date: "2026-10-08", sport: "run", title: "Tempo", duration_min: 50, intensity: "high", distance_km: 9 },
			],
		});
		expect(w.vault.text(PATH)).toContain("<!-- forma:start -->\n| Den | Plán |");
		expect(w.vault.text(PATH)).toContain("| út 6. 10. | Posilovna – Push (1 h · střední) |");
		expect(w.plans.items(WEEK).map((i) => i.id)).toEqual(["p2", "p1"]);
		expect(w.changes()).toBe(2);
	});

	it("text uživatele v poznámce a cizí klíče zůstanou, nečitelný řádek se nesmaže", async () => {
		w.vault.write(PATH, `---\n${JSON.stringify({ forma: "plan", schema: 1, week: WEEK, tags: ["plan"], items: [{ date: "2026-10-05", sport: "run" }, { date: "někdy", sport: "run" }] })}\n---\n\nMoje poznámka k týdnu.\n`);
		await w.plans.add(gym);
		const fm = w.vault.frontmatter(PATH);
		expect(fm.tags).toEqual(["plan"]);
		expect(fm.items).toEqual([
			{ id: "p1", date: "2026-10-05", sport: "run", intensity: "mid" },
			{ id: "p2", date: "2026-10-06", sport: "strength", template: "[[Push]]", duration_min: 60, intensity: "mid" },
			{ date: "někdy", sport: "run" },
		]);
		expect(w.vault.text(PATH)).toContain("Moje poznámka k týdnu.");
	});

	it("stav: zapsaný trénink položku splní, starší bez tréninku je vynechaná", async () => {
		await w.plans.add({ date: "2026-10-05", sport: "run", durationMin: 40, intensity: "low" });
		await w.plans.add(gym);
		await w.plans.add(run);
		w.vault.write("Forma/Tréninky/2026/2026-10-05 Běh.md", workoutNote("2026-10-05", "run", { duration_min: 42, rpe: 3 }));
		const view = w.plans.view(WEEK, TODAY);
		expect(view.days.map((d) => d.entries.map((e) => e.status))).toEqual([["done"], ["missed"], [], ["planned"], [], [], []]);
		expect(view.days[0]!.entries[0]!.workout?.file.path).toBe("Forma/Tréninky/2026/2026-10-05 Běh.md");
		expect(view.summary).toMatchObject({ planned: 3, done: 1, missed: 1, plannedMin: 150, actualMin: 42, plannedRunKm: 9 });
		// Zapsáno 42 × 3 = 126 AU, v plánu zbývá těžký běh 50 × 8 = 400 AU; historie chybí.
		expect(view.outlook).toMatchObject({ actual: 126, planned: 400, expected: 526, average: null, ratio: null });
		expect(view.file?.path).toBe(PATH);
	});

	it("trénink z denního počítadla plán neplní", async () => {
		await w.plans.add({ date: TODAY, sport: "strength", intensity: "mid" });
		w.vault.write("Forma/Tréninky/2026/2026-10-07 Kliky.md", workoutNote(TODAY, "strength"));
		expect(w.plans.pending(TODAY, TODAY)).toHaveLength(0);
		w.plans.isCounterWorkout = () => true;
		expect(w.plans.pending(TODAY, TODAY)).toHaveLength(1);
	});

	it("nesplněné položky dne jako tréninky pro výživu; minulé dny a splněné ne", async () => {
		await w.plans.add(run);
		expect(w.plans.plannedWorkouts("2026-10-08", TODAY)).toMatchObject([{ date: "2026-10-08", sport: "run", rpe: 8, duration_min: 50, run: { distance_km: 9 } }]);
		expect(w.plans.plannedWorkouts("2026-10-09", TODAY)).toEqual([]);
		expect(w.plans.plannedWorkouts("2026-10-08", "2026-10-09")).toEqual([]);
		w.vault.write("Forma/Tréninky/2026/2026-10-08 Běh.md", workoutNote("2026-10-08", "run"));
		expect(w.plans.plannedWorkouts("2026-10-08", "2026-10-08")).toEqual([]);
	});

	it("úprava, přesun v týdnu i do dalšího týdne, smazání", async () => {
		await w.plans.add(run);
		const [item] = w.plans.items(WEEK);
		await w.plans.update(item!, { ...run, durationMin: 55, intensity: "mid" });
		expect(w.plans.items(WEEK)).toEqual([{ id: "p1", date: "2026-10-08", sport: "run", title: "Tempo", duration_min: 55, intensity: "mid", distance_km: 9 }]);

		await w.plans.move(w.plans.items(WEEK)[0]!, "2026-10-10");
		expect(w.plans.items(WEEK)[0]).toMatchObject({ id: "p1", date: "2026-10-10" });
		expect(w.vault.text(PATH)).toContain("| so 10. 10. | Běh – Tempo (9 km · 55 min · střední) |");

		await w.plans.move(w.plans.items(WEEK)[0]!, "2026-10-13");
		expect(w.plans.items(WEEK)).toEqual([]);
		expect(w.plans.items("2026-10-12")).toEqual([{ id: "p1", date: "2026-10-13", sport: "run", title: "Tempo", duration_min: 55, intensity: "mid", distance_km: 9 }]);
		expect(w.vault.text(PATH)).toContain("| so 10. 10. | volno |");

		await w.plans.remove(w.plans.items("2026-10-12")[0]!);
		expect(w.vault.frontmatter("Forma/Plán/2026/Týden 2026-10-12.md").items).toEqual([]);
	});

	it("kopie minulého týdne přidá položky na stejné dny v týdnu", async () => {
		await w.plans.add(run);
		await w.plans.add(gym);
		await w.plans.add({ date: "2026-10-13", sport: "swim", intensity: "low" });
		expect(await w.plans.copyPrevious("2026-10-12")).toBe(2);
		expect(w.plans.items("2026-10-12").map((i) => [i.id, i.date, i.sport])).toEqual([
			["p1", "2026-10-13", "swim"],
			["p2", "2026-10-13", "strength"],
			["p3", "2026-10-15", "run"],
		]);
		expect(await w.plans.copyPrevious(WEEK)).toBe(0);
	});

	it("poznámka z novější verze pluginu se nepřepíše", async () => {
		w.vault.write(PATH, `---\n${JSON.stringify({ forma: "plan", schema: 99, week: WEEK, items: [] })}\n---\n`);
		await expect(w.plans.add(run)).rejects.toThrow("novější verze");
	});
});

describe("programy v plánu týdne", () => {
	const PROGRAM = "Forma/Knihovna/Programy/Síla.md";

	function withPrograms() {
		const programs = new ProgramService(w.vault.app, w.index, new NoteWriter(w.vault.app), w.workouts, () => w.settings, () => {});
		w.plans.isCounterWorkout = (note) => programs.isCounterWorkout(note);
		w.plans.isProgramSession = (note) => programs.isPlanSession(note);
		w.plans.programsOn = (date) => programs.planDays(date);
		return programs;
	}

	function program(name: string, extra: Record<string, unknown>): string {
		return `---\n${JSON.stringify({ forma: "program", schema: 1, name, builtin: false, evidence: "practice", progression: { rule: "none" }, active: true, active_since: WEEK, ...extra })}\n---\n`;
	}

	let programs: ProgramService;
	beforeEach(() => {
		programs = withPrograms();
		w.vault.write("Forma/Knihovna/Cviky/Kliky.md", `---\n${JSON.stringify({ forma: "exercise", schema: 1, name: "Kliky", aliases: [], category: "calisthenics", kind: "grind", measure: "reps_bw", muscles: { primary: ["chest"], secondary: [] } })}\n---\n`);
		// Po, st, pá: 3×10 kliků; trénink trvá 40 minut a je těžký.
		w.vault.write(PROGRAM, program("Síla", { days: ["mon", "wed", "fri"], items: [{ exercise: "[[Kliky]]", target: { sets: 3, reps: 10 } }], session_min: 40, intensity: "high" }));
		// Denní počítadlo – i s délkou se do zátěže nepočítá.
		w.vault.write("Forma/Knihovna/Programy/100 kliků denně.md", program("100 kliků denně", { days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], items: [{ exercise: "[[Kliky]]", target: { daily_total: 100 } }], session_min: 15 }));
	});

	it("délka a intenzita tréninku se z programu čtou a zapisují", async () => {
		const entry = programs.programs().find((p) => p.note.name === "Síla")!;
		expect(entry.note).toMatchObject({ session_min: 40, intensity: "high" });
		await programs.setSession(entry, 55.4, "low");
		expect(w.vault.frontmatter(PROGRAM)).toMatchObject({ session_min: 55, intensity: "low", name: "Síla", active: true });
		await programs.setSession(programs.programs().find((p) => p.note.name === "Síla")!, undefined, undefined);
		expect(w.vault.frontmatter(PROGRAM).session_min).toBeUndefined();
		expect(w.vault.frontmatter(PROGRAM).intensity).toBeUndefined();
		await expect(programs.setSession(entry, 0, "mid")).rejects.toThrow("Délka tréninku");
	});

	it("dny programu s délkou jsou položkami plánu; počítadlo a program bez délky jen k zobrazení", () => {
		const view = w.plans.view(WEEK, TODAY);
		expect(view.days.map((d) => d.entries.map((e) => [e.program?.name, e.status]))).toEqual([[["Síla", "missed"]], [], [["Síla", "planned"]], [], [["Síla", "planned"]], [], []]);
		expect(view.days[2]!.entries[0]).toMatchObject({ item: { id: `program:${PROGRAM}`, date: TODAY, sport: "calisthenics", title: "Síla", duration_min: 40, intensity: "high" }, minutes: { minutes: 40, estimated: false } });
		expect(view.days[2]!.entries[0]!.program?.text).toBe("Kliky 3×10");
		expect(view.days.map((d) => d.programs.map((p) => [p.name, p.loggable]))).toEqual(Array.from({ length: 7 }, () => [["100 kliků denně", false]]));
		// Souhrn: 3 dny po 40 minutách; v plánu zbývají dva těžké tréninky = 2 × 40 × 8 AU.
		expect(view.summary).toMatchObject({ planned: 3, done: 0, missed: 1, plannedMin: 120 });
		expect(view.outlook).toMatchObject({ actual: 0, planned: 640, expected: 640 });
	});

	it("výživa a doporučení vidí nesplněný den programu; zapsaný trénink z programu ho splní", () => {
		expect(w.plans.plannedWorkouts("2026-10-09", TODAY)).toMatchObject([{ date: "2026-10-09", sport: "calisthenics", duration_min: 40, rpe: 8, title: "Síla" }]);
		expect(w.plans.pending(TODAY, TODAY).map((e) => e.program?.name)).toEqual(["Síla"]);
		w.vault.write("Forma/Tréninky/2026/2026-10-07 Síla.md", workoutNote(TODAY, "strength", { sport: "calisthenics", program: "[[Síla]]", duration_min: 35, rpe: 7 }));
		const view = w.plans.view(WEEK, TODAY);
		expect(view.days[2]!.entries.map((e) => e.status)).toEqual(["done"]);
		expect(w.plans.plannedWorkouts(TODAY, TODAY)).toEqual([]);
		// Zapsáno 35 × 7 = 245 AU, v plánu zbývá pátek 40 × 8 = 320 AU.
		expect(view.outlook).toMatchObject({ actual: 245, planned: 320, expected: 565 });
	});

	it("trénink z programu nesplní ručně naplánovanou položku stejného sportu", async () => {
		await w.plans.add({ date: TODAY, sport: "calisthenics", title: "Kruhy", intensity: "mid" });
		w.vault.write("Forma/Tréninky/2026/2026-10-07 Síla.md", workoutNote(TODAY, "strength", { sport: "calisthenics", program: "[[Síla]]", duration_min: 35 }));
		expect(w.plans.view(WEEK, TODAY).days[2]!.entries.map((e) => [e.item.title, e.status])).toEqual([
			["Kruhy", "planned"],
			["Síla", "done"],
		]);
	});

	it("den programu nejde upravit ani smazat jako položku plánu", async () => {
		const entry = w.plans.pending(TODAY, TODAY)[0]!;
		await expect(w.plans.remove(entry.item)).rejects.toThrow("Den programu");
		await expect(w.plans.move(entry.item, "2026-10-08")).rejects.toThrow("Den programu");
		expect(w.vault.paths().filter((p) => p.startsWith("Forma/Plán"))).toEqual([]);
	});

	it("tabulka v poznámce týdne obsahuje dny programů a po změně programu se obnoví", async () => {
		await w.plans.add(run);
		expect(w.vault.text(PATH)).toContain("| po 5. 10. | Program 100 kliků denně<br>Program Síla (40 min · těžká) |");
		expect(w.vault.text(PATH)).toContain("| čt 8. 10. | Běh – Tempo (9 km · 50 min · těžká)<br>Program 100 kliků denně |");
		expect(await w.plans.refreshBlock(WEEK)).toBe(false);
		await programs.setSession(programs.programs().find((p) => p.note.name === "Síla")!, 60, "mid");
		expect(await w.plans.refreshBlock(WEEK)).toBe(true);
		expect(w.vault.text(PATH)).toContain("| po 5. 10. | Program 100 kliků denně<br>Program Síla (1 h · střední) |");
		expect(await w.plans.refreshBlock(WEEK)).toBe(false);
		// Týden bez poznámky se nezakládá.
		expect(await w.plans.refreshBlock("2026-10-12")).toBe(false);
		expect(w.vault.paths().filter((p) => p.startsWith("Forma/Plán"))).toEqual([PATH]);
	});
});

describe("historie programu v plánu týdne", () => {
	const PROGRAM = "Forma/Knihovna/Programy/Síla.md";
	const LOGGED = "Forma/Tréninky/2026/2026-10-05 Síla.md";
	let programs: ProgramService;

	beforeEach(() => {
		programs = new ProgramService(w.vault.app, w.index, new NoteWriter(w.vault.app), w.workouts, () => w.settings, () => {});
		w.plans.isCounterWorkout = (note) => programs.isCounterWorkout(note);
		w.plans.isProgramSession = (note) => programs.isPlanSession(note);
		w.plans.programsOn = (date) => programs.planDays(date);
		w.vault.write("Forma/Knihovna/Cviky/Kliky.md", `---\n${JSON.stringify({ forma: "exercise", schema: 1, name: "Kliky", aliases: [], category: "calisthenics", kind: "grind", measure: "reps_bw", muscles: { primary: ["chest"], secondary: [] } })}\n---\n`);
		w.vault.write(
			PROGRAM,
			`---\n${JSON.stringify({ forma: "program", schema: 1, name: "Síla", builtin: false, evidence: "practice", progression: { rule: "none" }, active: true, active_since: WEEK, days: ["mon", "wed", "fri"], items: [{ exercise: "[[Kliky]]", target: { sets: 3, reps: 10 } }], session_min: 40, intensity: "high" })}\n---\n`,
		);
		// V pondělí odtrénováno a zapsáno z programu.
		w.vault.write(LOGGED, workoutNote("2026-10-05", "strength", { sport: "calisthenics", program: "[[Síla]]", duration_min: 35, rpe: 7 }));
	});

	const statuses = () => w.plans.view(WEEK, TODAY).days.map((d) => d.entries.map((e) => `${e.program?.name}:${e.status}`));
	const entry = () => programs.programs().find((p) => p.note.name === "Síla")!;

	it("běžící program: pondělí splněno s odkazem na trénink, středa a pátek v plánu", () => {
		expect(statuses()).toEqual([["Síla:done"], [], ["Síla:planned"], [], ["Síla:planned"], [], []]);
		expect(w.plans.view(WEEK, TODAY).days[0]!.entries[0]!.program?.workoutFile?.path).toBe(LOGGED);
	});

	it("po pozastavení zůstane odtrénovaný den v plánu; budoucí dny zmizí", async () => {
		await programs.deactivate(entry());
		const view = w.plans.view(WEEK, TODAY);
		expect(statuses()).toEqual([["Síla:done"], [], [], [], [], [], []]);
		expect(view.days[0]!.entries[0]).toMatchObject({ status: "done", item: { sport: "calisthenics", duration_min: 40, intensity: "high" }, program: { text: "zapsaný trénink" } });
		expect(view.days[0]!.entries[0]!.program?.workoutFile?.path).toBe(LOGGED);
		// Souhrn počítá jen to, co v plánu zůstalo; zapsaná zátěž 35 × 7 se neztratí.
		expect(view.summary).toMatchObject({ planned: 1, done: 1, missed: 0 });
		expect(view.outlook).toMatchObject({ actual: 245, planned: 0 });
		expect(w.plans.plannedWorkouts(TODAY, TODAY)).toEqual([]);
	});

	it("po novém spuštění od pozdějšího data zůstane dřívější odtrénovaný den", async () => {
		await programs.deactivate(entry());
		await programs.activate(entry(), "2026-10-07");
		expect(statuses()).toEqual([["Síla:done"], [], ["Síla:planned"], [], ["Síla:planned"], [], []]);
	});

	it("program bez délky tréninku: odtrénovaný den zůstane aspoň jako řádek k zobrazení", async () => {
		await programs.setSession(entry(), undefined, undefined);
		await programs.deactivate(entry());
		const view = w.plans.view(WEEK, TODAY);
		expect(view.days[0]!.entries).toEqual([]);
		expect(view.days[0]!.programs.map((p) => [p.name, p.text, p.done])).toEqual([["Síla", "zapsaný trénink", true]]);
		expect(view.days[2]!.programs).toEqual([]);
	});
});

describe("volné dny v plánu týdne", () => {
	it("volno, nemoc a dovolená se uloží do poznámky týdne i přes hranici týdne", async () => {
		await w.plans.add(run);
		await w.plans.setOff("2026-10-08", "2026-10-08", "rest");
		await w.plans.setOff("2026-10-10", "2026-10-13", "illness");
		expect(w.vault.frontmatter(PATH).off).toEqual([
			{ date: "2026-10-08", reason: "rest" },
			{ date: "2026-10-10", reason: "illness" },
			{ date: "2026-10-11", reason: "illness" },
		]);
		expect(w.vault.frontmatter("Forma/Plán/2026/Týden 2026-10-12.md").off).toEqual([
			{ date: "2026-10-12", reason: "illness" },
			{ date: "2026-10-13", reason: "illness" },
		]);
		// Položky zůstávají a tabulka v poznámce volno ukazuje.
		expect(w.plans.items(WEEK)).toHaveLength(1);
		expect(w.vault.text(PATH)).toContain("| čt 8. 10. | **volno**<br>Běh – Tempo (9 km · 50 min · těžká) |");
		expect(w.vault.text(PATH)).toContain("| so 10. 10. | **nemoc** |");
	});

	it("položka ve volný den je odložená a nepočítá se do výživy; jen nemoc a dovolená omlouvají série", async () => {
		await w.plans.add(run);
		await w.plans.setOff("2026-10-08", "2026-10-08", "vacation");
		await w.plans.setOff("2026-10-09", "2026-10-09", "rest");
		const view = w.plans.view(WEEK, TODAY);
		expect(view.days[3]).toMatchObject({ off: "vacation" });
		expect(view.days[3]!.entries.map((e) => e.status)).toEqual(["off"]);
		expect(view.summary).toMatchObject({ planned: 1, postponed: 1, missed: 0 });
		expect(w.plans.plannedWorkouts("2026-10-08", TODAY)).toEqual([]);
		expect([...w.plans.excusedDates()]).toEqual(["2026-10-08"]);
	});

	it("změna důvodu a zrušení volna; zrušení v týdnu bez poznámky nic nezaloží", async () => {
		await w.plans.setOff("2026-10-08", "2026-10-09", "illness");
		await w.plans.setOff("2026-10-09", "2026-10-09", "vacation");
		expect(w.vault.frontmatter(PATH).off).toEqual([
			{ date: "2026-10-08", reason: "illness" },
			{ date: "2026-10-09", reason: "vacation" },
		]);
		await w.plans.setOff("2026-10-05", "2026-10-11", null);
		expect(w.vault.frontmatter(PATH).off).toBeUndefined();
		await w.plans.setOff("2026-11-02", "2026-11-08", null);
		expect(w.vault.paths()).toEqual([PATH]);
		await expect(w.plans.setOff("2026-10-09", "2026-10-08", "rest")).rejects.toThrow("Neplatné období");
	});

	it("přesun nesplněných položek dne na jiný den", async () => {
		await w.plans.add({ date: "2026-10-05", sport: "run", intensity: "low" });
		await w.plans.add({ date: "2026-10-05", sport: "strength", intensity: "mid" });
		w.vault.write("Forma/Tréninky/2026/2026-10-05 Běh.md", workoutNote("2026-10-05", "run"));
		// Běh je splněný, přesune se jen vynechaná posilovna.
		expect(await w.plans.movePending("2026-10-05", TODAY, TODAY)).toBe(1);
		expect(w.plans.items(WEEK).map((i) => [i.date, i.sport])).toEqual([
			["2026-10-05", "run"],
			[TODAY, "strength"],
		]);
		expect(await w.plans.movePending("2026-10-06", TODAY, TODAY)).toBe(0);
	});
});
