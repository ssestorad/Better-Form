<script lang="ts">
	// Detail cviku: panáček se zapojenými partiemi, popis, provedení, časté chyby.
	import { t } from "../../i18n";
	import { HISTORY_BEST_LABELS, HISTORY_METRIC_LABELS, type ExerciseHistory } from "../../calc/exerciseHistory";
	import { MUSCLE_LABELS } from "../../model/constants";
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
	const topics = $derived(topicsForExercise(exercise.name, exercise.category));
</script>

<article class="bf-exercise">
	<header>
		<h3>{exercise.name}</h3>
		<div class="bf-exercise-meta">
			<span class="bf-tag">{CATEGORY_LABELS[exercise.category]}</span>
			{#if exercise.aliases.length > 0}<span class="bf-muted">{t("také: {v}", { v: exercise.aliases.join(", ") })}</span>{/if}
		</div>
	</header>

	<div class="bf-exercise-top">
		<div class="bf-exercise-figure">
			<MuscleFigure primary={exercise.muscles.primary} secondary={exercise.muscles.secondary} label={t("Svalové partie cviku {exercise_name}", { exercise_name: exercise.name })} />
		</div>
		<div class="bf-exercise-muscles">
			{#if exercise.description}<p>{exercise.description}</p>{/if}
			<dl>
				{#if primary}
					<dt><span class="bf-swatch is-primary"></span>{t("Hlavní partie")}</dt>
					<dd>{primary}</dd>
				{/if}
				{#if secondary}
					<dt><span class="bf-swatch is-secondary"></span>{t("Vedlejší partie")}</dt>
					<dd>{secondary}</dd>
				{/if}
				{#if primary === "" && secondary === ""}
					<dd class="bf-muted">{t("Partie nejsou vyplněné – doplň je v poznámce cviku (muscles).")}</dd>
				{/if}
			</dl>
			{#if exercise.bodyweight_fraction !== undefined}
				<p class="bf-muted bf-small">
					{t("Zvedáš zhruba {v} % své hmotnosti", { v: formatNumber(exercise.bodyweight_fraction * 100, 0) })}
					<span class="bf-tag" title={exercise.bodyweight_fraction_source === "ebben2011" ? t("Ebben a kol. 2011") : t("Orientační odhad")}>
						{exercise.bodyweight_fraction_source ? t("výzkum") : t("praxe")}
					</span>
				</p>
			{/if}
			{#if last}<p class="bf-muted bf-small">{t("Naposledy {last}", { last })}</p>{/if}
		</div>
	</div>

	{#if how.length > 0}
		<section>
			<h4>{t("Provedení")}</h4>
			<ol>{#each how as line (line)}<li>{line}</li>{/each}</ol>
		</section>
	{/if}
	{#if mistakes.length > 0}
		<section>
			<h4>{t("Časté chyby")}</h4>
			<ul>{#each mistakes as line (line)}<li>{line}</li>{/each}</ul>
		</section>
	{/if}

	{#if history}
		<section>
			<h4>{t("Historie")}</h4>
			{#if history.sessions.length === 0}
				<p class="bf-muted">{t("Tenhle cvik zatím v žádném tréninku není.")}</p>
			{:else}
				<p>
					{t("Cvičeno {sessions_length}× od {v}.", { sessions_length: history.sessions.length, v: formatCzechDate(history.sessions[history.sessions.length - 1]!.date, false) })}
					{#if history.best && history.metric}
						{t("Nejlepší {v}:", { v: HISTORY_BEST_LABELS[history.metric] })} <strong>{metricValue(history.best.value)}{metricUnit}</strong> ({formatShortDate(history.best.date)}).
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
						{t("{v} Každý bod je jeden trénink, ne jeden den v kalendáři.", { v: history.metric === "oneRm"
							? t("Nejvyšší odhad 1RM každého tréninku (z pracovních sérií). Odhad je orientační – přesnější je u sérií do 10 opakování.")
							: t("Nejlepší výkon každého tréninku (z pracovních sérií).") })}
					</p>
				{:else if history.metric}
					<p class="bf-muted bf-small">{t("Graf se ukáže od druhého tréninku s měřitelným výkonem.")}</p>
				{/if}
				<ul class="bf-exercise-history">
					{#each sessions as session (session.date)}
						<li><span class="bf-muted">{formatShortDate(session.date)}</span> {session.text}</li>
					{/each}
				</ul>
				{#if history.sessions.length > VISIBLE_SESSIONS}
					<button type="button" class="bf-link-button bf-small" onclick={() => (showAll = !showAll)}>
						{showAll ? t("Zobrazit méně") : t("Zobrazit všech {sessions_length} tréninků", { sessions_length: history.sessions.length })}
					</button>
				{/if}
			{/if}
		</section>
	{/if}

	{#each topics as topic (topic.id)}
		<ResearchCard {topic} />
	{/each}

	<p class="bf-muted bf-small">
		{t("Popis je obecný návod")} <span class="bf-tag">{t("praxe")}</span>{t(", ne náhrada trenéra. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.")}
	</p>
	<div class="bf-actions">
		<button type="button" onclick={onOpenNote}>{t("Otevřít poznámku cviku")}</button>
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
