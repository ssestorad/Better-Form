// Pravidla doporučení (SPEC kap. 10, minimum pro fázi 4). Každé pravidlo je čistá
// funkce kontextu a má zdroje a štítek; heuristiky jsou označené jako praxe.
// Plugin nediagnostikuje – u bolesti jen odkazuje na odborníka.

import { HARD_RPE } from "../calc/weekPlan";
import { MUSCLE_LABELS, type MuscleId } from "../model/constants";
import { addDays } from "../model/dates";
import { formatCzechDate, formatDays, formatDurationMin, formatNumber, formatShortDate } from "../ui/format";
import type { RecommendationAction, Rule, RuleContext, RuleOutput, RulePlanItem } from "./types";
import { t, tn } from "../i18n";

/** O kolik minut pod osobním průměrem je spánek „výrazně kratší“. */
export const SLEEP_BELOW_AVERAGE_MIN = 60;
/** O kolik hodin pod cílem je už varování, ne jen návrh. */
export const SLEEP_WARN_HOURS_BELOW = 2;

const muscleList = (muscles: readonly MuscleId[]) => muscles.map((m) => MUSCLE_LABELS[m]).join(", ");

/** Těžký trénink z dnešního plánu týdne, který ještě není zapsaný. */
const hardPlanned = (ctx: RuleContext): RulePlanItem | undefined => ctx.plan?.today.find((i) => i.intensity === "high");

/**
 * K doporučení „dnes lehčeji“: co těžkého je dnes v plánu a nabídka přesunout to
 * na zítřek. Den programu přesunout nejde – u něj akce jen otevře plán týdne.
 */
function easeHardPlan(ctx: RuleContext): { reason: string; action: RecommendationAction } | null {
	const hard = hardPlanned(ctx);
	if (!hard) return null;
	return {
		reason: t("You have a hard workout planned for today: {hard_label}.", { hard_label: hard.label }),
		action: hard.movable
			? { label: t("Move to tomorrow"), target: "plan", move: { itemId: hard.id, from: hard.date, to: addDays(ctx.today, 1) } }
			: { label: t("Weekly plan"), target: "plan" },
	};
}

/** 1. Krátký spánek → lehčí den / přesunout těžký trénink. */
export const sleepRule: Rule = {
	id: "sleep",
	sources: ["watson2015", "milewski2014", "mah2011"],
	evidence: "consensus",
	evaluate(ctx) {
		const { lastMin, averageMin } = ctx.sleep;
		if (lastMin === null) return null;
		const targetMin = ctx.thresholds.sleepTargetHours * 60;
		const short = lastMin < targetMin;
		const belowAverage = averageMin !== null && averageMin - lastMin >= SLEEP_BELOW_AVERAGE_MIN;
		if (!short && !belowAverage) return null;
		const reasons: string[] = [];
		if (short) {
			reasons.push(t("Sleep {v}; the recommended minimum for an adult is {v2} h.", { v: formatDurationMin(lastMin), v2: formatNumber(ctx.thresholds.sleepTargetHours, 2) }));
		}
		if (belowAverage) {
			reasons.push(t("That's {v} less than your average ({v2}).", { v: formatDurationMin(averageMin - lastMin), v2: formatDurationMin(averageMin) }));
		}
		const plan = easeHardPlan(ctx);
		if (plan) reasons.push(plan.reason);
		return {
			level: lastMin < targetMin - SLEEP_WARN_HOURS_BELOW * 60 ? "warn" : "suggest",
			title: t("Short sleep – go easier today"),
			text: t("Move a hard or technically demanding workout to another day; choose an easier day or rest today and go to bed earlier tonight."),
			reasons,
			...(plan ? { action: plan.action } : {}),
		};
	},
};

