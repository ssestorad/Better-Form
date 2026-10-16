// Rozepsaný trénink ve formuláři: model, předvyplnění (šablona, „z minula“,
// návrh navýšení), validace a převod na poznámku / šablonu. Bez Obsidianu.

import type { PainReport } from "../../calc/pain";
import { performanceSets, type ExercisePerformance } from "../../calc/performance";
import { suggestProgression, type ProgressionExercise, type ProgressionOptions } from "../../calc/progression";
import type { BlockType, ExerciseKind, ExerciseMeasure, RunType, Sport, SwimStyle } from "../../model/constants";
import { isIsoDate } from "../../model/dates";
import type {
	Block,
	BlockItem,
	SetEntry,
	TargetWeight,
	TemplateBlock,
	TemplateItem,
	TemplateNote,
	WorkoutNote,
	WorkoutSource,
} from "../../model/types";
import { t } from "../../i18n";

// ---------- Model formuláře ----------

export interface DraftItem extends BlockItem {
	id: string;
}

/** Jednotný tvar bloku ve formuláři; při uložení se převede na konkrétní typ. */
export interface DraftBlock {
	id: string;
	type: BlockType;
	exercise?: string;
	sets: SetEntry[];
	items: DraftItem[];
	steps: number[];
	minutes?: number;
	reps_per_min?: number;
	rounds?: number;
	extra_reps?: number;
	rpe?: number;
	sec?: number;
	reps?: number;
	kg?: number;
	added_kg?: number;
	/** Superset s předchozím blokem (jen sets a hold). */
	superset?: boolean;
	/** Série z minula – pro „vrátit na minule“, když se předvyplnil návrh. */
	lastSets?: SetEntry[];
	/** Důvod návrhu navýšení (zobrazí se u cviku). */
	suggestion?: string;
	/** Cíl z programu slovy (zobrazí se u cviku). */
	targetNote?: string;
}

export interface WorkoutDraft {
	date: string;
	start?: string;
	sport: Sport;
	title?: string;
	template?: string;
	program?: string;
	duration_min?: number;
	rpe?: number;
	notes?: string;
	run: {
		distance_km?: number;
		moving_time_s?: number;
		avg_hr?: number;
		max_hr?: number;
		elevation_m?: number;
		type?: RunType;
		shoes?: string;
		hr_zone_s?: number[];
	};
	swim: { distance_m?: number; style?: SwimStyle; pool_m?: number };
	rope: { jumps?: number };
	blocks: DraftBlock[];
	/** Zachováno z existující poznámky při úpravě. */
	source: WorkoutSource;
	strava_id?: number;
	pain: string[];
	/** Bolest zapsaná při tréninku – při uložení vytvoří nebo aktualizuje záznam bolesti. */
	painReport?: PainReport;
}

let sequence = 0;
export function newId(): string {
	sequence += 1;
	return `bf${sequence}`;
}

export function emptyBlock(type: BlockType, exercise?: string): DraftBlock {
	return { id: newId(), type, exercise, sets: [], items: [], steps: [] };
}

export function emptyItem(exercise: string): DraftItem {
	return { id: newId(), exercise };
}

export function emptyDraft(date: string, sport: Sport, start?: string): WorkoutDraft {
	return { date, start, sport, run: {}, swim: {}, rope: {}, blocks: [], source: "manual", pain: [] };
}

// ---------- Poznámka → formulář ----------

function blockToDraft(block: Block): DraftBlock {
	const draft = emptyBlock(block.type);
	switch (block.type) {
		case "sets":
		case "hold":
			return { ...draft, exercise: block.exercise, sets: block.sets.map((s) => ({ ...s })), ...(block.superset ? { superset: true } : {}) };
		case "amrap":
		case "complex": {
			const { items, ...rest } = block;
			return { ...draft, ...rest, id: draft.id, items: items.map((i) => ({ ...i, id: newId() })) };
		}
		case "ladder":
			return { ...draft, ...block, id: draft.id, steps: [...block.steps], sets: [], items: [] };
		default:
			return { ...draft, ...block, id: draft.id, sets: [], items: [], steps: [] };
	}
}

