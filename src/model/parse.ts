// Převod surového frontmatteru na typovaný model.
// Parsery jsou tolerantní: uživatel může poznámky upravovat ručně, takže
// neplatné nebo chybějící hodnoty se vynechají místo pádu. Poznámka se odmítne
// (null) jen tehdy, když chybí údaj, bez kterého nedává smysl (např. datum).

import {
	BLOCK_TYPES,
	BODY_SIDES,
	GOAL_STATUSES,
	GOAL_TYPES,
	NORM_KINDS,
	PAIN_STATUSES,
	EVIDENCE_LEVELS,
	EQUIPMENT,
	EXERCISE_CATEGORIES,
	EXERCISE_KINDS,
	EXERCISE_MEASURES,
	FORMA_TYPES,
	MUSCLES,
	PROGRESSION_RULES,
	RUN_TYPES,
	SCHEMA_VERSION,
	SET_TAGS,
	DAY_OFF_REASONS,
	PLAN_INTENSITIES,
	SPORTS,
	SUPPLEMENT_TIMINGS,
	SWIM_STYLES,
	TEST_TYPES,
	WEEKDAYS,
	type FormaType,
} from "./constants";
import { isSourceId, type SourceId } from "../evidence/sources";
import { isIsoDate, normalizeClockTime, startOfWeek, toIsoDate } from "./dates";
import { parseLink } from "./links";
import type {
	Block,
	BlockItem,
	DayNote,
	EmomTarget,
	ExerciseNote,
	FormaNote,
	GearNote,
	GoalNote,
	IntervalStep,
	NormItem,
	NormNote,
	NormRow,
	PainEntry,
	PainNote,
	PlanDayOff,
	PlanItem,
	PlanNote,
	LadderTarget,
	ProgramItem,
	ProgramNote,
	ProgramTarget,
	SetEntry,
	SupplementIngredient,
	SupplementNote,
	TargetWeight,
	TemplateBlock,
	TemplateItem,
	TemplateNote,
	TestNote,
	WeekSchedule,
	WorkoutNote,
} from "./types";

type Raw = Record<string, unknown>;

// ---------- Pomocné převody hodnot ----------

function isRecord(value: unknown): value is Raw {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown): Raw {
	return isRecord(value) ? value : {};
}

/** Číslo; přijme i řetězec s desetinnou čárkou ("78,4"). */
export function asNumber(value: unknown): number | undefined {
	if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value.trim().replace(",", "."));
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

export function asString(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
	const text = asString(value)?.trim();
	return text ? text : undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
	if (typeof value === "boolean") return value;
	if (value === "true") return true;
	if (value === "false") return false;
	return undefined;
}

/** Datum YYYY-MM-DD; přijme i objekt Date (YAML parser ho může vytvořit, je v UTC). */
export function asIsoDate(value: unknown): string | undefined {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return toIsoDate(new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
	}
	const text = asString(value)?.trim();
	return text && isIsoDate(text) ? text : undefined;
}

export function asClockTime(value: unknown): string | undefined {
	// Obsidian zapisuje časy bez uvozovek (start: 16:54). Parsery YAML 1.1 je
	// čtou jako šedesátková čísla (16:54 → 1014), proto číslo převést zpět.
	if (typeof value === "number") {
		if (!Number.isInteger(value) || value < 0 || value >= 24 * 60) return undefined;
		return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
	}
	const text = asString(value);
	return text ? (normalizeClockTime(text) ?? undefined) : undefined;
}

export function asLink(value: unknown): string | undefined {
	const text = asString(value);
	if (text === undefined) return undefined;
	const target = parseLink(text);
	return target ? target : undefined;
}

function asOneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
	return typeof value === "string" && (allowed as readonly string[]).includes(value)
		? (value as T)
		: undefined;
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function asListOf<T extends string>(value: unknown, allowed: readonly T[]): T[] {
	return asArray(value)
		.map((v) => asOneOf(v, allowed))
		.filter((v): v is T => v !== undefined);
}

/** Prázdný seznam = údaj chybí. */
function nonEmpty<T>(list: T[]): T[] | undefined {
	return list.length > 0 ? list : undefined;
}

function asNumberList(value: unknown): number[] {
	return asArray(value)
		.map(asNumber)
		.filter((v): v is number => v !== undefined);
}

