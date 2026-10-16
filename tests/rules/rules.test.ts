import { describe, expect, it } from "vitest";
import type { Baseline } from "../../src/calc/hrv";
import type { PainAssessment } from "../../src/calc/pain";
import { getSource } from "../../src/evidence/sources";
import { EVIDENCE_LEVELS, MUSCLES, type MuscleId } from "../../src/model/constants";
import { addDays } from "../../src/model/dates";
import type { DayNote, PainNote, WorkoutNote } from "../../src/model/types";
import { buildContext, evaluateRules, type ContextInput } from "../../src/rules/engine";
import {
	RULES,
	acwrRule,
	challengeRule,
	deloadRule,
	goalRule,
	hrvRule,
	intensityRule,
	monotonyRule,
	painRule,
	planHardDaysRule,
	planLoadRule,
	recoveryRule,
	sleepRule,
	volumeRule,
} from "../../src/rules/rules";
import type { Rule, RuleContext, RulePlan } from "../../src/rules/types";
import { DEFAULT_THRESHOLDS } from "../../src/settings/settings";

const TODAY = "2026-10-02";

function record<T>(value: () => T): Record<MuscleId, T> {
	return Object.fromEntries(MUSCLES.map((m) => [m, value()])) as Record<MuscleId, T>;
}

/** Kontext, ve kterém se žádné pravidlo neozve. */
function ctx(partial: Partial<RuleContext> = {}): RuleContext {
	return {
		today: TODAY,
		thresholds: DEFAULT_THRESHOLDS,
		sleep: { lastMin: null, averageMin: null },
		hrv: null,
		restingHr: null,
		acwr: null,
		monotony: null,
		form: null,
		weeklySets: record(() => 0),
		hasVolumeData: true,
		focusMuscles: [],
		recoveries: record(() => ({ lastAt: null, lastDate: null, hours: null, percent: 100, category: 3 as const })),
		plannedMuscles: [],
		intensity: null,
		pains: [],
		checkIn: { recent: null, before: null, worsening: false },
		deload: { lowForm: false, hrvLow: false, checkInWorse: false, stagnating: false, count: 0, suggest: false, reasons: [] },
		goals: [],
		challenges: [],
		plan: null,
		nutritionCheck: null,
		...partial,
	};
}

// Průměr 4,0 (≈ 54,6 ms), pásmo 3,9–4,1 (≈ 49,4–60,3 ms).
const hrv = (status: "below" | "within" | "above", current: number): Baseline => ({ ready: true, current, mean: 4, sd: 0.2, low: 3.9, high: 4.1, status, samples: 30 });

const pain = (partial: Partial<PainAssessment> = {}): PainAssessment => ({
	name: "Koleno",
	muscle: "quads",
	level: 2,
	status: "active",
	days: 2,
	improving: false,
	seeProfessional: false,
	reason: null,
	...partial,
});

