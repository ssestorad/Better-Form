<script lang="ts">
	// Zadání nového cíle (SPEC 5.8, typy 4.6).
	import { t } from "../../i18n";
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
		if (name.trim() === "") return t("Zadej název cíle.");
		if (type === "run_time" && !(distanceKm !== undefined && distanceKm > 0)) return t("Zadej trať v km.");
		if (needsExercise && !info) return t("Vyber cvik z knihovny.");
		if (type === "lift_1rm" && info && info.kind !== "grind") return t("Odhad 1RM se počítá jen u silových cviků, ne u švihových ani výdrží.");
		if (type === "skill_level" && !ladder) return t("V knihovně není žádný žebříček – doplň je na kartě Dovednosti.");
		if (type === "norm" && !norm) return t("Nejdřív založ normu (níže na této kartě).");
		if (type !== "norm" && target === null) return t("Zadej cílovou hodnotu ({v}).", { v: targetHint(unit) });
		if (type === "skill_level" && target !== null && target > maxLevel) return t("Žebříček má jen {maxLevel} stupňů.", { maxLevel });
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
		<span class="bf-field-label">{t("Název")}</span>
		<input type="text" bind:value={name} placeholder={t("např. 10 km pod 50 minut")} />
	</label>
	<div class="bf-grid-2">
		<label class="bf-field">
			<span class="bf-field-label">{t("Typ cíle")}</span>
			<select bind:value={type}>
				{#each GOAL_TYPES as x (x)}
					<option value={x}>{GOAL_TYPE_LABELS[x]}</option>
				{/each}
			</select>
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Termín")} <span class="bf-hint">{t("nepovinný")}</span></span>
			<input type="date" bind:value={deadline} />
		</label>
	</div>

	{#if type === "run_time"}
		<label class="bf-field">
			<span class="bf-field-label">{t("Trať (km)")}</span>
			<NumInput bind:value={distanceKm} label={t("Trať v km")} decimals placeholder="10" />
		</label>
	{:else if needsExercise}
		<label class="bf-field">
			<span class="bf-field-label">{t("Cvik")}</span>
			<input type="text" list="bf-goal-exercises" bind:value={exercise} placeholder={t("začni psát název cviku")} />
			<datalist id="bf-goal-exercises">
				{#each exercises as e (e)}
					<option value={e}></option>
				{/each}
			</datalist>
		</label>
	{:else if type === "skill_level"}
		<label class="bf-field">
			<span class="bf-field-label">{t("Žebříček")}</span>
			<select bind:value={ladder}>
				{#each ladders as l (l.name)}
					<option value={l.name}>{t("{l_name} ({steps_length} stupňů)", { l_name: l.name, steps_length: l.steps.length })}</option>
				{/each}
			</select>
		</label>
	{:else if type === "norm"}
		<label class="bf-field">
			<span class="bf-field-label">{t("Norma")}</span>
			<select bind:value={norm}>
				{#each norms as n (n)}
					<option value={n}>{n}</option>
				{/each}
			</select>
		</label>
	{/if}

	{#if type !== "norm"}
		<label class="bf-field">
			<span class="bf-field-label">{t("Cílová hodnota")} <span class="bf-hint">{targetHint(unit)}</span></span>
			<input type="text" bind:value={targetText} placeholder={unit === "time" ? "49:30" : ""} />
		</label>
	{:else}
		<p class="bf-muted bf-goal-small">{t("Cíl je splněný, až budou splněné všechny disciplíny normy.")}</p>
	{/if}

	{#if type === "body_weight"}
		<p class="bf-muted bf-goal-small">{t("Stav se bere z váhy v ranním check-inu (průměr za 7 dní). Rozumné tempo hubnutí řeší výživa ve fázi 5.")}</p>
	{/if}

	{#if error}<div class="bf-error">{error}</div>{/if}
	{#if saveError}<div class="bf-error">{saveError}</div>{/if}
	<div class="bf-actions">
		<button type="submit" class="mod-cta" disabled={!!error || saving}>{t("Přidat cíl")}</button>
		<button type="button" onclick={onCancel}>{t("Zrušit")}</button>
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
