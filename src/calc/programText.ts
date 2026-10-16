// Popis cíle programu slovy (karty Dnes a Programy, cíl u bloku tréninku).

import { WEEKDAY_LABELS, WEEKDAYS, type Weekday } from "../model/constants";
import type { IntervalStep, ProgramNote, ProgramTarget } from "../model/types";
import { formatNumber, formatSeconds } from "../ui/format";
import { resolveTarget, type ResolvedTarget } from "./programs";
import { t, tn } from "../i18n";

function intervalStepText(step: IntervalStep): string {
	const pair = step.rest_s ? `${formatSeconds(step.work_s)} / ${formatSeconds(step.rest_s)}` : formatSeconds(step.work_s);
	return step.repeats > 1 ? `${step.repeats}× (${pair})` : pair;
}

/** „3×19 (60 % z 32)“, „Žebřík 1-2-3… ×2 (50 opak.)“, „5 sérií na maximum, pauza 2 min“… */
export function describeTarget(target: ResolvedTarget): string {
	switch (target.kind) {
		case "daily_total":
			return t("{total} per day", { total: target.total });
		case "sets_reps":
			return `${target.sets}×${target.reps}`;
		case "pct_of_max":
			return t("{sets}×{reps} ({v} % of max {max})", { sets: target.sets, reps: target.reps, v: formatNumber(target.pct, 0), max: target.max });
		case "needs_test":
			return t("test your max first");
		case "time":
			return target.sets > 1 ? `${target.sets}× ${formatSeconds(target.time_s)}` : formatSeconds(target.time_s);
		case "distance":
			return `${formatNumber(target.distance_km, 2)} km`;
		case "intervals": {
			const parts: string[] = [];
			if (target.warmup_s > 0) parts.push(t("warm-up {v}", { v: formatSeconds(target.warmup_s) }));
			parts.push(target.steps.map(intervalStepText).join(", "));
			if (target.cooldown_s > 0) parts.push(t("cool-down {v}", { v: formatSeconds(target.cooldown_s) }));
			return t("{v} – total {v2}", { v: parts.join(" · "), v2: formatSeconds(target.total_s) });
		}
		case "ladder": {
			const rest = target.rest_per_rep_s !== undefined ? t(", rest {v} s × reps", { v: formatNumber(target.rest_per_rep_s, 1) }) : "";
			if (target.open) {
				const first = [0, 1, 2].map((i) => target.start + i * target.step).join(", ");
				return t("ladder {first}… to failure{rest}", { first, rest });
			}
			const rounds = target.rounds > 1 ? ` ×${target.rounds}` : "";
			const roundRest =
				target.rounds > 1 && target.round_rest_s !== undefined ? t(", {v} between rounds", { v: formatSeconds(target.round_rest_s) }) : "";
			return tn(target.total ?? 0, ["ladder {v}{rounds} ({n} rep){rest}{roundRest}", "ladder {v}{rounds} ({n} reps){rest}{roundRest}"], { v: target.steps.join("-"), rounds, n: target.total ?? "", rest, roundRest });
		}
		case "emom": {
			const from = target.max !== undefined ? t(" ({v} % of max {max})", { v: formatNumber(target.pct ?? 0, 0), max: target.max }) : "";
			const length = target.until_failure
				? t(" to failure{v}", { v: target.max_minutes !== undefined ? t(", at most {max_minutes} min", { max_minutes: target.max_minutes }) : "" })
				: target.minutes !== undefined
					? `, ${target.minutes} min`
					: "";
			return tn(target.reps, ["EMOM {n} rep every minute{from}{length}", "EMOM {n} reps every minute{from}{length}"], { from, length });
		}
		case "max_sets": {
			const rest = target.rest_s !== undefined ? t(", rest {v}", { v: formatSeconds(target.rest_s) }) : "";
			return tn(target.sets, ["{n} set to max{rest}", "{n} sets to max{rest}"], { rest });
		}
	}
}

/** Popis cíle bez znalosti maxima: „5× 60 % maxima“ místo „nejdřív otestuj maximum“. */
export function describePlannedTarget(target: ProgramTarget, week: number, progression: ProgramNote["progression"]): string {
	if (target.kind === "pct_of_max") return t("{sets}× {v} % of max", { sets: target.sets, v: formatNumber(target.pct_of_max, 0) });
	if (target.kind === "emom" && target.reps === undefined) {
		const length = target.until_failure
			? t(" to failure{v}", { v: target.max_minutes !== undefined ? t(", at most {max_minutes} min", { max_minutes: target.max_minutes }) : "" })
			: target.minutes !== undefined
				? `, ${target.minutes} min`
				: "";
		return t("EMOM {v} % of max every minute{length}", { v: formatNumber(target.pct_of_max ?? 0, 0), length });
	}
	return describeTarget(resolveTarget(target, { week, progression }));
}

export interface WeekOverview {
	/** První a poslední týden (1 = první) se stejným rozpisem. */
	from: number;
	to: number;
	/** Řádky „po: Kliky – 5× 60 % maxima“. */
	lines: string[];
}

/**
 * Rozpis programu po týdnech; sousední týdny se stejným rozpisem se sloučí.
 * Program bez pevné délky se ukáže jedním týdnem (nebo prvními čtyřmi, když se týdny liší).
 */
export function programOverview(program: ProgramNote): WeekOverview[] {
	const hasSchedule = program.items.some((i) => i.schedule !== undefined);
	const changes = hasSchedule || program.progression.rule === "weekly_add";
	const weeks = program.duration_weeks ?? (changes ? 4 : 1);
	const result: WeekOverview[] = [];
	for (let week = 0; week < weeks; week++) {
		const lines: string[] = [];
		for (const day of WEEKDAYS) {
			if (!program.days.includes(day)) continue;
			const parts: string[] = [];
			for (const item of program.items) {
				const itemDays = WEEKDAYS.filter((d) => program.days.includes(d) && (item.days === undefined || item.days.includes(d)));
				const session = itemDays.indexOf(day);
				if (session < 0) continue;
				const entry = item.schedule?.find((s) => s.week === week + 1);
				const target = entry?.sessions?.[session] ?? entry?.target ?? item.target;
				parts.push(`${entry?.exercise ?? item.exercise} – ${describePlannedTarget(target, week, program.progression)}`);
			}
			if (parts.length > 0) lines.push(`${WEEKDAY_LABELS[day].toLowerCase()}: ${parts.join("; ")}`);
		}
		// Dny se stejným obsahem sloučit: „po, st, pá: …“.
		const merged: { days: string[]; text: string }[] = [];
		for (const line of lines) {
			const split = line.indexOf(": ");
			const day = line.slice(0, split);
			const text = line.slice(split + 2);
			const same = merged.find((m) => m.text === text);
			if (same) same.days.push(day);
			else merged.push({ days: [day], text });
		}
		const weekLines = merged.map((m) => `${m.days.length === 7 ? "every day" : m.days.join(", ")}: ${m.text}`);
		const previous = result[result.length - 1];
		if (previous && previous.lines.join("\n") === weekLines.join("\n")) previous.to = week + 1;
		else result.push({ from: week + 1, to: week + 1, lines: weekLines });
	}
	return result;
}

/** „po, st, pá“ nebo „každý den“. */
export function describeDays(days: Weekday[]): string {
	if (WEEKDAYS.every((d) => days.includes(d))) return t("every day");
	return WEEKDAYS.filter((d) => days.includes(d))
		.map((d) => WEEKDAY_LABELS[d].toLowerCase())
		.join(", ");
}
