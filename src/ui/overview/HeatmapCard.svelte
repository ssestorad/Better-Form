<script lang="ts">
	// Heatmapa roku (SPEC 5.4): den = čtverec podle zátěže, sloupec = týden.
	import { t, tn } from "../../i18n";
	import { heatmap } from "../../calc/overview";
	import { formatNumber, formatShortDate, monthNamesShort } from "../format";

	interface Props {
		byDate: Map<string, number>;
		workoutDates: Set<string>;
		today: string;
	}
	let { byDate, workoutDates, today }: Props = $props();

	const WEEKS = 53;
	const CELL = 10;
	const STEP = 12;
	const TOP = 14;
	const MONTHS = monthNamesShort();
	const LEVELS = [0, 1, 2, 3, 4] as const;

	const grid = $derived(heatmap(byDate, workoutDates, today, WEEKS));
	// Popisek měsíce nad sloupcem, kde měsíc začíná.
	const months = $derived.by(() => {
		const starts = grid.flatMap((column, i) => {
			const month = column[0]!.date.slice(5, 7);
			const before = i > 0 ? grid[i - 1]![0]!.date.slice(5, 7) : null;
			return month !== before ? [{ column: i, x: i * STEP, text: MONTHS[Number(month) - 1]! }] : [];
		});
		// Popisek potřebuje aspoň 3 sloupce místa do dalšího měsíce (a do konce mřížky).
		return starts.filter((m, i) => (starts[i + 1]?.column ?? WEEKS) - m.column >= 3);
	});
	const activeDays = $derived(grid.flat().filter((c) => c.level > 0 && !c.future).length);

	function tip(cell: (typeof grid)[number][number]): string {
		const date = formatShortDate(cell.date);
		if (cell.load > 0) return t("{date}: load {v}", { date, v: formatNumber(cell.load, 0) });
		return cell.untracked ? t("{date}: workout without RPE or duration", { date }) : t("{date}: no workout", { date });
	}
</script>

<section class="bf-card">
	<div class="bf-heat-head">
		<h4>{t("Last 12 months")}</h4>
		<span class="bf-muted bf-heat-count">{tn(activeDays, ["{n} day with training", "{n} days with training"])}</span>
	</div>
	<svg viewBox={`0 0 ${WEEKS * STEP} ${TOP + 7 * STEP}`} role="img" aria-label={t("Daily load over the last 12 months")}>
		{#each months as m (m.x)}
			<text class="bf-heat-month" x={m.x} y="9">{m.text}</text>
		{/each}
		{#each grid as column, w (w)}
			{#each column as cell, d (cell.date)}
				{#if !cell.future}
					<rect class={`bf-heat-cell bf-heat-${cell.level}`} class:is-today={cell.date === today} x={w * STEP} y={TOP + d * STEP} width={CELL} height={CELL} rx="2">
						<title>{tip(cell)}</title>
					</rect>
				{/if}
			{/each}
		{/each}
	</svg>
	<div class="bf-heat-legend bf-muted">
		<span>{t("less")}</span>
		{#each LEVELS as level (level)}
			<span class={`bf-heat-swatch bf-heat-${level}`}></span>
		{/each}
		<span>{t("more")}</span>
		<span class="bf-heat-note">{t("shade by load (sRPE), compared with your other days")}</span>
	</div>
</section>

<style>
	h4 {
		margin: 0;
	}

	.bf-heat-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--size-4-2);
	}

	.bf-heat-count,
	.bf-heat-legend {
		font-size: var(--font-ui-smaller);
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.bf-heat-month {
		fill: var(--text-faint);
		font-size: 9px;
	}

	.bf-heat-0 {
		fill: var(--background-modifier-border);
		background-color: var(--background-modifier-border);
	}

	.bf-heat-1 {
		fill: color-mix(in srgb, var(--interactive-accent) 30%, var(--background-modifier-border));
		background-color: color-mix(in srgb, var(--interactive-accent) 30%, var(--background-modifier-border));
	}

	.bf-heat-2 {
		fill: color-mix(in srgb, var(--interactive-accent) 55%, var(--background-modifier-border));
		background-color: color-mix(in srgb, var(--interactive-accent) 55%, var(--background-modifier-border));
	}

	.bf-heat-3 {
		fill: color-mix(in srgb, var(--interactive-accent) 80%, var(--background-modifier-border));
		background-color: color-mix(in srgb, var(--interactive-accent) 80%, var(--background-modifier-border));
	}

	.bf-heat-4 {
		fill: var(--interactive-accent);
		background-color: var(--interactive-accent);
	}

	/* Dnešek: obrys uvnitř čtverce, rozměr se nemění. */
	.bf-heat-cell.is-today {
		stroke: var(--text-normal);
		stroke-width: 1;
	}

	.bf-heat-legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 3px;
	}

	.bf-heat-swatch {
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}

	.bf-heat-note {
		margin-left: var(--size-4-2);
	}
</style>
