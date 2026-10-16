// Plán týdne (SPEC 4.8, 5.16): stav položek proti zapsaným tréninkům, položka jako
// trénink pro výpočty (zátěž dne, výdej), souhrn týdne a výhled zátěže.
// Čisté funkce bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import { SCHEMA_VERSION, type PlanIntensity, type Sport } from "../model/constants";
import { addDays, daysBetween } from "../model/dates";
import type { PlanItem, WorkoutNote } from "../model/types";
import { sessionLoad } from "./load";
import { median } from "./stats";
import { translated } from "../i18n";

/**
 * Odhad RPE (CR-10) z plánované intenzity – praxe. Hodnoty leží uprostřed pásem,
 * podle kterých se RPE dělí na nízkou / střední / vysokou intenzitu (do 4, 5–6, od 7).
 */
export const PLAN_RPE: Record<PlanIntensity, number> = { low: 3, mid: 5, high: 8 };

/** Od tohoto RPE je zapsaný trénink „těžký“ (stejná hranice jako u intenzity ve výživě). */
export const HARD_RPE = 7;

/** Zátěž z plánu = odhad RPE × plánovaná délka: vzorec session RPE (Foster 2001), vstupy jsou odhad. */
export const PLAN_LOAD_BASIS: Basis = { sourceIds: ["foster2001", "practice"], evidence: "practice" };

/** Sedm dní týdne od pondělí `week`. */
export function weekDates(week: string): string[] {
	return Array.from({ length: 7 }, (_, i) => addDays(week, i));
}

/** Volné označení pro novou položku: p1, p2, … */
export function nextItemId(items: readonly Pick<PlanItem, "id">[]): string {
	const used = new Set(items.map((i) => i.id));
	let n = items.length + 1;
	while (used.has(`p${n}`)) n++;
	return `p${n}`;
}

// ---------- Stav položek ----------

/** `off` = den je volný (volno, nemoc, dovolená) – položka se nepočítá jako vynechaná ani jako zbývající. */
export type PlanStatus = "done" | "planned" | "missed" | "off";

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = translated({ done: "splněno", planned: "v plánu", missed: "vynecháno", off: "odloženo" });

export interface PlanMatch<W> {
	item: PlanItem;
	status: PlanStatus;
	/** Zapsaný trénink, kterým se položka splnila. */
	workout?: W;
}

interface MatchWorkout {
	date: string;
	sport: Sport;
	template?: string;
}

const sameLink = (a: string | undefined, b: string | undefined) =>
	a !== undefined && b !== undefined && a.trim().toLocaleLowerCase("cs") === b.trim().toLocaleLowerCase("cs");

/**
 * Spáruje položky plánu se zapsanými tréninky téhož dne: nejdřív podle šablony,
 * potom podle sportu; každý trénink splní nejvýš jednu položku. Nespárovaná položka
 * je do dneška včetně „v plánu“, starší „vynecháno“; ve volný den (`off`) je „odloženo“.
 */
export function matchPlan<W extends MatchWorkout>(items: readonly PlanItem[], workouts: readonly W[], today: string, off: ReadonlySet<string> = new Set()): PlanMatch<W>[] {
	const used = new Set<W>();
	const found = new Map<PlanItem, W>();
	const pick = (item: PlanItem, test: (w: W) => boolean) => {
		if (found.has(item)) return;
		const workout = workouts.find((w) => !used.has(w) && w.date === item.date && test(w));
		if (!workout) return;
		used.add(workout);
		found.set(item, workout);
	};
	for (const item of items) if (item.template) pick(item, (w) => sameLink(w.template, item.template));
	for (const item of items) pick(item, (w) => w.sport === item.sport);
	return items.map((item) => {
		const workout = found.get(item);
		if (workout) return { item, status: "done", workout };
		return { item, status: pendingStatus(item.date, today, off) };
	});
}

/** Stav nesplněné položky: ve volný den „odloženo“, jinak do dneška „v plánu“ a potom „vynecháno“. */
export function pendingStatus(date: string, today: string, off: ReadonlySet<string>): PlanStatus {
	if (off.has(date)) return "off";
	return date < today ? "missed" : "planned";
}

// ---------- Položka jako trénink pro výpočty ----------

