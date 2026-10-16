// Formátování čísel, dat a délek podle jazyka rozhraní (desetinná čárka / tečka). Bez závislosti na Obsidianu.

import { getLanguage, tn } from "../i18n";

const WEEKDAY_NAMES = {
	cs: ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"], // i18n-ignore: české názvy dnů
	en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 78.4 → "78,4" (česky) / "78.4"; celá čísla bez desetinné části; nejvýš `maxDecimals` míst. */
export function formatNumber(value: number, maxDecimals = 1): string {
	const fixed = value.toFixed(maxDecimals);
	const trimmed = fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
	const text = trimmed === "-0" ? "0" : trimmed;
	return getLanguage() === "cs" ? text.replace(".", ",") : text;
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

function parts(iso: string): { y: number; m: number; d: number; weekday: string } {
	const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
	return { y, m, d, weekday: WEEKDAY_NAMES[getLanguage()][new Date(y, m - 1, d).getDay()]! };
}

/** "2026-09-30" → "st 30. 9." / "We 30 Sep" (krátce, např. ke štítku u času). */
export function formatShortDate(iso: string): string {
	const { m, d, weekday } = parts(iso);
	return getLanguage() === "cs" ? `${weekday.slice(0, 2)} ${d}. ${m}.` : `${weekday.slice(0, 3)} ${d} ${MONTHS_EN[m - 1]}`;
}

/** "2026-09-30" → "středa 30. 9. 2026" / "Wednesday 30 Sep 2026" (bez dne v týdnu: "30. 9. 2026"). */
export function formatCzechDate(iso: string, withWeekday = true): string {
	const { y, m, d, weekday } = parts(iso);
	const text = getLanguage() === "cs" ? `${d}. ${m}. ${y}` : `${d} ${MONTHS_EN[m - 1]} ${y}`;
	return withWeekday ? `${weekday} ${text}` : text;
}

/** 1 → "1 den", 3 → "3 dny", 12 → "12 dní". */
export function formatDays(days: number): string {
	return tn(Math.round(days), ["{n} den", "{n} dny", "{n} dní"]);
}