/** Objekt s kladnými čísly; ostatní hodnoty zahodí. Prázdný = undefined. */
function asNumberMap(value: Raw): Record<string, number> | undefined {
	const out: Record<string, number> = {};
	for (const [key, raw] of Object.entries(value)) {
		const n = asNumber(raw);
		if (n !== undefined && n > 0) out[key] = n;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

function asStringList(value: unknown): string[] {
	return asArray(value)
		.map(asNonEmptyString)
		.filter((v): v is string => v !== undefined);
}

function asLinkList(value: unknown): string[] {
	return asArray(value)
		.map(asLink)
		.filter((v): v is string => v !== undefined);
}

function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined;
}

function isDefinedNotNull<T>(value: T | null | undefined): value is T {
	return value !== undefined && value !== null;
}

function asSourceId(value: unknown): SourceId | undefined {
	return typeof value === "string" && isSourceId(value) ? value : undefined;
}

/** Vytvoří objekt jen s definovanými hodnotami (bez `undefined`). */
function compact<T extends object>(obj: T): T {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined) out[key] = value;
	}
	return out as T;
}

function schemaOf(raw: Raw): number {
	return asNumber(raw.schema) ?? SCHEMA_VERSION;
}

// ---------- Rozpoznání typu ----------

export function formaTypeOf(raw: unknown): FormaType | undefined {
	return asOneOf(asRecord(raw).forma, FORMA_TYPES);
}

// ---------- 4.1 Denní poznámka ----------

export function parseDay(raw: Raw): DayNote | null {
	const date = asIsoDate(raw.date);
	if (!date) return null;
	const sleep = asRecord(raw.sleep);
	const checkIn = asRecord(raw.check_in);
	const hrv = asRecord(raw.hrv);
	const body = asRecord(raw.body);
	return compact<DayNote>({
		forma: "day",
		schema: schemaOf(raw),
		date,
		sleep: compact({
			bedtime: asClockTime(sleep.bedtime),
			sleep_onset: asClockTime(sleep.sleep_onset),
			wake: asClockTime(sleep.wake),
			duration_min: asNumber(sleep.duration_min),
			quality: asNumber(sleep.quality),
			awakenings: asNumber(sleep.awakenings),
			morning_feeling: asNumber(sleep.morning_feeling),
		}),
		check_in: compact({
			fatigue: asNumber(checkIn.fatigue),
			soreness: asNumber(checkIn.soreness),
			mood: asNumber(checkIn.mood),
			stress: asNumber(checkIn.stress),
			motivation: asNumber(checkIn.motivation),
		}),
		hrv: compact({
			rmssd_ms: asNumber(hrv.rmssd_ms),
			resting_hr: asNumber(hrv.resting_hr),
			elonga_readiness: asNumber(hrv.elonga_readiness),
		}),
		body: compact({
			weight_kg: asNumber(body.weight_kg),
			body_fat_pct: asNumber(body.body_fat_pct),
			waist_cm: asNumber(body.waist_cm),
			hips_cm: asNumber(body.hips_cm),
			chest_cm: asNumber(body.chest_cm),
			arm_cm: asNumber(body.arm_cm),
			thigh_cm: asNumber(body.thigh_cm),
			calf_cm: asNumber(body.calf_cm),
		}),
		steps: asSteps(raw.steps),
		supplements: Array.isArray(raw.supplements) ? asNameList(raw.supplements) : undefined,
		notes: asNonEmptyString(raw.notes),
	});
}

/** Kroky za den: nezáporné celé číslo do 100 000, jinak undefined. */
export const MAX_STEPS = 100000;
export function asSteps(value: unknown): number | undefined {
	const n = asNumber(value);
	return n !== undefined && n >= 0 && n <= MAX_STEPS ? Math.round(n) : undefined;
}

/** Seznam názvů bez prázdných položek a duplicit; přijme i wikiodkazy. */
export function asNameList(value: unknown): string[] {
	const names = asArray(value)
		.map((item) => asLink(item)?.trim())
		.filter((name): name is string => !!name);
	return [...new Set(names)];
}

// ---------- 4.2 Trénink ----------

function parseSet(value: unknown): SetEntry | null {
	const raw = asRecord(value);
	const set = compact<SetEntry>({
		reps: asNumber(raw.reps),
		kg: asNumber(raw.kg),
		added_kg: asNumber(raw.added_kg),
		sec: asNumber(raw.sec),
		rir: asNumber(raw.rir),
	});
	if (Object.keys(set).length === 0) return null;
	if (asBoolean(raw.warmup) === true) set.warmup = true;
	const tag = asOneOf(raw.tag, SET_TAGS);
	// Rozcvičovací série označení nenese.
	if (tag && !set.warmup) set.tag = tag;
	return set;
}

