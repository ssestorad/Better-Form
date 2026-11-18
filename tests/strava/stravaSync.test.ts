// Synchronizace se Stravou proti podvrženému API: nový běh, detail (nejrychlejší úseky),
// zóny jen pro předplatitele, limit požadavků a výpadek sítě bez tokenu v chybě.
import { afterEach, describe, expect, it } from "vitest";
import { DayService } from "../../src/data/DayService";
import { FormaIndex } from "../../src/data/FormaIndex";
import { NoteWriter } from "../../src/data/NoteWriter";
import { WorkoutService } from "../../src/data/WorkoutService";
import { LEGACY_FOLDERS, mergeSettings } from "../../src/settings/settings";
import type { StravaAuth } from "../../src/strava/StravaAuth";
import { StravaSync } from "../../src/strava/StravaSync";
import { createFakeVault } from "../helpers/fakeVault";
import { requestLog, setRequestHandler, type FakeRequest, type FakeResponse } from "../helpers/obsidian";

const TOKEN = "strava-token-xyz";
const RUN = { id: 101, type: "Run", sport_type: "Run", start_date_local: "2026-11-04T07:30:00Z", distance: 8000, moving_time: 2520, average_heartrate: 150 };
const RIDE = { id: 102, type: "Ride", sport_type: "Ride", start_date_local: "2026-11-03T17:00:00Z", distance: 30000, moving_time: 3600 };

function createWorld() {
	const vault = createFakeVault();
	const settings = { ...mergeSettings(null), folders: { ...LEGACY_FOLDERS } };
	const index = new FormaIndex(vault.app);
	index.register(vault.plugin);
	const writer = new NoteWriter(vault.app);
	const days = new DayService(vault.app, index, writer, () => settings);
	const workouts = new WorkoutService(vault.app, index, writer, days, () => settings);
	const auth = { accessToken: async () => TOKEN } as unknown as StravaAuth;
	const sync = new StravaSync(auth, index, workouts, () => settings, async () => {});
	return { settings, index, sync };
}

function api(overrides: (request: FakeRequest) => FakeResponse | undefined = () => undefined) {
	return (request: FakeRequest): FakeResponse => {
		const override = overrides(request);
		if (override) return override;
		if (request.headers?.Authorization !== `Bearer ${TOKEN}`) return { status: 401, json: { message: "Authorization Error" } };
		if (request.url.includes("/athlete/activities")) return { status: 200, json: request.url.includes("page=1") ? [RUN, RIDE] : [] };
		if (request.url.endsWith("/activities/101")) return { status: 200, json: { best_efforts: [{ name: "1k", elapsed_time: 290 }, { name: "5k", elapsed_time: 1560 }] } };
		if (request.url.endsWith("/activities/101/zones")) return { status: 402, json: { message: "Payment Required" } };
		return { status: 404 };
	};
}

afterEach(() => setRequestHandler(null));

describe("synchronizace Strava", () => {
	it("importuje jen běhy, doplní nejrychlejší úseky a bez předplatného zóny přeskočí", async () => {
		const w = createWorld();
		setRequestHandler(api());
		const result = await w.sync.sync();
		expect(result).toMatchObject({ created: 1, merged: 0, details: 1, detailsPending: 0, rateLimited: false });
		const [run] = w.index.all("workout");
		expect(run!.note).toMatchObject({ date: "2026-11-04", sport: "run", strava_id: 101, run: { distance_km: 8, best_s: { "1k": 290, "5k": 1560 }, strava_detail: true } });
		expect(run!.note.run?.hr_zone_s).toBeUndefined();
		expect(w.settings.strava.lastSyncAt).toBeGreaterThan(0);

		// Podruhé už nic nového a detail se znovu nestahuje.
		setRequestHandler(api());
		await expect(w.sync.sync()).resolves.toMatchObject({ created: 0, duplicates: 1, details: 0 });
		expect(requestLog.some((r) => r.url.includes("/activities/101"))).toBe(false);
	});

	it("limit požadavků u detailu – běh zůstane, detail se doplní příště", async () => {
		const w = createWorld();
		setRequestHandler(api((r) => (r.url.endsWith("/activities/101") ? { status: 429, json: { message: "Rate Limit Exceeded" } } : undefined)));
		await expect(w.sync.sync()).resolves.toMatchObject({ created: 1, details: 0, detailsPending: 1, rateLimited: true });
		expect(w.index.all("workout")).toHaveLength(1);
	});

	it("výpadek sítě – chyba bez tokenu a synchronizace se uvolní", async () => {
		const w = createWorld();
		setRequestHandler(() => {
			throw new Error(`net::ERR_FAILED Bearer ${TOKEN}`);
		});
		const error = (await w.sync.sync().catch((e: unknown) => e)) as Error;
		expect(error.message).not.toContain(TOKEN);
		expect(w.sync.isRunning).toBe(false);
		expect(w.settings.strava.lastSyncAt).toBe(0);
	});
});
