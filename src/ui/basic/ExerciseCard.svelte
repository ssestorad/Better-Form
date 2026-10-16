<script lang="ts">
	// Karta silového cviku v režimu Základ: dnešní plán, naposledy, rekord, rychlý zápis.
	import { t } from "../../i18n";
	import { exerciseStats, quickSet, setPlan, taskFor, type BasicUnit } from "../../calc/basic";
	import { describeTarget } from "../../calc/programText";
	import { usePlugin } from "../context";
	import NumInput from "../components/NumInput.svelte";
	import { formatShortDate } from "../format";
	import CounterWidget from "../program/CounterWidget.svelte";

	interface Props {
		exercise: string;
		date: string;
	}
	let { exercise, date }: Props = $props();

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	let custom = $state<number | undefined>(undefined);
	let busy = $state(false);
	let error = $state<string | null>(null);

	const isExercise = (other: string) => plugin.workouts.isSameExercise(exercise, other);
	const unit = $derived.by<BasicUnit>(() => {
		void $indexVersion;
		return plugin.workouts.measureOf(exercise) === "seconds" ? "sec" : "reps";
	});
	const unitLabel = $derived(unit === "sec" ? "s" : t("opak."));
	const plan = $derived.by(() => {
		void $indexVersion;
		return taskFor(plugin.programs.active(date), isExercise);
	});
	const stats = $derived.by(() => {
		void $indexVersion;
		return exerciseStats(
			plugin.programs.workoutNotes(),
			plugin.index.all("test").map((x) => x.note),
			isExercise,
			unit,
			date,
		);
	});
	const counterSteps = $derived.by(() => {
		void $settingsVersion;
		const target = plan?.task.target;
		return target?.kind === "daily_total" && target.steps ? target.steps : plugin.settings.counterSteps;
	});
	const target = $derived(setPlan(plan?.task.target));
	const customValid = $derived(custom !== undefined && Number.isInteger(custom) && custom > 0 && custom <= 100000);
	const knownExercise = $derived.by(() => {
		void $indexVersion;
		return plugin.index.findExercise(exercise) !== undefined;
	});

	async function run(action: () => Promise<void>) {
		if (busy) return;
		busy = true;
		error = null;
		try {
			await action();
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			busy = false;
		}
	}

	const log = (value: number) => run(() => plugin.programs.quickLog(exercise, quickSet(value, unit), date));

	function logCustom() {
		if (!customValid) return;
		const value = custom!;
		custom = undefined;
		void log(value);
	}
</script>

<section class="bf-card bf-basic-card">
	<header class="bf-basic-head">
		<button type="button" class="bf-link-button bf-basic-name" title={t("Provedení a zapojené partie")} onclick={() => plugin.openLibrary({ exercise })}>
			{exercise}
		</button>
		{#if plan?.task.done}<span class="bf-tag bf-tag-done">{t("dnes splněno")}</span>{/if}
	</header>

	{#if !knownExercise}
		<p class="bf-muted">{t("Cvik není v knihovně – spusť „Doplnit knihovnu“ nebo uprav seznam cviků v nastavení.")}</p>
	{/if}

	<dl class="bf-basic-stats">
		<dt>{t("Dnes")}</dt>
		<dd>
			{#if plan}
				{describeTarget(plan.task.target)}
				<span class="bf-muted">· {plan.program.entry.note.name}</span>
			{:else}
				<span class="bf-muted">{t("bez programu – cvič podle sebe")}</span>
			{/if}
		</dd>
		<dt>{t("Naposledy")}</dt>
		<dd>
			{#if stats.last}{formatShortDate(stats.last.date)}: {stats.last.values.join(", ")} {unitLabel}{:else}<span class="bf-muted">{t("zatím nic")}</span>{/if}
		</dd>
		<dt>{t("Rekord")}</dt>
		<dd>
			{#if stats.record}{stats.record.value} {unitLabel} <span class="bf-muted">({formatShortDate(stats.record.date)})</span>{:else}<span class="bf-muted">–</span>{/if}
		</dd>
	</dl>

	{#if plan?.task.target.kind === "needs_test"}
		<button type="button" class="mod-cta" onclick={() => plugin.openEntryTest()}>{t("Otestovat maximum")}</button>
	{:else if plan?.task.counter}
		<CounterWidget
			label={t("Dnešní součet")}
			progress={plan.task.counter}
			steps={counterSteps}
			onAdd={(reps) => plugin.programs.addToCounter(plan.program.entry, exercise, reps, date)}
			onUndo={() => plugin.programs.undoCounter(plan.program.entry, exercise, date)}
		/>
	{:else}
		<!-- Pevná výška řádku s dnešními sériemi, aby karta při zápisu neposkakovala. -->
		<div class="bf-basic-today">
			{#if stats.today.length > 0}
				<strong>{stats.today.length}{target.sets !== undefined ? ` / ${target.sets}` : ""} {(target.sets ?? stats.today.length) >= 5 ? t("sérií") : t("série")}:</strong>
				{stats.today.join(", ")} {unitLabel}
			{:else}
				<span class="bf-muted">{t("Dnes zatím žádná série.")}</span>
			{/if}
		</div>
		<div class="bf-basic-log">
			{#if target.value !== undefined}
				<button type="button" class="mod-cta" disabled={busy} title={t("Zapsat jednu sérii podle plánu")} onclick={() => void log(target.value!)}>
					✓ {target.value}
				</button>
			{/if}
			<div class="bf-basic-custom">
				<NumInput
					bind:value={custom}
					label={unit === "sec" ? t("Sekundy") : t("Opakování")}
					placeholder={unit === "sec" ? t("sekundy") : t("opak.")}
					onkeydown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							logCustom();
						}
					}}
				/>
			</div>
			<button type="button" disabled={busy || !customValid} onclick={logCustom}>{t("Zapsat sérii")}</button>
			<button type="button" class="clickable-icon" disabled={busy || stats.today.length === 0} title={t("Vrátit poslední sérii")} aria-label={t("Vrátit poslední sérii")} onclick={() => void run(() => plugin.programs.undoQuickLog(exercise, date))}>↶</button>
		</div>
	{/if}
	{#if error}<div class="bf-error">{error}</div>{/if}
</section>

<style>
	.bf-basic-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-basic-name {
		font-weight: var(--font-semibold);
		font-size: var(--font-ui-medium);
	}

	.bf-basic-stats {
		display: grid;
		grid-template-columns: 5.5em minmax(0, 1fr);
		gap: 2px var(--size-4-2);
		margin: 0;
		font-size: var(--font-ui-small);
	}

	.bf-basic-stats dt {
		color: var(--text-muted);
	}

	.bf-basic-stats dd {
		margin: 0;
	}

	.bf-basic-today {
		min-height: 1.6em;
		font-size: var(--font-ui-small);
	}

	.bf-basic-log {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-4-1);
	}

	.bf-basic-custom {
		width: 5em;
	}
</style>
