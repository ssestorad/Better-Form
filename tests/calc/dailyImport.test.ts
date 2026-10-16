import { describe, expect, it } from "vitest";
import { parseDailyCsv, parseDailyDate, sleepMinutes } from "../../src/calc/dailyImport";

describe("import denních hodnot z CSV", () => {
	it("sloupce pozná podle názvu; skóre, cíle a fáze spánku nechá být", () => {
		const csv = [
			"Date,Sleep Score,Total Sleep Duration,Deep Sleep Duration,Average HRV,HRV Balance,Lowest Resting Heart Rate,Steps,Step Goal,Weight (kg)",
			"2026-10-05,82,27900,5400,58,71,52,8431,10000,81.4",
			"2026-10-06,75,7:15,1:10,61,70,51,\"12,034\",10000,",
			"není datum,1,2,3,4,5,6,7,8,9",
		].join("\n");
		const parsed = parseDailyCsv(csv);
		expect(parsed.fields).toEqual(["steps", "duration_min", "rmssd_ms", "resting_hr", "weight_kg"]);
		expect(parsed.skippedRows).toBe(1);
		expect(parsed.rows).toEqual([
			// 27 900 s = 465 min
			{ date: "2026-10-05", steps: 8431, duration_min: 465, rmssd_ms: 58, resting_hr: 52, weight_kg: 81.4 },
			// 7:15 = 435 min; „12,034“ je dvanáct tisíc; prázdná váha chybí
			{ date: "2026-10-06", steps: 12034, duration_min: 435, rmssd_ms: 61, resting_hr: 51 },
		]);
	});

	it("český export se středníky a desetinnou čárkou; hodnoty mimo rozsah se zahodí", () => {
		const csv = "Datum;Kroky;Délka spánku (h);Klidový tep;Váha\n5. 10. 2026;9 120;7,5;54;80,6\n06.10.2026;0;25;300;12\n";
		expect(parseDailyCsv(csv).rows).toEqual([
			// 7,5 h = 450 min
			{ date: "2026-10-05", steps: 9120, duration_min: 450, resting_hr: 54, weight_kg: 80.6 },
			// den 6. 10.: nula kroků, tep 300 a váha 12 kg nejsou platné; 25 se bere jako minuty (nad 24 už nejsou hodiny)
			{ date: "2026-10-06", duration_min: 25 },
		]);
	});

	it("Google Fit – denní metriky: jen kroky", () => {
		const csv = "Date,Move Minutes count,Calories (kcal),Distance (m),Heart Points,Step count\n2026-10-05,95,2412.5,7204.1,30,9876\n";
		const parsed = parseDailyCsv(csv);
		expect(parsed.fields).toEqual(["steps"]);
		expect(parsed.rows).toEqual([{ date: "2026-10-05", steps: 9876 }]);
	});

	it("víc řádků jednoho dne se sloučí, pozdější hodnota platí", () => {
		const csv = "date,steps,weight\n2026-10-05 08:00,3000,\n2026-10-05 20:00,9000,81\n";
		expect(parseDailyCsv(csv).rows).toEqual([{ date: "2026-10-05", steps: 9000, weight_kg: 81 }]);
	});

	it("datum a délka spánku v různých zápisech", () => {
		expect(parseDailyDate("2026-10-05T06:30:00+02:00")).toBe("2026-10-05");
		expect(parseDailyDate("2026/1/5")).toBe("2026-01-05");
		expect(parseDailyDate("5.10.2026")).toBe("2026-10-05");
		expect(parseDailyDate("10/05/2026")).toBeNull();
		expect(parseDailyDate("2026-02-30")).toBeNull();
		expect(sleepMinutes("7h 45m")).toBe(465);
		expect(sleepMinutes("8 h")).toBe(480);
		expect(sleepMinutes("7.75")).toBe(465);
		expect(sleepMinutes("465")).toBe(465);
		expect(sleepMinutes("")).toBeUndefined();
	});

	it("soubor bez data nebo bez známého sloupce ohlásí srozumitelně", () => {
		expect(() => parseDailyCsv("")).toThrow("prázdný");
		expect(() => parseDailyCsv("a,b\n1,2\n")).toThrow("sloupec s datem");
		expect(() => parseDailyCsv("date,mood\n2026-10-05,4\n")).toThrow("Sloupce v souboru: date, mood");
	});
});
