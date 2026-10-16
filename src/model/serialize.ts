// Převod modelu na frontmatter pro zápis. Opak parserů v parse.ts:
// odkazy dostanou zpět [[ ]], pořadí klíčů odpovídá SPEC kap. 4,
// prázdné hodnoty se vynechají, aby poznámky zůstaly přehledné.

import { toLink } from "./links";
import type {
	Block,
	ExerciseNote,
	GearNote,
	GoalNote,
	NormNote,
	PainNote,
	PlanItem,
	ProgramItem,
	ProgramNote,
	ProgramTarget,
	SetEntry,
	SupplementNote,
	TemplateNote,
	TestNote,
	WeekSchedule,
	WorkoutNote,
} from "./types";

type Frontmatter = Record<string, unknown>;

function withoutEmpty(obj: Frontmatter): Frontmatter {
	const out: Frontmatter = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === null || value === "") continue;
		out[key] = value;
	}
	return out;
}

export function exerciseToFrontmatter(note: ExerciseNote): Frontmatter {
	return withoutEmpty({
		forma: "exercise",
		schema: note.schema,
		name: note.name,
		aliases: note.aliases,
		category: note.category,
		kind: note.kind,
		measure: note.measure,
		muscles: { primary: note.muscles.primary, secondary: note.muscles.secondary },
		bodyweight_fraction: note.bodyweight_fraction,
		bodyweight_fraction_source: note.bodyweight_fraction_source,
		progression: note.progression
			? withoutEmpty({
					ladder: note.progression.ladder ? toLink(note.progression.ladder) : undefined,
					level: note.progression.level,
				})
			: undefined,
		description: note.description,
		technique: note.technique,
		mistakes: note.mistakes,
	});
}

// ---------- Trénink a šablona ----------

function setToFrontmatter(set: SetEntry): Frontmatter {
	return withoutEmpty({
		reps: set.reps,
		kg: set.kg,
		added_kg: set.added_kg,
		sec: set.sec,
		rir: set.rir,
		warmup: set.warmup ? true : undefined,
		tag: set.warmup ? undefined : set.tag,
	});
}

function itemsToFrontmatter<T extends { exercise: string }>(items: T[]): Frontmatter[] {
	return items.map((item) => withoutEmpty({ ...item, exercise: toLink(item.exercise) }));
}

export function blockToFrontmatter(block: Block): Frontmatter {
	switch (block.type) {
		case "sets":
		case "hold":
			return withoutEmpty({ type: block.type, exercise: toLink(block.exercise), sets: block.sets.map(setToFrontmatter), superset: block.superset ? true : undefined });
		case "amrap":
		case "complex":
			return withoutEmpty({ ...block, items: itemsToFrontmatter(block.items) });
		default:
			return withoutEmpty({ ...block, exercise: toLink(block.exercise) });
	}
}

/** Klíče tréninku, které spravuje plugin (při úpravě se ostatní klíče zachovají). */
export const WORKOUT_KEYS = [
	"forma",
	"schema",
	"date",
	"start",
	"sport",
	"title",
	"template",
	"program",
	"duration_min",
	"rpe",
	"source",
	"strava_id",
	"run",
	"swim",
	"rope",
	"blocks",
	"pain",
	"notes",
] as const;

export function workoutToFrontmatter(note: WorkoutNote): Frontmatter {
	return withoutEmpty({
		forma: "workout",
		schema: note.schema,
		date: note.date,
		start: note.start,
		sport: note.sport,
		title: note.title,
		template: note.template ? toLink(note.template) : undefined,
		program: note.program ? toLink(note.program) : undefined,
		duration_min: note.duration_min,
		rpe: note.rpe,
		source: note.source,
		strava_id: note.strava_id,
		run: note.run ? withoutEmpty({ ...note.run, shoes: note.run.shoes ? toLink(note.run.shoes) : undefined }) : undefined,
		swim: note.swim ? withoutEmpty({ ...note.swim }) : undefined,
		rope: note.rope && note.rope.jumps !== undefined ? { jumps: note.rope.jumps } : undefined,
		blocks: note.blocks.length > 0 ? note.blocks.map(blockToFrontmatter) : undefined,
		pain: note.pain.map(toLink),
		notes: note.notes,
	});
}

export function templateToFrontmatter(note: TemplateNote): Frontmatter {
	return withoutEmpty({
		forma: "template",
		schema: note.schema,
		name: note.name,
		sport: note.sport,
		blocks: note.blocks.map((block) =>
			withoutEmpty({
				...block,
				exercise: block.exercise ? toLink(block.exercise) : undefined,
				items: block.items ? itemsToFrontmatter(block.items) : undefined,
			}),
		),
		notes: note.notes,
	});
}

// ---------- Program ----------

