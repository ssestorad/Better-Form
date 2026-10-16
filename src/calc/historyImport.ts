// Import historie tréninků z aplikací Strong a Hevy (CSV export, řádek = série).
// Čisté funkce: čtení CSV, rozpoznání formátu a převod na tréninky.
// Formáty podle nápovědy obou aplikací: Strong „Date, Workout Name, Duration,
// Exercise Name, Set Order, Weight, Reps, Distance, Seconds, Notes, Workout Notes, RPE“,
// Hevy „title, start_time, end_time, description, exercise_title, superset_id,
// exercise_notes, set_index, set_type, weight_kg|weight_lbs, reps, distance_…, duration_seconds, rpe“.

import { SCHEMA_VERSION, type ExerciseCategory, type ExerciseMeasure, type SetTag, type Sport } from "../model/constants";
import { isIsoDate } from "../model/dates";
import type { Block, SetEntry, WorkoutNote } from "../model/types";
import { t } from "../i18n";

export type HistoryFormat = "strong" | "hevy";
export type WeightUnit = "kg" | "lb";

export const HISTORY_FORMAT_LABELS: Record<HistoryFormat, string> = { strong: "Strong", hevy: "Hevy" };

/** Jedna libra v kilogramech (přesná definice). */
export const KG_PER_LB = 0.45359237;

// ---------- CSV ----------

/**
 * Přečte CSV s uvozovkami podle RFC 4180 (zdvojená uvozovka uvnitř, čárky a
 * konce řádků v uvozovkách). Oddělovač pozná z hlavičky: středník, jinak čárka.
 */
export function parseCsv(text: string): string[][] {
	const source = text.replace(/^\uFEFF/, "");
	const firstLine = source.slice(0, source.search(/\r?\n|$/));
	const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = "";
	let quoted = false;
	for (let i = 0; i < source.length; i++) {
		const ch = source[i]!;
		if (quoted) {
			if (ch === '"') {
				if (source[i + 1] === '"') {
					cell += '"';
					i++;
				} else quoted = false;
			} else cell += ch;
		} else if (ch === '"') quoted = true;
		else if (ch === delimiter) {
			row.push(cell);
			cell = "";
		} else if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && source[i + 1] === "\n") i++;
			row.push(cell);
			cell = "";
			if (row.some((value) => value.trim() !== "")) rows.push(row);
			row = [];
		} else cell += ch;
	}
	row.push(cell);
	if (row.some((value) => value.trim() !== "")) rows.push(row);
	return rows;
}

// ---------- Řádky → tréninky ----------

export interface ImportedSet {
	exercise: string;
	reps?: number;
	/** Váha už v kilogramech. */
	kg?: number;
	sec?: number;
	warmup?: boolean;
	tag?: SetTag;
	/** RPE série na škále 1–10 (10 = do selhání). */
	rpe?: number;
	/** Skupina supersetu v rámci tréninku (Hevy). */
	supersetId?: string;
}

export interface ImportedWorkout {
	date: string;
	start?: string;
	title?: string;
	durationMin?: number;
	notes?: string;
	sets: ImportedSet[];
}

export interface ParsedHistory {
	format: HistoryFormat;
	workouts: ImportedWorkout[];
	/** Řádky, které nešly použít (bez data, bez cviku, jen vzdálenost…). */
	skippedRows: number;
}

function num(text: string | undefined): number | undefined {
	const value = (text ?? "").trim().replace(",", ".");
	if (value === "") return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

const positive = (value: number | undefined) => (value !== undefined && value > 0 ? value : undefined);

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

/** „2021-07-24 10:37:18“ (Strong) nebo „15 Jul 2026, 09:52“ (Hevy) → datum a čas; null u jiného tvaru. */
export function parseHistoryDate(text: string): { date: string; start: string } | null {
	const value = text.trim();
	const iso = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
	if (iso && isIsoDate(iso[1]!)) return { date: iso[1]!, start: `${iso[2]}:${iso[3]}` };
	const named = value.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? (\d{1,2}):(\d{2})/);
	const month = named ? MONTHS[named[2]!.toLowerCase()] : undefined;
	if (!named || !month) return null;
	const date = `${named[3]}-${month}-${named[1]!.padStart(2, "0")}`;
	return isIsoDate(date) ? { date, start: `${named[4]!.padStart(2, "0")}:${named[5]}` } : null;
}

