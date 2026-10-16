<script lang="ts">
	// Čísla za týden / měsíc / rok se srovnáním s předchozím obdobím (SPEC 5.4).
	// Mřížka dlaždic je pevná – při přepínání období se nic neposouvá.
	import { t } from "../../i18n";
	import { percentChange } from "../../calc/monthlySummary";
	import { periodLabel, periodOf, periodStats, shiftPeriod, type PeriodKind, type TonnageContext } from "../../calc/overview";
	import { SESSION_LOAD_BASIS } from "../../calc/load";
	import { PUSHUP_BODYWEIGHT_BASIS } from "../../calc/oneRm";
	import { SPORT_LABELS, SPORTS } from "../../model/constants";
	import type { WorkoutNote } from "../../model/types";
	import BasisTag from "../components/BasisTag.svelte";
	import { formatDurationMin, formatNumber } from "../format";

	interface Props {
		workouts: WorkoutNote[];
		ctx: TonnageContext;
		today: string;
	}
	let { workouts, ctx, today }: Props = $props();

	const KINDS: { kind: PeriodKind; label: string }[] = [
		{ kind: "week", label: t("Week") },
		{ kind: "month", label: t("Month") },
		{ kind: "year", label: t("Year") },
	];

	let kind = $state<PeriodKind>("week");
	/** Posun proti aktuálnímu období (0 = teď, −1 = minulé). */
	let offset = $state(0);

	const period = $derived(shiftPeriod(periodOf(kind, today), offset));
	const previous = $derived(shiftPeriod(period, -1));
	const stats = $derived(periodStats(workouts, period.from, period.to, ctx));
	const before = $derived(periodStats(workouts, previous.from, previous.to, ctx));

	const tiles = $derived([
		{ label: t("Workouts"), value: String(stats.workouts), change: percentChange(stats.workouts, before.workouts) },
		{ label: t("Training days"), value: String(stats.activeDays), change: percentChange(stats.activeDays, before.activeDays) },
		{ label: t("Time"), value: formatDurationMin(stats.durationMin), change: percentChange(stats.durationMin, before.durationMin) },
		{ label: t("Load (sRPE)"), value: formatNumber(stats.load, 0), change: percentChange(stats.load, before.load) },
		{ label: t("Run"), value: `${formatNumber(stats.runKm, 1)} km`, change: percentChange(stats.runKm, before.runKm) },
		{ label: t("Swim"), value: `${formatNumber(stats.swimM / 1000, 2)} km`, change: percentChange(stats.swimM, before.swimM) },
		{ label: t("Lifted"), value: `${formatNumber(stats.tonnageKg / 1000, 1)} t`, change: percentChange(stats.tonnageKg, before.tonnageKg) },
	]);
	const sports = $derived(
		SPORTS.filter((s) => (stats.bySport[s] ?? 0) > 0)
			.map((s) => `${SPORT_LABELS[s].toLocaleLowerCase("cs")} ${stats.bySport[s]}×`)
			.join(" · "),
	);

	function setKind(next: PeriodKind) {
		kind = next;
		offset = 0;
	}
</script>

<section class="bf-card">
	<div class="bf-num-head">
		<div class="bf-seg" role="tablist" aria-label={t("Period")}>
			{#each KINDS as k (k.kind)}
				<button type="button" role="tab" aria-selected={kind === k.kind} class:is-active={kind === k.kind} onclick={() => setKind(k.kind)}>{k.label}</button>
			{/each}
		</div>
		<div class="bf-num-nav">
			<button type="button" aria-label={t("Previous period")} onclick={() => (offset -= 1)}>‹</button>
			<span class="bf-num-label">{periodLabel(period)}</span>
			<button type="button" aria-label={t("Next period")} disabled={offset >= 0} onclick={() => (offset += 1)}>›</button>
		</div>
	</div>

	<div class="bf-num-grid">
		{#each tiles as tile (tile.label)}
			<div class="bf-num-tile">
				<div class="bf-num-name">{tile.label}</div>
				<div class="bf-num-value">{tile.value}</div>
				<div class="bf-num-change" title={t("Change from the previous period")}>{tile.change}</div>
			</div>
		{/each}
	</div>

	<p class="bf-muted bf-num-foot">
		{sports || t("No workouts in this period.")}
		{#if stats.missingLoad > 0}
			{t("· {missingLoad}× missing RPE or duration (not counted in load)", { missingLoad: stats.missingLoad })}
		{/if}
	</p>
	<p class="bf-muted bf-num-foot">
		{t("Load = RPE × minutes")} <BasisTag basis={SESSION_LOAD_BASIS} named />{t(". Lifted = kg × reps of working sets; for bodyweight exercises it's estimated from body weight (share for push-ups")} <BasisTag basis={PUSHUP_BODYWEIGHT_BASIS} named />{t(", rough for other exercises).")}
	</p>
</section>

<style>
	p {
		margin: 0;
	}

	.bf-num-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-num-nav {
		display: flex;
		align-items: center;
		gap: var(--size-4-1);
	}

	.bf-num-nav button {
		width: 28px;
		padding: 0;
	}

	/* Pevná šířka popisku – šipky se při změně období nehýbou. */
	.bf-num-label {
		width: 11.5em;
		text-align: center;
		font-size: var(--font-ui-small);
		font-variant-numeric: tabular-nums;
	}

	.bf-num-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
		gap: var(--size-4-2);
	}

	.bf-num-tile {
		height: 72px;
		box-sizing: border-box;
		padding: var(--size-4-2);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		overflow: hidden;
	}

	.bf-num-name,
	.bf-num-change {
		color: var(--text-muted);
		font-size: var(--font-ui-smaller);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bf-num-value {
		font-size: var(--font-ui-medium);
		font-weight: var(--font-bold);
		white-space: nowrap;
	}

	.bf-num-foot {
		font-size: var(--font-ui-small);
	}
</style>
