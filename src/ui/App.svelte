<script lang="ts">
	import { t } from "../i18n";
	import type { Writable } from "svelte/store";
	import { icon, tooltip } from "./actions";
	import { usePlugin } from "./context";
	import { TABS, type TabId } from "./tabs";
	import BasicTab from "./tabs/BasicTab.svelte";
	import BodyTab from "./tabs/BodyTab.svelte";
	import GoalsTab from "./tabs/GoalsTab.svelte";
	import LogTab from "./tabs/LogTab.svelte";
	import NutritionTab from "./tabs/NutritionTab.svelte";
	import OverviewTab from "./tabs/OverviewTab.svelte";
	import PlanTab from "./tabs/PlanTab.svelte";
	import ProgramsTab from "./tabs/ProgramsTab.svelte";
	import SettingsTab from "./tabs/SettingsTab.svelte";
	import SkillsTab from "./tabs/SkillsTab.svelte";
	import SupplementsTab from "./tabs/SupplementsTab.svelte";
	import TodayTab from "./tabs/TodayTab.svelte";

	interface Props {
		tab: Writable<TabId>;
	}
	let { tab }: Props = $props();

	const plugin = usePlugin();
	const settingsVersion = plugin.settingsVersion;

	// Režim Základ ukazuje jen své karty; plný režim všechny ostatní (SPEC 5.11).
	const basic = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.mode === "basic";
	});
	const visible = $derived(TABS.filter((x) => (basic ? x.id === "basic" || x.id === "settings" : x.id !== "basic")));
	const active = $derived(visible.find((x) => x.id === $tab) ?? visible[0]!);
</script>

<div class="bf-app">
	<nav class="bf-tabbar" aria-label={t("Karty Better Form")} style:grid-template-columns={`repeat(${visible.length}, minmax(0, 1fr))`}>
		{#each visible as x (x.id)}
			<button
				type="button"
				class="bf-tab clickable-icon"
				class:is-active={x.id === active.id}
				aria-label={x.label}
				aria-current={x.id === active.id ? "page" : undefined}
				use:tooltip={x.label}
				onclick={() => tab.set(x.id)}
			>
				<span class="bf-tab-icon" use:icon={x.icon}></span>
			</button>
		{/each}
	</nav>

	<h3 class="bf-tab-title">{active.label}</h3>

	<div class="bf-tab-content">
		{#if active.id === "basic"}
			<BasicTab />
		{:else if active.id === "today"}
			<TodayTab />
		{:else if active.id === "log"}
			<LogTab />
		{:else if active.id === "plan"}
			<PlanTab />
		{:else if active.id === "overview"}
			<OverviewTab />
		{:else if active.id === "programs"}
			<ProgramsTab />
		{:else if active.id === "body"}
			<BodyTab />
		{:else if active.id === "skills"}
			<SkillsTab />
		{:else if active.id === "goals"}
			<GoalsTab />
		{:else if active.id === "supplements"}
			<SupplementsTab />
		{:else if active.id === "nutrition"}
			<NutritionTab />
		{:else if active.id === "settings"}
			<SettingsTab />
		{/if}
	</div>
</div>

<style>
	.bf-app {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	/* Pevná mřížka ikon: v úzkém panelu se nic nezalamuje ani neposouvá. */
	.bf-tabbar {
		display: grid;
		grid-template-columns: repeat(9, minmax(0, 1fr));
		gap: 2px;
		padding-bottom: var(--size-4-2);
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.bf-tab {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 32px;
		padding: 0;
		border-radius: var(--radius-s);
	}

	/* Aktivní karta jen barvou pozadí – bez změny rozměrů. */
	.bf-tab.is-active {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.bf-tab-icon {
		display: flex;
	}

	.bf-tab-title {
		margin: 0;
	}
</style>
