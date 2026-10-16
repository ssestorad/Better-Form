// Společné konstanty datového modelu. Bez závislosti na Obsidianu.

import { translated } from "../i18n";

/** Aktuální verze schématu datových poznámek (frontmatter `schema`). */
export const SCHEMA_VERSION = 1;

export const FORMA_TYPES = [
	"day",
	"workout",
	"exercise",
	"template",
	"program",
	"goal",
	"pain",
	"gear",
	"test",
	"supplement",
	"norm",
	"summary",
	"plan",
] as const;
export type FormaType = (typeof FORMA_TYPES)[number];

export const SPORTS = ["run", "strength", "swim", "calisthenics", "kettlebell", "rope", "other"] as const;
export type Sport = (typeof SPORTS)[number];

export const SPORT_LABELS: Record<Sport, string> = translated({
	run: "Běh",
	strength: "Posilovna",
	swim: "Plavání",
	calisthenics: "Kalistenika",
	kettlebell: "Kettlebell",
	rope: "Švihadlo",
	other: "Jiné",
});

/** Svalové partie (ID pro panáček), SPEC 4.3. */
export const MUSCLES = [
	"chest",
	"shoulders",
	"biceps",
	"triceps",
	"forearms",
	"abs",
	"obliques",
	"traps",
	"lats",
	"lowback",
	"glutes",
	"quads",
	"hamstrings",
	"calves",
] as const;
export type MuscleId = (typeof MUSCLES)[number];

export const MUSCLE_LABELS: Record<MuscleId, string> = translated({
	chest: "Hrudník",
	shoulders: "Ramena",
	biceps: "Biceps",
	triceps: "Triceps",
	forearms: "Předloktí",
	abs: "Břicho",
	obliques: "Šikmé břišní",
	traps: "Trapézy",
	lats: "Záda",
	lowback: "Spodní záda",
	glutes: "Hýždě",
	quads: "Stehna přední",
	hamstrings: "Stehna zadní",
	calves: "Lýtka",
});

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = translated({
	mon: "Po",
	tue: "Út",
	wed: "St",
	thu: "Čt",
	fri: "Pá",
	sat: "So",
	sun: "Ne",
});

export const EVIDENCE_LEVELS = ["research", "consensus", "practice"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = translated({
	research: "výzkum",
	consensus: "konsenzus",
	practice: "praxe",
});

/** Kdy se suplement bere. */
export const SUPPLEMENT_TIMINGS = ["morning", "pre_workout", "post_workout", "evening", "with_meal", "any"] as const;
export type SupplementTiming = (typeof SUPPLEMENT_TIMINGS)[number];

export const SUPPLEMENT_TIMING_LABELS: Record<SupplementTiming, string> = translated({
	morning: "ráno",
	pre_workout: "před tréninkem",
	post_workout: "po tréninku",
	evening: "večer",
	with_meal: "s jídlem",
	any: "kdykoli",
});

export const BLOCK_TYPES = ["sets", "hold", "emom", "amrap", "ladder", "complex", "timed"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_LABELS: Record<BlockType, string> = translated({
	sets: "Série",
	hold: "Výdrž",
	emom: "EMOM",
	amrap: "AMRAP",
	ladder: "Žebřík",
	complex: "Komplex",
	timed: "Na čas",
});

export const EXERCISE_CATEGORIES = ["strength", "calisthenics", "kettlebell", "cardio", "mobility"] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const EXERCISE_KINDS = ["grind", "ballistic", "hold"] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

export const EXERCISE_MEASURES = ["reps_kg", "reps_bw", "seconds", "distance", "time"] as const;
export type ExerciseMeasure = (typeof EXERCISE_MEASURES)[number];

export const RUN_TYPES = ["easy", "long", "tempo", "intervals", "race"] as const;
export type RunType = (typeof RUN_TYPES)[number];

export const SWIM_STYLES = ["freestyle", "breaststroke", "backstroke", "butterfly", "mixed"] as const;
export type SwimStyle = (typeof SWIM_STYLES)[number];

export const TEST_TYPES = ["max_reps", "max_reps_timed", "max_hold", "1rm", "run_time"] as const;
export type TestType = (typeof TEST_TYPES)[number];

/** Stav bolesti / zranění (SPEC 4.6). */
export const PAIN_STATUSES = ["active", "improving", "resolved"] as const;
export type PainStatus = (typeof PAIN_STATUSES)[number];

export const PAIN_STATUS_LABELS: Record<PainStatus, string> = translated({
	active: "aktivní",
	improving: "zlepšuje se",
	resolved: "vyřešená",
});

export const BODY_SIDES = ["left", "right", "both"] as const;
export type BodySide = (typeof BODY_SIDES)[number];

export const BODY_SIDE_LABELS: Record<BodySide, string> = translated({ left: "vlevo", right: "vpravo", both: "obě strany" });

/** Typy cílů (SPEC 4.6). */
export const GOAL_TYPES = ["run_time", "lift_1rm", "reps_max", "skill_level", "weekly_volume", "body_weight", "norm"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = translated({
	run_time: "Čas na trati",
	lift_1rm: "Síla (1RM)",
	reps_max: "Maximum opakování nebo výdrže",
	skill_level: "Stupeň dovednosti",
	weekly_volume: "Kilometry běhu za týden",
	body_weight: "Tělesná hmotnost",
	norm: "Splnění normy",
});

export const GOAL_STATUSES = ["active", "done", "dropped"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** Co se v disciplíně normy měří. */
export const NORM_KINDS = ["reps", "hold", "run_time"] as const;
export type NormKind = (typeof NORM_KINDS)[number];

export const NORM_KIND_LABELS: Record<NormKind, string> = translated({
	reps: "opakování",
	hold: "výdrž",
	run_time: "čas běhu",
});

/** Plánovaná intenzita tréninku v plánu týdne (SPEC 4.8). */
export const PLAN_INTENSITIES = ["low", "mid", "high"] as const;
export type PlanIntensity = (typeof PLAN_INTENSITIES)[number];

export const PLAN_INTENSITY_LABELS: Record<PlanIntensity, string> = translated({ low: "lehká", mid: "střední", high: "těžká" });

/** Označení pracovní série: drop série (hned po předchozí s nižší vahou) nebo série do selhání. */
export const SET_TAGS = ["drop", "failure"] as const;
export type SetTag = (typeof SET_TAGS)[number];

export const SET_TAG_LABELS: Record<SetTag, string> = translated({ drop: "drop série", failure: "do selhání" });
/** Zkratka v tabulce sérií – česky D / S (selhání), anglicky D / F (failure). */
export const SET_TAG_SHORT: Record<SetTag, string> = translated({ drop: "D", failure: "S" });

/** Důvod volného dne v plánu týdne (SPEC 5.16). Nemoc a dovolená omlouvají série dnů; běžné volno ne. */
export const DAY_OFF_REASONS = ["rest", "illness", "vacation"] as const;
export type DayOffReason = (typeof DAY_OFF_REASONS)[number];

export const DAY_OFF_LABELS: Record<DayOffReason, string> = translated({ rest: "volno", illness: "nemoc", vacation: "dovolená" });

export const PROGRESSION_RULES = ["none", "weekly_add", "retest_pct_of_max"] as const;
export type ProgressionRule = (typeof PROGRESSION_RULES)[number];
