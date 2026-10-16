<script lang="ts">
	// Tvorba a úprava vlastního programu (SPEC 5.7). Týdenní plány a intervaly
	// se upravují přímo v poznámce nebo importem – tady se jen zachovají.
	import { t, tn } from "../../i18n";
	import { untrack } from "svelte";
	import { parseLadderSteps } from "../../calc/performance";
	import {
		defaultTarget,
		EDITABLE_TARGETS,
		TARGET_LABELS,
		validateProgram,
		type EditableTargetKind,
	} from "../../calc/programEdit";
	import { PROGRESSION_RULES, WEEKDAY_LABELS, WEEKDAYS, type ProgressionRule, type Weekday } from "../../model/constants";
	import type { ProgramNote } from "../../model/types";
	import NumInput from "../components/NumInput.svelte";
	import ExercisePicker from "../workout/ExercisePicker.svelte";
	import type { ExerciseOption } from "../workout/search";

	interface Props {
		initial: ProgramNote;
		options: ExerciseOption[];
		onSave: (program: ProgramNote) => Promise<void>;
		onCancel: () => void;
	}
	let { initial, options, onSave, onCancel }: Props = $props();

	const RULE_LABELS: Record<ProgressionRule, string> = {
		none: t("No automatic progression"),
		weekly_add: t("Add every week"),
		retest_pct_of_max: t("Based on a max retest"),
	};

	let program = $state<ProgramNote>(untrack(() => structuredClone($state.snapshot(initial) as ProgramNote)));
	let saving = $state(false);
	let error = $state<string | null>(null);

	const problems = $derived(validateProgram(program));

	function toggleDay(day: Weekday) {
		program.days = program.days.includes(day)
			? program.days.filter((d) => d !== day)
			: WEEKDAYS.filter((d) => d === day || program.days.includes(d));
	}

	async function save() {
		if (problems.length > 0 || saving) return;
		saving = true;
		error = null;
		try {
			const result = $state.snapshot(program) as ProgramNote;
			result.name = result.name.trim();
			if (result.progression.rule !== "weekly_add") delete result.progression.add;
			await onSave(result);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<div class="bf-editor">
	<label class="bf-field">
		<span class="bf-field-label">{t("Program name")}</span>
		<input type="text" value={program.name} oninput={(e) => (program.name = e.currentTarget.value)} />
	</label>

	<div class="bf-field">
		<span class="bf-field-label">{t("Days")}</span>
		<div class="bf-days">
			{#each WEEKDAYS as day (day)}
				<button type="button" class="bf-day" class:is-selected={program.days.includes(day)} aria-pressed={program.days.includes(day)} onclick={() => toggleDay(day)}>
					{WEEKDAY_LABELS[day]}
				</button>
			{/each}
		</div>
	</div>

	<div class="bf-grid-3">
		<label class="bf-field">
			<span class="bf-field-label">{t("Duration (weeks)")}</span>
			<NumInput bind:value={program.duration_weeks} label={t("Duration in weeks")} placeholder={t("no end")} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Progression")}</span>
			<select class="dropdown" value={program.progression.rule} onchange={(e) => (program.progression.rule = e.currentTarget.value as ProgressionRule)}>
				{#each PROGRESSION_RULES as rule (rule)}<option value={rule}>{RULE_LABELS[rule]}</option>{/each}
			</select>
		</label>
		{#if program.progression.rule === "weekly_add"}
			<label class="bf-field">
				<span class="bf-field-label">{t("Add weekly")}</span>
				<NumInput bind:value={program.progression.add} label={t("Add weekly")} decimals />
			</label>
		{:else if program.progression.rule === "retest_pct_of_max"}
			<label class="bf-field">
				<span class="bf-field-label">{t("Retest every (weeks)")}</span>
				<NumInput bind:value={program.retest_every_weeks} label={t("Retest every N weeks")} />
			</label>
		{/if}
	</div>

	<div class="bf-editor-items">
		<span class="bf-field-label">{t("Program items")}</span>
		{#each program.items as item, i (i)}
			{@const target = item.target}
			<div class="bf-editor-item">
				<div class="bf-editor-item-head">
					<strong>{item.exercise}</strong>
					{#if target.kind === "intervals"}
						<span class="bf-tag">{TARGET_LABELS.intervals}</span>
					{:else}
						<select
							class="dropdown"
							aria-label={t("Goal type")}
							value={target.kind}
							onchange={(e) => (item.target = defaultTarget(e.currentTarget.value as EditableTargetKind))}
						>
							{#each EDITABLE_TARGETS as kind (kind)}<option value={kind}>{TARGET_LABELS[kind]}</option>{/each}
						</select>
					{/if}
					<button type="button" class="clickable-icon" aria-label={t("Remove item")} onclick={() => program.items.splice(i, 1)}>✕</button>
				</div>
				<div class="bf-editor-fields">
					{#if target.kind === "sets_reps"}
						<label class="bf-mini"><span>{t("Sets")}</span><NumInput bind:value={target.sets} label={t("Sets")} /></label>
						<label class="bf-mini"><span>{t("Reps")}</span><NumInput bind:value={target.reps} label={t("Reps")} /></label>
					{:else if target.kind === "daily_total"}
						<label class="bf-mini"><span>{t("Per day")}</span><NumInput bind:value={target.daily_total} label={t("Daily total")} /></label>
					{:else if target.kind === "pct_of_max"}
						<label class="bf-mini"><span>{t("Sets")}</span><NumInput bind:value={target.sets} label={t("Sets")} /></label>
						<label class="bf-mini"><span>{t("% of max")}</span><NumInput bind:value={target.pct_of_max} label={t("Percentage of max")} decimals /></label>
					{:else if target.kind === "max_sets"}
						<label class="bf-mini"><span>{t("Sets")}</span><NumInput bind:value={target.sets} label={t("Sets")} /></label>
						<label class="bf-mini"><span>{t("Rest (s)")}</span><NumInput bind:value={target.rest_s} label={t("Rest in seconds")} /></label>
					{:else if target.kind === "emom"}
						<label class="bf-mini"><span>{t("Reps/min")}</span><NumInput bind:value={target.reps} label={t("Reps per minute")} placeholder={t("or %")} /></label>
						<label class="bf-mini"><span>{t("% of max")}</span><NumInput bind:value={target.pct_of_max} label={t("Percentage of max")} decimals placeholder={t("or reps")} /></label>
						<label class="bf-mini"><span>{t("Minutes")}</span><NumInput bind:value={target.minutes} label={t("Minutes")} /></label>
						<label class="bf-mini bf-check">
							<input type="checkbox" checked={target.until_failure === true} onchange={(e) => (target.until_failure = e.currentTarget.checked ? true : undefined)} />
							<span>{t("to failure")}</span>
						</label>
						{#if target.until_failure}
							<label class="bf-mini"><span>{t("Max min")}</span><NumInput bind:value={target.max_minutes} label={t("Max minutes")} /></label>
						{/if}
					{:else if target.kind === "ladder"}
						<label class="bf-mini bf-mini-wide">
							<span>{t("Rungs (1-5 or 1, 2, 3)")}</span>
							<input type="text" value={(target.steps ?? []).join(", ")} onchange={(e) => (target.steps = parseLadderSteps(e.currentTarget.value))} />
						</label>
						<label class="bf-mini"><span>{t("Rounds")}</span><NumInput bind:value={target.rounds} label={t("Rounds")} /></label>
						<label class="bf-mini"><span>{t("Rest s/rep")}</span><NumInput bind:value={target.rest_per_rep_s} label={t("Rest in seconds per rep")} decimals /></label>
					{:else if target.kind === "time"}
						<label class="bf-mini"><span>{t("Seconds")}</span><NumInput bind:value={target.time_s} label={t("Seconds")} /></label>
						<label class="bf-mini"><span>{t("Sets")}</span><NumInput bind:value={target.sets} label={t("Sets")} /></label>
					{:else if target.kind === "distance"}
						<label class="bf-mini"><span>km</span><NumInput bind:value={target.distance_km} label={t("Distance (km)")} decimals /></label>
					{:else}
						<span class="bf-muted">{t("Intervals are edited directly in the program note.")}</span>
					{/if}
				</div>
				{#if item.schedule}
					<div class="bf-hint">{tn(item.schedule.length, ["The item has a week-by-week plan ({n} week) – it's edited in the program note and stays unchanged here.", "The item has a week-by-week plan ({n} weeks) – it's edited in the program note and stays unchanged here."])}</div>
				{/if}
			</div>
		{/each}
		<ExercisePicker {options} placeholder={t("Add an exercise to the program…")} onSelect={(name) => program.items.push({ exercise: name, target: defaultTarget("sets_reps") })} />
	</div>

	{#if problems.length > 0}
		<ul class="bf-error bf-editor-problems">
			{#each problems as problem (problem)}<li>{problem}</li>{/each}
		</ul>
	{/if}
	{#if error}<p class="bf-error">{error}</p>{/if}

	<p class="bf-muted bf-editor-note">{t("Your own program gets the “practice” label. Activate it on the Programs tab.")}</p>

	<div class="bf-form-buttons">
		<button type="button" onclick={onCancel}>{t("Cancel")}</button>
		<button type="button" class="mod-cta" disabled={problems.length > 0 || saving} onclick={() => void save()}>
			{saving ? t("Saving…") : t("Save program")}
		</button>
	</div>
</div>

<style>
	.bf-editor {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
	}

	.bf-days {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: var(--size-4-1);
	}

	.bf-day {
		padding: 0;
		height: 30px;
	}

	.bf-day.is-selected {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.bf-editor-items {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-editor-item {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		padding: var(--size-4-2);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
	}

	.bf-editor-item-head {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: var(--size-4-2);
	}

	.bf-editor-fields {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
		gap: var(--size-4-2);
		align-items: end;
	}

	.bf-mini {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: var(--font-ui-smaller);
		color: var(--text-muted);
	}

	.bf-mini-wide {
		grid-column: span 2;
	}

	.bf-check {
		flex-direction: row;
		align-items: center;
		gap: var(--size-4-1);
		min-height: var(--input-height);
	}

	.bf-editor-problems {
		margin: 0;
		padding-left: var(--size-4-5);
	}

	.bf-editor-note {
		margin: 0;
		font-size: var(--font-ui-small);
	}

	.bf-form-buttons {
		display: flex;
		justify-content: flex-end;
		gap: var(--size-4-2);
	}
</style>