describe("plán týdne v doporučeních (SPEC 5.16)", () => {
	const tempo = { id: "p2", date: TODAY, label: "Běh – Tempo", intensity: "high" as const, movable: true };
	const easy = { id: "p1", date: TODAY, label: "Běh", intensity: "low" as const, movable: true };
	const plan = (partial: Partial<RulePlan> = {}): RulePlan => ({ today: [], hardYesterday: false, week: null, ...partial });

	it("krátký spánek + těžký trénink v plánu → nabídne přesun na zítra", () => {
		const rec = sleepRule.evaluate(ctx({ sleep: { lastMin: 380, averageMin: null }, plan: plan({ today: [easy, tempo] }) }))!;
		expect(rec.reasons.at(-1)).toBe("V plánu máš dnes těžký trénink: Běh – Tempo.");
		expect(rec.action).toEqual({ label: "Přesunout na zítra", target: "plan", move: { itemId: "p2", from: TODAY, to: "2026-10-03" } });
		// Bez těžké položky nebo bez plánu zůstává doporučení beze změny.
		expect(sleepRule.evaluate(ctx({ sleep: { lastMin: 380, averageMin: null }, plan: plan({ today: [easy] }) }))!.action).toBeUndefined();
		expect(sleepRule.evaluate(ctx({ sleep: { lastMin: 380, averageMin: null } }))!.reasons).toHaveLength(1);
		// Den programu přesunout nejde – doporučení ho zmíní a odkáže na plán týdne.
		const program = { id: "program:Forma/Knihovna/Programy/Síla.md", date: TODAY, label: "program Síla", intensity: "high" as const, movable: false };
		const fromProgram = sleepRule.evaluate(ctx({ sleep: { lastMin: 380, averageMin: null }, plan: plan({ today: [program] }) }))!;
		expect(fromProgram.reasons.at(-1)).toBe("V plánu máš dnes těžký trénink: program Síla.");
		expect(fromProgram.action).toEqual({ label: "Plán týdne", target: "plan" });
	});

	it("HRV pod normou + těžký trénink v plánu → nabídne přesun; v normě ne", () => {
		const below = hrvRule.evaluate(ctx({ hrv: hrv("below", 3.8), plan: plan({ today: [tempo] }) }))!;
		expect(below.reasons).toHaveLength(2);
		expect(below.action?.move).toEqual({ itemId: "p2", from: TODAY, to: "2026-10-03" });
		expect(hrvRule.evaluate(ctx({ hrv: hrv("within", 4), plan: plan({ today: [tempo] }) }))!.action).toBeUndefined();
	});

	it("plán týdne nad průměrem: varování až nad prahem a jen když v plánu ještě něco zbývá", () => {
		// Práh 1,5: 950 / 600 = 1,58.
		const week = { expected: 950, remaining: 500, average: 600, ratio: 950 / 600 };
		const rec = planLoadRule.evaluate(ctx({ plan: plan({ week }) }))!;
		expect(rec.level).toBe("warn");
		expect(rec.reasons[0]).toContain("asi 950 AU");
		expect(rec.reasons[0]).toContain("600 AU (1,58×, práh 1,5×)");
		expect(rec.action).toEqual({ label: "Plán týdne", target: "plan" });
		expect(planLoadRule.evaluate(ctx({ plan: plan({ week: { expected: 900, remaining: 500, average: 600, ratio: 1.5 } }) }))).toBeNull();
		expect(planLoadRule.evaluate(ctx({ plan: plan({ week: { ...week, remaining: 0 } }) }))).toBeNull();
		expect(planLoadRule.evaluate(ctx({ plan: plan() }))).toBeNull();
		expect(planLoadRule.evaluate(ctx())).toBeNull();
	});

	it("druhý těžký den po sobě: včera těžký trénink a dnes těžká položka v plánu", () => {
		const rec = planHardDaysRule.evaluate(ctx({ plan: plan({ today: [tempo], hardYesterday: true }) }))!;
		expect(rec.level).toBe("suggest");
		expect(rec.reasons[0]).toBe("Včera máš zapsaný těžký trénink (RPE 7 a víc) a dnes je v plánu další: Běh – Tempo.");
		expect(planHardDaysRule.evaluate(ctx({ plan: plan({ today: [tempo] }) }))).toBeNull();
		expect(planHardDaysRule.evaluate(ctx({ plan: plan({ today: [easy], hardYesterday: true }) }))).toBeNull();
		expect(planHardDaysRule.evaluate(ctx())).toBeNull();
	});
});

describe("engine", () => {
	it("v klidovém kontextu žádné doporučení", () => {
		expect(evaluateRules(ctx())).toEqual([]);
	});

	it("minimum 11 pravidel ze SPEC, jednoznačná ID", () => {
		expect(RULES.map((r) => r.id)).toEqual(["sleep", "hrv", "acwr", "monotony", "volume", "recovery", "intensity", "pain", "deload", "goal", "challenge", "plan_load", "plan_hard_days", "nutrition_check"]);
	});

	it("každé pravidlo má zdroj a štítek, který není silnější než nejslabší zdroj", () => {
		const strength = (level: string) => EVIDENCE_LEVELS.length - EVIDENCE_LEVELS.indexOf(level as (typeof EVIDENCE_LEVELS)[number]);
		for (const rule of RULES) {
			expect(rule.sources.length, rule.id).toBeGreaterThan(0);
			const weakest = Math.min(...rule.sources.map((id) => strength(getSource(id).evidence ?? "practice")));
			expect(strength(rule.evidence), rule.id).toBeLessThanOrEqual(weakest);
		}
	});

	it("řadí varování, návrhy, informace; doporučení nese důvod, zdroj a štítek", () => {
		const result = evaluateRules(
			ctx({
				sleep: { lastMin: 380, averageMin: null },
				hrv: hrv("within", 4),
				acwr: { acute: 180, chronic: 100, ratio: 1.8 },
			}),
		);
		expect(result.map((r) => [r.ruleId, r.level])).toEqual([
			["acwr", "warn"],
			["sleep", "suggest"],
			["hrv", "info"],
		]);
		for (const rec of result) {
			expect(rec.reasons.length, rec.ruleId).toBeGreaterThan(0);
			expect(rec.sourceIds.length, rec.ruleId).toBeGreaterThan(0);
			expect(EVIDENCE_LEVELS).toContain(rec.evidence);
			expect(rec.title).not.toBe("");
			expect(rec.text).not.toBe("");
		}
	});

	it("vlastní sada pravidel", () => {
		const always: Rule = { id: "x", sources: ["practice"], evidence: "practice", evaluate: () => ({ level: "info", title: "T", text: "X", reasons: ["r"] }) };
		expect(evaluateRules(ctx(), [always])).toEqual([{ ruleId: "x", level: "info", title: "T", text: "X", reasons: ["r"], sourceIds: ["practice"], evidence: "practice" }]);
	});
});

