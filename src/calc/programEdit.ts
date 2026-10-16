// Kopie, import a úprava programu (SPEC 5.7). Bez závislosti na Obsidianu.

import type { ProgramNote, ProgramTarget } from "../model/types";
import { t, translated } from "../i18n";

/** Typy cílů, které jde upravit ve formuláři (intervaly jen v poznámce / importem). */
export const EDITABLE_TARGETS = [
	"sets_reps",
	"daily_total",
	"pct_of_max",
	"max_sets",
	"emom",
	"ladder",
	"time",
	"distance",
] as const;
export type EditableTargetKind = (typeof EDITABLE_TARGETS)[number];

export const TARGET_LABELS: Record<ProgramTarget["kind"], string> = translated({
	sets_reps: "Sets × reps",
	daily_total: "Daily total (counter)",
	pct_of_max: "Sets at % of max",
	max_sets: "Max-rep sets",
	emom: "EMOM",
	ladder: "Ladder / pyramid",
	time: "Time / hold",
	distance: "Distance",
	intervals: "Intervals",
});

/** Rozumný výchozí cíl při přepnutí typu ve formuláři. */
export function defaultTarget(kind: EditableTargetKind): ProgramTarget {
	switch (kind) {
		case "sets_reps":
			return { kind, sets: 3, reps: 10 };
		case "daily_total":
			return { kind, daily_total: 100 };
		case "pct_of_max":
			return { kind, sets: 3, pct_of_max: 60 };
		case "max_sets":
			return { kind, sets: 3, rest_s: 120 };
		case "emom":
			return { kind, reps: 5, minutes: 10 };
		case "ladder":
			return { kind, steps: [1, 2, 3, 4, 5], rounds: 1 };
		case "time":
			return { kind, time_s: 30, sets: 3 };
		case "distance":
			return { kind, distance_km: 5 };
	}
}

function positive(value: number | undefined): boolean {
	return value !== undefined && Number.isFinite(value) && value > 0;
}

function targetProblem(target: ProgramTarget): string | null {
	switch (target.kind) {
		case "sets_reps":
			return positive(target.sets) && positive(target.reps) ? null : t("fill in sets and reps");
		case "daily_total":
			return positive(target.daily_total) ? null : t("fill in the daily total");
		case "pct_of_max":
			return positive(target.sets) && positive(target.pct_of_max) && target.pct_of_max <= 100
				? null
				: t("fill in sets and a percentage 1–100");
		case "max_sets":
			return positive(target.sets) ? null : t("fill in the number of sets");
		case "emom": {
			const amount = positive(target.reps) || (positive(target.pct_of_max) && (target.pct_of_max ?? 0) <= 100);
			const length = positive(target.minutes) || target.until_failure === true;
			return amount && length ? null : t("fill in reps (or % of max) and duration");
		}
		case "ladder":
			return (target.steps?.length ?? 0) > 0 || (target.open === true && positive(target.start))
				? null
				: t("fill in the rungs");
		case "time":
			return positive(target.time_s) ? null : t("fill in the time");
		case "distance":
			return positive(target.distance_km) ? null : t("fill in the distance");
		case "intervals":
			return target.steps.length > 0 ? null : t("fill in the intervals");
	}
}

/** Chyby programu z formuláře; prázdné pole = lze uložit. */
export function validateProgram(program: ProgramNote): string[] {
	const problems: string[] = [];
	if (program.name.trim() === "") problems.push(t("Fill in the program name."));
	if (program.days.length === 0) problems.push(t("Choose at least one day."));
	if (program.duration_weeks !== undefined && !positive(program.duration_weeks)) {
		problems.push(t("The program duration must be positive."));
	}
	if (program.progression.rule === "weekly_add" && !positive(program.progression.add)) {
		problems.push(t("Fill in how much to add each week."));
	}
	program.items.forEach((item, i) => {
		const label = item.exercise.trim() || t("item {v}", { v: i + 1 });
		if (item.exercise.trim() === "") problems.push(t("Item {v}: choose an exercise.", { v: i + 1 }));
		const problem = targetProblem(item.target);
		if (problem) problems.push(`${label}: ${problem}.`);
	});
	return problems;
}

/** Vlastní neaktivní kopie programu (předpřipraveného i cizího). */
export function asOwnProgram(program: ProgramNote, name: string): ProgramNote {
	const { active_since: _since, ...rest } = program;
	return { ...rest, name, builtin: false, active: false };
}

/** Název kopie: „X (kopie)“, při kolizi „X (kopie 2)“… */
export function copyName(name: string, exists: (name: string) => boolean): string {
	const base = t("{name} (copy)", { name });
	if (!exists(base)) return base;
	for (let i = 2; ; i++) {
		const candidate = t("{name} (copy {i})", { name, i });
		if (!exists(candidate)) return candidate;
	}
}

/** Název importovaného programu: původní, při kolizi „X (2)“… */
export function importName(name: string, exists: (name: string) => boolean): string {
	if (!exists(name)) return name;
	for (let i = 2; ; i++) {
		const candidate = `${name} (${i})`;
		if (!exists(candidate)) return candidate;
	}
}
