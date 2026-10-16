<script lang="ts">
	// Cviky vícecvikového bloku (AMRAP, komplex).
	import { t } from "../../i18n";
	import type { ExerciseCategory } from "../../model/constants";
	import NumInput from "../components/NumInput.svelte";
	import { blockErrorKey, emptyItem, type DraftBlock, type DraftErrors } from "./draft";
	import ExercisePicker from "./ExercisePicker.svelte";
	import type { ExerciseOption } from "./search";

	interface Props {
		block: DraftBlock;
		options: ExerciseOption[];
		preferred: ExerciseCategory[];
		/** U AMRAP má každý cvik vlastní váhu, u komplexu je váha společná. */
		itemWeights: boolean;
		errors: DraftErrors;
		onCreate: (name: string) => void;
	}
	let { block, options, preferred, itemWeights, errors, onCreate }: Props = $props();
</script>

<div class="bf-items">
	{#each block.items as item, i (item.id)}
		<div class="bf-item-row" class:with-weight={itemWeights}>
			<span class="bf-item-name">{item.exercise}</span>
			<NumInput bind:value={item.reps} label={t("Reps")} placeholder={t("reps", undefined, "abbr")} error={errors[blockErrorKey(item.id, "reps")]} />
			{#if itemWeights}
				<NumInput bind:value={item.kg} label={t("Weight (kg)")} placeholder="kg" decimals error={errors[blockErrorKey(item.id, "kg")]} />
			{/if}
			<button type="button" class="clickable-icon" aria-label={t("Remove exercise")} onclick={() => block.items.splice(i, 1)}>×</button>
		</div>
	{/each}
	<ExercisePicker
		{options}
		{preferred}
		placeholder={t("Add an exercise to the block…")}
		onSelect={(name) => block.items.push(emptyItem(name))}
		onCreate={(name) => {
			onCreate(name);
			block.items.push(emptyItem(name));
		}}
	/>
</div>

<style>
	.bf-items {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.bf-item-row {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) 2em;
		gap: var(--size-4-1);
		align-items: center;
	}

	.bf-item-row.with-weight {
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) 2em;
	}

	.bf-item-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
