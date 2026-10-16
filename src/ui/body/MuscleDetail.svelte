<script lang="ts">
	// Detail svalové partie (SPEC 5.5). Rozvržení je pevné: každá část má stálou
	// výšku, aby při přejíždění mezi partiemi nic neposkakovalo.
	import { t } from "../../i18n";
	import type { CardioLoad, MuscleExerciseRow, Recovery } from "../../calc/muscleVolume";
	import { MUSCLE_LABELS, type MuscleId } from "../../model/constants";
	import { formatNumber, formatShortDate } from "../format";
	import {
		RECOVERY_COLORS,
		TREND_HEIGHT,
		TREND_WIDTH,
		VOLUME_COLORS,
		VOLUME_SHORT,
		bestSetText,
		cardioText,
		changeText,
		formatSetCount,
		lastTrainedText,
		painText,
		recoveryAdvice,
		trendGeometry,
		volumeAdvice,
		type MusclePain,
		type VolumeRange,
	} from "./text";

	interface Props {
		muscle: MuscleId;
		pinned: boolean;
		sets: number;
		category: 0 | 1 | 2 | 3;
		recovery: Recovery;
		/** Série po sedmidenních oknech od nejstaršího. */
		trend: { from: string; sets: number }[];
		exercises: MuscleExerciseRow[];
		cardio: CardioLoad[];
		/** Otevřené bolesti na této partii. */
		pains: MusclePain[];
		range: VolumeRange;
		hours2: number;
		hours3: number;
		onShowExercises: () => void;
	}
	let { muscle, pinned, sets, category, recovery, trend, exercises, cardio, pains, range, hours2, hours3, onShowExercises }: Props = $props();

	/** Kolik cviků se vejde do pevné tabulky. */
	const ROWS = 4;

	const geometry = $derived(trendGeometry(trend.map((w) => w.sets), range));
	const rows = $derived(exercises.slice(0, ROWS));
	const advice = $derived([volumeAdvice(sets, range), recoveryAdvice(recovery, hours2, hours3)]);
</script>

