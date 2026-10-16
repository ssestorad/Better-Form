// Export do CSV (SPEC 5.12): tréninky, jednotlivé série a denní data. Formát pro
// český Excel – oddělovač středník, desetinná čárka, UTF-8 s BOM. Bez závislosti na Obsidianu.

import { sessionLoad } from "../calc/load";
import { SET_TAG_LABELS, SPORT_LABELS } from "../model/constants";
import { parseLink } from "../model/links";
import type { Block, DayNote, WorkoutNote } from "../model/types";
import { RUN_TYPE_LABELS, SWIM_STYLE_LABELS } from "./workoutBlock";
import { t, translated } from "../i18n";

export type CsvValue = string | number | boolean | null | undefined;

const SEPARATOR = ";";
const BOM = "﻿";

/** Jedna buňka: čísla s desetinnou čárkou, text v uvozovkách, když obsahuje oddělovač, uvozovky nebo konec řádku. */
export function csvCell(value: CsvValue): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "boolean") return value ? t("ano") : "";
	if (typeof value === "number") {
		if (!Number.isFinite(value)) return "";
		// Bez exponentu a bez zbytečných nul: 78.4 → „78,4“, 0.1 + 0.2 → „0,3“.
		return String(Math.round(value * 1e6) / 1e6).replace(".", ",");
	}
	const text = value;
	if (/[;"\r\n]/.test(text) || text !== text.trim()) return `"${text.replace(/"/g, '""')}"`;
	return text;
}

export function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
	const lines = [header.map(csvCell).join(SEPARATOR), ...rows.map((row) => row.map(csvCell).join(SEPARATOR))];
	return `${BOM}${lines.join("\r\n")}\r\n`;
}

const byDate = <T extends { date: string; start?: string }>(a: T, b: T) =>
	a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? "");

const link = (target: string | undefined) => (target ? parseLink(target) : undefined);

/** Tréninky – jeden řádek na trénink. `tonnage` = objem posilovny v kg (volitelně). */
export function workoutsCsv(workouts: readonly WorkoutNote[], tonnage?: (w: WorkoutNote) => number): string {
	const header = [
		t("datum"),
		t("začátek"),
		"sport",
		t("název"),
		t("délka (min)"),
		"RPE",
		t("zátěž (sRPE)"),
		t("objem (kg)"),
		t("vzdálenost (km)"),
		t("čas v pohybu (s)"),
		t("průměrný tep"),
		t("maximální tep"),
		t("převýšení (m)"),
		t("typ běhu"),
		t("boty"),
		t("plavání (m)"),
		t("styl"),
		t("přeskoky"),
		"program",
		t("šablona"),
		t("zdroj"),
		"Strava ID",
		t("poznámka"),
	];
	const rows = [...workouts].sort(byDate).map((w) => {
		const volume = tonnage?.(w);
		return [
			w.date,
			w.start,
			SPORT_LABELS[w.sport],
			w.title,
			w.duration_min,
			w.rpe,
			sessionLoad(w.rpe, w.duration_min),
			volume !== undefined && volume > 0 ? Math.round(volume) : undefined,
			w.run?.distance_km,
			w.run?.moving_time_s,
			w.run?.avg_hr,
			w.run?.max_hr,
			w.run?.elevation_m,
			w.run?.type ? RUN_TYPE_LABELS[w.run.type] : undefined,
			link(w.run?.shoes),
			w.swim?.distance_m,
			w.swim?.style ? SWIM_STYLE_LABELS[w.swim.style] : undefined,
			w.rope?.jumps,
			link(w.program),
			link(w.template),
			w.source === "strava" ? "Strava" : w.source === "file" ? t("soubor") : t("ručně"),
			w.strava_id,
			w.notes,
		];
	});
	return toCsv(header, rows);
}

const BLOCK_LABELS: Record<Block["type"], string> = translated({
	sets: "série",
	hold: "výdrž",
	emom: "EMOM",
	amrap: "AMRAP",
	ladder: "žebřík",
	complex: "komplex",
	timed: "na čas",
});

interface SetRow {
	exercise: string;
	reps?: number;
	kg?: number;
	added_kg?: number;
	sec?: number;
	rir?: number;
	warmup?: boolean;
	note?: string;
}

/** Řádky jednoho bloku: série po sériích, příčky žebříku, položky komplexu. */
function blockRows(block: Block): SetRow[] {
	switch (block.type) {
		case "sets":
		case "hold":
			// Označení série a superset jdou do poznámky řádku, aby se neměnily sloupce exportu.
			return block.sets.map((s) => {
				const marks = [s.tag && !s.warmup ? SET_TAG_LABELS[s.tag] : null, block.superset ? t("superset s předchozím cvikem") : null].filter((m): m is string => m !== null);
				return { exercise: block.exercise, reps: s.reps, kg: s.kg, added_kg: s.added_kg, sec: s.sec, rir: s.rir, warmup: s.warmup, ...(marks.length > 0 ? { note: marks.join(", ") } : {}) };
			});
		case "emom":
			return [
				{
					exercise: block.exercise,
					reps: block.reps_per_min * (block.rounds ?? block.minutes),
					kg: block.kg,
					added_kg: block.added_kg,
					sec: (block.rounds ?? block.minutes) * 60,
					note: t("{minutes} min × {reps_per_min} opak.{v}", { minutes: block.minutes, reps_per_min: block.reps_per_min, v: block.rounds !== undefined ? t(", odjeto {rounds} kol", { rounds: block.rounds }) : "" }),
				},
			];
		case "amrap":
			return block.items.map((item) => ({
				...item,
				note: t("{minutes} min, {rounds} kol{v}; opakování za kolo", { minutes: block.minutes, rounds: block.rounds, v: block.extra_reps ? t(" + {extra_reps} opak.", { extra_reps: block.extra_reps }) : "" }),
			}));
		case "ladder":
			return block.steps.map((reps) => ({ exercise: block.exercise, reps, kg: block.kg, added_kg: block.added_kg }));
		case "complex":
			return block.items.map((item) => ({ ...item, kg: item.kg ?? block.kg, note: t("{rounds} kol; opakování za kolo", { rounds: block.rounds }) }));
		case "timed":
			return [{ exercise: block.exercise, reps: block.reps, kg: block.kg, added_kg: block.added_kg, sec: block.sec }];
	}
}

/** Jednotlivé série všech tréninků s bloky. */
export function setsCsv(workouts: readonly WorkoutNote[]): string {
	const header = [t("datum"), t("trénink"), t("blok"), t("pořadí bloku"), t("cvik"), t("série"), t("opakování"), "kg", t("přívažek (kg)"), t("sekundy"), "RIR", t("rozcvička"), t("poznámka")];
	const rows: CsvValue[][] = [];
	for (const w of [...workouts].sort(byDate)) {
		const title = w.title ? `${SPORT_LABELS[w.sport]} – ${w.title}` : SPORT_LABELS[w.sport];
		w.blocks.forEach((block, bi) => {
			blockRows(block).forEach((row, si) => {
				rows.push([w.date, title, BLOCK_LABELS[block.type], bi + 1, parseLink(row.exercise), si + 1, row.reps, row.kg, row.added_kg, row.sec, row.rir, row.warmup, row.note]);
			});
		});
	}
	return toCsv(header, rows);
}

/** Denní data – spánek, check-in, HRV, hmotnost, suplementy. */
export function daysCsv(days: readonly DayNote[], sleepMinutes: (day: DayNote) => number | null): string {
	const header = [
		t("datum"),
		t("šel spát"),
		"usnul",
		"vstal",
		t("spánek (min)"),
		t("kvalita spánku"),
		t("probuzení"),
		t("pocit ráno"),
		t("únava"),
		t("bolest svalů"),
		t("nálada"),
		t("stres"),
		"rMSSD (ms)",
		t("klidový tep"),
		t("skóre Elonga"),
		t("hmotnost (kg)"),
		"tuk (%)",
		t("pas (cm)"),
		t("boky (cm)"),
		t("hrudník (cm)"),
		t("paže (cm)"),
		t("stehno (cm)"),
		t("lýtko (cm)"),
		t("kroky"),
		t("suplementy"),
		t("poznámka"),
	];
	const rows = [...days]
		.sort((a, b) => a.date.localeCompare(b.date))
		.map((d) => [
			d.date,
			d.sleep.bedtime,
			d.sleep.sleep_onset,
			d.sleep.wake,
			d.sleep.duration_min ?? sleepMinutes(d) ?? undefined,
			d.sleep.quality,
			d.sleep.awakenings,
			d.sleep.morning_feeling,
			d.check_in.fatigue,
			d.check_in.soreness,
			d.check_in.mood,
			d.check_in.stress,
			d.hrv.rmssd_ms,
			d.hrv.resting_hr,
			d.hrv.elonga_readiness,
			d.body.weight_kg,
			d.body.body_fat_pct,
			d.body.waist_cm,
			d.body.hips_cm,
			d.body.chest_cm,
			d.body.arm_cm,
			d.body.thigh_cm,
			d.body.calf_cm,
			d.steps,
			d.supplements?.join(", "),
			d.notes,
		]);
	return toCsv(header, rows);
}