/** Z kolika dní zpět se bere vlastní tempo běhu a kolik běhů je k tomu potřeba. */
export const PACE_WINDOW_DAYS = 90;
export const PACE_MIN_RUNS = 3;

/** Obvyklé tempo běhu (min/km): medián běhů se vzdáleností a časem za posledních 90 dní; null = málo běhů. */
export function runPaceMinPerKm(workouts: readonly WorkoutNote[], today: string): number | null {
	const paces: number[] = [];
	for (const w of workouts) {
		const age = daysBetween(w.date, today);
		if (w.sport !== "run" || age < 0 || age > PACE_WINDOW_DAYS) continue;
		const km = w.run?.distance_km;
		const minutes = w.run?.moving_time_s !== undefined ? w.run.moving_time_s / 60 : w.duration_min;
		if (km !== undefined && km > 0 && minutes !== undefined && minutes > 0) paces.push(minutes / km);
	}
	return paces.length >= PACE_MIN_RUNS ? median(paces) : null;
}

/** Délka položky v minutách: zadaná, u běhu bez délky odhad ze vzdálenosti a vlastního tempa. */
export function plannedMinutes(item: PlanItem, paceMinPerKm: number | null): { minutes: number; estimated: boolean } | null {
	if (item.duration_min !== undefined) return { minutes: item.duration_min, estimated: false };
	if (item.sport === "run" && item.distance_km !== undefined && paceMinPerKm !== null) {
		return { minutes: Math.round(item.distance_km * paceMinPerKm), estimated: true };
	}
	return null;
}

/** Zátěž položky v AU (odhad RPE × délka); null, když délku nejde určit. */
export function plannedLoad(item: PlanItem, paceMinPerKm: number | null): number | null {
	return sessionLoad(PLAN_RPE[item.intensity], plannedMinutes(item, paceMinPerKm)?.minutes);
}

/**
 * Položka plánu jako trénink – vstup pro zátěž dne a výdej ve výživě (kap. 11),
 * dokud skutečný trénink není zapsaný.
 */
export function plannedWorkout(item: PlanItem, paceMinPerKm: number | null): WorkoutNote {
	const minutes = plannedMinutes(item, paceMinPerKm)?.minutes;
	const note: WorkoutNote = {
		forma: "workout",
		schema: SCHEMA_VERSION,
		date: item.date,
		sport: item.sport,
		rpe: PLAN_RPE[item.intensity],
		source: "manual",
		blocks: [],
		pain: [],
	};
	if (item.title !== undefined) note.title = item.title;
	if (item.template !== undefined) note.template = item.template;
	if (minutes !== undefined) note.duration_min = minutes;
	if (item.sport === "run" && item.distance_km !== undefined) note.run = { distance_km: item.distance_km };
	return note;
}

// ---------- Souhrn a výhled týdne ----------

export interface WeekSummary {
	planned: number;
	done: number;
	missed: number;
	/** Položky odložené kvůli volnu, nemoci nebo dovolené. */
	postponed: number;
	/** Součet plánovaných délek (včetně odhadů u běhů bez délky). */
	plannedMin: number;
	/** Položky, u kterých délku nejde určit – do minut ani do zátěže se nepočítají. */
	withoutDuration: number;
	plannedRunKm: number;
	/** Skutečně odtrénované minuty a kilometry běhu v týdnu (všechny zapsané tréninky). */
	actualMin: number;
	actualRunKm: number;
}

export function weekSummary(week: string, matches: readonly PlanMatch<unknown>[], workouts: readonly WorkoutNote[], paceMinPerKm: number | null): WeekSummary {
	const out: WeekSummary = { planned: matches.length, done: 0, missed: 0, postponed: 0, plannedMin: 0, withoutDuration: 0, plannedRunKm: 0, actualMin: 0, actualRunKm: 0 };
	for (const { item, status } of matches) {
		if (status === "done") out.done++;
		if (status === "missed") out.missed++;
		if (status === "off") out.postponed++;
		const minutes = plannedMinutes(item, paceMinPerKm);
		if (minutes) out.plannedMin += minutes.minutes;
		else out.withoutDuration++;
		if (item.sport === "run") out.plannedRunKm += item.distance_km ?? 0;
	}
	const end = addDays(week, 6);
	for (const w of workouts) {
		if (w.date < week || w.date > end) continue;
		out.actualMin += w.duration_min ?? (w.run?.moving_time_s !== undefined ? w.run.moving_time_s / 60 : 0);
		if (w.sport === "run") out.actualRunKm += w.run?.distance_km ?? 0;
	}
	return out;
}

