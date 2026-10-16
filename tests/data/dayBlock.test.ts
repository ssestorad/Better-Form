import { describe, expect, it } from "vitest";
import { daySummary, renderDayBlock, workoutDetails, workoutLabel } from "../../src/data/dayBlock";
import type { DayNote, WorkoutNote } from "../../src/model/types";

const fullDay: DayNote = {
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
};

function workout(overrides: Partial<WorkoutNote> = {}): WorkoutNote {
	return {
		forma: "workout",
		schema: 1,
		date: "2026-09-28",
		sport: "strength",
		source: "manual",
		blocks: [],
		pain: [],
		...overrides,
	};
}

describe("souhrn dne", () => {
	it("všechny části", () => {
		expect(daySummary(fullDay)).toEqual({
			sleep: "7 h 15 min (23:25 → 06:40) · kvalita 4/5 · probuzení 1× · ráno 3/5",
			feelings: "únava 3/5 · svaly 3/5 · nálada 4/5 · stres 3/5",
			hrv: "rMSSD 62 ms · klidový tep 52 · Elonga 71",
			weight: "78,4 kg",
		});
	});

	it("délka se dopočítá, když chybí; chybějící části = null", () => {
		const summary = daySummary({ ...fullDay, sleep: { bedtime: "23:10", wake: "06:40" }, check_in: {}, hrv: {}, body: {} });
		expect(summary).toEqual({ sleep: "7 h 30 min (23:10 → 06:40)", feelings: null, hrv: null, weight: null });
		expect(daySummary(undefined).sleep).toBeNull();
	});
});

describe("popis tréninku", () => {
	it("název, délka, RPE a zátěž", () => {
		const w = workout({ title: "Push", duration_min: 62, rpe: 7 });
		expect(workoutLabel(w)).toBe("Posilovna – Push");
		// 7 × 62 = 434
		expect(workoutDetails(w)).toBe("62 min · RPE 7 · zátěž 434");
	});

	it("bez RPE upozorní", () => {
		const w = workout({ sport: "run", duration_min: 55 });
		expect(workoutLabel(w)).toBe("Běh");
		expect(workoutDetails(w)).toBe("55 min · chybí RPE");
	});
});

describe("generovaný blok", () => {
	it("souhrn a seznam tréninků s odkazy", () => {
		const text = renderDayBlock(fullDay, [
			{ note: workout({ title: "Push", duration_min: 62, rpe: 7 }), link: "2026-09-28 Posilovna – Push" },
		]);
		expect(text).toBe(
			[
				"**Spánek:** 7 h 15 min (23:25 → 06:40) · kvalita 4/5 · probuzení 1× · ráno 3/5  ",
				"**Pocity** (5 = nejlepší): únava 3/5 · svaly 3/5 · nálada 4/5 · stres 3/5  ",
				"**HRV:** rMSSD 62 ms · klidový tep 52 · Elonga 71  ",
				"**Váha:** 78,4 kg",
				"",
				"**Tréninky**",
				"- [[2026-09-28 Posilovna – Push|Posilovna – Push]] · 62 min · RPE 7 · zátěž 434",
			].join("\n"),
		);
	});

	it("prázdný den", () => {
		expect(renderDayBlock(undefined, [])).toBe(
			"Check-in zatím není vyplněný.\n\n**Tréninky**\nŽádný zapsaný trénink.",
		);
	});

	it("s doporučenou výživou na konci", () => {
		expect(renderDayBlock(undefined, [], "2 450–2 700 kcal · bílkoviny 130–175 g")).toBe(
			"Check-in zatím není vyplněný.\n\n**Tréninky**\nŽádný zapsaný trénink.\n\n**Výživa – doporučení:** 2 450–2 700 kcal · bílkoviny 130–175 g",
		);
	});
});
