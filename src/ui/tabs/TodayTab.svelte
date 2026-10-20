<script lang="ts">
	import { t } from "../../i18n";
	import { hasCheckIn, wellnessPoints } from "../../calc/checkIn";
	import { sleepWeek } from "../../calc/sleep";
	import { PLAN_STATUS_LABELS } from "../../calc/weekPlan";
	import { daySummary, workoutDetails, workoutLabel } from "../../data/dayBlock";
	import { planItemDetails, planItemTitle } from "../../data/planBlock";
	import type { PlanEntry } from "../../data/PlanService";
	import { addDays, startOfWeek, toIsoDate } from "../../model/dates";
	import { usePlugin } from "../context";
	import { formatCzechDate, formatDurationMin } from "../format";
	import { nutritionLine } from "../nutrition/text";
	import ProgramCard from "../program/ProgramCard.svelte";
	import StravaCard from "../strava/StravaCard.svelte";
	import CheckInRadar from "../today/CheckInRadar.svelte";
	import ReadinessCard from "../today/ReadinessCard.svelte";
	import RecommendationList from "../today/RecommendationList.svelte";
	import ResearchCard from "../components/ResearchCard.svelte";
	import { researchTopic } from "../../seed/research";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	// $indexVersion v odvozených hodnotách = přepočet při každé změně poznámek.
	const today = $derived.by(() => {
		void $indexVersion;
		return toIsoDate(new Date());
	});
	const day = $derived.by(() => {
		void $indexVersion;
		return plugin.index.day(today)?.note;
	});
	const workouts = $derived.by(() => {
		void $indexVersion;
		return plugin.index
			.workouts()
			.filter((w) => w.note.date === today)
			.reverse();
	});
	// Připravenost a doporučení (SPEC 8.9, kap. 10).
	const insights = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		return plugin.insights.today(today, Date.now());
	});
	// Trend připravenosti za 14 dní (SPEC 8.9).
	const readinessHistory = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		return plugin.insights.readinessHistory(today);
	});
	// Doporučená výživa na dnešek (SPEC 5.1, kap. 11).
	const nutrition = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		const plan = plugin.nutritionPlan(today);
		return plan ? nutritionLine(plan) : null;
	});
	const checkedIn = $derived(hasCheckIn(day));
	const femaleProfile = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.profile.sex === "female";
	});
	const dayNotes = $derived.by(() => {
		void $indexVersion;
		return plugin.index.all("day").map((e) => e.note);
	});
	// Graf pocitů: dnešek proti průměru předchozích 14 dní.
	const wellness = $derived(wellnessPoints(day, dayNotes, today));
	const hasWellness = $derived(wellness.some((p) => p.today !== null));
	// Spánkový dluh za 7 nocí; podrobnosti v Přehledu u grafu spánku.
	const sleep = $derived.by(() => {
		void $settingsVersion;
		return sleepWeek(dayNotes, today, plugin.settings.thresholds.sleepTargetHours * 60);
	});
	const summary = $derived(daySummary(day));
	// Plán týdne (SPEC 5.16): dnešní položky a co je v plánu zítra.
	const planned = $derived.by(() => {
		void $indexVersion;
		const tomorrow = addDays(today, 1);
		const entriesOf = (date: string) => plugin.plans.view(startOfWeek(date), today).days.find((d) => d.date === date)?.entries ?? [];
		// Dnešní programy mají vlastní karty s úkoly hned pod plánem – tady by byly dvakrát.
		return { today: entriesOf(today).filter((e) => !e.program), tomorrow: entriesOf(tomorrow) };
	});
	const itemText = (entry: PlanEntry) => `${entry.program ? `program ${entry.program.name}` : planItemTitle(entry.item)} (${planItemDetails(entry.item, entry.minutes)})`;
	function logPlanned(entry: PlanEntry) {
		const template = entry.item.template ? plugin.index.all("template").find((x) => x.note.name === entry.item.template)?.file : undefined;
		plugin.openWorkout(template ? { date: today, template } : { date: today, plan: entry.item });
	}
	// Aktivní programy, které mají na dnešek nějaký úkol.
	const programs = $derived.by(() => {
		void $indexVersion;
		return plugin.programs.active(today).filter((p) => p.tasks.length > 0);
	});
</script>

<p class="bf-date">{formatCzechDate(today)}</p>