export function workoutToDraft(note: WorkoutNote): WorkoutDraft {
	return {
		date: note.date,
		start: note.start,
		sport: note.sport,
		title: note.title,
		template: note.template,
		program: note.program,
		duration_min: note.duration_min,
		rpe: note.rpe,
		notes: note.notes,
		run: { ...note.run },
		swim: { ...note.swim },
		rope: { ...note.rope },
		blocks: note.blocks.map(blockToDraft),
		source: note.source,
		strava_id: note.strava_id,
		pain: [...note.pain],
	};
}

// ---------- Formulář → poznámka ----------

function isNumber(value: number | undefined): value is number {
	return value !== undefined && !Number.isNaN(value);
}

function defined<T extends object>(obj: T): T {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value))) continue;
		out[key] = value;
	}
	return out as T;
}

function cleanSet(set: SetEntry): SetEntry | null {
	const clean = defined<SetEntry>({ reps: set.reps, kg: set.kg, added_kg: set.added_kg, sec: set.sec, rir: set.rir });
	if (Object.keys(clean).length === 0) return null;
	if (set.warmup) clean.warmup = true;
	else if (set.tag) clean.tag = set.tag;
	return clean;
}

function cleanItems(items: DraftItem[]): BlockItem[] {
	return items
		.filter((i) => i.exercise.trim() !== "")
		.map((i) => defined<BlockItem>({ exercise: i.exercise, reps: i.reps, kg: i.kg, added_kg: i.added_kg, sec: i.sec }));
}

/** Převod bloku; neúplný blok (bez cviku, bez sérií…) vrátí null. */
export function draftBlockToBlock(b: DraftBlock): Block | null {
	const exercise = b.exercise?.trim();
	switch (b.type) {
		case "sets":
		case "hold": {
			const sets = b.sets.map(cleanSet).filter((s): s is SetEntry => s !== null);
			if (!exercise || sets.length === 0) return null;
			return b.superset ? { type: b.type, exercise, sets, superset: true } : { type: b.type, exercise, sets };
		}
		case "emom":
			if (!exercise || !isNumber(b.minutes) || !isNumber(b.reps_per_min)) return null;
			return defined({
				type: "emom" as const,
				exercise,
				minutes: b.minutes,
				reps_per_min: b.reps_per_min,
				kg: b.kg,
				added_kg: b.added_kg,
				rounds: b.rounds,
				rpe: b.rpe,
			});
		case "amrap": {
			const items = cleanItems(b.items);
			if (!isNumber(b.minutes) || items.length === 0) return null;
			return defined({
				type: "amrap" as const,
				minutes: b.minutes,
				items,
				rounds: isNumber(b.rounds) ? b.rounds : 0,
				extra_reps: b.extra_reps,
				rpe: b.rpe,
			});
		}
		case "ladder":
			if (!exercise || b.steps.length === 0) return null;
			return defined({ type: "ladder" as const, exercise, steps: [...b.steps], kg: b.kg, added_kg: b.added_kg });
		case "complex": {
			const items = cleanItems(b.items);
			if (items.length === 0) return null;
			return defined({ type: "complex" as const, items, rounds: isNumber(b.rounds) ? b.rounds : 0, kg: b.kg, rpe: b.rpe });
		}
		case "timed":
			if (!exercise || !isNumber(b.sec)) return null;
			return defined({ type: "timed" as const, exercise, sec: b.sec, reps: b.reps, kg: b.kg, added_kg: b.added_kg });
	}
}

/** První blok nemá s čím tvořit superset – příznak se u něj zahodí (např. po přesunutí bloků). */
function withoutLeadingSuperset(blocks: Block[]): Block[] {
	const first = blocks[0];
	if (first && (first.type === "sets" || first.type === "hold") && first.superset) {
		const { superset: _superset, ...rest } = first;
		return [rest, ...blocks.slice(1)];
	}
	return blocks;
}

