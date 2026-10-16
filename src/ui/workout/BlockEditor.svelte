<script lang="ts">
	// Jeden blok tréninku: hlavička (cvik, typ, posun, smazání), „minule“ + návrh, obsah podle typu.
	import { t, tn } from "../../i18n";
	import { untrack } from "svelte";
	import { parseLadderSteps } from "../../calc/performance";
	import type { BarbellSettings } from "../../calc/plates";
	import { PROGRESSION_BASIS } from "../../calc/progression";
	import { BLOCK_LABELS, type BlockType, type ExerciseCategory } from "../../model/constants";
	import BasisTag from "../components/BasisTag.svelte";
	import ClockInput from "../components/ClockInput.svelte";
	import NumInput from "../components/NumInput.svelte";
	import WeightInput from "../components/WeightInput.svelte";
	import { blockErrorKey, revertToLast, type DraftBlock, type DraftErrors, type ExerciseInfo } from "./draft";
	import ItemsEditor from "./ItemsEditor.svelte";
	import SetsEditor from "./SetsEditor.svelte";
	import type { ExerciseOption } from "./search";

	interface Props {
		block: DraftBlock;
		index: number;
		count: number;
		errors: DraftErrors;
		options: ExerciseOption[];
		preferred: ExerciseCategory[];
		bells: number[];
		barbell?: BarbellSettings;
		info: (exercise: string) => ExerciseInfo | undefined;
		/** Text „minule“ pro cvik, nebo undefined. */
		lastText: (exercise: string) => string | undefined;
		onMove: (delta: number) => void;
		onRemove: () => void;
		onReplace: (block: DraftBlock) => void;
		onCreateExercise: (name: string) => void;
		onShowExercise: (exercise: string) => void;
	}
	let {
		block,
		index,
		count,
		errors,
		options,
		preferred,
		bells,
		barbell,
		info,
		lastText,
		onMove,
		onRemove,
		onReplace,
		onCreateExercise,
		onShowExercise,
	}: Props = $props();

	const SINGLE_TYPES: BlockType[] = ["sets", "hold", "emom", "ladder", "timed"];
	const multi = $derived(block.type === "amrap" || block.type === "complex");
	const exerciseInfo = $derived(block.exercise ? info(block.exercise) : undefined);
	const measure = $derived(exerciseInfo?.measure ?? (block.type === "hold" ? "seconds" : "reps_kg"));
	const bodyweight = $derived(measure === "reps_bw");
	const blockBells = $derived(exerciseInfo?.category === "kettlebell" || multi ? bells : []);
	const last = $derived(block.exercise && !multi ? lastText(block.exercise) : undefined);
	const missing = $derived(errors[blockErrorKey(block.id, "missing")]);
	// Superset jde spojit jen s předchozím blokem a jen u sérií a výdrží.
	const canSuperset = $derived(index > 0 && (block.type === "sets" || block.type === "hold"));

	let ladderText = $state(untrack(() => block.steps.join(", ")));
	const ladderTotal = $derived(block.steps.reduce((sum, n) => sum + n, 0));

	function err(field: string): string | undefined {
		return errors[blockErrorKey(block.id, field)];
	}
</script>

