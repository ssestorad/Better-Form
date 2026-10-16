<script lang="ts">
	// Denní přehled: co všechno a kolik toho uživatel za den bere, se součty.
	import { t, tn } from "../../i18n";
	import {
		checkUpperLimit,
		combinedWarnings,
		dailyTotals,
		ingredientsDailyMg,
		ingredientWarnings,
		itemDoseMg,
		substanceTotals,
		type DailyItem,
	} from "../../calc/supplements";
	import { catalogSupplement } from "../../seed/supplements";
	import type { SupplementEntry } from "../../data/SupplementService";
	import { SUPPLEMENT_TIMING_LABELS } from "../../model/constants";
	import { AMINO_SUPPLEMENT_IDS } from "../../seed/aminoAcids";
	import { formatNumber } from "../format";
	import { combinedMessage, doseLabel, formatAmount, limitMessage } from "./text";

	interface Props {
		/** Aktivní suplementy. */
		entries: SupplementEntry[];
		weightKg: number | null;
	}
	let { entries, weightKg }: Props = $props();

	const isAmino = (id: string | undefined) => id !== undefined && AMINO_SUPPLEMENT_IDS.includes(id);

	function itemOf(entry: SupplementEntry): DailyItem {
		const { note } = entry;
		// Přípravek se složením: do součtu jde množství všech jeho látek za den (porce × obsah).
		if (note.ingredients) return { dose: ingredientsDailyMg(note.ingredients, note.dose) ?? undefined, unit: "mg", trainingDaysOnly: note.training_days_only };
		return { catalogId: note.catalog, dose: note.dose, unit: note.unit, trainingDaysOnly: note.training_days_only };
	}

	function warningOf(entry: SupplementEntry, item: DailyItem): string | null {
		const { note } = entry;
		if (!note.ingredients) return limitMessage(checkUpperLimit(item.catalogId, item.dose, item.unit));
		return (
			ingredientWarnings(note.ingredients, note.dose)
				.map((w) => `${w.name}: ${limitMessage(w.check)}`)
				.join(" ") || null
		);
	}

	const rows = $derived(
		entries.map((entry) => {
			const item = itemOf(entry);
			const mg = itemDoseMg(item);
			return {
				entry,
				mg,
				amino: isAmino(item.catalogId),
				warning: warningOf(entry, item),
			};
		}),
	);
	const totals = $derived(dailyTotals(entries.map(itemOf), isAmino));
	const sameDays = $derived(totals.trainingDayCount === totals.restDayCount);
	// Stejná látka z více suplementů (např. zinek v multivitaminu i zvlášť) a kofein celkem.
	const combined = $derived(
		combinedWarnings(
			substanceTotals(entries.map((e) => ({ name: e.note.name, catalog: e.note.catalog, dose: e.note.dose, unit: e.note.unit, ingredients: e.note.ingredients }))),
			weightKg,
		),
	);

	/** "43,7 g (0,55 g/kg)" – přepočet na kg jen se známou hmotností. */
	function withPerKg(mg: number): string {
		if (weightKg === null || weightKg <= 0 || mg === 0) return formatAmount(mg);
		return `${formatAmount(mg)} (${formatNumber(mg / weightKg, 0)} mg/kg)`;
	}
</script>

