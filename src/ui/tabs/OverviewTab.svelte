<script lang="ts">
	// Karta Přehled (SPEC 5.4): čísla za období, heatmapa, série a odznaky, grafy,
	// rekordy s odhadem závodu a běh (zóny, rozložení intenzit, boty).
	import { t } from "../../i18n";
	import { dailyLoads } from "../../calc/load";
	import { toIsoDate } from "../../model/dates";
	import { usePlugin } from "../context";
	import ChartsSection from "../overview/ChartsSection.svelte";
	import HeatmapCard from "../overview/HeatmapCard.svelte";
	import NumbersCard from "../overview/NumbersCard.svelte";
	import RecordsSection from "../overview/RecordsSection.svelte";
	import RunSection from "../overview/RunSection.svelte";
	import StreaksCard from "../overview/StreaksCard.svelte";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const VIEWS = [
		{ id: "summary", label: t("Summary") },
		{ id: "charts", label: t("Charts") },
		{ id: "records", label: t("Records") },
		{ id: "run", label: t("Run") },
	] as const;
	type ViewId = (typeof VIEWS)[number]["id"];
	let view = $state<ViewId>("summary");

	const today = $derived.by(() => {
		void $indexVersion;
		return toIsoDate(new Date());
	});
	const workouts = $derived.by(() => {
		void $indexVersion;
		return plugin.index.all("workout").map((w) => w.note);
	});
	const sessions = $derived.by(() => {
		void $indexVersion;
		return plugin.sessionWorkouts();
	});
	const days = $derived.by(() => {
		void $indexVersion;
		return plugin.index.all("day").map((d) => d.note);
	});
	const tests = $derived.by(() => {
		void $indexVersion;
		return plugin.index.all("test").map((x) => x.note);
	});
	const ctx = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		return plugin.statsContext();
	});
	const thresholds = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.thresholds;
	});
	const byDate = $derived(dailyLoads(workouts).byDate);
	const workoutDates = $derived(new Set(workouts.map((w) => w.date)));
</script>

<div class="bf-seg" role="tablist" aria-label={t("Overview sections")}>
	{#each VIEWS as v (v.id)}
		<button type="button" role="tab" aria-selected={view === v.id} class:is-active={view === v.id} onclick={() => (view = v.id)}>{v.label}</button>
	{/each}
</div>

{#if view === "summary"}
	<NumbersCard {workouts} {ctx} {today} />
	<HeatmapCard {byDate} {workoutDates} {today} />
	<StreaksCard {workouts} {sessions} {today} />
{:else if view === "charts"}
	<ChartsSection {workouts} {days} {byDate} {ctx} {thresholds} {today} />
{:else if view === "records"}
	<RecordsSection {workouts} {tests} {ctx} />
{:else}
	<RunSection />
{/if}
