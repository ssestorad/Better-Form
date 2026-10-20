<script lang="ts">
	// Tabulky v Suplementech: doporučený příjem a horní limity, co nebrat spolu, suplementy a léky, kofein, pro závodníky.
	import { t } from "../../i18n";
	import type { Sex } from "../../calc/electrolytes";
	import {
		CAFFEINE_BEFORE_BED,
		CAFFEINE_SAFE_MG,
		CAFFEINE_SOURCES,
		CAFFEINE_TABLE_BASIS,
		COMBINATIONS,
		INTAKE_TABLE_BASIS,
		intakeRows,
		latestBefore,
		servingsWithin,
	} from "../../calc/supplementTables";
	import type { SubstanceTotal } from "../../calc/supplements";
	import { CONTAMINATION_SOURCES, DRUG_INTERACTIONS, MEDICATION_LABELS, MEDICATIONS, WADA_NOTES, WADA_SOURCES, type MedicationId } from "../../calc/supplementSafety";
	import { catalogSupplement } from "../../seed/supplements";
	import InteractionItem from "./InteractionItem.svelte";
	import { getSource, type SourceId } from "../../evidence/sources";
	import { EVIDENCE_LABELS } from "../../model/constants";
	import { formatNumber } from "../format";

	interface Props {
		sex: Sex;
		/** Poslední zapsané ulehnutí v minutách po půlnoci, nebo null. */
		bedtime: number | null;
		/** Látky ze všech aktivních suplementů sečtené za den. */
		totals: SubstanceTotal[];
		/** Skupiny léků z profilu – jejich řádky se zvýrazní. */
		medications: readonly MedicationId[];
	}
	let { sex, bedtime, totals, medications }: Props = $props();

	/** Interakce po skupinách léků, ve stejném pořadí jako v nastavení. */
	const byMedication = MEDICATIONS.map((m) => ({ medication: m, rows: DRUG_INTERACTIONS.filter((i) => i.medications.includes(m)) }));
	const substanceName = (id: string) => catalogSupplement(id)?.name ?? id;

	const rows = $derived(intakeRows(sex, totals));
	/** Hodnota v jednotce řádku (µg nebo mg), aby doporučení i limit byly ve stejné. */
	const amount = (mg: number, unit: "mg" | "µg") => (unit === "µg" ? formatNumber(mg * 1000, 0) : formatNumber(mg, 1));
	const range = (r: [number, number], unit: "mg" | "µg") => (r[0] === r[1] ? amount(r[0], unit) : `${amount(r[0], unit)}–${amount(r[1], unit)}`) + ` ${unit}`;
	const sourcesOf = (ids: readonly SourceId[]) => ids.map(getSource);
</script>