/** 2. HRV 7 dní pod normou → lehčí den; v normě / nad → podle plánu. */
export const hrvRule: Rule = {
	id: "hrv",
	sources: ["kiviniemi2007", "plews2012_2013"],
	evidence: "research",
	evaluate(ctx) {
		const hrv = ctx.hrv;
		if (!hrv?.ready) return null;
		const ms = (ln: number) => formatNumber(Math.exp(ln), 0);
		const band = `${ms(hrv.low)}–${ms(hrv.high)} ms`;
		if (hrv.status === "below") {
			const plan = easeHardPlan(ctx);
			return {
				level: "suggest",
				title: t("HRV below baseline – easier day"),
				text: t("Choose easy training or rest today; go back to hard training once your HRV average is back in range."),
				reasons: [t("Your {hrvWindowDays}-day HRV average is {v} ms; your normal range is {band}.", { hrvWindowDays: ctx.thresholds.hrvWindowDays, v: ms(hrv.current), band }), ...(plan ? [plan.reason] : [])],
				...(plan ? { action: plan.action } : {}),
			};
		}
		return {
			level: "info",
			title: hrv.status === "above" ? t("HRV above baseline – train as planned") : t("HRV within baseline – train as planned"),
			text: t("From an HRV point of view nothing stands in the way of the planned workout."),
			reasons: [t("Your {hrvWindowDays}-day HRV average is {v} ms; your normal range is {band}.", { hrvWindowDays: ctx.thresholds.hrvWindowDays, v: ms(hrv.current), band })],
		};
	},
};

/** 3. Prudký nárůst zátěže (ACWR) → upozornění, nepřidávat. */
export const acwrRule: Rule = {
	id: "acwr",
	sources: ["gabbett2016", "williams2017", "impellizzeri2020"],
	evidence: "research",
	evaluate(ctx) {
		if (!ctx.acwr || ctx.acwr.ratio <= ctx.thresholds.acwrWarn) return null;
		return {
			level: "warn",
			title: t("Sharp increase in load"),
			text: t("Don't add volume or intensity in the next few days; let your body absorb the load."),
			reasons: [
				t("Load over the last {acwrAcuteDays} days is {v}× higher than long-term (threshold {v2}).", { acwrAcuteDays: ctx.thresholds.acwrAcuteDays, v: formatNumber(ctx.acwr.ratio, 2), v2: formatNumber(ctx.thresholds.acwrWarn, 2) }),
				t("The acute:chronic workload ratio is a disputed method (Impellizzeri 2020) – treat it only as a warning about a jump, not as an injury prediction."),
			],
			action: { label: t("Load chart"), target: "overview" },
		};
	},
};

/** 4. Monotónnost > 2 → zařadit lehčí den. */
export const monotonyRule: Rule = {
	id: "monotony",
	sources: ["foster1998"],
	evidence: "research",
	evaluate(ctx) {
		if (!ctx.monotony || ctx.monotony.monotony <= ctx.thresholds.monotonyWarn) return null;
		return {
			level: "suggest",
			title: t("Monotonous load – add an easier day"),
			text: t("Alternate hard and easy days; one truly easy day or rest helps the week more than another moderately hard workout."),
			reasons: [
				t("Monotony over 7 days is {v} (threshold {v2}) – the days are too similar in load.", { v: formatNumber(ctx.monotony.monotony, 1), v2: formatNumber(ctx.thresholds.monotonyWarn, 1) }),
			],
		};
	},
};

/** 5. Cíleně trénovaná partie pod 10 efektivními sériemi týdně → doplnit. */
export const volumeRule: Rule = {
	id: "volume",
	sources: ["schoenfeld2017"],
	evidence: "research",
	evaluate(ctx) {
		const { weeklySetsTargetMin: min, weeklySetsTargetMax: max } = ctx.thresholds;
		// Bez zapsaných efektivních sérií (nový uživatel, série bez RIR) by pravidlo jen obtěžovalo.
		if (!ctx.hasVolumeData) return null;
		const low = ctx.focusMuscles.filter((m) => ctx.weeklySets[m] < min);
		if (low.length === 0) return null;
		return {
			level: "suggest",
			title: t("Add volume: {v}", { v: muscleList(low) }),
			text: t("For the muscle groups you focus on, add a few sets close to failure during the week."),
			reasons: low.map((m) => t("{v}: {v2} of the recommended {min}–{max} sets in the last 7 days.", { v: MUSCLE_LABELS[m], v2: formatNumber(ctx.weeklySets[m], 1), min, max })),
			action: { label: t("Body tab"), target: "body" },
		};
	},
};

