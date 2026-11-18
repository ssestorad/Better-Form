import { describe, expect, it } from "vitest";
import { taperPlan } from "../../src/calc/taper";

describe("ladění formy před závodem", () => {
	it("dva týdny před závodem: 60–70 % a 40–50 % obvyklého objemu", () => {
		// Závod v neděli 29. 11. 2026, obvykle 40 km týdně.
		expect(taperPlan("2026-11-29", "2026-11-10", 40)).toEqual({
			race: "2026-11-29",
			daysLeft: 19,
			weeklyKm: 40,
			weeks: [
				{ from: "2026-11-15", to: "2026-11-21", minKm: 24, maxKm: 28 },
				{ from: "2026-11-22", to: "2026-11-28", minKm: 16, maxKm: 20 },
			],
		});
	});

	it("jen 3 týdny dopředu, ne po závodě ani bez objemu", () => {
		expect(taperPlan("2026-12-02", "2026-11-10", 40)).toBeNull();
		expect(taperPlan("2026-12-01", "2026-11-10", 40)).not.toBeNull();
		expect(taperPlan("2026-11-09", "2026-11-10", 40)).toBeNull();
		expect(taperPlan("2026-11-10", "2026-11-10", 40)?.daysLeft).toBe(0);
		expect(taperPlan("2026-11-20", "2026-11-10", 0)).toBeNull();
	});
});
