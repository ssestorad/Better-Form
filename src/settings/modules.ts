// Moduly a podmoduly, které jde vypnout (nastavení → Moduly, úvodní průvodce). Vypnutí jen
// skryje obrazovky, doporučení a generované řádky – data zůstávají a po zapnutí je vše zpět.
// Záznam bolesti a doporučení odborníka (CLAUDE.md) vypnout nejde: nejsou v žádném modulu.

import { translated } from "../i18n";

/** Strom modulů: id hlavního modulu → id podmodulů. Id stojí mimo translated() – nepřekládají se. */
export const MODULE_TREE = {
	nutrition: ["weight_check", "day_note"],
	supplements: ["safety", "trial", "tables"],
	running: ["analysis", "paces", "taper", "run_spike", "adapt", "runna"],
	programs: ["plan_days", "today_card"],
	skills: [],
	goals: ["norms"],
	body: [],
	habits: [],
	cycle: [],
	badges: ["badges", "streaks"],
	research: ["research", "practice"],
} as const satisfies Record<string, readonly string[]>;

export type ModuleId = keyof typeof MODULE_TREE;
export type SubmoduleKey = { [M in ModuleId]: `${M}.${(typeof MODULE_TREE)[M][number]}` }[ModuleId];
/** Klíč modulu („running“) nebo podmodulu („running.taper“). */
export type ModuleKey = ModuleId | SubmoduleKey;

export const MODULE_IDS = Object.keys(MODULE_TREE) as ModuleId[];

/** Popisky modulů a podmodulů pro nastavení a průvodce. */
export const MODULE_LABELS: Record<ModuleKey, { label: string; desc: string }> = translated({
	nutrition: { label: "Nutrition", desc: "Suggested daily intake and macros, the Nutrition tab." },
	"nutrition.weight_check": { label: "Weekly check against your weight", desc: "Compares the suggestion with your weight trend and offers a correction." },
	"nutrition.day_note": { label: "Nutrition in the daily note and on Today", desc: "The line with the suggested intake in the daily note and on the Today tab." },
	habits: { label: "Habit journal", desc: "Tick yesterday's habits (alcohol, late meal…) on Today and see how they relate to your mornings." },
	cycle: { label: "Menstrual cycle", desc: "Log period days in the check-in; Today shows the cycle day and average cycle length. Only with a female profile." },
	supplements: { label: "Supplements", desc: "What you take, the catalog with evidence grades, the Supplements tab." },
	"supplements.safety": { label: "Medication and combination warnings", desc: "Interactions with the medication you take and combinations that don't go together." },
	"supplements.trial": { label: "Personal test", desc: "Compares the weeks before a supplement with the weeks while taking it." },
	"supplements.tables": { label: "Reference tables", desc: "Amino acids, electrolytes, caffeine, reference intakes and upper limits." },
	running: { label: "Running", desc: "Running analysis, paces and running tools in the plan." },
	"running.analysis": { label: "Heart-rate zones, 80/20 and shoes", desc: "The Running section of the Overview tab." },
	"running.paces": { label: "Training paces", desc: "Daniels paces in Records and the target pace for planned runs." },
	"running.taper": { label: "Race taper", desc: "The race card in the plan when a race time goal is within 3 weeks." },
	"running.adapt": { label: "Run adjustments", desc: "Suggests an easier or shorter run, or skipping it, after leg pain, low readiness or missed runs – with the reason." },
	"running.run_spike": { label: "Warning for a much longer run", desc: "A planned run more than 10 % longer than your longest of the last 30 days." },
	"running.runna": { label: "Plan from Runna", desc: "The Runna button on the Plan tab." },
	programs: { label: "Programs", desc: "Built-in and your own programs, the Programs tab." },
	"programs.plan_days": { label: "Program days in the weekly plan", desc: "Days of active programs appear in the plan and count towards its summary." },
	"programs.today_card": { label: "Program card on Today", desc: "Today's tasks of active programs on the Today tab." },
	skills: { label: "Skills", desc: "Calisthenics progressions on the Skills tab." },
	goals: { label: "Goals", desc: "Goals with a forecast, the Goals tab and goal recommendations." },
	"goals.norms": { label: "Standards", desc: "Standards tables (e.g. fitness tests) on the Goals tab." },
	body: { label: "Body figure", desc: "The figure with weekly volume and recovery per muscle group. The pain log and measurements stay on the Body tab." },
	badges: { label: "Badges and streaks", desc: "Motivation on the Overview tab." },
	"badges.badges": { label: "Badges", desc: "22 badges for running, strength, calisthenics and consistency." },
	"badges.streaks": { label: "Streaks", desc: "Streaks of completed weeks and program days. Illness and vacation don't break them." },
	research: { label: "Research cards", desc: "Summaries of studies and coaching books next to the features. Sources of recommendations stay." },
	"research.research": { label: "What the research says", desc: "Cards summarizing studies and meta-analyses." },
	"research.practice": { label: "Coaching practice", desc: "Cards summarizing coaching books." },
});

/**
 * Je modul nebo podmodul zapnutý? Podmodul jen spolu s hlavním modulem.
 * Chybějící hodnota = zapnuto (nový modul se po aktualizaci ukáže).
 */
export function moduleOn(modules: Readonly<Record<string, boolean>>, key: ModuleKey): boolean {
	const parent = key.split(".")[0]!;
	if (modules[parent] === false) return false;
	return parent === key || modules[key] !== false;
}

/** Karta výzkumu („Co říká výzkum“) nebo trenérské praxe – podle štítku tématu. */
export function researchCardOn(modules: Readonly<Record<string, boolean>>, evidence: string): boolean {
	return moduleOn(modules, evidence === "practice" ? "research.practice" : "research.research");
}

/** Výchozí zapnutí hlavních modulů podle sportů: kdo neběhá, nepotřebuje běžecké nástroje. */
export function defaultModules(sports: Readonly<Record<string, boolean>>): Partial<Record<ModuleId, boolean>> {
	return sports.run ? {} : { running: false };
}
