<script lang="ts">
	// Radarový graf ranního check-inu: škály 1–5 (5 = nejlepší), dnešek proti průměru předchozích 14 dní.
	import { t, translated } from "../../i18n";
	import type { WellnessAxis, WellnessPoint } from "../../calc/checkIn";
	import { polygonPoints, radarPoints } from "../charts/geometry";
	import { formatNumber } from "../format";

	interface Props {
		points: WellnessPoint[];
	}
	let { points }: Props = $props();

	const LABELS: Record<WellnessAxis, string> = translated({
		quality: "Sleep",
		morning_feeling: "Morning",
		fatigue: "Energy",
		soreness: "Muscles",
		mood: "Mood",
		stress: "Calm",
		motivation: "Motivation",
	});

	// Pevná geometrie – graf se nemění podle obsahu ani při najetí myší.
	const W = 300;
	const H = 230;
	const CX = W / 2;
	const CY = H / 2 + 4;
	const R = 78;
	const MAX = 5;

	const rings = [1, 2, 3, 4, 5].map((level) => polygonPoints(radarPoints(points.map(() => level), MAX, R, CX, CY)));
	const axisEnds = $derived(radarPoints(points.map(() => MAX), MAX, R, CX, CY));
	const labelAt = $derived(radarPoints(points.map(() => MAX), MAX, R + 16, CX, CY));
	const today = $derived(polygonPoints(radarPoints(points.map((p) => p.today), MAX, R, CX, CY)));
	const average = $derived(polygonPoints(radarPoints(points.map((p) => p.average), MAX, R, CX, CY)));
	const hasAverage = $derived(points.some((p) => p.average !== null));
	const anchor = (x: number) => (Math.abs(x - CX) < 4 ? "middle" : x > CX ? "start" : "end");
</script>

<figure class="bf-radar">
	<svg viewBox="0 0 {W} {H}" role="img" aria-label={t("How you feel today compared with the last 14 days")}>
		{#each rings as ring, i (i)}
			<polygon points={ring} class="bf-radar-ring" />
		{/each}
		{#each axisEnds as [x, y], i (i)}
			<line x1={CX} y1={CY} x2={x} y2={y} class="bf-radar-axis" />
		{/each}
		{#if hasAverage}<polygon points={average} class="bf-radar-average" />{/if}
		<polygon points={today} class="bf-radar-today" />
		{#each points as p, i (p.axis)}
			{@const [x, y] = labelAt[i]!}
			<text x={x} y={y} text-anchor={anchor(x)} dominant-baseline="middle" class="bf-radar-label">
				{LABELS[p.axis]}
				<tspan class="bf-radar-value">{p.today !== null ? ` ${p.today}/5` : " –"}</tspan>
			</text>
		{/each}
	</svg>
	{#if hasAverage}
		<ul class="bf-radar-diff bf-muted">
			{#each points.filter((p) => p.today !== null && p.average !== null && Math.abs(p.today - p.average) >= 1) as p (p.axis)}
				<li>{LABELS[p.axis]}: {p.today}/5 {t("vs. average {v}", { v: formatNumber(p.average ?? 0, 1) })}</li>
			{/each}
		</ul>
	{/if}
	<figcaption class="bf-muted">
		<span class="bf-radar-key bf-radar-key-today"></span>{t("today")}
		{#if hasAverage}
			<span class="bf-radar-key bf-radar-key-average"></span>{t("average of the previous 14 days")}
		{/if}
		<span class="bf-radar-scale">{t("5 = best on every axis")}</span>
	</figcaption>
</figure>

<style>
	.bf-radar {
		margin: 0;
	}

	.bf-radar svg {
		display: block;
		width: 100%;
		max-width: 360px;
		height: auto;
		margin: 0 auto;
		overflow: visible;
	}

	.bf-radar-ring {
		fill: none;
		stroke: var(--background-modifier-border);
		stroke-width: 1;
	}

	.bf-radar-axis {
		stroke: var(--background-modifier-border);
		stroke-width: 1;
	}

	.bf-radar-average {
		fill: none;
		stroke: var(--text-muted);
		stroke-width: 1.5;
		stroke-dasharray: 4 3;
	}

	.bf-radar-today {
		fill: var(--interactive-accent);
		fill-opacity: 0.25;
		stroke: var(--interactive-accent);
		stroke-width: 2;
	}

	.bf-radar-label {
		font-size: 11px;
		fill: var(--text-normal);
	}

	.bf-radar-value {
		fill: var(--text-muted);
	}

	figcaption {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--size-4-1) var(--size-4-2);
		font-size: var(--font-ui-smaller);
	}

	.bf-radar-key {
		display: inline-block;
		width: 14px;
		height: 0;
		margin-right: 2px;
		vertical-align: middle;
	}

	.bf-radar-key-today {
		border-top: 2px solid var(--interactive-accent);
	}

	.bf-radar-key-average {
		border-top: 2px dashed var(--text-muted);
	}

	.bf-radar-scale {
		flex-basis: 100%;
		text-align: center;
	}

	.bf-radar-diff {
		margin: 0 0 var(--size-4-1);
		padding-left: var(--size-4-5);
		font-size: var(--font-ui-smaller);
	}
</style>
