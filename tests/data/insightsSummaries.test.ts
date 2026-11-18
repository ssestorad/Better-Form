// Služby nad indexem bez vlastních testů: doporučení a připravenost (InsightService)
// a souhrnné poznámky (SummaryService) – prázdný vault i vault s daty.
import { describe, expect, it } from "vitest";
import { DayService } from "../../src/data/DayService";
import { FormaIndex } from "../../src/data/FormaIndex";
import { GoalService } from "../../src/data/GoalService";
import { InsightService } from "../../src/data/InsightService";
import { NoteWriter } from "../../src/data/NoteWriter";
import { PlanService } from "../../src/data/PlanService";
import { ProgramService } from "../../src/data/ProgramService";
import { SummaryService } from "../../src/data/SummaryService";
import { WorkoutService } from "../../src/data/WorkoutService";
import { addDays } from "../../src/model/dates";
import { LEGACY_FOLDERS, mergeSettings } from "../../src/settings/settings";
import { createFakeVault } from "../helpers/fakeVault";

function createWorld() {
	const vault = createFakeVault();
	const settings = { ...mergeSettings(null), folders: { ...LEGACY_FOLDERS } };
	const index = new FormaIndex(vault.app);
	index.register(vault.plugin);
	const writer = new NoteWriter(vault.app);
	const days = new DayService(vault.app, index, writer, () => settings);
	const workouts = new WorkoutService(vault.app, index, writer, days, () => settings);
	const programs = new ProgramService(vault.app, index, writer, workouts, () => settings, () => {});
	const ctx = () => ({ info: () => undefined, bodyweightKg: 75 });
	const goals = new GoalService(index, writer, () => settings, ctx, (a, b) => a === b, () => {});
	const plans = new PlanService(vault.app, index, writer, () => settings, () => {});
	const insights = new InsightService(index, programs, goals, plans, () => settings, () => undefined, () => 75);
	const summaries = new SummaryService(vault.app, index, writer, () => settings, ctx);
	return { vault, index, insights, summaries };
}

const note = (data: Record<string, unknown>) => `---\n${JSON.stringify(data)}\n---\n`;

describe("doporučení a připravenost", () => {
	it("prázdný vault: bez připravenosti, žádná výjimka", () => {
		const w = createWorld();
		const result = w.insights.today("2026-11-05", Date.UTC(2026, 10, 5, 8));
		expect(result.readiness).toBeNull();
		expect(Array.isArray(result.recommendations)).toBe(true);
	});

	it("s daty: připravenost z check-inů a tréninky v kontextu", () => {
		const w = createWorld();
		for (let d = 0; d < 14; d++) {
			const date = addDays("2026-11-05", -d);
			w.vault.write(`Forma/Deník/${date}.md`, note({ forma: "day", schema: 1, date, sleep: { duration_min: 420, quality: 4 }, check_in: { fatigue: 3, soreness: 3, mood: 4, stress: 3 } }));
		}
		w.vault.write("Forma/Tréninky/run.md", note({ forma: "workout", schema: 1, date: "2026-11-04", sport: "run", source: "manual", duration_min: 45, rpe: 6, blocks: [], pain: [], run: { distance_km: 8 } }));
		const result = w.insights.today("2026-11-05", Date.UTC(2026, 10, 5, 8));
		expect(result.readiness).not.toBeNull();
		expect(result.readiness!.score).toBeGreaterThan(0);
		expect(result.readiness!.score).toBeLessThanOrEqual(100);
	});
});

describe("souhrny", () => {
	it("měsíční souhrn s tréninky se zapíše a podruhé přepíše tutéž poznámku", async () => {
		const w = createWorld();
		w.vault.write("Forma/Tréninky/run.md", note({ forma: "workout", schema: 1, date: "2026-10-04", sport: "run", source: "manual", duration_min: 45, rpe: 6, blocks: [], pain: [], run: { distance_km: 8 } }));
		expect(w.summaries.hasWorkouts("2026-10")).toBe(true);
		expect(w.summaries.hasWorkouts("2026-09")).toBe(false);
		const file = await w.summaries.generate("2026-10");
		expect(w.vault.text(file.path)).toContain("8");
		const again = await w.summaries.generate("2026-10");
		expect(again.path).toBe(file.path);
		expect(w.vault.paths().filter((p) => p.includes("2026-10"))).toHaveLength(1);
	});
});
