// Svalový objem a regenerace partií (SPEC 8.5, karta Tělo 5.5).
// Čisté funkce bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import { MUSCLES, type ExerciseKind, type ExerciseMeasure, type MuscleId } from "../model/constants";
import { addDays } from "../model/dates";
import type { Block, SetEntry, WorkoutNote } from "../model/types";
import { best1RM, estimateSet1RM, setLoadKg } from "./oneRm";

/** Doporučený rozsah 10–20 sérií týdně na partii (Schoenfeld 2017). */
export const VOLUME_BASIS: Basis = { sourceIds: ["schoenfeld2017"], evidence: "research" };
/** Pásma regenerace 24 / 48 / 72 h jsou orientační zvyklost. */
export const RECOVERY_BASIS: Basis = { sourceIds: ["practice"], evidence: "practice" };

/** Co výpočet potřebuje vědět o cviku z knihovny. */
export interface VolumeExercise {
	/** Jednotný název cviku (stejný pro všechny aliasy). */
	name: string;
	kind: ExerciseKind;
	measure: ExerciseMeasure;
	muscles: { primary: MuscleId[]; secondary: MuscleId[] };
	bodyweight_fraction?: number;
}

export interface VolumeOptions {
	/** Série s RIR nejvýš tolik je efektivní (výchozí 4). */
	rirMax: number;
	/** Bez RIR: u posilovny stačí tolik % odhadu 1RM (výchozí 60). */
	minPct1rm: number;
	/** Výdrž je efektivní od tolika % osobního maxima (výchozí 70). */
	holdPctOfMax: number;
	/** EMOM / AMRAP / komplex se počítají od tohoto RPE (výchozí 7). */
	blockMinRpe: number;
}

export interface VolumeContext {
	info(exercise: string): VolumeExercise | undefined;
	options: VolumeOptions;
	bodyweightKg?: number;
	/** Testy maxima opakování (bez přívažku) – podle nich se posuzují série s vlastní vahou bez RIR. */
	maxTests?: readonly { date: string; exercise: string; reps: number }[];
}

/** Podíl série připsaný vedlejší partii. */
export const SECONDARY_SHARE = 0.5;

export interface WorkoutVolume {
	date: string;
	/** Čas tréninku v ms (místní čas; bez `start` poledne). */
	at: number;
	/** Efektivní série po partiích (hlavní 1, vedlejší 0,5). */
	muscles: Partial<Record<MuscleId, number>>;
	/** Pracovní série, které se nezapočítaly, protože chybí RIR (a nejde je posoudit jinak). */
	uncounted: number;
	/** Série s vlastní vahou posouzené jen podle nejdelší zapsané série – skutečné maximum plugin nezná. */
	assumed: number;
}

/** Dosavadní maxima cviku – roste s každým zpracovaným tréninkem. */
interface Bests {
	oneRm: Map<string, number>;
	holdSec: Map<string, number>;
	/** Maximum opakování cviku s vlastní vahou: cvik → přívažek v kg → opakování. */
	maxReps: Map<string, Map<number, MaxReps>>;
}

interface MaxReps {
	reps: number;
	/** Doložené testem maxima, sérií se zapsaným RIR nebo do selhání; jinak jen nejdelší zapsaná série. */
	known: boolean;
}

/**
 * Maximum opakování při daném přívažku: nejvíc z toho, co je zapsané se stejným
 * nebo větším přívažkem (kdo udělá 8 shybů s 10 kg, udělá jich aspoň 8 i bez zátěže).
 */
function maxRepsAt(bests: Bests, name: string, addedKg: number): MaxReps | undefined {
	let max: MaxReps | undefined;
	for (const [kg, entry] of bests.maxReps.get(name) ?? []) {
		if (kg < addedKg - 1e-9) continue;
		if (max === undefined || entry.reps > max.reps || (entry.reps === max.reps && entry.known)) max = entry;
	}
	return max;
}

