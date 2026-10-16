// Dnešní připravenost a doporučení (SPEC 5.1, 8.9, kap. 10): posbírá data
// z indexu a předá je čistým výpočtům v src/calc a src/rules.

import type { VolumeContext } from "../calc/muscleVolume";
import { planForDate } from "../calc/programs";
import { readiness, TREND_DAYS, type Readiness, type ReadinessDay } from "../calc/readiness";
import { exerciseSeries } from "../calc/records";
import { HARD_RPE } from "../calc/weekPlan";
import { WEEKDAYS } from "../model/constants";
import { addDays, startOfWeek } from "../model/dates";
import type { ExerciseNote } from "../model/types";
import { buildContext, evaluateRules } from "../rules/engine";
import type { Recommendation, RuleContext, RuleGoal, RulePlan } from "../rules/types";
import type { BetterFormSettings } from "../settings/settings";
import type { FormaIndex } from "./FormaIndex";
import type { GoalService } from "./GoalService";
import { planItemTitle } from "./planBlock";
import type { PlanEntry, PlanService } from "./PlanService";
import type { ProgramService } from "./ProgramService";

export interface Insights {
	context: RuleContext;
	recommendations: Recommendation[];
	readiness: Readiness | null;
}

export class InsightService {
	/** Týdenní kontrola výživy podle váhy (nastaví plugin – výživa je mimo tuto službu). */
	nutritionCheck: (today: string) => { stepKcal: number } | null = () => null;

	constructor(
		private readonly index: FormaIndex,
		private readonly programs: ProgramService,
		private readonly goals: GoalService,
		private readonly plans: PlanService,
		private readonly settings: () => BetterFormSettings,
		private readonly exerciseInfo: (exercise: string) => ExerciseNote | undefined,
		private readonly bodyweightKg: () => number | undefined,
	) {}

	volumeContext(): VolumeContext {
		const th = this.settings().thresholds;
		return {
			info: (exercise) => this.exerciseInfo(exercise),
			options: { rirMax: th.effectiveRirMax, minPct1rm: th.effectiveMinPct1rm, holdPctOfMax: th.holdEffectivePctOfMax, blockMinRpe: th.blockEffectiveMinRpe },
			bodyweightKg: this.bodyweightKg(),
			maxTests: this.index
				.all("test")
				.filter((x) => x.note.test_type === "max_reps")
				.map((x) => ({ date: x.note.date, exercise: x.note.exercise, reps: x.note.result })),
		};
	}

	/** Cíle pro pravidla: jen aktivní, s předpovědí podle trendu. */
	private ruleGoals(today: string): RuleGoal[] {
		const entries = this.goals.goals().filter((g) => g.note.status === "active");
		if (entries.length === 0) return [];
		const data = this.goals.data(today);
		return entries.map((entry) => {
			const evaluation = this.goals.evaluate(entry, today, data);
			return { name: entry.note.name, status: evaluation.status, overdue: evaluation.overdue, eta: evaluation.eta, deadline: entry.note.deadline };
		});
	}

	/** Plán týdne pro pravidla; null, když v tomto týdnu žádný není. */
	private rulePlan(today: string, pending: PlanEntry[]): RulePlan | null {
		const week = this.plans.view(startOfWeek(today), today);
		if (week.summary.planned === 0) return null;
		const yesterday = addDays(today, -1);
		const { outlook } = week;
		return {
			today: pending.map((e) => ({ id: e.item.id, date: e.item.date, label: e.program ? `program ${e.program.name}` : planItemTitle(e.item), intensity: e.item.intensity, movable: !e.program })),
			hardYesterday: this.index.all("workout").some((w) => w.note.date === yesterday && w.note.rpe !== undefined && w.note.rpe >= HARD_RPE),
			week: outlook.average !== null && outlook.ratio !== null ? { expected: outlook.expected, remaining: outlook.planned, average: outlook.average, ratio: outlook.ratio } : null,
		};
	}

	/** Cviky ze šablon dnešních nesplněných položek plánu. */
	private plannedTemplateExercises(pending: PlanEntry[]): string[] {
		const key = (text: string) => text.trim().toLocaleLowerCase("cs");
		const templates = this.index.all("template");
		return pending.flatMap((e) => {
			const name = e.item.template;
			if (!name) return [];
			const template = templates.find((x) => key(x.note.name) === key(name) || key(x.file.basename) === key(name));
			return template ? template.note.blocks.flatMap((b) => (b.exercise ? [b.exercise] : (b.items ?? []).map((i) => i.exercise))) : [];
		});
	}