<section class="bf-block" class:is-superset={canSuperset && block.superset === true}>
	<header class="bf-block-header">
		<div class="bf-block-title">
			{#if !multi && block.exercise}
				<button type="button" class="bf-link-button bf-block-name" title={t("Show technique and muscles worked")} onclick={() => onShowExercise(block.exercise!)}>
					{block.exercise}
				</button>
			{:else}
				<strong>{multi ? BLOCK_LABELS[block.type] : t("No exercise")}</strong>
			{/if}
			{#if !multi}
				<select
					class="dropdown bf-block-type"
					aria-label={t("Block type")}
					value={block.type}
					onchange={(e) => (block.type = e.currentTarget.value as BlockType)}
				>
					{#each SINGLE_TYPES as x (x)}<option value={x}>{BLOCK_LABELS[x]}</option>{/each}
				</select>
			{/if}
		</div>
		<div class="bf-block-tools">
			<button type="button" class="clickable-icon" aria-label={t("Move up")} disabled={index === 0} onclick={() => onMove(-1)}>↑</button>
			<button type="button" class="clickable-icon" aria-label={t("Move down")} disabled={index === count - 1} onclick={() => onMove(1)}>↓</button>
			<button type="button" class="clickable-icon" aria-label={t("Delete block")} onclick={onRemove}>✕</button>
		</div>
	</header>

	{#if canSuperset}
		<label class="bf-superset" title={t("The exercises alternate without rest: a set of the first, right away a set of the second, and only then rest")}>
			<input type="checkbox" checked={block.superset === true} onchange={(e) => (block.superset = e.currentTarget.checked ? true : undefined)} />
			<span>{t("Superset with the previous exercise")}</span>
		</label>
	{/if}
	{#if block.targetNote}<div class="bf-target">{t("Program target: {targetNote}", { targetNote: block.targetNote })}</div>{/if}
	{#if last}<div class="bf-last">{t("Last time {last}", { last })}</div>{/if}
	{#if block.suggestion}
		<div class="bf-suggestion">
			<span>{t("Suggestion: {suggestion}", { suggestion: block.suggestion })}</span>
			<BasisTag basis={PROGRESSION_BASIS} />
			{#if block.lastSets}
				<button type="button" class="bf-link-button" onclick={() => onReplace(revertToLast(block))}>{t("reset to last time")}</button>
			{/if}
		</div>
	{/if}

	{#if block.type === "sets" || block.type === "hold"}
		<SetsEditor {block} {measure} bells={blockBells} barbell={exerciseInfo?.category === "strength" || exerciseInfo === undefined ? barbell : undefined} {errors} />
	{:else if block.type === "emom"}
		<div class="bf-mini-grid">
			<label class="bf-mini"><span>{t("Minutes")}</span><NumInput bind:value={block.minutes} label={t("Minutes")} error={err("minutes")} /></label>
			<label class="bf-mini"><span>{t("Reps/min")}</span><NumInput bind:value={block.reps_per_min} label={t("Reps per minute")} error={err("reps_per_min")} /></label>
			<label class="bf-mini">
				<span>{bodyweight ? t("Added weight kg") : "kg"}</span>
				{#if bodyweight}
					<NumInput bind:value={block.added_kg} label={t("Added weight (kg)")} signed />
				{:else}
					<WeightInput bind:value={block.kg} label={t("Weight (kg)")} bells={blockBells} error={err("kg")} />
				{/if}
			</label>
			<label class="bf-mini"><span>{t("Rounds done")}</span><NumInput bind:value={block.rounds} label={t("Rounds done")} placeholder={block.minutes !== undefined ? String(block.minutes) : ""} error={err("rounds")} /></label>
			<label class="bf-mini"><span>{t("Block RPE")}</span><NumInput bind:value={block.rpe} label={t("Block RPE")} decimals error={err("rpe")} /></label>
		</div>
	{:else if block.type === "amrap"}
		<div class="bf-mini-grid">
			<label class="bf-mini"><span>{t("Minutes")}</span><NumInput bind:value={block.minutes} label={t("Minutes")} error={err("minutes")} /></label>
			<label class="bf-mini"><span>{t("Rounds")}</span><NumInput bind:value={block.rounds} label={t("Completed rounds")} error={err("rounds")} /></label>
			<label class="bf-mini"><span>{t("Extra reps")}</span><NumInput bind:value={block.extra_reps} label={t("Reps in the unfinished round")} error={err("extra_reps")} /></label>
			<label class="bf-mini"><span>{t("Block RPE")}</span><NumInput bind:value={block.rpe} label={t("Block RPE")} decimals error={err("rpe")} /></label>
		</div>
		<ItemsEditor {block} {options} {preferred} itemWeights {errors} onCreate={onCreateExercise} />
	{:else if block.type === "complex"}
		<div class="bf-mini-grid">
			<label class="bf-mini"><span>{t("Rounds")}</span><NumInput bind:value={block.rounds} label={t("Rounds")} error={err("rounds")} /></label>
			<label class="bf-mini"><span>kg</span><WeightInput bind:value={block.kg} label={t("Weight (kg)")} bells={blockBells} error={err("kg")} /></label>
			<label class="bf-mini"><span>{t("Block RPE")}</span><NumInput bind:value={block.rpe} label={t("Block RPE")} decimals error={err("rpe")} /></label>
		</div>
		<ItemsEditor {block} {options} {preferred} itemWeights={false} {errors} onCreate={onCreateExercise} />
	{:else if block.type === "ladder"}
		<div class="bf-mini-grid">
			<label class="bf-mini bf-mini-wide">
				<span>{t("Rungs (e.g. 1-5 or 2, 4, 6)")}</span>
				<input
					type="text"
					value={ladderText}
					oninput={(e) => {
						ladderText = e.currentTarget.value;
						block.steps = parseLadderSteps(ladderText);
					}}
				/>
			</label>
			<label class="bf-mini">
				<span>{bodyweight ? t("Added weight kg") : "kg"}</span>
				{#if bodyweight}
					<NumInput bind:value={block.added_kg} label={t("Added weight (kg)")} signed />
				{:else}
					<WeightInput bind:value={block.kg} label={t("Weight (kg)")} bells={blockBells} error={err("kg")} />
				{/if}
			</label>
		</div>
		{#if block.steps.length > 0}<div class="bf-hint">{tn(ladderTotal, ["{v} · {n} rep in total", "{v} · {n} reps in total"], { v: block.steps.join(" – ") })}</div>{/if}
	{:else if block.type === "timed"}
		<div class="bf-mini-grid">
			<label class="bf-mini"><span>{t("Time (mm:ss)")}</span><ClockInput bind:value={block.sec} label={t("Time")} error={err("sec")} /></label>
			<label class="bf-mini"><span>{t("Reps")}</span><NumInput bind:value={block.reps} label={t("Reps")} error={err("reps")} /></label>
			<label class="bf-mini">
				<span>{bodyweight ? t("Added weight kg") : "kg"}</span>
				{#if bodyweight}
					<NumInput bind:value={block.added_kg} label={t("Added weight (kg)")} signed />
				{:else}
					<WeightInput bind:value={block.kg} label={t("Weight (kg)")} bells={blockBells} error={err("kg")} />
				{/if}
			</label>
		</div>
	{/if}

	{#if missing}<div class="bf-error">{missing}</div>{/if}
</section>

<style>
	.bf-block {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		padding: var(--size-4-3);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
	}

	/* Superset jen barvou levého okraje – rozměry bloku se nemění (okraj má stejnou šířku jako u běžného bloku). */
	.bf-block.is-superset {
		border-left-color: var(--interactive-accent);
	}

	.bf-superset {
		display: flex;
		align-items: center;
		gap: var(--size-2-3);
		font-size: var(--font-ui-small);
		color: var(--text-muted);
	}

	.bf-block-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-block-title {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--size-4-2);
		min-width: 0;
	}

	.bf-block-name {
		font-weight: var(--font-semibold);
	}

	.bf-block-type {
		font-size: var(--font-ui-small);
	}

	.bf-block-tools {
		display: flex;
		gap: 2px;
		flex-shrink: 0;
	}

	.bf-last {
		font-size: var(--font-ui-small);
		color: var(--text-muted);
	}

	.bf-target {
		font-size: var(--font-ui-small);
		font-weight: var(--font-semibold);
	}

	.bf-suggestion {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-4-2);
		font-size: var(--font-ui-small);
		color: var(--text-accent);
	}

	.bf-mini-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
		gap: var(--size-4-2);
	}

	.bf-mini {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: var(--font-ui-smaller);
		color: var(--text-muted);
	}

	.bf-mini-wide {
		grid-column: span 2;
	}
</style>
