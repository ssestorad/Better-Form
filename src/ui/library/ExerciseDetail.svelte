<script lang="ts">
	// Detail cviku: panáček se zapojenými partiemi, popis, provedení, časté chyby.
	import { t, tn } from "../../i18n";
	import { HISTORY_BEST_LABELS, HISTORY_METRIC_LABELS, type ExerciseHistory } from "../../calc/exerciseHistory";
	import { EQUIPMENT_LABELS, MUSCLE_LABELS } from "../../model/constants";
	import type { ExerciseNote } from "../../model/types";
	import { bulletLines } from "../../seed/lookup";
	import { topicsForExercise } from "../../seed/research";
	import ResearchCard from "../components/ResearchCard.svelte";
	import MuscleFigure from "../body/MuscleFigure.svelte";
	import LineChart from "../charts/LineChart.svelte";
	import { formatCzechDate, formatNumber, formatShortDate } from "../format";
	import { CATEGORY_LABELS } from "./labels";

	interface Props {
		exercise: ExerciseNote;
		/** Poslední výkon, např. „út 29. 9.: 3×6 × 80 kg“. */
		last?: string;
		/** Všechny tréninky s cvikem a řada nejlepších výkonů. */
		history?: ExerciseHistory;
		onOpenNote: () => void;
	}
	let { exercise, last, history, onOpenNote }: Props = $props();

	/** Kolik posledních tréninků ukázat hned; zbytek po rozbalení. */
	const VISIBLE_SESSIONS = 6;
	let showAll = $state(false);
	const sessions = $derived(history ? (showAll ? history.sessions : history.sessions.slice(0, VISIBLE_SESSIONS)) : []);
	const metricUnit = $derived(history?.metric === "oneRm" ? " kg" : history?.metric === "sec" ? " s" : "");
	const metricValue = (value: number) => formatNumber(value, history?.metric === "oneRm" ? 1 : 0);

	const how = $derived(bulletLines(exercise.technique));
	const mistakes = $derived(bulletLines(exercise.mistakes));
	const primary = $derived(exercise.muscles.primary.map((m) => MUSCLE_LABELS[m]).join(", "));
	const secondary = $derived(exercise.muscles.secondary.map((m) => MUSCLE_LABELS[m]).join(", "));
	const equipment = $derived((exercise.equipment ?? []).map((e) => EQUIPMENT_LABELS[e]).join(", "));
	const topics = $derived(topicsForExercise(exercise.name, exercise.category));
</script>