{#snippet sourceList(ids: readonly SourceId[])}
	<details class="bf-small">
		<summary class="bf-muted">{t("Sources")}</summary>
		<ul>
			{#each sourcesOf(ids) as source (source.short)}
				<li>
					{#if source.url}<a href={source.url} target="_blank" rel="noopener">{source.citation}</a>{:else}{source.citation}{/if}
					{#if source.evidence}<span class="bf-tag">{EVIDENCE_LABELS[source.evidence]}</span>{/if}
					{#if source.note}<div class="bf-muted">{source.note}</div>{/if}
				</li>
			{/each}
		</ul>
	</details>
{/snippet}

<section class="bf-card">
	<h4>{t("Reference intake and upper limits")}</h4>
	<div class="bf-ref" role="table">
		<div class="bf-ref-tr bf-ref-4 bf-muted" role="row">
			<span role="columnheader">{t("Nutrient")}</span>
			<span role="columnheader" class="bf-ref-num">{t("Recommended a day")}</span>
			<span role="columnheader" class="bf-ref-num">{t("Upper limit")}</span>
			<span role="columnheader" class="bf-ref-num">{t("From your supplements")}</span>
		</div>
		{#each rows as row (row.reference.id)}
			<div class="bf-ref-tr bf-ref-4" role="row" title={row.reference.note}>
				<span role="cell">{row.reference.name}{#if row.reference.adequate}<span class="bf-muted">&nbsp;(AI)</span>{/if}</span>
				<span role="cell" class="bf-ref-num">{range(row.recommendedMg, row.reference.unit)}</span>
				<span role="cell" class="bf-ref-num">
					{#if row.limitMg !== null}{amount(row.limitMg, row.reference.unit)} {row.reference.unit}{#if row.supplementsOnly}<span class="bf-muted">*</span>{/if}{:else}<span class="bf-muted">–</span>{/if}
				</span>
				<span role="cell" class="bf-ref-num" class:bf-ref-over={row.overLimit}>
					{#if row.fromSupplementsMg !== null}{amount(row.fromSupplementsMg, row.reference.unit)} {row.reference.unit}{:else}<span class="bf-muted">–</span>{/if}
				</span>
			</div>
		{/each}
	</div>
	<ul class="bf-muted bf-small bf-ref-list">
		<li>{t("Reference values for adults according to EFSA; AI = adequate intake where data aren't enough for a recommended intake. Hover over a row for details.")}</li>
		{#if sex === null}<li>{t("Set your sex in your profile – where men and women differ, the table now shows both.")}</li>{/if}
		<li>{t("The upper limit applies to everything including food; * = only to supplements (magnesium). Food usually covers part of the recommended intake – the supplement column isn't your whole intake.")}</li>
		<li>{t("Supplements whose dose is in capsules or tablets without an ingredient list can't be added up.")}</li>
	</ul>
	{@render sourceList(INTAKE_TABLE_BASIS.sourceIds)}
</section>

<section class="bf-card">
	<h4>{t("What not to take together")}</h4>
	<ul class="bf-ref-combos">
		{#each COMBINATIONS as c (c.id)}
			<InteractionItem title={c.text.pair} finding={c.text.finding} advice={c.text.advice} sources={c.sources} />
		{/each}
	</ul>
	<p class="bf-muted bf-small">{t("If you take medication, ask a pharmacist about timing – some supplements affect how medicines are absorbed.")}</p>
</section>

<section class="bf-card">
	<h4>{t("Supplements and medication")}</h4>
	{#if medications.length === 0}
		<p class="bf-muted bf-small">{t("Set the medication you take in settings → Profile and the matching rows will be highlighted here and in your supplements.")}</p>
	{/if}
	{#each byMedication as group (group.medication)}
		<h5 class:bf-ref-mine={medications.includes(group.medication)}>{MEDICATION_LABELS[group.medication]}</h5>
		<ul class="bf-ref-combos">
			{#each group.rows as row, ri (ri)}
				<InteractionItem title={row.substances.map(substanceName).join(", ")} finding={row.text.finding} advice={row.text.advice} sources={row.sources} avoid={row.avoid} />
			{/each}
		</ul>
	{/each}
	<p class="bf-muted bf-small">{t("Only interactions with a verified source are listed – the absence of a row doesn't mean a combination is safe. If you take medication, ask a pharmacist before starting a supplement.")}</p>
</section>

<section class="bf-card">
	<h4>{t("Caffeine")}</h4>
	<p class="bf-muted bf-small">
		{t("Safe for healthy adults according to EFSA: up to {single} mg at once and {daily} mg a day; in pregnancy and while breastfeeding up to {pregnancy} mg a day.", { single: CAFFEINE_SAFE_MG.single, daily: CAFFEINE_SAFE_MG.daily, pregnancy: CAFFEINE_SAFE_MG.pregnancy })}
	</p>
	<div class="bf-ref" role="table">
		<div class="bf-ref-tr bf-ref-4 bf-muted" role="row">
			<span role="columnheader">{t("Drink or food")}</span>
			<span role="columnheader" class="bf-ref-num">{t("Caffeine")}</span>
			<span role="columnheader" class="bf-ref-num">{t("At once")}</span>
			<span role="columnheader" class="bf-ref-num">{t("A day")}</span>
		</div>
		{#each CAFFEINE_SOURCES as source (source.id)}
			<div class="bf-ref-tr bf-ref-4" role="row">
				<span role="cell">{source.name} <span class="bf-muted">({source.amount})</span></span>
				<span role="cell" class="bf-ref-num">{source.mg} mg</span>
				<span role="cell" class="bf-ref-num">{servingsWithin(CAFFEINE_SAFE_MG.single, source.mg)}×</span>
				<span role="cell" class="bf-ref-num">{servingsWithin(CAFFEINE_SAFE_MG.daily, source.mg)}×</span>
			</div>
		{/each}
	</div>
	<p class="bf-muted bf-small">{t("“At once” and “a day” = how many servings fit within the limit. Caffeine content of coffee and chocolate varies a lot.")}</p>
	<h5>{t("Before sleep")}</h5>
	<ul class="bf-small bf-ref-list">
		{#each CAFFEINE_BEFORE_BED as gap (gap.mg)}
			<li>
				{t("{mg} mg (e.g. {what}): at least {hours} h before bed", { mg: formatNumber(gap.mg, 0), what: gap.mg < 150 ? t("a large coffee") : t("a pre-workout"), hours: formatNumber(gap.hours, 1) })}{#if bedtime !== null}{" – "}<strong>{t("by {time}", { time: latestBefore(bedtime, gap.hours) })}</strong>{/if}
			</li>
		{/each}
	</ul>
	{#if bedtime === null}
		<p class="bf-muted bf-small">{t("Fill in your bedtime in the morning check-in and the table will show the latest time for you.")}</p>
	{/if}
	{@render sourceList(CAFFEINE_TABLE_BASIS.sourceIds)}
</section>

<section class="bf-card">
	<h4>{t("For competing athletes")}</h4>
	<ul class="bf-small bf-ref-list">
		<li>{t("In an international analysis of 634 supplements, 14.8 % contained anabolic steroids not declared on the label; reviews found prohibited substances in 12–58 % of the products studied, mostly prohormones and stimulants.")}</li>
		<li>{t("Third-party testing schemes (for example Informed Sport, NSF Certified for Sport or the Kölner Liste) lower the risk, but no product is guaranteed to be clean – according to the IOC, weigh the possible benefit against the risk of a doping offence.")}</li>
		{#each Object.entries(WADA_NOTES) as [id, note] (id)}
			<li><strong>{substanceName(id)}:</strong> {note}</li>
		{/each}
	</ul>
	{@render sourceList([...CONTAMINATION_SOURCES, ...WADA_SOURCES])}
</section>

<style>
	h4,
	h5,
	p {
		margin: 0;
	}

	.bf-small {
		font-size: var(--font-ui-small);
	}

	.bf-ref {
		display: flex;
		flex-direction: column;
		font-size: var(--font-ui-small);
	}

	/* Pevné sloupce, čísla zarovnaná vpravo. */
	.bf-ref-tr {
		display: grid;
		gap: var(--size-4-2);
		padding: var(--size-4-1) 0;
		border-top: 1px solid var(--background-modifier-border);
	}

	.bf-ref-4 {
		grid-template-columns: minmax(0, 1.4fr) repeat(3, minmax(0, 1fr));
	}

	.bf-ref-tr:first-child {
		border-top: none;
	}

	.bf-ref-num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	/* Skupina léků, které uživatel bere: jen barva, rozměr se nemění. */
	.bf-ref-mine {
		color: var(--text-error);
	}

	.bf-ref-over {
		color: var(--text-error);
		font-weight: var(--font-semibold);
	}

	.bf-ref-list,
	.bf-ref-combos {
		margin: 0;
		padding-left: var(--size-4-5);
	}

	.bf-ref-combos {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		font-size: var(--font-ui-small);
	}
</style>
