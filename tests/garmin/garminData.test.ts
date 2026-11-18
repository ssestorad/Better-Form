import { describe, expect, it } from "vitest";
import { createZip } from "../../src/data/zip";
import {
	dateChunks,
	extractToken,
	fitFromDownload,
	fromDailySummaries,
	fromHrv,
	fromSleep,
	fromWeight,
	items,
	mergeRows,
	runActivities,
	syncStart,
} from "../../src/garmin/garminData";

// Odpovědi ve tvaru, jak je popisují dokumentace a otevřené klienty Personal API (zkrácené).
/** 2026-11-03 22:47 a 2026-11-04 06:15 místního času jako „ms v UTC“. */
const ONSET = Date.UTC(2026, 10, 3, 22, 47);
const WAKE = Date.UTC(2026, 10, 4, 6, 15);

describe("Garmin Connect – převod odpovědí", () => {
	it("token: holý JWT nebo JSON s access_token", () => {
		expect(extractToken("aaa.bbb.ccc")).toBe("aaa.bbb.ccc");
		expect(extractToken('"aaa.bbb.ccc"\n')).toBe("aaa.bbb.ccc");
		expect(extractToken('{"access_token":"aaa.bbb.ccc","expires_in":86400}')).toBe("aaa.bbb.ccc");
		expect(extractToken("{nečitelné")).toBe("");
	});

	it("rozsah dní po úsecích a začátek synchronizace", () => {
		expect(dateChunks("2026-10-01", "2026-11-04", 28)).toEqual([
			{ from: "2026-10-01", to: "2026-10-28" },
			{ from: "2026-10-29", to: "2026-11-04" },
		]);
		expect(dateChunks("2026-11-04", "2026-11-04", 28)).toEqual([{ from: "2026-11-04", to: "2026-11-04" }]);
		// Poprvé 30 dní včetně dneška, pak od poslední synchronizace se 3 dny překryvu.
		expect(syncStart("2026-11-04", "", 30)).toBe("2026-10-06");
		expect(syncStart("2026-11-04", "2026-11-01", 30)).toBe("2026-10-29");
	});

	it("položky: pole přímo i zabalené v objektu", () => {
		expect(items([{ a: 1 }, 2])).toEqual([{ a: 1 }]);
		expect(items({ data: [{ a: 1 }] })).toEqual([{ a: 1 }]);
		expect(items({ wrapper: { hrvSummaries: [{ a: 1 }] } })).toEqual([{ a: 1 }]);
		expect(items(null)).toEqual([]);
	});

	it("denní souhrny: kroky a klidový tep; dny bez hodnot vynechá", () => {
		const json = { data: [{ calendarDate: "2026-11-03", totalSteps: 8431.4, restingHeartRate: 52 }, { calendarDate: "2026-11-04", totalSteps: 0 }] };
		expect(fromDailySummaries(json)).toEqual([{ date: "2026-11-03", steps: 8431, resting_hr: 52 }]);
	});

	it("spánek: délka bez probuzení a místní časy usnutí a probuzení", () => {
		const json = [
			{ dailySleepDTO: { calendarDate: "2026-11-04", sleepTimeSeconds: 25080, sleepStartTimestampLocal: ONSET, sleepEndTimestampLocal: WAKE } },
			{ calendarDate: "2026-11-05", sleepTimeSeconds: 0 },
		];
		// 25 080 s = 418 min
		expect(fromSleep(json)).toEqual([{ date: "2026-11-04", duration_min: 418, sleep_onset: "22:47", wake: "06:15" }]);
	});

	it("HRV: průměr poslední noci", () => {
		const json = { hrvSummaries: [{ calendarDate: "2026-11-04", lastNightAvg: 47.25, weeklyAvg: 50, status: "BALANCED" }, { calendarDate: "2026-11-03" }] };
		expect(fromHrv(json)).toEqual([{ date: "2026-11-04", rmssd_ms: 47.3 }]);
	});

	it("váha: v gramech, poslední vážení dne", () => {
		const json = {
			dailyWeightSummaries: [
				{ summaryDate: "2026-11-03", allWeightMetrics: [{ weight: 72300 }, { weight: 71850 }] },
				{ summaryDate: "2026-11-04", latestWeight: { weight: 71600 } },
			],
		};
		expect(fromWeight(json)).toEqual([
			{ date: "2026-11-03", weight_kg: 71.9 },
			{ date: "2026-11-04", weight_kg: 71.6 },
		]);
	});

	it("spojení podle dne, seřazené od nejstaršího", () => {
		expect(mergeRows([{ date: "2026-11-04", steps: 100 }], [{ date: "2026-11-04", duration_min: 400 }, { date: "2026-11-02", weight_kg: 70 }])).toEqual([
			{ date: "2026-11-02", weight_kg: 70 },
			{ date: "2026-11-04", steps: 100, duration_min: 400 },
		]);
	});

	it("běhy ze seznamu aktivit podle typu", () => {
		const list = [
			{ activityId: 101, startTimeLocal: "2026-11-03 07:10:00", activityType: { typeKey: "running" } },
			{ activityId: 102, startTimeLocal: "2026-11-03 18:00:00", activityType: { typeKey: "treadmill_running" } },
			{ activityId: 103, startTimeLocal: "2026-11-04 12:00:00", activityType: { typeKey: "cycling" } },
			{ startTimeLocal: "2026-11-04 12:00:00", activityType: { typeKey: "running" } },
		];
		expect(runActivities(list)).toEqual([
			{ id: 101, date: "2026-11-03" },
			{ id: 102, date: "2026-11-03" },
		]);
	});
});

