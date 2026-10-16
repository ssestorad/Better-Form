<script lang="ts">
	// Grafy karty Přehled (SPEC 5.4): zátěž s kondicí / únavou / formou, tempo běhu,
	// odhad 1RM, spánek vs. zátěž, HRV s normálním pásmem. Vlastní SVG, bez knihovny.
	import { t } from "../../i18n";
	import { dateRange, daySamples, hrvChart, loadChart, oneRmChart, paceChart, sleepChart } from "../../calc/chartData";
	import { FITNESS_BASIS, loadDataDays } from "../../calc/fitness";
	import { HRV_BASIS, hrvBaseline } from "../../calc/hrv";
	import { EPLEY_BASIS } from "../../calc/oneRm";
	import { formatPace } from "../../calc/performance";
	import { exerciseSeries, type RecordContext } from "../../calc/records";
	import { TREND_MIN_SAMPLES, TREND_WINDOW_DAYS, weightChart, weightPoints, weightTrend } from "../../calc/weight";
	import { addDays } from "../../model/dates";
	import { trendText } from "../nutrition/text";
	import type { DayNote, WorkoutNote } from "../../model/types";
	import type { ThresholdSettings } from "../../settings/settings";
	import LineChart from "../charts/LineChart.svelte";
	import { researchTopic } from "../../seed/research";
	import BasisTag from "../components/BasisTag.svelte";
	import ResearchCard from "../components/ResearchCard.svelte";
	import { formatNumber } from "../format";

	interface Props {
		workouts: WorkoutNote[];
		days: DayNote[];
		byDate: Map<string, number>;
		ctx: RecordContext;
		thresholds: ThresholdSettings;
		today: string;
	}
	let { workouts, days, byDate, ctx, thresholds, today }: Props = $props();

	const RANGES = [
		{ days: 42, label: t("6 weeks") },
		{ days: 91, label: t("3 months") },
		{ days: 365, label: t("Year") },
	] as const;
	const COLORS = ["var(--interactive-accent)", "var(--color-orange)", "var(--color-green)", "var(--color-purple)"];

	let rangeDays = $state<number>(91);
	const dates = $derived(dateRange(addDays(today, -(rangeDays - 1)), today));

	// 1. Zátěž a model kondice.
	const load = $derived(loadChart(byDate, dates, thresholds.ctlDays, thresholds.atlDays));
	const dataDays = $derived(loadDataDays(byDate, today));
	const modelReady = $derived(dataDays >= thresholds.loadModelMinDays);
	const hasLoad = $derived(load.load.some((v) => v > 0));

	// 2. Tempo běhu.
	const pace = $derived(paceChart(workouts, dates));
	const hasPace = $derived(pace.some((v) => v !== null));

	// 3. Odhad 1RM.
	const oneRm = $derived(oneRmChart(exerciseSeries(workouts, ctx), dates, 3));

	// 4. Spánek a zátěž.
	const sleep = $derived(sleepChart(days, dates));
	const hasSleep = $derived(sleep.some((v) => v !== null));

	// 5. HRV.
	const hrvOptions = $derived({
		windowDays: thresholds.hrvWindowDays,
		baselineDays: thresholds.hrvBaselineDays,
		minSamples: thresholds.hrvMinSamples,
		sdFactor: thresholds.hrvSdFactor,
	});
	const hrvSamples = $derived(daySamples(days, (d) => d.hrv.rmssd_ms));
	const hrv = $derived(hrvChart(hrvSamples, dates, hrvOptions));
	const hrvNow = $derived(hrvBaseline(hrvSamples, today, hrvOptions));
	const hasHrv = $derived(hrv.value.some((v) => v !== null));

	// 6. Váha.
	const weights = $derived(weightPoints(days));
	const weight = $derived(weightChart(weights, dates));
	const hasWeight = $derived(weight.value.some((v) => v !== null));
	const weightNow = $derived(weightTrend(weights, today));
	const kg1 = (v: number) => `${formatNumber(v, 1)} kg`;

	const ms = (v: number) => `${formatNumber(v, 0)} ms`;
	const hours = (v: number) => `${formatNumber(v, 1)} h`;
	const kg = (v: number) => `${formatNumber(v, 0)} kg`;
</script>

