<script lang="ts">
	// Osobní test (N-of-1): ukazatel z ranního check-inu nebo výkon (odhad 1RM, tempo běhu)
	// za 4 týdny před začátkem užívání proti období užívání (nejvýš 8 týdnů). Jen orientačně – bez placeba.
	import { t, tn } from "../../i18n";
	import {
		TRIAL_DAYS,
		TRIAL_METRICS,
		TRIAL_METRIC_LABELS,
		TRIAL_MIN_SAMPLES,
		TRIAL_MIN_SESSIONS,
		comparePeriods,
		personalTrial,
		type TrialMetric,
	} from "../../calc/supplementTrial";
	import { formatPace, runPacePoints } from "../../calc/performance";
	import { exerciseSeries, type RecordContext } from "../../calc/records";
	import { nightMin } from "../../calc/sleep";
	import type { SupplementEntry } from "../../data/SupplementService";
	import type { DayNote, WorkoutNote } from "../../model/types";
	import { formatCzechDate, formatNumber } from "../format";

	interface Props {
		supplements: SupplementEntry[];
		days: DayNote[];
		workouts: WorkoutNote[];
		ctx: RecordContext;
		today: string;
	}
	let { supplements, days, workouts, ctx, today }: Props = $props();

	/** Nejnovější suplement první – po přidání nového se zkouška nastaví rovnou na něj. */
	const candidates = $derived(supplements.filter((e) => e.note.since !== undefined).sort((a, b) => b.note.since!.localeCompare(a.note.since!)));
	let chosen = $state("");
	/** Ukazatel z check-inu, "pace" (tempo běhu) nebo "rm:<cvik>" (odhad 1RM). */
	let metric = $state<string>("sleep_quality");
	const entry = $derived(candidates.find((e) => e.file.path === chosen) ?? candidates[0]);

	/** Kolik tréninků s odhadem 1RM musí cvik mít, aby se nabídl; nejvýš tolik cviků. */
	const MIN_EXERCISE_SESSIONS = 6;
	const MAX_EXERCISES = 8;
	const oneRmSeries = $derived(
		[...exerciseSeries(workouts, ctx)]
			.map(([name, sessions]) => ({ name, points: sessions.flatMap((s) => (s.oneRm !== undefined ? [{ date: s.date, value: s.oneRm }] : [])) }))
			.filter((e) => e.points.length >= MIN_EXERCISE_SESSIONS)
			.sort((a, b) => b.points.length - a.points.length)
			.slice(0, MAX_EXERCISES),
	);
	const pacePoints = $derived(runPacePoints(workouts));
	const performance = $derived(metric === "pace" || metric.startsWith("rm:"));

	const trialDays = $derived(
		days.map((d) => ({
			date: d.date,
			sleep: { quality: d.sleep.quality, duration_min: nightMin(d.sleep) ?? undefined },
			check_in: d.check_in,
		})),
	);
	const result = $derived.by(() => {
		const since = entry?.note.since;
		if (!since) return null;
		if (metric === "pace") return comparePeriods(pacePoints, since, today, TRIAL_MIN_SESSIONS);
		if (metric.startsWith("rm:")) return comparePeriods(oneRmSeries.find((e) => `rm:${e.name}` === metric)?.points ?? [], since, today, TRIAL_MIN_SESSIONS);
		return personalTrial(trialDays, since, today, metric as TrialMetric);
	});

	/** Vyšší je lepší u všeho kromě tempa; u výkonu se počítá změna aspoň o 2 % (praxe). */
	function verdict(before: number, diff: number): string {
		const threshold = performance ? Math.abs(before) * 0.02 : metric === "sleep_duration" ? 0.25 : 0.3;
		if (Math.abs(diff) < threshold) return t("no clear change");
		const better = metric === "pace" ? diff < 0 : diff > 0;
		return better ? t("improvement") : t("worse");
	}
	const show = (value: number) =>
		metric === "pace" ? formatPace(value) : metric.startsWith("rm:") ? `${formatNumber(value, 1)} kg` : `${formatNumber(value, 2)}${metric === "sleep_duration" ? " h" : ""}`;