describe("stažený soubor aktivity", () => {
	const fit = new Uint8Array([14, 0x20, 0, 0, 0, 0, 0, 0, 0x2e, 0x46, 0x49, 0x54, 0, 0, 1, 2, 3]);

	it("FIT přímo se vrátí beze změny", async () => {
		expect(new Uint8Array((await fitFromDownload(fit.slice().buffer))!)).toEqual(fit);
	});

	it("ZIP: první soubor .fit (uložený)", async () => {
		const zip = createZip([
			{ path: "readme.txt", data: new TextEncoder().encode("x") },
			{ path: "123_ACTIVITY.fit", data: fit },
		]);
		expect(new Uint8Array((await fitFromDownload(zip.slice().buffer))!)).toEqual(fit);
	});

	it("ZIP komprimovaný deflate s datovým deskriptorem (velikosti jen v centrálním adresáři)", async () => {
		const deflated = new Uint8Array(await new Response(new Blob([fit]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
		const name = new TextEncoder().encode("a.fit");
		const local = new Uint8Array(30 + name.length);
		const lv = new DataView(local.buffer);
		lv.setUint32(0, 0x04034b50, true);
		lv.setUint16(6, 0x0008, true); // datový deskriptor – velikosti v místní hlavičce jsou 0
		lv.setUint16(8, 8, true);
		lv.setUint16(26, name.length, true);
		local.set(name, 30);
		const central = new Uint8Array(46 + name.length);
		const cv = new DataView(central.buffer);
		cv.setUint32(0, 0x02014b50, true);
		cv.setUint16(10, 8, true);
		cv.setUint32(20, deflated.length, true);
		cv.setUint32(24, fit.length, true);
		cv.setUint16(28, name.length, true);
		cv.setUint32(42, 0, true);
		central.set(name, 46);
		const end = new Uint8Array(22);
		const ev = new DataView(end.buffer);
		ev.setUint32(0, 0x06054b50, true);
		ev.setUint16(8, 1, true);
		ev.setUint16(10, 1, true);
		ev.setUint32(12, central.length, true);
		ev.setUint32(16, local.length + deflated.length, true);
		const zip = new Uint8Array([...local, ...deflated, ...central, ...end]);
		expect(new Uint8Array((await fitFromDownload(zip.buffer))!)).toEqual(fit);
	});

	it("ZIP bez souboru FIT → null", async () => {
		expect(await fitFromDownload(createZip([{ path: "a.txt", data: new Uint8Array([1]) }]).slice().buffer)).toBeNull();
	});
});