/** 6. Partie trénovaná před méně než 48 h → netrénovat těžce. */
export const recoveryRule: Rule = {
	id: "recovery",
	sources: ["practice"],
	evidence: "practice",
	evaluate(ctx) {
		const limit = ctx.thresholds.recoveryHours2;
		const recent = (Object.keys(ctx.recoveries) as MuscleId[]).filter((m) => {
			const hours = ctx.recoveries[m].hours;
			return hours !== null && hours < limit;
		});
		if (recent.length === 0) return null;
		const reason = (m: MuscleId) => t("{v}: trained {v2} h ago (roughly {limit} h between hard sessions).", { v: MUSCLE_LABELS[m], v2: formatNumber(ctx.recoveries[m].hours!, 0), limit });
		const planned = recent.filter((m) => ctx.plannedMuscles.includes(m));
		if (planned.length > 0) {
			return {
				level: "suggest",
				title: t("Today's plan loads muscle groups that haven't recovered: {v}", { v: muscleList(planned) }),
				text: t("Don't train these muscle groups hard today – reduce weight or sets, or swap the workout with another day."),
				reasons: planned.map(reason),
				action: { label: t("Body tab"), target: "body" },
			};
		}
		return {
			level: "info",
			title: `V regeneraci: ${muscleList(recent)}`,
			text: t("Don't train these muscle groups hard today."),
			reasons: recent.map(reason),
			action: { label: t("Body tab"), target: "body" },
		};
	},
};

/** 7. Běh: podíl intenzivního času nad 30 % za 4 týdny → víc lehkých běhů. */
export const intensityRule: Rule = {
	id: "intensity",
	sources: ["seiler2010", "stoggl2014"],
	evidence: "research",
	evaluate(ctx) {
		if (!ctx.intensity) return null;
		const pct = ctx.intensity.share * 100;
		if (pct <= ctx.thresholds.intenseShareWarnPct) return null;
		return {
			level: "suggest",
			title: t("A lot of high-intensity running – add easy runs"),
			text: t("Run most of your runs in zones 1–2; keep hard sessions to one or two days a week."),
			reasons: [
				tn(ctx.intensity.runs, ["Over the last 4 weeks {v} % of your time was in zones 3–5 (threshold {intenseShareWarnPct} %); calculated from {n} run with heart rate.", "Over the last 4 weeks {v} % of your time was in zones 3–5 (threshold {intenseShareWarnPct} %); calculated from {n} runs with heart rate."], { v: formatNumber(pct, 0), intenseShareWarnPct: ctx.thresholds.intenseShareWarnPct }),
			],
			action: { label: t("Intensity distribution"), target: "overview" },
		};
	},
};

/** 8. Aktivní bolest → upravit trénink; od 4/10 nebo po 7 dnech bez zlepšení → odborník. */
export const painRule: Rule = {
	id: "pain",
	sources: ["practice"],
	evidence: "practice",
	evaluate(ctx) {
		const pains = ctx.pains.filter((p) => p.level > 0);
		if (pains.length === 0) return null;
		const { painProfessionalLevel: level, painProfessionalDays: days } = ctx.thresholds;
		const describe = (p: (typeof pains)[number]) => {
			const base = `${p.name} (${MUSCLE_LABELS[p.muscle]}): ${p.level}/10`;
			if (p.reason === "level") return t("{base} – intensity {level}/10 or more.", { base, level });
			if (p.reason === "duration") return t("{base} – lasting {v} without improvement.", { base, v: formatDays(p.days) });
			return `${base}, ${p.days === 0 ? "from today" : formatDays(p.days)}${p.improving ? ", improving" : ""}.`;
		};
		const reasons = pains.map(describe);
		const action = { label: t("Pain on the Body tab"), target: "body" } as const;
		if (pains.some((p) => p.seeProfessional)) {
			return {
				level: "warn",
				title: t("Pain – see a professional"),
				text: t("See a physiotherapist or doctor. Until then, skip exercises that load the painful area. The plugin doesn't diagnose anything – it only records what you log."),
				reasons,
				action,
			};
		}
		return {
			level: "suggest",
			title: t("Active pain – adjust your training"),
			text: t("Skip or modify exercises that load the painful area. If the pain gets to {level}/10 or lasts more than {days} days without improvement, see a physiotherapist or doctor.", { level, days }),
			reasons,
			action,
		};
	},
};