<div class="bf-seg" role="tablist" aria-label={t("Chart period")}>
	{#each RANGES as r (r.days)}
		<button type="button" role="tab" aria-selected={rangeDays === r.days} class:is-active={rangeDays === r.days} onclick={() => (rangeDays = r.days)}>{r.label}</button>
	{/each}
</div>

<section class="bf-card">
	<h4>{t("Load, fitness, fatigue and form")}</h4>
	{#if hasLoad}
		<LineChart
			{dates}
			lines={modelReady
				? [
						{ label: t("Fitness"), color: COLORS[0]!, values: load.ctl },
						{ label: t("Fatigue"), color: COLORS[1]!, values: load.atl },
						{ label: t("Form"), color: COLORS[2]!, values: load.tsb, dashed: true },
					]
				: []}
			bars={{ label: t("Daily load"), values: load.load }}
			zero
			label={t("Load, fitness, fatigue and form")}
		/>
	{:else}
		<p class="bf-muted">{t("No workout with RPE and duration in this period.")}</p>
	{/if}
	{#if !modelReady}
		<p class="bf-muted bf-ch-note">{t("Collecting data for the fitness model ({dataDays} of {loadModelMinDays} days).", { dataDays, loadModelMinDays: thresholds.loadModelMinDays })}</p>
	{/if}
	<p class="bf-muted bf-ch-note">
		{t("Fitness = long-term average load ({ctlDays} days), fatigue = short-term ({atlDays} days), form = fitness − fatigue.", { ctlDays: thresholds.ctlDays, atlDays: thresholds.atlDays })}
		<BasisTag basis={FITNESS_BASIS} named /> {t("It's a trend model, not an exact performance prediction.")}
	</p>
</section>

<section class="bf-card">
	<h4>{t("Running pace")}</h4>
	{#if hasPace}
		<LineChart {dates} lines={[{ label: "Tempo", color: COLORS[0]!, values: pace, connect: true, dots: true }]} format={formatPace} invert label={t("Running pace")} />
		<p class="bf-muted bf-ch-note">{t("Average pace of the day's runs. A faster pace is higher on the chart; easy and fast runs are mixed here.")}</p>
	{:else}
		<p class="bf-muted">{t("No run with distance and time in this period.")}</p>
	{/if}
</section>

<section class="bf-card">
	<h4>{t("Estimated 1RM of main exercises")}</h4>
	{#if oneRm.length > 0}
		<LineChart {dates} lines={oneRm.map((line, i) => ({ label: line.name, color: COLORS[i % COLORS.length]!, values: line.values, connect: true, dots: true }))} format={kg} label={t("Estimated 1RM")} />
		<p class="bf-muted bf-ch-note">
			{t("The period's most frequent exercises, the day's best set converted with the Epley formula (up to 10 reps).")} <BasisTag basis={EPLEY_BASIS} />
		</p>
	{:else}
		<p class="bf-muted">{t("Collecting data – the chart appears once a strength exercise has at least two workouts in the period with a set of up to 10 reps.")}</p>
	{/if}
</section>

<section class="bf-card">
	<h4>{t("Sleep and load")}</h4>
	{#if hasSleep}
		<LineChart
			{dates}
			lines={[{ label: t("Sleep"), color: COLORS[0]!, values: sleep, connect: true, dots: rangeDays <= 91 }]}
			bars={{ label: t("Daily load"), values: load.load }}
			format={hours}
			label={t("Sleep duration and daily load")}
		/>
	{:else}
		<p class="bf-muted">{t("Collecting data – sleep duration comes from the morning check-in.")}</p>
	{/if}
</section>

<section class="bf-card">
	<h4>{t("Weight")}</h4>
	{#if hasWeight}
		<LineChart
			{dates}
			lines={[
				{ label: t("7-day average"), color: COLORS[0]!, values: weight.average, connect: true },
				{ label: t("Weigh-ins"), color: "var(--text-muted)", values: weight.value, pointsOnly: true },
			]}
			format={kg1}
			label={t("Weight and rolling average")}
		/>
		<p class="bf-muted bf-ch-note">
			{#if weightNow.ready}
				{t("Trend over {v} weeks: {v2} (1 kg ≈ 7,700 kcal).", { v: TREND_WINDOW_DAYS / 7, v2: trendText(weightNow) })} <BasisTag basis={{ sourceIds: ["practice"], evidence: "practice" }} />
			{:else}
				{t("Collecting data for the trend ({samples} of {TREND_MIN_SAMPLES} weigh-ins in the last {v} weeks).", { samples: weightNow.samples, TREND_MIN_SAMPLES, v: TREND_WINDOW_DAYS / 7 })}
			{/if}
			{t("The 7-day average smooths out daily swings (water, salt, food). What the trend means for your diet is on the Nutrition tab.")}
		</p>
	{:else}
		<p class="bf-muted">{t("No weight logged in this period – it's logged in the morning check-in.")}</p>
	{/if}
</section>

<section class="bf-card">
	<h4>{t("HRV (rMSSD)")}</h4>
	{#if hasHrv}
		<LineChart
			{dates}
			lines={[
				{ label: t("7-day average"), color: COLORS[0]!, values: hrv.current },
				{ label: t("Readings"), color: "var(--text-muted)", values: hrv.value, pointsOnly: true },
			]}
			band={{ label: t("normal range"), low: hrv.low, high: hrv.high }}
			format={ms}
			label={t("HRV with normal range")}
		/>
	{:else}
		<p class="bf-muted">{t("No HRV logged in this period.")}</p>
	{/if}
	{#if !hrvNow.ready}
		<p class="bf-muted bf-ch-note">
			{hrvNow.reason === "baseline"
				? t("Collecting data for your personal baseline ({have} of {need} readings over {hrvBaselineDays} days).", { have: hrvNow.have, need: hrvNow.need, hrvBaselineDays: thresholds.hrvBaselineDays })
				: t("At least {need} readings in the last {hrvWindowDays} days are needed for an assessment (now {have}).", { need: hrvNow.need, hrvWindowDays: thresholds.hrvWindowDays, have: hrvNow.have })}
		</p>
	{/if}
	<p class="bf-muted bf-ch-note">
		{t("{hrvWindowDays}-day average against the baseline = mean ± {v} SD over {hrvBaselineDays} days, calculated on a log scale.", { hrvWindowDays: thresholds.hrvWindowDays, v: formatNumber(thresholds.hrvSdFactor, 2), hrvBaselineDays: thresholds.hrvBaselineDays })}
		<BasisTag basis={HRV_BASIS} named />
	</p>
	{#if researchTopic("hrv_training")}<ResearchCard topic={researchTopic("hrv_training")!} />{/if}
</section>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-ch-note {
		font-size: var(--font-ui-smaller);
	}
</style>