function raiseMaxReps(bests: Bests, name: string, addedKg: number, reps: number, known: boolean): void {
	const byLoad = bests.maxReps.get(name) ?? new Map<number, MaxReps>();
	const current = byLoad.get(addedKg);
	if (!current || reps > current.reps || (reps === current.reps && known)) byLoad.set(addedKg, { reps, known });
	bests.maxReps.set(name, byLoad);
}

function workoutTime(workout: WorkoutNote): number {
	const [y, m, d] = workout.date.split("-").map(Number) as [number, number, number];
	const [h, min] = (workout.start ?? "12:00").split(":").map(Number) as [number, number];
	return new Date(y, m - 1, d, h, min).getTime();
}

function working(sets: readonly SetEntry[]): SetEntry[] {
	return sets.filter((s) => !s.warmup);
}

/** Zapíše do maxim výkony z tréninku (před vyhodnocením – série se poměřuje i sama se sebou). */
function updateBests(workout: WorkoutNote, ctx: VolumeContext, bests: Bests): void {
	for (const block of workout.blocks) {
		if (block.type !== "sets" && block.type !== "hold") continue;
		const exercise = ctx.info(block.exercise);
		if (!exercise) continue;
		const sets = working(block.sets);
		const rm = best1RM(sets, exercise, ctx.bodyweightKg);
		if (rm !== null && rm > (bests.oneRm.get(exercise.name) ?? 0)) bests.oneRm.set(exercise.name, rm);
		for (const set of sets) {
			if (set.sec !== undefined && set.sec > (bests.holdSec.get(exercise.name) ?? 0)) bests.holdSec.set(exercise.name, set.sec);
		}
		if (exercise.measure !== "reps_bw") continue;
		// Maximum opakování dokládá série se zapsaným RIR (opakování + rezerva) nebo série do selhání.
		// Série bez RIR říká jen „aspoň tolik“ – dokud není nic lepšího, bere se za maximum nejdelší z nich.
		for (const set of sets) {
			if (set.reps === undefined || set.reps <= 0) continue;
			const rir = set.rir ?? (set.tag === "failure" ? 0 : undefined);
			raiseMaxReps(bests, exercise.name, set.added_kg ?? 0, set.reps + (rir ?? 0), rir !== undefined);
		}
	}
}

interface SetCredit {
	/** Kolik efektivních sérií série dá: 1, 0, nebo část; null = chybí RIR a nejde ji posoudit jinak. */
	sets: number | null;
	/** Posouzeno proti nejdelší zapsané sérii, ne proti doloženému maximu. */
	assumed: boolean;
}

/**
 * Kolik efektivních sérií dá jedna série bloku `sets`.
 *
 * Cviky s vlastní vahou (praxe): bez RIR se rezerva odhadne jako maximum opakování minus
 * odcvičená opakování. Série dál od maxima, než je práh RIR, se nezahodí – počítá se
 * poměrem opakování k maximu, takže deset sérií po deseti klicích při maximu 30 dá
 * 3,3 série. Jinak by se submaximální programy (denní počítadlo, časté série) v objemu
 * vůbec neprojevily.
 *
 * ponytail: bez testu maxima a bez jediného RIR se za maximum bere nejdelší zapsaná série.
 * Kdo cvičí jen daleko od maxima, tomu objem vyjde vyšší, než je – série se proto hlásí
 * jako „odhadnuté“ a karta Tělo nabídne test maxima.
 */
