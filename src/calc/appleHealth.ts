// Import z Apple Health: export.xml (Zdraví → profil → Exportovat všechna data zdraví,
// rozbalit zip) a JSON z aplikace Health Auto Export. Výsledek je stejný jako u CSV
// (dailyImport.ts) – do deníku se doplní jen chybějící hodnoty. HRV z Apple Health je
// SDNN, ne RMSSD – nesrovnatelné, proto se neimportuje. Bez závislosti na Obsidianu.

import type { DailyField, DailyRow, ParsedDaily } from "./dailyImport";

const LB_KG = 0.45359237;
const ASLEEP = /^HKCategoryValueSleepAnalysisAsleep/;
const FIELDS: DailyField[] = ["steps", "duration_min", "resting_hr", "weight_kg"];

export type ParsedHealth = ParsedDaily & { sdnnSkipped: number };

/** „2026-11-01 23:10:00 +0100“ → datum a minuty od půlnoci v místním čase záznamu (posun se ignoruje). */
function wallClock(text: unknown): { date: string; min: number } | null {
	const m = typeof text === "string" ? text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/) : null;
	return m ? { date: m[1]!, min: Number(m[2]) * 60 + Number(m[3]) } : null;
}

/** Minuty od 1970 v místním čase záznamu – pro délky úseků přes půlnoc. */
const absolute = (c: { date: string; min: number }) => Date.parse(`${c.date}T00:00:00Z`) / 60000 + c.min;
const hhmm = (abs: number) => {
	const min = ((abs % 1440) + 1440) % 1440;
	return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
};

function attrs(tag: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]!] = m[2]!;
	return out;
}

function result(rows: Map<string, DailyRow>, sdnnSkipped: number): ParsedHealth {
	const list = [...rows.values()].filter((r) => Object.keys(r).length > 1).sort((a, b) => a.date.localeCompare(b.date));
	return { rows: list, fields: FIELDS.filter((f) => list.some((r) => r[f] !== undefined)), skippedRows: 0, sdnnSkipped };
}

function rowOf(rows: Map<string, DailyRow>, date: string): DailyRow {
	let row = rows.get(date);
	if (!row) rows.set(date, (row = { date }));
	return row;
}

interface SleepPiece {
	start: number;
	end: number;
}

/**
 * Postupné čtení export.xml po kouscích – soubor mívá stovky MB. Kroky a spánek se
 * sčítají za každý zdroj zvlášť a bere se zdroj s nejvíc hodnotami (iPhone i hodinky
 * zapisují stejné kroky dvakrát). Spánek patří ke dni probuzení.
 */
