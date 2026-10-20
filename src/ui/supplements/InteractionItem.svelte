<script lang="ts">
	// Řádek interakce s lékem nebo nevhodné kombinace: co s čím, co zjistily studie, co dělat, zdroje.
	import { t } from "../../i18n";
	import type { SourceId } from "../../evidence/sources";
	import SourceLinks from "../components/SourceLinks.svelte";

	interface Props {
		title: string;
		finding: string;
		advice: string;
		sources: readonly SourceId[];
		/** Nekombinovat vůbec. */
		avoid?: boolean;
		/** Týká se léku, který uživatel bere. */
		mine?: boolean;
	}
	let { title, finding, advice, sources, avoid = false, mine = false }: Props = $props();
</script>

<li class:is-mine={mine}>
	<strong>{title}</strong>
	{#if avoid}<span class="bf-tag bf-tag-warn">{t("don't combine")}</span>{/if}
	{#if mine}<span class="bf-tag bf-tag-warn">{t("you take it")}</span>{/if}
	<div>{finding}</div>
	<div><span class="bf-muted">{t("In practice:")}</span> {advice}</div>
	<SourceLinks ids={sources} />
</li>

<style>
	li {
		padding-left: var(--size-4-2);
	}

	/* Lék, který uživatel bere: barevný proužek vlevo, rozměry se nemění. */
	li.is-mine {
		box-shadow: inset 3px 0 0 var(--text-error);
	}
</style>