<section class="bf-card">
	<h4>{t("Daily overview")}</h4>
	<div class="bf-daily" role="table">
		<div class="bf-daily-tr bf-muted" role="row">
			<span role="columnheader">{t("Supplement")}</span>
			<span role="columnheader">{t("Dose")}</span>
			<span role="columnheader" class="bf-daily-num">{t("Per day")}</span>
			<span role="columnheader">{t("When")}</span>
		</div>
		{#each rows as row (row.entry.file.path)}
			<div class="bf-daily-tr" role="row">
				<span role="cell">
					{row.entry.note.name}
					{#if row.amino}<span class="bf-tag" title={t("Counted in the amino acid total")}>{t("AA")}</span>{/if}
				</span>
				<span role="cell">{doseLabel(row.entry.note.dose, row.entry.note.unit) || "—"}</span>
				<span role="cell" class="bf-daily-num">{row.mg === null ? "—" : formatAmount(row.mg)}</span>
				<span role="cell" class="bf-muted">
					{SUPPLEMENT_TIMING_LABELS[row.entry.note.timing]}{row.entry.note.training_days_only ? t(", training days only") : ""}
				</span>
			</div>
			{#if row.warning}<div class="bf-daily-warning">{row.warning}</div>{/if}
		{/each}
	</div>

	<dl class="bf-daily-totals">
		{#if sameDays}
			<dt>{t("Daily total")}</dt>
			<dd>{tn(totals.trainingDayCount, ["{v} · {n} supplement", "{v} · {n} supplements"], { v: withPerKg(totals.trainingDayMg) })}</dd>
		{:else}
			<dt>{t("Training day")}</dt>
			<dd>{tn(totals.trainingDayCount, ["{v} · {n} supplement", "{v} · {n} supplements"], { v: withPerKg(totals.trainingDayMg) })}</dd>
			<dt>{t("Rest day")}</dt>
			<dd>{tn(totals.restDayCount, ["{v} · {n} supplement", "{v} · {n} supplements"], { v: withPerKg(totals.restDayMg) })}</dd>
		{/if}
		{#if totals.aminoTrainingDayMg > 0}
			<dt>{t("Of which amino acids")}</dt>
			<dd>
				{withPerKg(totals.aminoTrainingDayMg)}{#if totals.aminoRestDayMg !== totals.aminoTrainingDayMg}
					{t("{v}on a training day, {v2} on a rest day", { v: " ", v2: formatAmount(totals.aminoRestDayMg) })}{/if}
			</dd>
		{/if}
	</dl>
	{#each combined as warning (warning.kind + warning.catalog)}
		<div class="bf-daily-warning">{combinedMessage(warning, catalogSupplement(warning.catalog)?.name ?? warning.catalog)}</div>
	{/each}
	{#if totals.unconverted > 0}
		<p class="bf-muted bf-small">
			{tn(totals.unconverted, ["Not counted in the total: {n} supplement without a dose or with a unit that can't be converted to grams (capsule, tablet). Enter the dose in g, mg or µg.", "Not counted in the total: {n} supplements without a dose or with a unit that can't be converted to grams (capsule, tablet). Enter the dose in g, mg or µg."])}
		</p>
	{/if}
	<p class="bf-muted bf-small">
		{t("The total is the weight of all doses together – it's an overview, not a recommendation. AA = amino acids (BCAA, EAA, glutamine, citrulline, beta-alanine); protein isn't counted among them, it belongs to your total protein intake.")}
	</p>
</section>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-small {
		font-size: var(--font-ui-small);
	}

	.bf-daily {
		display: flex;
		flex-direction: column;
		font-size: var(--font-ui-small);
	}

	/* Pevné sloupce – čísla pod sebou, nic se neposouvá. */
	.bf-daily-tr {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 0.8fr) minmax(0, 1.2fr);
		gap: var(--size-4-2);
		padding: var(--size-4-1) 0;
		border-top: 1px solid var(--background-modifier-border);
	}

	.bf-daily-tr:first-child {
		border-top: none;
	}

	.bf-daily-num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.bf-daily-warning {
		color: var(--color-orange);
		padding-bottom: var(--size-4-1);
	}

	.bf-daily-totals {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: var(--size-4-1) var(--size-4-3);
		margin: 0;
		padding-top: var(--size-4-2);
		border-top: 1px solid var(--background-modifier-border);
	}

	.bf-daily-totals dt {
		color: var(--text-muted);
	}

	.bf-daily-totals dd {
		margin: 0;
		font-weight: var(--font-semibold);
	}
</style>
