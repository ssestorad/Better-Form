<script lang="ts">
	// Ranní check-in (SPEC 5.2) – cíl vyplnění do 30 s. Enter uloží, Esc zavře.
	import { t } from "../../i18n";
	import { untrack } from "svelte";
	import {
		sleepTimeDate,
		validateCheckIn,
		type CheckInHints,
		type CheckInTimeField,
		type CheckInValues,
	} from "../../calc/checkIn";
	import { sleepDurationMin } from "../../calc/sleep";
	import { isIsoDate } from "../../model/dates";
	import { MAX_STEPS } from "../../model/parse";
	import { BODY_MEASURES } from "../../calc/bodyMeasures";
	import NumberField from "../components/NumberField.svelte";
	import Scale5 from "../components/Scale5.svelte";
	import TimeField from "../components/TimeField.svelte";
	import { formatCzechDate, formatDurationMin, formatShortDate } from "../format";

	interface Loaded {
		values: CheckInValues;
		hints: CheckInHints;
		existing: boolean;
		/** Kroky za předchozí den – ráno se zapisují zpětně. */
		stepsYesterday?: number;
	}
	interface Props {
		initialDate: string;
		load: (date: string) => Loaded;
		onSave: (values: CheckInValues, stepsYesterday: number | undefined) => Promise<void>;
		onCancel: () => void;
	}
	let { initialDate, load, onSave, onCancel }: Props = $props();

	const initial = untrack(() => load(initialDate));
	let values = $state<CheckInValues>(initial.values);
	let hints = $state<CheckInHints>(initial.hints);
	let existing = $state(initial.existing);
	let stepsYesterday = $state<number | undefined>(initial.stepsYesterday);
	/** Mění se při změně data – pole formuláře se vytvoří znovu s novými hodnotami. */
	let formKey = $state(0);
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	// Míry jsou sbalené, dokud v nich pro tento den něco není.
	const hasMeasures = untrack(() => BODY_MEASURES.some((m) => initial.values[m.id] !== undefined));
	const computedDuration = $derived(sleepDurationMin(values));
	const errors = $derived(validateCheckIn(values));
	const stepsError = $derived(
		stepsYesterday === undefined
			? undefined
			: Number.isNaN(stepsYesterday)
				? t("Not a number.")
				: stepsYesterday < 0 || stepsYesterday > MAX_STEPS
					? t("Range 0–{MAX_STEPS}.", { MAX_STEPS })
					: undefined,
	);
	const valid = $derived(Object.keys(errors).length === 0 && stepsError === undefined);

	/** Ke kterému dni čas patří (noc z předchozího dne na den check-inu). */
	function timeNote(field: CheckInTimeField, time: string | undefined): string {
		if (!isIsoDate(values.date)) return "";
		if (!time) return field === "wake" ? formatShortDate(values.date) : "";
		return formatShortDate(sleepTimeDate(values.date, field, time));
	}

	function changeDate(date: string) {
		if (!isIsoDate(date) || date === values.date) return;
		const next = load(date);
		values = next.values;
		hints = next.hints;
		existing = next.existing;
		stepsYesterday = next.stepsYesterday;
		formKey++;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!valid || saving) return;
		saving = true;
		saveError = null;
		try {
			await onSave($state.snapshot(values), stepsYesterday);
		} catch (err) {
			saveError = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<form class="bf-checkin" onsubmit={submit}>
	<div class="bf-checkin-date">
		<label for="bf-checkin-date">{t("Date")}</label>
		<input
			id="bf-checkin-date"
			type="date"
			value={values.date}
			onchange={(e) => changeDate(e.currentTarget.value)}
		/>
		<span class="bf-muted">{formatCzechDate(values.date)}{existing ? t(" · editing a saved check-in") : ""}</span>
	</div>

	{#key formKey}
		<fieldset>
			<legend>{t("Sleep")}</legend>
			<div class="bf-grid-3">
				<!-- Ráno se začíná tím nejjistějším (vstávání), pak zpětně večer. -->
				<TimeField label={t("Woke up")} note={timeNote("wake", values.wake)} bind:value={values.wake} />
				<TimeField label={t("Went to bed")} note={timeNote("bedtime", values.bedtime)} bind:value={values.bedtime} />
				<TimeField
					label={t("Fell asleep (estimate)")}
					note={timeNote("sleep_onset", values.sleep_onset)}
					bind:value={values.sleep_onset}
					error={errors.sleep_onset}
				/>
			</div>
			<div class="bf-grid-2">
				<div class="bf-field">
					<div class="bf-field-label"><span>{t("Sleep duration")}</span></div>
					<div class="bf-duration">
						{#if values.duration_min !== undefined && !Number.isNaN(values.duration_min)}
							{formatDurationMin(values.duration_min)} <span class="bf-muted">{t("(manual)")}</span>
						{:else if computedDuration !== null}
							{formatDurationMin(computedDuration)}
						{:else}
							<span class="bf-muted">{t("fill in the times")}</span>
						{/if}
					</div>
				</div>
				<NumberField
					label={t("Override duration")}
					unit="min"
					bind:value={values.duration_min}
					placeholder={computedDuration !== null ? String(computedDuration) : ""}
					error={errors.duration_min}
				/>
			</div>
			<Scale5 label={t("Sleep quality")} low={t("very poor")} high={t("excellent")} bind:value={values.quality} hint={hints.quality} error={errors.quality} />
			<div class="bf-grid-2">
				<NumberField label={t("Woken up at night")} unit="×" bind:value={values.awakenings} hint={hints.awakenings} error={errors.awakenings} />
			</div>
			<Scale5 label={t("Feeling in the morning")} low={t("very poor", undefined, "feeling")} high={t("excellent", undefined, "feeling")} bind:value={values.morning_feeling} hint={hints.morning_feeling} error={errors.morning_feeling} />
		</fieldset>

		<fieldset>
			<legend>{t("How you feel")} <span class="bf-muted">{t("(5 = best)")}</span></legend>
			<Scale5 label={t("Fatigue")} low={t("very tired")} high={t("fresh")} bind:value={values.fatigue} hint={hints.fatigue} error={errors.fatigue} />
			<Scale5 label={t("Muscle soreness")} low={t("severe")} high={t("none")} bind:value={values.soreness} hint={hints.soreness} error={errors.soreness} />
			<Scale5 label={t("Mood")} low={t("very poor")} high={t("excellent")} bind:value={values.mood} hint={hints.mood} error={errors.mood} />
			<Scale5 label={t("Stress")} low={t("high", undefined, "stress")} high={t("none", undefined, "stress")} bind:value={values.stress} hint={hints.stress} error={errors.stress} />
		</fieldset>

		<fieldset>
			<legend>{t("HRV from Elonga")}</legend>
			<div class="bf-grid-3">
				<NumberField label={t("rMSSD")} unit="ms" decimals bind:value={values.rmssd_ms} hint={hints.rmssd_ms} error={errors.rmssd_ms} />
				<NumberField label={t("Resting heart rate")} unit={t("bpm")} bind:value={values.resting_hr} hint={hints.resting_hr} error={errors.resting_hr} />
				<NumberField label={t("Readiness")} unit={t("Elonga")} decimals bind:value={values.elonga_readiness} hint={hints.elonga_readiness} error={errors.elonga_readiness} />
			</div>
			<p class="bf-note">
				{t("Elonga's readiness score is only shown and isn't used in calculations – composite scores lack sufficient independent validation.")}
			</p>
		</fieldset>

		<fieldset>
			<legend>{t("Body")}</legend>
			<div class="bf-grid-3">
				<NumberField label={t("Weight")} unit="kg" decimals bind:value={values.weight_kg} hint={hints.weight_kg} error={errors.weight_kg} />
				<NumberField label={t("Steps yesterday")} bind:value={stepsYesterday} error={stepsError} />
			</div>
			<p class="bf-note">{t("Steps are optional – nutrition uses them to set your everyday activity outside training. They're saved to yesterday.")}</p>
			<details class="bf-measures" open={hasMeasures}>
				<summary>{t("Body measurements (optional)")}</summary>
				<div class="bf-grid-3">
					{#each BODY_MEASURES as measure (measure.id)}
						<NumberField label={measure.label} unit={measure.unit} decimals bind:value={values[measure.id]} hint={hints[measure.id]} error={errors[measure.id]} />
					{/each}
				</div>
				<p class="bf-note">{t("Once every 2–4 weeks is enough, always in the morning and at the same spot. Body fat makes the nutrition calculation more accurate.")}</p>
			</details>
		</fieldset>
	{/key}

	{#if saveError}<p class="bf-error">{saveError}</p>{/if}

	<div class="bf-form-buttons">
		<button type="button" onclick={onCancel}>{t("Cancel")}</button>
		<button type="submit" class="mod-cta" disabled={!valid || saving}>{saving ? t("Saving…") : t("Save")}</button>
	</div>
</form>

<style>
	.bf-checkin {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
	}

	.bf-checkin-date {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-4-2);
	}

	fieldset {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
		margin: 0;
		padding: var(--size-4-3);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
	}

	legend {
		padding: 0 var(--size-4-1);
		font-weight: var(--font-semibold);
	}

	.bf-duration {
		min-height: var(--input-height);
		display: flex;
		align-items: center;
		gap: var(--size-4-1);
	}

	.bf-note {
		margin: 0;
		font-size: var(--font-ui-smaller);
		color: var(--text-faint);
	}

	.bf-form-buttons {
		display: flex;
		justify-content: flex-end;
		gap: var(--size-4-2);
	}
</style>
