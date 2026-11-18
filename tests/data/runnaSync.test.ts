// Plán z Runny proti podvrženému kalendáři: webcal odkaz, zápis do plánu, chyby bez tajného odkazu.
import { afterEach, describe, expect, it } from "vitest";
import { FormaIndex } from "../../src/data/FormaIndex";
import { NoteWriter } from "../../src/data/NoteWriter";
import { PlanService } from "../../src/data/PlanService";
import { calendarUrl, syncRunna } from "../../src/data/RunnaSync";
import { LEGACY_FOLDERS, mergeSettings } from "../../src/settings/settings";
import { createFakeVault } from "../helpers/fakeVault";
import { requestLog, setRequestHandler } from "../helpers/obsidian";

const SECRET = "webcal://cal.runna.example/feed/tajny-token-42.ics";
const TODAY = "2026-11-10";
const FEED = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:r1", "DTSTART;VALUE=DATE:20261112", "SUMMARY:Easy Run · 6 km", "END:VEVENT", "END:VCALENDAR"].join("\r\n");

function createWorld() {
	const vault = createFakeVault();
	const settings = { ...mergeSettings(null), folders: { ...LEGACY_FOLDERS } };
	settings.runna.url = SECRET;
	const index = new FormaIndex(vault.app);
	index.register(vault.plugin);
	const plans = new PlanService(vault.app, index, new NoteWriter(vault.app), () => settings, () => {});
	let saves = 0;
	return { settings, plans, save: async () => void saves++, saves: () => saves };
}

afterEach(() => setRequestHandler(null));

describe("plán z Runny", () => {
	it("odkaz webcal se stáhne přes https a běh se zapíše do plánu", async () => {
		const w = createWorld();
		setRequestHandler(() => ({ status: 200, text: FEED }));
		await expect(syncRunna(w.plans, w.settings, w.save, TODAY)).resolves.toEqual({ added: 1, updated: 0, removed: 0 });
		expect(requestLog[0]!.url).toBe("https://cal.runna.example/feed/tajny-token-42.ics");
		expect(w.plans.items("2026-11-09")).toMatchObject([{ source: "Runna", uid: "r1", distance_km: 6 }]);
		expect(w.settings.runna.lastSync).toBe(TODAY);
		expect(w.saves()).toBe(1);
	});

	it("neplatný odkaz, chyba serveru, výpadek sítě i jiný obsah – chyba bez odkazu", async () => {
		expect(calendarUrl("http://nezabezpeceny")).toBeNull();
		expect(calendarUrl("  WEBCAL://a.b/c ")).toBe("https://a.b/c");
		const w = createWorld();
		const failures: [() => { status: number; text?: string }, RegExp][] = [
			[() => ({ status: 403 }), /HTTP 403/],
			[
				() => {
					throw new Error(`net::ERR ${SECRET}`);
				},
				/connection|připojení/i,
			],
			[() => ({ status: 200, text: "<html>login</html>" }), /calendar|kalendář/i],
		];
		for (const [handler, message] of failures) {
			setRequestHandler(handler);
			const error = (await syncRunna(w.plans, w.settings, w.save, TODAY).catch((e: unknown) => e)) as Error;
			expect(error.message).toMatch(message);
			expect(error.message).not.toContain("tajny-token");
		}
		expect(w.settings.runna.lastSync).toBe("");
		w.settings.runna.url = "ftp://x";
		await expect(syncRunna(w.plans, w.settings, w.save, TODAY)).rejects.toThrow(/https/);
	});
});
