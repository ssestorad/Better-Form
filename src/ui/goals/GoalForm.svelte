<script lang="ts">
	// Zadání nového cíle (SPEC 5.8, typy 4.6).
	import { t, tn } from "../../i18n";
	import { laddersFrom } from "../../calc/skills";
	import type { GoalDraft } from "../../data/GoalService";
	import { GOAL_TYPES, GOAL_TYPE_LABELS, type GoalType } from "../../model/constants";
	import NumInput from "../components/NumInput.svelte";
	import { usePlugin } from "../context";
	import { parseGoalTarget, targetHint, targetUnit } from "./text";

	interface Props {
		onSave: (draft: GoalDraft) => Promise<void>;
		onCancel: () => void;
	}
	let { onSave, onCancel }: Props = $props();

	const plugin = usePlugin();
	const exercises = plugin.index
		.all("exercise")
		.map((e) => e.note.name)
		.sort((a, b) => a.localeCompare(b, "cs"));
	const ladders = laddersFrom(plugin.index.all("exercise").map((e) => e.note));
	const norms = plugin.goals.norms().map((n) => n.note.name);

	let name = $state("");
	let type = $state<GoalType>("run_time");
	let exercise = $state("");
	let distanceKm = $state<number | undefined>(undefined);
	let ladder = $state(ladders[0]?.name ?? "");
	let norm = $state(norms[0] ?? "");
	let targetText = $state("");
	let deadline = $state("");
	let saving = $state(false);
	let saveError = $state("");

	const needsExercise = $derived(type === "lift_1rm" || type === "reps_max");
	const info = $derived(needsExercise ? plugin.exerciseInfo(exercise) : undefined);
	const unit = $derived(targetUnit(type, info?.measure === "seconds"));
	const target = $derived(type === "norm" ? null : parseGoalTarget(targetText, unit));
	const maxLevel = $derived(ladders.find((l) => l.name === ladder)?.steps.length ?? 0);

	const error = $derived.by(() => {
		if (name.trim() === "") return t("Enter a goal name.");
		if (type === "run_time" && !(distanceKm !== undefined && distanceKm > 0)) return t("Enter the distance in km.");
		if (needsExercise && !info) return t("Choose an exercise from the library.");
		if (type === "lift_1rm" && info && info.kind !== "grind") return t("Estimated 1RM is only calculated for strength exercises, not for ballistic ones or holds.");
		if (type === "skill_level" && !ladder) return t("There's no skill ladder in the library – add them on the Skills tab.");
		if (type === "norm" && !norm) return t("Create a standard first (further down this tab).");
		if (type !== "norm" && target === null) return t("Enter the target value ({v}).", { v: targetHint(unit) });
		if (type === "skill_level" && target !== null && target > maxLevel) return tn(maxLevel, ["The ladder only has {n} level.", "The ladder only has {n} levels."]);
		return "";
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (error) return;
		saving = true;
		saveError = "";
		try {
			await onSave({
				name: name.trim(),
				type,
				target: target ?? undefined,
				exercise: needsExercise ? info?.name : undefined,
				distance_km: type === "run_time" ? distanceKm : undefined,
				ladder: type === "skill_level" ? ladder : undefined,
				norm: type === "norm" ? norm : undefined,
				deadline: deadline || undefined,
			});
		} catch (err) {
			saveError = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<form class="bf-goal-form" onsubmit={submit}>
	<label class="bf-field">
		<span class="bf-field-label">{t("Name")}</span>
		<input type="text" bind:value={name} placeholder={t("e.g. 10 km under 50 minutes")} />
	</label>
	<div class="bf-grid-2">
		<label class="bf-field">
			<span class="bf-field-label">{t("Goal type")}</span>
			<select bind:value={type}>
				{#each GOAL_TYPES as x (x)}
					<option value={x}>{GOAL_TYPE_LABELS[x]}</option>
				{/each}
			</select>
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Deadline")} <span class="bf-hint">{t("optional", undefined, "deadline")}</span></span>
			<input type="date" bind:value={deadline} />
		</label>
	</div>

	{#if type === "run_time"}
		<label class="bf-field">
			<span class="bf-field-label">{t("Distance (km)")}</span>
			<NumInput bind:value={distanceKm} label={t("Distance in km")} decimals placeholder="10" />
		</label>
	{:else if needsExercise}
		<label class="bf-field">
			<span class="bf-field-label">{t("Exercise")}</span>
			<input type="text" list="bf-goal-exercises" bind:value={exercise} placeholder={t("start typing an exercise name")} />
			<datalist id="bf-goal-exercises">
				{#each exercises as e (e)}
					<option value={e}></option>
				{/each}
			</datalist>
		</label>
	{:else if type === "skill_level"}
		<label class="bf-field">
			<span class="bf-field-label">{t("Skill ladder")}</span>
			<select bind:value={ladder}>
				{#each ladders as l (l.name)}
					<option value={l.name}>{tn(l.steps.length, ["{l_name} ({n} level)", "{l_name} ({n} levels)"], { l_name: l.name })}</option>
				{/each}
			</select>
		</label>
	{:else if type === "norm"}
		<label class="bf-field">
			<span class="bf-field-label">{t("Standard")}</span>
			<select bind:value={norm}>
				{#each norms as n (n)}
					<option value={n}>{n}</option>
				{/each}
			</select>
		</label>
	{/if}

	{#if type !== "norm"}
		<label class="bf-field">
			<span class="bf-field-label">{t("Target value")} <span class="bf-hint">{targetHint(unit)}</span></span>
			<input type="text" bind:value={targetText} placeholder={unit === "time" ? "49:30" : ""} />
		</label>
	{:else}
		<p class="bf-muted bf-goal-small">{t("The goal is reached once every event in the standard is met.")}</p>
	{/if}

	{#if type === "body_weight"}
		<p class="bf-muted bf-goal-small">{t("Progress comes from the weight in the morning check-in (7-day average). A sensible pace of weight loss is handled by nutrition in phase 5.")}</p>
	{/if}

	{#if error}<div class="bf-error">{error}</div>{/if}
	{#if saveError}<div class="bf-error">{saveError}</div>{/if}
	<div class="bf-actions">
		<button type="submit" class="mod-cta" disabled={!!error || saving}>{t("Add goal")}</button>
		<button type="button" onclick={onCancel}>{t("Cancel")}</button>
	</div>
</form>

<style>
	p {
		margin: 0;
	}

	.bf-goal-form {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-goal-form select {
		width: 100%;
	}

	.bf-goal-small {
		font-size: var(--font-ui-smaller);
	}
</style>
