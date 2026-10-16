// Ranní check-in (SPEC 5.2): hodnoty formuláře, validace, zápis do frontmatteru
// denní poznámky a nápověda z minula. Bez závislosti na Obsidianu.

import { SCHEMA_VERSION } from "../model/constants";
import { addDays, isIsoDate, minutesOfDay } from "../model/dates";
import type { DayNote } from "../model/types";
import { minutesBetween, sleepDurationMin } from "./sleep";
import { t } from "../i18n";

type Group = "sleep" | "check_in" | "hrv" | "body";

interface NumberRule {
	group: Group;
	min: number;
	max: number;
	integer: boolean;
}

/** Číselná pole check-inu a jejich povolené rozsahy. */
export const CHECK_IN_NUMBERS = {
	duration_min: { group: "sleep", min: 1, max: 1200, integer: true },
	quality: { group: "sleep", min: 1, max: 5, integer: true },
	awakenings: { group: "sleep", min: 0, max: 30, integer: true },
	morning_feeling: { group: "sleep", min: 1, max: 5, integer: true },
	fatigue: { group: "check_in", min: 1, max: 5, integer: true },
	soreness: { group: "check_in", min: 1, max: 5, integer: true },
	mood: { group: "check_in", min: 1, max: 5, integer: true },
	stress: { group: "check_in", min: 1, max: 5, integer: true },
	rmssd_ms: { group: "hrv", min: 5, max: 300, integer: false },
	resting_hr: { group: "hrv", min: 25, max: 150, integer: true },
	elonga_readiness: { group: "hrv", min: 0, max: 100, integer: false },
	weight_kg: { group: "body", min: 30, max: 250, integer: false },
	body_fat_pct: { group: "body", min: 3, max: 60, integer: false },
	waist_cm: { group: "body", min: 40, max: 200, integer: false },
	hips_cm: { group: "body", min: 50, max: 200, integer: false },
	chest_cm: { group: "body", min: 50, max: 200, integer: false },
	arm_cm: { group: "body", min: 15, max: 70, integer: false },
	thigh_cm: { group: "body", min: 25, max: 110, integer: false },
	calf_cm: { group: "body", min: 20, max: 70, integer: false },
} as const satisfies Record<string, NumberRule>;

export const CHECK_IN_TIMES = ["bedtime", "sleep_onset", "wake"] as const;

export type CheckInNumberField = keyof typeof CHECK_IN_NUMBERS;
export type CheckInTimeField = (typeof CHECK_IN_TIMES)[number];

/**
 * Hodnoty formuláře. `duration_min` je jen ruční přepsání délky spánku –
 * když chybí, délka se dopočítá z časů (viz finalizeCheckIn).
 * NaN v čísle = uživatel napsal něco, co není číslo.
 */
export type CheckInValues = { date: string } & Partial<Record<CheckInNumberField, number>> &
	Partial<Record<CheckInTimeField, string>>;

export type CheckInHints = Partial<Record<CheckInNumberField, number> & Record<CheckInTimeField, string>>;

const NUMBER_FIELDS = Object.keys(CHECK_IN_NUMBERS) as CheckInNumberField[];

/**
 * Ke kterému dni čas spánku patří. Check-in dne D popisuje noc z D−1 na D:
 * vstávání je ráno dne D; ulehnutí a usnutí od 12:00 patří k večeru D−1,
 * před polednem (po půlnoci) ke dni D.
 */
export function sleepTimeDate(date: string, field: CheckInTimeField, time: string): string {
	if (field === "wake") return date;
	const minutes = minutesOfDay(time);
	return minutes !== null && minutes >= 12 * 60 ? addDays(date, -1) : date;
}

export type CheckInErrors = Partial<Record<CheckInNumberField | "date" | "sleep_onset", string>>;

/** Chyby podle pole; prázdný objekt = vše v pořádku. */
export function validateCheckIn(values: CheckInValues): CheckInErrors {
	const errors: CheckInErrors = {};
	if (!isIsoDate(values.date)) errors.date = t("Invalid date.");
	// Usnutí musí být mezi ulehnutím a vstáváním (časy mohou přecházet přes půlnoc).
	if (values.bedtime && values.sleep_onset && values.wake) {
		const latency = minutesBetween(values.bedtime, values.sleep_onset);
		const inBed = minutesBetween(values.bedtime, values.wake);
		if (latency !== null && inBed !== null && latency >= inBed) {
			errors.sleep_onset = t("Falling asleep must be between going to bed and waking up.");
		}
	}
	for (const field of NUMBER_FIELDS) {
		const value = values[field];
		if (value === undefined) continue;
		const rule: NumberRule = CHECK_IN_NUMBERS[field];
		if (Number.isNaN(value)) errors[field] = t("Not a number.");
		else if (rule.integer && !Number.isInteger(value)) errors[field] = t("Enter a whole number.");
		else if (value < rule.min || value > rule.max) errors[field] = t("Range {min}–{max}.", { min: rule.min, max: rule.max });
	}
	return errors;
}

