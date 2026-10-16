<script lang="ts">
	// Formulář suplementu: dávka, jednotka, kdy brát. Název jde zadat jen u nového vlastního.
	import { t } from "../../i18n";
	import { untrack } from "svelte";
	import { checkUpperLimit } from "../../calc/supplements";
	import type { SupplementDraft } from "../../data/SupplementService";
	import { SUPPLEMENT_TIMINGS, SUPPLEMENT_TIMING_LABELS } from "../../model/constants";
	import NumInput from "../components/NumInput.svelte";
	import { CAFFEINE_EVENING_WARNING, limitMessage } from "./text";

	interface Props {
		initial: SupplementDraft;
		/** Nový vlastní suplement – název se zadává. */
		nameEditable?: boolean;
		saveLabel?: string;
		onSave: (draft: SupplementDraft) => void;
		onCancel: () => void;
	}
	let { initial, nameEditable = false, saveLabel = t("Uložit"), onSave, onCancel }: Props = $props();

	// Kopie – úpravy se propíšou až po uložení.
	let draft = $state<SupplementDraft>(untrack(() => ({ ...initial })));

	const doseError = $derived(
		draft.dose !== undefined && (Number.isNaN(draft.dose) || draft.dose <= 0) ? t("Dávka musí být kladné číslo.") : undefined,
	);
	const nameError = $derived(nameEditable && draft.name.trim() === "" ? t("Zadej název.") : undefined);
	const warning = $derived.by(() => {
		if (doseError) return null;
		const limit = limitMessage(checkUpperLimit(draft.catalog, draft.dose, draft.unit));
		// Kofein večer zkracuje spánek i 6 h před ulehnutím (Drake 2013).
		const late = draft.catalog === "caffeine" && draft.timing === "evening" ? t(CAFFEINE_EVENING_WARNING) : null;
		return [limit, late].filter((m) => m !== null).join(" ") || null;
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (doseError || nameError) return;
		onSave({ ...draft, name: draft.name.trim() });
	}
</script>

<form class="bf-supp-form" onsubmit={submit}>
	{#if nameEditable}
		<label class="bf-field">
			<span class="bf-field-label">{t("Název")}</span>
			<input type="text" bind:value={draft.name} placeholder={t("např. Elektrolyty")} />
		</label>
	{/if}
	<div class="bf-supp-grid">
		<label class="bf-field">
			<span class="bf-field-label">{t("Denní dávka")}</span>
			<NumInput bind:value={draft.dose} label={t("Denní dávka")} decimals error={doseError} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Jednotka")}</span>
			<input type="text" bind:value={draft.unit} placeholder={t("g, mg, µg, IU, kapsle")} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Kdy")}</span>
			<select class="dropdown" bind:value={draft.timing}>
				{#each SUPPLEMENT_TIMINGS as timing (timing)}
					<option value={timing}>{SUPPLEMENT_TIMING_LABELS[timing]}</option>
				{/each}
			</select>
		</label>
	</div>
	<label class="bf-supp-check">
		<input type="checkbox" bind:checked={draft.trainingDaysOnly} />
		{t("Jen ve dnech s tréninkem")}
	</label>
	{#if doseError}<div class="bf-error">{doseError}</div>{/if}
	{#if warning}<div class="bf-supp-warning">{warning}</div>{/if}
	<div class="bf-actions">
		<button type="submit" class="mod-cta" disabled={!!doseError || !!nameError}>{saveLabel}</button>
		<button type="button" onclick={onCancel}>{t("Zrušit")}</button>
	</div>
</form>

<style>
	.bf-supp-form {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-supp-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--size-4-2);
	}

	.bf-supp-grid select {
		width: 100%;
	}

	.bf-supp-check {
		display: flex;
		align-items: center;
		gap: var(--size-4-2);
		font-size: var(--font-ui-small);
	}

	.bf-supp-warning {
		color: var(--color-orange);
		font-size: var(--font-ui-small);
	}
</style>