/** Délka tréninku Strong: „1h 9m“, „45m“, „30s“, případně jen číslo v sekundách → minuty. */
export function parseStrongDuration(text: string): number | undefined {
	const value = text.trim().toLowerCase();
	if (value === "") return undefined;
	if (/^\d+(\.\d+)?$/.test(value)) return positive(Math.round(Number(value) / 60));
	const part = (unit: string) => Number(value.match(new RegExp(`(\\d+)\\s*${unit}`))?.[1] ?? 0);
	const minutes = part("h") * 60 + part("m(?!s)") + part("s") / 60;
	return positive(Math.round(minutes));
}

function minutesBetween(start: { date: string; start: string }, end: { date: string; start: string }): number | undefined {
	const ms = Date.parse(`${end.date}T${end.start}:00Z`) - Date.parse(`${start.date}T${start.start}:00Z`);
	const minutes = Math.round(ms / 60000);
	return minutes > 0 && minutes <= 24 * 60 ? minutes : undefined;
}

/** Přečte export Strong nebo Hevy. `unit` = jednotka váhy pro Strong (v souboru není); Hevy ji má v názvu sloupce. */
export function parseHistoryCsv(text: string, unit: WeightUnit): ParsedHistory {
	const rows = parseCsv(text);
	const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
	const col = (name: string) => header.indexOf(name);
	const isStrong = col("exercise name") >= 0 && col("date") >= 0;
	const isHevy = col("exercise_title") >= 0 && col("start_time") >= 0;
	if (!isStrong && !isHevy) throw new Error(t("The file isn't an export from Strong or Hevy (CSV with the columns “Exercise Name” or “exercise_title”)."));

	const format: HistoryFormat = isStrong ? "strong" : "hevy";
	const hevyUnit: WeightUnit = col("weight_lbs") >= 0 ? "lb" : "kg";
	const toKg = (value: number | undefined, from: WeightUnit) => (value === undefined ? undefined : Math.round(value * (from === "lb" ? KG_PER_LB : 1) * 100) / 100);
	const workouts = new Map<string, ImportedWorkout>();
	let skippedRows = 0;

	for (const row of rows.slice(1)) {
		const get = (name: string) => (col(name) >= 0 ? (row[col(name)] ?? "").trim() : "");
		const when = parseHistoryDate(get(isStrong ? "date" : "start_time"));
		const exercise = get(isStrong ? "exercise name" : "exercise_title");
		if (!when || exercise === "") {
			skippedRows++;
			continue;
		}
		const title = get(isStrong ? "workout name" : "title");
		const key = `${when.date} ${when.start} ${title}`;
		let workout = workouts.get(key);
		if (!workout) {
			workout = { date: when.date, start: when.start, sets: [] };
			if (title) workout.title = title;
			const notes = get(isStrong ? "workout notes" : "description");
			if (notes) workout.notes = notes;
			const end = isHevy ? parseHistoryDate(get("end_time")) : null;
			const duration = isStrong ? parseStrongDuration(get("duration")) : end ? minutesBetween(when, end) : undefined;
			if (duration !== undefined) workout.durationMin = duration;
			workouts.set(key, workout);
		}

		const reps = positive(num(get("reps")));
		const sec = positive(num(get(isStrong ? "seconds" : "duration_seconds")));
		const distance = positive(num(get(isStrong ? "distance" : hevyUnit === "lb" ? "distance_miles" : "distance_km")));
		if (reps === undefined && (sec === undefined || distance !== undefined)) {
			// Kardio se vzdáleností (běh, kolo) nebo prázdná série – do silového deníku nepatří;
			// běhy se nahrávají ze souboru GPX / TCX.
			skippedRows++;
			continue;
		}
		const set: ImportedSet = { exercise };
		if (reps !== undefined) set.reps = Math.round(reps);
		else if (sec !== undefined) set.sec = Math.round(sec);
		const kg = positive(toKg(num(get(isStrong ? "weight" : hevyUnit === "lb" ? "weight_lbs" : "weight_kg")), isStrong ? unit : hevyUnit));
		if (kg !== undefined) set.kg = kg;
		const rpe = num(get("rpe"));
		if (rpe !== undefined && rpe >= 1 && rpe <= 10) set.rpe = rpe;
		const kind = (isStrong ? get("set order") : get("set_type")).toLowerCase();
		if (kind === "w" || kind === "warmup" || kind === "warm up") set.warmup = true;
		else if (kind === "d" || kind === "dropset" || kind === "drop set") set.tag = "drop";
		else if (kind === "f" || kind === "failure") set.tag = "failure";
		const superset = isHevy ? get("superset_id") : "";
		if (superset !== "") set.supersetId = superset;
		workout.sets.push(set);
	}

	const list = [...workouts.values()].filter((w) => w.sets.length > 0).sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
	return { format, workouts: list, skippedRows };
}

