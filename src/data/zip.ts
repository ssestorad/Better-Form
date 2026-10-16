// Minimální zápis ZIP archivu (metoda „stored“, bez komprese) pro zálohu složky
// (SPEC 5.12). Funguje bez Node i na mobilu; poznámky jsou malé, komprese není nutná.
// Názvy souborů v UTF-8 (příznak 11). Bez závislosti na Obsidianu.

import { t } from "../i18n";

export interface ZipEntry {
	/** Cesta v archivu s lomítky, bez úvodního lomítka. */
	path: string;
	data: Uint8Array;
	modified?: Date;
}

let crcTable: Uint32Array | null = null;

function table(): Uint32Array {
	if (crcTable) return crcTable;
	crcTable = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		crcTable[n] = c >>> 0;
	}
	return crcTable;
}

/** CRC-32 (IEEE 802.3), jak ho vyžaduje ZIP. */
export function crc32(data: Uint8Array): number {
	const x = table();
	let crc = 0xffffffff;
	for (const byte of data) crc = x[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

/** Datum a čas ve formátu MS-DOS (místní čas, rozlišení 2 s, nejdřív rok 1980). */
export function dosDateTime(date: Date): { time: number; date: number } {
	const year = Math.max(1980, date.getFullYear());
	return {
		time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
		date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
	};
}

const UTF8_FLAG = 0x0800;
const VERSION = 20;

/** Sestaví ZIP archiv z daných souborů. */
export function createZip(entries: readonly ZipEntry[]): Uint8Array {
	if (entries.length > 0xffff) throw new Error(t("Too many files for one archive."));
	const encoder = new TextEncoder();
	const locals: Uint8Array[] = [];
	const centrals: Uint8Array[] = [];
	let offset = 0;

	for (const entry of entries) {
		const name = encoder.encode(entry.path.replace(/^\/+/, ""));
		const crc = crc32(entry.data);
		const size = entry.data.length;
		const { time, date } = dosDateTime(entry.modified ?? new Date());

		const local = new Uint8Array(30 + name.length);
		const lv = new DataView(local.buffer);
		lv.setUint32(0, 0x04034b50, true);
		lv.setUint16(4, VERSION, true);
		lv.setUint16(6, UTF8_FLAG, true);
		lv.setUint16(8, 0, true); // metoda: stored
		lv.setUint16(10, time, true);
		lv.setUint16(12, date, true);
		lv.setUint32(14, crc, true);
		lv.setUint32(18, size, true);
		lv.setUint32(22, size, true);
		lv.setUint16(26, name.length, true);
		lv.setUint16(28, 0, true);
		local.set(name, 30);

		const central = new Uint8Array(46 + name.length);
		const cv = new DataView(central.buffer);
		cv.setUint32(0, 0x02014b50, true);
		cv.setUint16(4, VERSION, true);
		cv.setUint16(6, VERSION, true);
		cv.setUint16(8, UTF8_FLAG, true);
		cv.setUint16(10, 0, true);
		cv.setUint16(12, time, true);
		cv.setUint16(14, date, true);
		cv.setUint32(16, crc, true);
		cv.setUint32(20, size, true);
		cv.setUint32(24, size, true);
		cv.setUint16(28, name.length, true);
		cv.setUint32(42, offset, true);
		central.set(name, 46);

		locals.push(local, entry.data);
		centrals.push(central);
		offset += local.length + size;
	}

	const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
	const end = new Uint8Array(22);
	const ev = new DataView(end.buffer);
	ev.setUint32(0, 0x06054b50, true);
	ev.setUint16(8, entries.length, true);
	ev.setUint16(10, entries.length, true);
	ev.setUint32(12, centralSize, true);
	ev.setUint32(16, offset, true);

	const out = new Uint8Array(offset + centralSize + end.length);
	let pos = 0;
	for (const part of [...locals, ...centrals, end]) {
		out.set(part, pos);
		pos += part.length;
	}
	return out;
}
