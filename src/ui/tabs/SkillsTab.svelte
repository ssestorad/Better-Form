<script lang="ts">
	// Karta Dovednosti (SPEC 5.6): žebříčky kalistenických progresí z knihovny cviků,
	// splněné stupně, nejlepší výkon a další krok.
	import { t } from "../../i18n";
	import { SKILL_BASIS, criterionText, ladderStatus, laddersFrom, type StepStatus } from "../../calc/skills";
	import BasisTag from "../components/BasisTag.svelte";
	import { usePlugin } from "../context";
	import { formatCzechDate, formatSeconds } from "../format";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const criteria = $derived.by(() => {
		void $settingsVersion;
		const th = plugin.settings.thresholds;
		return { sets: th.skillSets, reps: th.skillReps, holdSec: th.skillHoldSec };
	});
	const workouts = $derived.by(() => {
		void $indexVersion;
		return plugin.index.all("workout").map((w) => w.note);
	});
	const ladders = $derived.by(() => {
		void $indexVersion;
		return laddersFrom(plugin.index.all("exercise").map((e) => e.note));
	});
	const statuses = $derived(ladders.map((ladder) => ladderStatus(ladder, workouts, (a, b) => plugin.workouts.isSameExercise(a, b), criteria)));

	let busy = $state(false);
	async function fill() {
		busy = true;
		try {
			await plugin.fillSkillLadders();
		} finally {
			busy = false;
		}
	}

	const bestText = (step: StepStatus) =>
		step.best === null ? t("zatím nezkoušeno") : t("nejlépe {v}", { v: step.unit === "sec" ? formatSeconds(step.best.value) : t("{n} opak.", { n: step.best.value }) });

	/** Krátký název žebříčku bez přípony „– progrese“. */
	const title = (name: string) => name.replace(/\s*[–-]\s*progrese$/i, "");
</script>

<p class="bf-muted bf-small">
	{t("Stupeň je splněný, když v jednom tréninku uděláš {v} (u výdrží {v2}); série s gumou nebo jinou dopomocí se nepočítají. Pořadí stupňů i kritérium jsou trenérská zvyklost", { v: criterionText("reps", criteria), v2: criterionText("sec", criteria) })} <BasisTag basis={SKILL_BASIS} /> {t("– kritérium změníš v nastavení, stupně v poznámkách cviků (pole")} <code>{t("progression")}</code>).
</p>

{#if statuses.length === 0}
	<section class="bf-card">
		<p class="bf-muted">{t("V knihovně cviků zatím nejsou žádné žebříčky.")}</p>
		<div class="bf-actions">
			<button type="button" class="mod-cta" disabled={busy} onclick={() => void fill()}>{t("Doplnit žebříčky do knihovny")}</button>
		</div>
		<p class="bf-muted bf-small">{t("Přidá chybějící cviky a k vestavěným cvikům zapíše žebříček a stupeň. Tvoje úpravy cviků se nepřepíšou.")}</p>
	</section>
{/if}

{#each statuses as status (status.ladder.name)}
	<section class="bf-card">
		<header class="bf-sk-head">
			<h4>{title(status.ladder.name)}</h4>
			<span class="bf-tag" class:bf-tag-done={status.next === null}>{t("stupeň {level} z {steps_length}", { level: status.level, steps_length: status.steps.length })}</span>
		</header>
		<div class="bf-sk-bar" role="img" aria-label={t("Splněno {filter_length} z {steps_length} stupňů", { filter_length: status.steps.filter((s) => s.achieved).length, steps_length: status.steps.length })}>
			{#each status.steps as step (step.exercise)}
				<span class="bf-sk-seg" class:is-done={step.achieved !== null} class:is-next={status.next?.exercise === step.exercise}></span>
			{/each}
		</div>
		<ol class="bf-sk-steps">
			{#each status.steps as step (step.exercise)}
				<li class="bf-sk-step" class:is-next={status.next?.exercise === step.exercise}>
					<span class="bf-sk-level">{step.level}</span>
					<button type="button" class="bf-link-button bf-sk-name" onclick={() => plugin.openLibrary({ exercise: step.exercise })}>{step.exercise}</button>
					<span class="bf-sk-state bf-muted">
						{#if step.achieved}
							<span class="bf-sk-ok">{t("splněno {v}", { v: formatCzechDate(step.achieved, false) })}</span> · {bestText(step)}
						{:else}
							{bestText(step)}{step.best ? t(" · {bestSets} z {sets} sérií", { bestSets: step.bestSets, sets: criteria.sets }) : ""}
						{/if}
					</span>
				</li>
			{/each}
		</ol>
		<p class="bf-small">
			{#if status.next}
				<strong>{t("Další krok:")}</strong>
				{status.next.exercise} – {criterionText(status.next.unit, criteria)}.
			{:else}
				<strong>{t("Hotovo")}</strong> {t("– všechny stupně žebříčku máš splněné.")}
			{/if}
		</p>
	</section>
{/each}

{#if statuses.length > 0}
	<div class="bf-actions">
		<button type="button" disabled={busy} onclick={() => void fill()}>{t("Doplnit chybějící žebříčky")}</button>
	</div>
{/if}

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-sk-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--size-4-2);
	}

	.bf-sk-bar {
		display: flex;
		gap: 3px;
	}

	.bf-sk-seg {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background-color: var(--background-modifier-border);
	}

	.bf-sk-seg.is-done {
		background-color: var(--interactive-accent);
	}

	.bf-sk-seg.is-next {
		background-color: color-mix(in srgb, var(--interactive-accent) 40%, var(--background-modifier-border));
	}

	.bf-sk-steps {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.bf-sk-step {
		display: grid;
		grid-template-columns: 1.5em minmax(0, 1fr) minmax(0, 1.3fr);
		gap: var(--size-4-2);
		align-items: baseline;
		padding: var(--size-4-1) var(--size-4-1);
		border-top: 1px solid var(--background-modifier-border);
		font-size: var(--font-ui-small);
	}

	.bf-sk-step:first-child {
		border-top: none;
	}

	.bf-sk-step.is-next {
		background-color: var(--background-secondary);
	}

	.bf-sk-level {
		color: var(--text-faint);
		font-variant-numeric: tabular-nums;
	}

	.bf-sk-name {
		text-align: left;
		white-space: normal;
	}

	.bf-sk-state {
		font-size: var(--font-ui-smaller);
		text-align: right;
	}

	.bf-sk-ok {
		color: var(--text-success);
	}
</style>
