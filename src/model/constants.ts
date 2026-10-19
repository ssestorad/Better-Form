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
	run: "Run",
	strength: "Gym",
	swim: "Swim",
	calisthenics: "Calisthenics",
	kettlebell: "Kettlebell",
	rope: "Jump rope",
	other: "Other",
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
	chest: "Chest",
	shoulders: "Shoulders",
	biceps: "Biceps",
	triceps: "Triceps",
	forearms: "Forearms",
	abs: "Abs",
	obliques: "Obliques",
	traps: "Traps",
	lats: "Back",
	lowback: "Lower back",
	glutes: "Glutes",
	quads: "Quads",
	hamstrings: "Hamstrings",
	calves: "Calves",
});

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = translated({
	mon: "Mon",
	tue: "Tue",
	wed: "Wed",
	thu: "Thu",
	fri: "Fri",
	sat: "Sat",
	sun: "Sun",
});

export const EVIDENCE_LEVELS = ["research", "consensus", "practice"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = translated({
	research: "research",
	consensus: "consensus",
	practice: "practice",
});

/** Kdy se suplement bere. */
export const SUPPLEMENT_TIMINGS = ["morning", "pre_workout", "post_workout", "evening", "with_meal", "any"] as const;
export type SupplementTiming = (typeof SUPPLEMENT_TIMINGS)[number];

export const SUPPLEMENT_TIMING_LABELS: Record<SupplementTiming, string> = translated({
	morning: "morning",
	pre_workout: "before training",
	post_workout: "after training",
	evening: "evening",
	with_meal: "with a meal",
	any: "any time",
});

export const BLOCK_TYPES = ["sets", "hold", "emom", "amrap", "ladder", "complex", "timed"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_LABELS: Record<BlockType, string> = translated({
	sets: "Sets",
	hold: "Hold",
	emom: "EMOM",
	amrap: "AMRAP",
	ladder: "Ladder",
	complex: "Complex",
	timed: "For time",
});

export const EXERCISE_CATEGORIES = ["strength", "calisthenics", "kettlebell", "cardio", "mobility"] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

/** Vybavení cviku po skupinách; "none" = jde i bez vybavení. */
export const EQUIPMENT_GROUPS = {
	none: ["none"],
	free_weights: ["barbell", "dumbbell", "kettlebell", "trap_bar", "plate", "landmine"],
	stations: ["bench", "rack", "pull_up_bar", "dip_bars", "rings", "box", "back_extension_bench", "preacher_bench"],
	machines: [
		"cable",
		"leg_press",
		"hack_squat_machine",
		"leg_curl_machine",
		"leg_extension_machine",
		"chest_press_machine",
		"shoulder_press_machine",
		"pec_deck",
		"row_machine",
		"hip_abduction_machine",
		"calf_raise_machine",
		"sled",
	],
	cardio_machines: ["treadmill", "stationary_bike", "rowing_machine", "elliptical", "ski_erg", "air_bike", "stair_climber"],
	accessories: ["band", "jump_rope", "ab_wheel", "foam_roller", "heavy_bag"],
	sport: ["bicycle", "pool", "skis", "inline_skates", "climbing_wall", "ball", "poles"],
} as const;
export type EquipmentGroup = keyof typeof EQUIPMENT_GROUPS;
export type EquipmentId = (typeof EQUIPMENT_GROUPS)[EquipmentGroup][number];
export const EQUIPMENT: EquipmentId[] = Object.values(EQUIPMENT_GROUPS).flat();

export const EQUIPMENT_GROUP_LABELS: Record<EquipmentGroup, string> = translated({
	none: "Without equipment",
	free_weights: "Free weights",
	stations: "Benches, racks and bars",
	machines: "Machines",
	cardio_machines: "Cardio machines",
	accessories: "Accessories",
	sport: "Sport",
});

export const EQUIPMENT_LABELS: Record<EquipmentId, string> = translated({
	none: "no equipment",
	barbell: "barbell",
	dumbbell: "dumbbells",
	kettlebell: "kettlebell",
	trap_bar: "trap bar",
	plate: "weight plate",
	landmine: "landmine",
	bench: "bench",
	rack: "squat rack",
	pull_up_bar: "pull-up bar",
	dip_bars: "dip bars / power tower",
	rings: "gymnastic rings",
	box: "box or step",
	back_extension_bench: "back extension bench",
	preacher_bench: "preacher bench",
	cable: "cable machine",
	leg_press: "leg press",
	hack_squat_machine: "hack squat machine",
	leg_curl_machine: "leg curl machine",
	leg_extension_machine: "leg extension machine",
	chest_press_machine: "chest press machine",
	shoulder_press_machine: "shoulder press machine",
	pec_deck: "pec deck",
	row_machine: "row machine",
	hip_abduction_machine: "hip abduction machine",
	calf_raise_machine: "calf raise machine",
	sled: "sled",
	treadmill: "treadmill",
	stationary_bike: "stationary bike",
	rowing_machine: "rowing machine",
	elliptical: "elliptical trainer",
	ski_erg: "SkiErg",
	air_bike: "air bike",
	stair_climber: "stair climber",
	band: "resistance band",
	jump_rope: "jump rope",
	ab_wheel: "ab wheel",
	foam_roller: "foam roller",
	heavy_bag: "heavy bag",
	bicycle: "bicycle",
	pool: "swimming pool",
	skis: "skis",
	inline_skates: "inline skates",
	climbing_wall: "climbing wall",
	ball: "ball",
	poles: "poles",
});

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
	active: "active",
	improving: "improving",
	resolved: "resolved",
});

