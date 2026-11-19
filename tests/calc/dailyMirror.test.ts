import { describe, expect, it } from "vitest";
import { applyMirror, dailyNoteName, mirrorDiffers, mirrorValues } from "../../src/calc/dailyMirror";
import type { DayNote, WorkoutNote } from "../../src/model/types";

const day: DayNote = { forma: "day", schema: 1, date: "2026-11-19", sleep: { duration_min: 445 }, check_in: {}, hrv: { rmssd_ms: 62, resting_hr: 51 }, body: { weight_kg: 74.3 }, steps: 9120 };
const run: WorkoutNote = { forma: "workout", schema: 1, date: "2026-11-19", sport: "run", source: "manual", blocks: [], pain: [], duration_min: 42, run: { distance_km: 8.04 } };
const gym: WorkoutNote = { forma: "workout", schema: 1, date: "2026-11-19", sport: "strength", source: "manual", blocks: [], pain: [], duration_min: 55 };

describe("metriky v denní poznámce uživatele", () => {
	it("hodnoty dne s předponou bf_; chybějící údaje undefined", () => {
		expect(mirrorValues({ day, workouts: [run, gym], loadAu: 480.4, readiness: 72 })).toEqual({
			bf_readiness: 72,
			bf_load: 480,
			bf_sleep_h: 7.4,
			bf_hrv: 62,
			bf_rhr: 51,
			bf_weight: 74.3,
			bf_steps: 9120,
			bf_workouts: 2,
			bf_workout_min: 97,
			bf_run_km: 8.04,
		});
		const empty = mirrorValues({ workouts: [], readiness: null });
		expect(Object.values(empty).every((v) => v === undefined)).toBe(true);
	});

	it("zápis mění jen klíče bf_, maže chybějící a bez změny nic nepřepisuje", () => {
		const fm: Record<string, unknown> = { tags: ["denik"], nálada: "dobrá", bf_hrv: 50, bf_steps: 100 };
		const values = mirrorValues({ day: { ...day, steps: undefined }, workouts: [], readiness: 70 });
		expect(mirrorDiffers(fm, values)).toBe(true);
		expect(applyMirror(fm, values)).toBe(true);
		expect(fm).toMatchObject({ tags: ["denik"], nálada: "dobrá", bf_hrv: 62, bf_readiness: 70 });
		expect("bf_steps" in fm).toBe(false);
		expect(mirrorDiffers(fm, values)).toBe(false);
		expect(applyMirror(fm, values)).toBe(false);
	});
});

describe("název denní poznámky podle formátu", () => {
	it("běžné tokeny a text v hranatých závorkách", () => {
		expect(dailyNoteName("2026-11-09", "YYYY-MM-DD")).toBe("2026-11-09");
		expect(dailyNoteName("2026-11-09", "D. M. YYYY")).toBe("9. 11. 2026");
		expect(dailyNoteName("2026-11-09", "YYYY/MM/YYYY-MM-DD ddd")).toBe("2026/11/2026-11-09 Mon");
		expect(dailyNoteName("2026-11-09", "[Deník] DD MMM YY")).toBe("Deník 09 Nov 26");
	});
});