</script>

<section class="bf-card">
	<h4>{t("Personal test")}</h4>
	<p class="bf-muted bf-trial-small">
		{t("Compares a morning check-in measure or your performance over the {v} weeks before you started taking it with the same period while taking it (at most 8 weeks). The start is the date it was added or turned back on.", { v: TRIAL_DAYS / 7 })}
	</p>
	{#if candidates.length === 0}
		<p class="bf-muted">{t("You don't have an active supplement with a start date yet.")}</p>
	{:else}
		<div class="bf-grid-2">
			<label class="bf-field">
				<span class="bf-field-label">{t("Supplement")}</span>
				<select value={entry?.file.path ?? ""} onchange={(e) => (chosen = e.currentTarget.value)}>
					{#each candidates as c (c.file.path)}
						<option value={c.file.path}>{c.note.name}</option>
					{/each}
				</select>
			</label>
			<label class="bf-field">
				<span class="bf-field-label">{t("What to track")}</span>
				<select bind:value={metric}>
					<optgroup label={t("Morning check-in")}>
						{#each TRIAL_METRICS as m (m)}
							<option value={m}>{TRIAL_METRIC_LABELS[m]}</option>
						{/each}
					</optgroup>
					{#if pacePoints.length > 0 || oneRmSeries.length > 0}
						<optgroup label={t("Performance")}>
							{#if pacePoints.length > 0}<option value="pace">{t("running pace")}</option>{/if}
							{#each oneRmSeries as e (e.name)}
								<option value={`rm:${e.name}`}>{t("estimated 1RM: {exercise_name}", { exercise_name: e.name })}</option>
							{/each}
						</optgroup>
					{/if}
				</select>
			</label>
		</div>
		{#if entry && result}
			<p class="bf-trial-small">{t("Taking it since {v}.", { v: formatCzechDate(entry.note.since!, false) })}</p>
			{#if result.ready}
				<div class="bf-trial-row">
					<span>{t("Before:")} <strong>{show(result.before)}</strong> <span class="bf-muted">{tn(result.samplesBefore, ["({n} reading)", "({n} readings)"])}</span></span>
					<span>{t("During:")} <strong>{show(result.during)}</strong> <span class="bf-muted">{tn(result.samplesDuring, ["({n} reading)", "({n} readings)"])}</span></span>
					<span><strong>{verdict(result.before, result.diff)}</strong> ({result.diff > 0 ? "+" : "−"}{show(Math.abs(result.diff))})</span>
				</div>
			{:else}
				<p class="bf-muted">
					{t("Collecting data – taking it {v} of {TRIAL_DAYS} days; readings before {samplesBefore} and during {samplesDuring} (at least {TRIAL_MIN_SAMPLES} needed in each period).", { v: Math.min(result.daysDuring, TRIAL_DAYS), TRIAL_DAYS, samplesBefore: result.samplesBefore, samplesDuring: result.samplesDuring, TRIAL_MIN_SAMPLES: performance ? TRIAL_MIN_SESSIONS : TRIAL_MIN_SAMPLES })}
				</p>
			{/if}
		{/if}
		<p class="bf-muted bf-trial-small">
			{t("Without a placebo this is only indicative: expectations, season, training and stress also affect the result.")}
			{#if performance}{t("Performance changes with training itself – a better result can come from the program, not the supplement.")}{/if}
			<span class="bf-tag">{t("practice")}</span>
		</p>
	{/if}
</section>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-trial-small {
		font-size: var(--font-ui-smaller);
	}

	.bf-trial-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-1) var(--size-4-3);
		font-size: var(--font-ui-small);
	}

	select {
		width: 100%;
	}
</style>
