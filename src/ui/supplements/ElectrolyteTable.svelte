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
	<h4>{t("Elektrolyty a tekutiny")}</h4>
	<div class="bf-elec-inputs">
		<label class="bf-field">
			<span class="bf-field-label">{t("Váha (kg)")}</span>
			<NumInput bind:value={weight} label={t("Váha v kg")} decimals />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Délka tréninku (min)")}</span>
			<NumInput bind:value={minutes} label={t("Délka tréninku v minutách")} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Pocení")}</span>
			<select class="dropdown" bind:value={level}>
				{#each LEVELS as l (l)}<option value={l}>{SWEAT_LEVEL_LABELS[l]}</option>{/each}
			</select>
		</label>
	</div>

	<div class="bf-elec" role="table">
		<div class="bf-elec-tr bf-muted" role="row">
			<span role="columnheader">{t("Elektrolyt")}</span>
			<span role="columnheader" class="bf-elec-num">{t("Den bez tréninku")}</span>
			<span role="columnheader" class="bf-elec-num">{t("Ztráta potem")}</span>
			<span role="columnheader" class="bf-elec-num">{t("Den s tréninkem")}</span>
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
		<p class="bf-muted bf-small">{t("Hořčík: 350 mg platí pro muže, pro ženy 300 mg. Pohlaví nastavíš v profilu.")}</p>
	{/if}

	<dl class="bf-elec-fluids">
		<dt>{t("Před tréninkem")}</dt>
		<dd>
			{#if fluids.preMl}
				{t("{v}–{v2} ml tekutin nejméně 4 hodiny předem (5–7 ml/kg)", { v: formatNumber(fluids.preMl.min, 0), v2: formatNumber(fluids.preMl.max, 0) })}
			{:else}
				{t("5–7 ml tekutin na kg hmotnosti nejméně 4 hodiny předem – zadej váhu")}
			{/if}
		</dd>
		<dt>{t("Odhad ztráty potem")}</dt>
		<dd>{t("{v} l za trénink (asi {v} kg hmotnosti)", { v: formatNumber(fluids.sweatL, 1) })}</dd>
		<dt>{t("Po tréninku")}</dt>
		<dd>
			{t("asi 1,5 l na každý ztracený kilogram – při tomto odhadu do {v} l včetně toho, co vypiješ během tréninku", { v: formatNumber(fluids.rehydrateL, 1) })}
		</dd>
		<dt>{t("Nápoj při delší zátěži")}</dt>
		<dd>{t("{v}–{v2} mg sodíku na litr", { v: formatNumber(DRINK_SODIUM_MG_PER_L.min, 0), v2: formatNumber(DRINK_SODIUM_MG_PER_L.max, 0) })}</dd>
	</dl>

	<ul class="bf-muted bf-small bf-elec-notes">
		<li>
			<strong>{t("Den bez tréninku")}</strong> {t("je referenční příjem pro dospělé podle EFSA. Tyto hodnoty na váze nezávisí – údaj v mg/kg je jen přepočet na tvou váhu pro orientaci.")}
		</li>
		<li>
			<strong>{t("Den s tréninkem")}</strong> {t("= referenční příjem + průměrná ztráta potem. Skutečná ztráta se mezi lidmi liší až několikanásobně (rozsah je pod průměrem), přesněji ji zjistíš vážením před tréninkem a po něm.")}
		</li>
		<li>{t("Sodíku má běžná strava obvykle víc než 2 g denně, takže krátký trénink ho navíc nevyžaduje.")}</li>
		<li>{t("Rychlost pocení je odhad z nabídky výše")} <span class="bf-tag">{t("praxe")}</span>{t(", ostatní čísla ze zdrojů")} <span class="bf-tag">{EVIDENCE_LABELS[ELECTROLYTE_BASIS.evidence]}</span>.</li>
		<li>{t("Při onemocnění srdce, ledvin nebo vysokém tlaku se o soli a draslíku poraď s lékařem.")}</li>
	</ul>
	<details class="bf-small">
		<summary class="bf-muted">{t("Zdroje")}</summary>
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