describe("1. spánek", () => {
	it("pod 7 h → návrh lehčího dne", () => {
		const rec = sleepRule.evaluate(ctx({ sleep: { lastMin: 380, averageMin: null } }))!;
		expect(rec.level).toBe("suggest");
		expect(rec.reasons).toEqual(["Spánek 6 h 20 min, doporučené minimum pro dospělého je 7 h."]);
	});

	it("víc než 2 h pod cílem → varování", () => {
		expect(sleepRule.evaluate(ctx({ sleep: { lastMin: 290, averageMin: null } }))!.level).toBe("warn");
	});

	it("výrazně pod osobním průměrem, i když nad 7 h", () => {
		const rec = sleepRule.evaluate(ctx({ sleep: { lastMin: 430, averageMin: 500 } }))!;
		expect(rec.reasons).toEqual(["Je to o 1 h 10 min méně než tvůj průměr (8 h 20 min)."]);
	});

	it("dost spánku nebo bez check-inu → nic", () => {
		expect(sleepRule.evaluate(ctx({ sleep: { lastMin: 450, averageMin: 460 } }))).toBeNull();
		expect(sleepRule.evaluate(ctx())).toBeNull();
	});
});

describe("2. HRV", () => {
	it("pod normou → lehčí den s čísly v ms", () => {
		const rec = hrvRule.evaluate(ctx({ hrv: hrv("below", 3.8) }))!;
		expect(rec.level).toBe("suggest");
		expect(rec.reasons).toEqual(["Průměr HRV za 7 dní je 45 ms, tvoje normální pásmo je 49–60 ms."]);
	});

	it("v normě a nad normou → podle plánu (informace)", () => {
		expect(hrvRule.evaluate(ctx({ hrv: hrv("within", 4) }))).toMatchObject({ level: "info", title: "HRV v normě – trénuj podle plánu" });
		expect(hrvRule.evaluate(ctx({ hrv: hrv("above", 4.2) }))).toMatchObject({ level: "info", title: "HRV nad normou – trénuj podle plánu" });
	});

	it("bez normy nic", () => {
		expect(hrvRule.evaluate(ctx({ hrv: { ready: false, reason: "baseline", have: 5, need: 14 } }))).toBeNull();
		expect(hrvRule.evaluate(ctx())).toBeNull();
	});
});

describe("3. ACWR", () => {
	it("nad 1,5 → varování s poznámkou o spornosti metody", () => {
		const rec = acwrRule.evaluate(ctx({ acwr: { acute: 180, chronic: 100, ratio: 1.8 } }))!;
		expect(rec.level).toBe("warn");
		expect(rec.reasons[0]).toBe("Zátěž posledních 7 dní je 1,8× vyšší než dlouhodobá (práh 1,5).");
		expect(rec.reasons[1]).toContain("Impellizzeri 2020");
		expect(acwrRule.sources).toContain("impellizzeri2020");
	});

	it("do prahu včetně nic", () => {
		expect(acwrRule.evaluate(ctx({ acwr: { acute: 150, chronic: 100, ratio: 1.5 } }))).toBeNull();
		expect(acwrRule.evaluate(ctx())).toBeNull();
	});
});