export function draftToWorkout(draft: WorkoutDraft, schema: number): WorkoutNote {
	const run = draft.sport === "run" ? defined({ ...draft.run, shoes: draft.run.shoes?.trim() }) : {};
	const swim = draft.sport === "swim" ? defined({ ...draft.swim }) : {};
	const rope = draft.sport === "rope" ? defined({ ...draft.rope }) : {};
	// U běhu bez vyplněné délky tréninku se délka vezme z času běhu.
	const duration =
		draft.duration_min ??
		(draft.sport === "run" && isNumber(draft.run.moving_time_s) ? Math.round(draft.run.moving_time_s / 60) : undefined);
	return defined<WorkoutNote>({
		forma: "workout",
		schema,
		date: draft.date,
		start: draft.start,
		sport: draft.sport,
		title: draft.title?.trim(),
		template: draft.template,
		program: draft.program,
		duration_min: duration,
		rpe: draft.rpe,
		source: draft.source,
		strava_id: draft.strava_id,
		run: Object.keys(run).length > 0 ? run : undefined,
		swim: Object.keys(swim).length > 0 ? swim : undefined,
		rope: Object.keys(rope).length > 0 ? rope : undefined,
		blocks: withoutLeadingSuperset(draft.blocks.map(draftBlockToBlock).filter((b): b is Block => b !== null)),
		pain: draft.pain,
		notes: draft.notes?.trim(),
	});
}

// ---------- Validace ----------

export type DraftErrors = Record<string, string>;

function check(
	errors: DraftErrors,
	key: string,
	value: number | undefined,
	min: number,
	max: number,
	integer = false,
): void {
	if (value === undefined) return;
	if (Number.isNaN(value)) errors[key] = t("Not a number.");
	else if (integer && !Number.isInteger(value)) errors[key] = t("Whole number.");
	else if (value < min || value > max) errors[key] = `${min}–${max}`;
}

/** Klíč chyby pro pole série: `set:<id bloku>:<index>:<pole>`. */
export function setErrorKey(blockId: string, index: number, field: keyof SetEntry): string {
	return `set:${blockId}:${index}:${field}`;
}

/** Klíč chyby pro pole bloku nebo položky: `block:<id>:<pole>`. */
export function blockErrorKey(id: string, field: string): string {
	return `block:${id}:${field}`;
}

export function validateDraft(draft: WorkoutDraft): DraftErrors {
	const errors: DraftErrors = {};
	if (!isIsoDate(draft.date)) errors.date = t("Invalid date.");
	check(errors, "duration_min", draft.duration_min, 1, 1440);
	check(errors, "rpe", draft.rpe, 0, 10);
	if (draft.sport === "run") {
		check(errors, "run.distance_km", draft.run.distance_km, 0.01, 500);
		check(errors, "run.moving_time_s", draft.run.moving_time_s, 1, 200000);
		check(errors, "run.avg_hr", draft.run.avg_hr, 30, 250, true);
		check(errors, "run.max_hr", draft.run.max_hr, 30, 250, true);
		check(errors, "run.elevation_m", draft.run.elevation_m, 0, 20000);
	}
	if (draft.sport === "swim") {
		check(errors, "swim.distance_m", draft.swim.distance_m, 1, 100000);
		check(errors, "swim.pool_m", draft.swim.pool_m, 10, 100);
	}
	if (draft.sport === "rope") check(errors, "rope.jumps", draft.rope.jumps, 1, 1000000, true);
	for (const b of draft.blocks) {
		b.sets.forEach((set, i) => {
			check(errors, setErrorKey(b.id, i, "reps"), set.reps, 0, 1000, true);
			check(errors, setErrorKey(b.id, i, "kg"), set.kg, 0, 1000);
			check(errors, setErrorKey(b.id, i, "added_kg"), set.added_kg, -500, 500);
			check(errors, setErrorKey(b.id, i, "sec"), set.sec, 0, 36000);
			check(errors, setErrorKey(b.id, i, "rir"), set.rir, 0, 10, true);
		});
		for (const field of ["minutes", "reps_per_min", "rounds", "extra_reps", "sec", "reps"] as const) {
			check(errors, blockErrorKey(b.id, field), b[field], 0, 100000);
		}
		check(errors, blockErrorKey(b.id, "rpe"), b.rpe, 0, 10);
		check(errors, blockErrorKey(b.id, "kg"), b.kg, 0, 1000);
		for (const item of b.items) {
			check(errors, blockErrorKey(item.id, "reps"), item.reps, 0, 1000, true);
			check(errors, blockErrorKey(item.id, "kg"), item.kg, 0, 1000);
		}
		const missing = missingBlockField(b);
		if (missing) errors[blockErrorKey(b.id, "missing")] = missing;
	}
	return errors;
}