function parseSets(value: unknown): SetEntry[] {
	return asArray(value)
		.map(parseSet)
		.filter((s): s is SetEntry => s !== null);
}

function parseBlockItem(value: unknown): BlockItem | null {
	const raw = asRecord(value);
	const exercise = asLink(raw.exercise);
	if (!exercise) return null;
	return compact<BlockItem>({
		exercise,
		reps: asNumber(raw.reps),
		kg: asNumber(raw.kg),
		added_kg: asNumber(raw.added_kg),
		sec: asNumber(raw.sec),
	});
}

function parseBlockItems(value: unknown): BlockItem[] {
	return asArray(value)
		.map(parseBlockItem)
		.filter((i): i is BlockItem => i !== null);
}

export function parseBlock(value: unknown): Block | null {
	const raw = asRecord(value);
	const type = asOneOf(raw.type, BLOCK_TYPES);
	const exercise = asLink(raw.exercise);
	switch (type) {
		case "sets":
		case "hold":
			if (!exercise) return null;
			return asBoolean(raw.superset) === true ? { type, exercise, sets: parseSets(raw.sets), superset: true } : { type, exercise, sets: parseSets(raw.sets) };
		case "emom": {
			const minutes = asNumber(raw.minutes);
			const repsPerMin = asNumber(raw.reps_per_min);
			if (!exercise || minutes === undefined || repsPerMin === undefined) return null;
			return compact({
				type,
				exercise,
				minutes,
				reps_per_min: repsPerMin,
				kg: asNumber(raw.kg),
				added_kg: asNumber(raw.added_kg),
				rounds: asNumber(raw.rounds),
				rpe: asNumber(raw.rpe),
			});
		}
		case "amrap": {
			const minutes = asNumber(raw.minutes);
			const items = parseBlockItems(raw.items);
			if (minutes === undefined || items.length === 0) return null;
			return compact({
				type,
				minutes,
				items,
				rounds: asNumber(raw.rounds) ?? 0,
				extra_reps: asNumber(raw.extra_reps),
				rpe: asNumber(raw.rpe),
			});
		}
		case "ladder": {
			const steps = asNumberList(raw.steps);
			if (!exercise || steps.length === 0) return null;
			return compact({
				type,
				exercise,
				steps,
				kg: asNumber(raw.kg),
				added_kg: asNumber(raw.added_kg),
			});
		}
		case "complex": {
			const items = parseBlockItems(raw.items);
			if (items.length === 0) return null;
			return compact({
				type,
				items,
				rounds: asNumber(raw.rounds) ?? 0,
				kg: asNumber(raw.kg),
				rpe: asNumber(raw.rpe),
			});
		}
		case "timed": {
			const sec = asNumber(raw.sec);
			if (!exercise || sec === undefined) return null;
			return compact({
				type,
				exercise,
				sec,
				reps: asNumber(raw.reps),
				kg: asNumber(raw.kg),
				added_kg: asNumber(raw.added_kg),
			});
		}
		default:
			return null;
	}
}

export function parseWorkout(raw: Raw): WorkoutNote | null {
	const date = asIsoDate(raw.date);
	if (!date) return null;
	const run = isRecord(raw.run) ? raw.run : undefined;
	const swim = isRecord(raw.swim) ? raw.swim : undefined;
	const rope = isRecord(raw.rope) ? raw.rope : undefined;
	return compact<WorkoutNote>({
		forma: "workout",
		schema: schemaOf(raw),
		date,
		start: asClockTime(raw.start),
		sport: asOneOf(raw.sport, SPORTS) ?? "other",
		title: asNonEmptyString(raw.title),
		template: asLink(raw.template),
		program: asLink(raw.program),
		duration_min: asNumber(raw.duration_min),
		rpe: asNumber(raw.rpe),
		source: raw.source === "strava" || raw.source === "file" ? raw.source : "manual",
		strava_id: asNumber(raw.strava_id),
		run: run
			? compact({
					distance_km: asNumber(run.distance_km),
					moving_time_s: asNumber(run.moving_time_s),
					avg_hr: asNumber(run.avg_hr),
					max_hr: asNumber(run.max_hr),
					elevation_m: asNumber(run.elevation_m),
					cadence_spm: asNumber(run.cadence_spm),
					type: asOneOf(run.type, RUN_TYPES),
					shoes: asLink(run.shoes),
					hr_zone_s: Array.isArray(run.hr_zone_s) ? asNumberList(run.hr_zone_s) : undefined,
					best_s: isRecord(run.best_s) ? asNumberMap(run.best_s) : undefined,
					strava_detail: asBoolean(run.strava_detail) === true ? true : undefined,
				})
			: undefined,
		swim: swim
			? compact({
					distance_m: asNumber(swim.distance_m),
					style: asOneOf(swim.style, SWIM_STYLES),
					pool_m: asNumber(swim.pool_m),
				})
			: undefined,
		rope: rope ? compact({ jumps: asNumber(rope.jumps) }) : undefined,
		blocks: asArray(raw.blocks)
			.map(parseBlock)
			.filter((b): b is Block => b !== null),
		pain: asLinkList(raw.pain),
		notes: asNonEmptyString(raw.notes),
	});
}

