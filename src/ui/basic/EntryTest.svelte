<script lang="ts">
	// Vstupní test / retest maxim základních cviků (SPEC 5.11). Enter uloží.
	import { t } from "../../i18n";
	import { untrack } from "svelte";
	import { isIsoDate } from "../../model/dates";
	import NumInput from "../components/NumInput.svelte";
	import type { EntryTestItem, EntryTestResult } from "./types";

	interface Props {
		date: string;
		items: EntryTestItem[];
		/** Název programu, který se nabídne k aktivaci (když ještě neběží). */
		offerProgram?: string;
		onSave: (date: string, results: EntryTestResult[], activate: boolean) => Promise<void>;
		onCancel: () => void;
	}
	let { date: initialDate, items, offerProgram, onSave, onCancel }: Props = $props();

	let date = $state(untrack(() => initialDate));
	let values = $state<(number | undefined)[]>(untrack(() => items.map(() => undefined)));
	let activate = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);

	const invalid = $derived(values.map((v) => v !== undefined && (Number.isNaN(v) || !Number.isInteger(v) || v < 1 || v > 10000)));
	const filled = $derived(values.filter((v, i) => v !== undefined && !invalid[i]).length);
	const valid = $derived(isIsoDate(date) && filled > 0 && !invalid.some(Boolean));

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!valid || saving) return;
		saving = true;
		error = null;
		try {
			const results = items.flatMap((item, i) => {
				const value = values[i];
				return value === undefined ? [] : [{ exercise: item.exercise, unit: item.unit, value }];
			});
			await onSave(date, results, offerProgram !== undefined && activate);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<form class="bf-entry" onsubmit={submit}>
	<p class="bf-muted">
		{t("Po rozcvičení udělej u každého cviku co nejvíc čistých opakování v jedné sérii bez přestávky. Mezi cviky si odpočiň aspoň 3 minuty. Cvik, který teď netestuješ, nech prázdný.")}
	</p>

	<label class="bf-field bf-entry-date">
		<span class="bf-field-label">{t("Datum testu")}</span>
		<input type="date" value={date} onchange={(e) => (date = e.currentTarget.value)} />
	</label>

	<div class="bf-entry-list">
		{#each items as item, i (item.exercise)}
			<div class="bf-entry-row">
				<div>
					<strong>{item.exercise}</strong>
					{#if item.last}<span class="bf-hint"> · {item.last}</span>{/if}
				</div>
				<NumInput
					bind:value={values[i]}
					label={`${item.exercise} – maximum`}
					placeholder={item.unit === "sec" ? t("sekundy") : t("opak.")}
					error={invalid[i] ? t("Zadej celé kladné číslo.") : undefined}
				/>
			</div>
		{/each}
	</div>

	{#if offerProgram}
		<label class="bf-entry-check">
			<input type="checkbox" checked={activate} onchange={(e) => (activate = e.currentTarget.checked)} />
			<span>{t("Aktivovat program „{offerProgram}“ (začne dnes, cíle se spočítají z testu)", { offerProgram })}</span>
		</label>
	{/if}

	{#if error}<p class="bf-error">{error}</p>{/if}

	<div class="bf-form-buttons">
		<button type="button" onclick={onCancel}>{t("Zrušit")}</button>
		<button type="submit" class="mod-cta" disabled={!valid || saving}>{saving ? t("Ukládám…") : t("Uložit test ({filled})", { filled })}</button>
	</div>
</form>

<style>
	.bf-entry {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
	}

	p {
		margin: 0;
	}

	.bf-entry-date {
		max-width: 12em;
	}

	.bf-entry-list {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-entry-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 7em;
		gap: var(--size-4-3);
		align-items: center;
	}

	.bf-entry-check {
		display: flex;
		align-items: center;
		gap: var(--size-4-2);
	}

	.bf-form-buttons {
		display: flex;
		justify-content: flex-end;
		gap: var(--size-4-2);
	}
</style>
