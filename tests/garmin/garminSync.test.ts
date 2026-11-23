// Synchronizace s Garmin Connect proti podvrženému serveru: token, denní data, opakování
// po 401, chyby sítě a limity. Klíč ani token se nesmí objevit v textu chyby.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DayService } from "../../src/data/DayService";
import { FormaIndex } from "../../src/data/FormaIndex";
import { NoteWriter } from "../../src/data/NoteWriter";
import { RunImportService } from "../../src/data/RunImportService";
import { WorkoutService } from "../../src/data/WorkoutService";
import { GarminSync } from "../../src/garmin/GarminSync";
import { GARMIN_TOKEN_PATH } from "../../src/garmin/garminData";
import { LEGACY_FOLDERS, mergeSettings } from "../../src/settings/settings";
import { createFakeVault } from "../helpers/fakeVault";
import { requestLog, setRequestHandler, type FakeRequest, type FakeResponse } from "../helpers/obsidian";

const KEY = "tajny-klic-123";
const TOKEN = "aaa.bbb.ccc";
const TODAY = "2026-11-05";

function createWorld() {
	const vault = createFakeVault();
	const settings = { ...mergeSettings(null), folders: { ...LEGACY_FOLDERS } };
	settings.garmin = { ...settings.garmin, apiKey: KEY, syncRuns: false, initialDays: 3 };
	const index = new FormaIndex(vault.app);
	index.register(vault.plugin);
	const writer = new NoteWriter(vault.app);
	const days = new DayService(vault.app, index, writer, () => settings);
	const workouts = new WorkoutService(vault.app, index, writer, days, () => settings);
	let saves = 0;
	const sync = new GarminSync(index, days, new RunImportService(index, workouts), () => settings, async () => {
		saves++;
	});
	return { vault, settings, index, sync, saves: () => saves };
}

/** Server: token za klíč, kroky a klidový tep za den, ostatní prázdné. */
function server(overrides: (request: FakeRequest) => FakeResponse | undefined = () => undefined) {
	return (request: FakeRequest): FakeResponse => {
		const override = overrides(request);
		if (override) return override;
		if (request.url.endsWith(GARMIN_TOKEN_PATH)) {
			return request.headers?.Authorization === `ApiKey ${KEY}` ? { status: 200, json: { access_token: TOKEN } } : { status: 401 };
		}
		if (request.headers?.Authorization !== `Bearer ${TOKEN}`) return { status: 401 };
		if (request.url.includes("/usersummary-service/v2/dailysummaries")) {
			return { status: 200, json: [{ calendarDate: "2026-11-04", totalSteps: 8123, restingHeartRate: 52 }] };
		}
		return { status: 204 };
	};
}

let w: ReturnType<typeof createWorld>;
beforeEach(() => {
	w = createWorld();
});
afterEach(() => setRequestHandler(null));

describe("synchronizace Garmin Connect", () => {
	it("vymění klíč za token, doplní denní hodnoty a uloží den synchronizace", async () => {
		setRequestHandler(server());
		const result = await w.sync.sync(TODAY);
		expect(result).toMatchObject({ days: 1, values: 2 });
		expect(w.index.day("2026-11-04")?.note).toMatchObject({ steps: 8123, hrv: { resting_hr: 52 } });
		expect(w.settings.garmin.lastSync).toBe(TODAY);
		expect(w.saves()).toBe(1);
		// Token se získá jednou a pak se posílá jako Bearer.
		expect(requestLog.filter((r) => r.url.endsWith(GARMIN_TOKEN_PATH))).toHaveLength(1);
	});

	it("kroky rozběhnutého dne se při další synchronizaci zvýší, nikdy nesníží; ostatní hodnoty zůstanou", async () => {
		const answer = (totalSteps: number, restingHeartRate: number) => (r: FakeRequest) =>
			r.url.includes("dailysummaries") && r.headers?.Authorization === `Bearer ${TOKEN}` ? { status: 200, json: [{ calendarDate: TODAY, totalSteps, restingHeartRate }] } : undefined;
		// V poledne 4 200 kroků a tep 52.
		setRequestHandler(server(answer(4200, 52)));
		await expect(w.sync.sync(TODAY)).resolves.toMatchObject({ days: 1, values: 2 });
		// Večer 11 350 kroků; už zapsaný klidový tep se nepřepíše.
		setRequestHandler(server(answer(11350, 60)));
		await expect(w.sync.sync(TODAY)).resolves.toMatchObject({ days: 1, values: 1 });
		expect(w.index.day(TODAY)?.note).toMatchObject({ steps: 11350, hrv: { resting_hr: 52 } });
		// Nižší nebo stejný počet nic nezmění.
		setRequestHandler(server(answer(9000, 60)));
		await expect(w.sync.sync(TODAY)).resolves.toMatchObject({ days: 0, values: 0 });
		expect(w.index.day(TODAY)?.note.steps).toBe(11350);
	});

	it("při 401 jednou požádá o nový token a pokračuje", async () => {
		let expired = true;
		setRequestHandler(
			server((r) => {
				if (expired && r.url.includes("dailysummaries")) {
					expired = false;
					return { status: 401 };
				}
				return undefined;
			}),
		);
		await expect(w.sync.sync(TODAY)).resolves.toMatchObject({ days: 1 });
		expect(requestLog.filter((r) => r.url.endsWith(GARMIN_TOKEN_PATH))).toHaveLength(2);
	});

	it("odmítnutý klíč, limit požadavků a výpadek sítě – srozumitelná chyba bez klíče a tokenu", async () => {
		w.settings.garmin.apiKey = "spatny";
		setRequestHandler(server());
		await expect(w.sync.sync(TODAY)).rejects.toThrow(/rejected the key|klíč odmítl/);

		w.settings.garmin.apiKey = KEY;
		w.sync.forgetToken();
		setRequestHandler(server((r) => (r.url.includes("dailysummaries") ? { status: 429 } : undefined)));
		await expect(w.sync.sync(TODAY)).rejects.toThrow(/limiting requests|omezuje/);

		setRequestHandler(() => {
			throw new Error(`net::ERR_FAILED Authorization: ApiKey ${KEY}`);
		});
		w.sync.forgetToken();
		const error = (await w.sync.sync(TODAY).catch((e: unknown) => e)) as Error;
		expect(error.message).not.toContain(KEY);
		expect(error.message).not.toContain(TOKEN);
		// Neúspěšná synchronizace den poslední synchronizace neposune.
		expect(w.settings.garmin.lastSync).toBe("");
		expect(w.sync.isRunning).toBe(false);
	});
});
