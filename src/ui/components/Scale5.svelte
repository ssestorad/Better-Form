<script lang="ts">
	// Škála 1–5 jako řada tlačítek (jedno kliknutí). Opětovné kliknutí výběr zruší.
	import { t } from "../../i18n";
	interface Props {
		value: number | undefined;
		label: string;
		low: string;
		high: string;
		hint?: number;
		error?: string;
	}
	let { value = $bindable(), label, low, high, hint, error }: Props = $props();

	const id = `bf-scale-${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="bf-field" role="group" aria-labelledby={id}>
	<div class="bf-field-label">
		<span {id}>{label}</span>
		{#if hint !== undefined}<span class="bf-hint">{t("minule {hint}", { hint })}</span>{/if}
	</div>
	<div class="bf-scale">
		{#each [1, 2, 3, 4, 5] as n (n)}
			<button
				type="button"
				class="bf-scale-button"
				class:is-selected={value === n}
				aria-pressed={value === n}
				onclick={() => (value = value === n ? undefined : n)}
			>
				{n}
			</button>
		{/each}
	</div>
	<div class="bf-scale-ends">
		<span>1 = {low}</span>
		<span>5 = {high}</span>
	</div>
	{#if error}<div class="bf-error">{error}</div>{/if}
</div>

<style>
	.bf-scale {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: var(--size-4-1);
	}

	.bf-scale-button {
		padding: 0;
		height: 30px;
	}

	/* Výběr jen barvou – bez změny rozměrů. */
	.bf-scale-button.is-selected {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.bf-scale-ends {
		display: flex;
		justify-content: space-between;
		gap: var(--size-4-2);
		font-size: var(--font-ui-smaller);
		color: var(--text-faint);
	}
</style>
