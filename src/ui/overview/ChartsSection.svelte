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
		{ days: 42, label: t("6 týdnů") },
		{ days: 91, label: t("3 měsíce") },
		{ days: 365, label: t("Rok") },
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

<div class="bf-seg" role="tablist" aria-label={t("Období grafů")}>
	{#each RANGES as r (r.days)}
		<button type="button" role="tab" aria-selected={rangeDays === r.days} class:is-active={rangeDays === r.days} onclick={() => (rangeDays = r.days)}>{r.label}</button>
	{/each}
</div>

<section class="bf-card">
	<h4>{t("Zátěž, kondice, únava a forma")}</h4>
	{#if hasLoad}
		<LineChart
			{dates}
			lines={modelReady
				? [
						{ label: t("Kondice"), color: COLORS[0]!, values: load.ctl },
						{ label: t("Únava"), color: COLORS[1]!, values: load.atl },
						{ label: t("Forma"), color: COLORS[2]!, values: load.tsb, dashed: true },
					]
				: []}
			bars={{ label: t("Zátěž dne"), values: load.load }}
			zero
			label={t("Zátěž, kondice, únava a forma")}
		/>
	{:else}
		<p class="bf-muted">{t("V tomto období není trénink s RPE a délkou.")}</p>
	{/if}
	{#if !modelReady}
		<p class="bf-muted bf-ch-note">{t("Sbírám data pro model kondice ({dataDays} z {loadModelMinDays} dní).", { dataDays, loadModelMinDays: thresholds.loadModelMinDays })}</p>
	{/if}
	<p class="bf-muted bf-ch-note">
		{t("Kondice = dlouhodobý průměr zátěže ({ctlDays} dní), únava = krátkodobý ({atlDays} dní), forma = kondice − únava.", { ctlDays: thresholds.ctlDays, atlDays: thresholds.atlDays })}
		<BasisTag basis={FITNESS_BASIS} named /> {t("Je to model trendu, ne přesná předpověď výkonu.")}
	</p>
</section>

<section class="bf-card">
	<h4>{t("Tempo běhu")}</h4>
	{#if hasPace}
		<LineChart {dates} lines={[{ label: "Tempo", color: COLORS[0]!, values: pace, connect: true, dots: true }]} format={formatPace} invert label={t("Tempo běhu")} />
		<p class="bf-muted bf-ch-note">{t("Průměrné tempo běhů dne. Rychlejší tempo je v grafu výš; lehké a rychlé běhy se tu míchají.")}</p>
	{:else}
		<p class="bf-muted">{t("V tomto období není běh se vzdáleností a časem.")}</p>
	{/if}
</section>

<section class="bf-card">
	<h4>{t("Odhad 1RM hlavních cviků")}</h4>
	{#if oneRm.length > 0}
		<LineChart {dates} lines={oneRm.map((line, i) => ({ label: line.name, color: COLORS[i % COLORS.length]!, values: line.values, connect: true, dots: true }))} format={kg} label={t("Odhad 1RM")} />
		<p class="bf-muted bf-ch-note">
			{t("Nejčastěji cvičené cviky období, nejlepší série dne přepočtená vzorcem Epley (do 10 opakování).")} <BasisTag basis={EPLEY_BASIS} />
		</p>
	{:else}
		<p class="bf-muted">{t("Sbírám data – graf se objeví, až bude mít některý silový cvik v období aspoň dva tréninky se sérií do 10 opakování.")}</p>
	{/if}
</section>

<section class="bf-card">
	<h4>{t("Spánek a zátěž")}</h4>
	{#if hasSleep}
		<LineChart
			{dates}
			lines={[{ label: t("Spánek"), color: COLORS[0]!, values: sleep, connect: true, dots: rangeDays <= 91 }]}
			bars={{ label: t("Zátěž dne"), values: load.load }}
			format={hours}
			label={t("Délka spánku a denní zátěž")}
		/>
	{:else}
		<p class="bf-muted">{t("Sbírám data – délka spánku se bere z ranního check-inu.")}</p>
	{/if}
</section>

<section class="bf-card">
	<h4>{t("Váha")}</h4>
	{#if hasWeight}
		<LineChart
			{dates}
			lines={[
				{ label: t("Průměr 7 dní"), color: COLORS[0]!, values: weight.average, connect: true },
				{ label: t("Vážení"), color: "var(--text-muted)", values: weight.value, pointsOnly: true },
			]}
			format={kg1}
			label={t("Váha a klouzavý průměr")}
		/>
		<p class="bf-muted bf-ch-note">
			{#if weightNow.ready}
				{t("Trend za {v} týdny: {v2} (1 kg ≈ 7 700 kcal).", { v: TREND_WINDOW_DAYS / 7, v2: trendText(weightNow) })} <BasisTag basis={{ sourceIds: ["practice"], evidence: "practice" }} />
			{:else}
				{t("Sbírám data pro trend ({samples} z {TREND_MIN_SAMPLES} vážení za poslední {v} týdny).", { samples: weightNow.samples, TREND_MIN_SAMPLES, v: TREND_WINDOW_DAYS / 7 })}
			{/if}
			{t("Průměr za 7 dní vyhlazuje denní výkyvy (voda, sůl, jídlo). Co trend znamená pro jídlo, je na kartě Výživa.")}
		</p>
	{:else}
		<p class="bf-muted">{t("V tomto období není zapsaná váha – zapisuje se v ranním check-inu.")}</p>
	{/if}
</section>

<section class="bf-card">
	<h4>{t("HRV (rMSSD)")}</h4>
	{#if hasHrv}
		<LineChart
			{dates}
			lines={[
				{ label: t("Průměr 7 dní"), color: COLORS[0]!, values: hrv.current },
				{ label: t("Měření"), color: "var(--text-muted)", values: hrv.value, pointsOnly: true },
			]}
			band={{ label: t("normální pásmo"), low: hrv.low, high: hrv.high }}
			format={ms}
			label={t("HRV s normálním pásmem")}
		/>
	{:else}
		<p class="bf-muted">{t("V tomto období není zapsané HRV.")}</p>
	{/if}
	{#if !hrvNow.ready}
		<p class="bf-muted bf-ch-note">
			{hrvNow.reason === "baseline"
				? t("Sbírám data pro osobní normu ({have} z {need} měření za {hrvBaselineDays} dní).", { have: hrvNow.have, need: hrvNow.need, hrvBaselineDays: thresholds.hrvBaselineDays })
				: t("Pro vyhodnocení jsou potřeba aspoň {need} měření za posledních {hrvWindowDays} dní (teď {have}).", { need: hrvNow.need, hrvWindowDays: thresholds.hrvWindowDays, have: hrvNow.have })}
		</p>
	{/if}
	<p class="bf-muted bf-ch-note">
		{t("Průměr za {hrvWindowDays} dní proti normě = průměr ± {v} SD za {hrvBaselineDays} dní, počítáno v logaritmu.", { hrvWindowDays: thresholds.hrvWindowDays, v: formatNumber(thresholds.hrvSdFactor, 2), hrvBaselineDays: thresholds.hrvBaselineDays })}
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
