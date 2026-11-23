import { describe, expect, it } from "vitest";
import { nextPlannedEntry, type PlanStatus } from "../../src/calc/weekPlan";

const e = (id: string, status: PlanStatus) => ({ id, status });

describe("hlavní akce dne", () => {
	it("přeskočí odložené, splněné i zmeškané položky", () => {
		expect(nextPlannedEntry([e("a", "off"), e("b", "done"), e("c", "missed"), e("d", "planned")])?.id).toBe("d");
	});

	it("bez naplánované položky nevrátí nic", () => {
		expect(nextPlannedEntry([e("a", "off"), e("b", "done")])).toBeUndefined();
	});
});
