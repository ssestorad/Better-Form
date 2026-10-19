// Čtení binárního formátu FIT (hodinky Garmin, Coros, Wahoo, Suunto): ze záznamu
// se berou jen body trasy (zpráva „record“) a souhrn („session“). Výsledek má stejný
// tvar jako GPX / TCX, takže vzdálenost, čas v pohybu a nejrychlejší úseky počítá
// runFile.ts. Bez závislosti na Obsidianu.

import type { ParsedRunFile, TrackPoint } from "./runFile";
import { t } from "../i18n";

/** Sekundy mezi 1. 1. 1970 a počátkem času FIT (31. 12. 1989 UTC). */
const FIT_EPOCH_S = 631065600;
/** Polokruhy → stupně. */
const SEMICIRCLE_DEG = 180 / 2 ** 31;

const MESSAGE_SESSION = 18;
const MESSAGE_RECORD = 20;
const FIELD_TIMESTAMP = 253;

/** Typ sportu ze zprávy „session“ jako text, kterému rozumí sportOfFileType. */
const SPORTS: Record<number, string> = { 1: "running", 2: "cycling", 5: "swimming", 11: "walking", 17: "hiking" };

interface FieldDef {
	num: number;
	size: number;
	type: number;
}

interface MessageDef {
	/** Globální číslo zprávy (record, session…). */
	message: number;
	little: boolean;
	fields: FieldDef[];
	/** Bajty vývojářských polí na konci zprávy – jen se přeskočí. */
	devBytes: number;
}

export function isFit(data: ArrayBuffer): boolean {
	if (data.byteLength < 12) return false;
	const bytes = new Uint8Array(data, 8, 4);
	return String.fromCharCode(...bytes) === ".FIT";
}

/**
 * Celé číslo pole; undefined pro „neplatnou“ hodnotu (zařízení údaj nemá) a pro typy,
 * které tu nejsou potřeba (text, desetinná čísla, 64 bitů).
 */
function readInt(view: DataView, pos: number, field: FieldDef, little: boolean): number | undefined {
	switch (field.type & 0x1f) {
		case 0: // enum
		case 2: {
			const v = view.getUint8(pos);
			return v === 0xff ? undefined : v;
		}
		case 1: {
			const v = view.getInt8(pos);
			return v === 0x7f ? undefined : v;
		}
		case 3: {
			const v = view.getInt16(pos, little);
			return field.size < 2 || v === 0x7fff ? undefined : v;
		}
		case 4: {
			const v = view.getUint16(pos, little);
			return field.size < 2 || v === 0xffff ? undefined : v;
		}
		case 5: {
			const v = view.getInt32(pos, little);
			return field.size < 4 || v === 0x7fffffff ? undefined : v;
		}
		case 6: {
			const v = view.getUint32(pos, little);
			return field.size < 4 || v === 0xffffffff ? undefined : v;
		}
		default:
			return undefined;
	}
}

/** Přečte soubor FIT. Chyby vrací česky. */
export function parseFit(data: ArrayBuffer): ParsedRunFile {
	if (!isFit(data)) throw new Error(t("The file isn't in FIT format."));
	const view = new DataView(data);
	const points: TrackPoint[] = [];
	const file: ParsedRunFile = { format: "fit", points };
	const defs = new Map<number, MessageDef>();
	let lastTime = 0;

	const readMessage = (pos: number, local: number, compressedTime: number | undefined): number => {
		const def = defs.get(local);
		if (!def) throw new RangeError("missing definition");
		const values = new Map<number, number>();
		const wanted = def.message === MESSAGE_RECORD || def.message === MESSAGE_SESSION;
		for (const field of def.fields) {
			if (wanted || field.num === FIELD_TIMESTAMP) {
				const value = readInt(view, pos, field, def.little);
				if (value !== undefined) values.set(field.num, value);
			}
			pos += field.size;
		}
		const stamp = values.get(FIELD_TIMESTAMP);
		if (stamp !== undefined) lastTime = stamp;
		if (def.message === MESSAGE_RECORD) {
			const time = stamp ?? compressedTime;
			const lat = values.get(0);
			const lon = values.get(1);
			const altitude = values.get(78) ?? values.get(2);
			const distance = values.get(5);
			const point: TrackPoint = {};
			if (time !== undefined) point.timeMs = (time + FIT_EPOCH_S) * 1000;
			if (lat !== undefined && lon !== undefined) {
				point.lat = lat * SEMICIRCLE_DEG;
				point.lon = lon * SEMICIRCLE_DEG;
			}
			if (altitude !== undefined) point.ele = altitude / 5 - 500;
			if (values.has(3)) point.hr = values.get(3)!;
			if (distance !== undefined) point.distM = distance / 100;
			points.push(point);
		} else if (def.message === MESSAGE_SESSION) {
			const sport = values.get(5);
			if (sport !== undefined && SPORTS[sport]) file.type = SPORTS[sport];
			if (values.has(9)) file.lapDistanceM = values.get(9)! / 100;
			if (values.has(8)) file.lapTimeS = values.get(8)! / 1000;
		}
		return pos + def.devBytes;
	};

	try {
		const headerSize = view.getUint8(0);
		const end = Math.min(view.byteLength, headerSize + view.getUint32(4, true));
		let pos = headerSize;
		while (pos < end) {
			const header = view.getUint8(pos++);
			if (header & 0x80) {
				// Zkrácená hlavička: 5 bitů času navazuje na poslední plné časové razítko.
				const offset = header & 0x1f;
				lastTime = (lastTime & ~0x1f) + offset + (offset < (lastTime & 0x1f) ? 0x20 : 0);
				pos = readMessage(pos, (header >> 5) & 0x3, lastTime);
			} else if (header & 0x40) {
				const little = view.getUint8(pos + 1) === 0;
				const message = view.getUint16(pos + 2, little);
				const count = view.getUint8(pos + 4);
				pos += 5;
				const fields: FieldDef[] = [];
				for (let i = 0; i < count; i++, pos += 3) fields.push({ num: view.getUint8(pos), size: view.getUint8(pos + 1), type: view.getUint8(pos + 2) });
				let devBytes = 0;
				if (header & 0x20) {
					const devCount = view.getUint8(pos++);
					for (let i = 0; i < devCount; i++, pos += 3) devBytes += view.getUint8(pos + 1);
				}
				defs.set(header & 0x0f, { message, little, fields, devBytes });
			} else {
				pos = readMessage(pos, header & 0x0f, undefined);
			}
		}
	} catch (err) {
		if (err instanceof RangeError) throw new Error(t("The FIT file is damaged or incomplete."));
		throw err;
	}
	return file;
}
