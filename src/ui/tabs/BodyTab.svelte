<script lang="ts">
	// Karta Tělo (SPEC 5.5): panáček obarvený podle objemu, regenerace nebo bolestí,
	// najetí = náhled partie, kliknutí = připnutí detailu. Pod ním evidence bolestí.
	import { t, tn } from "../../i18n";
	import {
		RECOVERY_BASIS,
		VOLUME_BASIS,
		cardioLoad,
		muscleExercises,
		recovery,
		volumeCategory,
		volumeHistory,
		weeklySets,
		weeklyTrend,
		weeklyUncounted,
		type VolumeContext,
	} from "../../calc/muscleVolume";
	import { assessPain, isOpenPain, painCategory, painLevels } from "../../calc/pain";
	import { bodyMeasureRows } from "../../calc/bodyMeasures";
	import { MUSCLE_LABELS, MUSCLES, type MuscleId } from "../../model/constants";
	import { toIsoDate } from "../../model/dates";
	import MuscleDetail from "../body/MuscleDetail.svelte";
	import BasisTag from "../components/BasisTag.svelte";
	import MuscleFigure from "../body/MuscleFigure.svelte";
	import PainCard from "../body/PainCard.svelte";
	import {
		MODE_LABELS,
		PAIN_COLORS,
		PAIN_LEGEND,
		RECOVERY_COLORS,
		VOLUME_COLORS,
		formatSetCount,
		recoveryLegend,
		volumeLegend,
		type BodyMode,
	} from "../body/text";
	import ResearchCard from "../components/ResearchCard.svelte";
	import { researchTopic } from "../../seed/research";
	import { usePlugin } from "../context";
	import { formatDays, formatNumber, formatShortDate } from "../format";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const MODES: BodyMode[] = ["volume", "recovery", "pain"];
	const TREND_WEEKS = 8;

	let mode = $state<BodyMode>("volume");
	let hovered = $state<MuscleId | null>(null);
	let pinned = $state<MuscleId | null>(null);
	const active = $derived(hovered ?? pinned);

	const thresholds = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.thresholds;
	});
	const range = $derived({ low: thresholds.weeklySetsLow, targetMin: thresholds.weeklySetsTargetMin, targetMax: thresholds.weeklySetsTargetMax });
	const recoveryThresholds = $derived({
		minSets: thresholds.recoveryMinSets,
		hours1: thresholds.recoveryHours1,
		hours2: thresholds.recoveryHours2,
		hours3: thresholds.recoveryHours3,
	});

	const today = $derived.by(() => {
		void $indexVersion;
		return toIsoDate(new Date());
	});
	const workouts = $derived.by(() => {
		void $indexVersion;
		return plugin.index.all("workout").map((w) => w.note);
	});
	// Tělesné míry z check-inu: poslední hodnota a změna.
	const measures = $derived.by(() => {
		void $indexVersion;
		return bodyMeasureRows(
			plugin.index.all("day").map((d) => d.note),
			today,
		);
	});
	const measureChange = (change: { change: number; days: number }, unit: string) =>
		change.change === 0 ? t("no change over {v}", { v: formatDays(change.days) }) : t("{change} {unit} over {days}", { change: `${change.change > 0 ? "+" : "−"}${formatNumber(Math.abs(change.change), 1)}`, unit, days: formatDays(change.days) });
	// Stejný kontext jako u doporučení (prahy z nastavení, váha, testy maxima).
	const ctx = $derived.by((): VolumeContext => {
		void $indexVersion;
		void thresholds;
		return plugin.insights.volumeContext();
	});
	const history = $derived(volumeHistory(workouts, ctx));
	const sets = $derived(weeklySets(history, today));
	const trend = $derived(weeklyTrend(history, today, TREND_WEEKS));
	const uncounted = $derived(weeklyUncounted(history, today));
	const assumed = $derived(weeklyUncounted(history, today, "assumed"));
	const recoveries = $derived.by(() => {
		const now = Date.now();
		return Object.fromEntries(MUSCLES.map((m) => [m, recovery(history, m, now, recoveryThresholds)])) as Record<
			MuscleId,
			ReturnType<typeof recovery>
		>;
	});
	const hasStrength = $derived(history.some((h) => Object.keys(h.muscles).length > 0));

	// Otevřené bolesti (SPEC 5.10) – pro režim Bolesti a řádek v detailu partie.
	const pains = $derived.by(() => {
		void $indexVersion;
		const limits = { professionalLevel: thresholds.painProfessionalLevel, professionalDays: thresholds.painProfessionalDays };
		return plugin.index
			.all("pain")
			.map((p) => p.note)
			.filter((p) => isOpenPain(p) && p.level > 0)
			.map((p) => assessPain(p, today, limits));
	});
	const painByMuscle = $derived.by(() => {
		void $indexVersion;
		return painLevels(plugin.index.all("pain").map((p) => p.note));
	});

	const colorOf = (muscle: MuscleId): string => {
		if (mode === "volume") return VOLUME_COLORS[volumeCategory(sets[muscle], range)];
		if (mode === "recovery") return RECOVERY_COLORS[recoveries[muscle].category];
		return PAIN_COLORS[painCategory(painByMuscle[muscle])];
	};
	const fills = $derived(Object.fromEntries(MUSCLES.map((m) => [m, colorOf(m)])) as Record<MuscleId, string>);
	const legend = $derived.by(() => {
		if (mode === "volume") return volumeLegend(range).map((label, i) => ({ label, color: VOLUME_COLORS[i]! }));
		if (mode === "pain") return PAIN_LEGEND.map((label, i) => ({ label: t(label), color: PAIN_COLORS[i]! }));
		return recoveryLegend(recoveryThresholds.hours1, recoveryThresholds.hours2, recoveryThresholds.hours3).map((label, i) => ({
			label,
			color: RECOVERY_COLORS[i]!,
		}));
	});
	const hint = $derived(
		mode === "volume"
			? t("Effective sets in the last 7 days · recommended range {targetMin}–{targetMax}", { targetMin: range.targetMin, targetMax: range.targetMax })
			: mode === "recovery"
				? t("Time since the muscle group was last trained · roughly {hours2}–{hours3} h between hard sessions", { hours2: recoveryThresholds.hours2, hours3: recoveryThresholds.hours3 })
				: t("Logged pain by intensity 0–10 · pain is assigned to the nearest muscle group; the plugin doesn't diagnose"),
	);

	// Souhrn, když není vybraná žádná partie.
	const top = $derived(MUSCLES.reduce((best, m) => (sets[m] > sets[best] ? m : best), MUSCLES[0]));
	const inRange = $derived(MUSCLES.filter((m) => volumeCategory(sets[m], range) === 2).length);
	const below = $derived(MUSCLES.filter((m) => sets[m] < range.targetMin));

	const detail = $derived.by(() => {
		if (!active) return null;
		return {
			muscle: active,
			sets: sets[active],
			category: volumeCategory(sets[active], range),
			recovery: recoveries[active],
			trend: trend.map((w) => ({ from: w.from, sets: w.sets[active] })),
			exercises: muscleExercises(workouts, active, ctx, today),
			cardio: cardioLoad(workouts, active, today),
			pains: pains.filter((p) => p.muscle === active),
		};
	});

	function pin(muscle: MuscleId) {
		pinned = pinned === muscle ? null : muscle;
	}