// ---------- 4.3 Cvik ----------

export function parseExercise(raw: Raw): ExerciseNote | null {
	const name = asNonEmptyString(raw.name);
	if (!name) return null;
	const muscles = asRecord(raw.muscles);
	const progression = isRecord(raw.progression) ? raw.progression : undefined;
	return compact<ExerciseNote>({
		forma: "exercise",
		schema: schemaOf(raw),
		name,
		category: asOneOf(raw.category, EXERCISE_CATEGORIES) ?? "strength",
		kind: asOneOf(raw.kind, EXERCISE_KINDS) ?? "grind",
		measure: asOneOf(raw.measure, EXERCISE_MEASURES) ?? "reps_kg",
		muscles: {
			primary: asListOf(muscles.primary, MUSCLES),
			secondary: asListOf(muscles.secondary, MUSCLES),
		},
		bodyweight_fraction: asNumber(raw.bodyweight_fraction),
		bodyweight_fraction_source: asSourceId(raw.bodyweight_fraction_source),
		progression: progression
			? compact({ ladder: asLink(progression.ladder), level: asNumber(progression.level) })
			: undefined,
		aliases: asStringList(raw.aliases),
		equipment: nonEmpty(asListOf(raw.equipment, EQUIPMENT)),
		description: asNonEmptyString(raw.description),
		technique: asNonEmptyString(raw.technique),
		mistakes: asNonEmptyString(raw.mistakes),
	});
}

// ---------- 4.4 Šablona ----------

function asTargetWeight(value: unknown): TargetWeight | undefined {
	if (value === "last") return "last";
	return asNumber(value);
}

function parseTemplateItem(value: unknown): TemplateItem | null {
	const raw = asRecord(value);
	const exercise = asLink(raw.exercise);
	if (!exercise) return null;
	return compact<TemplateItem>({
		exercise,
		reps: asNumber(raw.reps),
		sec: asNumber(raw.sec),
		kg: asTargetWeight(raw.kg),
		added_kg: asTargetWeight(raw.added_kg),
	});
}

function parseTemplateBlock(value: unknown): TemplateBlock | null {
	const raw = asRecord(value);
	const type = asOneOf(raw.type, BLOCK_TYPES);
	if (!type) return null;
	const items = asArray(raw.items)
		.map(parseTemplateItem)
		.filter((i): i is TemplateItem => i !== null);
	const block = compact<TemplateBlock>({
		type,
		exercise: asLink(raw.exercise),
		items: items.length > 0 ? items : undefined,
		sets: asNumber(raw.sets),
		reps: asNumber(raw.reps),
		sec: asNumber(raw.sec),
		kg: asTargetWeight(raw.kg),
		added_kg: asTargetWeight(raw.added_kg),
		minutes: asNumber(raw.minutes),
		reps_per_min: asNumber(raw.reps_per_min),
		steps: Array.isArray(raw.steps) ? asNumberList(raw.steps) : undefined,
		rounds: asNumber(raw.rounds),
		superset: (type === "sets" || type === "hold") && asBoolean(raw.superset) === true ? true : undefined,
	});
	return block.exercise || block.items ? block : null;
}

export function parseTemplate(raw: Raw): TemplateNote | null {
	const name = asNonEmptyString(raw.name);
	if (!name) return null;
	return compact<TemplateNote>({
		forma: "template",
		schema: schemaOf(raw),
		name,
		sport: asOneOf(raw.sport, SPORTS) ?? "strength",
		blocks: asArray(raw.blocks)
			.map(parseTemplateBlock)
			.filter((b): b is TemplateBlock => b !== null),
		notes: asNonEmptyString(raw.notes),
	});
}