<article class="bf-exercise">
	<header>
		<h3>{exercise.name}</h3>
		<div class="bf-exercise-meta">
			<span class="bf-tag">{CATEGORY_LABELS[exercise.category]}</span>
			{#if exercise.aliases.length > 0}<span class="bf-muted">{t("also: {v}", { v: exercise.aliases.join(", ") })}</span>{/if}
		</div>
	</header>

	<div class="bf-exercise-top">
		<div class="bf-exercise-figure">
			<MuscleFigure primary={exercise.muscles.primary} secondary={exercise.muscles.secondary} label={t("Muscle groups worked by {exercise_name}", { exercise_name: exercise.name })} />
		</div>
		<div class="bf-exercise-muscles">
			{#if exercise.description}<p>{exercise.description}</p>{/if}
			<dl>
				{#if primary}
					<dt><span class="bf-swatch is-primary"></span>{t("Primary muscles")}</dt>
					<dd>{primary}</dd>
				{/if}
				{#if secondary}
					<dt><span class="bf-swatch is-secondary"></span>{t("Secondary muscles")}</dt>
					<dd>{secondary}</dd>
				{/if}
				{#if primary === "" && secondary === ""}
					<dd class="bf-muted">{t("Muscle groups aren't filled in – add them in the exercise note (muscles).")}</dd>
				{/if}
				{#if equipment}
					<dt>{t("Equipment")}</dt>
					<dd>{equipment}</dd>
				{/if}
			</dl>
			{#if exercise.bodyweight_fraction !== undefined}
				<p class="bf-muted bf-small">
					{t("You lift roughly {v} % of your body weight", { v: formatNumber(exercise.bodyweight_fraction * 100, 0) })}
					<span class="bf-tag" title={exercise.bodyweight_fraction_source === "ebben2011" ? t("Ebben et al. 2011") : t("Rough estimate")}>
						{exercise.bodyweight_fraction_source ? t("research") : t("practice")}
					</span>
				</p>
			{/if}
			{#if last}<p class="bf-muted bf-small">{t("Last time {last}", { last })}</p>{/if}
		</div>
	</div>

	{#if how.length > 0}
		<section>
			<h4>{t("Technique")}</h4>
			<ol>{#each how as line (line)}<li>{line}</li>{/each}</ol>
		</section>
	{/if}
	{#if mistakes.length > 0}
		<section>
			<h4>{t("Common mistakes")}</h4>
			<ul>{#each mistakes as line (line)}<li>{line}</li>{/each}</ul>
		</section>
	{/if}

	{#if history}
		<section>
			<h4>{t("History")}</h4>
			{#if history.sessions.length === 0}
				<p class="bf-muted">{t("This exercise isn't in any workout yet.")}</p>
			{:else}
				<p>
					{t("Done {sessions_length}× since {v}.", { sessions_length: history.sessions.length, v: formatCzechDate(history.sessions[history.sessions.length - 1]!.date, false) })}
					{#if history.best && history.metric}
						{t("Best {v}:", { v: HISTORY_BEST_LABELS[history.metric] })} <strong>{metricValue(history.best.value)}{metricUnit}</strong> ({formatShortDate(history.best.date)}).
					{/if}
				</p>
				{#if history.metric && history.points.length >= 2}
					<LineChart
						dates={history.points.map((p) => p.date)}
						lines={[{ label: HISTORY_METRIC_LABELS[history.metric], color: "var(--interactive-accent)", values: history.points.map((p) => p.value), connect: true, dots: true }]}
						format={metricValue}
						label={`${HISTORY_METRIC_LABELS[history.metric]} – ${exercise.name}`}
					/>
					<p class="bf-muted bf-small">
						{t("{v} Each point is one workout, not one calendar day.", { v: history.metric === "oneRm"
							? t("The highest estimated 1RM of each workout (from working sets). It's a rough estimate – more accurate for sets of up to 10 reps.")
							: t("The best result of each workout (from working sets).") })}
					</p>
				{:else if history.metric}
					<p class="bf-muted bf-small">{t("The chart appears from the second workout with a measurable result.")}</p>
				{/if}
				<ul class="bf-exercise-history">
					{#each sessions as session (session.date)}
						<li><span class="bf-muted">{formatShortDate(session.date)}</span> {session.text}</li>
					{/each}
				</ul>
				{#if history.sessions.length > VISIBLE_SESSIONS}
					<button type="button" class="bf-link-button bf-small" onclick={() => (showAll = !showAll)}>
						{showAll ? t("Show less") : tn(history.sessions.length, ["Show all {n} workout", "Show all {n} workouts"])}
					</button>
				{/if}
			{/if}
		</section>
	{/if}

	{#each topics as topic (topic.id)}
		<ResearchCard {topic} />
	{/each}

	<p class="bf-muted bf-small">
		{t("The description is a general guide")} <span class="bf-tag">{t("practice")}</span>{t(", not a substitute for a coach. If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.")}
	</p>
	<div class="bf-actions">
		<button type="button" onclick={onOpenNote}>{t("Open exercise note")}</button>
	</div>
</article>

<style>
	.bf-exercise {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
	}

	h3,
	h4,
	p {
		margin: 0;
	}

	.bf-exercise-history {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--size-2-2);
		font-size: var(--font-ui-small);
	}

	.bf-exercise-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--size-4-2);
		margin-top: var(--size-4-1);
	}

	/* Pevné sloupce: panáček má stálou šířku, text se nepřelévá pod něj. */
	.bf-exercise-top {
		display: grid;
		grid-template-columns: minmax(150px, 220px) minmax(0, 1fr);
		gap: var(--size-4-4);
		align-items: start;
	}

	@container (max-width: 420px) {
		.bf-exercise-top {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.bf-exercise-muscles {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	dl {
		margin: 0;
	}

	dt {
		display: flex;
		align-items: center;
		gap: var(--size-4-1);
		color: var(--text-muted);
		font-size: var(--font-ui-small);
	}

	dd {
		margin: 0 0 var(--size-4-2);
	}

	.bf-swatch {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}

	.bf-swatch.is-primary {
		background-color: var(--interactive-accent);
	}

	.bf-swatch.is-secondary {
		background-color: color-mix(in srgb, var(--interactive-accent) 45%, var(--background-modifier-border));
	}

	ol,
	ul {
		margin: var(--size-4-1) 0 0;
		padding-left: var(--size-4-6);
	}

	.bf-small {
		font-size: var(--font-ui-small);
	}
</style>
