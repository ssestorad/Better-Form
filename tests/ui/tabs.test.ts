import { describe, expect, it } from "vitest";
import { resolveView, screenOf, sectionOf, sectionTarget, visibleSections } from "../../src/ui/tabs";

const on = (off: string[] = [], over: { basic?: boolean; cycleOn?: boolean } = {}) => ({ basic: false, cycleOn: false, moduleOn: (k: string) => !off.includes(k) && !off.includes(k.split(".")[0]!), ...over });
const section = (id: string, a = on()) => visibleSections(a).find((s) => s.id === id)!;

describe("navigace", () => {
	it("šest sekcí v pevném pořadí", () => {
		expect(visibleSections(on()).map((s) => s.id)).toEqual(["today", "training", "planning", "progress", "care", "fuel"]);
	});

	it("vypnuté moduly skryjí podsekce a prázdnou sekci", () => {
		expect(section("planning", on(["goals", "skills"])).views).toEqual(["plan", "programs"]);
		expect(visibleSections(on(["nutrition", "supplements"])).map((s) => s.id)).not.toContain("fuel");
	});

	it("skrytý pohled spadne na první viditelný v sekci", () => {
		expect(resolveView("goals", on(["goals"]))).toBe("plan");
		expect(resolveView("supplements", on(["supplements"]))).toBe("nutrition");
	});

	it("skrytá celá sekce spadne na Dnes", () => {
		expect(resolveView("nutrition", on(["nutrition", "supplements"]))).toBe("today");
	});

	it("všechna stará id zůstávají platná", () => {
		for (const id of ["today", "log", "plan", "overview", "body", "skills", "programs", "goals", "nutrition", "supplements", "settings"]) expect(resolveView(id, on())).toBe(id);
	});

	it("neznámé id jde na Dnes", () => {
		expect(resolveView("nope", on())).toBe("today");
		expect(resolveView("basic", on())).toBe("today");
	});

	it("režim Základ pustí jen Základ a Nastavení", () => {
		const basic = on([], { basic: true });
		expect(resolveView("plan", basic)).toBe("basic");
		expect(resolveView("settings", basic)).toBe("settings");
		expect(visibleSections(basic)).toEqual([]);
	});

	it("sekce se vrací na poslední podsekci, jinak na první", () => {
		expect(sectionTarget(section("planning"), "goals")).toBe("goals");
		expect(sectionTarget(section("planning"), undefined)).toBe("plan");
		expect(sectionTarget(section("planning", on(["goals"])), "goals")).toBe("plan");
	});

	it("nastavení do žádné sekce nepatří", () => {
		expect(sectionOf("settings")).toBeNull();
		expect(sectionOf("goals")).toBe("planning");
	});

	it("Trénink, Pokrok, Tělo a Výživa mají své podsekce", () => {
		expect(section("training").views).toEqual(["log", "history", "exercises"]);
		expect(section("progress").views).toEqual(["overview", "charts", "records", "run"]);
		expect(section("care", on([], { cycleOn: true })).views).toEqual(["body", "measurements", "pain", "cycle"]);
		expect(section("fuel").views).toEqual(["nutrition", "supplements", "supplement-library", "supplement-charts"]);
	});

	it("podsekce jedné obrazovky sdílejí komponentu", () => {
		expect(["overview", "charts", "records", "run"].map((v) => screenOf(v as never))).toEqual(Array(4).fill("overview"));
		expect(["body", "measurements", "pain", "cycle"].map((v) => screenOf(v as never))).toEqual(Array(4).fill("body"));
		expect(screenOf("history")).toBe("log");
		expect(screenOf("supplement-library")).toBe("supplements");
		expect(screenOf("supplement-charts")).toBe("supplements");
	});

	it("vypnuté tabulky suplementů skryjí podkartu Charts", () => {
		expect(section("fuel", on(["supplements.tables"])).views).not.toContain("supplement-charts");
		expect(resolveView("supplement-charts", on(["supplements.tables"]))).toBe("nutrition");
		expect(section("fuel", on(["supplements"])).views).toEqual(["nutrition"]);
	});

	it("vypnutý běh spadne na Souhrn", () => {
		expect(resolveView("run", on(["running.analysis"]))).toBe("overview");
	});

	it("bolest zůstává dostupná i bez panáčka, cyklus jen se zapnutým modulem", () => {
		expect(resolveView("body", on(["body"]))).toBe("measurements");
		expect(section("care", on(["body"])).views).toContain("pain");
		expect(section("care").views).not.toContain("cycle");
		expect(resolveView("cycle", on())).toBe("body");
	});
});
