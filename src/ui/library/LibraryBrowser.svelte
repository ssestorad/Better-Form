<script lang="ts">
	// Knihovna cviků: hledání, filtr podle kategorie a partie (kliknutím na panáčka), detail cviku.
	import { t, tn } from "../../i18n";
	import { untrack } from "svelte";
	import { EXERCISE_CATEGORIES, MUSCLE_LABELS, type ExerciseCategory, type MuscleId } from "../../model/constants";
	import type { ExerciseHistory } from "../../calc/exerciseHistory";
	import type { ExerciseNote } from "../../model/types";
	import MuscleFigure from "../body/MuscleFigure.svelte";
	import { searchExercises } from "../workout/search";
	import ExerciseDetail from "./ExerciseDetail.svelte";
	import { CATEGORY_LABELS } from "./labels";

	interface Props {
		/** Cviky s texty (z poznámek, doplněné vestavěnými). */
		exercises: ExerciseNote[];
		/** Cvik, který se má rovnou otevřít. */
		initialExercise?: string;
		initialMuscle?: MuscleId;
		lastText: (exercise: string) => string | undefined;
		/** Historie cviku pro detail; chybí = detail ji neukazuje. */
		history?: (exercise: ExerciseNote) => ExerciseHistory;
		onOpenNote: (exercise: string) => void;
	}
	let { exercises, initialExercise, initialMuscle, lastText, history, onOpenNote }: Props = $props();

	let query = $state("");
	let category = $state<ExerciseCategory | null>(null);
	let muscle = $state<MuscleId | null>(untrack(() => initialMuscle ?? null));
	let selected = $state<string | null>(untrack(() => initialExercise ?? null));

	const byName = $derived(new Map(exercises.map((e) => [e.name, e])));
	const current = $derived(selected ? byName.get(selected) : undefined);

	const results = $derived.by(() => {
		const matches = searchExercises(exercises, query, [], exercises.length).map((m) => byName.get(m.option.name)!);
		const filtered = matches.filter(
			(e) =>
				(category === null || e.category === category) &&
				(muscle === null || e.muscles.primary.includes(muscle) || e.muscles.secondary.includes(muscle)),
		);
		// Při filtru podle partie nejdřív cviky, kde je partie hlavní.
		if (muscle === null) return filtered;
		const m = muscle;
		return [...filtered].sort((a, b) => Number(b.muscles.primary.includes(m)) - Number(a.muscles.primary.includes(m)));
	});
</script>

{#if current}
	<div class="bf-library">
		<button type="button" class="bf-link-button" onclick={() => (selected = null)}>{t("← Back to the list")}</button>
		<ExerciseDetail exercise={current} last={lastText(current.name)} history={history?.(current)} onOpenNote={() => onOpenNote(current.name)} />
	</div>
{:else}
	<div class="bf-library">
		<input type="search" placeholder={t("Search exercises (name or alias)…")} bind:value={query} />

		<div class="bf-library-filters">
			<div class="bf-library-figure">
				<MuscleFigure selected={muscle} onSelect={(m) => (muscle = muscle === m ? null : m)} label={t("Filter by muscle group")} />
			</div>
			<div class="bf-library-side">
				<div class="bf-chips" role="group" aria-label={t("Category")}>
					<button type="button" class="bf-chip" class:is-selected={category === null} onclick={() => (category = null)}>{t("All")}</button>
					{#each EXERCISE_CATEGORIES as c (c)}
						<button type="button" class="bf-chip" class:is-selected={category === c} onclick={() => (category = category === c ? null : c)}>
							{CATEGORY_LABELS[c]}
						</button>
					{/each}
				</div>
				<!-- Pevná výška řádku, aby se seznam při výběru partie neposouval. -->
				<div class="bf-library-muscle">
					{#if muscle}
						{t("Muscle group:")} <strong>{MUSCLE_LABELS[muscle]}</strong>
						<button type="button" class="bf-link-button" onclick={() => (muscle = null)}>{t("clear")}</button>
					{:else}
						<span class="bf-muted">{t("Click the figure to choose a muscle group.")}</span>
					{/if}
				</div>
				<div class="bf-muted bf-library-count">{tn(exercises.length, ["{results_length} of {n} exercise", "{results_length} of {n} exercises"], { results_length: results.length })}</div>
			</div>
		</div>

		<ul class="bf-library-list">
			{#each results as e (e.name)}
				<li>
					<button type="button" class="bf-library-item" onclick={() => (selected = e.name)}>
						<span class="bf-library-item-name">{e.name}</span>
						<span class="bf-muted bf-library-item-muscles">{e.muscles.primary.map((m) => MUSCLE_LABELS[m]).join(", ")}</span>
					</button>
				</li>
			{:else}
				<li class="bf-muted">{t("No exercise matches the filter.")}</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.bf-library {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
		container-type: inline-size;
	}

	.bf-library-filters {
		display: grid;
		grid-template-columns: minmax(140px, 200px) minmax(0, 1fr);
		gap: var(--size-4-4);
		align-items: start;
	}

	.bf-library-side {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-1);
	}

	.bf-chip {
		height: 28px;
		padding: 0 var(--size-4-2);
		font-size: var(--font-ui-small);
	}

	.bf-chip.is-selected {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.bf-library-muscle {
		min-height: 1.6em;
	}

	.bf-library-count {
		font-size: var(--font-ui-small);
	}

	.bf-library-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 45vh;
		overflow-y: auto;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.bf-library-item {
		display: flex;
		justify-content: space-between;
		gap: var(--size-4-2);
		width: 100%;
		height: auto;
		padding: var(--size-4-1) var(--size-4-2);
		background: none;
		box-shadow: none;
		text-align: left;
	}

	.bf-library-item:hover {
		background-color: var(--background-modifier-hover);
	}

	.bf-library-item-muscles {
		font-size: var(--font-ui-small);
		text-align: right;
	}
</style>
