// Osobní rekordy (SPEC 9.1): síla, vlastní váha, výdrže, běh a plavání.
// Čisté funkce bez závislosti na Obsidianu.

import type { ExerciseKind, ExerciseMeasure } from "../model/constants";
import type { SetEntry, TestNote, WorkoutNote } from "../model/types";
import { formatNumber, formatSeconds } from "../ui/format";
import { estimateSet1RM } from "./oneRm";
import { formatClockDuration } from "./performance";
import { longestRun, runRecords } from "./running";
import { t } from "../i18n";

export interface RecordExercise {
	/** Jednotný název cviku (stejný pro všechny aliasy). */
	name: string;
	kind: ExerciseKind;
	measure: ExerciseMeasure;
	bodyweight_fraction?: number;
}

export interface RecordContext {
	info(exercise: string): RecordExercise | undefined;
	bodyweightKg?: number;
}

export interface Dated {
	value: number;
	date: string;
}

/** Počty opakování, pro které se sleduje nejtěžší série. */
export const REP_MAX_COUNTS = [1, 3, 5, 8, 10] as const;

export interface ExerciseRecords {
	name: string;
	kind: ExerciseKind;
	measure: ExerciseMeasure;
	/** Počet tréninků, kde se cvik objevil. */
	sessions: number;
	/** Nejvyšší odhad 1RM (jen silové cviky, ne švihové). */
	oneRm?: Dated;
	/** Nejtěžší série s aspoň N opakováními: kg závaží, u vlastní váhy přívažek. */
	repMax: Partial<Record<number, Dated>>;
	/** Nejvíc opakování s vlastní vahou bez dopomoci. */
	maxReps?: Dated;
	/** Nejdelší výdrž v sekundách. */
	longestHold?: Dated;
	/** Švihové cviky: nejtěžší zvon a nejvíc opakování s ním. */
	heaviest?: { kg: number; reps: number; date: string };
	/** Švihové cviky: nejvyšší hustota z EMOM (opakování za minutu). */
	density?: { repsPerMin: number; kg?: number; date: string };
}

function better(current: Dated | undefined, value: number, date: string): Dated | undefined {
	if (!Number.isFinite(value) || value <= 0) return current;
	if (!current || value > current.value || (value === current.value && date < current.date)) return { value, date };
	return current;
}

/**
 * Odhad 1RM pro rekordy a grafy. U cviků s vlastní vahou jen ze sérií
 * s přívažkem (SPEC 8.6) – bez něj by odhad jen kopíroval tělesnou hmotnost.
 */
export function recordOneRm(set: SetEntry, exercise: RecordExercise, bodyweightKg: number | undefined): number | null {
	if (exercise.measure === "reps_bw" && !((set.added_kg ?? 0) > 0)) return null;
	return estimateSet1RM(set, exercise, bodyweightKg);
}

function recordSet(rec: ExerciseRecords, set: SetEntry, exercise: RecordExercise, date: string, bodyweightKg: number | undefined): void {
	if (set.warmup) return;
	if (set.sec !== undefined && set.reps === undefined) rec.longestHold = better(rec.longestHold, set.sec, date);
	if (set.reps === undefined || set.reps <= 0) return;

	const rm = recordOneRm(set, exercise, bodyweightKg);
	if (rm !== null) rec.oneRm = better(rec.oneRm, rm, date);

	const weight = exercise.measure === "reps_kg" ? set.kg : exercise.measure === "reps_bw" ? set.added_kg : undefined;
	if (exercise.kind === "ballistic") {
		if (weight !== undefined && weight > 0) {
			const h = rec.heaviest;
			if (!h || weight > h.kg || (weight === h.kg && set.reps > h.reps)) rec.heaviest = { kg: weight, reps: set.reps, date };
		}
	} else if (weight !== undefined && weight > 0) {
		for (const n of REP_MAX_COUNTS) if (set.reps >= n) rec.repMax[n] = better(rec.repMax[n], weight, date);
	}
	// Opakování s vlastní vahou: guma / dopomoc (záporný přívažek) se nepočítá.
	if (exercise.measure === "reps_bw" && (set.added_kg ?? 0) >= 0) rec.maxReps = better(rec.maxReps, set.reps, date);
}

