<script lang="ts">
	// Plán týdne (SPEC 5.16): sedm dní s naplánovanými tréninky, jejich stav,
	// souhrn týdne a výhled zátěže. Rozvržení řádků je pevné – nic neposkakuje.
	import { t } from "../../i18n";
	import { Menu, Notice } from "obsidian";
	import { RUN_SPIKE_BASIS, runSpike } from "../../calc/running";
	import { OUTLOOK_WEEKS, PLAN_LOAD_BASIS, PLAN_STATUS_LABELS, type PlanStatus } from "../../calc/weekPlan";
	import { planItemDetails, planItemTitle } from "../../data/planBlock";
	import type { PlanDay, PlanEntry } from "../../data/PlanService";
	import { DAY_OFF_LABELS, WEEKDAY_LABELS, type DayOffReason } from "../../model/constants";
	import { addDays, startOfWeek, toIsoDate, weekdayOf } from "../../model/dates";
	import BasisTag from "../components/BasisTag.svelte";
	import { usePlugin } from "../context";
	import { formatCzechDate, formatDateRange, formatDayMonth, formatDurationMin, formatNumber } from "../format";
	import { formatWhole } from "../nutrition/text";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const today = $derived.by(() => {
		void $indexVersion;
		return toIsoDate(new Date());
	});
	const currentWeek = $derived(startOfWeek(today));
	/** Pondělí zobrazeného týdne. */
	let week = $state(startOfWeek(toIsoDate(new Date())));
	let busy = $state(false);

	const view = $derived.by(() => {
		void $indexVersion;
		return plugin.plans.view(week, today);
	});
	// Tabulka v poznámce týdne obsahuje i dny programů – po změně programu se obnoví,
	// jakmile se plán zobrazí (zapisuje se jen při rozdílu).
	$effect(() => {
		if (!view.file) return;
		void plugin.plans.refreshBlock(view.week).catch(() => {
			// Poškozené značky v poznámce ohlásí až úprava plánu; při pouhém zobrazení mlčet.
		});
	});
	const workouts = $derived.by(() => {
		void $indexVersion;
		return plugin.index.all("workout").map((w) => w.note);
	});
	/** Naplánovaný běh o víc než 10 % delší než nejdelší za předchozích 30 dní (Frandsen 2025). */
	function spikeOf(entry: PlanEntry) {
		const km = entry.status === "planned" && entry.item.sport === "run" ? entry.item.distance_km : undefined;
		return km ? runSpike(workouts, entry.item.date, km) : null;
	}
	const acwrWarn = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.thresholds.acwrWarn;
	});

	const STATUS_CLASS: Record<PlanStatus, string> = { done: "bf-tag bf-tag-done", planned: "bf-tag", missed: "bf-tag bf-tag-warn", off: "bf-tag" };
	const shortDate = formatDayMonth;
	const weekTitle = $derived(formatDateRange(week, addDays(week, 6)));
	const weekNote = $derived(week === currentWeek ? t("this week") : week === addDays(currentWeek, 7) ? t("next week") : week === addDays(currentWeek, -7) ? t("last week") : "");
	const streakText = (dates: string[]) => dates.map((d) => `${WEEKDAY_LABELS[weekdayOf(d)].toLocaleLowerCase()} ${shortDate(d)}`).join(", ");

	function log(entry: PlanEntry) {
		const template = entry.item.template ? plugin.index.all("template").find((x) => x.note.name === entry.item.template)?.file : undefined;
		plugin.openWorkout(template ? { date: entry.item.date, template } : { date: entry.item.date, plan: entry.item });
	}

	async function run(action: () => Promise<unknown>, failure: string) {
		try {
			await action();
		} catch (err) {
			new Notice(`${failure}: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	const setOff = (from: string, to: string, reason: DayOffReason | null) => run(() => plugin.plans.setOff(from, to, reason), t("Couldn't save the day off"));

	/** Nabídka dne: volno, nemoc, dovolená a přesun nesplněných položek. */
	function dayMenu(event: MouseEvent, day: PlanDay) {
		const menu = new Menu();
		const weekEnd = addDays(week, 6);
		const movable = day.entries.filter((e) => !e.program && e.status !== "done").length;
		if (movable > 0) {
			const target = day.date < today ? today : addDays(day.date, 1);
			menu.addItem((item) =>
				item
					.setTitle(day.date < today ? t("Move unfinished to today ({movable})", { movable }) : t("Move unfinished to the next day ({movable})", { movable }))
					.setIcon("arrow-right")
					.onClick(() => void run(() => plugin.plans.movePending(day.date, target, today), t("Couldn't move"))),
			);
			menu.addSeparator();
		}
		menu.addItem((item) => item.setTitle(t("Rest day")).setIcon("coffee").onClick(() => void setOff(day.date, day.date, "rest")));
		menu.addItem((item) => item.setTitle(t("Illness")).setIcon("thermometer").onClick(() => void setOff(day.date, day.date, "illness")));
		menu.addItem((item) => item.setTitle(t("Vacation")).setIcon("palmtree").onClick(() => void setOff(day.date, day.date, "vacation")));
		if (day.date < weekEnd) {
			menu.addItem((item) => item.setTitle(t("Ill until the end of the week")).setIcon("thermometer").onClick(() => void setOff(day.date, weekEnd, "illness")));
			menu.addItem((item) => item.setTitle(t("Vacation until the end of the week")).setIcon("palmtree").onClick(() => void setOff(day.date, weekEnd, "vacation")));
		}
		if (day.off) {
			menu.addSeparator();
			menu.addItem((item) => item.setTitle(t("Cancel day off")).setIcon("x").onClick(() => void setOff(day.date, day.date, null)));
		}
		menu.showAtMouseEvent(event);
	}

	async function copyPrevious() {
		if (busy) return;
		busy = true;
		try {
			const count = await plugin.plans.copyPrevious(week);
			new Notice(count > 0 ? t("Copied from last week: {count}.", { count }) : t("Nothing is planned in the previous week."));
		} catch (err) {
			new Notice(t("Couldn't copy the plan: {v}", { v: err instanceof Error ? err.message : String(err) }));
		} finally {
			busy = false;
		}
	}

	async function openNote() {
		try {
			await plugin.plans.openNote(week);
		} catch (err) {
			new Notice(t("Can't open the plan note: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}
</script>

<div class="bf-plan-nav">
	<button type="button" aria-label={t("Previous week")} onclick={() => (week = addDays(week, -7))}>‹</button>
	<span class="bf-plan-week">
		<strong>{weekTitle}</strong>
		<span class="bf-muted bf-small bf-plan-weeknote">{weekNote}</span>
	</span>
	<button type="button" aria-label={t("Next week")} onclick={() => (week = addDays(week, 7))}>›</button>
	<button type="button" class="bf-plan-ics" title={t("Save the week as an .ics file for Google, Outlook or Apple Calendar")} onclick={() => void plugin.exportPlanCalendar(week)}>{t("To calendar")}</button>
</div>

<section class="bf-card">
	<ul class="bf-plan-days">
		{#each view.days as day (day.date)}
			<li class="bf-plan-day" class:is-today={day.date === today}>
				<span class="bf-plan-date">
					<strong>{WEEKDAY_LABELS[weekdayOf(day.date)]}</strong>
					<span class="bf-muted">{shortDate(day.date)}</span>
				</span>
				<div class="bf-plan-items">
					{#if day.off}
						<div><span class="bf-tag bf-plan-off" title={day.off === "rest" ? t("Planned rest") : t("Excused day – doesn't count as missed and doesn't break the day streak")}>{DAY_OFF_LABELS[day.off]}</span></div>
					{/if}
					{#each day.entries as entry (entry.item.id)}
						<div class="bf-plan-item">
							{#if entry.program}
								<button type="button" class="bf-link-button bf-plan-title" title={t("Active program day – change the days and workout duration on the Programs tab")} onclick={() => plugin.showTab("programs")}>
									{t("Program {program_name}", { program_name: entry.program.name })}
								</button>
							{:else}
								<button type="button" class="bf-link-button bf-plan-title" title={t("Edit, move or delete")} onclick={() => plugin.openPlanItem({ date: day.date, item: entry.item })}>
									{planItemTitle(entry.item)}
								</button>
							{/if}
							<span class={STATUS_CLASS[entry.status]}>{PLAN_STATUS_LABELS[entry.status]}</span>
							<span class="bf-muted bf-small bf-plan-details">
								{planItemDetails(entry.item, entry.minutes)}{entry.program ? ` · ${entry.program.text}` : entry.item.notes ? ` · ${entry.item.notes}` : ""}
							</span>
							{#if spikeOf(entry)}
								{@const spike = spikeOf(entry)!}
								<span class="bf-small bf-plan-warning">
									{t("{v} % longer than your longest run of the last 30 days ({v2} km) – shorten it to at most {v3} km.", { v: formatNumber(spike.pct, 0), v2: formatNumber(spike.longestKm, 1), v3: formatNumber(spike.maxKm, 1) })}
									<BasisTag basis={RUN_SPIKE_BASIS} />
								</span>
							{/if}
							{#if entry.status === "done" && entry.workout}
								<button type="button" class="bf-plan-action" onclick={() => plugin.openWorkout({ file: entry.workout!.file })}>{t("Workout")}</button>
							{:else if entry.program}
								{#if entry.program.workoutFile}
									<button type="button" class="bf-plan-action" onclick={() => plugin.openWorkout({ file: entry.program!.workoutFile! })}>{t("Workout")}</button>
								{:else if entry.status !== "done" && day.date <= today}
									<button type="button" class="bf-plan-action" onclick={() => plugin.openWorkout({ program: entry.program!.file, date: day.date })}>{t("Log")}</button>
								{/if}
							{:else if day.date <= today}
								<button type="button" class="bf-plan-action" onclick={() => log(entry)}>{t("Log")}</button>
							{/if}
						</div>
					{/each}
					{#each day.programs as program (program.file.path)}
						<div class="bf-plan-program bf-muted bf-small">
							{t("Program {program_name}: {program_text}", { program_name: program.name, program_text: program.text })}
							<span title={program.loggable ? t("On the Programs tab, fill in the workout duration for the program – its days are then counted in the summary, load and nutrition.") : t("The daily counter has no duration or RPE, so it doesn't count towards load.")}>
								· {program.loggable ? t("no workout duration – not counted") : t("daily counter – not counted")}
							</span>
						</div>
					{/each}
					{#if day.entries.length === 0 && day.programs.length === 0 && !day.off}
						<span class="bf-muted bf-small">{t("nothing planned")}</span>
					{/if}
				</div>
				<span class="bf-plan-buttons">
					<button type="button" class="bf-plan-add" aria-label={t("Rest, illness, vacation and moving – {v}", { v: shortDate(day.date) })} title={t("Rest, illness, vacation, move unfinished")} onclick={(e) => dayMenu(e, day)}>⋯</button>
					<button type="button" class="bf-plan-add" aria-label={t("Plan a workout for {v}", { v: shortDate(day.date) })} onclick={() => plugin.openPlanItem({ date: day.date })}>+</button>
				</span>
			</li>
		{/each}
	</ul>
</section>

<section class="bf-card">
	<h4>{t("Week summary")}</h4>
	{#if view.summary.planned === 0}
		<p class="bf-muted">{t("Nothing is planned for this week yet. Add a workout with the + button next to a day.")}</p>
	{:else}
		<dl class="bf-plan-summary">
			<dt>{t("Workouts")}</dt>
			<dd>
				{t("done {done} of {planned}{v}{v2}", { done: view.summary.done, planned: view.summary.planned, v: view.summary.missed > 0 ? t(", missed {missed}", { missed: view.summary.missed }) : "", v2: view.summary.postponed > 0
					? t(", postponed {postponed}", { postponed: view.summary.postponed })
					: "" })}
			</dd>
			<dt>{t("Time")}</dt>
			<dd>
				{t("planned {v}, trained {v2}", { v: formatDurationMin(view.summary.plannedMin), v2: formatDurationMin(view.summary.actualMin) })}
				{#if view.summary.withoutDuration > 0}<span class="bf-muted bf-small"> {t("· {withoutDuration}× without duration (not counted)", { withoutDuration: view.summary.withoutDuration })}</span>{/if}
			</dd>
			{#if view.summary.plannedRunKm > 0 || view.summary.actualRunKm > 0}
				<dt>{t("Run")}</dt>
				<dd>{t("planned {v} km, run {v2} km", { v: formatNumber(view.summary.plannedRunKm), v2: formatNumber(view.summary.actualRunKm) })}</dd>
			{/if}
			<dt>{t("Load")}</dt>
			<dd>
				{#if view.outlook.ratio !== null && view.outlook.average !== null}
					{t("about {v} AU, i.e. {v2}× the average of the last {OUTLOOK_WEEKS} weeks ({v3} AU)", { v: formatWhole(view.outlook.expected), v2: formatNumber(view.outlook.ratio, 2), OUTLOOK_WEEKS, v3: formatWhole(view.outlook.average) })}
					{#if view.outlook.planned > 0 && view.outlook.ratio > acwrWarn}
						<br /><span class="bf-plan-warning">{t("That's a big jump (threshold {v}×) – consider shortening or easing some workouts.", { v: formatNumber(acwrWarn, 2) })}</span>
					{/if}
				{:else}
					{t("about {v} AU", { v: formatWhole(view.outlook.expected) })}
					<br /><span class="bf-muted bf-small">{t("Collecting data – the comparison with the average appears after {OUTLOOK_WEEKS} weeks of workouts with RPE and duration logged.", { OUTLOOK_WEEKS })}</span>
				{/if}
				<br /><span class="bf-muted bf-small">
					{t("Logged workouts ({v} AU) + the rest of the plan ({v2} AU); for the plan it's an estimate from duration and intensity (easy 3, moderate 5, hard 8 × minutes).", { v: formatWhole(view.outlook.actual), v2: formatWhole(view.outlook.planned) })}
					<BasisTag basis={PLAN_LOAD_BASIS} />
				</span>
			</dd>
		</dl>
		{#each view.streaks as streak (streak[0])}
			<p class="bf-plan-warning">
				{t("Hard days in a row: {v} – consider swapping one with an easier day.", { v: streakText(streak) })}
				<BasisTag basis={{ sourceIds: ["practice"], evidence: "practice" }} />
			</p>
		{/each}
	{/if}
</section>

<div class="bf-actions">
	<button type="button" disabled={week === currentWeek} onclick={() => (week = currentWeek)}>{t("This week")}</button>
	<button type="button" disabled={busy} onclick={() => void copyPrevious()}>{t("Copy last week")}</button>
	<button type="button" onclick={() => void openNote()}>{t("Open the week note")}</button>
	<button type="button" title={t("The week's numbers against last week, plan completion and new records in a note in the Summaries folder")} onclick={() => void plugin.weeklySummary(week)}>
		{t("Week summary")}
	</button>
</div>

<style>
	.bf-plan-nav {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: var(--size-4-2);
	}

	.bf-plan-week {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* Řádek pod datem má pevnou výšku i bez textu, aby se navigace při listování nehýbala. */
	.bf-plan-weeknote {
		min-height: 1.4em;
	}

	.bf-plan-days {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	/* Šířka seznamu řídí rozvržení dne: v úzkém panelu jdou položky pod datum. */
	.bf-plan-days {
		container-type: inline-size;
	}

	.bf-plan-day {
		display: grid;
		grid-template-columns: 5.5em minmax(0, 1fr) auto;
		align-items: start;
		gap: var(--size-4-2);
		padding: var(--size-4-2) var(--size-2-3);
		border-top: 1px solid var(--background-modifier-border);
		border-left: 3px solid transparent;
		min-height: 2.75em;
	}

	.bf-plan-day:first-child {
		border-top: none;
	}

	.bf-plan-day.is-today {
		border-left-color: var(--interactive-accent);
		background-color: var(--background-secondary);
	}

	.bf-plan-date {
		white-space: nowrap;
		display: flex;
		gap: var(--size-2-3);
		align-items: baseline;
	}

	.bf-plan-items {
		display: flex;
		flex-direction: column;
		gap: var(--size-2-3);
		min-width: 0;
	}

	/* Název, štítek a tlačítko vedle sebe; když se nevejdou, zalomí se na další řádek – nikdy se nepřekryjí. */
	.bf-plan-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-2-3) var(--size-4-2);
	}

	.bf-plan-title {
		flex: 1 1 7em;
		min-width: 0;
		text-align: left;
		overflow-wrap: anywhere;
	}

	.bf-plan-item :global(.bf-tag) {
		flex: none;
		white-space: nowrap;
	}

	.bf-plan-action {
		flex: none;
	}

	.bf-plan-details {
		flex: 1 0 100%;
		order: 1;
		overflow-wrap: anywhere;
	}

	.bf-plan-warning {
		flex: 1 0 100%;
		order: 2;
		color: var(--text-warning);
		overflow-wrap: anywhere;
	}

	.bf-plan-program {
		overflow-wrap: anywhere;
	}

	.bf-plan-add {
		min-width: 2.2em;
	}

	.bf-plan-buttons {
		display: flex;
		gap: var(--size-2-2);
	}

	/* Volný den jen štítkem – řádek dne má stejné rozměry jako ostatní. */
	.bf-plan-off {
		font-weight: var(--font-semibold);
	}

	@container (max-width: 26em) {
		.bf-plan-day {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.bf-plan-buttons {
			grid-column: 2;
			grid-row: 1;
		}

		.bf-plan-items {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}

	.bf-plan-summary {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--size-2-3) var(--size-4-3);
		margin: 0;
	}

	.bf-plan-summary dt {
		color: var(--text-muted);
	}

	.bf-plan-summary dd {
		margin: 0;
	}

	.bf-plan-warning {
		color: var(--text-warning);
	}

	p.bf-plan-warning {
		margin: var(--size-4-2) 0 0;
	}
</style>
