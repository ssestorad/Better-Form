<script lang="ts">
	// Vlastní přípravek podle etikety: fotka slouží jako předloha a uloží se k poznámce,
	// látky se vyčtou z vloženého textu složení. Plugin sám text z obrázku nečte.
	import { t } from "../../i18n";
	import { parseLabelText } from "../../calc/labelText";
	import { ingredientWarnings } from "../../calc/supplements";
	import type { LabelPhoto, SupplementDraft } from "../../data/SupplementService";
	import { SUPPLEMENT_TIMINGS, SUPPLEMENT_TIMING_LABELS, type SupplementTiming } from "../../model/constants";
	import { catalogSupplement, labelCatalogId } from "../../seed/supplements";
	import NumInput from "../components/NumInput.svelte";
	import { doseLabel, limitMessage } from "./text";

	interface Props {
		onSave: (draft: SupplementDraft, photo?: LabelPhoto) => void;
		onCancel: () => void;
	}
	let { onSave, onCancel }: Props = $props();

	let name = $state("");
	let text = $state("");
	let servings = $state<number | undefined>(1);
	let unit = $state("porce");
	let timing = $state<SupplementTiming>("any");
	let trainingDaysOnly = $state(false);
	/** Názvy řádků, které uživatel odškrtl (nadpisy, omyly čtení). */
	let skipped = $state<string[]>([]);

	let photo = $state<File | null>(null);
	const photoUrl = $derived(photo ? URL.createObjectURL(photo) : null);
	$effect(() => {
		const url = photoUrl;
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	});

	const rows = $derived(parseLabelText(text).map((row) => ({ ...row, catalog: labelCatalogId(row.name) })));
	const chosen = $derived(rows.filter((row) => !skipped.includes(row.name)));
	const warnings = $derived(ingredientWarnings(chosen, servings));
	const nameError = $derived(name.trim() === "" ? t("Zadej název přípravku.") : undefined);
	const servingsError = $derived(servings !== undefined && (Number.isNaN(servings) || servings <= 0) ? t("Počet porcí musí být kladné číslo.") : undefined);

	function toggle(rowName: string, on: boolean) {
		skipped = on ? skipped.filter((n) => n !== rowName) : [...skipped, rowName];
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (nameError || servingsError) return;
		const extension = /^[a-z0-9]{1,5}$/.exec((photo?.name.split(".").pop() ?? "").toLowerCase())?.[0] ?? "jpg";
		onSave(
			{
				name: name.trim(),
				dose: servings,
				unit: unit.trim() || undefined,
				timing,
				trainingDaysOnly,
				ingredients: chosen.map((row) => ({ name: row.name, amount: row.amount, unit: row.unit, ...(row.catalog ? { catalog: row.catalog } : {}) })),
			},
			photo ? { extension, data: await photo.arrayBuffer() } : undefined,
		);
	}
</script>

