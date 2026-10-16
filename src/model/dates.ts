// Datumy se v poznámkách ukládají jako YYYY-MM-DD v místním čase.

import type { Weekday } from "./constants";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK_TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function isIsoDate(value: string): boolean {
	const match = value.match(ISO_DATE);
	if (!match) return false;
	const [, y, m, d] = match.map(Number) as [number, number, number, number];
	const date = new Date(y, m - 1, d);
	return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Místní datum ve tvaru YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function utcDay(iso: string): number {
	// Volá se statisíckrát při každém přepočtu, proto bez pomocných polí; datum je vždy RRRR-MM-DD.
	return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

/** Posun data o n dní (počítá se v UTC, takže změna času nevadí). */
export function addDays(iso: string, days: number): string {
	const date = new Date(utcDay(iso) + days * 86_400_000);
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** Počet dní z `from` do `to` (kladný, když je `to` později). */
export function daysBetween(from: string, to: string): number {
	return Math.round((utcDay(to) - utcDay(from)) / 86_400_000);
}

const WEEKDAY_BY_JS_DAY: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function weekdayOf(iso: string): Weekday {
	return WEEKDAY_BY_JS_DAY[new Date(utcDay(iso)).getUTCDay()]!;
}

/** Pondělí týdne, do kterého datum patří. */
export function startOfWeek(iso: string): string {
	const index = (new Date(utcDay(iso)).getUTCDay() + 6) % 7; // po = 0 … ne = 6
	return addDays(iso, -index);
}

/** "HH:MM" → minuty od půlnoci; neplatný čas vrátí null. */
export function minutesOfDay(time: string): number | null {
	const normalized = normalizeClockTime(time);
	if (!normalized) return null;
	const [h, m] = normalized.split(":").map(Number) as [number, number];
	return h * 60 + m;
}

/** Normalizuje čas na HH:MM; neplatný vstup vrátí null. */
export function normalizeClockTime(value: string): string | null {
	const match = value.trim().match(CLOCK_TIME);
	if (!match) return null;
	return `${match[1]!.padStart(2, "0")}:${match[2]}`;
}