function targetToFrontmatter(target: ProgramTarget): Frontmatter {
	if (target.kind === "intervals") {
		return withoutEmpty({
			kind: target.kind,
			warmup_s: target.warmup_s,
			steps: target.steps.map((s) => withoutEmpty({ repeats: s.repeats, work_s: s.work_s, rest_s: s.rest_s })),
			cooldown_s: target.cooldown_s,
		});
	}
	return { ...target };
}

function weekToFrontmatter(week: WeekSchedule): Frontmatter {
	return withoutEmpty({
		week: week.week,
		exercise: week.exercise ? toLink(week.exercise) : undefined,
		target: week.target ? targetToFrontmatter(week.target) : undefined,
		sessions: week.sessions?.map(targetToFrontmatter),
	});
}

function itemToFrontmatter(item: ProgramItem): Frontmatter {
	return withoutEmpty({
		exercise: toLink(item.exercise),
		target: targetToFrontmatter(item.target),
		days: item.days,
		max_from: item.max_from?.map(toLink),
		schedule: item.schedule?.map(weekToFrontmatter),
	});
}

/** Zápis testu maxima. */
export function testToFrontmatter(note: TestNote): Frontmatter {
	return withoutEmpty({
		forma: "test",
		schema: note.schema,
		date: note.date,
		exercise: toLink(note.exercise),
		test_type: note.test_type,
		time_limit_s: note.time_limit_s,
		result: note.result,
		distance_km: note.distance_km,
		notes: note.notes,
	});
}

export function planItemToFrontmatter(item: PlanItem): Frontmatter {
	return withoutEmpty({
		id: item.id,
		date: item.date,
		sport: item.sport,
		title: item.title,
		template: item.template ? toLink(item.template) : undefined,
		duration_min: item.duration_min,
		intensity: item.intensity,
		distance_km: item.distance_km,
		notes: item.notes,
	});
}

export function gearToFrontmatter(note: GearNote): Frontmatter {
	return withoutEmpty({
		forma: "gear",
		schema: note.schema,
		kind: note.kind,
		name: note.name,
		start_km: note.start_km,
		limit_km: note.limit_km,
		active: note.active,
		notes: note.notes,
	});
}

export function painToFrontmatter(note: PainNote): Frontmatter {
	return withoutEmpty({
		forma: "pain",
		schema: note.schema,
		name: note.name,
		muscle: note.muscle,
		side: note.side,
		level: note.level,
		since: note.since,
		trigger: note.trigger,
		status: note.status,
		history: note.history.map((entry) => ({ date: entry.date, level: entry.level })),
		notes: note.notes,
	});
}

export function goalToFrontmatter(note: GoalNote): Frontmatter {
	return withoutEmpty({
		forma: "goal",
		schema: note.schema,
		name: note.name,
		type: note.type,
		target: note.target,
		exercise: note.exercise ? toLink(note.exercise) : undefined,
		distance_km: note.distance_km,
		ladder: note.ladder ? toLink(note.ladder) : undefined,
		norm: note.norm ? toLink(note.norm) : undefined,
		created: note.created,
		deadline: note.deadline,
		start_value: note.start_value,
		status: note.status,
		notes: note.notes,
	});
}

export function normToFrontmatter(note: NormNote): Frontmatter {
	return withoutEmpty({
		forma: "norm",
		schema: note.schema,
		name: note.name,
		items: note.items.map((item) =>
			withoutEmpty({
				exercise: toLink(item.exercise),
				kind: item.kind,
				time_limit_s: item.time_limit_s,
				distance_km: item.distance_km,
				rows: item.rows.map((row) => withoutEmpty({ ...row })),
			}),
		),
		notes: note.notes,
	});
}

export function supplementToFrontmatter(note: SupplementNote): Frontmatter {
	return withoutEmpty({
		forma: "supplement",
		schema: note.schema,
		name: note.name,
		catalog: note.catalog,
		dose: note.dose,
		unit: note.unit,
		timing: note.timing,
		training_days_only: note.training_days_only,
		active: note.active,
		since: note.since,
		notes: note.notes,
		ingredients: note.ingredients?.map((i) => withoutEmpty({ name: i.name, amount: i.amount, unit: i.unit, catalog: i.catalog })),
	});
}

export function programToFrontmatter(note: ProgramNote): Frontmatter {
	return withoutEmpty({
		forma: "program",
		schema: note.schema,
		name: note.name,
		builtin: note.builtin,
		evidence: note.evidence,
		sources: note.sources,
		duration_weeks: note.duration_weeks,
		days: note.days,
		items: note.items.map(itemToFrontmatter),
		progression: withoutEmpty({ ...note.progression }),
		retest_every_weeks: note.retest_every_weeks,
		active: note.active,
		active_since: note.active_since,
		session_min: note.session_min,
		intensity: note.intensity,
		notes: note.notes,
	});
}