describe("4. monotónnost", () => {
	it("nad 2,0 → lehčí den", () => {
		const rec = monotonyRule.evaluate(ctx({ monotony: { monotony: 2.4, strain: 5000, weekLoad: 2083 } }))!;
		expect(rec.level).toBe("suggest");
		expect(rec.reasons[0]).toContain("2,4 (práh 2)");
	});

	it("do prahu nic", () => {
		expect(monotonyRule.evaluate(ctx({ monotony: { monotony: 2, strain: 1, weekLoad: 1 } }))).toBeNull();
	});
});

describe("5. objem cíleně trénovaných partií", () => {
	it("pod 10 sériemi jen u vybraných partií", () => {
		const weeklySets = { ...record(() => 0), chest: 6.5, lats: 12 };
		const rec = volumeRule.evaluate(ctx({ weeklySets, focusMuscles: ["chest", "lats"] }))!;
		expect(rec.title).toBe("Doplnit objem: Hrudník");
		expect(rec.reasons).toEqual(["Hrudník: 6,5 z doporučených 10–20 sérií za posledních 7 dní."]);
	});

	it("bez zapsaných efektivních sérií za 4 týdny se pravidlo neozve", () => {
		expect(volumeRule.evaluate(ctx({ focusMuscles: ["chest"], hasVolumeData: false }))).toBeNull();
	});

	it("bez vybraných partií nebo při dostatečném objemu nic", () => {
		expect(volumeRule.evaluate(ctx())).toBeNull();
		expect(volumeRule.evaluate(ctx({ weeklySets: { ...record(() => 0), chest: 10 }, focusMuscles: ["chest"] }))).toBeNull();
	});
});

describe("6. regenerace partie", () => {
	const recoveries = { ...ctx().recoveries, chest: { lastAt: 1, lastDate: "2026-10-01", hours: 20, percent: 28, category: 0 as const }, quads: { lastAt: 1, lastDate: "2026-09-29", hours: 70, percent: 97, category: 2 as const } };

	it("partie pod 48 h v dnešním plánu → návrh", () => {
		const rec = recoveryRule.evaluate(ctx({ recoveries, plannedMuscles: ["chest", "quads"] }))!;
		expect(rec.level).toBe("suggest");
		expect(rec.title).toBe("Dnešní plán zatěžuje neodpočaté partie: Hrudník");
		expect(rec.reasons).toEqual(["Hrudník: trénink před 20 h (orientačně 48 h mezi těžkými tréninky)."]);
	});

	it("bez plánu jen informace; odpočaté partie nic", () => {
		expect(recoveryRule.evaluate(ctx({ recoveries }))).toMatchObject({ level: "info", title: "V regeneraci: Hrudník" });
		expect(recoveryRule.evaluate(ctx())).toBeNull();
		expect(recoveryRule.evidence).toBe("practice");
	});
});

describe("7. rozložení intenzit běhu", () => {
	it("nad 30 % intenzivního času → víc lehkých běhů", () => {
		const rec = intensityRule.evaluate(ctx({ intensity: { easySec: 6000, hardSec: 4000, share: 0.4, runs: 6 } }))!;
		expect(rec.level).toBe("suggest");
		expect(rec.reasons[0]).toContain("40 % času v zónách 3–5 (práh 30 %)");
	});

	it("do prahu nebo bez dat nic", () => {
		expect(intensityRule.evaluate(ctx({ intensity: { easySec: 7000, hardSec: 3000, share: 0.3, runs: 6 } }))).toBeNull();
		expect(intensityRule.evaluate(ctx())).toBeNull();
	});
});

describe("8. bolest", () => {
	it("mírná bolest → upravit trénink, s prahy pro odborníka", () => {
		const rec = painRule.evaluate(ctx({ pains: [pain()] }))!;
		expect(rec.level).toBe("suggest");
		expect(rec.text).toContain("4/10");
		expect(rec.text).toContain("7 dní");
		expect(rec.reasons).toEqual(["Koleno (Stehna přední): 2/10, 2 dny."]);
	});

	it("4/10 a víc nebo dlouho bez zlepšení → doporučit odborníka, bez diagnózy", () => {
		const high = painRule.evaluate(ctx({ pains: [pain({ level: 5, seeProfessional: true, reason: "level" })] }))!;
		expect(high.level).toBe("warn");
		expect(high.text).toContain("fyzioterapeutem nebo lékařem");
		expect(high.text).toContain("nediagnostikuje");
		expect(high.reasons[0]).toBe("Koleno (Stehna přední): 5/10 – intenzita 4/10 a víc.");
		const long = painRule.evaluate(ctx({ pains: [pain({ days: 12, seeProfessional: true, reason: "duration" })] }))!;
		expect(long.level).toBe("warn");
		expect(long.reasons[0]).toBe("Koleno (Stehna přední): 2/10 – trvá 12 dní bez zlepšení.");
	});

	it("bez bolesti nic", () => {
		expect(painRule.evaluate(ctx())).toBeNull();
		expect(painRule.evaluate(ctx({ pains: [pain({ level: 0 })] }))).toBeNull();
	});
});