/** S kolika předchozími týdny se plánovaný týden srovnává. */
export const OUTLOOK_WEEKS = 4;

export interface WeekOutlook {
	/** Zátěž už zapsaných tréninků týdne (AU). */
	actual: number;
	/** Zátěž položek, které jsou ještě v plánu. */
	planned: number;
	/** Očekávaná zátěž týdne = zapsaná + zbývající plán. */
	expected: number;
	/** Průměrná týdenní zátěž srovnávacích týdnů; null = historie je kratší nebo nulová. */
	average: number | null;
	/** Očekávaná zátěž / průměr. */
	ratio: number | null;
}

/**
 * Očekávaná zátěž týdne proti průměru čtyř týdnů před `baselineWeek` (pondělí
 * posledního týdne, který už není v historii – u budoucích týdnů ten aktuální).
 * Je to poměr akutní a chronické zátěže z týdenních součtů (Gabbett 2016),
 * jen s plánem místo skutečnosti – proto jen orientační (praxe).
 */
export function weekOutlook(
	week: string,
	matches: readonly PlanMatch<unknown>[],
	byDate: ReadonlyMap<string, number>,
	baselineWeek: string,
	paceMinPerKm: number | null,
): WeekOutlook {
	let actual = 0;
	for (const date of weekDates(week)) actual += byDate.get(date) ?? 0;
	let planned = 0;
	for (const { item, status } of matches) {
		if (status === "planned") planned += plannedLoad(item, paceMinPerKm) ?? 0;
	}
	const from = addDays(baselineWeek, -7 * OUTLOOK_WEEKS);
	let first: string | null = null;
	let history = 0;
	for (const [date, load] of byDate) {
		if (first === null || date < first) first = date;
		if (date >= from && date < baselineWeek) history += load;
	}
	const average = first !== null && first <= from && history > 0 ? history / OUTLOOK_WEEKS : null;
	const expected = actual + planned;
	return { actual, planned, expected, average, ratio: average !== null ? expected / average : null };
}

/**
 * Řady aspoň dvou těžkých dnů po sobě: těžký je den s těžkou položkou, která je
 * ještě v plánu, nebo se zapsaným tréninkem s RPE od 7. Řada bez položky v plánu
 * je už historie a nevrací se. Střídání těžkých a lehkých dnů je praxe.
 */
export function hardStreaks(week: string, matches: readonly PlanMatch<unknown>[], workouts: readonly Pick<WorkoutNote, "date" | "rpe">[]): string[][] {
	const plannedHard = new Set(matches.filter((m) => m.status === "planned" && m.item.intensity === "high").map((m) => m.item.date));
	const doneHard = new Set(workouts.filter((w) => w.rpe !== undefined && w.rpe >= HARD_RPE).map((w) => w.date));
	const streaks: string[][] = [];
	let run: string[] = [];
	const close = () => {
		if (run.length >= 2 && run.some((d) => plannedHard.has(d))) streaks.push(run);
		run = [];
	};
	// Den před týdnem se bere v úvahu, aby se chytila i řada neděle → pondělí.
	for (const date of [addDays(week, -1), ...weekDates(week)]) {
		if (plannedHard.has(date) || doneHard.has(date)) run.push(date);
		else close();
	}
	close();
	return streaks;
}

/** Položky zkopírované do jiného týdne: stejné dny v týdnu, nová označení. */
export function copyItems(items: readonly PlanItem[], fromWeek: string, toWeek: string, existing: readonly Pick<PlanItem, "id">[] = []): PlanItem[] {
	const shift = daysBetween(fromWeek, toWeek);
	const out: PlanItem[] = [];
	for (const item of items) {
		out.push({ ...item, id: nextItemId([...existing, ...out]), date: addDays(item.date, shift) });
	}
	return out;
}