/** Co bloku chybí, aby šel uložit (prázdný blok série se jen vynechá). */
function missingBlockField(b: DraftBlock): string | null {
	const needsExercise = b.type !== "amrap" && b.type !== "complex";
	if (needsExercise && !b.exercise?.trim()) return t("Choose an exercise.");
	switch (b.type) {
		case "emom":
			return !isNumber(b.minutes) || !isNumber(b.reps_per_min) ? t("Fill in the minutes and reps per minute.") : null;
		case "amrap":
			if (!isNumber(b.minutes)) return t("Fill in the duration in minutes.");
			return cleanItems(b.items).length === 0 ? t("Add at least one exercise.") : null;
		case "complex":
			return cleanItems(b.items).length === 0 ? t("Add at least one exercise.") : null;
		case "ladder":
			return b.steps.length === 0 ? t("Fill in the rungs, e.g. 1-5.") : null;
		case "timed":
			return !isNumber(b.sec) ? t("Fill in the time.") : null;
		default:
			return null;
	}
}

// ---------- Předvyplnění ----------

export interface ExerciseInfo extends ProgressionExercise {
	kind: ExerciseKind;
}

export interface PrefillContext {
	/** Údaje o cviku z knihovny (podle názvu nebo aliasu). */
	info(exercise: string): ExerciseInfo | undefined;
	/** Poslední výkon cviku. */
	last(exercise: string): ExercisePerformance | undefined;
	options: ProgressionOptions;
}

/** Cíl ze šablony pro blok série / výdrž. */
export interface SetsTarget {
	sets?: number;
	reps?: number;
	sec?: number;
	kg?: TargetWeight;
	added_kg?: TargetWeight;
}

function weightField(measure: ExerciseMeasure | undefined): "kg" | "added_kg" {
	return measure === "reps_bw" ? "added_kg" : "kg";
}

function maxDefined(values: (number | undefined)[]): number | undefined {
	const numbers = values.filter((v): v is number => v !== undefined);
	return numbers.length > 0 ? Math.max(...numbers) : undefined;
}

/**
 * Předvyplní blok série / výdrž: rozcvičovací série z minula + pracovní série
 * podle návrhu navýšení (SPEC 9.3). Bez historie: podle cíle šablony, jinak 1 prázdná série.
 */
export function prefillSetsBlock(block: DraftBlock, ctx: PrefillContext, target: SetsTarget = {}): DraftBlock {
	const exercise = block.exercise;
	if (!exercise) return block;
	const info = ctx.info(exercise);
	const lastSets = performanceSets(ctx.last(exercise));
	const warmups = lastSets.filter((s) => s.warmup).map(({ rir: _rir, ...s }) => s);
	const working = lastSets.filter((s) => !s.warmup);
	const count = target.sets ?? (working.length > 0 ? working.length : 1);
	const result: DraftBlock = { ...block, lastSets: lastSets.length > 0 ? lastSets : undefined, suggestion: undefined };

	// Výdrže a cviky na čas: sekundy z cíle nebo z minula.
	if (block.type === "hold" || info?.measure === "seconds") {
		const sec = target.sec ?? maxDefined(working.map((s) => s.sec));
		result.sets = [...warmups, ...Array.from({ length: count }, () => defined<SetEntry>({ sec }))];
		return result;
	}

	const field = weightField(info?.measure);
	const explicit = typeof target[field] === "number" ? (target[field] as number) : undefined;
	const suggestion = info && working.length > 0 ? suggestProgression(working, info, ctx.options, target.reps) : null;

	let reps = target.reps ?? working[0]?.reps;
	let weight = explicit ?? maxDefined(working.map((s) => s[field]));
	if (suggestion && suggestion.action !== "none") {
		reps = suggestion.reps;
		const suggested = suggestion.action === "increase_weight" ? suggestion.kg : suggestion[field];
		if (explicit === undefined && suggested !== undefined) weight = suggested;
		result.suggestion = suggestion.reason;
	}
	const set = defined<SetEntry>({ reps, [field]: weight === 0 && field === "added_kg" ? undefined : weight });
	result.sets = [...warmups, ...Array.from({ length: count }, () => ({ ...set }))];
	return result;
}

