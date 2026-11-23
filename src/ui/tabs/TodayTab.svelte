<script lang="ts">
	import { Menu } from "obsidian";
	import { nutritionPlanFor } from "../../plugin/nutrition";
	import { t, tn } from "../../i18n";
	import { hasCheckIn, wellnessPoints } from "../../calc/checkIn";
	import { bedtimeAdvice, BEDTIME_MIN_NIGHTS, SLEEP_WEEK_BASIS, sleepWeek } from "../../calc/sleep";
	import { CYCLE_BASIS, cycleState } from "../../calc/cycle";
	import BasisTag from "../components/BasisTag.svelte";
	import { pendingImports } from "../../calc/running";
	import { PLAN_STATUS_LABELS, nextPlannedEntry } from "../../calc/weekPlan";
	import { daySummary, workoutDetails, workoutLabel } from "../../data/dayBlock";
	import { planItemDetails, planItemTitle } from "../../data/planBlock";
	import type { PlanEntry } from "../../data/PlanService";
	import { addDays, startOfWeek, toIsoDate } from "../../model/dates";
	import { usePlugin } from "../context";
	import { formatCzechDate, formatDurationMin, formatNumber, formatShortDate } from "../format";
	import { nutritionLine } from "../nutrition/text";
	import ProgramCard from "../program/ProgramCard.svelte";
	import SupplementCheck from "../supplements/SupplementCheck.svelte";
	import CheckInRadar from "../today/CheckInRadar.svelte";
	import ReadinessCard from "../today/ReadinessCard.svelte";
	import HabitsCard from "../today/HabitsCard.svelte";
	import RecommendationList from "../today/RecommendationList.svelte";

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
		const plan = nutritionPlanFor(plugin, today);
		return plan ? nutritionLine(plan) : null;
	});
	const checkedIn = $derived(hasCheckIn(day));
	const habitsOn = $derived.by(() => {
		void $settingsVersion;
		return plugin.moduleOn("habits");
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
	// Kdy dnes usnout: obvyklé vstávání mínus cíl délky spánku.
	const targetHours = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.thresholds.sleepTargetHours;
	});
	const bedtime = $derived(bedtimeAdvice(dayNotes, today, targetHours * 60));
	// Menstruační cyklus – jen se zapnutým modulem u ženského profilu.
	const cycleOn = $derived.by(() => {
		void $settingsVersion;
		return plugin.cycleOn();
	});
	const cycle = $derived(cycleState(dayNotes, today));
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
		void $settingsVersion;
		if (!plugin.moduleOn("programs.today_card")) return [];
		return plugin.programs.active(today).filter((p) => p.tasks.length > 0);
	});
	const showNutrition = $derived.by(() => {
		void $settingsVersion;
		return plugin.moduleOn("nutrition.day_note");
	});
	const supplements = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		return plugin.moduleOn("supplements") ? plugin.supplements.all().filter((e) => e.note.active) : [];
	});
	const pendingRuns = $derived.by(() => {
		void $indexVersion;
		return pendingImports(plugin.index.all("workout")).length;
	});
	// Hlavní akce dne: první nesplněná položka plánu, jinak nový trénink.
	const nextPlanned = $derived(nextPlannedEntry(planned.today));
	function start() {
		if (nextPlanned) logPlanned(nextPlanned);
		else plugin.openWorkout({ date: today });
	}
	function moreMenu(event: MouseEvent) {
		const menu = new Menu();
		menu.addItem((item) => item.setTitle(t("Log workout")).setIcon("plus").onClick(() => plugin.openWorkout({ date: today })));
		menu.addItem((item) => item.setTitle(t("Open daily note")).setIcon("file-text").onClick(() => void plugin.days.openDayNote(today)));
		menu.addItem((item) => item.setTitle(t("Basic mode")).setIcon("home").onClick(() => void plugin.setMode("basic")));
		menu.showAtMouseEvent(event);
	}
</script>

<div class="bf-today-head">
	<p class="bf-date">{formatCzechDate(today)}</p>
	<button type="button" aria-label={t("More actions")} onclick={moreMenu}>⋯</button>
</div>