describe("9. odlehčený týden", () => {
	it("při návrhu z výpočtu 9.4 předá důvody a je označený jako praxe", () => {
		const deload = { lowForm: true, hrvLow: true, checkInWorse: false, stagnating: false, count: 2, suggest: true, reasons: ["a", "b"] };
		const rec = deloadRule.evaluate(ctx({ deload }))!;
		expect(rec.level).toBe("suggest");
		expect(rec.reasons).toEqual(["a", "b"]);
		expect(deloadRule.evidence).toBe("practice");
	});

	it("jeden signál nestačí", () => {
		const deload = { lowForm: true, hrvLow: false, checkInWorse: false, stagnating: false, count: 1, suggest: false, reasons: ["a"] };
		expect(deloadRule.evaluate(ctx({ deload }))).toBeNull();
	});
});

describe("10. ohrožený cíl", () => {
	it("důvod podle toho, proč je cíl ohrožený", () => {
		const rec = goalRule.evaluate(
			ctx({
				goals: [
					{ name: "10 km pod 50", status: "at_risk", overdue: false, eta: "2027-01-15", deadline: "2026-12-01" },
					{ name: "Bench 100", status: "at_risk", overdue: true, eta: null, deadline: "2026-09-01" },
					{ name: "Shyby 15", status: "at_risk", overdue: false, eta: null },
					{ name: "Váha 80", status: "on_track", overdue: false, eta: "2026-11-01" },
				],
			}),
		)!;
		expect(rec.title).toBe("Ohrožené cíle: 3");
		expect(rec.reasons).toEqual([
			"10 km pod 50: podle trendu vyjde na 15. 1. 2027, termín je 1. 12. 2026.",
			"Bench 100: termín už uplynul.",
			"Shyby 15: trend posledních týdnů k cíli nevede.",
		]);
	});

	it("cíle na dobré cestě nic", () => {
		expect(goalRule.evaluate(ctx({ goals: [{ name: "A", status: "on_track", overdue: false, eta: null }, { name: "B", status: "no_data", overdue: false, eta: null }] }))).toBeNull();
	});
});

describe("11. denní výzva", () => {
	const challenges = [{ name: "100 kliků denně", muscles: ["chest", "triceps"] as MuscleId[] }];

	it("bolest v partii výzvy → ubrat", () => {
		const rec = challengeRule.evaluate(ctx({ challenges, pains: [pain({ name: "Loket", muscle: "triceps", level: 3 })] }))!;
		expect(rec.level).toBe("suggest");
		expect(rec.title).toBe("Denní výzva – dnes uber: 100 kliků denně");
		expect(rec.reasons).toEqual(["100 kliků denně: zatěžuje partii s bolestí (Loket, 3/10)."]);
	});

	it("zhoršený check-in → ubrat", () => {
		const rec = challengeRule.evaluate(ctx({ challenges, checkIn: { recent: 2.5, before: 3.6, worsening: true } }))!;
		expect(rec.reasons).toEqual(["Pocity z check-inu se zhoršily (2,5/5 za poslední dny proti 3,6/5 předtím)."]);
	});

	it("bolest jinde, dobrý check-in nebo žádná výzva → nic", () => {
		expect(challengeRule.evaluate(ctx({ challenges, pains: [pain()] }))).toBeNull();
		expect(challengeRule.evaluate(ctx({ challenges }))).toBeNull();
		expect(challengeRule.evaluate(ctx({ checkIn: { recent: 2, before: 4, worsening: true } }))).toBeNull();
	});
});