/** Hodnoty k uložení: délka spánku = ruční přepsání, jinak dopočet z časů. */
export function finalizeCheckIn(values: CheckInValues): CheckInValues {
	const duration = values.duration_min ?? sleepDurationMin(values) ?? undefined;
	const result: CheckInValues = { ...values };
	if (duration === undefined) delete result.duration_min;
	else result.duration_min = duration;
	return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function groupOf(field: CheckInNumberField | CheckInTimeField): Group {
	return (CHECK_IN_TIMES as readonly string[]).includes(field)
		? "sleep"
		: CHECK_IN_NUMBERS[field as CheckInNumberField].group;
}

/**
 * Zapíše check-in do frontmatteru denní poznámky (mění předaný objekt, jak to
 * vyžaduje processFrontMatter). Mění jen pole check-inu; ostatní klíče – i cizí
 * klíče uvnitř sekcí – zůstanou. Prázdné pole klíč odstraní, prázdná sekce zmizí.
 */
export function applyCheckIn(frontmatter: Record<string, unknown>, values: CheckInValues): void {
	if (frontmatter.forma === undefined) frontmatter.forma = "day";
	if (frontmatter.schema === undefined) frontmatter.schema = SCHEMA_VERSION;
	if (frontmatter.date === undefined) frontmatter.date = values.date;

	const fields: (CheckInNumberField | CheckInTimeField)[] = [...CHECK_IN_TIMES, ...NUMBER_FIELDS];
	for (const field of fields) {
		const group = groupOf(field);
		const stored: unknown = frontmatter[group];
		const section: Record<string, unknown> = isRecord(stored) ? { ...stored } : {};
		const value = values[field];
		if (value === undefined || (typeof value === "number" && Number.isNaN(value))) delete section[field];
		else section[field] = value;
		if (Object.keys(section).length > 0) frontmatter[group] = section;
		else delete frontmatter[group];
	}
}

/** Vyplnil už uživatel pro tento den check-in (cokoli ze spánku, pocitů, HRV, váhy)? */
export function hasCheckIn(day: DayNote | undefined): boolean {
	if (!day) return false;
	return [day.sleep, day.check_in, day.hrv, day.body].some((section) => Object.keys(section).length > 0);
}

/** Hodnoty z existující denní poznámky (pro úpravu check-inu). */
export function checkInFromDay(day: DayNote): CheckInValues {
	const values: CheckInValues = { date: day.date, ...day.sleep, ...day.check_in, ...day.hrv, ...day.body };
	// Délka rovná dopočtu z časů není ruční přepsání.
	if (values.duration_min !== undefined && values.duration_min === sleepDurationMin(values)) {
		delete values.duration_min;
	}
	return values;
}

/** Poslední známá hodnota každého pole ze dnů před `beforeDate` (nápověda „minule …“). */
export function lastValues(days: DayNote[], beforeDate: string): CheckInHints {
	const hints: CheckInHints = {};
	const sorted = days.filter((d) => d.date < beforeDate).sort((a, b) => b.date.localeCompare(a.date));
	for (const day of sorted) {
		const values = { ...day.sleep, ...day.check_in, ...day.hrv, ...day.body };
		for (const [key, value] of Object.entries(values)) {
			if (value !== undefined && !(key in hints)) (hints as Record<string, unknown>)[key] = value;
		}
	}
	return hints;
}

/**
 * Výchozí hodnoty formuláře: existující check-in dne, jinak prázdný formulář
 * s časy spánku předvyplněnými z minula (škály a HRV zůstávají prázdné).
 */
export function initialCheckIn(date: string, existing: DayNote | undefined, history: DayNote[]): CheckInValues {
	if (existing && hasCheckIn(existing)) return checkInFromDay(existing);
	const hints = lastValues(history, date);
	const values: CheckInValues = { date };
	for (const field of CHECK_IN_TIMES) {
		const value = hints[field];
		if (value !== undefined) values[field] = value;
	}
	return values;
}
