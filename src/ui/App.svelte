<script lang="ts">
	import { t } from "../i18n";
	import type { Writable } from "svelte/store";
	import { icon, tooltip } from "./actions";
	import { usePlugin } from "./context";
	import { TABS, resolveView, screenOf, sectionOf, sectionTarget, visibleSections, type SectionId, type TabId, type ViewAvailability } from "./tabs";
	import { Platform } from "obsidian";
	import { describeError, recentErrors } from "./errorLog";
	import BasicTab from "./tabs/BasicTab.svelte";
	import BodyTab from "./tabs/BodyTab.svelte";
	import ExercisesTab from "./tabs/ExercisesTab.svelte";
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

	// Režim Základ ukazuje jen své karty, plný režim šest sekcí (SPEC 5.11). Pohledy vypnutých modulů
	// se neukazují (nastavení → Moduly).
	const availability = $derived.by((): ViewAvailability => {
		void $settingsVersion;
		return { basic: plugin.settings.mode === "basic", cycleOn: plugin.cycleOn(), moduleOn: (key) => plugin.moduleOn(key) };
	});
	const sections = $derived(visibleSections(availability));
	const active = $derived(resolveView($tab, availability));
	const activeSection = $derived(sections.find((s) => s.id === sectionOf(active)));
	const labelOf = (view: TabId) => TABS.find((x) => x.id === view)!.label;
	const basicTab = $derived(TABS.find((x) => x.id === "basic")!);

	// Sekce si během otevřeného panelu pamatuje poslední podsekci.
	const lastViews = new Map<SectionId, TabId>();
	let lastMain: TabId = "today";
	$effect(() => {
		const section = sectionOf(active);
		if (section === null) return;
		lastViews.set(section, active);
		lastMain = active;
	});
	function toggleSettings() {
		tab.set(active === "settings" ? (availability.basic ? "basic" : lastMain) : "settings");
	}

	/** Text chyby pro hlášení: verze pluginu, karta, zařízení, zpráva a začátek výpisu volání. */
	function errorText(error: unknown): string {
		const device = `${Platform.isMobile ? "mobile" : "desktop"} · ${navigator.userAgent}`;
		return [`Better Form ${plugin.manifest.version} · ${active}`, device, describeError(error)].join("\n");
	}

	// Karta, která zůstala prázdná bez zachycené chyby (např. chyba mimo vykreslování):
	// po chvíli se ukáže rámeček s posledními chybami, ať je co poslat autorovi.
	let content: HTMLDivElement | undefined = $state();
	let emptyReport = $state("");
	$effect(() => {
		const id = active;
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
	<nav class="bf-tabbar" aria-label={t("Better Form tabs")} style:grid-template-columns={`repeat(${Math.max(sections.length, 1)}, minmax(0, 1fr))`}>
		{#if availability.basic}
			<button type="button" class="bf-tab clickable-icon" class:is-active={active === "basic"} aria-current={active === "basic" ? "page" : undefined} onclick={() => tab.set("basic")}>
				<span class="bf-tab-icon" use:icon={basicTab.icon}></span>
				<span class="bf-tab-label">{basicTab.label}</span>
			</button>
		{/if}
		{#each sections as s (s.id)}
			<button
				type="button"
				class="bf-tab clickable-icon"
				class:is-active={s.id === activeSection?.id}
				aria-current={s.id === activeSection?.id ? "page" : undefined}
				onclick={() => tab.set(sectionTarget(s, lastViews.get(s.id)))}
			>
				<span class="bf-tab-icon" use:icon={s.icon}></span>
				<span class="bf-tab-label">{s.label}</span>
			</button>
		{/each}
	</nav>

	<div class="bf-tab-head">
		<h3 class="bf-tab-title">{activeSection?.label ?? labelOf(active)}</h3>
		<span class="bf-tab-tools">
			{#if availability.basic}
				<button type="button" class="bf-gear clickable-icon" aria-label={t("Exercise library")} use:tooltip={t("Exercise library")} onclick={() => plugin.openLibrary({})}>
					<span class="bf-tab-icon" use:icon={"book-open"}></span>
				</button>
			{/if}
			<button type="button" class="bf-gear clickable-icon" class:is-active={active === "settings"} aria-label={t("Settings")} aria-pressed={active === "settings"} use:tooltip={t("Settings")} onclick={toggleSettings}>
				<span class="bf-tab-icon" use:icon={"settings"}></span>
			</button>
		</span>
	</div>

	{#if activeSection && activeSection.views.length > 1}
		<div class="bf-seg bf-subnav" role="tablist" aria-label={t("Section views")}>
			{#each activeSection.views as view (view)}
				<button type="button" role="tab" aria-selected={view === active} class:is-active={view === active} onclick={() => tab.set(view)}>{labelOf(view)}</button>
			{/each}
		</div>
	{/if}

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
		{#key screenOf(active)}
			<svelte:boundary onerror={(error) => console.error("Better Form:", error)}>
				{#if active === "basic"}
					<BasicTab />
				{:else if active === "today"}
					<TodayTab />
				{:else if active === "log" || active === "history"}
					<LogTab view={active} />
				{:else if active === "exercises"}
					<ExercisesTab />
				{:else if active === "plan"}
					<PlanTab />
				{:else if active === "overview" || active === "charts" || active === "records" || active === "run"}
					<OverviewTab view={active} />
				{:else if active === "programs"}
					<ProgramsTab />
				{:else if active === "body" || active === "measurements" || active === "pain" || active === "cycle"}
					<BodyTab view={active} />
				{:else if active === "skills"}
					<SkillsTab />
				{:else if active === "goals"}
					<GoalsTab />
				{:else if active === "supplements" || active === "supplement-library" || active === "supplement-charts"}
					<SupplementsTab view={active} />
				{:else if active === "nutrition"}
					<NutritionTab />
				{:else if active === "settings"}
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

	/* Pevná mřížka sekcí: v úzkém panelu se nic nezalamuje ani neposouvá. */
	.bf-tabbar {
		display: grid;
		gap: 2px;
		padding-bottom: var(--size-4-2);
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.bf-tabbar .bf-tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		width: auto;
		min-width: 0;
		height: 48px;
		padding: 0;
		border-radius: var(--radius-s);
	}

	.bf-tab-label {
		font-size: 11px;
		line-height: 1.1;
		white-space: nowrap;
	}

	/* Aktivní volba jen barvou pozadí – bez změny rozměrů. */
	.bf-tabbar .bf-tab.is-active,
	.bf-tab-tools .bf-gear.is-active {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.bf-tab-tools {
		display: flex;
		flex: none;
		align-items: center;
		gap: var(--size-4-1);
	}

	.bf-tab-tools .bf-gear {
		width: 32px;
		height: 32px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-s);
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

</style>