describe("sestavení kontextu z dat", () => {
	function workout(partial: Partial<WorkoutNote> & { date: string }): WorkoutNote {
		return { forma: "workout", schema: 1, sport: "strength", source: "manual", blocks: [], pain: [], ...partial };
	}
	function day(date: string, partial: Partial<DayNote> = {}): DayNote {
		return { forma: "day", schema: 1, date, sleep: {}, check_in: {}, hrv: {}, body: {}, ...partial };
	}
	const info = (exercise: string) =>
		exercise === "Bench press" || exercise === "Kliky"
			? { name: exercise, kind: "grind" as const, measure: "reps_kg" as const, muscles: { primary: ["chest" as MuscleId], secondary: ["triceps" as MuscleId] } }
			: undefined;
	const knee: PainNote = { forma: "pain", schema: 1, name: "Koleno", muscle: "quads", level: 5, since: "2026-09-30", status: "active", history: [{ date: "2026-09-30", level: 5 }] };
	const healed: PainNote = { ...knee, name: "Rameno", level: 0, status: "resolved" };

	const input: ContextInput = {
		today: TODAY,
		nowMs: new Date(2026, 9, 2, 12, 0).getTime(),
		workouts: [
			...Array.from({ length: 30 }, (_, i) => workout({ date: addDays(TODAY, -30 + i), sport: "run", rpe: 5, duration_min: 40 })),
			workout({ date: "2026-10-01", start: "18:00", rpe: 7, duration_min: 60, blocks: [{ type: "sets", exercise: "Bench press", sets: [{ reps: 6, kg: 80, rir: 2 }, { reps: 6, kg: 80, rir: 1 }, { reps: 6, kg: 80, rir: 1 }] }] }),
		],
		days: [
			day(TODAY, { sleep: { duration_min: 350 } }),
			...Array.from({ length: 8 }, (_, i) => day(addDays(TODAY, -1 - i), { sleep: { duration_min: 450 } })),
		],
		pains: [knee, healed],
		thresholds: DEFAULT_THRESHOLDS,
		focusMuscles: ["chest"],
		volume: { info, options: { rirMax: 4, minPct1rm: 60, holdPctOfMax: 70, blockMinRpe: 7 } },
		series: new Map(),
		plannedExercises: ["Kliky"],
		challenges: [{ name: "100 kliků denně", exercises: ["Kliky"] }],
		goals: [],
	};
	const context = buildContext(input);

	it("spánek, zátěž, objem, regenerace, bolesti a plán", () => {
		expect(context.sleep).toEqual({ lastMin: 350, averageMin: 450 });
		expect(context.hrv).toBeNull();
		expect(context.acwr).not.toBeNull();
		expect(context.monotony).not.toBeNull();
		expect(context.form).not.toBeNull();
		expect(context.weeklySets.chest).toBe(3);
		expect(context.hasVolumeData).toBe(true);
		expect(buildContext({ ...input, workouts: input.workouts.slice(0, 30) }).hasVolumeData).toBe(false);
		expect(context.weeklySets.triceps).toBe(1.5);
		expect(context.recoveries.chest.hours).toBe(18);
		expect(context.plannedMuscles).toEqual(["chest"]);
		expect(context.pains.map((p) => p.name)).toEqual(["Koleno"]);
		expect(context.challenges).toEqual([{ name: "100 kliků denně", muscles: ["chest"] }]);
		expect(context.deload.suggest).toBe(false);
		expect(context.plan).toBeNull();
		const plan: RulePlan = { today: [], hardYesterday: false, week: null };
		expect(buildContext({ ...input, plan }).plan).toBe(plan);
	});

	it("z kontextu vzniknou doporučení seřazená podle závažnosti", () => {
		const ids = evaluateRules(context).map((r) => `${r.level}:${r.ruleId}`);
		expect(ids).toEqual(["warn:pain", "suggest:sleep", "suggest:volume", "suggest:recovery"]);
	});
});

describe("týdenní kontrola výživy v doporučeních (SPEC 11.6)", () => {
	it("ozve se jen s nabídkou korekce a řekne směr", async () => {
		const { nutritionCheckRule } = await import("../../src/rules/rules");
		expect(nutritionCheckRule.evaluate(ctx())).toBeNull();
		const lower = nutritionCheckRule.evaluate(ctx({ nutritionCheck: { stepKcal: -150 } }))!;
		expect(lower.level).toBe("suggest");
		expect(lower.reasons[0]).toContain("asi o 150 kcal denně vyšší, než má být");
		expect(lower.action).toEqual({ label: "Karta Výživa", target: "nutrition" });
		expect(nutritionCheckRule.evaluate(ctx({ nutritionCheck: { stepKcal: 200 } }))!.reasons[0]).toContain("200 kcal denně nižší");
	});
});