/** „Vrátit na minule“: série přesně jako minule (bez RIR – ten je pokaždé nový). */
export function revertToLast(block: DraftBlock): DraftBlock {
	if (!block.lastSets) return block;
	return { ...block, sets: block.lastSets.map(({ rir: _rir, ...s }) => ({ ...s })), suggestion: undefined };
}

/** Nový blok pro vybraný cvik: výdrž u cviků na čas, jinak série – rovnou předvyplněný z minula. */
export function newBlockForExercise(exercise: string, ctx: PrefillContext): DraftBlock {
	const type: BlockType = ctx.info(exercise)?.measure === "seconds" ? "hold" : "sets";
	return prefillSetsBlock(emptyBlock(type, exercise), ctx);
}

function lastBlockOfType(ctx: PrefillContext, exercise: string, type: BlockType): Block | undefined {
	return ctx.last(exercise)?.blocks.find((b) => b.type === type);
}

function resolveWeight(value: TargetWeight | undefined, last: number | undefined): number | undefined {
	return value === "last" ? last : value;
}

function lastItemWeight(ctx: PrefillContext, exercise: string): number | undefined {
	for (const block of ctx.last(exercise)?.blocks ?? []) {
		if (block.type === "amrap" || block.type === "complex") {
			const item = block.items.find((i) => i.exercise === exercise);
			if (item?.kg !== undefined) return item.kg;
		}
	}
	return undefined;
}

function templateItems(items: TemplateItem[] | undefined, ctx: PrefillContext): DraftItem[] {
	return (items ?? []).map((item) =>
		defined<DraftItem>({
			id: newId(),
			exercise: item.exercise,
			reps: item.reps,
			sec: item.sec,
			kg: resolveWeight(item.kg, lastItemWeight(ctx, item.exercise)),
		}),
	);
}

/** Blok ze šablony, předvyplněný posledními výkony a návrhem navýšení. */
export function templateBlockToDraft(t: TemplateBlock, ctx: PrefillContext): DraftBlock {
	const block = emptyBlock(t.type, t.exercise);
	const exercise = t.exercise ?? "";
	switch (t.type) {
		case "sets":
		case "hold":
			return t.superset ? { ...prefillSetsBlock(block, ctx, t), superset: true } : prefillSetsBlock(block, ctx, t);
		case "emom": {
			const last = lastBlockOfType(ctx, exercise, "emom");
			const lastKg = last?.type === "emom" ? last.kg : undefined;
			const lastAdded = last?.type === "emom" ? last.added_kg : undefined;
			return defined({
				...block,
				minutes: t.minutes,
				reps_per_min: t.reps_per_min,
				kg: resolveWeight(t.kg, lastKg),
				added_kg: resolveWeight(t.added_kg, lastAdded),
			});
		}
		case "amrap":
			return defined({ ...block, minutes: t.minutes, items: templateItems(t.items, ctx) });
		case "complex": {
			const first = t.items?.[0]?.exercise ?? "";
			const last = lastBlockOfType(ctx, first, "complex");
			return defined({
				...block,
				items: templateItems(t.items, ctx),
				rounds: t.rounds,
				kg: resolveWeight(t.kg, last?.type === "complex" ? last.kg : undefined),
			});
		}
		case "ladder": {
			const last = lastBlockOfType(ctx, exercise, "ladder");
			return defined({
				...block,
				steps: t.steps ?? [],
				kg: resolveWeight(t.kg, last?.type === "ladder" ? last.kg : undefined),
				added_kg: resolveWeight(t.added_kg, last?.type === "ladder" ? last.added_kg : undefined),
			});
		}
		case "timed": {
			const last = lastBlockOfType(ctx, exercise, "timed");
			return defined({
				...block,
				sec: t.sec,
				reps: t.reps,
				kg: resolveWeight(t.kg, last?.type === "timed" ? last.kg : undefined),
				added_kg: resolveWeight(t.added_kg, last?.type === "timed" ? last.added_kg : undefined),
			});
		}
	}
}