// ---------- 4.5 Program ----------

function parseIntervalStep(value: unknown): IntervalStep | null {
	const raw = asRecord(value);
	const work = asNumber(raw.work_s);
	if (work === undefined || work <= 0) return null;
	const repeats = asNumber(raw.repeats);
	const rest = asNumber(raw.rest_s);
	return compact<IntervalStep>({
		repeats: repeats !== undefined && repeats >= 1 ? Math.round(repeats) : 1,
		work_s: work,
		rest_s: rest !== undefined && rest > 0 ? rest : undefined,
	});
}

/** Typ cíle se bere z `kind`, jinak se odvodí z přítomných klíčů (zápis dle SPEC 4.5). */
export function parseProgramTarget(value: unknown): ProgramTarget | null {
	const raw = asRecord(value);
	const kind = asOneOf(raw.kind, [
		"daily_total",
		"sets_reps",
		"pct_of_max",
		"time",
		"distance",
		"intervals",
		"ladder",
		"emom",
		"max_sets",
	] as const);
	// Žebřík, EMOM a série na maximum se rozpoznají jen podle výslovného `kind`.
	if (kind === "ladder") {
		const steps = asNumberList(raw.steps).filter((n) => n > 0);
		const open = asBoolean(raw.open) === true;
		const start = asNumber(raw.start);
		if (steps.length === 0 && !(open && start !== undefined && start > 0)) return null;
		return compact<LadderTarget>({
			kind: "ladder",
			steps: steps.length > 0 ? steps : undefined,
			open: open ? true : undefined,
			start,
			step: asNumber(raw.step),
			rounds: asNumber(raw.rounds),
			rest_per_rep_s: asNumber(raw.rest_per_rep_s),
			round_rest_s: asNumber(raw.round_rest_s),
		});
	}
	if (kind === "emom") {
		const reps = asNumber(raw.reps);
		const pct = asNumber(raw.pct_of_max);
		if (reps === undefined && pct === undefined) return null;
		return compact<EmomTarget>({
			kind: "emom",
			reps,
			pct_of_max: pct,
			minutes: asNumber(raw.minutes),
			until_failure: asBoolean(raw.until_failure) === true ? true : undefined,
			max_minutes: asNumber(raw.max_minutes),
		});
	}
	if (kind === "max_sets") {
		const sets = asNumber(raw.sets);
		if (sets === undefined || sets < 1) return null;
		return compact({ kind: "max_sets" as const, sets, rest_s: asNumber(raw.rest_s) });
	}
	if ((kind === "intervals" || !kind) && Array.isArray(raw.steps)) {
		const steps = raw.steps.map(parseIntervalStep).filter(isDefinedNotNull);
		if (steps.length === 0) return null;
		return compact({
			kind: "intervals" as const,
			warmup_s: asNumber(raw.warmup_s),
			steps,
			cooldown_s: asNumber(raw.cooldown_s),
		});
	}
	const dailyTotal = asNumber(raw.daily_total);
	const sets = asNumber(raw.sets);
	const reps = asNumber(raw.reps);
	const pct = asNumber(raw.pct_of_max);
	const timeS = asNumber(raw.time_s);
	const distanceKm = asNumber(raw.distance_km);

	if ((kind === "daily_total" || !kind) && dailyTotal !== undefined) {
		const steps = asNumberList(raw.counter_steps).filter((n) => n > 0);
		return compact({ kind: "daily_total" as const, daily_total: dailyTotal, counter_steps: steps.length > 0 ? steps : undefined });
	}
	if ((kind === "pct_of_max" || !kind) && pct !== undefined) {
		return { kind: "pct_of_max", sets: sets ?? 1, pct_of_max: pct };
	}
	if ((kind === "sets_reps" || !kind) && sets !== undefined && reps !== undefined) {
		return { kind: "sets_reps", sets, reps };
	}
	if ((kind === "time" || !kind) && timeS !== undefined) {
		return compact({ kind: "time" as const, time_s: timeS, sets });
	}
	if ((kind === "distance" || !kind) && distanceKm !== undefined) {
		return { kind: "distance", distance_km: distanceKm };
	}
	return null;
}