</script>

<section class="bf-card">
	<div class="bf-body-modes" role="tablist" aria-label={t("Figure coloring")}>
		{#each MODES as m (m)}
			<button type="button" role="tab" aria-selected={mode === m} class:is-active={mode === m} onclick={() => (mode = m)}>{MODE_LABELS[m]}</button>
		{/each}
	</div>
	<p class="bf-muted bf-small bf-body-hint">
		{hint}
		{#if mode === "volume"}<BasisTag basis={VOLUME_BASIS} named />{:else if mode === "recovery"}<BasisTag basis={RECOVERY_BASIS} />{/if}
	</p>

	<div class="bf-body-figure">
		<MuscleFigure {fills} active={pinned} onSelect={pin} onHover={(m) => (hovered = m)} label={t("Muscle groups – choose detail")} />
	</div>

	<div class="bf-body-legend">
		{#each legend as item (item.label)}
			<span class="bf-body-legend-item"><span class="bf-body-swatch" style:background-color={item.color}></span>{item.label}</span>
		{/each}
	</div>
</section>

<section class="bf-card bf-body-panel">
	{#if detail}
		<MuscleDetail
			{...detail}
			pinned={pinned === detail.muscle}
			{range}
			hours2={recoveryThresholds.hours2}
			hours3={recoveryThresholds.hours3}
			onShowExercises={() => plugin.openLibrary({ muscle: detail.muscle })}
		/>
	{:else}
		<div class="bf-body-summary">
			<div>
				<div class="bf-body-eyebrow">{t("Last 7 days")}</div>
				<h4>{t("Hover over or click a muscle group")}</h4>
				<p class="bf-muted bf-small">{t("You'll see only its statistics. Click to pin it, click again to unpin.")}</p>
			</div>
			{#if !hasStrength}
				<p class="bf-muted">
					{t("Collecting data – there's no workout with effective sets here yet. Log RIR for your sets (how many reps you had left); sets are counted by it.")}
				</p>
			{:else}
				<div class="bf-body-tiles">
					<div class="bf-body-tile">
						<div class="bf-muted bf-small">{t("Most sets")}</div>
						<div class="bf-body-value">{MUSCLE_LABELS[top]} · {formatSetCount(sets[top])}</div>
					</div>
					<div class="bf-body-tile">
						<div class="bf-muted bf-small">{t("In the optimum ({targetMin}–{targetMax})", { targetMin: range.targetMin, targetMax: range.targetMax })}</div>
						<div class="bf-body-value">{t("{inRange} of {MUSCLES_length} muscle groups", { inRange, MUSCLES_length: MUSCLES.length })}</div>
					</div>
				</div>
				<div class="bf-body-tile">
					<div class="bf-muted bf-small">{t("Below recommended volume")}</div>
					<div>{below.length > 0 ? below.map((m) => `${MUSCLE_LABELS[m]} ${formatSetCount(sets[m])}`).join(" · ") : t("No muscle group.")}</div>
				</div>
			{/if}
			<div>
				<div class="bf-muted bf-small">{t("All muscle groups")}</div>
				<div class="bf-body-chips">
					{#each MUSCLES as m (m)}
						<button type="button" class="bf-body-chip" onclick={() => (pinned = m)}>
							<span class="bf-body-dot" style:background-color={fills[m]}></span>{MUSCLE_LABELS[m]}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
	{#if researchTopic("recovery_methods")}<ResearchCard topic={researchTopic("recovery_methods")!} />{/if}
	{#if researchTopic("pain_training")}<ResearchCard topic={researchTopic("pain_training")!} />{/if}
</section>

<PainCard muscle={pinned} />

<section class="bf-card">
	<h4>{t("Body measurements")}</h4>
	{#if measures.length === 0}
		<p class="bf-muted">{t("No measurements yet. Log measurements (waist, hips, chest, arm, thigh, calf, body fat) in the morning check-in – once every 2–4 weeks is enough.")}</p>
	{:else}
		<table class="bf-measure-table">
			<thead>
				<tr><th>{t("Measurement")}</th><th>{t("Now")}</th><th>{t("Since last time")}</th><th>{t("Since the start")}</th></tr>
			</thead>
			<tbody>
				{#each measures as row (row.id)}
					<tr>
						<td>{row.label}</td>
						<td>
							<strong>{formatNumber(row.value, 1)} {row.unit}</strong>
							<span class="bf-muted bf-small"> · {formatShortDate(row.date)}</span>
						</td>
						<td>{row.previous ? measureChange(row.previous, row.unit) : t("first measurement")}</td>
						<td>{row.first ? measureChange(row.first, row.unit) : "—"}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="bf-muted bf-small">{t("Measure in the morning, always at the same spot. A difference of up to 1 cm is usually measurement error.")}</p>
	{/if}
	<div class="bf-actions"><button type="button" onclick={() => plugin.openCheckIn()}>{t("Log measurements in the check-in")}</button></div>
</section>

{#if uncounted > 0}
	<p class="bf-muted bf-small">
		{tn(uncounted, ["{n} working set in the last 7 days wasn't counted because it's missing RIR. Without RIR, gym sets from {effectiveMinPct1rm} % of estimated 1RM and bodyweight sets are counted.", "{n} working sets in the last 7 days weren't counted because they're missing RIR. Without RIR, gym sets from {effectiveMinPct1rm} % of estimated 1RM and bodyweight sets are counted."], { effectiveMinPct1rm: thresholds.effectiveMinPct1rm })}
	</p>
{/if}
{#if assumed > 0}
	<p class="bf-muted bf-small">
		{tn(assumed, ["For {n} bodyweight set in the last 7 days the plugin doesn't know your max reps and uses your longest logged set instead. If you train further from your max, volume comes out higher than it really is. A max test, or RIR logged for one set, makes it more accurate.", "For {n} bodyweight sets in the last 7 days the plugin doesn't know your max reps and uses your longest logged set instead. If you train further from your max, volume comes out higher than it really is. A max test, or RIR logged for one set, makes it more accurate."])}
		<button type="button" class="bf-link-button" onclick={() => plugin.openTest({})}>{t("Max test")}</button>
		<BasisTag basis={{ sourceIds: ["practice"], evidence: "practice" }} />
	</p>
{/if}
<div class="bf-actions">
	<button type="button" onclick={() => plugin.openLibrary({})}>{t("Exercise library")}</button>
</div>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-small {
		font-size: var(--font-ui-small);
	}

	.bf-measure-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--font-ui-small);
	}

	.bf-measure-table th,
	.bf-measure-table td {
		padding: var(--size-2-2) var(--size-4-2) var(--size-2-2) 0;
		text-align: left;
		vertical-align: baseline;
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.bf-measure-table th {
		font-weight: var(--font-normal);
		color: var(--text-muted);
	}

	.bf-body-modes {
		display: flex;
		gap: 4px;
		padding: 4px;
		border-radius: var(--radius-m);
		background-color: var(--background-modifier-border);
		align-self: flex-start;
	}

	.bf-body-modes button {
		box-shadow: none;
		background: transparent;
		color: var(--text-muted);
	}

	.bf-body-modes button.is-active {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	/* Nápověda režimu má pevnou výšku na dva řádky, aby přepnutí neposunulo panáčka. */
	.bf-body-hint {
		min-height: 2.8em;
	}

	.bf-body-figure {
		display: flex;
		justify-content: center;
	}

	.bf-body-legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--size-4-1) var(--size-4-3);
		font-size: var(--font-ui-smaller);
	}

	.bf-body-legend-item {
		display: flex;
		align-items: center;
		gap: var(--size-4-1);
	}

	.bf-body-swatch {
		width: 12px;
		height: 12px;
		border-radius: 3px;
	}

	/* Panel má stálou minimální výšku – souhrn i detail zabírají stejně místa. */
	.bf-body-panel {
		min-height: 600px;
	}

	.bf-body-summary {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
	}

	.bf-body-eyebrow {
		color: var(--text-muted);
		font-size: var(--font-ui-smaller);
		font-weight: var(--font-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.bf-body-tiles {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--size-4-2);
	}

	.bf-body-tile {
		padding: var(--size-4-2);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
	}

	.bf-body-value {
		font-weight: var(--font-semibold);
	}

	.bf-body-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-1);
		margin-top: var(--size-4-1);
	}

	.bf-body-chip {
		display: flex;
		align-items: center;
		gap: var(--size-4-1);
		height: 28px;
		padding: 0 var(--size-4-2);
		border-radius: 999px;
		font-size: var(--font-ui-smaller);
	}

	.bf-body-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
</style>
