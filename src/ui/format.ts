// Formátování čísel, dat a délek podle jazyka rozhraní. Angličtina má pevný tvar („Wed 30 Sep“),
// ostatní jazyky se řídí Intl podle svého kódu („st 30. 9.“, desetinná čárka). Bez závislosti na Obsidianu.

import { getLanguage, intlCode, tn } from "../i18n";

const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const intl = (options: Intl.DateTimeFormatOptions, date: Date) => new Intl.DateTimeFormat(intlCode(), options).format(date);

/** Krátké názvy měsíců v jazyce rozhraní (leden = 0). */
export function monthNamesShort(): string[] {
	if (getLanguage() === "en") return MONTHS_EN;
	return Array.from({ length: 12 }, (_, m) => intl({ month: "short" }, new Date(2026, m, 1)));
}

const decimalSeparator = () => new Intl.NumberFormat(intlCode()).formatToParts(1.5).find((p) => p.type === "decimal")?.value ?? ".";

/** 78.4 → "78,4" (česky) / "78.4"; celá čísla bez desetinné části; nejvýš `maxDecimals` míst. */
export function formatNumber(value: number, maxDecimals = 1): string {
	const fixed = value.toFixed(maxDecimals);
	const trimmed = fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
	const text = trimmed === "-0" ? "0" : trimmed;
	return getLanguage() === "en" ? text : text.replace(".", decimalSeparator());
}

/** Jako formatNumber, ale záporná čísla s typografickým minusem: −6 (jen pro zobrazení, ne do polí). */
export function formatSigned(value: number, maxDecimals = 1): string {
	return formatNumber(value, maxDecimals).replace("-", "−");
}

/** 435 → "7 h 15 min", 480 → "8 h", 45 → "45 min". */
export function formatDurationMin(minutes: number): string {
	const total = Math.max(0, Math.round(minutes));
	const h = Math.floor(total / 60);
	const m = total % 60;
	if (h === 0) return `${m} min`;
	return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** 90 → "1 min 30 s", 300 → "5 min", 45 → "45 s". */
export function formatSeconds(seconds: number): string {
	const total = Math.max(0, Math.round(seconds));
	const m = Math.floor(total / 60);
	const s = total % 60;
	if (m === 0) return `${s} s`;
	return s === 0 ? `${m} min` : `${m} min ${s} s`;
}

function parts(iso: string): { y: number; m: number; d: number; date: Date } {
	const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
	return { y, m, d, date: new Date(y, m - 1, d) };
}

/** "2026-09-30" → "Wed 30 Sep" / "st 30. 9." (krátce, např. ke štítku u času). */
export function formatShortDate(iso: string): string {
	const { m, d, date } = parts(iso);
	if (getLanguage() === "en") return `${WEEKDAYS_EN[date.getDay()]!.slice(0, 3)} ${d} ${MONTHS_EN[m - 1]}`;
	return `${intl({ weekday: "short" }, date)} ${intl({ day: "numeric", month: "numeric" }, date)}`;
}

/** "2026-09-30" → "30 Sep" / "30. 9." – den a měsíc bez roku a dne v týdnu. */
export function formatDayMonth(iso: string): string {
	const { m, d, date } = parts(iso);
	return getLanguage() === "en" ? `${d} ${MONTHS_EN[m - 1]}` : intl({ day: "numeric", month: "numeric" }, date);
}

/** Rozsah dat: "12 Oct – 18 Oct 2026" / "12. 10. – 18. 10. 2026". */
export function formatDateRange(from: string, to: string): string {
	return `${formatDayMonth(from)} – ${formatCzechDate(to, false)}`;
}

/** "2026-09-30" → "Wednesday 30 Sep 2026" / "středa 30. 9. 2026" (bez dne v týdnu: "30 Sep 2026"). */
export function formatCzechDate(iso: string, withWeekday = true): string {
	const { y, m, d, date } = parts(iso);
	const en = getLanguage() === "en";
	const text = en ? `${d} ${MONTHS_EN[m - 1]} ${y}` : intl({ day: "numeric", month: "numeric", year: "numeric" }, date);
	if (!withWeekday) return text;
	return `${en ? WEEKDAYS_EN[date.getDay()]! : intl({ weekday: "long" }, date)} ${text}`;
}

/** 1 → "1 den", 3 → "3 dny", 12 → "12 dní". */
export function formatDays(days: number): string {
	return tn(Math.round(days), ["{n} day", "{n} days"]);
}
