import { describe, expect, it } from "vitest";
import { encodeFitWorkout, fitCrc } from "../../src/calc/fitWorkout";

/** Jednoduchý dekodér jen pro test: zprávy jako {global, fields: {num: number | string}}. */
function decode(bytes: Uint8Array) {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const end = 14 + view.getUint32(4, true);
	const defs = new Map<number, { global: number; fields: { num: number; size: number; type: number }[] }>();
	const out: { global: number; fields: Record<number, number | string> }[] = [];
	let pos = 14;
	while (pos < end) {
		const head = bytes[pos++]!;
		const local = head & 0x0f;
		if (head & 0x40) {
			const global = view.getUint16(pos + 2, true);
			const n = bytes[pos + 4]!;
			const fields = [];
			for (let i = 0; i < n; i++) fields.push({ num: bytes[pos + 5 + i * 3]!, size: bytes[pos + 6 + i * 3]!, type: bytes[pos + 7 + i * 3]! });
			defs.set(local, { global, fields });
			pos += 5 + n * 3;
		} else {
			const def = defs.get(local)!;
			const fields: Record<number, number | string> = {};
			for (const f of def.fields) {
				const raw = bytes.subarray(pos, pos + f.size);
				fields[f.num] = f.type === 0x07 ? new TextDecoder().decode(raw).replace(/\0.*$/s, "") : raw.reduceRight((v, b) => v * 256 + b, 0);
				pos += f.size;
			}
			out.push({ global: def.global, fields });
		}
	}
	return out;
}

describe("trénink ve formátu FIT", () => {
	const created = new Date(Date.UTC(2026, 10, 19, 8, 0, 0));
	const fit = encodeFitWorkout(
		{
			name: "Tempo 8 km – Better Form test with a very long name",
			steps: [
				{ name: "Tempo", duration: { kind: "distance", m: 8000 }, pace: { slow: 300, fast: 280 }, intensity: "active" },
				{ duration: { kind: "time", s: 600 }, intensity: "cooldown" },
			],
		},
		created,
	);

	it("hlavička .FIT, platné CRC hlavičky i souboru", () => {
		expect(fit[0]).toBe(14);
		expect(String.fromCharCode(...fit.subarray(8, 12))).toBe(".FIT");
		expect(fitCrc(fit.subarray(0, 14))).toBe(0);
		// CRC přes data i uložené CRC je 0.
		expect(fitCrc(fit)).toBe(0);
	});

	it("zprávy file_id, workout a kroky s tempem v mm/s", () => {
		const msgs = decode(fit);
		expect(msgs.map((m) => m.global)).toEqual([0, 26, 27, 27]);
		expect(msgs[0]!.fields).toMatchObject({ 0: 5, 1: 255, 4: 1795075200 - 631065600 });
		expect(msgs[1]!.fields[4]).toBe(1);
		expect(msgs[1]!.fields[6]).toBe(2);
		// Název oříznutý na 31 bajtů UTF-8.
		expect(new TextEncoder().encode(String(msgs[1]!.fields[8])).length).toBeLessThanOrEqual(31);
		// 8 km = 800 000 cm; 5:00/km = 3,333 m/s → 3333 mm/s; 4:40/km → 3571 mm/s.
		expect(msgs[2]!.fields).toMatchObject({ 254: 0, 0: "Tempo", 1: 1, 2: 800000, 3: 0, 5: 3333, 6: 3571, 7: 0 });
		expect(msgs[3]!.fields).toMatchObject({ 254: 1, 1: 0, 2: 600000, 3: 2, 7: 3 });
	});
});