/** Rekordy po cvicích, seřazené podle počtu tréninků. */
export function exerciseRecords(workouts: readonly WorkoutNote[], tests: readonly TestNote[], ctx: RecordContext): ExerciseRecords[] {
	const byName = new Map<string, ExerciseRecords>();
	const get = (exercise: RecordExercise): ExerciseRecords => {
		let rec = byName.get(exercise.name);
		if (!rec) {
			rec = { name: exercise.name, kind: exercise.kind, measure: exercise.measure, sessions: 0, repMax: {} };
			byName.set(exercise.name, rec);
		}
		return rec;
	};
	for (const workout of workouts) {
		const seen = new Set<string>();
		for (const block of workout.blocks) {
			if (block.type === "amrap" || block.type === "complex") continue;
			const exercise = ctx.info(block.exercise);
			if (!exercise) continue;
			const rec = get(exercise);
			if (!seen.has(exercise.name)) {
				seen.add(exercise.name);
				rec.sessions++;
			}
			if (block.type === "sets" || block.type === "hold") {
				for (const set of block.sets) recordSet(rec, set, exercise, workout.date, ctx.bodyweightKg);
			} else if (block.type === "emom" && exercise.kind === "ballistic" && block.reps_per_min > 0) {
				const d = rec.density;
				if (!d || block.reps_per_min > d.repsPerMin) rec.density = { repsPerMin: block.reps_per_min, kg: block.kg, date: workout.date };
			}
		}
	}
	for (const test of tests) {
		const exercise = ctx.info(test.exercise);
		if (!exercise) continue;
		const rec = get(exercise);
		if (test.test_type === "1rm") rec.oneRm = better(rec.oneRm, test.result, test.date);
		else if (test.test_type === "max_reps") rec.maxReps = better(rec.maxReps, test.result, test.date);
		else if (test.test_type === "max_hold") rec.longestHold = better(rec.longestHold, test.result, test.date);
	}
	return [...byName.values()]
		.filter((r) => r.oneRm || r.maxReps || r.longestHold || r.heaviest || r.density || Object.keys(r.repMax).length > 0)
		.sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name, "cs"));
}

// ---------- Plavání ----------

export interface SwimRecords {
	/** Nejdelší plavání v metrech. */
	longest?: Dated;
	/** Nejrychlejší průměr na 100 m v sekundách (z délky tréninku). */
	fastest100?: Dated;
}

/** Od jaké vzdálenosti se počítá průměr na 100 m. */
export const SWIM_PACE_MIN_M = 100;

export function swimRecords(workouts: readonly WorkoutNote[]): SwimRecords {
	const records: SwimRecords = {};
	for (const workout of workouts) {
		const meters = workout.sport === "swim" ? workout.swim?.distance_m : undefined;
		if (meters === undefined || meters <= 0) continue;
		records.longest = better(records.longest, meters, workout.date);
		if (meters >= SWIM_PACE_MIN_M && workout.duration_min !== undefined && workout.duration_min > 0) {
			const per100 = (workout.duration_min * 60) / (meters / 100);
			const f = records.fastest100;
			if (!f || per100 < f.value) records.fastest100 = { value: per100, date: workout.date };
		}
	}
	return records;
}

// ---------- Jednotný seznam (pro oznámení a měsíční souhrn) ----------

export interface RecordItem {
	key: string;
	/** „Bench press – odhad 1RM 96 kg“. */
	text: string;
	value: number;
	better: "higher" | "lower";
	date: string;
	/** Rekordy se stejnou skupinou a hodnotou se hlásí jednou – ten s nejvyšším `rank`. */
	group?: string;
	rank?: number;
}

const kgText = (kg: number) => `${formatNumber(kg, 1)} kg`;

