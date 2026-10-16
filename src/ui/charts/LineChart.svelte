<script lang="ts" module>
	export interface ChartLine {
		label: string;
		color: string;
		values: (number | null)[];
		/** Spojit body přes chybějící dny (řídká data). */
		connect?: boolean;
		dots?: boolean;
		dashed?: boolean;
		/** Jen body, bez čáry. */
		pointsOnly?: boolean;
		format?: (value: number) => string;
	}

	export interface ChartBars {
		label: string;
		values: number[];
		format?: (value: number) => string;
	}

	export interface ChartBand {
		label: string;
		low: (number | null)[];
		high: (number | null)[];
	}
</script>

<script lang="ts">
	// Čárový graf s volitelnými sloupci (vlastní osa) a pásmem. Rozvržení je pevné:
	// graf drží poměr stran a řádek s hodnotami pod ním má stálou výšku.
	import { formatNumber, formatShortDate, formatSigned } from "../format";
	import { CHART_BOX, bandPath, definedIndexes, extent, linePath, nearestIndex, paddedDomain, xAt, yScale } from "./geometry";

	interface Props {
		/** Datum každého bodu (osa X). */
		dates: string[];
		lines: ChartLine[];
		bars?: ChartBars;
		band?: ChartBand;
		/** Formát hodnot čar (osa a řádek s hodnotami). */
		format?: (value: number) => string;
		/** Zahrnout nulu do osy a nakreslit nulovou čáru. */
		zero?: boolean;
		/** Menší hodnota výš (tempo běhu). */
		invert?: boolean;
		label: string;
	}
	let { dates, lines, bars, band, format = (v) => formatSigned(v, 0), zero = false, invert = false, label }: Props = $props();

	const box = CHART_BOX;
	const count = $derived(dates.length);
	const x = (i: number) => xAt(i, count, box);

	const domain = $derived.by(() => {
		const all = [...lines.flatMap((l) => l.values), ...(band ? [...band.low, ...band.high] : [])];
		const range = extent(all);
		return range ? paddedDomain(range[0], range[1], zero) : ([0, 1] as [number, number]);
	});
	const y = $derived(yScale(domain, box, invert));

	const barMax = $derived(Math.max(1, ...(bars?.values ?? [0])));
	const barWidth = $derived(Math.max(1, Math.min(12, ((box.width - box.left - box.right) / Math.max(1, count)) * 0.7)));
	const barY = (value: number) => box.height - box.bottom - (value / barMax) * (box.height - box.top - box.bottom) * 0.45;

	let hover = $state<number | null>(null);
	// Bez najetí se ukazuje poslední bod, kde má některá čára hodnotu.
	const lastIndex = $derived.by(() => {
		let last = -1;
		for (const line of lines) {
			const defined = definedIndexes(line.values);
			if (defined.length > 0) last = Math.max(last, defined[defined.length - 1]!);
		}
		return last >= 0 ? last : Math.max(0, count - 1);
	});
	const shown = $derived(hover ?? lastIndex);

	function move(event: MouseEvent) {
		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		if (rect.width <= 0) return;
		hover = nearestIndex(((event.clientX - rect.left) / rect.width) * box.width, count, box);
	}

	/** Hodnota čáry v bodě; u řídkých dat nejbližší předchozí. */
	function valueAt(line: ChartLine, index: number): number | null {
		const direct = line.values[index];
		if (direct !== null && direct !== undefined) return direct;
		if (!line.connect && !line.pointsOnly) return null;
		for (let i = index - 1; i >= 0; i--) {
			const v = line.values[i];
			if (v !== null && v !== undefined) return v;
		}
		return null;
	}

	const ticks = $derived(count > 0 ? [0, Math.floor((count - 1) / 2), count - 1].filter((v, i, a) => a.indexOf(v) === i) : []);
</script>

