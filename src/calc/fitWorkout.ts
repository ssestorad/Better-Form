// Naplánovaný běh jako trénink ve formátu FIT (soubor typu workout) – Garmin, COROS,
// Suunto a další hodinky ho umí nahrát jako strukturovaný trénink. Jen to nejnutnější
// z FIT SDK: file_id, workout a workout_step. Čisté funkce bez závislosti na Obsidianu.

/** Sekundy mezi 1. 1. 1970 a začátkem času FIT (31. 12. 1989 UTC). */
const FIT_EPOCH_S = 631065600;
const PROFILE_VERSION = 2132;

export interface FitStep {
	name?: string;
	/** Délka kroku: vzdálenost v metrech, čas v sekundách, nebo do stisku tlačítka Lap. */
	duration: { kind: "distance"; m: number } | { kind: "time"; s: number } | { kind: "open" };
	/** Cílové tempo s/km (slow = pomalejší konec rozpětí). */
	pace?: { slow: number; fast: number };
	intensity: "active" | "rest" | "warmup" | "cooldown";
}

export interface FitWorkout {
	name: string;
	steps: readonly FitStep[];
}

const CRC_TABLE = [0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400];

/** CRC-16 podle FIT SDK. */
export function fitCrc(bytes: Uint8Array, crc = 0): number {
	for (const byte of bytes) {
		let tmp = CRC_TABLE[crc & 0xf]!;
		crc = ((crc >> 4) & 0x0fff) ^ tmp ^ CRC_TABLE[byte & 0xf]!;
		tmp = CRC_TABLE[crc & 0xf]!;
		crc = ((crc >> 4) & 0x0fff) ^ tmp ^ CRC_TABLE[(byte >> 4) & 0xf]!;
	}
	return crc;
}

// Základní typy FIT: enum, uint16, uint32, string.
type Field = { num: number; type: 0x00 | 0x84 | 0x86 | 0x07; size: number; value: number | string };

/** Text jako UTF-8 s nulou na konci, oříznutý na `size` bajtů (bez rozdělení znaku). */
function textBytes(text: string, size: number): Uint8Array {
	const out = new Uint8Array(size);
	let bytes = new TextEncoder().encode(text);
	while (bytes.length > size - 1) bytes = new TextEncoder().encode((text = text.slice(0, -1)));
	out.set(bytes);
	return out;
}

/** Definice (lokální typ 0) a hned data jedné zprávy – každá zpráva má vlastní definici, je to nejjednodušší. */
function message(global: number, fields: readonly Field[]): number[] {
	const out = [0x40, 0, 0, global & 0xff, global >> 8, fields.length];
	for (const f of fields) out.push(f.num, f.size, f.type);
	out.push(0x00);
	for (const f of fields) {
		if (typeof f.value === "string") out.push(...textBytes(f.value, f.size));
		else for (let i = 0; i < f.size; i++) out.push((f.value >>> (8 * i)) & 0xff);
	}
	return out;
}

const DURATION = { time: 0, distance: 1, open: 5 } as const;
const INTENSITY = { active: 0, rest: 1, warmup: 2, cooldown: 3 } as const;
const NAME_BYTES = 32;

/** Soubor FIT s tréninkem (sport běh). */
export function encodeFitWorkout(workout: FitWorkout, created: Date): Uint8Array {
	const body: number[] = [
		...message(0, [
			{ num: 0, type: 0x00, size: 1, value: 5 }, // type = workout
			{ num: 1, type: 0x84, size: 2, value: 255 }, // manufacturer = development
			{ num: 2, type: 0x84, size: 2, value: 0 },
			{ num: 4, type: 0x86, size: 4, value: Math.floor(created.getTime() / 1000) - FIT_EPOCH_S },
		]),
		...message(26, [
			{ num: 4, type: 0x00, size: 1, value: 1 }, // sport = running
			{ num: 6, type: 0x84, size: 2, value: workout.steps.length },
			{ num: 8, type: 0x07, size: NAME_BYTES, value: workout.name },
		]),
	];
	workout.steps.forEach((step, index) => {
		const d = step.duration;
		const durationValue = d.kind === "distance" ? Math.round(d.m * 100) : d.kind === "time" ? Math.round(d.s * 1000) : 0;
		// Rychlost v mm/s: pomalejší tempo = dolní hranice.
		const speed = (pace: number) => Math.round(1_000_000 / pace);
		body.push(
			...message(27, [
				{ num: 254, type: 0x84, size: 2, value: index },
				{ num: 0, type: 0x07, size: NAME_BYTES, value: step.name ?? "" },
				{ num: 1, type: 0x00, size: 1, value: DURATION[d.kind] },
				{ num: 2, type: 0x86, size: 4, value: durationValue },
				{ num: 3, type: 0x00, size: 1, value: step.pace ? 0 : 2 }, // speed / open
				{ num: 4, type: 0x86, size: 4, value: 0 },
				{ num: 5, type: 0x86, size: 4, value: step.pace ? speed(step.pace.slow) : 0 },
				{ num: 6, type: 0x86, size: 4, value: step.pace ? speed(step.pace.fast) : 0 },
				{ num: 7, type: 0x00, size: 1, value: INTENSITY[step.intensity] },
			]),
		);
	});
	const data = Uint8Array.from(body);
	const header = new Uint8Array(14);
	const view = new DataView(header.buffer);
	view.setUint8(0, 14);
	view.setUint8(1, 0x10); // protokol 1.0 – přečte ho i starší zařízení
	view.setUint16(2, PROFILE_VERSION, true);
	view.setUint32(4, data.length, true);
	header.set([0x2e, 0x46, 0x49, 0x54], 8); // ".FIT"
	view.setUint16(12, fitCrc(header.subarray(0, 12)), true);
	const out = new Uint8Array(14 + data.length + 2);
	out.set(header);
	out.set(data, 14);
	const crc = fitCrc(out.subarray(0, 14 + data.length));
	out[out.length - 2] = crc & 0xff;
	out[out.length - 1] = crc >> 8;
	return out;
}
