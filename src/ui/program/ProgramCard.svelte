<script lang="ts">
	// Aktivní program: týden, dnešní úkoly se splněním, počítadlo, zápis tréninku.
	import { t } from "../../i18n";
	import { describeTarget } from "../../calc/programText";
	import { Notice } from "obsidian";
	import { EVIDENCE_LABELS, PLAN_INTENSITIES, PLAN_INTENSITY_LABELS, type PlanIntensity } from "../../model/constants";
	import type { ProgramToday } from "../../data/ProgramService";
	import { usePlugin } from "../context";
	import CounterWidget from "./CounterWidget.svelte";
	import ProgramDetails from "./ProgramDetails.svelte";

	interface Props {
		today: ProgramToday;
		date: string;
		/** Zobrazit správu (pozastavit, otevřít poznámku) – na kartě Programy. */
		manage?: boolean;
	}
	let { today, date, manage = false }: Props = $props();

	const plugin = usePlugin();
	const settingsVersion = plugin.settingsVersion;

	const note = $derived(today.entry.note);
	const steps = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.counterSteps;
	});
	const loggable = $derived(today.tasks.filter((x) => x.target.kind !== "daily_total"));
	const allDone = $derived(today.tasks.length > 0 && today.tasks.every((x) => x.done));
	// Délka a intenzita tréninku pro plán týdne (SPEC 5.16) – jde nastavit i u předpřipraveného programu.
	async function saveSession(sessionMin: number | undefined, intensity: PlanIntensity | undefined) {
		try {
			await plugin.programs.setSession(today.entry, sessionMin, intensity);
		} catch (err) {
			new Notice(t("Nastavení se nepodařilo uložit: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}
	function saveMinutes(raw: string) {
		const text = raw.trim();
		const value = text === "" ? undefined : Number(text.replace(",", "."));
		if (value !== undefined && !(Number.isFinite(value) && value > 0)) {
			new Notice(t("Délka tréninku: zadej kladný počet minut, nebo pole nech prázdné."));
			return;
		}
		void saveSession(value, note.intensity);
	}

	const weekText = $derived(note.duration_weeks !== undefined ? t("týden {week}/{duration_weeks}", { week: today.week, duration_weeks: note.duration_weeks }) : t("týden {week}", { week: today.week }));
</script>

<section class="bf-card">
	<header class="bf-program-head">
		<button type="button" class="bf-link-button bf-program-name" onclick={() => void plugin.app.workspace.openLinkText(today.entry.file.path, "", false)}>
			{note.name}
		</button>
		<span class="bf-muted">{weekText}</span>
		<span class="bf-tag" title={t("Úroveň důkazu programu")}>{EVIDENCE_LABELS[note.evidence]}</span>
		{#if allDone}<span class="bf-tag bf-tag-done">{t("dnes splněno")}</span>{/if}
	</header>

	{#if today.tasks.length === 0}
		<p class="bf-muted">{t("Dnes volno.")}</p>
	{:else}
		<ul class="bf-tasks">
			{#each today.tasks as task (task.itemIndex)}
				<li>
					{#if task.counter}
						<CounterWidget
							label={task.exercise}
							progress={task.counter}
							steps={task.target.kind === "daily_total" && task.target.steps ? task.target.steps : steps}
							onAdd={(reps) => plugin.programs.addToCounter(today.entry, task.exercise, reps, date)}
							onUndo={() => plugin.programs.undoCounter(today.entry, task.exercise, date)}
						/>
					{:else}
						<div class="bf-task" class:is-done={task.done}>
							<span class="bf-task-mark" aria-hidden="true">{task.done ? "✓" : "○"}</span>
							<span><strong>{task.exercise}:</strong> {describeTarget(task.target)}</span>
							{#if task.target.kind === "needs_test"}
								<button type="button" onclick={() => plugin.openTest({ exercise: task.exercise, date })}>{t("Otestovat maximum")}</button>
							{:else if task.retest}
								<button type="button" title={t("Od posledního testu uběhla doba nastavená v programu; cíle se počítají ze starého maxima")} onclick={() => plugin.openTest({ exercise: task.exercise, date })}>{t("Je čas na nový test maxima")}</button>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<ProgramDetails entry={today.entry} />

	{#if manage}
		<div class="bf-program-plan">
			<span class="bf-muted bf-small">{t("Pro plán týdne:")}</span>
			<label class="bf-program-plan-field">
				<span class="bf-small">{t("trénink trvá")}</span>
				<input
					type="text"
					inputmode="numeric"
					class="bf-program-plan-min"
					aria-label={t("Obvyklá délka tréninku v minutách")}
					placeholder="–"
					value={note.session_min ?? ""}
					onchange={(e) => saveMinutes(e.currentTarget.value)}
				/>
				<span class="bf-small">min</span>
			</label>
			<label class="bf-program-plan-field">
				<span class="bf-small">{t("intenzita")}</span>
				<select class="dropdown" aria-label={t("Obvyklá intenzita tréninku")} value={note.intensity ?? "mid"} onchange={(e) => void saveSession(note.session_min, e.currentTarget.value as PlanIntensity)}>
					{#each PLAN_INTENSITIES as level (level)}<option value={level}>{PLAN_INTENSITY_LABELS[level]}</option>{/each}
				</select>
			</label>
			<span class="bf-muted bf-small bf-program-plan-note">
				{note.session_min !== undefined
					? t("Dny programu se počítají do plánu týdne, zátěže a výživy (denní počítadlo ne).")
					: t("S vyplněnou délkou se dny programu počítají do plánu týdne, zátěže a výživy.")}
			</span>
		</div>
	{/if}

	<div class="bf-actions">
		{#if loggable.length > 0}
			<button type="button" class:mod-cta={!allDone} onclick={() => plugin.openWorkout({ program: today.entry.file, date })}>
				{t("Zapsat trénink z programu")}
			</button>
		{/if}
		{#if manage}
			{#if !note.builtin}
				<button type="button" onclick={() => plugin.openProgramEditor(today.entry)}>{t("Upravit")}</button>
			{/if}
			<button type="button" onclick={() => void plugin.programs.deactivate(today.entry)}>{t("Pozastavit")}</button>
		{/if}
	</div>
</section>

<style>
	.bf-program-plan {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-2-3) var(--size-4-3);
	}

	.bf-program-plan-field {
		display: flex;
		align-items: center;
		gap: var(--size-2-3);
	}

	.bf-program-plan-min {
		width: 4em;
		text-align: right;
	}

	.bf-program-plan-note {
		flex-basis: 100%;
	}

	.bf-program-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--size-4-2);
	}

	.bf-program-name {
		font-weight: var(--font-semibold);
		font-size: var(--font-ui-medium);
	}

	.bf-tasks {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.bf-task {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-4-2);
	}

	.bf-task-mark {
		width: 1.2em;
		text-align: center;
		color: var(--text-muted);
	}

	.bf-task.is-done .bf-task-mark {
		color: var(--text-success);
	}
</style>