function parseWeekSchedule(value: unknown): WeekSchedule | null {
	const raw = asRecord(value);
	const week = asNumber(raw.week);
	if (week === undefined || !Number.isInteger(week) || week < 1) return null;
	const target = raw.target === undefined ? undefined : (parseProgramTarget(raw.target) ?? undefined);
	const sessions = asArray(raw.sessions)
		.map(parseProgramTarget)
		.filter(isDefinedNotNull);
	const exercise = asLink(raw.exercise);
	if (!target && sessions.length === 0 && !exercise) return null;
	return compact<WeekSchedule>({ week, exercise, target, sessions: sessions.length > 0 ? sessions : undefined });
}

function parseProgramItem(value: unknown): ProgramItem | null {
	const raw = asRecord(value);
	const exercise = asLink(raw.exercise);
	const target = parseProgramTarget(raw.target);
	if (!exercise || !target) return null;
	const days = asListOf(raw.days, WEEKDAYS);
	const schedule = asArray(raw.schedule)
		.map(parseWeekSchedule)
		.filter(isDefinedNotNull)
		.sort((a, b) => a.week - b.week);
	const maxFrom = asLinkList(raw.max_from);
	return compact<ProgramItem>({
		exercise,
		target,
		days: days.length > 0 ? days : undefined,
		schedule: schedule.length > 0 ? schedule : undefined,
		max_from: maxFrom.length > 0 ? maxFrom : undefined,
	});
}

/** Délka tréninku v minutách: kladná, nejvýš 24 hodin; jinak undefined. */
export function asSessionMinutes(value: unknown): number | undefined {
	const minutes = asNumber(value);
	return minutes !== undefined && minutes > 0 && minutes <= MAX_PLAN_MINUTES ? Math.round(minutes) : undefined;
}

export function parseProgram(raw: Raw): ProgramNote | null {
	const name = asNonEmptyString(raw.name);
	if (!name) return null;
	const progression = asRecord(raw.progression);
	const days = asListOf(raw.days, WEEKDAYS);
	return compact<ProgramNote>({
		forma: "program",
		schema: schemaOf(raw),
		name,
		builtin: asBoolean(raw.builtin) ?? false,
		evidence: asOneOf(raw.evidence, EVIDENCE_LEVELS) ?? "practice",
		sources: Array.isArray(raw.sources) ? asArray(raw.sources).map(asSourceId).filter(isDefined) : undefined,
		duration_weeks: asNumber(raw.duration_weeks),
		days: days.length > 0 ? days : [...WEEKDAYS],
		items: asArray(raw.items)
			.map(parseProgramItem)
			.filter((i): i is ProgramItem => i !== null),
		progression: compact({
			rule: asOneOf(progression.rule, PROGRESSION_RULES) ?? "none",
			add: asNumber(progression.add),
		}),
		retest_every_weeks: asNumber(raw.retest_every_weeks),
		active: asBoolean(raw.active) ?? false,
		active_since: asIsoDate(raw.active_since),
		session_min: asSessionMinutes(raw.session_min),
		intensity: asOneOf(raw.intensity, PLAN_INTENSITIES),
		notes: asNonEmptyString(raw.notes),
	});
}

// ---------- 4.6 Test maxima ----------

export function parseTest(raw: Raw): TestNote | null {
	const date = asIsoDate(raw.date);
	const exercise = asLink(raw.exercise);
	const testType = asOneOf(raw.test_type, TEST_TYPES);
	const result = asNumber(raw.result);
	if (!date || !exercise || !testType || result === undefined) return null;
	return compact<TestNote>({
		forma: "test",
		schema: schemaOf(raw),
		date,
		exercise,
		test_type: testType,
		time_limit_s: asNumber(raw.time_limit_s),
		result,
		distance_km: asNumber(raw.distance_km),
		notes: asNonEmptyString(raw.notes),
	});
}

// ---------- 4.6 Vybavení ----------

/** Zatím jen boty; jiné vybavení (`kind`) se neindexuje. */
export function parseGear(raw: Raw): GearNote | null {
	const name = asNonEmptyString(raw.name);
	if (!name || raw.kind !== "shoes") return null;
	const start = asNumber(raw.start_km);
	const limit = asNumber(raw.limit_km);
	return compact<GearNote>({
		forma: "gear",
		schema: schemaOf(raw),
		kind: "shoes",
		name,
		start_km: start !== undefined && start > 0 ? start : 0,
		limit_km: limit !== undefined && limit > 0 ? limit : undefined,
		active: asBoolean(raw.active) ?? true,
		notes: asNonEmptyString(raw.notes),
	});
}

// ---------- 4.6 Bolest ----------

