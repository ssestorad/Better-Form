// Export do kalendáře ve formátu iCalendar (RFC 5545): celodenní události.
// Čisté funkce bez závislosti na Obsidianu.

import { addDays } from "../model/dates";

export interface CalendarEvent {
	/** Stálé označení – opakovaný import událost aktualizuje, nezdvojí. */
	uid: string;
	/** Den události (YYYY-MM-DD). */
	date: string;
	title: string;
	description?: string;
}

const escapeText = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const utf8Size = (char: string) => {
	const code = char.codePointAt(0)!;
	return code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
};

/** Zalomí řádek po 75 bajtech UTF-8; pokračování začíná mezerou. Znak se nikdy nerozdělí. */
export function foldLine(line: string): string {
	const parts: string[] = [];
	let current = "";
	let bytes = 0;
	for (const char of line) {
		const size = utf8Size(char);
		// Mezera na začátku pokračování se do 75 bajtů počítá.
		if (bytes + size > (parts.length === 0 ? 75 : 74)) {
			parts.push(current);
			current = "";
			bytes = 0;
		}
		current += char;
		bytes += size;
	}
	parts.push(current);
	return parts.join("\r\n ");
}

/** Kalendář s celodenními událostmi; `now` je čas vytvoření (DTSTAMP). */
export function toIcs(events: readonly CalendarEvent[], now: Date): string {
	const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
	const day = (date: string) => date.replace(/-/g, "");
	const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Better Form//Obsidian plugin//EN", "CALSCALE:GREGORIAN"];
	for (const event of events) {
		lines.push(
			"BEGIN:VEVENT",
			`UID:${event.uid}`,
			`DTSTAMP:${stamp}`,
			`DTSTART;VALUE=DATE:${day(event.date)}`,
			`DTEND;VALUE=DATE:${day(addDays(event.date, 1))}`,
			`SUMMARY:${escapeText(event.title)}`,
		);
		if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
		// Celodenní trénink v kalendáři neblokuje čas.
		lines.push("TRANSP:TRANSPARENT", "END:VEVENT");
	}
	lines.push("END:VCALENDAR");
	return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Událost načtená z kalendáře (jen to, co plán potřebuje). */
export interface IcsEvent {
	uid: string;
	/** Den začátku (YYYY-MM-DD, místní čas). */
	date: string;
	summary: string;
	description: string;
	/** Délka v minutách u události s časem; celodenní ji nemá. */
	minutes?: number;
}

const unescapeText = (text: string) => text.replace(/\\([\\;,nN])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));

/** „20261110“, „20261110T070000“, „20261110T070000Z“ → čas v ms (UTC jen se Z) a místní den. */
function icsTime(value: string): { ms: number; date: string; timed: boolean } | null {
	const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
	if (!m) return null;
	const [, y, mo, d, h, mi, s, z] = m;
	if (h === undefined) return { ms: Date.UTC(+y!, +mo! - 1, +d!), date: `${y}-${mo}-${d}`, timed: false };
	if (z) {
		const at = new Date(Date.UTC(+y!, +mo! - 1, +d!, +h, +mi!, +(s ?? 0)));
		const date = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
		return { ms: at.getTime(), date, timed: true };
	}
	// Čas s TZID nebo bez zóny: den je ten zapsaný, rozdíl časů stačí počítat jako UTC.
	return { ms: Date.UTC(+y!, +mo! - 1, +d!, +h, +mi!, +(s ?? 0)), date: `${y}-${mo}-${d}`, timed: true };
}

/** „PT45M“, „PT1H10M“ → minuty. */
function icsDuration(value: string): number | null {
	const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim());
	if (!m) return null;
	return (+(m[1] ?? 0) * 24 + +(m[2] ?? 0)) * 60 + +(m[3] ?? 0) + Math.round(+(m[4] ?? 0) / 60);
}

/** Události kalendáře iCalendar (RFC 5545); zrušené a neúplné se přeskočí. Opakování (RRULE) se nerozvíjí. */
export function parseIcs(text: string): IcsEvent[] {
	// Pokračování řádku začíná mezerou nebo tabulátorem.
	const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
	const events: IcsEvent[] = [];
	let current: Map<string, string> | null = null;
	for (const line of lines) {
		if (line === "BEGIN:VEVENT") current = new Map();
		else if (line === "END:VEVENT" && current) {
			const start = icsTime(current.get("DTSTART") ?? "");
			const uid = current.get("UID")?.trim();
			if (start && uid && current.get("STATUS")?.trim().toUpperCase() !== "CANCELLED") {
				const event: IcsEvent = { uid, date: start.date, summary: unescapeText(current.get("SUMMARY") ?? "").trim(), description: unescapeText(current.get("DESCRIPTION") ?? "").trim() };
				if (start.timed) {
					const end = icsTime(current.get("DTEND") ?? "");
					const minutes = end ? Math.round((end.ms - start.ms) / 60000) : icsDuration(current.get("DURATION") ?? "");
					if (minutes !== null && minutes > 0) event.minutes = minutes;
				}
				events.push(event);
			}
			current = null;
		} else if (current) {
			const colon = line.indexOf(":");
			if (colon > 0) {
				// Název vlastnosti bez parametrů (DTSTART;TZID=…:…).
				const name = line.slice(0, colon).split(";")[0]!.toUpperCase();
				if (!current.has(name)) current.set(name, line.slice(colon + 1));
			}
		}
	}
	return events;
}
