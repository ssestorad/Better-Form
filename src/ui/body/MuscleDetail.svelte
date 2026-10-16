<script lang="ts">
	// Detail svalové partie (SPEC 5.5). Rozvržení je pevné: každá část má stálou
	// výšku, aby při přejíždění mezi partiemi nic neposkakovalo.
	import { t, tn } from "../../i18n";
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
			<div class="bf-md-eyebrow">{pinned ? t("Pinned · click again to unpin") : t("Muscle group")}</div>
			<h4>{MUSCLE_LABELS[muscle]}</h4>
		</div>
		<span class="bf-md-chip" style:background-color={VOLUME_COLORS[category]} class:is-strong={category >= 2}>{t(VOLUME_SHORT[category])}</span>
	</header>

	<div class="bf-md-tiles">
		<div class="bf-md-tile">
			<div class="bf-md-label">{t("Sets in 7 days")}</div>
			<div class="bf-md-big">{formatSetCount(sets)}</div>
			<div class="bf-md-label">{t("target {targetMin}–{targetMax}", { targetMin: range.targetMin, targetMax: range.targetMax })}</div>
		</div>
		<div class="bf-md-tile">
			<div class="bf-md-label">{t("Last time")}</div>
			<div class="bf-md-big">{lastTrainedText(recovery)}</div>
			<div class="bf-md-label">{recovery.lastDate ? formatShortDate(recovery.lastDate) : t("muscle group not trained")}</div>
		</div>
		<div class="bf-md-tile">
			<div class="bf-md-label">{t("Recovery")}</div>
			<div class="bf-md-big">{recovery.percent} %</div>
			<div class="bf-md-bar"><div class="bf-md-bar-fill" style:width={`${recovery.percent}%`} style:background-color={RECOVERY_COLORS[recovery.category]}></div></div>
		</div>
	</div>

	<div class="bf-md-trend">
		<div class="bf-md-row bf-md-label">
			<span>{tn(trend.length, ["Sets per week, last {n} week", "Sets per week, last {n} weeks"])}</span>
			<span>{t("band = recommended {targetMin}–{targetMax}", { targetMin: range.targetMin, targetMax: range.targetMax })}</span>
		</div>
		<svg viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`} role="img" aria-label={t("Weekly volume trend")}>
			<rect class="bf-md-band" x="0" y={geometry.bandY} width={TREND_WIDTH} height={geometry.bandHeight} />
			<polyline class="bf-md-line" points={geometry.points} />
			<circle class="bf-md-dot" cx={geometry.lastX} cy={geometry.lastY} r="5" />
		</svg>
		<div class="bf-md-row bf-md-weeks">
			{#each trend as week, i (week.from)}
				<span>{i === trend.length - 1 ? t("now") : formatShortDate(week.from).replace(/^\S+\s/, "")}</span>
			{/each}
		</div>
	</div>

	<div class="bf-md-table" role="table">
		<div class="bf-md-tr bf-md-label" role="row">
			<span role="columnheader">{t("Exercise")}</span>
			<span role="columnheader">{t("Best set")}</span>
			<span role="columnheader">{t("Estimated 1RM")}</span>
			<span role="columnheader">{t("In 4 weeks")}</span>
		</div>
		{#each rows as row (row.name)}
			<div class="bf-md-tr" role="row">
				<span role="cell" class="bf-md-name" class:bf-muted={!row.primary} title={row.primary ? t("Primary muscle group of the exercise") : t("Secondary muscle group of the exercise")}>{row.name}</span>
				<span role="cell">{bestSetText(row.best)}</span>
				<span role="cell">{row.oneRm !== null ? `${formatNumber(row.oneRm, 0)} kg` : "—"}</span>
				<span role="cell">{changeText(row.change)}</span>
			</div>
		{/each}
		{#if rows.length === 0}
			<div class="bf-md-empty bf-muted">{t("No exercise for this muscle group in the last 4 weeks.")}</div>
		{/if}
	</div>
	<div class="bf-md-more">
		{#if exercises.length > ROWS}<span class="bf-muted">{t("and {ROWS} more", { ROWS: exercises.length - ROWS })}</span>{/if}
		<button type="button" class="bf-link-button" onclick={onShowExercises}>{t("Exercises for this muscle group in the library")}</button>
	</div>

	<div class="bf-md-cardio">
		{#if cardio.length > 0}
			<div class="bf-md-cardio-box">{t("Cardio in 7 days: {v} – loads the muscle group but doesn't count as sets.", { v: cardioText(cardio) })}</div>
		{:else}
			<span class="bf-muted">{t("No cardio loading this muscle group.")}</span>
		{/if}
	</div>

	<div class="bf-md-pain" class:is-active={pains.length > 0}>
		<span class="bf-md-eyebrow">{t("Pain")}</span>
		<span class="bf-md-pain-text">{painText(pains)}</span>
		{#if pains.some((p) => p.seeProfessional)}<span class="bf-tag bf-tag-warn">{t("see a professional")}</span>{/if}
	</div>

	<div class="bf-md-advice">
		<div class="bf-md-eyebrow">{t("Recommendation")}</div>
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
