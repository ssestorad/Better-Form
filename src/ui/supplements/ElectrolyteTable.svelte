<script lang="ts">
	// Elektrolyty a tekutiny: potřeba v den bez tréninku a s tréninkem pro zadanou váhu.
	import { t } from "../../i18n";
	import { untrack } from "svelte";
	import {
		DRINK_SODIUM_MG_PER_L,
		ELECTROLYTES,
		ELECTROLYTE_BASIS,
		SWEAT_LEVEL_LABELS,
		SWEAT_RATES,
		electrolyteNeed,
		fluidPlan,
		sweatLossL,
		type Sex,
		type SweatLevel,
	} from "../../calc/electrolytes";
	import { getSource } from "../../evidence/sources";
	import { EVIDENCE_LABELS } from "../../model/constants";
	import NumInput from "../components/NumInput.svelte";
	import { formatNumber } from "../format";
	import { formatAmount } from "./text";

	interface Props {
		/** Hmotnost z check-inu nebo profilu – výchozí hodnota pole. */
		weightKg: number | null;
		sex: Sex;
	}
	let { weightKg, sex }: Props = $props();

	const LEVELS = Object.keys(SWEAT_RATES) as SweatLevel[];
	const sources = ELECTROLYTE_BASIS.sourceIds.map(getSource);

	// Zadání je jen pro tuto tabulku – nic se neukládá.
	let weight = $state<number | undefined>(untrack(() => weightKg ?? undefined));
	let minutes = $state<number | undefined>(60);
	let level = $state<SweatLevel>("medium");

	const validWeight = $derived(weight !== undefined && !Number.isNaN(weight) && weight > 0 ? weight : null);
	const validMinutes = $derived(minutes !== undefined && !Number.isNaN(minutes) && minutes > 0 ? minutes : 0);
	const sweatL = $derived(sweatLossL(SWEAT_RATES[level], validMinutes));
	const rows = $derived(ELECTROLYTES.map((e) => electrolyteNeed(e, validWeight, sex, sweatL)));
	const fluids = $derived(fluidPlan(validWeight, sweatL));

	const round = (mg: number) => formatAmount(Math.round(mg));
</script>

