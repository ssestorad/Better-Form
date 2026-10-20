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