	today(today: string, nowMs: number): Insights {
		const settings = this.settings();
		const workouts = this.index.all("workout").map((w) => w.note);
		const days = this.index.all("day").map((d) => d.note);
		const active = this.programs.active(today);
		const pending = this.plans.pending(today, today);

		// Denní výzvy bez volných dnů: program běží všech 7 dní a dnes má denní počítadlo.
		const challenges = active
			.filter(({ entry }) => entry.note.days.length === WEEKDAYS.length)
			.map(({ entry }) => ({
				name: entry.note.name,
				exercises: entry.note.items.flatMap((item) => {
					const plan = planForDate(entry.note, item, today);
					return plan && plan.target.kind === "daily_total" ? [plan.exercise] : [];
				}),
			}))
			.filter((c) => c.exercises.length > 0);

		const context = buildContext({
			today,
			nowMs,
			workouts,
			days,
			pains: this.index.all("pain").map((p) => p.note),
			thresholds: settings.thresholds,
			focusMuscles: settings.focusMuscles,
			volume: this.volumeContext(),
			series: exerciseSeries(workouts, { info: (e) => this.exerciseInfo(e), bodyweightKg: this.bodyweightKg() }),
			plannedExercises: [...active.flatMap((p) => p.tasks.filter((x) => !x.done).map((x) => x.exercise)), ...this.plannedTemplateExercises(pending)],
			plan: this.rulePlan(today, pending),
			nutritionCheck: this.nutritionCheck(today),
			challenges,
			goals: this.ruleGoals(today),
		});

		return { context, recommendations: evaluateRules(context), readiness: this.readinessOf(context, today) };
	}

	/** Připravenost dne z kontextu pravidel a check-inu toho dne. */
	private readinessOf(context: RuleContext, date: string): Readiness | null {
		const day = this.index.day(date)?.note;
		const hasFeelings = day !== undefined && Object.keys(day.check_in).length > 0;
		const sleep =
			context.sleep.lastMin !== null || day?.sleep.quality !== undefined
				? { durationMin: context.sleep.lastMin ?? undefined, quality: day?.sleep.quality, averageMin: context.sleep.averageMin }
				: null;
		return readiness({
			hrv: context.hrv,
			restingHr: context.restingHr,
			sleep,
			checkIn: hasFeelings ? day.check_in : null,
			form: context.form,
			sleepTargetHours: this.settings().thresholds.sleepTargetHours,
		});
	}

	/**
	 * Skóre připravenosti za posledních 14 dní (od nejstaršího) – každý den se
	 * počítá jen z toho, co bylo známé ten den. Den bez check-inu a HRV má null.
	 */
	readinessHistory(today: string, days = TREND_DAYS): ReadinessDay[] {
		const settings = this.settings();
		// Připravenost stojí na spánku, HRV, pocitech a zátěži (RPE × délka); bez bloků se nepočítá svalový objem 14× zbytečně.
		const workouts = this.index.all("workout").map((w) => ({ ...w.note, blocks: [] }));
		const dayNotes = this.index.all("day").map((d) => d.note);
		const volume = this.volumeContext();
		const out: ReadinessDay[] = [];
		for (let i = days - 1; i >= 0; i--) {
			const date = addDays(today, -i);
			// Bez denní poznámky není spánek, pocity ani HRV – skóre by stálo jen na zátěži.
			if (!this.index.day(date)) {
				out.push({ date, score: null });
				continue;
			}
			const context = buildContext({
				today: date,
				nowMs: Date.parse(`${date}T12:00:00`),
				workouts: workouts.filter((w) => w.date <= date),
				days: dayNotes.filter((d) => d.date <= date),
				pains: [],
				thresholds: settings.thresholds,
				focusMuscles: [],
				volume,
				series: new Map(),
				plannedExercises: [],
				challenges: [],
				goals: [],
			});
			out.push({ date, score: this.readinessOf(context, date)?.score ?? null });
		}
		return out;
	}
}