function setCredit(set: SetEntry, exercise: VolumeExercise, workout: WorkoutNote, ctx: VolumeContext, bests: Bests): SetCredit {
	// Série do selhání bez zapsaného RIR = RIR 0.
	const rir = set.rir ?? (set.tag === "failure" ? 0 : undefined);
	if (rir !== undefined && rir <= ctx.options.rirMax) return { sets: 1, assumed: false };
	if (exercise.measure === "reps_bw" && set.reps !== undefined && set.reps > 0) {
		const max = maxRepsAt(bests, exercise.name, set.added_kg ?? 0);
		if (max) return { sets: max.reps - set.reps <= ctx.options.rirMax ? 1 : set.reps / max.reps, assumed: !max.known };
	}
	if (rir !== undefined) return { sets: 0, assumed: false };
	if (workout.sport !== "strength") return { sets: null, assumed: false };
	const load = setLoadKg(set, exercise, ctx.bodyweightKg);
	const best = bests.oneRm.get(exercise.name);
	if (load === null || best === undefined || best <= 0) return { sets: null, assumed: false };
	return { sets: (load / best) * 100 >= ctx.options.minPct1rm ? 1 : 0, assumed: false };
}

interface BlockCount {
	exercise: VolumeExercise;
	sets: number;
}

/** Efektivní série jednoho bloku po cvicích; `uncounted` = série bez RIR, které nešlo posoudit, `assumed` = posouzené jen odhadem maxima. */
function countBlock(block: Block, workout: WorkoutNote, ctx: VolumeContext, bests: Bests): { counts: BlockCount[]; uncounted: number; assumed: number } {
	const counts: BlockCount[] = [];
	let uncounted = 0;
	let assumed = 0;
	const add = (name: string, sets: number) => {
		const exercise = ctx.info(name);
		if (exercise && sets > 0) counts.push({ exercise, sets });
	};
	/** Bloky bez jednotlivých sérií: počítají se kola, jen při dostatečném RPE bloku nebo tréninku. */
	const hardEnough = (blockRpe: number | undefined) => (blockRpe ?? workout.rpe ?? 0) >= ctx.options.blockMinRpe;

	switch (block.type) {
		case "sets": {
			const exercise = ctx.info(block.exercise);
			if (!exercise) break;
			let effective = 0;
			for (const set of working(block.sets)) {
				const credit = setCredit(set, exercise, workout, ctx, bests);
				if (credit.sets === null) uncounted++;
				else effective += credit.sets;
				if (credit.assumed) assumed++;
			}
			// Na setiny – části sérií se sčítají a nemají v součtech dělat šum.
			if (effective > 0) counts.push({ exercise, sets: Math.round(effective * 100) / 100 });
			break;
		}
		case "hold": {
			const exercise = ctx.info(block.exercise);
			if (!exercise) break;
			const max = bests.holdSec.get(exercise.name) ?? 0;
			const effective = working(block.sets).filter(
				(s) => s.sec !== undefined && max > 0 && (s.sec / max) * 100 >= ctx.options.holdPctOfMax,
			).length;
			if (effective > 0) counts.push({ exercise, sets: effective });
			break;
		}
		case "emom":
			if (hardEnough(block.rpe)) add(block.exercise, block.rounds ?? block.minutes);
			break;
		case "amrap":
		case "complex":
			if (hardEnough(block.rpe)) for (const item of block.items) add(item.exercise, block.rounds);
			break;
		// Žebřík a „na čas“ SPEC nezmiňuje: počítají se jako kola při RPE tréninku ≥ 7 (praxe).
		case "ladder":
			if (hardEnough(undefined)) add(block.exercise, block.steps.length);
			break;
		case "timed":
			if (hardEnough(undefined)) add(block.exercise, 1);
			break;
	}
	return { counts, uncounted, assumed };
}

/**
 * Efektivní série po partiích pro každý trénink. Maxima (1RM, výdrž) se berou
 * z historie do daného tréninku včetně – pozdější zlepšení starší týdny nemění.
 */