// ---------- Tréninky → poznámky ----------

export interface LibraryExercise {
	name: string;
	category: ExerciseCategory;
	measure: ExerciseMeasure;
}

const SPORT_OF: Partial<Record<ExerciseCategory, Sport>> = { strength: "strength", calisthenics: "calisthenics", kettlebell: "kettlebell" };

/**
 * RPE série (škála podle opakování v rezervě) → RIR: RIR = 10 − RPE. Pod RPE 5 se
 * rezerva odhaduje špatně, proto se RIR nezapisuje. Zdroj škály: Helms 2016.
 */
export function rirFromSetRpe(rpe: number | undefined): number | undefined {
	return rpe !== undefined && rpe >= 5 && rpe <= 10 ? Math.round((10 - rpe) * 2) / 2 : undefined;
}

type SetsLikeBlock = Extract<Block, { type: "sets" | "hold" }>;

/** Rozpracovaný blok při skládání tréninku ze sérií. */
interface BlockCursor {
	exercise: string;
	supersetId?: string;
	block: SetsLikeBlock;
}

export interface HistoryNotes {
	notes: WorkoutNote[];
	/** Názvy cviků, které v knihovně nejsou (zůstanou v tréninku pod původním názvem). */
	unknownExercises: string[];
}

/**
 * Převede importované tréninky na poznámky. Série jdoucí po sobě se stejným cvikem
 * tvoří blok; název cviku se sjednotí s knihovnou (i přes alias). U cviků s vlastní
 * vahou se váha bere jako přívažek. RPE celého tréninku tyto aplikace nemají.
 */
