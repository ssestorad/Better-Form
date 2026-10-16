// Čitelný souhrn denní poznámky: text generovaného bloku (SPEC 4.1) a řádky
// pro kartu Dnes. Bez závislosti na Obsidianu.

import { sessionLoad } from "../calc/load";
import { sleepDurationMin } from "../calc/sleep";
import { SPORT_LABELS } from "../model/constants";
import type { DayNote, WorkoutNote } from "../model/types";
import { formatDurationMin, formatNumber } from "../ui/format";
import { t } from "../i18n";

export interface DaySummary {
	sleep: string | null;
	feelings: string | null;
	hrv: string | null;
	weight: string | null;
}

function join(parts: (string | null | undefined | false)[]): string | null {
	const present = parts.filter((p): p is string => typeof p === "string" && p !== "");
	return present.length > 0 ? present.join(" · ") : null;
}

function scale(label: string, value: number | undefined): string | null {
	return value === undefined ? null : `${label} ${value}/5`;
}

/** Jednotlivé řádky souhrnu; chybějící část = null. */
export function daySummary(day: DayNote | undefined): DaySummary {
	if (!day) return { sleep: null, feelings: null, hrv: null, weight: null };
	const { sleep, check_in: feel, hrv, body } = day;
	const duration = sleep.duration_min ?? sleepDurationMin(sleep) ?? undefined;
	const start = sleep.sleep_onset ?? sleep.bedtime;
	const times = start && sleep.wake ? `${start} → ${sleep.wake}` : null;
	const length =
		duration !== undefined ? `${formatDurationMin(duration)}${times ? ` (${times})` : ""}` : times;
	return {
		sleep: join([
			length,
			scale(t("kvalita"), sleep.quality),
			sleep.awakenings !== undefined && t("probuzení {awakenings}×", { awakenings: sleep.awakenings }),
			scale(t("ráno"), sleep.morning_feeling),
		]),
		feelings: join([
			scale(t("únava"), feel.fatigue),
			scale(t("svaly"), feel.soreness),
			scale(t("nálada"), feel.mood),
			scale(t("stres"), feel.stress),
		]),
		hrv: join([
			hrv.rmssd_ms !== undefined && `rMSSD ${formatNumber(hrv.rmssd_ms)} ms`,
			hrv.resting_hr !== undefined && t("klidový tep {v}", { v: formatNumber(hrv.resting_hr) }),
			hrv.elonga_readiness !== undefined && `Elonga ${formatNumber(hrv.elonga_readiness)}`,
		]),
		weight: body.weight_kg === undefined ? null : `${formatNumber(body.weight_kg)} kg`,
	};
}

/** Popisek tréninku: „Posilovna – Push“. */
export function workoutLabel(workout: WorkoutNote): string {
	const sport = SPORT_LABELS[workout.sport];
	return workout.title ? `${sport} – ${workout.title}` : sport;
}

/**
 * Detaily tréninku: „62 min · RPE 7 · zátěž 434“. Chybějící RPE se připomene,
 * kromě tréninků z denního počítadla (`remindRpe: false`).
 */
export function workoutDetails(workout: WorkoutNote, remindRpe = true): string | null {
	const load = sessionLoad(workout.rpe, workout.duration_min);
	return join([
		workout.duration_min !== undefined && `${formatNumber(workout.duration_min)} min`,
		workout.rpe !== undefined && `RPE ${formatNumber(workout.rpe)}`,
		load !== null && t("zátěž {v}", { v: formatNumber(load, 0) }),
		remindRpe && workout.rpe === undefined && t("chybí RPE"),
	]);
}

export interface BlockWorkout {
	note: WorkoutNote;
	/** Cíl odkazu na poznámku tréninku (z metadataCache.fileToLinktext). */
	link: string;
	/** Trénink z denního počítadla – RPE se u něj nepřipomíná. */
	counter?: boolean;
}

/** Markdown generovaného bloku denní poznámky. */
export function renderDayBlock(day: DayNote | undefined, workouts: BlockWorkout[], nutrition: string | null = null): string {
	const summary = daySummary(day);
	const lines: string[] = [];
	if (summary.sleep) lines.push(t("**Spánek:** {sleep}", { sleep: summary.sleep }));
	if (summary.feelings) lines.push(t("**Pocity** (5 = nejlepší): {feelings}", { feelings: summary.feelings }));
	if (summary.hrv) lines.push(`**HRV:** ${summary.hrv}`);
	if (summary.weight) lines.push(t("**Váha:** {weight}", { weight: summary.weight }));
	if (day?.steps !== undefined) lines.push(t("**Kroky:** {v}", { v: formatNumber(day.steps, 0) }));
	if (lines.length === 0) lines.push(t("Check-in zatím není vyplněný."));
	// Řádky oddělit tvrdým zalomením, aby se v náhledu nespojily do jednoho odstavce.
	if (day?.supplements && day.supplements.length > 0) lines.push(t("**Suplementy:** {v}", { v: day.supplements.join(", ") }));
	const header = lines.join("  \n");

	const workoutLines =
		workouts.length === 0
			? [t("Žádný zapsaný trénink.")]
			: workouts.map(({ note, link, counter }) => {
					const details = workoutDetails(note, !counter);
					return `- [[${link}|${workoutLabel(note)}]]${details ? ` · ${details}` : ""}`;
				});
	const food = nutrition ? t("\n\n**Výživa – doporučení:** {nutrition}", { nutrition }) : "";
	return t("{header}\n\n**Tréninky**\n{v}{food}", { header, v: workoutLines.join("\n"), food });
}