function parsePainEntry(value: unknown): PainEntry | null {
	const raw = asRecord(value);
	const date = asIsoDate(raw.date);
	const level = asNumber(raw.level);
	if (!date || level === undefined || level < 0 || level > 10) return null;
	return { date, level };
}

export function parsePain(raw: Raw): PainNote | null {
	const name = asNonEmptyString(raw.name);
	const muscle = asOneOf(raw.muscle, MUSCLES);
	const history = asArray(raw.history)
		.map(parsePainEntry)
		.filter(isDefinedNotNull)
		.sort((a, b) => a.date.localeCompare(b.date));
	const since = asIsoDate(raw.since) ?? history[0]?.date;
	if (!name || !muscle || !since) return null;
	const level = asNumber(raw.level);
	return compact<PainNote>({
		forma: "pain",
		schema: schemaOf(raw),
		name,
		muscle,
		side: asOneOf(raw.side, BODY_SIDES),
		level: level !== undefined && level >= 0 && level <= 10 ? level : (history[history.length - 1]?.level ?? 0),
		since,
		trigger: asNonEmptyString(raw.trigger),
		status: asOneOf(raw.status, PAIN_STATUSES) ?? "active",
		history,
		notes: asNonEmptyString(raw.notes),
	});
}

// ---------- 4.6 Cíl ----------

export function parseGoal(raw: Raw): GoalNote | null {
	const name = asNonEmptyString(raw.name);
	const type = asOneOf(raw.type, GOAL_TYPES);
	const created = asIsoDate(raw.created);
	if (!name || !type || !created) return null;
	const target = asNumber(raw.target);
	if (type !== "norm" && (target === undefined || target <= 0)) return null;
	return compact<GoalNote>({
		forma: "goal",
		schema: schemaOf(raw),
		name,
		type,
		target,
		exercise: asLink(raw.exercise),
		distance_km: asNumber(raw.distance_km),
		ladder: asLink(raw.ladder),
		norm: asLink(raw.norm),
		created,
		deadline: asIsoDate(raw.deadline),
		start_value: asNumber(raw.start_value),
		status: asOneOf(raw.status, GOAL_STATUSES) ?? "active",
		notes: asNonEmptyString(raw.notes),
	});
}

// ---------- 4.6 Norma ----------

const NORM_SEXES = ["male", "female"] as const;

function parseNormRow(value: unknown): NormRow | null {
	const raw = asRecord(value);
	const rowValue = asNumber(raw.value);
	if (rowValue === undefined || rowValue <= 0) return null;
	return compact<NormRow>({
		sex: asOneOf(raw.sex, NORM_SEXES),
		age_from: asNumber(raw.age_from),
		age_to: asNumber(raw.age_to),
		value: rowValue,
	});
}

function parseNormItem(value: unknown): NormItem | null {
	const raw = asRecord(value);
	const exercise = asLink(raw.exercise);
	const kind = asOneOf(raw.kind, NORM_KINDS);
	const rows = asArray(raw.rows).map(parseNormRow).filter(isDefinedNotNull);
	if (!exercise || !kind || rows.length === 0) return null;
	return compact<NormItem>({ exercise, kind, time_limit_s: asNumber(raw.time_limit_s), distance_km: asNumber(raw.distance_km), rows });
}

export function parseNorm(raw: Raw): NormNote | null {
	const name = asNonEmptyString(raw.name);
	if (!name) return null;
	return compact<NormNote>({
		forma: "norm",
		schema: schemaOf(raw),
		name,
		items: asArray(raw.items).map(parseNormItem).filter(isDefinedNotNull),
		notes: asNonEmptyString(raw.notes),
	});
}

// ---------- 4.7 Suplement ----------

function parseIngredients(raw: unknown): SupplementIngredient[] | undefined {
	const list = asArray(raw).flatMap((value) => {
		if (!isRecord(value)) return [];
		const name = asNonEmptyString(value.name);
		const amount = asNumber(value.amount);
		const unit = asNonEmptyString(value.unit);
		if (!name || amount === undefined || amount <= 0 || !unit) return [];
		return [compact<SupplementIngredient>({ name, amount, unit, catalog: asNonEmptyString(value.catalog) })];
	});
	return list.length > 0 ? list : undefined;
}