<div class="bf-md">
	<header class="bf-md-head">
		<div>
			<div class="bf-md-eyebrow">{pinned ? t("Připnuto · klikni znovu pro odepnutí") : t("Svalová partie")}</div>
			<h4>{MUSCLE_LABELS[muscle]}</h4>
		</div>
		<span class="bf-md-chip" style:background-color={VOLUME_COLORS[category]} class:is-strong={category >= 2}>{t(VOLUME_SHORT[category])}</span>
	</header>

	<div class="bf-md-tiles">
		<div class="bf-md-tile">
			<div class="bf-md-label">{t("Série za 7 dní")}</div>
			<div class="bf-md-big">{formatSetCount(sets)}</div>
			<div class="bf-md-label">{t("cíl {targetMin}–{targetMax}", { targetMin: range.targetMin, targetMax: range.targetMax })}</div>
		</div>
		<div class="bf-md-tile">
			<div class="bf-md-label">{t("Naposledy")}</div>
			<div class="bf-md-big">{lastTrainedText(recovery)}</div>
			<div class="bf-md-label">{recovery.lastDate ? formatShortDate(recovery.lastDate) : t("bez tréninku partie")}</div>
		</div>
		<div class="bf-md-tile">
			<div class="bf-md-label">{t("Regenerace")}</div>
			<div class="bf-md-big">{recovery.percent} %</div>
			<div class="bf-md-bar"><div class="bf-md-bar-fill" style:width={`${recovery.percent}%`} style:background-color={RECOVERY_COLORS[recovery.category]}></div></div>
		</div>
	</div>

	<div class="bf-md-trend">
		<div class="bf-md-row bf-md-label">
			<span>{t("Série za týden, posledních {trend_length} týdnů", { trend_length: trend.length })}</span>
			<span>{t("pás = doporučených {targetMin}–{targetMax}", { targetMin: range.targetMin, targetMax: range.targetMax })}</span>
		</div>
		<svg viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`} role="img" aria-label={t("Vývoj týdenního objemu")}>
			<rect class="bf-md-band" x="0" y={geometry.bandY} width={TREND_WIDTH} height={geometry.bandHeight} />
			<polyline class="bf-md-line" points={geometry.points} />
			<circle class="bf-md-dot" cx={geometry.lastX} cy={geometry.lastY} r="5" />
		</svg>
		<div class="bf-md-row bf-md-weeks">
			{#each trend as week, i (week.from)}
				<span>{i === trend.length - 1 ? t("teď") : formatShortDate(week.from).replace(/^\S+\s/, "")}</span>
			{/each}
		</div>
	</div>

	<div class="bf-md-table" role="table">
		<div class="bf-md-tr bf-md-label" role="row">
			<span role="columnheader">{t("Cvik")}</span>
			<span role="columnheader">{t("Nejlepší série")}</span>
			<span role="columnheader">{t("Odhad 1RM")}</span>
			<span role="columnheader">{t("Za 4 týdny")}</span>
		</div>
		{#each rows as row (row.name)}
			<div class="bf-md-tr" role="row">
				<span role="cell" class="bf-md-name" class:bf-muted={!row.primary} title={row.primary ? t("Hlavní partie cviku") : t("Vedlejší partie cviku")}>{row.name}</span>
				<span role="cell">{bestSetText(row.best)}</span>
				<span role="cell">{row.oneRm !== null ? `${formatNumber(row.oneRm, 0)} kg` : "—"}</span>
				<span role="cell">{changeText(row.change)}</span>
			</div>
		{/each}
		{#if rows.length === 0}
			<div class="bf-md-empty bf-muted">{t("V posledních 4 týdnech žádný cvik na tuto partii.")}</div>
		{/if}
	</div>
	<div class="bf-md-more">
		{#if exercises.length > ROWS}<span class="bf-muted">{t("a dalších {ROWS}", { ROWS: exercises.length - ROWS })}</span>{/if}
		<button type="button" class="bf-link-button" onclick={onShowExercises}>{t("Cviky na tuto partii v knihovně")}</button>
	</div>

	<div class="bf-md-cardio">
		{#if cardio.length > 0}
			<div class="bf-md-cardio-box">{t("Kardio za 7 dní: {v} – zatěžuje partii, do sérií se nepočítá.", { v: cardioText(cardio) })}</div>
		{:else}
			<span class="bf-muted">{t("Bez kardia, které by partii zatěžovalo.")}</span>
		{/if}
	</div>

	<div class="bf-md-pain" class:is-active={pains.length > 0}>
		<span class="bf-md-eyebrow">{t("Bolest")}</span>
		<span class="bf-md-pain-text">{painText(pains)}</span>
		{#if pains.some((p) => p.seeProfessional)}<span class="bf-tag bf-tag-warn">{t("poraď se s odborníkem")}</span>{/if}
	</div>

	<div class="bf-md-advice">
		<div class="bf-md-eyebrow">{t("Doporučení")}</div>
		{#each advice as line (line.source)}
			<div class="bf-md-row">
				<span>{line.text}</span>
				<span class="bf-md-source">{line.source}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.bf-md {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
		font-size: var(--font-ui-small);
	}

	h4 {
		margin: 0;
		font-size: var(--font-ui-large);
	}

	.bf-md-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--size-4-2);
		height: 44px;
	}

	.bf-md-eyebrow {
		color: var(--text-muted);
		font-size: var(--font-ui-smaller);
		font-weight: var(--font-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.bf-md-chip {
		flex-shrink: 0;
		padding: 2px var(--size-4-2);
		border-radius: 999px;
		font-size: var(--font-ui-smaller);
		font-weight: var(--font-semibold);
		color: var(--text-normal);
	}

	.bf-md-chip.is-strong {
		color: var(--text-on-accent);
	}

	.bf-md-tiles {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--size-4-2);
	}

	.bf-md-tile {
		display: flex;
		flex-direction: column;
		gap: 2px;
		height: 74px;
		box-sizing: border-box;
		padding: var(--size-4-2);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		overflow: hidden;
	}

	.bf-md-label {
		color: var(--text-muted);
		font-size: var(--font-ui-smaller);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bf-md-big {
		font-size: var(--font-ui-medium);
		font-weight: var(--font-bold);
		line-height: 1.3;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bf-md-bar {
		height: 6px;
		margin-top: 4px;
		border-radius: 3px;
		background-color: var(--background-modifier-border);
		overflow: hidden;
	}

	.bf-md-bar-fill {
		height: 100%;
	}

	.bf-md-row {
		display: flex;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	/* Graf drží poměr stran – při změně šířky panelu se nedeformuje. */
	.bf-md-trend svg {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 500 / 90;
	}

	.bf-md-band {
		fill: color-mix(in srgb, var(--interactive-accent) 15%, transparent);
	}

	.bf-md-line {
		fill: none;
		stroke: var(--interactive-accent);
		stroke-width: 2.5;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.bf-md-dot {
		fill: var(--interactive-accent);
		stroke: var(--background-primary);
		stroke-width: 2;
	}

	.bf-md-weeks {
		color: var(--text-muted);
		font-size: var(--font-ui-smaller);
	}

	/* Tabulka má vždy místo pro záhlaví a 4 řádky. */
	.bf-md-table {
		display: flex;
		flex-direction: column;
		height: 138px;
		overflow: hidden;
	}

	.bf-md-tr {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 0.9fr);
		gap: var(--size-4-2);
		height: 27px;
		align-items: center;
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.bf-md-tr > span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bf-md-name {
		font-weight: var(--font-semibold);
	}

	.bf-md-empty {
		padding-top: var(--size-4-2);
	}

	.bf-md-more {
		display: flex;
		justify-content: space-between;
		gap: var(--size-4-2);
		height: 20px;
	}

	.bf-md-more > :only-child {
		margin-left: auto;
	}

	.bf-md-cardio {
		display: flex;
		align-items: center;
		height: 48px;
	}

	.bf-md-cardio-box {
		width: 100%;
		box-sizing: border-box;
		padding: var(--size-4-1) var(--size-4-2);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		background-color: var(--background-secondary);
	}

	/* Řádek bolesti má stálou výšku, ať je bolest evidovaná nebo ne. */
	.bf-md-pain {
		display: flex;
		align-items: center;
		gap: var(--size-4-2);
		height: 24px;
		color: var(--text-muted);
		overflow: hidden;
	}

	.bf-md-pain.is-active {
		color: var(--text-normal);
	}

	.bf-md-pain-text {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bf-md-advice {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-1);
		min-height: 96px;
	}

	.bf-md-source {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: var(--font-ui-smaller);
		text-align: right;
	}
</style>