/** 9. Odlehčený týden při aspoň dvou signálech (SPEC 9.4). */
export const deloadRule: Rule = {
	id: "deload",
	sources: ["practice"],
	evidence: "practice",
	evaluate(ctx) {
		if (!ctx.deload.suggest) return null;
		return {
			level: "suggest",
			title: t("Consider a deload week"),
			text: t("Reduce volume and intensity for a week; a “Deload week” is ready among the programs. The individual signals are backed by research; combining them is a heuristic."),
			reasons: ctx.deload.reasons,
			action: { label: t("Programs"), target: "programs" },
		};
	},
};

/** 10. Cíl ohrožený trendem → návrh úpravy plánu. */
export const goalRule: Rule = {
	id: "goal",
	sources: ["practice"],
	evidence: "practice",
	evaluate(ctx) {
		const risky = ctx.goals.filter((g) => g.status === "at_risk");
		if (risky.length === 0) return null;
		const reason = (g: (typeof risky)[number]) => {
			if (g.overdue) return t("{g_name}: the deadline has passed.", { g_name: g.name });
			if (g.eta && g.deadline) return t("{g_name}: at the current trend you'll reach it on {v}; the deadline is {v2}.", { g_name: g.name, v: formatCzechDate(g.eta, false), v2: formatCzechDate(g.deadline, false) });
			return t("{g_name}: the trend of recent weeks isn't heading towards the goal.", { g_name: g.name });
		};
		return {
			level: "suggest",
			title: risky.length === 1 ? t("Goal at risk: {risky0_name}", { risky0_name: risky[0]!.name }) : t("Goals at risk: {risky_length}", { risky_length: risky.length }),
			text: t("Adjust your plan – add a workout aimed at the goal – or move the deadline. The forecast is a straight line through your recent results; treat it as a rough guide."),
			reasons: risky.map(reason),
			action: { label: t("Goals"), target: "goals" },
		};
	},
};

/** 11. Denní výzva bez volna + zhoršený check-in nebo bolest partie → ubrat. */
export const challengeRule: Rule = {
	id: "challenge",
	sources: ["practice"],
	evidence: "practice",
	evaluate(ctx) {
		if (ctx.challenges.length === 0) return null;
		const reasons: string[] = [];
		const affected = new Set<string>();
		for (const challenge of ctx.challenges) {
			for (const pain of ctx.pains) {
				if (pain.level > 0 && challenge.muscles.includes(pain.muscle)) {
					affected.add(challenge.name);
					reasons.push(t("{challenge_name}: loads the muscle group with pain ({pain_name}, {level}/10).", { challenge_name: challenge.name, pain_name: pain.name, level: pain.level }));
				}
			}
		}
		if (ctx.checkIn.worsening) {
			for (const challenge of ctx.challenges) affected.add(challenge.name);
			reasons.push(
				t("How you feel in the check-in got worse ({v}/5 in recent days vs {v2}/5 before).", { v: formatNumber(ctx.checkIn.recent!, 1), v2: formatNumber(ctx.checkIn.before!, 1) }),
			);
		}
		if (reasons.length === 0) return null;
		return {
			level: "suggest",
			title: t("Daily challenge – go easier today: {v}", { v: [...affected].join(", ") }),
			text: t("The challenge has no rest days, so fatigue adds up. Do about half today, or take a day off – the streak can be continued."),
			reasons,
			action: { label: t("Programs"), target: "programs" },
		};
	},
};

/** Pravidla v pořadí ze SPEC kap. 10. */
/** 12. Plán týdne výrazně nad průměrem posledních čtyř týdnů → ubrat ze zbývajících tréninků. */
export const planLoadRule: Rule = {
	id: "plan_load",
	sources: ["gabbett2016", "impellizzeri2020", "practice"],
	// Poměr je z výzkumu, ale zátěž plánu je odhad z plánované délky a intenzity.
	evidence: "practice",
	evaluate(ctx) {
		const week = ctx.plan?.week;
		if (!week || week.remaining <= 0 || week.ratio <= ctx.thresholds.acwrWarn) return null;
		return {
			level: "warn",
			title: t("This week's plan is well above your average"),
			text: t("Shorten or ease one of the remaining workouts; increase load gradually."),
			reasons: [
				t("Logged workouts and the rest of the plan add up to about {v} AU this week; the average of the last 4 weeks is {v2} AU ({v3}×, threshold {v4}×).", { v: formatNumber(week.expected, 0), v2: formatNumber(week.average, 0), v3: formatNumber(week.ratio, 2), v4: formatNumber(ctx.thresholds.acwrWarn, 2) }),
				t("Load from the plan is estimated from the planned duration and intensity; treat the ratio only as a warning about a jump (Impellizzeri 2020)."),
			],
			action: { label: t("Weekly plan"), target: "plan" },
		};
	},
};

