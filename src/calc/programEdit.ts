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
	sets_reps: "Série × opakování",
	daily_total: "Denní součet (počítadlo)",
	pct_of_max: "Série s % maxima",
	max_sets: "Série na maximum",
	emom: "EMOM",
	ladder: "Žebřík / pyramida",
	time: "Čas / výdrž",
	distance: "Vzdálenost",
	intervals: "Intervaly",
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
			return positive(target.sets) && positive(target.reps) ? null : t("doplň série a opakování");
		case "daily_total":
			return positive(target.daily_total) ? null : t("doplň denní součet");
		case "pct_of_max":
			return positive(target.sets) && positive(target.pct_of_max) && target.pct_of_max <= 100
				? null
				: t("doplň série a procento 1–100");
		case "max_sets":
			return positive(target.sets) ? null : t("doplň počet sérií");
		case "emom": {
			const amount = positive(target.reps) || (positive(target.pct_of_max) && (target.pct_of_max ?? 0) <= 100);
			const length = positive(target.minutes) || target.until_failure === true;
			return amount && length ? null : t("doplň opakování (nebo % maxima) a délku");
		}
		case "ladder":
			return (target.steps?.length ?? 0) > 0 || (target.open === true && positive(target.start))
				? null
				: t("doplň příčky");
		case "time":
			return positive(target.time_s) ? null : t("doplň čas");
		case "distance":
			return positive(target.distance_km) ? null : t("doplň vzdálenost");
		case "intervals":
			return target.steps.length > 0 ? null : t("doplň úseky");
	}
}

/** Chyby programu z formuláře; prázdné pole = lze uložit. */
export function validateProgram(program: ProgramNote): string[] {
	const problems: string[] = [];
	if (program.name.trim() === "") problems.push(t("Doplň název programu."));
	if (program.days.length === 0) problems.push(t("Vyber aspoň jeden den."));
	if (program.duration_weeks !== undefined && !positive(program.duration_weeks)) {
		problems.push(t("Délka programu musí být kladná."));
	}
	if (program.progression.rule === "weekly_add" && !positive(program.progression.add)) {
		problems.push(t("Doplň, kolik se má každý týden přidat."));
	}
	program.items.forEach((item, i) => {
		const label = item.exercise.trim() || t("položka {v}", { v: i + 1 });
		if (item.exercise.trim() === "") problems.push(t("Položka {v}: vyber cvik.", { v: i + 1 }));
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
	const base = t("{name} (kopie)", { name });
	if (!exists(base)) return base;
	for (let i = 2; ; i++) {
		const candidate = t("{name} (kopie {i})", { name, i });
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
