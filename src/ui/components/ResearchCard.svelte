<script lang="ts">
	// „Co říká výzkum“: shrnutí, praktické doporučení a studie s typem (rozbalovací).
	import { t } from "../../i18n";
	import { STUDY_KIND_LABELS, getSource } from "../../evidence/sources";
	import { EVIDENCE_LABELS } from "../../model/constants";
	import type { ResearchTopic } from "../../seed/research";

	interface Props {
		topic: ResearchTopic;
	}
	let { topic }: Props = $props();

	const studies = $derived(topic.studies.map((s) => ({ ...getSource(s.source), finding: s.finding })));
	const hasEmg = $derived(studies.some((s) => s.kind === "biomech"));
</script>

<details class="bf-research">
	<summary>
		{t("What the research says: {title}", { title: topic.title })} <span class="bf-tag">{EVIDENCE_LABELS[topic.evidence]}</span>
	</summary>
	<p>{topic.summary}</p>
	<p><strong>{t("In practice:")}</strong> {topic.practical}</p>
	<ul class="bf-research-studies">
		{#each studies as study, i (i)}
			<li>
				<div>
					<strong>{study.short}</strong>
					{#if study.kind}<span class="bf-tag">{STUDY_KIND_LABELS[study.kind]}</span>{/if}
				</div>
				<div>{study.finding}</div>
				<div class="bf-muted bf-research-citation">
					{#if study.url}<a href={study.url} target="_blank" rel="noopener">{study.citation}</a>{:else}{study.citation}{/if}
				</div>
			</li>
		{/each}
	</ul>
	{#if hasEmg}
		<p class="bf-muted bf-research-citation">{t("EMG measures muscle activation, not growth – for conclusions about hypertrophy it's the weakest type of evidence.")}</p>
	{/if}
</details>

<style>
	.bf-research {
		font-size: var(--font-ui-small);
	}

	.bf-research > summary {
		cursor: pointer;
		color: var(--text-muted);
	}

	.bf-research p {
		margin: var(--size-4-2) 0 0;
	}

	.bf-research-studies {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		margin: var(--size-4-2) 0 0;
		padding: 0;
		list-style: none;
	}

	.bf-research-studies li {
		padding-left: var(--size-4-2);
		border-left: 2px solid var(--background-modifier-border);
	}

	.bf-research-citation {
		font-size: var(--font-ui-smaller);
	}
</style>