export function volumeHistory(workouts: readonly WorkoutNote[], ctx: VolumeContext): WorkoutVolume[] {
	// Čas se počítá jednou na trénink, ne při každém porovnání v řazení.
	const ordered = workouts.map((workout) => ({ workout, at: workoutTime(workout) })).sort((a, b) => a.at - b.at);
	const bests: Bests = { oneRm: new Map(), holdSec: new Map(), maxReps: new Map() };
	const tests = [...(ctx.maxTests ?? [])].sort((a, b) => a.date.localeCompare(b.date));
	let nextTest = 0;
	return ordered.map(({ workout, at }) => {
		// Testy maxima do dne tréninku včetně.
		for (; nextTest < tests.length && tests[nextTest]!.date <= workout.date; nextTest++) {
			const test = tests[nextTest]!;
			const name = ctx.info(test.exercise)?.name;
			if (name !== undefined && test.reps > 0) raiseMaxReps(bests, name, 0, test.reps, true);
		}
		updateBests(workout, ctx, bests);
		const muscles: Partial<Record<MuscleId, number>> = {};
		let uncounted = 0;
		let assumed = 0;
		for (const block of workout.blocks) {
			const result = countBlock(block, workout, ctx, bests);
			uncounted += result.uncounted;
			assumed += result.assumed;
			for (const { exercise, sets } of result.counts) {
				for (const m of exercise.muscles.primary) muscles[m] = (muscles[m] ?? 0) + sets;
				for (const m of exercise.muscles.secondary) {
					if (!exercise.muscles.primary.includes(m)) muscles[m] = (muscles[m] ?? 0) + sets * SECONDARY_SHARE;
				}
			}
		}
		return { date: workout.date, at, muscles, uncounted, assumed };
	});
}

function emptyTotals(): Record<MuscleId, number> {
	return Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<MuscleId, number>;
}

/** Součet efektivních sérií za dny `from`–`to` včetně. */
export function setsBetween(history: readonly WorkoutVolume[], from: string, to: string): Record<MuscleId, number> {
	const totals = emptyTotals();
	for (const entry of history) {
		if (entry.date < from || entry.date > to) continue;
		for (const m of MUSCLES) totals[m] += entry.muscles[m] ?? 0;
	}
	return totals;
}

/** Efektivní série za posledních 7 dní včetně dneška. */
export function weeklySets(history: readonly WorkoutVolume[], today: string): Record<MuscleId, number> {
	return setsBetween(history, addDays(today, -6), today);
}

/**
 * Vývoj po sedmidenních oknech: `weeks` hodnot od nejstaršího, poslední = posledních
 * 7 dní. Každé okno má i datum svého prvního dne.
 */
export function weeklyTrend(
	history: readonly WorkoutVolume[],
	today: string,
	weeks = 8,
): { from: string; sets: Record<MuscleId, number> }[] {
	const out: { from: string; sets: Record<MuscleId, number> }[] = [];
	for (let i = weeks - 1; i >= 0; i--) {
		const to = addDays(today, -7 * i);
		const from = addDays(to, -6);
		out.push({ from, sets: setsBetween(history, from, to) });
	}
	return out;
}

/** Počet nezapočítaných sérií (chybí RIR), nebo sérií posouzených jen odhadem maxima, za posledních 7 dní. */
export function weeklyUncounted(history: readonly WorkoutVolume[], today: string, key: "uncounted" | "assumed" = "uncounted"): number {
	const from = addDays(today, -6);
	return history.filter((e) => e.date >= from && e.date <= today).reduce((sum, e) => sum + e[key], 0);
}

// ---------- Kategorie objemu ----------

export interface VolumeThresholds {
	low: number;
	targetMin: number;
	targetMax: number;
}

/** 0 = málo (< 6), 1 = pod optimem (6–9), 2 = optimum (10–20), 3 = nad rozsahem (> 20). */
export function volumeCategory(sets: number, th: VolumeThresholds): 0 | 1 | 2 | 3 {
	if (sets < th.low) return 0;
	if (sets < th.targetMin) return 1;
	return sets <= th.targetMax ? 2 : 3;
}

// ---------- Regenerace ----------

export interface RecoveryThresholds {
	/** Kolik efektivních sérií za den se počítá jako trénink partie (výchozí 3). */
	minSets: number;
	hours1: number;
	hours2: number;
	hours3: number;
}

