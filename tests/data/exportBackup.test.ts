import { describe, expect, it } from "vitest";
import { csvCell, daysCsv, setsCsv, toCsv, workoutsCsv } from "../../src/data/csv";
import { fileStamp as stamp } from "../../src/data/paths";
import { crc32, createZip, dosDateTime } from "../../src/data/zip";
import type { DayNote, WorkoutNote } from "../../src/model/types";

const BOM = "﻿";

function workout(partial: Partial<WorkoutNote>): WorkoutNote {
	return { forma: "workout", schema: 1, date: "2026-10-03", sport: "strength", source: "manual", blocks: [], pain: [], ...partial };
}

/** Řádky CSV bez BOM a koncového prázdného řádku. */
const lines = (csv: string) => csv.replace(BOM, "").split("\r\n").slice(0, -1);

describe("CSV (SPEC 5.12)", () => {
	it("buňky: desetinná čárka, uvozovky jen když je třeba, prázdné hodnoty", () => {
		expect(csvCell(78.4)).toBe("78,4");
		expect(csvCell(0.1 + 0.2)).toBe("0,3");
		expect(csvCell(3105)).toBe("3105");
		expect(csvCell("Push")).toBe("Push");
		expect(csvCell("a;b")).toBe('"a;b"');
		expect(csvCell('řekl "dost"')).toBe('"řekl ""dost"""');
		expect(csvCell("dva\nřádky")).toBe('"dva\nřádky"');
		expect(csvCell(" mezera")).toBe('" mezera"');
		expect(csvCell(true)).toBe("ano");
		expect(csvCell(false)).toBe("");
		expect(csvCell(undefined)).toBe("");
		expect(csvCell(Number.NaN)).toBe("");
	});

	it("soubor začíná BOM, oddělovač středník, konce řádků CRLF", () => {
		expect(toCsv(["a", "b"], [[1, "x"]])).toBe(`${BOM}a;b\r\n1;x\r\n`);
	});

	it("tréninky seřazené podle data a začátku, se zátěží, objemem a odkazy bez závorek", () => {
		const csv = workoutsCsv(
			[
				workout({ date: "2026-10-03", start: "18:00", title: "Push", duration_min: 60, rpe: 7, notes: "těžké; ale dobré" }),
				workout({ date: "2026-10-01", sport: "run", duration_min: 50, run: { distance_km: 10.2, moving_time_s: 3000, shoes: "[[Pegasus 40]]", type: "easy" }, source: "strava", strava_id: 123 }),
			],
			(w) => (w.sport === "strength" ? 4800.4 : 0),
		);
		const [header, first, second] = lines(csv);
		expect(header!.split(";")).toHaveLength(23);
		expect(first).toBe("2026-10-01;;Běh;;50;;;;10,2;3000;;;;lehký;Pegasus 40;;;;;;Strava;123;");
		expect(second).toBe('2026-10-03;18:00;Posilovna;Push;60;7;420;4800;;;;;;;;;;;;;ručně;;"těžké; ale dobré"');
	});

	it("série: každá série zvlášť, EMOM a žebřík rozepsané", () => {
		const csv = setsCsv([
			workout({
				title: "Push",
				blocks: [
					{ type: "sets", exercise: "[[Bench press]]", sets: [{ reps: 8, kg: 60, warmup: true }, { reps: 6, kg: 80, rir: 2 }] },
					{ type: "emom", exercise: "Kettlebell swing", minutes: 10, reps_per_min: 15, kg: 24 },
					{ type: "ladder", exercise: "Shyby", steps: [1, 2] },
				],
			}),
		]);
		expect(lines(csv).slice(1)).toEqual([
			"2026-10-03;Posilovna – Push;série;1;Bench press;1;8;60;;;;ano;",
			"2026-10-03;Posilovna – Push;série;1;Bench press;2;6;80;;;2;;",
			"2026-10-03;Posilovna – Push;EMOM;2;Kettlebell swing;1;150;24;;600;;;10 min × 15 opak.",
			"2026-10-03;Posilovna – Push;žebřík;3;Shyby;1;1;;;;;;",
			"2026-10-03;Posilovna – Push;žebřík;3;Shyby;2;2;;;;;;",
		]);
	});

	it("denní data: délka spánku dopočítaná, suplementy v jedné buňce", () => {
		const day: DayNote = {
			forma: "day",
			schema: 1,
			date: "2026-10-02",
			sleep: { bedtime: "23:10", wake: "06:40", quality: 4 },
			check_in: { fatigue: 3 },
			hrv: { rmssd_ms: 62 },
			body: { weight_kg: 78.4, waist_cm: 82.5, arm_cm: 36 },
			steps: 8200,
			supplements: ["Kreatin", "Vitamin D"],
		};
		const [, row] = lines(daysCsv([day], () => 450));
		expect(row).toBe("2026-10-02;23:10;;06:40;450;4;;;3;;;;;62;;;78,4;;82,5;;;36;;;8200;Kreatin, Vitamin D;");
	});
});

