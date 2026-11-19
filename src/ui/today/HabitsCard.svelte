<script lang="ts">
	// Deník návyků: co se dělo včera (zapisuje se hned po kliknutí) a jak se pak lišilo ráno.
	import { t, translated } from "../../i18n";
	import { HABIT_BASIS, HABIT_MIN_DAYS, habitImpact, type HabitMetric } from "../../calc/habits";
	import { addDays } from "../../model/dates";
	import type { DayNote } from "../../model/types";
	import BasisTag from "../components/BasisTag.svelte";
	import { usePlugin } from "../context";

	let { today, days }: { today: string; days: DayNote[] } = $props();
	const plugin = usePlugin();
	const settingsVersion = plugin.settingsVersion;

	// Výchozí návyky jsou ve vaultu anglicky; v rozhraní se zobrazí přeložené.
	const DEFAULT_LABELS: Record<string, string> = translated({ Alcohol: "Alcohol", "Caffeine after 2 pm": "Caffeine after 2 pm", "Late meal": "Late meal", "Screen before bed": "Screen before bed", Travel: "Travel" });
	const label = (habit: string) => (habit in DEFAULT_LABELS ? DEFAULT_LABELS[habit]! : habit);
	const METRIC_LABELS: Record<HabitMetric, string> = translated({ hrv: "HRV", resting_hr: "resting heart rate", sleep: "sleep", fatigue: "fatigue" });

	const yesterday = $derived(addDays(today, -1));
	const habits = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.habits;
	});
	const done = $derived(days.find((d) => d.date === yesterday)?.habits ?? []);
	const impact = $derived(habitImpact(days, habits, today));
	let saving = $state(false);

	async function toggle(habit: string) {
		if (saving) return;
		saving = true;
		const next = done.includes(habit) ? done.filter((h) => h !== habit) : [...done, habit];
		try {
			await plugin.days.setHabits(yesterday, habits.filter((h) => next.includes(h)));
		} finally {
			saving = false;
		}
	}
	const ready = $derived(impact.filter((row) => row.effects.length > 0));
	// Postup sběru u návyku, kterému chybí nejméně dní.
	const collecting = $derived(
		impact
			.filter((row) => row.effects.length === 0)
			.map((row) => ({ yes: Math.min(row.yesDays, HABIT_MIN_DAYS), no: Math.min(row.noDays, HABIT_MIN_DAYS) }))
			.sort((a, b) => b.yes + b.no - (a.yes + a.no))[0],
	);
	const pct = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)} %`;
</script>

<section class="bf-card bf-hb">
	<h4>{t("Yesterday")}</h4>
	<p class="bf-muted bf-hb-small">{t("Tap what happened yesterday – after a few weeks you'll see how it relates to your mornings.")}</p>
	<div class="bf-hb-chips">
		{#each habits as habit (habit)}
			<button type="button" class="bf-hb-chip" class:is-active={done.includes(habit)} aria-pressed={done.includes(habit)} disabled={saving} onclick={() => void toggle(habit)}>{label(habit)}</button>
		{/each}
	</div>
	{#if ready.length > 0}
		<dl class="bf-hb-results">
			{#each ready as row (row.habit)}
				<dt>{label(row.habit)}</dt>
				<dd>
					{row.effects.map((e) => `${METRIC_LABELS[e.metric]} ${pct(e.pct)}`).join(", ")}
					<span class="bf-muted">{t("the next morning ({v} days with, {v2} without)", { v: row.yesDays, v2: row.noDays })}</span>
				</dd>
			{/each}
		</dl>
	{/if}
	{#if collecting}
		<p class="bf-muted bf-hb-small">{t("collecting data ({v} of {v2} days with, {v3} of {v2} without)", { v: collecting.yes, v2: HABIT_MIN_DAYS, v3: collecting.no })}</p>
	{/if}
	<p class="bf-muted bf-hb-small">{t("Association, not cause – on the same day other things happen too. Last 90 days.")} <BasisTag basis={HABIT_BASIS} /></p>
</section>

<style>
	.bf-hb {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	h4,
	p,
	dl {
		margin: 0;
	}

	.bf-hb-small {
		font-size: var(--font-ui-small);
	}

	.bf-hb-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-1);
	}

	/* Zaškrtnutý návyk jen barvou – rozměr tlačítka se nemění. */
	.bf-hb-chip {
		height: 28px;
		padding: 0 var(--size-4-3);
		border-radius: 999px;
		font-size: var(--font-ui-small);
	}

	.bf-hb-chip.is-active {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.bf-hb-results {
		display: grid;
		grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
		gap: var(--size-4-1) var(--size-4-3);
		font-size: var(--font-ui-small);
	}

	.bf-hb-results dt {
		font-weight: var(--font-semibold);
	}

	.bf-hb-results dd {
		margin: 0;
	}
</style>
