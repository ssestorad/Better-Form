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
				? t("Není číslo.")
				: stepsYesterday < 0 || stepsYesterday > MAX_STEPS
					? t("Rozsah 0–{MAX_STEPS}.", { MAX_STEPS })
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
		<label for="bf-checkin-date">{t("Datum")}</label>
		<input
			id="bf-checkin-date"
			type="date"
			value={values.date}
			onchange={(e) => changeDate(e.currentTarget.value)}
		/>
		<span class="bf-muted">{formatCzechDate(values.date)}{existing ? t(" · upravuješ uložený check-in") : ""}</span>
	</div>

	{#key formKey}
		<fieldset>
			<legend>{t("Spánek")}</legend>
			<div class="bf-grid-3">
				<!-- Ráno se začíná tím nejjistějším (vstávání), pak zpětně večer. -->
				<TimeField label={t("Vstávání")} note={timeNote("wake", values.wake)} bind:value={values.wake} />
				<TimeField label={t("Ulehnutí")} note={timeNote("bedtime", values.bedtime)} bind:value={values.bedtime} />
				<TimeField
					label={t("Usnutí (odhad)")}
					note={timeNote("sleep_onset", values.sleep_onset)}
					bind:value={values.sleep_onset}
					error={errors.sleep_onset}
				/>
			</div>
			<div class="bf-grid-2">
				<div class="bf-field">
					<div class="bf-field-label"><span>{t("Délka spánku")}</span></div>
					<div class="bf-duration">
						{#if values.duration_min !== undefined && !Number.isNaN(values.duration_min)}
							{formatDurationMin(values.duration_min)} <span class="bf-muted">{t("(ručně)")}</span>
						{:else if computedDuration !== null}
							{formatDurationMin(computedDuration)}
						{:else}
							<span class="bf-muted">{t("doplň časy")}</span>
						{/if}
					</div>
				</div>
				<NumberField
					label={t("Přepsat délku")}
					unit="min"
					bind:value={values.duration_min}
					placeholder={computedDuration !== null ? String(computedDuration) : ""}
					error={errors.duration_min}
				/>
			</div>
			<Scale5 label={t("Kvalita spánku")} low="velmi špatná" high="výborná" bind:value={values.quality} hint={hints.quality} error={errors.quality} />
			<div class="bf-grid-2">
				<NumberField label={t("Probuzení v noci")} unit="×" bind:value={values.awakenings} hint={hints.awakenings} error={errors.awakenings} />
			</div>
			<Scale5 label={t("Pocit ráno")} low="velmi špatný" high="výborný" bind:value={values.morning_feeling} hint={hints.morning_feeling} error={errors.morning_feeling} />
		</fieldset>

		<fieldset>
			<legend>{t("Pocity")} <span class="bf-muted">{t("(5 = nejlepší)")}</span></legend>
			<Scale5 label={t("Únava")} low="velká únava" high="svěžest" bind:value={values.fatigue} hint={hints.fatigue} error={errors.fatigue} />
			<Scale5 label={t("Bolest svalů")} low="silná" high="žádná" bind:value={values.soreness} hint={hints.soreness} error={errors.soreness} />
			<Scale5 label={t("Nálada")} low="velmi špatná" high="výborná" bind:value={values.mood} hint={hints.mood} error={errors.mood} />
			<Scale5 label={t("Stres")} low="velký" high="žádný" bind:value={values.stress} hint={hints.stress} error={errors.stress} />
		</fieldset>

		<fieldset>
			<legend>{t("HRV z Elongy")}</legend>
			<div class="bf-grid-3">
				<NumberField label={t("rMSSD")} unit="ms" decimals bind:value={values.rmssd_ms} hint={hints.rmssd_ms} error={errors.rmssd_ms} />
				<NumberField label={t("Klidový tep")} unit={t("tep/min")} bind:value={values.resting_hr} hint={hints.resting_hr} error={errors.resting_hr} />
				<NumberField label={t("Připravenost")} unit={t("Elonga")} decimals bind:value={values.elonga_readiness} hint={hints.elonga_readiness} error={errors.elonga_readiness} />
			</div>
			<p class="bf-note">
				{t("Skóre připravenosti Elongy se jen zobrazuje, do výpočtů nevstupuje – složená skóre nemají dostatečnou nezávislou validaci.")}
			</p>
		</fieldset>

		<fieldset>
			<legend>{t("Tělo")}</legend>
			<div class="bf-grid-3">
				<NumberField label={t("Váha")} unit="kg" decimals bind:value={values.weight_kg} hint={hints.weight_kg} error={errors.weight_kg} />
				<NumberField label={t("Kroky včera")} bind:value={stepsYesterday} error={stepsError} />
			</div>
			<p class="bf-note">{t("Kroky jsou nepovinné – podle nich se ve výživě určuje běžná aktivita mimo trénink. Ukládají se ke včerejšku.")}</p>
			<details class="bf-measures" open={hasMeasures}>
				<summary>{t("Tělesné míry (nepovinné)")}</summary>
				<div class="bf-grid-3">
					{#each BODY_MEASURES as measure (measure.id)}
						<NumberField label={measure.label} unit={measure.unit} decimals bind:value={values[measure.id]} hint={hints[measure.id]} error={errors[measure.id]} />
					{/each}
				</div>
				<p class="bf-note">{t("Stačí jednou za 2–4 týdny, vždy ráno a na stejném místě. Podíl tuku zpřesní výpočet výživy.")}</p>
			</details>
		</fieldset>
	{/key}

	{#if saveError}<p class="bf-error">{saveError}</p>{/if}

	<div class="bf-form-buttons">
		<button type="button" onclick={onCancel}>{t("Zrušit")}</button>
		<button type="submit" class="mod-cta" disabled={!valid || saving}>{saving ? t("Ukládám…") : t("Uložit")}</button>
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
