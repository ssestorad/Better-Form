<script lang="ts">
	// Doporučení na dnešek (SPEC kap. 10): nejvýš tři hlavní, zbytek rozbalitelný.
	// U každého důvody, zdroj a štítek úrovně důkazu.
	import { t } from "../../i18n";
	import { getSource } from "../../evidence/sources";
	import { EVIDENCE_LABELS } from "../../model/constants";
	import { MAX_MAIN_RECOMMENDATIONS } from "../../rules/engine";
	import type { Recommendation, RecommendationLevel } from "../../rules/types";
	import { icon } from "../actions";
	import { usePlugin } from "../context";

	interface Props {
		recommendations: Recommendation[];
	}
	let { recommendations }: Props = $props();

	const plugin = usePlugin();

	const ICONS: Record<RecommendationLevel, string> = { warn: "alert-triangle", suggest: "lightbulb", info: "info" };
	const LEVEL_LABELS: Record<RecommendationLevel, string> = { warn: t("Warning"), suggest: t("Suggestion"), info: t("Info") };

	const main = $derived(recommendations.slice(0, MAX_MAIN_RECOMMENDATIONS));
	const rest = $derived(recommendations.slice(MAX_MAIN_RECOMMENDATIONS));

	function act(rec: Recommendation) {
		if (!rec.action) return;
		if (rec.action.target === "check-in") plugin.openCheckIn();
		else if (rec.action.move) void plugin.movePlanItem(rec.action.move);
		else plugin.showTab(rec.action.target);
	}

	/** Krátké názvy zdrojů; samotná „trenérská praxe“ se neopakuje vedle štítku. */
	const sourceNames = (rec: Recommendation) =>
		rec.sourceIds
			.filter((id) => id !== "practice")
			.map((id) => getSource(id).short)
			.join(", ");
	const citations = (rec: Recommendation) => rec.sourceIds.map((id) => getSource(id).citation).join("\n");
</script>

{#snippet card(rec: Recommendation)}
	<article class={`bf-rec is-${rec.level}`}>
		<header class="bf-rec-head">
			<span class="bf-rec-icon" use:icon={ICONS[rec.level]} aria-label={LEVEL_LABELS[rec.level]}></span>
			<strong>{rec.title}</strong>
		</header>
		<p>{rec.text}</p>
		<ul class="bf-rec-reasons">
			{#each rec.reasons as reason, i (i)}
				<li>{reason}</li>
			{/each}
		</ul>
		<footer class="bf-rec-foot">
			<span class="bf-muted bf-rec-source" title={citations(rec)}>
				{sourceNames(rec)}{sourceNames(rec) ? " · " : ""}<span class="bf-tag">{EVIDENCE_LABELS[rec.evidence]}</span>
			</span>
			{#if rec.action}
				<button type="button" class="bf-link-button" onclick={() => act(rec)}>{rec.action.label}</button>
			{/if}
		</footer>
	</article>
{/snippet}

<section class="bf-card">
	<h4>{t("Recommendations for today")}</h4>
	{#if recommendations.length === 0}
		<p class="bf-muted">{t("Nothing special – train as planned. Recommendations appear once there's something to calculate from (check-in, workouts with RPE, HRV).")}</p>
	{/if}
	{#each main as rec (rec.ruleId)}
		{@render card(rec)}
	{/each}
	{#if rest.length > 0}
		<details class="bf-rec-more">
			<summary>{t("More recommendations ({rest_length})", { rest_length: rest.length })}</summary>
			<div class="bf-rec-rest">
				{#each rest as rec (rec.ruleId)}
					{@render card(rec)}
				{/each}
			</div>
		</details>
	{/if}
	<p class="bf-muted bf-rec-note">{t("Recommendations are indicative and don't replace a coach, physiotherapist or doctor.")}</p>
</section>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-rec {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-1);
		padding: var(--size-4-2);
		border: 1px solid var(--background-modifier-border);
		border-left-width: 3px;
		border-radius: var(--radius-s);
		font-size: var(--font-ui-small);
	}

	.bf-rec.is-warn {
		border-left-color: var(--color-red);
	}

	.bf-rec.is-suggest {
		border-left-color: var(--color-orange);
	}

	.bf-rec.is-info {
		border-left-color: var(--interactive-accent);
	}

	.bf-rec-head {
		display: flex;
		align-items: center;
		gap: var(--size-4-2);
	}

	.bf-rec-icon {
		display: flex;
		flex-shrink: 0;
		color: var(--text-muted);
	}

	.is-warn .bf-rec-icon {
		color: var(--color-red);
	}

	.is-suggest .bf-rec-icon {
		color: var(--color-orange);
	}

	.bf-rec-reasons {
		margin: 0;
		padding-left: var(--size-4-5);
		color: var(--text-muted);
	}

	.bf-rec-foot {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-rec-source,
	.bf-rec-note {
		font-size: var(--font-ui-smaller);
	}

	.bf-rec-more > summary {
		cursor: pointer;
		font-size: var(--font-ui-small);
	}

	.bf-rec-rest {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		margin-top: var(--size-4-2);
	}
</style>
