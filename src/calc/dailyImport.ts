// Import denních hodnot (kroky, délka spánku, HRV, klidový tep, váha) z CSV, které
// vyexportují hodinky nebo aplikace. Formát každého výrobce je jiný, proto se sloupce
// poznávají podle názvu, ne podle pořadí. Bez závislosti na Obsidianu.

import { isIsoDate } from "../model/dates";
import type { DayNote } from "../model/types";
import { MAX_STEPS } from "../model/parse";
import { CHECK_IN_NUMBERS } from "./checkIn";
import { parseCsv } from "./historyImport";
import { t, translated } from "../i18n";

export const DAILY_FIELDS = ["steps", "duration_min", "rmssd_ms", "resting_hr", "weight_kg"] as const;
export type DailyField = (typeof DAILY_FIELDS)[number];

export const DAILY_FIELD_LABELS: Record<DailyField, string> = translated({
	steps: "kroky",
	duration_min: "délka spánku",
	rmssd_ms: "HRV",
	resting_hr: "klidový tep",
	weight_kg: "váha",
});

export type DailyRow = { date: string } & Partial<Record<DailyField, number>>;

export interface ParsedDaily {
	/** Jeden řádek na den, od nejstaršího. */
	rows: DailyRow[];
	/** Veličiny, pro které se v souboru našel sloupec. */
	fields: DailyField[];
	/** Řádky bez platného data. */
	skippedRows: number;
}

/**
 * Co z řádku importu v denní poznámce ještě chybí. Zapsané hodnoty se nepřepisují;
 * délka spánku se nedoplní ani tehdy, když ji poznámka počítá z časů ulehnutí a vstávání.
 */
export function missingValues(row: DailyRow, day: DayNote | undefined): Partial<Record<DailyField, number>> {
	const has: Record<DailyField, boolean> = {
		steps: day?.steps !== undefined,
		duration_min: day !== undefined && Object.keys(day.sleep).some((key) => ["duration_min", "bedtime", "sleep_onset", "wake"].includes(key)),
		rmssd_ms: day?.hrv.rmssd_ms !== undefined,
		resting_hr: day?.hrv.resting_hr !== undefined,
		weight_kg: day?.body.weight_kg !== undefined,
	};
	const out: Partial<Record<DailyField, number>> = {};
	for (const field of DAILY_FIELDS) if (row[field] !== undefined && !has[field]) out[field] = row[field];
	return out;
}

/** Hlavička bez diakritiky, velikosti písmen a podtržítek. */
const fold = (text: string) =>
	text
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[_\-]+/g, " ")
		.trim();

/** Jak poznat sloupec veličiny: co v názvu být musí a co nesmí (skóre, cíle, fáze spánku…). */
const COLUMNS: Record<DailyField, { is: RegExp; not: RegExp }> = {
	steps: { is: /step|krok/, not: /goal|cil|target|distance|vzdal|length/ },
	duration_min: {
		is: /^(sleep|spanek)$|(sleep|span|asleep).*(duration|total|delka|doba|hours|hodin|minut|\bmin\b|time|\bh\b)|(total|delka|doba|minutes|hours).*(sleep|span|asleep)/,
		not: /score|skore|efficien|latenc|quality|kvalit|rem|deep|hlubok|light|lehk|awake|bdel|start|end|bed|need|debt|goal|cil/,
	},
	rmssd_ms: { is: /hrv|rmssd/, not: /score|skore|status|balance|baseline|sdnn/ },
	resting_hr: { is: /\brhr\b|(rest|klid).*(hr\b|heart|tep|puls)/, not: /goal|cil/ },
	weight_kg: { is: /weight|vaha|hmotnost/, not: /goal|cil|target|\blbs?\b|pound/ },
};

/** „2026-10-05“, „2026/10/05 07:12“, „5. 10. 2026“ → ISO datum; jinak null. Americké 10/05/2026 se nečte – nejde odlišit od 5. 10. */
export function parseDailyDate(text: string): string | null {
	const value = text.trim();
	const ymd = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
	const dmy = value.match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/);
	const parts = ymd ? [ymd[1]!, ymd[2]!, ymd[3]!] : dmy ? [dmy[3]!, dmy[2]!, dmy[1]!] : null;
	if (!parts) return null;
	const iso = `${parts[0]}-${parts[1]!.padStart(2, "0")}-${parts[2]!.padStart(2, "0")}`;
	return isIsoDate(iso) ? iso : null;
}

