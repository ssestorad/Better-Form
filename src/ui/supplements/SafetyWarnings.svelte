<script lang="ts">
	// Upozornění pro vlastní suplementy: interakce s léky z profilu a dvojice z tabulky „Co nebrat spolu“.
	// Jen informace s odkazem na lékárníka nebo lékaře – žádná diagnóza.
	import { t } from "../../i18n";
	import { MEDICATION_LABELS, drugWarnings, ownCombinations, type MedicationId } from "../../calc/supplementSafety";
	import InteractionItem from "./InteractionItem.svelte";

	interface Props {
		/** Katalogová id aktivních suplementů. */
		catalogIds: readonly string[];
		medications: readonly MedicationId[];
		/** Názvy suplementů v seznamu, které látku z katalogu obsahují. */
		namesOf: (catalogId: string) => string[];
	}
	let { catalogIds, medications, namesOf }: Props = $props();

	/** Názvy přípravků bez opakování (multivitamin se zinkem i hořčíkem jen jednou). */
	const names = (substances: readonly string[], separator: string) => [...new Set(substances.flatMap(namesOf))].join(separator);

	const drugs = $derived(drugWarnings(catalogIds, medications));
	const combos = $derived(ownCombinations(catalogIds));
</script>

{#if drugs.length > 0 || combos.length > 0}
	<section class="bf-card bf-safety">
		<h4>{t("Check with a pharmacist")}</h4>
		<ul>
			{#each drugs as { interaction, substances }, i (i)}
				<InteractionItem
					title={`${names(substances, ", ")} + ${interaction.medications.filter((m) => medications.includes(m)).map((m) => MEDICATION_LABELS[m]).join(", ")}`}
					finding={interaction.text.finding}
					advice={interaction.text.advice}
					sources={interaction.sources}
					avoid={interaction.avoid}
				/>
			{/each}
			{#each combos as { combination, sides } (combination.id)}
				<InteractionItem title={sides.map((side) => names(side, ", ")).join(" + ")} finding={combination.text.finding} advice={combination.text.advice} sources={combination.sources} />
			{/each}
		</ul>
		<p class="bf-muted bf-small">{t("Only information from studies, not a diagnosis. Never stop or change prescribed medication on your own.")}</p>
	</section>
{/if}

<style>
	h4,
	p {
		margin: 0;
	}

	ul {
		margin: 0;
		padding-left: var(--size-4-5);
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		font-size: var(--font-ui-small);
	}

	.bf-small {
		font-size: var(--font-ui-smaller);
	}

	.bf-safety {
		box-shadow: inset 3px 0 0 var(--text-error);
	}
</style>
