import { describe, expect, it } from "vitest";
import { foldLine, toIcs } from "../../src/calc/ics";

const NOW = new Date(Date.UTC(2026, 9, 20, 12, 30, 5));

describe("export do kalendáře (iCalendar)", () => {
	it("celodenní událost: konec je následující den, řádky CRLF", () => {
		const ics = toIcs([{ uid: "2026-10-31-p1@better-form", date: "2026-10-31", title: "Běh – Dlouhý", description: "15 km · lehce" }], NOW);
		expect(ics.split("\r\n")).toEqual([
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"PRODID:-//Better Form//Obsidian plugin//EN",
			"CALSCALE:GREGORIAN",
			"BEGIN:VEVENT",
			"UID:2026-10-31-p1@better-form",
			"DTSTAMP:20261020T123005Z",
			"DTSTART;VALUE=DATE:20261031",
			"DTEND;VALUE=DATE:20261101",
			"SUMMARY:Běh – Dlouhý",
			"DESCRIPTION:15 km · lehce",
			"TRANSP:TRANSPARENT",
			"END:VEVENT",
			"END:VCALENDAR",
			"",
		]);
	});

	it("čárka, středník, zpětné lomítko a nový řádek se escapují", () => {
		const ics = toIcs([{ uid: "x", date: "2026-10-20", title: "Kliky, shyby; a\\b", description: "řádek 1\nřádek 2" }], NOW);
		expect(ics).toContain("SUMMARY:Kliky\\, shyby\\; a\\\\b\r\n");
		expect(ics).toContain("DESCRIPTION:řádek 1\\nřádek 2\r\n");
	});

	it("dlouhý řádek se zalomí po 75 bajtech UTF-8, znak se nerozdělí", () => {
		const line = `SUMMARY:${"č".repeat(60)}`; // 8 + 120 bajtů
		const parts = foldLine(line).split("\r\n");
		const bytes = (s: string) => new TextEncoder().encode(s).length;
		expect(parts.length).toBe(2);
		expect(bytes(parts[0]!)).toBe(74); // 75. bajt by rozdělil „č“
		expect(parts[1]!.startsWith(" ")).toBe(true);
		expect(bytes(parts[1]!)).toBeLessThanOrEqual(75);
		expect(parts.join("").replace(" ", "")).toBe(line);
		expect(foldLine("SUMMARY:krátký")).toBe("SUMMARY:krátký");
	});
});