export const BODY_SIDES = ["left", "right", "both"] as const;
export type BodySide = (typeof BODY_SIDES)[number];

export const BODY_SIDE_LABELS: Record<BodySide, string> = translated({ left: "left", right: "right", both: "both sides" });

/** Typy cílů (SPEC 4.6). */
export const GOAL_TYPES = ["run_time", "lift_1rm", "reps_max", "skill_level", "weekly_volume", "body_weight", "norm"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = translated({
	run_time: "Race time",
	lift_1rm: "Strength (1RM)",
	reps_max: "Max reps or hold",
	skill_level: "Skill level",
	weekly_volume: "Running km per week",
	body_weight: "Body weight",
	norm: "Standard met",
});

export const GOAL_STATUSES = ["active", "done", "dropped"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** Co se v disciplíně normy měří. */
export const NORM_KINDS = ["reps", "hold", "run_time"] as const;
export type NormKind = (typeof NORM_KINDS)[number];

export const NORM_KIND_LABELS: Record<NormKind, string> = translated({
	reps: "reps",
	hold: "hold",
	run_time: "run time",
});

/** Plánovaná intenzita tréninku v plánu týdne (SPEC 4.8). */
export const PLAN_INTENSITIES = ["low", "mid", "high"] as const;
export type PlanIntensity = (typeof PLAN_INTENSITIES)[number];

export const PLAN_INTENSITY_LABELS: Record<PlanIntensity, string> = translated({ low: "easy", mid: "moderate", high: "hard" });

/** Označení pracovní série: drop série (hned po předchozí s nižší vahou) nebo série do selhání. */
export const SET_TAGS = ["drop", "failure"] as const;
export type SetTag = (typeof SET_TAGS)[number];

export const SET_TAG_LABELS: Record<SetTag, string> = translated({ drop: "drop set", failure: "to failure" });
/** Zkratka v tabulce sérií – česky D / S (selhání), anglicky D / F (failure). */
export const SET_TAG_SHORT: Record<SetTag, string> = translated({ drop: "D", failure: "F" });

/** Důvod volného dne v plánu týdne (SPEC 5.16). Nemoc a dovolená omlouvají série dnů; běžné volno ne. */
export const DAY_OFF_REASONS = ["rest", "illness", "vacation"] as const;
export type DayOffReason = (typeof DAY_OFF_REASONS)[number];

export const DAY_OFF_LABELS: Record<DayOffReason, string> = translated({ rest: "rest", illness: "illness", vacation: "vacation" });

export const PROGRESSION_RULES = ["none", "weekly_add", "retest_pct_of_max"] as const;
export type ProgressionRule = (typeof PROGRESSION_RULES)[number];