/** Všechny rekordy jako plochý seznam. */
export function allRecords(workouts: readonly WorkoutNote[], tests: readonly TestNote[], ctx: RecordContext): RecordItem[] {
	const items: RecordItem[] = [];
	for (const rec of exerciseRecords(workouts, tests, ctx)) {
		if (rec.oneRm) {
			items.push({ key: `${rec.name}|1rm`, text: t("{rec_name} – odhad 1RM {v}", { rec_name: rec.name, v: kgText(rec.oneRm.value) }), value: rec.oneRm.value, better: "higher", date: rec.oneRm.date });
		}
		for (const n of REP_MAX_COUNTS) {
			const r = rec.repMax[n];
			if (!r) continue;
			const weight = rec.measure === "reps_bw" ? t("přívažkem {v}", { v: kgText(r.value) }) : kgText(r.value);
			items.push({
				key: `${rec.name}|rep${n}`,
				text: t("{rec_name} – {n} opak. s {weight}", { rec_name: rec.name, n, weight }),
				value: r.value,
				better: "higher",
				date: r.date,
				group: `${rec.name}|rep`,
				rank: n,
			});
		}
		if (rec.maxReps) {
			items.push({ key: `${rec.name}|reps`, text: t("{rec_name} – {maxReps_value} opakování", { rec_name: rec.name, maxReps_value: rec.maxReps.value }), value: rec.maxReps.value, better: "higher", date: rec.maxReps.date });
		}
		if (rec.longestHold) {
			items.push({ key: `${rec.name}|hold`, text: t("{rec_name} – výdrž {v}", { rec_name: rec.name, v: formatSeconds(rec.longestHold.value) }), value: rec.longestHold.value, better: "higher", date: rec.longestHold.date });
		}
		if (rec.heaviest) {
			items.push({ key: `${rec.name}|heaviest`, text: `${rec.name} – ${kgText(rec.heaviest.kg)} × ${rec.heaviest.reps}`, value: rec.heaviest.kg * 1000 + rec.heaviest.reps, better: "higher", date: rec.heaviest.date });
		}
	}
	for (const run of runRecords(workouts)) {
		items.push({ key: `run|${run.distance.key}`, text: t("Běh {distance_label} – {v}", { distance_label: run.distance.label, v: formatClockDuration(run.seconds) }), value: run.seconds, better: "lower", date: run.date });
	}
	const longest = longestRun(workouts);
	if (longest) items.push({ key: "run|longest", text: t("Nejdelší běh – {v} km", { v: formatNumber(longest.km, 2) }), value: longest.km, better: "higher", date: longest.date });
	const swim = swimRecords(workouts);
	if (swim.longest) {
		items.push({ key: "swim|longest", text: t("Nejdelší plavání – {v} m", { v: formatNumber(swim.longest.value, 0) }), value: swim.longest.value, better: "higher", date: swim.longest.date });
	}
	if (swim.fastest100) {
		items.push({ key: "swim|100", text: t("Plavání – průměr {v} na 100 m", { v: formatClockDuration(swim.fastest100.value) }), value: swim.fastest100.value, better: "lower", date: swim.fastest100.date });
	}
	return items;
}

/**
 * Rekordy, které se oproti `before` zlepšily. První výkon ve cviku rekordem
 * není (nebylo co překonat). Z nejtěžších sérií se stejnou vahou zůstane jen
 * ta s nejvíc opakováními.
 */
export function newRecords(before: readonly RecordItem[], after: readonly RecordItem[]): RecordItem[] {
	const previous = new Map(before.map((r) => [r.key, r]));
	const improved = after.filter((item) => {
		const old = previous.get(item.key);
		if (!old) return false;
		return item.better === "higher" ? item.value > old.value : item.value < old.value;
	});
	const bestInGroup = new Map<string, RecordItem>();
	for (const item of improved) {
		if (!item.group) continue;
		const key = `${item.group}|${item.value}`;
		const current = bestInGroup.get(key);
		if (!current || (item.rank ?? 0) > (current.rank ?? 0)) bestInGroup.set(key, item);
	}
	return improved.filter((item) => !item.group || bestInGroup.get(`${item.group}|${item.value}`) === item);
}

// ---------- Vývoj výkonů cviku ----------

export interface SessionBest {
	date: string;
	/** Nejvyšší odhad 1RM dne. */
	oneRm?: number;
	/** Nejvíc opakování v sérii bez dopomoci. */
	reps?: number;
	/** Nejdelší výdrž. */
	sec?: number;
}

/** Nejlepší výkony po dnech pro každý cvik (od nejstaršího) – pro grafy, cíle a stagnaci. */
export function exerciseSeries(workouts: readonly WorkoutNote[], ctx: RecordContext): Map<string, SessionBest[]> {
	const byExercise = new Map<string, Map<string, SessionBest>>();
	for (const workout of workouts) {
		for (const block of workout.blocks) {
			if (block.type !== "sets" && block.type !== "hold") continue;
			const exercise = ctx.info(block.exercise);
			if (!exercise) continue;
			const days = byExercise.get(exercise.name) ?? new Map<string, SessionBest>();
			byExercise.set(exercise.name, days);
			const day = days.get(workout.date) ?? { date: workout.date };
			days.set(workout.date, day);
			for (const set of block.sets) {
				if (set.warmup) continue;
				const rm = recordOneRm(set, exercise, ctx.bodyweightKg);
				if (rm !== null && rm > (day.oneRm ?? 0)) day.oneRm = rm;
				if (set.reps !== undefined && (set.added_kg ?? 0) >= 0 && set.reps > (day.reps ?? 0)) day.reps = set.reps;
				if (set.sec !== undefined && set.reps === undefined && set.sec > (day.sec ?? 0)) day.sec = set.sec;
			}
		}
	}
	const out = new Map<string, SessionBest[]>();
	for (const [name, days] of byExercise) out.set(name, [...days.values()].sort((a, b) => a.date.localeCompare(b.date)));
	return out;
}