/** 13. Těžký trénink v plánu den po těžkém tréninku → prohodit s lehčím dnem. */
export const planHardDaysRule: Rule = {
	id: "plan_hard_days",
	sources: ["practice"],
	evidence: "practice",
	evaluate(ctx) {
		const hard = hardPlanned(ctx);
		if (!hard || !ctx.plan?.hardYesterday) return null;
		return {
			level: "suggest",
			title: t("Second hard day in a row"),
			text: t("After a hard day, schedule an easier workout or rest; swap today's hard workout with an easier day."),
			reasons: [t("You logged a hard workout yesterday (RPE {HARD_RPE} or more) and another one is planned today: {hard_label}.", { HARD_RPE, hard_label: hard.label })],
			action: { label: t("Weekly plan"), target: "plan" },
		};
	},
};

/** 14. Vývoj váhy neodpovídá cíli → týdenní kontrola výživy (posun odhadu výdeje). */
export const nutritionCheckRule: Rule = {
	id: "nutrition_check",
	sources: ["practice"],
	evidence: "practice",
	evaluate(ctx) {
		const check = ctx.nutritionCheck;
		if (!check) return null;
		return {
			level: "suggest",
			title: t("Weight doesn't match your goal – check the recommended intake"),
			text: t("If you roughly followed the recommendation, the expenditure estimate is off. On the Nutrition tab you can shift it by your weight trend with one tap."),
			reasons: [t("Based on your weight trend over the last 3 weeks, the expenditure estimate is about {v} kcal a day {v2} than it should be.", { v: formatNumber(Math.abs(check.stepKcal), 0), v2: check.stepKcal > 0 ? t("lower") : t("higher") })],
			action: { label: t("Nutrition tab"), target: "nutrition" },
		};
	},
};

/** 15. Běh o víc než 10 % delší než nejdelší za 30 dní → zkrátit, nebo pak volněji (Frandsen 2025). */
export const runSpikeRule: Rule = {
	id: "run_spike",
	sources: ["frandsen2025"],
	evidence: "research",
	evaluate(ctx) {
		if (ctx.runSpikes.length === 0) return null;
		const reasons = ctx.runSpikes.map((s) =>
			t("{what}: {v} km, the longest run of the previous 30 days is {v2} km (+{v3} %).", {
				what: s.planned ? `${s.planned.label} (${formatShortDate(s.date)})` : t("Today's run"),
				v: formatNumber(s.km, 1),
				v2: formatNumber(s.longestKm, 1),
				v3: formatNumber(s.pct, 0),
			}),
		);
		reasons.push(t("In a study of 5,200 runners, injuries were more frequent when a single run was more than 10 % longer than the longest run of the previous 30 days."));
		const planned = ctx.runSpikes.find((s) => s.planned);
		if (planned) {
			return {
				level: "warn",
				title: t("A planned run is much longer than usual"),
				text: t("Shorten it to at most {v} km and add distance gradually.", { v: formatNumber(planned.maxKm, 1) }),
				reasons,
				action: { label: t("Weekly plan"), target: "plan" },
			};
		}
		return {
			level: "suggest",
			title: t("Today's run was much longer than usual"),
			text: t("Keep the next few days easy and don't add more distance yet."),
			reasons,
		};
	},
};

export const RULES: Rule[] = [
	sleepRule,
	hrvRule,
	acwrRule,
	monotonyRule,
	volumeRule,
	recoveryRule,
	intensityRule,
	painRule,
	deloadRule,
	goalRule,
	challengeRule,
	planLoadRule,
	planHardDaysRule,
	nutritionCheckRule,
	runSpikeRule,
];

export type { RuleContext, RuleOutput };