<section class="bf-card">
	<header class="bf-card-header">
		<h4>{t("Morning check-in")}</h4>
		{#if checkedIn}
			<button type="button" onclick={() => plugin.openCheckIn(today)}>{t("Edit")}</button>
		{/if}
	</header>
	{#if checkedIn}
		<details>
			<summary>{t("Filled in today")}</summary>
			<dl class="bf-summary">
				{#if summary.sleep}<dt>{t("Sleep")}</dt><dd>{summary.sleep}</dd>{/if}
				{#if sleep.debtMin !== null}<dt>{t("Sleep debt")}</dt><dd>{sleep.debtMin === 0 ? t("no debt") : formatDurationMin(sleep.debtMin)} <span class="bf-muted">{t("({v} of the last 7 nights logged)", { v: sleep.nights })}</span></dd>{/if}
				{#if summary.feelings}<dt>{t("How you feel")}</dt><dd>{summary.feelings}</dd>{/if}
				{#if summary.hrv}<dt>HRV</dt><dd>{summary.hrv}</dd>{/if}
				{#if summary.weight}<dt>{t("Weight")}</dt><dd>{summary.weight}</dd>{/if}
			</dl>
			{#if hasWellness}<CheckInRadar points={wellness} />{/if}
		</details>
	{:else}
		<p class="bf-muted">{t("Not filled in today yet – it takes under half a minute.")}</p>
		<button type="button" class="mod-cta" onclick={() => plugin.openCheckIn(today)}>{t("Morning check-in")}</button>
	{/if}
</section>

<ReadinessCard readiness={insights.readiness} history={readinessHistory} onCheckIn={() => plugin.openCheckIn(today)} compact />

<section class="bf-card">
	<header class="bf-card-header">
		<h4>{t("Today's training")}</h4>
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
					{:else if entry !== nextPlanned}
						<button type="button" onclick={() => logPlanned(entry)}>{t("Log")}</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	<button type="button" class="mod-cta bf-today-start" onclick={start}>{nextPlanned ? t("Log: {v}", { v: planItemTitle(nextPlanned.item) }) : t("Log workout")}</button>
	{#if workouts.length > 0}
		<h5 class="bf-today-sub">{t("Today's workouts")}</h5>
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

<RecommendationList recommendations={insights.recommendations} />

<section class="bf-card bf-today-rest">
	<h4>{t("Still today")}</h4>
	{#each supplements as entry (entry.file.path)}
		<SupplementCheck {entry} {today} />
	{/each}
	{#if showNutrition}
		{#if nutrition}
			<p class="bf-nutri-line">
				<button type="button" class="bf-link-button" onclick={() => plugin.showTab("nutrition")}>{t("Nutrition for today")}</button>: {nutrition}
			</p>
		{:else}
			<p class="bf-muted">{t("Your profile is missing details for the calculation (sex, year of birth, height, weight).")}</p>
			<button type="button" onclick={() => plugin.openOnboarding()}>{t("Complete profile")}</button>
		{/if}
	{/if}
	{#if bedtime.onset}
		<p class="bf-small">
			{bedtime.bed
				? t("Tonight: in bed around {bed}, asleep by {onset} – {hours} h before your usual wake-up at {wake}.", { bed: bedtime.bed, onset: bedtime.onset ?? "", hours: formatNumber(targetHours, 1), wake: bedtime.wake ?? "" })
				: t("Tonight: asleep by {onset} – {hours} h before your usual wake-up at {wake}.", { onset: bedtime.onset ?? "", hours: formatNumber(targetHours, 1), wake: bedtime.wake ?? "" })}
			<BasisTag basis={SLEEP_WEEK_BASIS} />
		</p>
	{:else}
		<p class="bf-small bf-muted">{t("Bedtime suggestion: collecting data ({v} of {min} nights with a wake-up time).", { v: bedtime.wakeNights, min: BEDTIME_MIN_NIGHTS })}</p>
	{/if}
	{#if cycleOn && cycle.day !== null}
		<p class="bf-small">
			<button type="button" class="bf-link-button" onclick={() => plugin.showTab("cycle")}>{t("Day {day} of the cycle (since {start}).", { day: cycle.day, start: formatShortDate(cycle.start!) })}</button>
			<BasisTag basis={CYCLE_BASIS} />
		</p>
	{/if}
	{#if pendingRuns > 0}
		<button type="button" class="bf-link-button" onclick={() => plugin.showTab("log")}>{tn(pendingRuns, ["{n} run to complete", "{n} runs to complete"])}</button>
	{/if}
</section>

{#if habitsOn}
	<HabitsCard {today} days={dayNotes} compact />
{/if}

<style>
	.bf-today-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-today-start {
		width: 100%;
		margin-top: var(--size-4-2);
		height: auto;
		min-height: 36px;
		white-space: normal;
	}

	.bf-today-sub {
		margin: var(--size-4-2) 0 0;
	}

	.bf-today-rest {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--size-4-2);
	}

	.bf-today-rest h4,
	.bf-today-rest p {
		margin: 0;
	}

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
