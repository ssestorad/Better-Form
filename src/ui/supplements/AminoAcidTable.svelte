<script lang="ts">
	// Tabulka všech 20 aminokyselin bílkovin: typ, denní potřeba a které suplementy uživatele je obsahují.
	import { t } from "../../i18n";
	import { getSource } from "../../evidence/sources";
	import { EVIDENCE_LABELS } from "../../model/constants";
	import {
		aminoAcids,
		AMINO_BASIS,
		AMINO_CATEGORY_LABELS,
		NON_PROTEIN_AMINO_NOTE,
		SUPPLEMENT_AMINO_CONTENT,
		aminoRequirementMg,
		totalEssentialMgPerKg,
		type AminoAcid,
		type AminoCategory,
	} from "../../seed/aminoAcids";
	import { formatNumber } from "../format";
	import { formatAmount } from "./text";

	interface Props {
		weightKg: number | null;
		/** Aktivní suplementy uživatele (název a ID z katalogu). */
		owned: { name: string; catalog?: string }[];
	}
	let { weightKg, owned }: Props = $props();

	const CATEGORIES: AminoCategory[] = ["essential", "conditional", "nonessential"];
	const source = getSource(AMINO_BASIS.sourceIds[0]!);
	const acids = aminoAcids();
	const byId = new Map(acids.map((a) => [a.id, a]));
	const hasWeight = $derived(weightKg !== null && weightKg > 0);

	/** Názvy uživatelových suplementů, které aminokyselinu obsahují. */
	function containedIn(amino: AminoAcid): string {
		return owned
			.filter((s) => s.catalog !== undefined && SUPPLEMENT_AMINO_CONTENT[s.catalog]?.includes(amino.id))
			.map((s) => s.name)
			.join(", ");
	}

	function requirement(amino: AminoAcid): string {
		if (amino.requirementMgPerKg === undefined) {
			// Cystein a tyrosin mají potřebu společnou s methioninem / fenylalaninem.
			const partner = amino.sharedWith ? byId.get(amino.sharedWith) : undefined;
			return partner ? t("společně s {abbr}", { abbr: partner.abbr }) : "—";
		}
		const shared = amino.sharedWith ? ` (+ ${byId.get(amino.sharedWith)?.abbr})` : "";
		const perKg = `${formatNumber(amino.requirementMgPerKg, 0)} mg/kg`;
		const total = hasWeight ? ` = ${formatAmount(aminoRequirementMg(amino, weightKg!)!)}` : "";
		return `${perKg}${total}${shared}`;
	}
</script>

<section class="bf-card">
	<h4>{t("Aminokyseliny")}</h4>
	<p class="bf-muted bf-small">
		{t("Bílkoviny se skládají z 20 aminokyselin. Devět esenciálních si tělo neumí vyrobit a musí je dostat z jídla. Denní potřeba je průměr pro zdravého dospělého{v} – běžná strava s dostatkem bílkovin ji pokryje s velkou rezervou.", { v: hasWeight ? t(" (přepočteno na tvých {v} kg)", { v: formatNumber(weightKg!, 1) }) : "" })}
	</p>
	<div class="bf-amino" role="table">
		<div class="bf-amino-tr bf-muted" role="row">
			<span role="columnheader">{t("Aminokyselina")}</span>
			<span role="columnheader">{t("Denní potřeba")}</span>
			<span role="columnheader">{t("K čemu je")}</span>
			<span role="columnheader">{t("V tvých suplementech")}</span>
		</div>
		{#each CATEGORIES as category (category)}
			<div class="bf-amino-group" role="row">
				<span role="cell">{AMINO_CATEGORY_LABELS[category]}</span>
			</div>
			{#each acids.filter((a) => a.category === category) as amino (amino.id)}
				<div class="bf-amino-tr" role="row">
					<span role="cell">
						{amino.name} <span class="bf-muted">({amino.abbr})</span>
						{#if amino.bcaa}<span class="bf-tag" title={t("Větvená aminokyselina")}>{t("BCAA")}</span>{/if}
					</span>
					<span role="cell" class="bf-amino-num">{requirement(amino)}</span>
					<span role="cell" class="bf-muted">{amino.role}</span>
					<span role="cell">{containedIn(amino) || "—"}</span>
				</div>
			{/each}
		{/each}
	</div>
	<p class="bf-small">
		{t("Esenciální celkem: {v} mg/kg denně{v2}.", { v: formatNumber(totalEssentialMgPerKg(), 0), v2: hasWeight
			? ` = ${formatAmount(totalEssentialMgPerKg() * weightKg!)}`
			: "" })}
		<span class="bf-tag">{EVIDENCE_LABELS[AMINO_BASIS.evidence]}</span>
		<span class="bf-muted">{source.citation}</span>
	</p>
	<p class="bf-muted bf-small">
		{t("Jde o potřebu, která brání nedostatku, ne o doporučení pro sportovce – ti se řídí celkovým příjmem bílkovin (viz Protein). Sloupec „V tvých suplementech“ říká jen, že ji suplement obsahuje; přesné množství záleží na výrobku. {NON_PROTEIN_AMINO_NOTE}", { NON_PROTEIN_AMINO_NOTE: t(NON_PROTEIN_AMINO_NOTE) })}
	</p>
	{#if !hasWeight}
		<p class="bf-muted bf-small">{t("Přepočet na gramy se doplní, až zapíšeš váhu v check-inu nebo v profilu.")}</p>
	{/if}
</section>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-small {
		font-size: var(--font-ui-small);
	}

	.bf-amino {
		display: flex;
		flex-direction: column;
		font-size: var(--font-ui-small);
	}

	/* Pevné sloupce; v úzkém panelu se role a suplementy zalomí pod název. */
	.bf-amino-tr {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.1fr) minmax(0, 1.8fr) minmax(0, 1fr);
		gap: var(--size-4-2);
		padding: var(--size-4-1) 0;
		border-top: 1px solid var(--background-modifier-border);
	}

	.bf-amino-tr:first-child {
		border-top: none;
	}

	.bf-amino-group {
		padding: var(--size-4-2) 0 var(--size-4-1);
		border-top: 1px solid var(--background-modifier-border);
		font-weight: var(--font-semibold);
		text-transform: capitalize;
	}

	.bf-amino-num {
		font-variant-numeric: tabular-nums;
	}

	@container (max-width: 420px) {
		.bf-amino-tr {
			grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
		}
	}
</style>