/** Nový trénink ze šablony. `templateLink` = cíl odkazu na poznámku šablony. */
export function templateToDraft(
	template: TemplateNote,
	templateLink: string,
	date: string,
	ctx: PrefillContext,
	start?: string,
): WorkoutDraft {
	return {
		...emptyDraft(date, template.sport, start),
		title: template.name,
		template: templateLink,
		blocks: template.blocks.map((t) => templateBlockToDraft(t, ctx)),
	};
}

// ---------- Formulář → šablona ----------

function lastIfDefined(values: (number | undefined)[]): TargetWeight | undefined {
	return values.some((v) => v !== undefined && v !== 0) ? "last" : undefined;
}

/** Šablona z formuláře: počty sérií a opakování, váhy „z minula“, bez rozcvičení. */
export function draftToTemplate(draft: WorkoutDraft, name: string, schema: number): TemplateNote {
	const blocks: TemplateBlock[] = [];
	for (const b of draft.blocks) {
		const block = draftBlockToBlock(b);
		if (!block) continue;
		switch (block.type) {
			case "sets":
			case "hold": {
				const working = block.sets.filter((s) => !s.warmup);
				if (working.length === 0) continue;
				blocks.push(
					defined<TemplateBlock>({
						type: block.type,
						exercise: block.exercise,
						sets: working.length,
						reps: working[0]!.reps,
						sec: working[0]!.reps === undefined ? working[0]!.sec : undefined,
						kg: lastIfDefined(working.map((s) => s.kg)),
						added_kg: lastIfDefined(working.map((s) => s.added_kg)),
						superset: block.superset && blocks.length > 0 ? true : undefined,
					}),
				);
				break;
			}
			case "emom":
				blocks.push(
					defined<TemplateBlock>({
						type: "emom",
						exercise: block.exercise,
						minutes: block.minutes,
						reps_per_min: block.reps_per_min,
						kg: lastIfDefined([block.kg]),
						added_kg: lastIfDefined([block.added_kg]),
					}),
				);
				break;
			case "amrap":
			case "complex":
				blocks.push(
					defined<TemplateBlock>({
						type: block.type,
						items: block.items.map((i) =>
							defined<TemplateItem>({ exercise: i.exercise, reps: i.reps, sec: i.sec, kg: lastIfDefined([i.kg]) }),
						),
						minutes: block.type === "amrap" ? block.minutes : undefined,
						rounds: block.type === "complex" ? block.rounds : undefined,
						kg: block.type === "complex" ? lastIfDefined([block.kg]) : undefined,
					}),
				);
				break;
			case "ladder":
				blocks.push(
					defined<TemplateBlock>({
						type: "ladder",
						exercise: block.exercise,
						steps: block.steps,
						kg: lastIfDefined([block.kg]),
						added_kg: lastIfDefined([block.added_kg]),
					}),
				);
				break;
			case "timed":
				blocks.push(
					defined<TemplateBlock>({
						type: "timed",
						exercise: block.exercise,
						sec: block.sec,
						reps: block.reps,
						kg: lastIfDefined([block.kg]),
						added_kg: lastIfDefined([block.added_kg]),
					}),
				);
				break;
		}
	}
	return defined<TemplateNote>({
		forma: "template",
		schema,
		name,
		sport: draft.sport,
		blocks,
		notes: undefined,
	});
}
