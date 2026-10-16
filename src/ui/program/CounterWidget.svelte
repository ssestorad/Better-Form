<script lang="ts">
	// Denní počítadlo (SPEC 5.7): rychlá tlačítka, vlastní dávka, vrácení poslední.
	import { t } from "../../i18n";
	import type { CounterProgress } from "../../calc/programs";
	import NumInput from "../components/NumInput.svelte";

	interface Props {
		label: string;
		progress: CounterProgress;
		steps: number[];
		onAdd: (reps: number) => Promise<void>;
		onUndo: () => Promise<void>;
	}
	let { label, progress, steps, onAdd, onUndo }: Props = $props();

	let custom = $state<number | undefined>(undefined);
	let busy = $state(false);
	let error = $state<string | null>(null);

	const customValid = $derived(custom !== undefined && Number.isInteger(custom) && custom > 0 && custom <= 10000);

	async function run(action: () => Promise<void>) {
		if (busy) return;
		busy = true;
		error = null;
		try {
			await action();
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			busy = false;
		}
	}

	function addCustom() {
		if (!customValid) return;
		const reps = custom!;
		custom = undefined;
		void run(() => onAdd(reps));
	}
</script>

<div class="bf-counter">
	<div class="bf-counter-head">
		<span>{label}</span>
		<span class="bf-counter-value" class:is-complete={progress.complete}>
			{progress.done} / {progress.total}{progress.complete ? " ✓" : ""}
		</span>
	</div>
	<div class="bf-counter-bar" role="progressbar" aria-valuemin="0" aria-valuemax={progress.total} aria-valuenow={progress.done}>
		<div class="bf-counter-fill" class:is-complete={progress.complete} style:width={`${progress.percent}%`}></div>
	</div>
	<div class="bf-counter-buttons">
		{#each steps as step (step)}
			<button type="button" disabled={busy} onclick={() => void run(() => onAdd(step))}>+{step}</button>
		{/each}
		<div class="bf-counter-custom">
			<NumInput
				bind:value={custom}
				label={t("Custom count")}
				placeholder={t("other")}
				onkeydown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						addCustom();
					}
				}}
			/>
		</div>
		<button type="button" disabled={busy || !customValid} onclick={addCustom}>{t("Add")}</button>
		<button type="button" class="clickable-icon" disabled={busy || progress.done === 0} title={t("Undo last entry")} aria-label={t("Undo last entry")} onclick={() => void run(onUndo)}>↶</button>
	</div>
	{#if error}<div class="bf-error">{error}</div>{/if}
</div>

<style>
	.bf-counter {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-1);
	}

	.bf-counter-head {
		display: flex;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-counter-value {
		font-variant-numeric: tabular-nums;
		font-weight: var(--font-semibold);
	}

	.bf-counter-value.is-complete {
		color: var(--text-success);
	}

	.bf-counter-bar {
		height: 6px;
		border-radius: 3px;
		background-color: var(--background-modifier-border);
		overflow: hidden;
	}

	.bf-counter-fill {
		height: 100%;
		background-color: var(--interactive-accent);
	}

	.bf-counter-fill.is-complete {
		background-color: var(--text-success);
	}

	.bf-counter-buttons {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-4-1);
	}

	.bf-counter-custom {
		width: 4.5em;
	}
</style>
