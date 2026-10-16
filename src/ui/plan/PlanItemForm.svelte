<script lang="ts">
	// Položka plánu týdne (SPEC 5.16): den, sport, šablona nebo název, délka, intenzita.
	import { t } from "../../i18n";
	import { untrack } from "svelte";
	import type { PlanDraft } from "../../data/PlanService";
	import { PLAN_INTENSITIES, PLAN_INTENSITY_LABELS, SPORT_LABELS, type PlanIntensity, type Sport } from "../../model/constants";
	import { isIsoDate } from "../../model/dates";
	import type { PlanItem } from "../../model/types";
	import NumInput from "../components/NumInput.svelte";

	interface Props {
		date: string;
		item?: PlanItem;
		sports: Sport[];
		/** Šablony tréninků z knihovny. */
		templates: { name: string; sport: Sport }[];
		onSave: (draft: PlanDraft) => Promise<void>;
		onDelete?: () => Promise<void>;
		onCancel: () => void;
	}
	let { date: initialDate, item, sports, templates, onSave, onDelete, onCancel }: Props = $props();

	const INTENSITY_HELP: Record<PlanIntensity, string> = {
		low: t("easy, you can talk (RPE about 3)"),
		mid: t("moderately hard (RPE about 5)"),
		high: t("hard training, intervals, race (RPE about 8)"),
	};

	let date = $state(untrack(() => item?.date ?? initialDate));
	let sport = $state<Sport>(untrack(() => item?.sport ?? sports[0] ?? "strength"));
	let template = $state(untrack(() => item?.template ?? ""));
	let title = $state(untrack(() => item?.title ?? ""));
	let duration = $state<number | undefined>(untrack(() => item?.duration_min));
	let distance = $state<number | undefined>(untrack(() => item?.distance_km));
	let intensity = $state<PlanIntensity>(untrack(() => item?.intensity ?? "mid"));
	let notes = $state(untrack(() => item?.notes ?? ""));
	let saving = $state(false);
	let error = $state<string | null>(null);

	// Sport uložené položky zůstane v nabídce, i když je mezitím v nastavení vypnutý.
	const sportOptions = $derived(sports.includes(sport) ? sports : [...sports, sport]);
	const templateOptions = $derived(templates.filter((x) => x.sport === sport || x.name === template));
	const positive = (v: number | undefined) => v === undefined || (!Number.isNaN(v) && v > 0);
	const valid = $derived(isIsoDate(date) && positive(duration) && (sport !== "run" || positive(distance)));

	function pickSport(next: Sport) {
		sport = next;
		if (!templates.some((x) => x.name === template && x.sport === next)) template = "";
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!valid || saving) return;
		saving = true;
		error = null;
		try {
			await onSave({ date, sport, title, template, durationMin: duration, intensity, distanceKm: sport === "run" ? distance : undefined, notes });
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (!onDelete || saving) return;
		saving = true;
		error = null;
		try {
			await onDelete();
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<form class="bf-plan-form" onsubmit={submit}>
	<div class="bf-grid-2">
		<label class="bf-field">
			<span class="bf-field-label">{t("Day")}</span>
			<input type="date" value={date} onchange={(e) => (date = e.currentTarget.value)} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Sport")}</span>
			<select class="dropdown" value={sport} onchange={(e) => pickSport(e.currentTarget.value as Sport)}>
				{#each sportOptions as s (s)}<option value={s}>{SPORT_LABELS[s]}</option>{/each}
			</select>
		</label>
	</div>

	<div class="bf-grid-2">
		<label class="bf-field">
			<span class="bf-field-label">{t("Template")}</span>
			<select class="dropdown" value={template} onchange={(e) => (template = e.currentTarget.value)}>
				<option value="">{t("no template")}</option>
				{#each templateOptions as x (x.name)}<option value={x.name}>{x.name}</option>{/each}
			</select>
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Name")} <span class="bf-hint">{t("optional")}</span></span>
			<input type="text" value={title} placeholder={t("e.g. Tempo, Long run, Legs")} oninput={(e) => (title = e.currentTarget.value)} />
		</label>
	</div>

	<div class="bf-grid-2">
		<label class="bf-field">
			<span class="bf-field-label">{t("Duration (min)")}</span>
			<NumInput bind:value={duration} label={t("Duration (min)")} error={positive(duration) ? undefined : t("Enter a positive number")} />
		</label>
		{#if sport === "run"}
			<label class="bf-field">
				<span class="bf-field-label">{t("Distance (km)")}</span>
				<NumInput bind:value={distance} label={t("Distance (km)")} decimals error={positive(distance) ? undefined : t("Enter a positive number")} />
			</label>
		{/if}
	</div>

	<div class="bf-field">
		<span class="bf-field-label">{t("Intensity")}</span>
		<div class="bf-seg" role="group" aria-label={t("Intensity")}>
			{#each PLAN_INTENSITIES as level (level)}
				<button type="button" class:is-active={intensity === level} aria-pressed={intensity === level} onclick={() => (intensity = level)}>
					{PLAN_INTENSITY_LABELS[level]}
				</button>
			{/each}
		</div>
		<span class="bf-hint bf-plan-help">{INTENSITY_HELP[intensity]}</span>
	</div>

	<label class="bf-field">
		<span class="bf-field-label">{t("Note")} <span class="bf-hint">{t("optional")}</span></span>
		<input type="text" value={notes} oninput={(e) => (notes = e.currentTarget.value)} />
	</label>

	<p class="bf-muted bf-small bf-plan-note">
		{t("Duration and intensity are used to estimate the day's load for nutrition and the week's outlook. For a run without a duration, the time is calculated from the distance and your usual pace.")}
	</p>
	{#if error}<p class="bf-error">{error}</p>{/if}

	<div class="bf-form-buttons">
		{#if onDelete}<button type="button" class="bf-plan-delete" disabled={saving} onclick={() => void remove()}>{t("Delete")}</button>{/if}
		<button type="button" onclick={onCancel}>{t("Cancel")}</button>
		<button type="submit" class="mod-cta" disabled={!valid || saving}>{saving ? t("Saving…") : t("Save")}</button>
	</div>
</form>

<style>
	.bf-plan-form {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
	}

	/* Nápověda pod přepínačem má pevnou výšku řádku, aby formulář při přepnutí neposkočil. */
	.bf-plan-help {
		display: block;
		min-height: 1.5em;
	}

	.bf-plan-note {
		margin: 0;
	}

	.bf-form-buttons {
		display: flex;
		justify-content: flex-end;
		gap: var(--size-4-2);
	}

	.bf-plan-delete {
		margin-right: auto;
	}
</style>
