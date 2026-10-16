<script lang="ts">
	// Panáček se svalovými partiemi (tvary z referenčního návrhu, SPEC 5.5):
	// hlavní partie plnou barvou, vedlejší světlejší. Zvýraznění mění jen barvu –
	// nikdy geometrii ani obrysy; při najetí se ostatní partie ztlumí.
	import { t } from "../../i18n";
	import { MUSCLE_LABELS, type MuscleId } from "../../model/constants";
	import {
		ABS_LINES,
		BODY_SHAPES,
		FIGURE_HEIGHT,
		FIGURE_LABELS,
		FIGURE_WIDTH,
		MUSCLE_SHAPES,
		shapeTransform,
		type Shape,
	} from "./shapes";

	interface Props {
		primary?: MuscleId[];
		secondary?: MuscleId[];
		/** Vybraná partie (filtr v knihovně cviků). */
		selected?: MuscleId | null;
		/** Vlastní barva každé partie (karta Tělo); má přednost před hlavní / vedlejší. */
		fills?: Partial<Record<MuscleId, string>>;
		/** Připnutá partie – ostatní zůstanou ztlumené i bez najetí. */
		active?: MuscleId | null;
		/** Najetí na partii (null = kurzor opustil panáčka). */
		onHover?: (muscle: MuscleId | null) => void;
		/** Kliknutí na partii; bez něj je panáček jen obrázek. */
		onSelect?: (muscle: MuscleId) => void;
		/** Popisek pro čtečky obrazovky. */
		label?: string;
	}
	let {
		primary = [],
		secondary = [],
		selected = null,
		fills,
		active = null,
		onHover,
		onSelect,
		label = t("Muscle groups worked"),
	}: Props = $props();

	let hovered = $state<MuscleId | null>(null);
	const interactive = $derived(onSelect !== undefined);
	/** Partie, která zůstává plně viditelná; ostatní se ztlumí. */
	const focused = $derived(hovered ?? active);

	function hover(muscle: MuscleId | null) {
		hovered = muscle;
		onHover?.(muscle);
	}

	function level(muscle: MuscleId): "primary" | "secondary" | "none" {
		if (muscle === selected || primary.includes(muscle)) return "primary";
		return secondary.includes(muscle) ? "secondary" : "none";
	}

	function onKeydown(event: KeyboardEvent, muscle: MuscleId) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onSelect?.(muscle);
		}
	}
</script>

{#snippet draw(shape: Shape)}
	{#if shape.kind === "path"}
		<path d={shape.d} />
	{:else if shape.kind === "ellipse"}
		<ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
	{:else}
		<rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} />
	{/if}
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg
	class="bf-figure"
	class:is-interactive={interactive}
	class:is-hovering={focused !== null}
	viewBox={`0 0 ${FIGURE_WIDTH} ${FIGURE_HEIGHT + 14}`}
	role="img"
	aria-label={label}
	onmouseleave={() => hover(null)}
>
	<g class="bf-figure-body">
		{#each BODY_SHAPES as item, i (i)}
			<g transform={shapeTransform(item)}>{@render draw(item.shape)}</g>
		{/each}
	</g>
	{#each MUSCLE_SHAPES as item, i (i)}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<g
			class={`bf-muscle is-${level(item.muscle)}`}
			class:is-hovered={focused === item.muscle}
			style:fill={fills?.[item.muscle]}
			transform={shapeTransform(item)}
			role={interactive ? "button" : undefined}
			tabindex={interactive && !item.mirrored ? 0 : undefined}
			aria-label={interactive ? MUSCLE_LABELS[item.muscle] : undefined}
			onmouseenter={() => hover(interactive ? item.muscle : null)}
			onfocus={() => interactive && hover(item.muscle)}
			onblur={() => interactive && hover(null)}
			onclick={() => onSelect?.(item.muscle)}
			onkeydown={(e) => onKeydown(e, item.muscle)}
		>
			<title>{MUSCLE_LABELS[item.muscle]}</title>
			{@render draw(item.shape)}
		</g>
	{/each}
	<path class="bf-figure-lines" d={ABS_LINES} />
	{#each FIGURE_LABELS as text (text.x)}
		<text class="bf-figure-label" x={text.x} y={FIGURE_HEIGHT + 11} text-anchor="middle">{t(text.text)}</text>
	{/each}
</svg>

<style>
	.bf-figure {
		display: block;
		width: 100%;
		max-width: 320px;
		height: auto;
	}

	.bf-figure-body {
		fill: var(--background-modifier-border);
	}

	/* Obrys v barvě pozadí odděluje sousední partie; jeho šířka je vždy stejná. */
	.bf-muscle {
		fill: var(--background-modifier-border-hover);
		stroke: var(--background-primary);
		stroke-width: 1.5;
		outline: none;
		transition: fill 0.2s;
	}

	.bf-muscle.is-secondary {
		fill: color-mix(in srgb, var(--interactive-accent) 45%, var(--background-modifier-border));
	}

	.bf-muscle.is-primary {
		fill: var(--interactive-accent);
	}

	.is-interactive .bf-muscle {
		cursor: pointer;
	}

	/* Najetí: ostatní partie se ztlumí; tvary ani obrysy se nemění. */
	.is-hovering .bf-muscle:not(.is-hovered) {
		opacity: 0.4;
	}

	.is-interactive .bf-muscle:focus-visible {
		fill: var(--interactive-accent-hover);
	}

	.bf-figure-lines {
		fill: none;
		stroke: var(--background-primary);
		stroke-width: 1.5;
		pointer-events: none;
	}

	.bf-figure-label {
		fill: var(--text-faint);
		font-size: 13px;
	}
</style>
