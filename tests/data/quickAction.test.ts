import { describe, expect, it } from "vitest";
import { parseQuickAction } from "../../src/data/quickAction";

describe("rychlé akce z odkazu obsidian://better-form", () => {
	it("check-in, zápis tréninku ze šablony, karta a synchronizace", () => {
		expect(parseQuickAction({ action: "checkin" })).toEqual({ kind: "checkin" });
		expect(parseQuickAction({ action: "check-in", date: "2026-11-19" })).toEqual({ kind: "checkin", date: "2026-11-19" });
		expect(parseQuickAction({ action: "log", template: " Push – gym ", sport: "strength" })).toEqual({ kind: "log", template: "Push – gym", sport: "strength" });
		expect(parseQuickAction({ action: "tab", tab: "plan" })).toEqual({ kind: "tab", tab: "plan" });
		expect(parseQuickAction({ action: "sync", service: "garmin" })).toEqual({ kind: "sync", service: "garmin" });
	});

	it("počítadlo programu jen s rozumným počtem opakování", () => {
		expect(parseQuickAction({ action: "counter", program: "100 kliků denně", reps: "20" })).toEqual({ kind: "counter", program: "100 kliků denně", reps: 20 });
		expect(parseQuickAction({ action: "counter", program: "X", reps: "0" })).toBeNull();
		expect(parseQuickAction({ action: "counter", program: "X", reps: "2.5" })).toBeNull();
		expect(parseQuickAction({ action: "counter", reps: "10" })).toBeNull();
	});

	it("neplatné hodnoty se zahodí, neznámá akce nic nedělá", () => {
		expect(parseQuickAction({ action: "log", date: "zítra", sport: "golf" })).toEqual({ kind: "log" });
		expect(parseQuickAction({ action: "sync", service: "fitbit" })).toBeNull();
		expect(parseQuickAction({ action: "tab" })).toBeNull();
		expect(parseQuickAction({ action: "smazat" })).toBeNull();
		expect(parseQuickAction({})).toBeNull();
	});
});