<div class="bf-chart">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<svg viewBox={`0 0 ${box.width} ${box.height}`} role="img" aria-label={label} onmousemove={move} onmouseleave={() => (hover = null)}>
		{#if bars}
			{#each bars.values as value, i (i)}
				{#if value > 0}
					<rect class="bf-chart-bar" x={x(i) - barWidth / 2} y={barY(value)} width={barWidth} height={box.height - box.bottom - barY(value)} />
				{/if}
			{/each}
		{/if}
		{#if band}
			<path class="bf-chart-band" d={bandPath(band.low, band.high, x, y)} />
		{/if}
		{#if zero && domain[0] < 0}
			<line class="bf-chart-zero" x1={box.left} x2={box.width - box.right} y1={y(0)} y2={y(0)} />
		{/if}
		{#each lines as line (line.label)}
			{#if !line.pointsOnly}
				<path class="bf-chart-line" class:is-dashed={line.dashed} style:stroke={line.color} d={linePath(line.values, x, y, line.connect)} />
			{/if}
			{#if line.dots || line.pointsOnly}
				{#each definedIndexes(line.values) as i (i)}
					<circle cx={x(i)} cy={y(line.values[i]!)} r={line.pointsOnly ? 2.5 : 3} style:fill={line.color} />
				{/each}
			{/if}
		{/each}
		{#if count > 0}
			<line class="bf-chart-cursor" class:is-visible={hover !== null} x1={x(shown)} x2={x(shown)} y1={box.top} y2={box.height - box.bottom} />
		{/if}
		{#if lines.length > 0}
			<text class="bf-chart-axis" x={box.left} y={invert ? box.height - 2 : box.top + 2}>{format(domain[1])}</text>
			<text class="bf-chart-axis" x={box.left} y={invert ? box.top + 2 : box.height - 2}>{format(domain[0])}</text>
		{/if}
	</svg>
	<div class="bf-chart-ticks">
		{#each ticks as i (i)}
			<span>{formatShortDate(dates[i]!).replace(/^\S+\s/, "")}</span>
		{/each}
	</div>
	<div class="bf-chart-legend">
		<span class="bf-chart-date">{count > 0 ? formatShortDate(dates[shown]!) : ""}</span>
		{#each lines as line (line.label)}
			{@const value = valueAt(line, shown)}
			<span class="bf-chart-item">
				<span class="bf-chart-swatch" style:background-color={line.color}></span>{line.label}
				<strong>{value === null ? "—" : (line.format ?? format)(value)}</strong>
			</span>
		{/each}
		{#if bars}
			<span class="bf-chart-item">
				<span class="bf-chart-swatch bf-chart-swatch-bar"></span>{bars.label}
				<strong>{(bars.format ?? ((v: number) => formatNumber(v, 0)))(bars.values[shown] ?? 0)}</strong>
			</span>
		{/if}
		{#if band}
			<span class="bf-chart-item"><span class="bf-chart-swatch bf-chart-swatch-band"></span>{band.label}</span>
		{/if}
	</div>
</div>

<style>
	.bf-chart {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	/* Graf drží poměr stran – při změně šířky panelu se nedeformuje. */
	svg {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 500 / 170;
		border-radius: var(--radius-s);
		background-color: var(--background-secondary);
	}

	.bf-chart-line {
		fill: none;
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.bf-chart-line.is-dashed {
		stroke-dasharray: 5 4;
	}

	.bf-chart-bar {
		fill: var(--text-faint);
		opacity: 0.45;
	}

	.bf-chart-band {
		fill: color-mix(in srgb, var(--interactive-accent) 18%, transparent);
	}

	.bf-chart-zero {
		stroke: var(--text-faint);
		stroke-width: 1;
		stroke-dasharray: 2 3;
	}

	/* Kurzor je v DOM pořád, mění se jen průhlednost – nic se nepřekresluje. */
	.bf-chart-cursor {
		stroke: var(--text-muted);
		stroke-width: 1;
		opacity: 0;
	}

	.bf-chart-cursor.is-visible {
		opacity: 0.6;
	}

	.bf-chart-axis {
		fill: var(--text-faint);
		font-size: 10px;
		dominant-baseline: middle;
	}

	.bf-chart-ticks {
		display: flex;
		justify-content: space-between;
		color: var(--text-faint);
		font-size: var(--font-ui-smaller);
	}

	/* Řádek s hodnotami má stálou výšku (dva řádky), ať se při najetí nic neposouvá. */
	.bf-chart-legend {
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 0 var(--size-4-3);
		height: 3.2em;
		overflow: hidden;
		font-size: var(--font-ui-smaller);
		line-height: 1.6;
	}

	.bf-chart-date {
		min-width: 5em;
		color: var(--text-muted);
	}

	.bf-chart-item {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		white-space: nowrap;
	}

	.bf-chart-item strong {
		font-variant-numeric: tabular-nums;
	}

	.bf-chart-swatch {
		width: 10px;
		height: 3px;
		border-radius: 2px;
	}

	.bf-chart-swatch-bar {
		height: 9px;
		width: 6px;
		background-color: var(--text-faint);
		opacity: 0.45;
	}

	.bf-chart-swatch-band {
		height: 9px;
		background-color: color-mix(in srgb, var(--interactive-accent) 18%, transparent);
	}
</style>