<form class="bf-label-form" onsubmit={submit}>
	<label class="bf-field">
		<span class="bf-field-label">{t("Název přípravku")}</span>
		<input type="text" bind:value={name} placeholder={t("např. Multivitamin ABC")} />
	</label>

	<div class="bf-label-source">
		<div class="bf-label-photo">
			<label class="bf-field">
				<span class="bf-field-label">{t("Fotka etikety (nepovinná)")}</span>
				<input type="file" accept="image/*" onchange={(e) => (photo = e.currentTarget.files?.[0] ?? null)} />
			</label>
			{#if photoUrl}
				<img src={photoUrl} alt={t("Vybraná fotka etikety")} />
			{/if}
		</div>
		<label class="bf-field bf-label-text">
			<span class="bf-field-label">{t("Text složení z etikety")}</span>
			<textarea rows="8" bind:value={text} placeholder={t("Vitamin C 80 mg\nHořčík 375 mg\nZinek 10 mg")}></textarea>
		</label>
	</div>
	<p class="bf-muted bf-small">
		{t("Plugin text z obrázku sám nečte. Zkopíruj ho z fotky – v telefonu podrž prst na textu ve fotce (iPhone: Živý text, Android: Google Lens), ve Windows Výstřižky → Akce s textem – nebo složení opiš, jedna látka na řádek. Fotka se uloží k poznámce suplementu.")}
	</p>

	{#if rows.length > 0}
		<div class="bf-label-rows">
			<span class="bf-field-label">{t("Vyčtené látky v jedné porci ({chosen_length} z {rows_length})", { chosen_length: chosen.length, rows_length: rows.length })}</span>
			{#each rows as row (row.name)}
				<label class="bf-label-row">
					<input type="checkbox" checked={!skipped.includes(row.name)} onchange={(e) => toggle(row.name, e.currentTarget.checked)} />
					<span>{row.name}</span>
					<span class="bf-muted">{doseLabel(row.amount, row.unit)}</span>
					{#if row.catalog}
						<span class="bf-tag" title={t("Rozpoznáno v katalogu – pokud má látka horní limit, hlídá se")}>{catalogSupplement(row.catalog)?.name}</span>
					{/if}
				</label>
			{/each}
			<span class="bf-muted bf-small">{t("Zkontroluj čísla proti etiketě. Chybný řádek oprav přímo v textu nahoře, nadbytečný odškrtni.")}</span>
		</div>
	{:else if text.trim() !== ""}
		<p class="bf-muted bf-small">{t("V textu jsem nenašel žádný řádek s množstvím (např. „Hořčík 375 mg“).")}</p>
	{/if}

	<div class="bf-label-grid">
		<label class="bf-field">
			<span class="bf-field-label">{t("Porcí denně")}</span>
			<NumInput bind:value={servings} label={t("Porcí denně")} decimals error={servingsError} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Porce je")}</span>
			<input type="text" bind:value={unit} placeholder={t("tableta, kapsle, odměrka")} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Kdy")}</span>
			<select class="dropdown" bind:value={timing}>
				{#each SUPPLEMENT_TIMINGS as x (x)}
					<option value={x}>{SUPPLEMENT_TIMING_LABELS[x]}</option>
				{/each}
			</select>
		</label>
	</div>
	<label class="bf-label-check">
		<input type="checkbox" bind:checked={trainingDaysOnly} />
		{t("Jen ve dnech s tréninkem")}
	</label>

	{#if servingsError}<div class="bf-error">{servingsError}</div>{/if}
	{#each warnings as warning (warning.name)}
		<div class="bf-label-warning">{warning.name}: {limitMessage(warning.check)}</div>
	{/each}
	<div class="bf-actions">
		<button type="submit" class="mod-cta" disabled={!!nameError || !!servingsError}>{t("Přidat")}</button>
		<button type="button" onclick={onCancel}>{t("Zrušit")}</button>
	</div>
</form>

<style>
	.bf-label-form {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-label-source {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-3);
	}

	.bf-label-photo {
		display: flex;
		flex: 1 1 200px;
		flex-direction: column;
		gap: var(--size-4-2);
		min-width: 0;
	}

	.bf-label-photo img {
		max-width: 100%;
		max-height: 320px;
		object-fit: contain;
		border-radius: var(--radius-s);
	}

	.bf-label-photo input[type="file"] {
		max-width: 100%;
	}

	.bf-label-text {
		flex: 2 1 260px;
		min-width: 0;
	}

	.bf-label-text textarea {
		width: 100%;
		resize: vertical;
	}

	.bf-label-rows {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.bf-label-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-2);
		align-items: center;
		font-size: var(--font-ui-small);
	}

	.bf-label-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--size-4-2);
	}

	.bf-label-grid select {
		width: 100%;
	}

	.bf-label-check {
		display: flex;
		gap: var(--size-4-2);
		align-items: center;
		font-size: var(--font-ui-small);
	}

	.bf-label-warning {
		color: var(--color-orange);
		font-size: var(--font-ui-small);
	}
</style>
