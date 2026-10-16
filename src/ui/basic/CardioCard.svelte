<script lang="ts">
	// Karta běhu (nebo jiného kardia) v režimu Základ: dnešní plán, poslední běh, tento týden.
	import { t } from "../../i18n";
	import { cardioStats, taskFor } from "../../calc/basic";
	import { formatClockDuration, formatPace, paceSecondsPerKm } from "../../calc/performance";
	import { describeTarget } from "../../calc/programText";
	import { SPORT_LABELS } from "../../model/constants";
	import { usePlugin } from "../context";
	import { formatNumber, formatShortDate } from "../format";

	interface Props {
		exercise: string;
		date: string;
	}
	let { exercise, date }: Props = $props();

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;

	const isExercise = (other: string) => plugin.workouts.isSameExercise(exercise, other);
	const sport = $derived.by(() => {
		void $indexVersion;
		return plugin.programs.sportFor(exercise);
	});
	const plan = $derived.by(() => {
		void $indexVersion;
		return taskFor(plugin.programs.active(date), isExercise);
	});
	const stats = $derived.by(() => {
		void $indexVersion;
		return cardioStats(plugin.programs.workoutNotes(), sport, date);
	});
	const lastText = $derived.by(() => {
		const last = stats.last;
		if (!last) return null;
		const parts: string[] = [];
		if (last.distance_km !== undefined) parts.push(`${formatNumber(last.distance_km, 2)} km`);
		if (last.moving_time_s !== undefined) parts.push(formatClockDuration(last.moving_time_s));
		else if (last.duration_min !== undefined) parts.push(`${formatNumber(last.duration_min)} min`);
		const pace = paceSecondsPerKm(last.distance_km, last.moving_time_s);
		if (pace !== null) parts.push(formatPace(pace));
		return `${formatShortDate(last.date)}${parts.length > 0 ? `: ${parts.join(" · ")}` : ""}`;
	});

	function log() {
		if (plan) plugin.openWorkout({ program: plan.program.entry.file, date });
		else plugin.openWorkout({ sport, date });
	}
</script>

<section class="bf-card">
	<header class="bf-basic-head">
		<span class="bf-basic-name">{exercise}</span>
		{#if plan?.task.done}<span class="bf-tag bf-tag-done">{t("done today")}</span>{/if}
	</header>

	<dl class="bf-basic-stats">
		<dt>{t("Today")}</dt>
		<dd>
			{#if plan}
				{describeTarget(plan.task.target)}
				<span class="bf-muted">· {plan.program.entry.note.name}</span>
			{:else}
				<span class="bf-muted">{t("no program – e.g. “Couch to 5K”")}</span>
			{/if}
		</dd>
		<dt>{t("Last time")}</dt>
		<dd>{#if lastText}{lastText}{:else}<span class="bf-muted">{t("nothing yet")}</span>{/if}</dd>
		<dt>{t("This week")}</dt>
		<dd>
			{stats.weekCount}× {stats.weekKm > 0 ? `· ${formatNumber(stats.weekKm, 1)} km` : ""}
		</dd>
		<dt>{t("Longest")}</dt>
		<dd>
			{#if stats.longest}{formatNumber(stats.longest.value, 2)} km <span class="bf-muted">({formatShortDate(stats.longest.date)})</span>{:else}<span class="bf-muted">–</span>{/if}
		</dd>
	</dl>

	<div class="bf-actions">
		<button type="button" class:mod-cta={!plan?.task.done} onclick={log}>{t("Log {toLowerCase}", { toLowerCase: SPORT_LABELS[sport].toLowerCase() })}</button>
	</div>
</section>

<style>
	.bf-basic-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-basic-name {
		font-weight: var(--font-semibold);
		font-size: var(--font-ui-medium);
	}

	.bf-basic-stats {
		display: grid;
		grid-template-columns: 5.5em minmax(0, 1fr);
		gap: 2px var(--size-4-2);
		margin: 0;
		font-size: var(--font-ui-small);
	}

	.bf-basic-stats dt {
		color: var(--text-muted);
	}

	.bf-basic-stats dd {
		margin: 0;
	}
</style>
