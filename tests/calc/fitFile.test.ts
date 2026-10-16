import { describe, expect, it } from "vitest";
import { isFit, parseFit } from "../../src/calc/fitFile";
import { runFileToWorkout } from "../../src/calc/runFile";

// Soubor FIT sestavený ručně podle popisu formátu (ne záznam ze skutečných hodinek):
// hlavička 14 bajtů, definice zpráv a data; čísla little-endian, pokud není řečeno jinak.
const u16 = (v: number) => [v & 0xff, (v >> 8) & 0xff];
const u32 = (v: number) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
const u32be = (v: number) => u32(v).reverse();
const INVALID_S32 = u32(0x7fffffff);

/** Čas FIT (sekundy od 31. 12. 1989) pro 3. 10. 2026 12:00:00 UTC. */
const T0 = Date.UTC(2026, 9, 3, 12, 0, 0) / 1000 - 631065600;
/** 50° a 14° v polokruzích: stupně × 2^31 / 180. */
const LAT = Math.round((50 * 2 ** 31) / 180);
const LON = Math.round((14 * 2 ** 31) / 180);

const messages = [
	// Definice 0: record (20) – čas, šířka, délka, vzdálenost, výška, tep.
	[0x40, 0, 0, ...u16(20), 6, 253, 4, 0x86, 0, 4, 0x85, 1, 4, 0x85, 5, 4, 0x86, 2, 2, 0x84, 3, 1, 0x02],
	// start: 0 m, 200 m n. m. ((200 + 500) × 5 = 3500), tep 140
	[0x00, ...u32(T0), ...u32(LAT), ...u32(LON), ...u32(0), ...u16(3500), 140],
	// po 5 minutách: 1000 m (v cm), 210 m n. m., tep 150
	[0x00, ...u32(T0 + 300), ...u32(LAT), ...u32(LON), ...u32(100000), ...u16(3550), 150],
	// Definice 1: record bez času – čas nese zkrácená hlavička.
	[0x41, 0, 0, ...u16(20), 2, 5, 4, 0x86, 3, 1, 0x02],
	// zkrácená hlavička (lokální typ 1, 5 bitů času): o 10 s později, 1040 m, tep 160
	[0x80 | (1 << 5) | ((T0 + 310) & 0x1f), ...u32(104000), 160],
	// konec: 2000 m; poloha, výška a tep „neplatné“ (zařízení je nemá)
	[0x00, ...u32(T0 + 600), ...INVALID_S32, ...INVALID_S32, ...u32(200000), ...u16(0xffff), 0xff],
	// Definice 2: session (18), big-endian, s vývojářským polem (2 bajty) – sport, vzdálenost, čas.
	[0x62, 0, 1, 0, 18, 3, 5, 1, 0x00, 9, 4, 0x86, 8, 4, 0x86, 1, 0, 2, 0],
	[0x02, 1, ...u32be(200000), ...u32be(600000), 0xaa, 0xbb],
	// Definice 3: neznámá zpráva s textem – jen se přeskočí.
	[0x43, 0, 0, ...u16(999), 1, 0, 5, 0x07],
	[0x03, 0x48, 0x65, 0x6c, 0x6c, 0x6f],
];

function fit(body: number[]): ArrayBuffer {
	return new Uint8Array([14, 0x20, 0, 0, ...u32(body.length), 0x2e, 0x46, 0x49, 0x54, 0, 0, ...body, 0, 0]).buffer;
}

describe("soubor FIT", () => {
	const data = fit(messages.flat());

	it("pozná se podle hlavičky", () => {
		expect(isFit(data)).toBe(true);
		expect(isFit(new TextEncoder().encode("<gpx></gpx>     ").buffer)).toBe(false);
		expect(isFit(new ArrayBuffer(4))).toBe(false);
	});

	it("body trasy: čas, poloha, výška, tep a vzdálenost; neplatné hodnoty chybí", () => {
		const file = parseFit(data);
		expect(file).toMatchObject({ format: "fit", type: "running", lapDistanceM: 2000, lapTimeS: 600 });
		expect(file.points).toHaveLength(4);
		expect(file.points[0]).toMatchObject({ timeMs: Date.UTC(2026, 9, 3, 12, 0, 0), ele: 200, hr: 140, distM: 0 });
		expect(file.points[0]!.lat).toBeCloseTo(50, 6);
		expect(file.points[0]!.lon).toBeCloseTo(14, 6);
		// zkrácená hlavička: čas navazuje na poslední plné razítko
		expect(file.points[2]).toEqual({ timeMs: Date.UTC(2026, 9, 3, 12, 5, 10), hr: 160, distM: 1040 });
		expect(file.points[3]).toEqual({ timeMs: Date.UTC(2026, 9, 3, 12, 10, 0), distM: 2000 });
	});

	it("z FIT vznikne stejný trénink jako z GPX nebo TCX", () => {
		// 2 km za 600 s; tep (140 + 150 + 160) / 3 = 150; převýšení 200 → 210 m = 10 m; léto v ČR = UTC + 2 h
		expect(runFileToWorkout(parseFit(data), 120)).toMatchObject({
			date: "2026-10-03",
			start: "14:00",
			sport: "run",
			source: "file",
			duration_min: 10,
			run: { distance_km: 2, moving_time_s: 600, avg_hr: 150, max_hr: 160, elevation_m: 10 },
		});
	});

	it("useknutý nebo cizí soubor ohlásí česky", () => {
		expect(() => parseFit(fit(messages.flat().slice(0, 40)))).toThrow("poškozený nebo neúplný");
		expect(() => parseFit(fit([0x05, 1, 2, 3]))).toThrow("poškozený nebo neúplný"); // data bez definice
		expect(() => parseFit(new TextEncoder().encode("<gpx></gpx>     ").buffer)).toThrow("není ve formátu FIT");
	});
});
