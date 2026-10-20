<script lang="ts">
	// Krátké odkazy na zdroje („Campbell 1992, Singh 2000“); celá citace v bublině.
	import { getSource, type SourceId } from "../../evidence/sources";

	interface Props {
		ids: readonly SourceId[];
	}
	let { ids }: Props = $props();

	const sources = $derived(ids.map(getSource));
</script>

<div class="bf-muted bf-source-links">
	{#each sources as source, i (i)}{i > 0 ? ", " : ""}{#if source.url}<a href={source.url} target="_blank" rel="noopener" title={source.citation}>{source.short}</a>{:else}<span title={source.citation}>{source.short}</span>{/if}{/each}
</div>

<style>
	.bf-source-links {
		font-size: var(--font-ui-smaller);
	}
</style>
