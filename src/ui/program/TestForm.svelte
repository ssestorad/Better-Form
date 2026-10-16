<script lang="ts">
	// Zápis testu maxima (SPEC 4.6). Enter uloží.
	import { t } from "../../i18n";
	import { untrack } from "svelte";
	import { TEST_TYPES, type TestType } from "../../model/constants";
	import { isIsoDate } from "../../model/dates";
	import type { TestNote } from "../../model/types";
	import ClockInput from "../components/ClockInput.svelte";
	import NumInput from "../components/NumInput.svelte";
	import ExercisePicker from "../workout/ExercisePicker.svelte";
	import type { ExerciseOption } from "../workout/search";

	interface Props {
		date: string;
		exercise?: string;
		options: ExerciseOption[];
		/** Poslední výsledek stejného testu, např. „minule 28 (20. 9.)“. */
		lastText: (exercise: string, type: TestType) => string | undefined;
		onSave: (test: Omit<TestNote, "forma" | "schema">) => Promise<void>;
		onCancel: () => void;
	}
	let { date: initialDate, exercise: initialExercise, options, lastText, onSave, onCancel }: Props = $props();

	const TYPE_LABELS: Record<TestType, string> = {
		max_reps: t("Maximum opakování"),
		max_reps_timed: t("Maximum opakování v časovém limitu"),
		max_hold: t("Maximální výdrž"),
		"1rm": t("1RM (maximální váha na 1 opakování)"),
		run_time: t("Čas běhu na vzdálenost"),
	};
	const RESULT_LABELS: Record<TestType, string> = {
		max_reps: t("Počet opakování"),
		max_reps_timed: t("Počet opakování"),
		max_hold: t("Výdrž (s)"),
		"1rm": t("Váha (kg)"),
		run_time: t("Čas (h:mm:ss)"),
	};

	let date = $state(untrack(() => initialDate));
	let exercise = $state(untrack(() => initialExercise ?? ""));
	let type = $state<TestType>("max_reps");
	let result = $state<number | undefined>(undefined);
	let limit = $state<number | undefined>(undefined);
	let distance = $state<number | undefined>(undefined);
	let saving = $state(false);
	let error = $state<string | null>(null);

	const resultValid = $derived(result !== undefined && !Number.isNaN(result) && result > 0);
	const valid = $derived(
		isIsoDate(date) &&
			exercise.trim() !== "" &&
			resultValid &&
			(type !== "max_reps_timed" || (limit !== undefined && limit > 0)) &&
			(type !== "run_time" || (distance !== undefined && distance > 0)),
	);
	const last = $derived(exercise ? lastText(exercise, type) : undefined);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!valid || saving) return;
		saving = true;
		error = null;
		try {
			await onSave({
				date,
				exercise: exercise.trim(),
				test_type: type,
				result: result!,
				...(type === "max_reps_timed" && limit !== undefined ? { time_limit_s: limit } : {}),
				...(type === "run_time" && distance !== undefined ? { distance_km: distance } : {}),
			});
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<form class="bf-test" onsubmit={submit}>
	<div class="bf-field">
		<span class="bf-field-label">{t("Cvik")}</span>
		{#if exercise}
			<div class="bf-test-exercise">
				<strong>{exercise}</strong>
				<button type="button" class="bf-link-button" onclick={() => (exercise = "")}>{t("změnit")}</button>
			</div>
		{:else}
			<ExercisePicker {options} placeholder={t("Vyber cvik…")} onSelect={(name) => (exercise = name)} />
		{/if}
	</div>

	<div class="bf-grid-2">
		<label class="bf-field">
			<span class="bf-field-label">{t("Datum")}</span>
			<input type="date" value={date} onchange={(e) => (date = e.currentTarget.value)} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Typ testu")}</span>
			<select class="dropdown" value={type} onchange={(e) => (type = e.currentTarget.value as TestType)}>
				{#each TEST_TYPES as x (x)}<option value={x}>{TYPE_LABELS[x]}</option>{/each}
			</select>
		</label>
	</div>

	<div class="bf-grid-2">
		<label class="bf-field">
			<span class="bf-field-label"><span>{RESULT_LABELS[type]}</span>{#if last}<span class="bf-hint">{last}</span>{/if}</span>
			{#if type === "run_time"}
				<ClockInput bind:value={result} label={RESULT_LABELS[type]} placeholder="25:30" />
			{:else}
				<NumInput bind:value={result} label={RESULT_LABELS[type]} decimals={type === "1rm"} />
			{/if}
		</label>
		{#if type === "max_reps_timed"}
			<label class="bf-field">
				<span class="bf-field-label">{t("Časový limit (mm:ss)")}</span>
				<ClockInput bind:value={limit} label={t("Časový limit")} placeholder="2:00" />
			</label>
		{:else if type === "run_time"}
			<label class="bf-field">
				<span class="bf-field-label">{t("Vzdálenost (km)")}</span>
				<NumInput bind:value={distance} label={t("Vzdálenost (km)")} decimals />
			</label>
		{/if}
	</div>

	<p class="bf-muted bf-test-note">{t("Před testem se rozcvič. Test dělej odpočatý – výsledek se použije pro výpočet cílů v programech.")}</p>
	{#if error}<p class="bf-error">{error}</p>{/if}

	<div class="bf-form-buttons">
		<button type="button" onclick={onCancel}>{t("Zrušit")}</button>
		<button type="submit" class="mod-cta" disabled={!valid || saving}>{saving ? t("Ukládám…") : t("Uložit test")}</button>
	</div>
</form>

<style>
	.bf-test {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
	}

	.bf-test-exercise {
		display: flex;
		align-items: baseline;
		gap: var(--size-4-2);
	}

	.bf-test-note {
		margin: 0;
		font-size: var(--font-ui-small);
	}

	.bf-form-buttons {
		display: flex;
		justify-content: flex-end;
		gap: var(--size-4-2);
	}
</style>