export interface Recovery {
	/** Čas posledního tréninku partie v ms; null = zatím žádný. */
	lastAt: number | null;
	lastDate: string | null;
	hours: number | null;
	/** 0–100; bez tréninku 100. */
	percent: number;
	/** 0 = pod 24 h, 1 = 24–48, 2 = 48–72, 3 = 72+ (i bez tréninku). */
	category: 0 | 1 | 2 | 3;
}

/**
 * Regenerace partie: čas od posledního dne, kdy dostala aspoň `minSets`
 * efektivních sérií (součet tréninků toho dne; čas se bere z posledního z nich).
 */
export function recovery(history: readonly WorkoutVolume[], muscle: MuscleId, nowMs: number, th: RecoveryThresholds): Recovery {
	const byDate = new Map<string, { sets: number; at: number }>();
	for (const entry of history) {
		const sets = entry.muscles[muscle] ?? 0;
		if (sets <= 0 || entry.at > nowMs) continue;
		const day = byDate.get(entry.date) ?? { sets: 0, at: 0 };
		day.sets += sets;
		day.at = Math.max(day.at, entry.at);
		byDate.set(entry.date, day);
	}
	let lastAt: number | null = null;
	let lastDate: string | null = null;
	for (const [date, day] of byDate) {
		if (day.sets >= th.minSets && (lastAt === null || day.at > lastAt)) {
			lastAt = day.at;
			lastDate = date;
		}
	}
	if (lastAt === null) return { lastAt: null, lastDate: null, hours: null, percent: 100, category: 3 };
	const hours = (nowMs - lastAt) / 3_600_000;
	const category = hours < th.hours1 ? 0 : hours < th.hours2 ? 1 : hours < th.hours3 ? 2 : 3;
	return { lastAt, lastDate, hours, percent: Math.min(100, Math.round((hours / th.hours3) * 100)), category };
}

// ---------- Cviky na partii ----------

export interface MuscleExerciseRow {
	name: string;
	/** Hlavní partie cviku (jinak vedlejší). */
	primary: boolean;
	/** Nejlepší série za poslední 4 týdny. */
	best: { reps?: number; kg?: number; addedKg?: number; sec?: number } | null;
	/** Odhad 1RM z posledních 4 týdnů. */
	oneRm: number | null;
	/** Změna proti předchozím 4 týdnům; null = není s čím srovnat. */
	change: { value: number; unit: "kg" | "reps" | "sec" } | null;
	/** Počet pracovních sérií za poslední 4 týdny. */
	sets: number;
}

interface PeriodBest {
	oneRm: number | null;
	reps: number | null;
	sec: number | null;
	bestSet: SetEntry | null;
	sets: number;
}

function periodBest(sets: readonly SetEntry[], exercise: VolumeExercise, bodyweightKg: number | undefined): PeriodBest {
	const result: PeriodBest = { oneRm: null, reps: null, sec: null, bestSet: null, sets: sets.length };
	let bestScore = -1;
	for (const set of sets) {
		const rm = estimateSet1RM(set, exercise, bodyweightKg);
		if (rm !== null && (result.oneRm === null || rm > result.oneRm)) result.oneRm = rm;
		if (set.reps !== undefined && (result.reps === null || set.reps > result.reps)) result.reps = set.reps;
		if (set.sec !== undefined && (result.sec === null || set.sec > result.sec)) result.sec = set.sec;
		// Pořadí „nejlepší série“: odhad 1RM, jinak zátěž × opakování, jinak opakování nebo sekundy.
		const load = setLoadKg(set, exercise, bodyweightKg);
		const score = rm ?? (load !== null && set.reps !== undefined ? load * set.reps * 0.001 : (set.reps ?? set.sec ?? 0) * 0.000001);
		if (score > bestScore) {
			bestScore = score;
			result.bestSet = set;
		}
	}
	return result;
}

/**
 * Cviky zatěžující partii, které se cvičily v posledních 4 týdnech: nejlepší
 * série, odhad 1RM a změna proti předchozím 4 týdnům. Hlavní partie první,
 * pak podle počtu sérií.
 */