<section class="bf-card">
	<h4>{t("Electrolytes and fluids")}</h4>
	<div class="bf-elec-inputs">
		<label class="bf-field">
			<span class="bf-field-label">{t("Weight (kg)")}</span>
			<NumInput bind:value={weight} label={t("Weight in kg")} decimals />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Workout duration (min)")}</span>
			<NumInput bind:value={minutes} label={t("Workout duration in minutes")} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Sweating")}</span>
			<select class="dropdown" bind:value={level}>
				{#each LEVELS as l (l)}<option value={l}>{SWEAT_LEVEL_LABELS[l]}</option>{/each}
			</select>
		</label>
	</div>

	<div class="bf-elec" role="table">
		<div class="bf-elec-tr bf-muted" role="row">
			<span role="columnheader">{t("Electrolyte")}</span>
			<span role="columnheader" class="bf-elec-num">{t("Rest day")}</span>
			<span role="columnheader" class="bf-elec-num">{t("Sweat loss")}</span>
			<span role="columnheader" class="bf-elec-num">{t("Training day")}</span>
		</div>
		{#each rows as row (row.electrolyte.id)}
			<div class="bf-elec-tr" role="row" title={row.electrolyte.note}>
				<span role="cell">{row.electrolyte.name} <span class="bf-muted">({row.electrolyte.symbol})</span></span>
				<span role="cell" class="bf-elec-num">
					{round(row.restMg)}
					{#if row.restMgPerKg !== null}<span class="bf-muted bf-elec-sub">{t("{v} mg/kg", { v: formatNumber(row.restMgPerKg, 1) })}</span>{/if}
				</span>
				<span role="cell" class="bf-elec-num">
					{round(row.lossMg.avg)}
					<span class="bf-muted bf-elec-sub">{round(row.lossMg.min)} – {round(row.lossMg.max)}</span>
				</span>
				<span role="cell" class="bf-elec-num bf-elec-strong">{round(row.trainingMg)}</span>
			</div>
		{/each}
	</div>
	{#if sex === null}
		<p class="bf-muted bf-small">{t("Magnesium: 350 mg applies to men, 300 mg to women. Set your sex in your profile.")}</p>
	{/if}

	<dl class="bf-elec-fluids">
		<dt>{t("Before training")}</dt>
		<dd>
			{#if fluids.preMl}
				{t("{v}–{v2} ml of fluid at least 4 hours before (5–7 ml/kg)", { v: formatNumber(fluids.preMl.min, 0), v2: formatNumber(fluids.preMl.max, 0) })}
			{:else}
				{t("5–7 ml of fluid per kg of body weight at least 4 hours before – enter your weight")}
			{/if}
		</dd>
		<dt>{t("Estimated sweat loss")}</dt>
		<dd>{t("{v} l per workout (about {v} kg of body weight)", { v: formatNumber(fluids.sweatL, 1) })}</dd>
		<dt>{t("After training")}</dt>
		<dd>
			{t("about 1.5 l for every kilogram lost – with this estimate up to {v} l, including what you drink during training", { v: formatNumber(fluids.rehydrateL, 1) })}
		</dd>
		<dt>{t("Drink for longer sessions")}</dt>
		<dd>{t("{v}–{v2} mg of sodium per liter", { v: formatNumber(DRINK_SODIUM_MG_PER_L.min, 0), v2: formatNumber(DRINK_SODIUM_MG_PER_L.max, 0) })}</dd>
	</dl>

	<ul class="bf-muted bf-small bf-elec-notes">
		<li>
			<strong>{t("Rest day")}</strong> {t("is the reference intake for adults according to EFSA. These values don't depend on weight – the mg/kg figure is just a conversion to your weight for orientation.")}
		</li>
		<li>
			<strong>{t("Training day")}</strong> {t("= reference intake + average sweat loss. Actual loss varies several-fold between people (the range is below the average); you'll find it more precisely by weighing yourself before and after training.")}
		</li>
		<li>{t("A normal diet usually has more than 2 g of sodium a day, so a short workout doesn't need extra.")}</li>
		<li>{t("The sweat rate is an estimate from the options above")} <span class="bf-tag">{t("practice")}</span>{t(", the other numbers come from sources")} <span class="bf-tag">{EVIDENCE_LABELS[ELECTROLYTE_BASIS.evidence]}</span>.</li>
		<li>{t("If you have heart or kidney disease or high blood pressure, ask your doctor about salt and potassium.")}</li>
	</ul>
	<details class="bf-small">
		<summary class="bf-muted">{t("Sources")}</summary>
		<ul>
			{#each sources as source (source.short)}
				<li>
					{#if source.url}<a href={source.url} target="_blank" rel="noopener">{source.citation}</a>{:else}{source.citation}{/if}
					{#if source.evidence}<span class="bf-tag">{EVIDENCE_LABELS[source.evidence]}</span>{/if}
				</li>
			{/each}
		</ul>
	</details>
</section>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-small {
		font-size: var(--font-ui-small);
	}

	.bf-elec-inputs {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr);
		gap: var(--size-4-2);
	}

	.bf-elec-inputs select {
		width: 100%;
	}

	.bf-elec {
		display: flex;
		flex-direction: column;
		font-size: var(--font-ui-small);
	}

	/* Pevné sloupce, čísla zarovnaná vpravo – změna zadání nic neposouvá. */
	.bf-elec-tr {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) repeat(3, minmax(0, 1fr));
		gap: var(--size-4-2);
		padding: var(--size-4-1) 0;
		border-top: 1px solid var(--background-modifier-border);
	}

	.bf-elec-tr:first-child {
		border-top: none;
	}

	.bf-elec-num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.bf-elec-sub {
		display: block;
		font-size: var(--font-ui-smaller);
	}

	.bf-elec-strong {
		font-weight: var(--font-semibold);
	}

	.bf-elec-fluids {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: var(--size-4-1) var(--size-4-3);
		margin: 0;
		font-size: var(--font-ui-small);
	}

	.bf-elec-fluids dt {
		color: var(--text-muted);
	}

	.bf-elec-fluids dd {
		margin: 0;
	}

	.bf-elec-notes,
	details ul {
		margin: 0;
		padding-left: var(--size-4-4);
	}

	summary {
		cursor: pointer;
	}

	@container (max-width: 420px) {
		.bf-elec-inputs {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}
</style>
