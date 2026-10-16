<script lang="ts">
	// Rozbalovací podrobnosti programu: rozpis po týdnech a popis z poznámky.
	import { t } from "../../i18n";
	import { programOverview } from "../../calc/programText";
	import type { ProgramEntry } from "../../data/ProgramService";
	import { getSource, isSourceId } from "../../evidence/sources";
	import { topicsForProgram } from "../../seed/research";
	import { markdown } from "../actions";
	import ResearchCard from "../components/ResearchCard.svelte";
	import { usePlugin } from "../context";

	interface Props {
		entry: ProgramEntry;
	}
	let { entry }: Props = $props();

	const plugin = usePlugin();

	let open = $state(false);
	let body = $state<string | null>(null);

	const overview = $derived(open ? programOverview(entry.note) : []);
	const sources = $derived((entry.note.sources ?? []).filter(isSourceId).map(getSource));
	const topics = $derived(topicsForProgram(entry.note.name));

	async function toggle(event: Event) {
		open = (event.currentTarget as HTMLDetailsElement).open;
		if (open && body === null) {
			try {
				body = await plugin.programs.body(entry);
			} catch {
				body = "";
			}
		}
	}

	function weekLabel(from: number, to: number): string {
		if (entry.note.duration_weeks === undefined && overview.length === 1) return t("Every week");
		return from === to ? t("Week {from}", { from }) : t("Weeks {from}–{to}", { from, to });
	}
</script>

<details class="bf-program-details" ontoggle={toggle}>
	<summary>{t("Details")}</summary>
	{#if open}
		{#if overview.length > 0 && entry.note.items.length > 0}
			<div class="bf-overview">
				<div class="bf-overview-title">{t("Schedule")}</div>
				{#each overview as week (week.from)}
					<div class="bf-overview-week">
						<div class="bf-overview-label">{weekLabel(week.from, week.to)}</div>
						<ul>
							{#each week.lines as line (line)}<li>{line}</li>{/each}
						</ul>
					</div>
				{/each}
			</div>
		{/if}
		{#if body === null}
			<p class="bf-muted">{t("Loading description…")}</p>
		{:else if body !== ""}
			<div class="bf-program-body markdown-rendered" use:markdown={{ app: plugin.app, text: body, sourcePath: entry.file.path }}></div>
		{/if}
		{#if sources.length > 0}
			<div class="bf-sources">
				<div class="bf-overview-title">{t("Sources")}</div>
				<ul>
					{#each sources as source (source.short)}
						<li>
							{source.citation}
							{#if source.evidence}<span class="bf-tag">{source.evidence === "research" ? t("research") : source.evidence === "consensus" ? t("consensus") : t("practice")}</span>{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#each topics as topic (topic.id)}
			<ResearchCard {topic} />
		{/each}
	{/if}
</details>

<style>
	.bf-program-details > summary {
		cursor: pointer;
		color: var(--text-muted);
		font-size: var(--font-ui-small);
	}

	.bf-overview,
	.bf-sources {
		margin-top: var(--size-4-2);
		font-size: var(--font-ui-small);
	}

	.bf-overview-title {
		font-weight: var(--font-semibold);
		margin-bottom: var(--size-4-1);
	}

	.bf-overview-week {
		display: grid;
		grid-template-columns: 6.5em minmax(0, 1fr);
		gap: var(--size-4-2);
		padding: var(--size-4-1) 0;
		border-top: 1px solid var(--background-modifier-border);
	}

	.bf-overview-label {
		color: var(--text-muted);
	}

	ul {
		margin: 0;
		padding-left: var(--size-4-4);
	}

	.bf-program-body {
		margin-top: var(--size-4-2);
		font-size: var(--font-ui-small);
	}

	/* Tabulky v popisu se vejdou do úzkého panelu. */
	.bf-program-body :global(table) {
		width: 100%;
		font-size: var(--font-ui-smaller);
	}
</style>
