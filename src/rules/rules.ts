// Pravidla doporučení (SPEC kap. 10, minimum pro fázi 4). Každé pravidlo je čistá
// funkce kontextu a má zdroje a štítek; heuristiky jsou označené jako praxe.
// Plugin nediagnostikuje – u bolesti jen odkazuje na odborníka.

import { HARD_RPE } from "../calc/weekPlan";
import { MUSCLE_LABELS, type MuscleId } from "../model/constants";
import { addDays } from "../model/dates";
import { formatCzechDate, formatDays, formatDurationMin, formatNumber } from "../ui/format";
import type { RecommendationAction, Rule, RuleContext, RuleOutput, RulePlanItem } from "./types";
import { t } from "../i18n";

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
		reason: t("V plánu máš dnes těžký trénink: {hard_label}.", { hard_label: hard.label }),
		action: hard.movable
			? { label: t("Přesunout na zítra"), target: "plan", move: { itemId: hard.id, from: hard.date, to: addDays(ctx.today, 1) } }
			: { label: t("Plán týdne"), target: "plan" },
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
			reasons.push(t("Spánek {v}, doporučené minimum pro dospělého je {v2} h.", { v: formatDurationMin(lastMin), v2: formatNumber(ctx.thresholds.sleepTargetHours, 2) }));
		}
		if (belowAverage) {
			reasons.push(t("Je to o {v} méně než tvůj průměr ({v2}).", { v: formatDurationMin(averageMin! - lastMin), v2: formatDurationMin(averageMin!) }));
		}
		const plan = easeHardPlan(ctx);
		if (plan) reasons.push(plan.reason);
		return {
			level: lastMin < targetMin - SLEEP_WARN_HOURS_BELOW * 60 ? "warn" : "suggest",
			title: t("Krátký spánek – dnes lehčeji"),
			text: t("Těžký nebo technicky náročný trénink přesuň na jindy; dnes zvol lehčí den nebo volno a večer jdi spát dřív."),
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
				title: t("HRV pod normou – lehčí den"),
				text: t("Dnes zvol lehký trénink nebo volno; k těžkému se vrať, až se průměr HRV vrátí do pásma."),
				reasons: [t("Průměr HRV za {hrvWindowDays} dní je {v} ms, tvoje normální pásmo je {band}.", { hrvWindowDays: ctx.thresholds.hrvWindowDays, v: ms(hrv.current), band }), ...(plan ? [plan.reason] : [])],
				...(plan ? { action: plan.action } : {}),
			};
		}
		return {
			level: "info",
			title: hrv.status === "above" ? t("HRV nad normou – trénuj podle plánu") : t("HRV v normě – trénuj podle plánu"),
			text: t("Z pohledu HRV nic nebrání plánovanému tréninku."),
			reasons: [t("Průměr HRV za {hrvWindowDays} dní je {v} ms, tvoje normální pásmo je {band}.", { hrvWindowDays: ctx.thresholds.hrvWindowDays, v: ms(hrv.current), band })],
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
			title: t("Prudký nárůst zátěže"),
			text: t("V nejbližších dnech nepřidávej objem ani intenzitu a nech tělo zátěž vstřebat."),
			reasons: [
				t("Zátěž posledních {acwrAcuteDays} dní je {v}× vyšší než dlouhodobá (práh {v2}).", { acwrAcuteDays: ctx.thresholds.acwrAcuteDays, v: formatNumber(ctx.acwr.ratio, 2), v2: formatNumber(ctx.thresholds.acwrWarn, 2) }),
				t("Poměr akutní a chronické zátěže je sporná metoda (Impellizzeri 2020) – ber ho jen jako upozornění na skok, ne jako předpověď zranění."),
			],
			action: { label: t("Graf zátěže"), target: "overview" },
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
			title: t("Jednotvárná zátěž – zařaď lehčí den"),
			text: t("Střídej těžké a lehké dny; jeden opravdu lehký den nebo volno týdnu pomůže víc než další středně těžký trénink."),
			reasons: [
				t("Monotónnost za 7 dní je {v} (práh {v2}) – dny jsou si zátěží příliš podobné.", { v: formatNumber(ctx.monotony.monotony, 1), v2: formatNumber(ctx.thresholds.monotonyWarn, 1) }),
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
			title: t("Doplnit objem: {v}", { v: muscleList(low) }),
			text: t("U partií, které cíleně trénuješ, přidej v týdnu několik sérií blízko vyčerpání."),
			reasons: low.map((m) => t("{v}: {v2} z doporučených {min}–{max} sérií za posledních 7 dní.", { v: MUSCLE_LABELS[m], v2: formatNumber(ctx.weeklySets[m], 1), min, max })),
			action: { label: t("Karta Tělo"), target: "body" },
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
		const reason = (m: MuscleId) => t("{v}: trénink před {v2} h (orientačně {limit} h mezi těžkými tréninky).", { v: MUSCLE_LABELS[m], v2: formatNumber(ctx.recoveries[m].hours!, 0), limit });
		const planned = recent.filter((m) => ctx.plannedMuscles.includes(m));
		if (planned.length > 0) {
			return {
				level: "suggest",
				title: t("Dnešní plán zatěžuje neodpočaté partie: {v}", { v: muscleList(planned) }),
				text: t("Tyto partie dnes netrénuj těžce – uber váhu nebo série, případně trénink prohoď s jiným dnem."),
				reasons: planned.map(reason),
				action: { label: t("Karta Tělo"), target: "body" },
			};
		}
		return {
			level: "info",
			title: `V regeneraci: ${muscleList(recent)}`,
			text: t("Tyto partie dnes netrénuj těžce."),
			reasons: recent.map(reason),
			action: { label: t("Karta Tělo"), target: "body" },
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
			title: t("Hodně intenzivního běhu – přidej lehké běhy"),
			text: t("Většinu běhů běhej v zónách 1–2; intenzivní tréninky nech jen na jeden až dva dny v týdnu."),
			reasons: [
				t("Za poslední 4 týdny je {v} % času v zónách 3–5 (práh {intenseShareWarnPct} %); počítáno z {runs} běhů s tepem.", { v: formatNumber(pct, 0), intenseShareWarnPct: ctx.thresholds.intenseShareWarnPct, runs: ctx.intensity.runs }),
			],
			action: { label: t("Rozložení intenzit"), target: "overview" },
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
			if (p.reason === "level") return t("{base} – intenzita {level}/10 a víc.", { base, level });
			if (p.reason === "duration") return t("{base} – trvá {v} bez zlepšení.", { base, v: formatDays(p.days) });
			return `${base}, ${p.days === 0 ? "od dneška" : formatDays(p.days)}${p.improving ? ", zlepšuje se" : ""}.`;
		};
		const reasons = pains.map(describe);
		const action = { label: t("Bolesti na kartě Tělo"), target: "body" } as const;
		if (pains.some((p) => p.seeProfessional)) {
			return {
				level: "warn",
				title: t("Bolest – poraď se s odborníkem"),
				text: t("Zajdi za fyzioterapeutem nebo lékařem. Do té doby vynech cviky, které bolestivé místo zatěžují. Plugin nic nediagnostikuje – jen eviduje, co zapíšeš."),
				reasons,
				action,
			};
		}
		return {
			level: "suggest",
			title: t("Aktivní bolest – uprav trénink"),
			text: t("Vynech nebo uprav cviky, které bolestivé místo zatěžují. Když bolest zesílí na {level}/10 nebo potrvá déle než {days} dní bez zlepšení, poraď se s fyzioterapeutem nebo lékařem.", { level, days }),
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
			title: t("Zvaž odlehčený týden"),
			text: t("Na týden uber objem i intenzitu; v programech je připravený „Odlehčovací týden“. Jednotlivé signály mají oporu ve výzkumu, jejich kombinace je heuristika."),
			reasons: ctx.deload.reasons,
			action: { label: t("Programy"), target: "programs" },
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
			if (g.overdue) return t("{g_name}: termín už uplynul.", { g_name: g.name });
			if (g.eta && g.deadline) return t("{g_name}: podle trendu vyjde na {v}, termín je {v2}.", { g_name: g.name, v: formatCzechDate(g.eta, false), v2: formatCzechDate(g.deadline, false) });
			return t("{g_name}: trend posledních týdnů k cíli nevede.", { g_name: g.name });
		};
		return {
			level: "suggest",
			title: risky.length === 1 ? t("Cíl je ohrožený: {risky0_name}", { risky0_name: risky[0]!.name }) : t("Ohrožené cíle: {risky_length}", { risky_length: risky.length }),
			text: t("Uprav plán – přidej trénink zaměřený na cíl – nebo posuň termín. Předpověď je přímka proložená posledními výkony, ber ji orientačně."),
			reasons: risky.map(reason),
			action: { label: t("Cíle"), target: "goals" },
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
					reasons.push(t("{challenge_name}: zatěžuje partii s bolestí ({pain_name}, {level}/10).", { challenge_name: challenge.name, pain_name: pain.name, level: pain.level }));
				}
			}
		}
		if (ctx.checkIn.worsening) {
			for (const challenge of ctx.challenges) affected.add(challenge.name);
			reasons.push(
				t("Pocity z check-inu se zhoršily ({v}/5 za poslední dny proti {v2}/5 předtím).", { v: formatNumber(ctx.checkIn.recent!, 1), v2: formatNumber(ctx.checkIn.before!, 1) }),
			);
		}
		if (reasons.length === 0) return null;
		return {
			level: "suggest",
			title: t("Denní výzva – dnes uber: {v}", { v: [...affected].join(", ") }),
			text: t("Výzva nemá volné dny, takže únava se sčítá. Dnes udělej zhruba polovinu, nebo si dej den volna – série se dá navázat."),
			reasons,
			action: { label: t("Programy"), target: "programs" },
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
			title: t("Plán týdne je výrazně nad tvým průměrem"),
			text: t("Zkrať nebo zlehči některý ze zbývajících tréninků; zátěž přidávej postupně."),
			reasons: [
				t("Zapsané tréninky a zbytek plánu dají tento týden asi {v} AU; průměr posledních 4 týdnů je {v2} AU ({v3}×, práh {v4}×).", { v: formatNumber(week.expected, 0), v2: formatNumber(week.average, 0), v3: formatNumber(week.ratio, 2), v4: formatNumber(ctx.thresholds.acwrWarn, 2) }),
				t("Zátěž z plánu je odhad z plánované délky a intenzity; poměr ber jen jako upozornění na skok (Impellizzeri 2020)."),
			],
			action: { label: t("Plán týdne"), target: "plan" },
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
			title: t("Druhý těžký den po sobě"),
			text: t("Po těžkém dni zařaď lehčí trénink nebo volno; dnešní těžký trénink prohoď s lehčím dnem."),
			reasons: [t("Včera máš zapsaný těžký trénink (RPE {HARD_RPE} a víc) a dnes je v plánu další: {hard_label}.", { HARD_RPE, hard_label: hard.label })],
			action: { label: t("Plán týdne"), target: "plan" },
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
			title: t("Váha neodpovídá cíli – zkontroluj doporučený příjem"),
			text: t("Pokud ses doporučení zhruba držel, odhad výdeje nesedí. Na kartě Výživa ho jedním klepnutím posuneš podle vývoje váhy."),
			reasons: [t("Podle trendu váhy za poslední 3 týdny je odhad výdeje asi o {v} kcal denně {v2}, než má být.", { v: formatNumber(Math.abs(check.stepKcal), 0), v2: check.stepKcal > 0 ? t("nižší") : t("vyšší") })],
			action: { label: t("Karta Výživa"), target: "nutrition" },
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
];

export type { RuleContext, RuleOutput };
