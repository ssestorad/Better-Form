<script lang="ts">
	import type { ModuleKey } from "../settings/modules";
	import { t } from "../i18n";
	import type { Writable } from "svelte/store";
	import { icon, tooltip } from "./actions";
	import { usePlugin } from "./context";
	import { TABS, type TabId } from "./tabs";
	import { Platform } from "obsidian";
	import { describeError, recentErrors } from "./errorLog";
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
	// Karty vypnutých modulů se neukazují (nastavení → Moduly). Karta Tělo zůstává kvůli záznamu bolesti.
	const TAB_MODULE: Partial<Record<TabId, ModuleKey>> = { nutrition: "nutrition", supplements: "supplements", skills: "skills", goals: "goals", programs: "programs" };
	const visible = $derived.by(() => {
		void $settingsVersion;
		return TABS.filter((x) => (basic ? x.id === "basic" || x.id === "settings" : x.id !== "basic" && (TAB_MODULE[x.id] === undefined || plugin.moduleOn(TAB_MODULE[x.id]!))));
	});
	const active = $derived(visible.find((x) => x.id === $tab) ?? visible[0]!);

	/** Text chyby pro hlášení: verze pluginu, karta, zařízení, zpráva a začátek výpisu volání. */
	function errorText(error: unknown): string {
		const device = `${Platform.isMobile ? "mobile" : "desktop"} · ${navigator.userAgent}`;
		return [`Better Form ${plugin.manifest.version} · ${active.id}`, device, describeError(error)].join("\n");
	}

	// Karta, která zůstala prázdná bez zachycené chyby (např. chyba mimo vykreslování):
	// po chvíli se ukáže rámeček s posledními chybami, ať je co poslat autorovi.
	let content: HTMLDivElement | undefined = $state();
	let emptyReport = $state("");
	$effect(() => {
		const id = active.id;
		emptyReport = "";
		const timer = window.setTimeout(() => {
			if (content && content.childElementCount === 0) {
				const errors = recentErrors();
				emptyReport = `${errorText(errors.length > 0 ? errors.join("\n\n") : "no error recorded")}\nempty tab: ${id}`;
			}
		}, 1500);
		return () => window.clearTimeout(timer);
	});
	let copied = $state(false);
	function copy(text: string) {
		void navigator.clipboard.writeText(text).then(() => (copied = true));
	}
</script>

<div class="bf-app">
	<nav class="bf-tabbar" aria-label={t("Better Form tabs")} style:grid-template-columns={`repeat(${visible.length}, minmax(0, 1fr))`}>
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

	<!-- Knihovna cviků je potřeba odkudkoli – tlačítko vedle nadpisu na každé kartě. -->
	<div class="bf-tab-head">
		<h3 class="bf-tab-title">{active.label}</h3>
		<button type="button" class="bf-library-button" onclick={() => plugin.openLibrary({})}>
			<span class="bf-library-icon" use:icon={"book-open"}></span>
			{t("Exercise library")}
		</button>
	</div>

	{#if emptyReport}
		<div class="bf-card bf-tab-error" role="alert">
			<strong>{t("This tab couldn't be displayed.")}</strong>
			<p class="bf-small">{t("Please send this text to the plugin's author:")}</p>
			<pre class="bf-small">{emptyReport}</pre>
			<button type="button" onclick={() => copy(emptyReport)}>{copied ? t("Copied") : t("Copy")}</button>
		</div>
	{/if}

	<div class="bf-tab-content" bind:this={content}>
		<!-- Chyba při vykreslení karty se ukáže místo prázdné plochy (na telefonu není vidět konzole). -->
		{#key active.id}
			<svelte:boundary onerror={(error) => console.error("Better Form:", error)}>
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
				{#snippet failed(error, reset)}
					<div class="bf-card bf-tab-error" role="alert">
						<strong>{t("This tab couldn't be displayed.")}</strong>
						<p class="bf-small">{t("Please send this text to the plugin's author:")}</p>
						<pre class="bf-small">{errorText(error)}</pre>
						<button type="button" onclick={reset}>{t("Try again")}</button>
						<button type="button" onclick={() => copy(errorText(error))}>{copied ? t("Copied") : t("Copy")}</button>
					</div>
				{/snippet}
			</svelte:boundary>
		{/key}
	</div>
</div>

<style>
	.bf-tab-error pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		user-select: text;
	}

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

	.bf-tab-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-tab-title {
		margin: 0;
		min-width: 0;
	}

	.bf-library-button {
		flex: none;
		gap: var(--size-4-1);
	}

	.bf-library-icon {
		display: inline-flex;
	}
</style>