// ponytail: zdroj s maximem podhodnotí dny, kdy se nosil střídavě telefon a hodinky; přesné spojení jako v aplikaci Zdraví by chtělo slučovat časové úseky.
export function appleHealthReader() {
	let rest = "";
	const steps = new Map<string, Map<string, number>>(); // den → zdroj → kroky
	const sleep = new Map<string, Map<string, SleepPiece[]>>(); // den probuzení → zdroj → úseky
	const rhr = new Map<string, number[]>();
	const weight = new Map<string, number>();
	let sdnn = 0;

	function record(a: Record<string, string>) {
		const start = wallClock(a.startDate);
		if (!start) return;
		const value = Number(a.value);
		const source = a.sourceName ?? "";
		switch (a.type) {
			case "HKQuantityTypeIdentifierStepCount": {
				if (!Number.isFinite(value)) return;
				const day = steps.get(start.date) ?? new Map<string, number>();
				day.set(source, (day.get(source) ?? 0) + value);
				steps.set(start.date, day);
				return;
			}
			case "HKQuantityTypeIdentifierRestingHeartRate":
				if (Number.isFinite(value)) rhr.set(start.date, [...(rhr.get(start.date) ?? []), value]);
				return;
			case "HKQuantityTypeIdentifierBodyMass":
				if (Number.isFinite(value)) weight.set(start.date, a.unit === "lb" ? value * LB_KG : value);
				return;
			case "HKQuantityTypeIdentifierHeartRateVariabilitySDNN":
				sdnn++;
				return;
			case "HKCategoryTypeIdentifierSleepAnalysis": {
				const end = wallClock(a.endDate);
				if (!end || !ASLEEP.test(a.value ?? "")) return;
				// Den probuzení: konec + 6 h (noc končící ve 23:30 patří už k dalšímu dni).
				const day = new Date((absolute(end) + 360) * 60000).toISOString().slice(0, 10);
				const bySource = sleep.get(day) ?? new Map<string, SleepPiece[]>();
				bySource.set(source, [...(bySource.get(source) ?? []), { start: absolute(start), end: absolute(end) }]);
				sleep.set(day, bySource);
				return;
			}
		}
	}

	return {
		push(chunk: string): void {
			const text = rest + chunk;
			const last = text.lastIndexOf(">");
			for (const m of text.slice(0, last + 1).matchAll(/<Record\b[^>]*>/g)) record(attrs(m[0]));
			rest = text.slice(last + 1);
		},
		finish(): ParsedHealth {
			const rows = new Map<string, DailyRow>();
			for (const [date, bySource] of steps) {
				const n = Math.round(Math.max(...bySource.values()));
				if (n > 0) rowOf(rows, date).steps = n;
			}
			for (const [date, values] of rhr) rowOf(rows, date).resting_hr = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
			for (const [date, kg] of weight) rowOf(rows, date).weight_kg = Math.round(kg * 10) / 10;
			for (const [date, bySource] of sleep) {
				let best: SleepPiece[] = [];
				let bestMin = 0;
				for (const pieces of bySource.values()) {
					const min = pieces.reduce((s, p) => s + (p.end - p.start), 0);
					if (min > bestMin) [best, bestMin] = [pieces, min];
				}
				if (bestMin < 1 || bestMin > 1200) continue;
				const row = rowOf(rows, date);
				row.duration_min = Math.round(bestMin);
				row.sleep_onset = hhmm(Math.min(...best.map((p) => p.start)));
				row.wake = hhmm(Math.max(...best.map((p) => p.end)));
			}
			return result(rows, sdnn);
		},
	};
}

/** JSON z Health Auto Export (iOS): data.metrics[] s denními hodnotami. */
export function parseHealthAutoExport(json: unknown): ParsedHealth {
	const metrics = (json as { data?: { metrics?: unknown } } | null)?.data?.metrics;
	if (!Array.isArray(metrics)) throw new Error("not a Health Auto Export file");
	const rows = new Map<string, DailyRow>();
	let sdnn = 0;
	for (const metric of metrics as { name?: string; units?: string; data?: Record<string, unknown>[] }[]) {
		for (const point of metric.data ?? []) {
			const at = wallClock(point.date);
			if (!at) continue;
			const qty = Number(point.qty);
			switch (metric.name) {
				case "step_count":
					if (qty > 0) rowOf(rows, at.date).steps = Math.round((rowOf(rows, at.date).steps ?? 0) + qty);
					break;
				case "resting_heart_rate":
					if (qty > 0) rowOf(rows, at.date).resting_hr = Math.round(qty);
					break;
				case "weight_body_mass":
					if (qty > 0) rowOf(rows, at.date).weight_kg = Math.round((metric.units === "lb" ? qty * LB_KG : qty) * 10) / 10;
					break;
				case "heart_rate_variability":
					sdnn++;
					break;
				case "sleep_analysis": {
					const hours = Number(point.totalSleep ?? point.asleep);
					if (!(hours > 0 && hours <= 20)) break;
					const row = rowOf(rows, at.date);
					row.duration_min = Math.round(hours * 60);
					const onset = wallClock(point.sleepStart);
					const wake = wallClock(point.sleepEnd);
					if (onset) row.sleep_onset = hhmm(onset.min);
					if (wake) row.wake = hhmm(wake.min);
					break;
				}
			}
		}
	}
	return result(rows, sdnn);
}