export function historyToNotes(workouts: readonly ImportedWorkout[], resolve: (name: string) => LibraryExercise | undefined, schema: number = SCHEMA_VERSION): HistoryNotes {
	const unknown = new Set<string>();
	const notes = workouts.map((workout): WorkoutNote => {
		const blocks: Block[] = [];
		const counts = new Map<Sport, number>();
		const cursor: { current: BlockCursor | null } = { current: null };
		for (const set of workout.sets) {
			const known = resolve(set.exercise);
			if (!known) unknown.add(set.exercise);
			const name = known?.name ?? set.exercise;
			const type = set.reps === undefined ? "hold" : "sets";
			const previous = cursor.current;
			let current = previous;
			if (!current || current.exercise !== name || current.block.type !== type) {
				const block: SetsLikeBlock = { type, exercise: name, sets: [] };
				if (previous && set.supersetId !== undefined && previous.supersetId === set.supersetId) block.superset = true;
				current = { exercise: name, block, ...(set.supersetId !== undefined ? { supersetId: set.supersetId } : {}) };
				cursor.current = current;
				blocks.push(block);
			}
			// Sport tréninku = ten, ke kterému patří nejvíc sérií.
			const sport = (known && SPORT_OF[known.category]) ?? "strength";
			counts.set(sport, (counts.get(sport) ?? 0) + 1);
			const entry: SetEntry = {};
			if (set.reps !== undefined) entry.reps = set.reps;
			else if (set.sec !== undefined) entry.sec = set.sec;
			if (set.kg !== undefined) {
				if (known?.measure === "reps_bw" || known?.measure === "seconds") entry.added_kg = set.kg;
				else entry.kg = set.kg;
			}
			const rir = type === "sets" ? rirFromSetRpe(set.rpe) : undefined;
			if (rir !== undefined) entry.rir = rir;
			if (set.warmup) entry.warmup = true;
			else if (set.tag) entry.tag = set.tag;
			current.block.sets.push(entry);
		}
		const sport = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "strength";
		const note: WorkoutNote = { forma: "workout", schema, date: workout.date, sport, source: "manual", blocks, pain: [] };
		if (workout.start) note.start = workout.start;
		if (workout.title) note.title = workout.title;
		if (workout.durationMin !== undefined) note.duration_min = workout.durationMin;
		if (workout.notes) note.notes = workout.notes;
		return note;
	});
	return { notes, unknownExercises: [...unknown].sort((a, b) => a.localeCompare(b, "cs")) };
}

/** Už je v deníku trénink se stejným dnem a začátkem? (opakovaný import téhož souboru) */
export function isImportedAlready(note: WorkoutNote, existing: readonly Pick<WorkoutNote, "date" | "start">[]): boolean {
	return note.start !== undefined && existing.some((e) => e.date === note.date && e.start === note.start);
}

/** Shrnutí před importem: „Hevy: 212 tréninků od 3. 1. 2023 do 5. 10. 2026, 8 412 sérií.“ */
export function describeHistory(parsed: ParsedHistory, formatDate: (iso: string) => string): string {
	const { workouts } = parsed;
	if (workouts.length === 0) return t("{v}: there's no usable workout in the file.", { v: HISTORY_FORMAT_LABELS[parsed.format] });
	const sets = workouts.reduce((sum, w) => sum + w.sets.length, 0);
	return t("{v}: workouts {workouts_length} ({v2} – {v3}), sets {sets}.", { v: HISTORY_FORMAT_LABELS[parsed.format], workouts_length: workouts.length, v2: formatDate(workouts[0]!.date), v3: formatDate(workouts[workouts.length - 1]!.date), sets });
}

/**
 * Pod jakými názvy cvik v knihovně hledat. Strong a Hevy píšou nářadí do závorky
 * („Bench Press (Barbell)“, „Bench Press (Dumbbell)“) a „Pull Up“ bez spojovníku:
 * zkusí se celý název, „nářadí + cvik“ a u velké činky a vlastní váhy i samotný cvik.
 */
export function exerciseNameCandidates(name: string): string[] {
	const trimmed = name.trim().replace(/\s+/g, " ");
	const out = [trimmed];
	const match = trimmed.match(/^(.*?)\s*\(([^)]+)\)$/);
	if (match) {
		const base = match[1]!.trim();
		const equipment = match[2]!.trim();
		out.push(`${equipment} ${base}`);
		if (/^(barbell|bodyweight|weighted)$/i.test(equipment)) out.push(base);
	}
	const variants = out.flatMap((candidate) => [candidate, candidate.replace(/ (ups?|downs?)$/i, "-$1"), candidate.replace(/-/g, " ")]);
	return [...new Set(variants)];
}
