<script lang="ts">
	// Série a odznaky (SPEC 9.2) a měsíční souhrn (9.5).
	import { t, tn } from "../../i18n";
	import { Notice } from "obsidian";
	import { previousMonth } from "../../calc/monthlySummary";
	import { periodLabel, periodOf } from "../../calc/overview";
	import { badges, dayStreak, weekStreak } from "../../calc/streaks";
	import type { WorkoutNote } from "../../model/types";
	import { exerciseId } from "../../seed/localize";
	import { PULL_UP_EXERCISES } from "../../seed/skills";
	import { icon } from "../actions";
	import { usePlugin } from "../context";
	import { formatCzechDate, formatNumber } from "../format";

	interface Props {
		workouts: WorkoutNote[];
		/** Tréninky bez denních počítadel – počítají se do týdenního cíle. */
		sessions: WorkoutNote[];
		today: string;
	}
	let { workouts, sessions, today }: Props = $props();

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	/** Kolik dnů zpět se série programu dohledává. */
	const STREAK_DAYS = 90;

	const goal = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.weeklyWorkoutGoal;
	});
	// Nemoc a dovolená z plánu týdne sérii nepřeruší (SPEC 9.2).
	const excused = $derived.by(() => {
		void $indexVersion;
		return plugin.plans.excusedDates();
	});
	const week = $derived(weekStreak(sessions.map((w) => w.date), today, goal, excused));
	const showStreaks = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.showStreaks;
	});

	const programStreaks = $derived.by(() => {
		void $indexVersion;
		return plugin.programs
			.active(today)
			.map(({ entry }) => {
				const tasks = (date: string) => plugin.programs.tasks(entry, date);
				const streak = dayStreak(
					(date) => !excused.has(date) && tasks(date).length > 0,
					(date) => tasks(date).every((x) => x.done),
					today,
					entry.note.active_since ?? today,
					STREAK_DAYS,
				);
				return { name: entry.note.name, streak };
			});
	});

	const pullUps = new Set(PULL_UP_EXERCISES);
	const list = $derived.by(() => {
		void $indexVersion;
		return badges(workouts, sessions, (exercise) => pullUps.has(exerciseId(plugin.exerciseInfo(exercise)?.name ?? exercise) ?? ""), today);
	});

	const months = $derived([previousMonth(today.slice(0, 7)), today.slice(0, 7)]);
	const monthName = (month: string) => periodLabel(periodOf("month", `${month}-01`));
	const years = $derived([Number(today.slice(0, 4)) - 1, Number(today.slice(0, 4))]);

	async function summary(month: string) {
		try {
			const file = await plugin.summaries.generate(month);
			await plugin.app.workspace.getLeaf(false).openFile(file);
		} catch (err) {
			new Notice(t("Couldn't create the summary: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}
</script>

{#if showStreaks}
<section class="bf-card">
	<h4>{t("Sets")}</h4>
	<div class="bf-st-row">
		<span>{t("This week")}</span>
		<strong>{tn(week.goal, ["{thisWeek} of {n} workout", "{thisWeek} of {n} workouts"], { thisWeek: week.thisWeek })}</strong>
	</div>
	<div class="bf-st-bar"><div class="bf-st-fill" style:width={`${Math.min(100, week.goal > 0 ? (week.thisWeek / week.goal) * 100 : 0)}%`}></div></div>
	<div class="bf-st-row">
		<span>{t("Completed weeks in a row")}</span>
		<strong>{week.current} <span class="bf-muted bf-st-small">{t("(longest {best})", { best: week.best })}</span></strong>
	</div>
	{#each programStreaks as p, i (i)}
		<div class="bf-st-row">
			<span>{p.name}</span>
			<strong>{tn(p.streak, ["{v} day in a row", "{v} days in a row"], { v: p.streak >= STREAK_DAYS ? `${STREAK_DAYS}+` : p.streak })}</strong>
		</div>
	{/each}
	<p class="bf-muted bf-st-small">
		{t("Change the weekly goal in the settings. An unfinished week doesn't break the streak; workouts from the daily counter count only on days without another workout. Illness and vacation logged in the weekly plan don't break the streak – the week's goal is lowered instead. Streaks can be turned off in the settings.")}
	</p>
</section>

<section class="bf-card">
	<h4>{t("Badges")}</h4>
	<div class="bf-st-badges">
		{#each list as badge (badge.id)}
			<div class="bf-st-badge" class:is-done={badge.achieved !== null} title={badge.description}>
				<span class="bf-st-icon" use:icon={badge.achieved ? "award" : "circle-dashed"}></span>
				<div class="bf-st-text">
					<div class="bf-st-title">{badge.title}</div>
					<div class="bf-muted bf-st-small">
						{#if badge.achieved}
							{formatCzechDate(badge.achieved, false)}
						{:else}
							{t("{v} of {target} {unit}", { v: formatNumber(badge.progress.value, 1), target: badge.progress.target, unit: badge.progress.unit })}
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</section>

{/if}

<section class="bf-card">
	<h4>{t("Monthly summary")}</h4>
	<p class="bf-muted bf-st-small">
		{t("A note with your numbers, records and a comparison with the previous month. It's created automatically for the past month; use the button to create or refresh it manually.")}
	</p>
	<div class="bf-actions">
		{#each months as month (month)}
			<button type="button" onclick={() => void summary(month)}>{monthName(month)}</button>
		{/each}
	</div>
</section>

<section class="bf-card">
	<h4>{t("Year in numbers")}</h4>
	<p class="bf-muted bf-st-small">
		{t("Yearly summary: comparison with last year, a month-by-month overview, the longest run and workout, the most active month and the year's records. Use the button to create or refresh the note.")}
	</p>
	<div class="bf-actions">
		{#each years as year (year)}
			<button type="button" onclick={() => void plugin.yearlySummary(year)}>{year}</button>
		{/each}
	</div>
</section>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-st-small {
		font-size: var(--font-ui-smaller);
		font-weight: var(--font-normal);
	}

	.bf-st-row {
		display: flex;
		justify-content: space-between;
		gap: var(--size-4-2);
		font-size: var(--font-ui-small);
	}

	.bf-st-bar {
		height: 6px;
		border-radius: 3px;
		background-color: var(--background-modifier-border);
		overflow: hidden;
	}

	.bf-st-fill {
		height: 100%;
		background-color: var(--interactive-accent);
	}

	.bf-st-badges {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: var(--size-4-2);
	}

	.bf-st-badge {
		display: flex;
		align-items: center;
		gap: var(--size-4-2);
		height: 52px;
		box-sizing: border-box;
		padding: var(--size-4-2);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		color: var(--text-muted);
	}

	.bf-st-badge.is-done {
		border-color: var(--interactive-accent);
		color: var(--text-normal);
	}

	.bf-st-badge.is-done .bf-st-icon {
		color: var(--interactive-accent);
	}

	.bf-st-icon {
		display: flex;
		flex-shrink: 0;
	}

	.bf-st-text {
		min-width: 0;
	}

	.bf-st-title {
		font-size: var(--font-ui-small);
		font-weight: var(--font-semibold);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
