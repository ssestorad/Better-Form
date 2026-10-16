// Tělesné míry z check-inu (SPEC 5.2, 5.5): poslední hodnota každé míry a změna
// proti předchozímu měření a proti prvnímu měření. Bez závislosti na Obsidianu.

import { daysBetween } from "../model/dates";
import type { BodyData, DayNote } from "../model/types";
import { translated } from "../i18n";

export type BodyMeasureId = Exclude<keyof BodyData, "weight_kg">;

/** Míry v pořadí, v jakém se zadávají a zobrazují. */
export const BODY_MEASURES: readonly { id: BodyMeasureId; label: string; unit: string }[] = translated([
	{ id: "body_fat_pct", label: "Podíl tuku", unit: "%" },
	{ id: "waist_cm", label: "Pas", unit: "cm" },
	{ id: "hips_cm", label: "Boky", unit: "cm" },
	{ id: "chest_cm", label: "Hrudník", unit: "cm" },
	{ id: "arm_cm", label: "Paže", unit: "cm" },
	{ id: "thigh_cm", label: "Stehno", unit: "cm" },
	{ id: "calf_cm", label: "Lýtko", unit: "cm" },
]);

export interface MeasureRow {
	id: BodyMeasureId;
	label: string;
	unit: string;
	/** Poslední měření. */
	value: number;
	date: string;
	/** Počet měření celkem. */
	count: number;
	/** Změna proti předchozímu měření a kolik dní mezi nimi je; null u prvního měření. */
	previous: { change: number; days: number } | null;
	/** Změna proti úplně prvnímu měření; null, když je jen jedno nebo dvě (pak je to totéž co `previous`). */
	first: { change: number; days: number } | null;
}

/** Řádky jen pro míry, které uživatel aspoň jednou zapsal (do data `today` včetně). */
export function bodyMeasureRows(days: readonly DayNote[], today: string): MeasureRow[] {
	const sorted = days.filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
	const rows: MeasureRow[] = [];
	for (const measure of BODY_MEASURES) {
		const samples = sorted.flatMap((d) => {
			const value = d.body[measure.id];
			return value !== undefined ? [{ date: d.date, value }] : [];
		});
		const last = samples[samples.length - 1];
		if (!last) continue;
		const before = samples[samples.length - 2];
		const first = samples[0]!;
		rows.push({
			...measure,
			value: last.value,
			date: last.date,
			count: samples.length,
			previous: before ? { change: last.value - before.value, days: daysBetween(before.date, last.date) } : null,
			first: samples.length > 2 ? { change: last.value - first.value, days: daysBetween(first.date, last.date) } : null,
		});
	}
	return rows;
}