<section class="bf-card">
	<header class="bf-card-header">
		<h4>{t("Morning check-in")}</h4>
		{#if checkedIn}
			<button type="button" onclick={() => plugin.openCheckIn(today)}>{t("Edit")}</button>
		{/if}
	</header>
	{#if checkedIn}
		<dl class="bf-summary">
			{#if summary.sleep}<dt>{t("Sleep")}</dt><dd>{summary.sleep}</dd>{/if}
			{#if sleep.debtMin !== null}<dt>{t("Sleep debt")}</dt><dd>{sleep.debtMin === 0 ? t("no debt") : formatDurationMin(sleep.debtMin)} <span class="bf-muted">{t("({v} of the last 7 nights logged)", { v: sleep.nights })}</span></dd>{/if}
			{#if summary.feelings}<dt>{t("How you feel")}</dt><dd>{summary.feelings}</dd>{/if}
			{#if summary.hrv}<dt>HRV</dt><dd>{summary.hrv}</dd>{/if}
			{#if summary.weight}<dt>{t("Weight")}</dt><dd>{summary.weight}</dd>{/if}
		</dl>
		{#if hasWellness}<CheckInRadar points={wellness} />{/if}
	{:else}
		<p class="bf-muted">{t("Not filled in today yet – it takes under half a minute.")}</p>
		<button type="button" class="mod-cta" onclick={() => plugin.openCheckIn(today)}>{t("Morning check-in")}</button>
	{/if}
</section>

<ReadinessCard readiness={insights.readiness} history={readinessHistory} onCheckIn={() => plugin.openCheckIn(today)} />
<RecommendationList recommendations={insights.recommendations} />
<!-- Menstruační cyklus a trénink – jen u ženského profilu. -->
{#if femaleProfile && researchTopic("menstrual_cycle")}
	<section class="bf-card"><ResearchCard topic={researchTopic("menstrual_cycle")!} /></section>
{/if}

<StravaCard />

<section class="bf-card">
	<header class="bf-card-header">
		<h4>{t("Today's plan")}</h4>
		<button type="button" onclick={() => plugin.showTab("plan")}>{t("Weekly plan")}</button>
	</header>
	{#if planned.today.length === 0}
		<p class="bf-muted">{programs.length > 0 ? t("Apart from the programs below, nothing is planned for today in the weekly plan.") : t("Nothing is planned for today in the weekly plan.")}</p>
	{:else}
		<ul class="bf-list bf-today-plan">
			{#each planned.today as entry (entry.item.id)}
				<li>
					<span>
						<button type="button" class="bf-link-button" title={t("Edit, move or delete")} onclick={() => plugin.openPlanItem({ date: today, item: entry.item })}>
							{planItemTitle(entry.item)}
						</button>
						<span class="bf-muted"> · {planItemDetails(entry.item, entry.minutes)}{entry.item.notes ? ` · ${entry.item.notes}` : ""}</span>
					</span>
					{#if entry.status === "done"}
						<span class="bf-tag bf-tag-done">{PLAN_STATUS_LABELS.done}</span>
					{:else}
						<button type="button" onclick={() => logPlanned(entry)}>{t("Log")}</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	{#if planned.tomorrow.length > 0}
		<p class="bf-muted bf-small">{t("Tomorrow: {v}", { v: planned.tomorrow.map(itemText).join("; ") })}</p>
	{/if}
</section>

{#if programs.length > 0}
	<h4 class="bf-section-title">{t("Programs for today")}</h4>
	{#each programs as item (item.entry.file.path)}
		<ProgramCard today={item} date={today} />
	{/each}
{/if}

<section class="bf-card">
	<header class="bf-card-header">
		<h4>{t("Today's workouts")}</h4>
		<button type="button" class="mod-cta" onclick={() => plugin.openWorkout({ date: today })}>{t("Log workout")}</button>
	</header>
	{#if workouts.length === 0}
		<p class="bf-muted">{t("No workout logged yet.")}</p>
	{:else}
		<ul class="bf-list">
			{#each workouts as w (w.file.path)}
				<li>
					<button type="button" class="bf-link-button" onclick={() => plugin.openWorkout({ file: w.file })}>
						{workoutLabel(w.note)}
					</button>
					{#if w.note.rpe === undefined && !plugin.programs.isCounterWorkout(w.note)}<span class="bf-tag bf-tag-warn">{t("add RPE")}</span>{/if}
					{#if workoutDetails(w.note, false)}<span class="bf-muted"> · {workoutDetails(w.note, false)}</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section class="bf-card">
	<header class="bf-card-header">
		<h4>{t("Nutrition for today")}</h4>
		<button type="button" onclick={() => plugin.showTab("nutrition")}>{t("Calculation breakdown")}</button>
	</header>
	{#if nutrition}
		<p class="bf-nutri-line">{nutrition}</p>
	{:else}
		<p class="bf-muted">{t("Your profile is missing details for the calculation (sex, year of birth, height, weight).")}</p>
		<button type="button" onclick={() => plugin.openOnboarding()}>{t("Complete profile")}</button>
	{/if}
</section>

<div class="bf-actions">
	<button type="button" onclick={() => void plugin.days.openDayNote(today)}>{t("Open daily note")}</button>
	<button type="button" title={t("Simple mode: basic exercises, running and quick logging")} onclick={() => void plugin.setMode("basic")}>{t("Basic mode")}</button>
</div>

<style>
	.bf-today-plan li {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--size-4-2);
	}

	.bf-section-title {
		margin: 0;
	}

	.bf-date {
		margin: 0;
		color: var(--text-muted);
		text-transform: capitalize;
	}

	.bf-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-card-header h4 {
		margin: 0;
	}

	.bf-summary {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--size-4-1) var(--size-4-3);
		margin: var(--size-4-2) 0 0;
	}

	.bf-summary dt {
		color: var(--text-muted);
	}

	.bf-summary dd {
		margin: 0;
	}

	.bf-nutri-line {
		margin: var(--size-4-2) 0 0;
	}

	.bf-list {
		margin: var(--size-4-2) 0 0;
		padding-left: var(--size-4-5);
	}
</style>
