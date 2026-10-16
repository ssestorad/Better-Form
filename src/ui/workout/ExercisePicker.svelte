<script lang="ts">
	// Vyhledání cviku v knihovně (název i aliasy, bez diakritiky). Šipky + Enter vybírají.
	import { t } from "../../i18n";
	import type { ExerciseCategory } from "../../model/constants";
	import { searchExercises, type ExerciseOption } from "./search";

	interface Props {
		options: ExerciseOption[];
		preferred?: ExerciseCategory[];
		placeholder?: string;
		onSelect: (name: string) => void;
		/** Založení nového cviku, když v knihovně chybí. */
		onCreate?: (name: string) => void;
	}
	let { options, preferred = [], placeholder = t("Přidat cvik…"), onSelect, onCreate }: Props = $props();

	let query = $state("");
	let open = $state(false);
	let active = $state(0);
	const listId = `bf-picker-${Math.random().toString(36).slice(2, 8)}`;

	const matches = $derived(open ? searchExercises(options, query, preferred) : []);
	const canCreate = $derived(
		!!onCreate &&
			query.trim() !== "" &&
			!options.some((o) => o.name.toLocaleLowerCase("cs") === query.trim().toLocaleLowerCase("cs")),
	);
	const total = $derived(matches.length + (canCreate ? 1 : 0));

	function choose(index: number) {
		const match = matches[index];
		if (match) onSelect(match.option.name);
		else if (canCreate) onCreate?.(query.trim());
		else return;
		query = "";
		active = 0;
		open = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			open = true;
			active = total === 0 ? 0 : (active + 1) % total;
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			active = total === 0 ? 0 : (active - 1 + total) % total;
		} else if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			if (open && total > 0) choose(active);
		} else if (event.key === "Escape" && open) {
			event.preventDefault();
			event.stopPropagation();
			open = false;
		}
	}
</script>

<div class="bf-picker">
	<input
		type="search"
		{placeholder}
		autocomplete="off"
		role="combobox"
		aria-controls={listId}
		aria-expanded={open && total > 0}
		aria-autocomplete="list"
		bind:value={query}
		oninput={() => {
			open = true;
			active = 0;
		}}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => (open = false), 150)}
		onkeydown={onKeydown}
	/>
	{#if open && total > 0}
		<ul class="bf-picker-list" id={listId} role="listbox">
			{#each matches as match, i (match.option.name)}
				<li role="option" aria-selected={i === active}>
					<button
						type="button"
						class="bf-picker-item"
						class:is-active={i === active}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => choose(i)}
					>
						<span>{match.option.name}</span>
						{#if match.via}<span class="bf-hint">{match.via}</span>{/if}
					</button>
				</li>
			{/each}
			{#if canCreate}
				<li role="option" aria-selected={active === matches.length}>
					<button
						type="button"
						class="bf-picker-item"
						class:is-active={active === matches.length}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => choose(matches.length)}
					>
						<span>{t("Založit nový cvik „{trim}“", { trim: query.trim() })}</span>
					</button>
				</li>
			{/if}
		</ul>
	{/if}
</div>

<style>
	.bf-picker {
		position: relative;
	}

	.bf-picker input {
		width: 100%;
	}

	.bf-picker-list {
		position: absolute;
		z-index: 10;
		left: 0;
		right: 0;
		max-height: 260px;
		overflow-y: auto;
		margin: 2px 0 0;
		padding: var(--size-4-1);
		list-style: none;
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		box-shadow: var(--shadow-s);
	}

	.bf-picker-item {
		display: flex;
		justify-content: space-between;
		gap: var(--size-4-2);
		width: 100%;
		padding: var(--size-4-1) var(--size-4-2);
		background: none;
		box-shadow: none;
		text-align: left;
	}

	/* Zvýraznění jen pozadím – bez změny rozměrů. */
	.bf-picker-item.is-active {
		background-color: var(--background-modifier-hover);
	}
</style>