export function muscleExercises(
	workouts: readonly WorkoutNote[],
	muscle: MuscleId,
	ctx: VolumeContext,
	today: string,
): MuscleExerciseRow[] {
	const recentFrom = addDays(today, -27);
	const previousFrom = addDays(today, -55);
	const recent = new Map<string, { exercise: VolumeExercise; sets: SetEntry[] }>();
	const previous = new Map<string, SetEntry[]>();
	for (const workout of workouts) {
		if (workout.date > today || workout.date < previousFrom) continue;
		for (const block of workout.blocks) {
			if (block.type !== "sets" && block.type !== "hold") continue;
			const exercise = ctx.info(block.exercise);
			if (!exercise) continue;
			if (!exercise.muscles.primary.includes(muscle) && !exercise.muscles.secondary.includes(muscle)) continue;
			const sets = working(block.sets);
			if (workout.date >= recentFrom) {
				const entry = recent.get(exercise.name) ?? { exercise, sets: [] };
				entry.sets.push(...sets);
				recent.set(exercise.name, entry);
			} else {
				previous.set(exercise.name, [...(previous.get(exercise.name) ?? []), ...sets]);
			}
		}
	}
	const rows: MuscleExerciseRow[] = [];
	for (const { exercise, sets } of recent.values()) {
		if (sets.length === 0) continue;
		const now = periodBest(sets, exercise, ctx.bodyweightKg);
		const before = periodBest(previous.get(exercise.name) ?? [], exercise, ctx.bodyweightKg);
		let change: MuscleExerciseRow["change"] = null;
		if (now.oneRm !== null && before.oneRm !== null) change = { value: now.oneRm - before.oneRm, unit: "kg" };
		else if (exercise.measure === "seconds" && now.sec !== null && before.sec !== null) change = { value: now.sec - before.sec, unit: "sec" };
		else if (now.oneRm === null && now.reps !== null && before.reps !== null) change = { value: now.reps - before.reps, unit: "reps" };
		const set = now.bestSet;
		rows.push({
			name: exercise.name,
			primary: exercise.muscles.primary.includes(muscle),
			best: set ? { reps: set.reps, kg: set.kg, addedKg: set.added_kg, sec: set.sec } : null,
			oneRm: now.oneRm,
			change,
			sets: now.sets,
		});
	}
	return rows.sort((a, b) => Number(b.primary) - Number(a.primary) || b.sets - a.sets || a.name.localeCompare(b.name, "cs"));
}

// ---------- Kardio zátěž partie (jen informace, ne série) ----------

/** Které partie zatěžuje kardio: běh a švihadlo nohy, plavání záda a ramena. */
export const CARDIO_MUSCLES: Partial<Record<WorkoutNote["sport"], MuscleId[]>> = {
	run: ["quads", "hamstrings", "calves", "glutes"],
	rope: ["calves"],
	swim: ["lats", "shoulders"],
};

export interface CardioLoad {
	sport: WorkoutNote["sport"];
	count: number;
	/** Kilometry (běh) nebo metry (plavání); 0, když vzdálenost chybí. */
	distance: number;
}

/** Kardio za posledních 7 dní, které zatěžuje danou partii. */
export function cardioLoad(workouts: readonly WorkoutNote[], muscle: MuscleId, today: string): CardioLoad[] {
	const from = addDays(today, -6);
	const out: CardioLoad[] = [];
	for (const [sport, muscles] of Object.entries(CARDIO_MUSCLES) as [WorkoutNote["sport"], MuscleId[]][]) {
		if (!muscles.includes(muscle)) continue;
		const sessions = workouts.filter((w) => w.sport === sport && w.date >= from && w.date <= today);
		if (sessions.length === 0) continue;
		const distance = sessions.reduce((sum, w) => sum + (sport === "swim" ? (w.swim?.distance_m ?? 0) : (w.run?.distance_km ?? 0)), 0);
		out.push({ sport, count: sessions.length, distance });
	}
	return out;
}