function number(text: string): number | undefined {
	const value = text.replace(/[\s ]/g, "");
	if (value === "") return undefined;
	// „1,234.5“ i „1.234,5“: poslední oddělovač je desetinný, ostatní tisícové.
	const decimal = Math.max(value.lastIndexOf(","), value.lastIndexOf("."));
	const n = Number(decimal < 0 ? value : `${value.slice(0, decimal).replace(/[.,]/g, "")}.${value.slice(decimal + 1)}`);
	return Number.isFinite(n) ? n : undefined;
}

/**
 * Délka spánku v minutách. Exporty ji píšou různě: „7:45“, „7h 45m“, hodiny (7,75),
 * minuty (465) nebo sekundy (27900) – jednotka se odhadne z velikosti čísla.
 */
export function sleepMinutes(text: string): number | undefined {
	const value = text.trim().toLowerCase();
	const clock = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
	if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
	const words = value.match(/^(\d{1,2})\s*h(?:od)?\D*(\d{1,2})?\s*(?:m|min)?\.?$/);
	if (words) return Number(words[1]) * 60 + Number(words[2] ?? 0);
	const n = number(value);
	if (n === undefined || n <= 0) return undefined;
	return Math.round(n <= 24 ? n * 60 : n > 1440 ? n / 60 : n);
}

function valueOf(field: DailyField, text: string): number | undefined {
	if (field === "steps") {
		// Kroky jsou celé číslo: čárka nebo tečka před trojicí číslic je oddělovač tisíců („12,034“).
		const n = number(text.replace(/[.,](?=\d{3}(?!\d))/g, ""));
		return n !== undefined && n > 0 && n <= MAX_STEPS ? Math.round(n) : undefined;
	}
	const rule = CHECK_IN_NUMBERS[field];
	const n = field === "duration_min" ? sleepMinutes(text) : number(text);
	if (n === undefined || n < rule.min || n > rule.max) return undefined;
	return rule.integer ? Math.round(n) : Math.round(n * 10) / 10;
}

/** Přečte CSV s denními hodnotami. Chyby vrací česky. */
export function parseDailyCsv(text: string): ParsedDaily {
	const [header, ...lines] = parseCsv(text);
	if (!header || lines.length === 0) throw new Error(t("Soubor je prázdný nebo to není CSV."));
	const names = header.map(fold);
	let dateColumn = names.findIndex((name) => /^(date|datum|day|den|cas|time|timestamp)$|date|datum/.test(name));
	if (dateColumn < 0) dateColumn = lines[0]!.findIndex((cell) => parseDailyDate(cell) !== null);
	if (dateColumn < 0) throw new Error(t("V souboru jsem nenašel sloupec s datem."));

	const columns = new Map<DailyField, number>();
	for (const field of DAILY_FIELDS) {
		const index = names.findIndex((name, i) => i !== dateColumn && COLUMNS[field].is.test(name) && !COLUMNS[field].not.test(name));
		if (index >= 0) columns.set(field, index);
	}
	if (columns.size === 0) {
		throw new Error(t("V souboru není sloupec, který umím načíst ({v}). Sloupce v souboru: {v2}.", { v: Object.values(DAILY_FIELD_LABELS).join(", "), v2: header.join(", ") }));
	}

	const byDate = new Map<string, DailyRow>();
	let skippedRows = 0;
	for (const line of lines) {
		const date = parseDailyDate(line[dateColumn] ?? "");
		if (!date) {
			skippedRows++;
			continue;
		}
		const row = byDate.get(date) ?? { date };
		for (const [field, index] of columns) {
			const value = valueOf(field, line[index] ?? "");
			if (value !== undefined) row[field] = value;
		}
		byDate.set(date, row);
	}
	const rows = [...byDate.values()].filter((row) => Object.keys(row).length > 1).sort((a, b) => a.date.localeCompare(b.date));
	return { rows, fields: [...columns.keys()], skippedRows };
}
