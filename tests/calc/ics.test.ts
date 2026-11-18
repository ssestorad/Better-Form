import { describe, expect, it } from "vitest";
import { foldLine, parseIcs, toIcs } from "../../src/calc/ics";
import { externalPlanItems } from "../../src/calc/plannedImport";

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

// Ukázkový kalendář sestavený podle RFC 5545 (formát událostí Runny není zdokumentovaný).
const FEED = [
	"BEGIN:VCALENDAR",
	"VERSION:2.0",
	"BEGIN:VEVENT",
	"UID:a1",
	"DTSTART;VALUE=DATE:20261112",
	"DTEND;VALUE=DATE:20261113",
	"SUMMARY:Easy Run · 6 km",
	"DESCRIPTION:Keep it conversational\\, 5:40–6:10/km.\\n2km warm up",
	"END:VEVENT",
	"BEGIN:VEVENT",
	"UID:a2",
	"DTSTART;TZID=Europe/Prague:20261114T070000",
	"DTEND;TZID=Europe/Prague:20261114T075000",
	"SUMMARY:Intervals",
	"DESCRIPTION:10 min warm up\\, 6 x 800m at 4:10/km. Total distance: 9",
	"  km",
	"END:VEVENT",
	"BEGIN:VEVENT",
	"UID:a3",
	"DTSTART;VALUE=DATE:20261115",
	"SUMMARY:Long Run 10 mi",
	"END:VEVENT",
	"BEGIN:VEVENT",
	"UID:a4",
	"DTSTART;VALUE=DATE:20261113",
	"SUMMARY:Strength – 30 min",
	"END:VEVENT",
	"BEGIN:VEVENT",
	"UID:a5",
	"DTSTART;VALUE=DATE:20261113",
	"SUMMARY:Rest Day",
	"END:VEVENT",
	"BEGIN:VEVENT",
	"UID:a6",
	"STATUS:CANCELLED",
	"DTSTART;VALUE=DATE:20261113",
	"SUMMARY:Tempo Run",
	"END:VEVENT",
	"BEGIN:VEVENT",
	"UID:a7",
	"DTSTART;VALUE=DATE:20261201",
	"SUMMARY:Race 5 km",
	"END:VEVENT",
	"END:VCALENDAR",
].join("\r\n");

describe("čtení kalendáře", () => {
	it("celodenní i časové události, pokračování řádků, zrušené vynechá", () => {
		const events = parseIcs(FEED);
		expect(events.map((e) => e.uid)).toEqual(["a1", "a2", "a3", "a4", "a5", "a7"]);
		expect(events[0]).toEqual({ uid: "a1", date: "2026-11-12", summary: "Easy Run · 6 km", description: "Keep it conversational, 5:40–6:10/km.\n2km warm up" });
		expect(events[1]).toMatchObject({ date: "2026-11-14", minutes: 50, description: "10 min warm up, 6 x 800m at 4:10/km. Total distance: 9 km" });
	});

	it("export a zpětné čtení dají stejné události", () => {
		const text = toIcs([{ uid: "x", date: "2026-11-12", title: "Běh, lehký; 6 km", description: "řádek\ndruhý" }], NOW);
		expect(parseIcs(text)).toEqual([{ uid: "x", date: "2026-11-12", summary: "Běh, lehký; 6 km", description: "řádek\ndruhý" }]);
	});

	it("čas v UTC se převede na místní den", () => {
		const [event] = parseIcs("BEGIN:VEVENT\nUID:u\nDTSTART:20261112T120000Z\nDURATION:PT1H5M\nEND:VEVENT");
		expect(event).toMatchObject({ date: "2026-11-12", minutes: 65 });
	});
});

describe("plán z kalendáře", () => {
	const items = externalPlanItems(parseIcs(FEED), "2026-11-10", "2026-12-06", "Runna");

	it("sport, intenzita, vzdálenost a délka z názvu; den volna přeskočí", () => {
		expect(items.map((i) => i.uid)).toEqual(["a1", "a2", "a3", "a4", "a7"]);
		const [easy, intervals, long, strength] = items;
		expect(easy).toMatchObject({ source: "Runna", sport: "run", intensity: "low", distance_km: 6, title: "Easy Run · 6 km" });
		// Úseky v popisu (2km, 800m) se za vzdálenost nepovažují; označená celková ano.
		expect(intervals).toMatchObject({ sport: "run", intensity: "high", distance_km: 9, duration_min: 50 });
		expect(long).toMatchObject({ sport: "run", intensity: "mid", distance_km: 16.09 });
		expect(strength).toMatchObject({ sport: "strength", duration_min: 30 });
		expect(strength!.distance_km).toBeUndefined();
	});

	it("jen události v daném období", () => {
		expect(externalPlanItems(parseIcs(FEED), "2026-11-13", "2026-11-30", "Runna").map((i) => i.uid)).toEqual(["a2", "a3", "a4"]);
	});
});
