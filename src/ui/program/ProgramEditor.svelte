<script lang="ts">
	// Tvorba a úprava vlastního programu (SPEC 5.7). Týdenní plány a intervaly
	// se upravují přímo v poznámce nebo importem – tady se jen zachovají.
	import { t } from "../../i18n";
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
		none: t("Bez automatické progrese"),
		weekly_add: t("Každý týden přidat"),
		retest_pct_of_max: t("Podle retestu maxima"),
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
		<span class="bf-field-label">{t("Název programu")}</span>
		<input type="text" value={program.name} oninput={(e) => (program.name = e.currentTarget.value)} />
	</label>

	<div class="bf-field">
		<span class="bf-field-label">{t("Dny")}</span>
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
			<span class="bf-field-label">{t("Délka (týdny)")}</span>
			<NumInput bind:value={program.duration_weeks} label={t("Délka v týdnech")} placeholder={t("bez konce")} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Progrese")}</span>
			<select class="dropdown" value={program.progression.rule} onchange={(e) => (program.progression.rule = e.currentTarget.value as ProgressionRule)}>
				{#each PROGRESSION_RULES as rule (rule)}<option value={rule}>{RULE_LABELS[rule]}</option>{/each}
			</select>
		</label>
		{#if program.progression.rule === "weekly_add"}
			<label class="bf-field">
				<span class="bf-field-label">{t("Přidat týdně")}</span>
				<NumInput bind:value={program.progression.add} label={t("Přidat týdně")} decimals />
			</label>
		{:else if program.progression.rule === "retest_pct_of_max"}
			<label class="bf-field">
				<span class="bf-field-label">{t("Retest každé (týdny)")}</span>
				<NumInput bind:value={program.retest_every_weeks} label={t("Retest každé N týdnů")} />
			</label>
		{/if}
	</div>

	<div class="bf-editor-items">
		<span class="bf-field-label">{t("Položky programu")}</span>
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
							aria-label={t("Typ cíle")}
							value={target.kind}
							onchange={(e) => (item.target = defaultTarget(e.currentTarget.value as EditableTargetKind))}
						>
							{#each EDITABLE_TARGETS as kind (kind)}<option value={kind}>{TARGET_LABELS[kind]}</option>{/each}
						</select>
					{/if}
					<button type="button" class="clickable-icon" aria-label={t("Odebrat položku")} onclick={() => program.items.splice(i, 1)}>✕</button>
				</div>
				<div class="bf-editor-fields">
					{#if target.kind === "sets_reps"}
						<label class="bf-mini"><span>{t("Série")}</span><NumInput bind:value={target.sets} label={t("Série")} /></label>
						<label class="bf-mini"><span>{t("Opakování")}</span><NumInput bind:value={target.reps} label={t("Opakování")} /></label>
					{:else if target.kind === "daily_total"}
						<label class="bf-mini"><span>{t("Za den")}</span><NumInput bind:value={target.daily_total} label={t("Denní součet")} /></label>
					{:else if target.kind === "pct_of_max"}
						<label class="bf-mini"><span>{t("Série")}</span><NumInput bind:value={target.sets} label={t("Série")} /></label>
						<label class="bf-mini"><span>{t("% maxima")}</span><NumInput bind:value={target.pct_of_max} label={t("Procento maxima")} decimals /></label>
					{:else if target.kind === "max_sets"}
						<label class="bf-mini"><span>{t("Série")}</span><NumInput bind:value={target.sets} label={t("Série")} /></label>
						<label class="bf-mini"><span>{t("Pauza (s)")}</span><NumInput bind:value={target.rest_s} label={t("Pauza v sekundách")} /></label>
					{:else if target.kind === "emom"}
						<label class="bf-mini"><span>{t("Opak./min")}</span><NumInput bind:value={target.reps} label={t("Opakování za minutu")} placeholder={t("nebo %")} /></label>
						<label class="bf-mini"><span>{t("% maxima")}</span><NumInput bind:value={target.pct_of_max} label={t("Procento maxima")} decimals placeholder={t("nebo opak.")} /></label>
						<label class="bf-mini"><span>{t("Minuty")}</span><NumInput bind:value={target.minutes} label={t("Minuty")} /></label>
						<label class="bf-mini bf-check">
							<input type="checkbox" checked={target.until_failure === true} onchange={(e) => (target.until_failure = e.currentTarget.checked ? true : undefined)} />
							<span>{t("do selhání")}</span>
						</label>
						{#if target.until_failure}
							<label class="bf-mini"><span>{t("Nejvýš min")}</span><NumInput bind:value={target.max_minutes} label={t("Nejvýš minut")} /></label>
						{/if}
					{:else if target.kind === "ladder"}
						<label class="bf-mini bf-mini-wide">
							<span>{t("Příčky (1-5 nebo 1, 2, 3)")}</span>
							<input type="text" value={(target.steps ?? []).join(", ")} onchange={(e) => (target.steps = parseLadderSteps(e.currentTarget.value))} />
						</label>
						<label class="bf-mini"><span>{t("Kola")}</span><NumInput bind:value={target.rounds} label={t("Kola")} /></label>
						<label class="bf-mini"><span>{t("Pauza s/opak.")}</span><NumInput bind:value={target.rest_per_rep_s} label={t("Pauza v sekundách na opakování")} decimals /></label>
					{:else if target.kind === "time"}
						<label class="bf-mini"><span>{t("Sekundy")}</span><NumInput bind:value={target.time_s} label={t("Sekundy")} /></label>
						<label class="bf-mini"><span>{t("Série")}</span><NumInput bind:value={target.sets} label={t("Série")} /></label>
					{:else if target.kind === "distance"}
						<label class="bf-mini"><span>km</span><NumInput bind:value={target.distance_km} label={t("Vzdálenost (km)")} decimals /></label>
					{:else}
						<span class="bf-muted">{t("Intervaly se upravují přímo v poznámce programu.")}</span>
					{/if}
				</div>
				{#if item.schedule}
					<div class="bf-hint">{t("Položka má plán po týdnech ({schedule_length} týdnů) – upravuje se v poznámce programu, tady zůstane zachovaný.", { schedule_length: item.schedule.length })}</div>
				{/if}
			</div>
		{/each}
		<ExercisePicker {options} placeholder={t("Přidat cvik do programu…")} onSelect={(name) => program.items.push({ exercise: name, target: defaultTarget("sets_reps") })} />
	</div>

	{#if problems.length > 0}
		<ul class="bf-error bf-editor-problems">
			{#each problems as problem (problem)}<li>{problem}</li>{/each}
		</ul>
	{/if}
	{#if error}<p class="bf-error">{error}</p>{/if}

	<p class="bf-muted bf-editor-note">{t("Vlastní program má štítek „praxe“. Aktivuješ ho na kartě Programy.")}</p>

	<div class="bf-form-buttons">
		<button type="button" onclick={onCancel}>{t("Zrušit")}</button>
		<button type="button" class="mod-cta" disabled={problems.length > 0 || saving} onclick={() => void save()}>
			{saving ? t("Ukládám…") : t("Uložit program")}
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