export function parseSupplement(raw: Raw): SupplementNote | null {
	const name = asNonEmptyString(raw.name);
	if (!name) return null;
	const dose = asNumber(raw.dose);
	return compact<SupplementNote>({
		forma: "supplement",
		schema: schemaOf(raw),
		name,
		catalog: asNonEmptyString(raw.catalog),
		variant: asNonEmptyString(raw.variant),
		dose: dose !== undefined && dose > 0 ? dose : undefined,
		unit: asNonEmptyString(raw.unit),
		timing: asOneOf(raw.timing, SUPPLEMENT_TIMINGS) ?? "any",
		training_days_only: asBoolean(raw.training_days_only) ?? false,
		active: asBoolean(raw.active) ?? true,
		since: asIsoDate(raw.since),
		notes: asNonEmptyString(raw.notes),
		ingredients: parseIngredients(raw.ingredients),
	});
}

// ---------- Rozcestník ----------

// ---------- 4.8 Plán týdne ----------

/** Nejdelší plánovaný trénink (min) a nejdelší běh (km), které plán přijme. */
export const MAX_PLAN_MINUTES = 24 * 60;
export const MAX_PLAN_KM = 500;

/** Jedna položka plánu; null, když chybí datum nebo sport, nebo datum nepatří do týdne `week`. */
export function parsePlanItem(value: unknown, week: string, index: number): PlanItem | null {
	const raw = asRecord(value);
	const date = asIsoDate(raw.date);
	const sport = asOneOf(raw.sport, SPORTS);
	// Položka mimo týden poznámky by se v plánu ukázala jinde, než je zapsaná.
	if (!date || !sport || startOfWeek(date) !== week) return null;
	const distance = asNumber(raw.distance_km);
	return compact<PlanItem>({
		id: asNonEmptyString(raw.id) ?? `p${index + 1}`,
		date,
		sport,
		title: asNonEmptyString(raw.title),
		template: asLink(raw.template),
		duration_min: asSessionMinutes(raw.duration_min),
		intensity: asOneOf(raw.intensity, PLAN_INTENSITIES) ?? "mid",
		distance_km: sport === "run" && distance !== undefined && distance > 0 && distance <= MAX_PLAN_KM ? distance : undefined,
		notes: asNonEmptyString(raw.notes),
	});
}

/** Položky plánu týdne `week`; neplatné se přeskočí, opakované `id` dostane nové. */
export function parsePlanItems(value: unknown, week: string): PlanItem[] {
	const seen = new Set<string>();
	const out: PlanItem[] = [];
	asArray(value).forEach((raw, index) => {
		const item = parsePlanItem(raw, week, index);
		if (!item) return;
		let id = item.id;
		for (let n = 1; seen.has(id); n++) id = `p${index + n}`;
		seen.add(id);
		out.push({ ...item, id });
	});
	return out;
}

/** Volné dny týdne `week`; neplatné řádky a dny mimo týden se přeskočí, den se neopakuje. */
export function parsePlanOff(value: unknown, week: string): PlanDayOff[] {
	const byDate = new Map<string, PlanDayOff>();
	for (const entry of asArray(value)) {
		const raw = asRecord(entry);
		const date = asIsoDate(raw.date);
		const reason = asOneOf(raw.reason, DAY_OFF_REASONS);
		if (date && reason && startOfWeek(date) === week) byDate.set(date, { date, reason });
	}
	return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function parsePlan(raw: Raw): PlanNote | null {
	const week = asIsoDate(raw.week);
	if (!week || startOfWeek(week) !== week) return null;
	const off = parsePlanOff(raw.off, week);
	return compact<PlanNote>({ forma: "plan", schema: schemaOf(raw), week, items: parsePlanItems(raw.items, week), off: off.length > 0 ? off : undefined });
}

/** Rozparsuje poznámku podle `forma`. Typy, které ještě nemají model, vrátí null. */
export function parseNote(raw: unknown): FormaNote | null {
	if (!isRecord(raw)) return null;
	switch (formaTypeOf(raw)) {
		case "day":
			return parseDay(raw);
		case "workout":
			return parseWorkout(raw);
		case "exercise":
			return parseExercise(raw);
		case "template":
			return parseTemplate(raw);
		case "program":
			return parseProgram(raw);
		case "test":
			return parseTest(raw);
		case "supplement":
			return parseSupplement(raw);
		case "gear":
			return parseGear(raw);
		case "pain":
			return parsePain(raw);
		case "goal":
			return parseGoal(raw);
		case "norm":
			return parseNorm(raw);
		case "plan":
			return parsePlan(raw);
		default:
			return null;
	}
}