/** Přečte stored ZIP: názvy a obsah ze středového adresáře. */
function readZip(zip: Uint8Array): { name: string; data: Uint8Array; crc: number }[] {
	const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
	const end = zip.length - 22;
	expect(view.getUint32(end, true)).toBe(0x06054b50);
	const count = view.getUint16(end + 10, true);
	let pos = view.getUint32(end + 16, true);
	const out = [];
	for (let i = 0; i < count; i++) {
		expect(view.getUint32(pos, true)).toBe(0x02014b50);
		expect(view.getUint16(pos + 8, true) & 0x0800).toBe(0x0800);
		const crc = view.getUint32(pos + 16, true);
		const size = view.getUint32(pos + 24, true);
		const nameLen = view.getUint16(pos + 28, true);
		const offset = view.getUint32(pos + 42, true);
		const name = new TextDecoder().decode(zip.subarray(pos + 46, pos + 46 + nameLen));
		expect(view.getUint32(offset, true)).toBe(0x04034b50);
		const localName = view.getUint16(offset + 26, true);
		const start = offset + 30 + localName;
		out.push({ name, data: zip.subarray(start, start + size), crc });
		pos += 46 + nameLen;
	}
	return out;
}

describe("záloha ZIP (SPEC 5.12)", () => {
	it("CRC-32 kontrolní hodnota", () => {
		expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
		expect(crc32(new Uint8Array())).toBe(0);
	});

	it("datum a čas MS-DOS", () => {
		// 14:05:07 → 14·2048 + 5·32 + 3; 3. 10. 2026 → 46·512 + 10·32 + 3
		expect(dosDateTime(new Date(2026, 9, 3, 14, 5, 7))).toEqual({ time: 28835, date: 23875 });
		expect(dosDateTime(new Date(1975, 0, 1)).date >> 9).toBe(0);
	});

	it("archiv obsahuje soubory s českými názvy a nezměněným obsahem", () => {
		const enc = new TextEncoder();
		const files = [
			{ path: "Forma/Deník/2026/2026-10-03.md", data: enc.encode("---\nforma: day\n---\nČeský text") },
			{ path: "Forma/Tréninky/prázdný.md", data: new Uint8Array() },
		];
		const read = readZip(createZip(files));
		expect(read.map((f) => f.name)).toEqual(files.map((f) => f.path));
		read.forEach((f, i) => {
			expect([...f.data]).toEqual([...files[i]!.data]);
			expect(f.crc).toBe(crc32(files[i]!.data));
		});
	});

	it("prázdný archiv je platný (jen koncový záznam)", () => {
		expect(createZip([])).toHaveLength(22);
	});

	it("razítko v názvu souboru bez dvojtečky", () => {
		expect(stamp(new Date(2026, 9, 3, 9, 5))).toBe("2026-10-03 09-05");
	});
});

describe("CSV v angličtině", () => {
	it("hlavička denních dat je celá přeložená", async () => {
		const { getLanguage, setLanguage } = await import("../../src/i18n");
		const before = getLanguage();
		setLanguage("en");
		try {
			const header = daysCsv([], () => null).split(/\r?\n/)[0]!;
			expect(header).toContain("fell asleep");
			expect(header).toContain("woke up");
			expect(header).toContain("body fat (%)");
			expect(header).not.toMatch(/usnul|vstal|tuk/);
		} finally {
			setLanguage(before);
		}
	});
});
