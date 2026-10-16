<script lang="ts">
	// Session RPE na škále CR-10 (Foster 2001). Popisky jen u kotevních hodnot škály.
	import { t } from "../../i18n";
	interface Props {
		value: number | undefined;
		error?: string;
	}
	let { value = $bindable(), error }: Props = $props();

	const ANCHORS: Record<number, string> = {
		0: t("rest", undefined, "effort"),
		1: t("very, very easy"),
		2: t("easy", undefined, "effort"),
		3: t("moderate"),
		4: t("somewhat hard"),
		5: t("hard", undefined, "effort"),
		7: t("very hard"),
		10: t("maximal"),
	};

	function describe(n: number): string {
		if (ANCHORS[n]) return ANCHORS[n]!;
		if (n === 6) return t("between hard and very hard");
		return t("between very hard and maximal");
	}
</script>

<div class="bf-field">
	<div class="bf-field-label">
		<span>{t("Session RPE (0–10)")}</span>
		<span class="bf-hint">{t("enter about 30 min after training")}</span>
	</div>
	<div class="bf-rpe">
		{#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as n (n)}
			<button
				type="button"
				class="bf-rpe-button"
				class:is-selected={value === n}
				aria-pressed={value === n}
				title={`${n} – ${describe(n)}`}
				onclick={() => (value = value === n ? undefined : n)}
			>
				{n}
			</button>
		{/each}
	</div>
	<div class="bf-rpe-label">
		{#if value !== undefined && !Number.isNaN(value)}{value} – {describe(Math.round(value))}{:else}{t("not filled in – can be added later")}{/if}
	</div>
	{#if error}<div class="bf-error">{error}</div>{/if}
</div>

<style>
	.bf-rpe {
		display: grid;
		grid-template-columns: repeat(11, minmax(0, 1fr));
		gap: 2px;
	}

	.bf-rpe-button {
		padding: 0;
		height: 30px;
	}

	.bf-rpe-button.is-selected {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	/* Pevná výška, aby se text pod škálou při výběru nehýbal. */
	.bf-rpe-label {
		min-height: 1.5em;
		font-size: var(--font-ui-small);
		color: var(--text-muted);
	}
</style>
