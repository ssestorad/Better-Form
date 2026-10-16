<script lang="ts">
	import { builtinName } from "../../seed/localize";
	// Tabulka normy zadaná uživatelem (SPEC 4.6): disciplíny a požadované hodnoty
	// podle pohlaví a věku. Plugin žádné normy nepředvyplňuje.
	import { t } from "../../i18n";
	import { untrack } from "svelte";
	import { formatClockDuration } from "../../calc/performance";
	import { NORM_KINDS, NORM_KIND_LABELS, type NormKind } from "../../model/constants";
	import type { NormItem, NormNote } from "../../model/types";
	import { usePlugin } from "../context";
	import { formatNumber } from "../format";
	import { parseGoalTarget } from "./text";

	interface Props {
		initial?: NormNote;
		onSave: (note: Omit<NormNote, "forma" | "schema">) => Promise<void>;
		onCancel: () => void;
	}
	let { initial, onSave, onCancel }: Props = $props();

	const plugin = usePlugin();
	const exercises = plugin.index
		.all("exercise")
		.map((e) => e.note.name)
		.sort((a, b) => a.localeCompare(b, "cs"));

	interface RowDraft {
		id: number;
		sex: "" | "male" | "female";
		ageFrom: string;
		ageTo: string;
		value: string;
	}
	interface ItemDraft {
		id: number;
		exercise: string;
		kind: NormKind;
		limit: string;
		distance: string;
		rows: RowDraft[];
	}

	let sequence = 0;
	const nextId = () => ++sequence;
	const num = (v: number | undefined) => (v === undefined ? "" : formatNumber(v, 2));
	const emptyRow = (): RowDraft => ({ id: nextId(), sex: "", ageFrom: "", ageTo: "", value: "" });
	const emptyItem = (): ItemDraft => ({ id: nextId(), exercise: "", kind: "reps", limit: "", distance: "", rows: [emptyRow()] });

	function itemToDraft(item: NormItem): ItemDraft {
		return {
			id: nextId(),
			exercise: item.exercise,
			kind: item.kind,
			limit: num(item.time_limit_s),
			distance: num(item.distance_km),
			rows: item.rows.map((row) => ({
				id: nextId(),
				sex: row.sex ?? "",
				ageFrom: num(row.age_from),
				ageTo: num(row.age_to),
				value: item.kind === "run_time" ? formatClockDuration(row.value) : num(row.value),
			})),
		};
	}

	let name = $state(untrack(() => initial?.name ?? ""));
	let items = $state<ItemDraft[]>(untrack(() => (initial && initial.items.length > 0 ? initial.items.map(itemToDraft) : [emptyItem()])));
	let saving = $state(false);
	let saveError = $state("");

	const parseNumber = (text: string): number | undefined => {
		const value = Number(text.trim().replace(",", "."));
		return text.trim() !== "" && Number.isFinite(value) && value > 0 ? value : undefined;
	};

	/** Převod formuláře na disciplíny; při chybě vrátí její popis. */
	const parsed = $derived.by((): { items: NormItem[]; error: string } => {
		const out: NormItem[] = [];
		if (name.trim() === "") return { items: out, error: t("Enter a name for the standard.") };
		for (const [i, item] of items.entries()) {
			const label = t("Event {v}", { v: i + 1 });
			const exercise = item.kind === "run_time" ? item.exercise.trim() || builtinName("exercise", "running") : (plugin.exerciseInfo(item.exercise)?.name ?? "");
			if (!exercise) return { items: out, error: t("{label}: choose an exercise from the library.", { label }) };
			const distance = parseNumber(item.distance);
			if (item.kind === "run_time" && distance === undefined) return { items: out, error: t("{label}: enter the distance in km.", { label }) };
			const rows = [];
			for (const row of item.rows) {
				const value = parseGoalTarget(row.value, item.kind === "run_time" ? "time" : "reps");
				if (value === null) {
					return { items: out, error: t("{label}: enter the required value{v}.", { label, v: item.kind === "run_time" ? t(" as mm:ss") : item.kind === "hold" ? t(" in seconds") : "" }) };
				}
				rows.push({ sex: row.sex || undefined, age_from: parseNumber(row.ageFrom), age_to: parseNumber(row.ageTo), value });
			}
			out.push({
				exercise,
				kind: item.kind,
				time_limit_s: item.kind === "reps" ? parseNumber(item.limit) : undefined,
				distance_km: item.kind === "run_time" ? distance : undefined,
				rows,
			});
		}
		return { items: out, error: "" };
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (parsed.error) return;
		saving = true;
		saveError = "";
		try {
			await onSave({ name: name.trim(), items: parsed.items, notes: initial?.notes });
		} catch (err) {
			saveError = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<form class="bf-norm-form" onsubmit={submit}>
	<label class="bf-field">
		<span class="bf-field-label">{t("Standard name")}</span>
		<input type="text" bind:value={name} placeholder={t("e.g. Fitness tests")} disabled={initial !== undefined} />
	</label>

	{#each items as item, i (item.id)}
		<fieldset class="bf-norm-item">
			<legend>{t("Event {v}", { v: i + 1 })}</legend>
			<div class="bf-grid-2">
				<label class="bf-field">
					<span class="bf-field-label">{t("What's measured")}</span>
					<select bind:value={item.kind}>
						{#each NORM_KINDS as kind (kind)}
							<option value={kind}>{NORM_KIND_LABELS[kind]}</option>
						{/each}
					</select>
				</label>
				{#if item.kind === "run_time"}
					<label class="bf-field">
						<span class="bf-field-label">{t("Distance (km)")}</span>
						<input type="text" inputmode="decimal" bind:value={item.distance} placeholder="3" />
					</label>
				{:else}
					<label class="bf-field">
						<span class="bf-field-label">{t("Exercise")}</span>
						<input type="text" list="bf-norm-exercises" bind:value={item.exercise} placeholder={t("start typing an exercise name")} />
					</label>
				{/if}
			</div>
			{#if item.kind === "reps"}
				<label class="bf-field">
					<span class="bf-field-label">{t("Time limit (s)")} <span class="bf-hint">{t("optional, e.g. 120")}</span></span>
					<input type="text" inputmode="numeric" bind:value={item.limit} />
				</label>
			{/if}

			<div class="bf-norm-rows">
				<div class="bf-norm-row bf-muted bf-norm-small">
					<span>{t("Sex")}</span><span>{t("Age from")}</span><span>{t("Age to")}</span><span>{item.kind === "run_time" ? t("Time (mm:ss)") : item.kind === "hold" ? t("Seconds") : t("Reps")}</span><span></span>
				</div>
				{#each item.rows as row (row.id)}
					<div class="bf-norm-row">
						<select bind:value={row.sex} aria-label={t("Sex")}>
							<option value="">{t("everyone")}</option>
							<option value="male">{t("men")}</option>
							<option value="female">{t("women")}</option>
						</select>
						<input type="text" inputmode="numeric" bind:value={row.ageFrom} aria-label={t("Age from")} />
						<input type="text" inputmode="numeric" bind:value={row.ageTo} aria-label={t("Age to")} />
						<input type="text" bind:value={row.value} aria-label={t("Required value")} />
						<button type="button" aria-label={t("Remove row")} disabled={item.rows.length === 1} onclick={() => (item.rows = item.rows.filter((r) => r.id !== row.id))}>×</button>
					</div>
				{/each}
			</div>
			<div class="bf-actions">
				<button type="button" onclick={() => item.rows.push(emptyRow())}>{t("Add row")}</button>
				<button type="button" disabled={items.length === 1} onclick={() => (items = items.filter((it) => it.id !== item.id))}>{t("Remove event")}</button>
			</div>
		</fieldset>
	{/each}
	<datalist id="bf-norm-exercises">
		{#each exercises as e (e)}
			<option value={e}></option>
		{/each}
	</datalist>

	<p class="bf-muted bf-norm-small">
		{t("A row without sex and age applies to everyone; when several match, the more specific one is used. Sex and year of birth come from your profile in the settings.")}
	</p>
	{#if parsed.error}<div class="bf-error">{parsed.error}</div>{/if}
	{#if saveError}<div class="bf-error">{saveError}</div>{/if}
	<div class="bf-actions">
		<button type="button" onclick={() => items.push(emptyItem())}>{t("Add event")}</button>
		<button type="submit" class="mod-cta" disabled={!!parsed.error || saving}>{initial ? t("Save standard") : t("Create standard")}</button>
		<button type="button" onclick={onCancel}>{t("Cancel")}</button>
	</div>
</form>

<style>
	p {
		margin: 0;
	}

	.bf-norm-form {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-norm-form select {
		width: 100%;
	}

	.bf-norm-item {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		margin: 0;
		padding: var(--size-4-2);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
	}

	.bf-norm-rows {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-1);
	}

	/* Pevné sloupce tabulky řádků. */
	.bf-norm-row {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 0.8fr) minmax(0, 1.1fr) 32px;
		gap: var(--size-4-1);
		align-items: center;
	}

	.bf-norm-row input,
	.bf-norm-row select {
		width: 100%;
		min-width: 0;
	}

	.bf-norm-row button {
		padding: 0;
	}

	.bf-norm-small {
		font-size: var(--font-ui-smaller);
	}
</style>
