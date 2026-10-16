<script lang="ts">
	// Úvodní průvodce: profil pro výpočty, cíl, běžný den, režim a sporty. Vše jde
	// později změnit v nastavení; prázdná pole profilu se dají doplnit kdykoli.
	import { t } from "../../i18n";
	import { SPORT_LABELS, SPORTS } from "../../model/constants";
	import { onboardingMissing, validateOnboarding, type OnboardingValues } from "../../settings/onboarding";
	import type { ActivityLevel, AppMode, BodyGoal, SettingsSex } from "../../settings/settings";
	import NumberField from "../components/NumberField.svelte";

	interface Props {
		initial: OnboardingValues;
		/** První spuštění – jiný úvodní text. */
		first: boolean;
		onSave: (values: OnboardingValues) => Promise<void>;
		onCancel: () => void;
	}
	let { initial, first, onSave, onCancel }: Props = $props();

	// svelte-ignore state_referenced_locally
	let values = $state<OnboardingValues>(structuredClone(initial));
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	const year = new Date().getFullYear();
	const errors = $derived(validateOnboarding(values, year));
	const valid = $derived(Object.keys(errors).length === 0);
	const missing = $derived(onboardingMissing(values));

	const SEXES: { value: SettingsSex | ""; label: string }[] = [
		{ value: "", label: t("not set") },
		{ value: "male", label: t("male") },
		{ value: "female", label: t("female") },
	];
	const GOALS: { value: BodyGoal; label: string }[] = [
		{ value: "lose", label: t("lose weight") },
		{ value: "maintain", label: t("maintain") },
		{ value: "gain", label: t("gain") },
	];
	const ACTIVITIES: { value: ActivityLevel; label: string }[] = [
		{ value: "sedentary", label: t("sedentary – I sit most of the day (school, office)") },
		{ value: "light", label: t("lightly active – on my feet part of the day or walking a lot") },
		{ value: "active", label: t("active – physical work, on the move most of the day") },
	];
	const MODES: { value: AppMode; label: string; help: string }[] = [
		{ value: "full", label: t("Full"), help: t("all tabs: overviews, body, skills, programs, goals, nutrition, supplements") },
		{ value: "basic", label: t("Basic"), help: t("only basic exercises and running with quick logging; advanced tabs are hidden") },
	];

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!valid || saving) return;
		saving = true;
		saveError = null;
		try {
			await onSave($state.snapshot(values) as OnboardingValues);
		} catch (err) {
			saveError = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<form class="bf-onb" onsubmit={submit}>
	<p class="bf-muted">
		{t("{v} They stay only in this vault and you can change everything later in the settings.", { v: first ? t("The folders and exercise library are ready. Just a few details the plugin uses for its calculations.") : t("Details the plugin uses for its calculations.") })}
	</p>

	<fieldset>
		<legend>{t("About you")}</legend>
		<div class="bf-grid-3">
			<label class="bf-field">
				<span class="bf-field-label">{t("Sex")}</span>
				<select bind:value={values.sex}>
					{#each SEXES as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
				</select>
			</label>
			<NumberField label={t("Year of birth")} bind:value={values.birthYear} error={errors.birthYear} />
			<NumberField label={t("Height")} unit="cm" decimals bind:value={values.heightCm} error={errors.heightCm} />
		</div>
		<div class="bf-grid-3">
			<NumberField label={t("Weight")} unit="kg" decimals bind:value={values.weightKg} error={errors.weightKg} />
			<NumberField label={t("Body fat")} unit="%" decimals bind:value={values.bodyFatPct} error={errors.bodyFatPct} />
		</div>
		<p class="bf-note">
			{t("Sex, age, height and weight are used to calculate nutrition; age also for heart rate zones and standards. Then log your weight in the morning check-in – the latest one is used. Body fat is optional.")}
		</p>
	</fieldset>

	<fieldset>
		<legend>{t("Goal and a typical day")}</legend>
		<div class="bf-grid-2">
			<label class="bf-field">
				<span class="bf-field-label">{t("Goal")}</span>
				<select bind:value={values.goal}>
					{#each GOALS as g (g.value)}<option value={g.value}>{g.label}</option>{/each}
				</select>
			</label>
			<NumberField label={t("Workouts per week")} bind:value={values.weeklyWorkoutGoal} error={errors.weeklyWorkoutGoal} />
		</div>
		<label class="bf-field">
			<span class="bf-field-label">{t("Typical day outside training")}</span>
			<select bind:value={values.activity}>
				{#each ACTIVITIES as a (a.value)}<option value={a.value}>{a.label}</option>{/each}
			</select>
		</label>
		<p class="bf-note">{t("Workouts are counted separately in nutrition. If you log steps, your everyday activity is set from them.")}</p>
	</fieldset>

	<fieldset>
		<legend>{t("How do you want to use the plugin")}</legend>
		<div class="bf-onb-modes" role="radiogroup" aria-label={t("Mode")}>
			{#each MODES as m (m.value)}
				<label class="bf-onb-mode" class:is-active={values.mode === m.value}>
					<input type="radio" name="bf-onb-mode" value={m.value} bind:group={values.mode} />
					<span><strong>{m.label}</strong> – {m.help}</span>
				</label>
			{/each}
		</div>
		<div class="bf-field">
			<span class="bf-field-label">{t("Sports")}</span>
			<div class="bf-onb-sports">
				{#each SPORTS as sport (sport)}
					<label><input type="checkbox" bind:checked={values.sports[sport]} /> {SPORT_LABELS[sport]}</label>
				{/each}
			</div>
			{#if errors.sports}<span class="bf-error">{errors.sports}</span>{/if}
		</div>
	</fieldset>

	{#if missing.length > 0}
		<p class="bf-note">{t("Without these details nutrition can't be calculated yet: {v}. You can add them later.", { v: missing.join(", ") })}</p>
	{/if}
	{#if saveError}<p class="bf-error">{saveError}</p>{/if}

	<div class="bf-onb-buttons">
		<button type="button" onclick={onCancel}>{t("Later")}</button>
		<button type="submit" class="mod-cta" disabled={!valid || saving}>{saving ? t("Saving…") : t("Save")}</button>
	</div>
</form>

<style>
	.bf-onb {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
	}

	p {
		margin: 0;
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

	select {
		width: 100%;
	}

	.bf-note {
		font-size: var(--font-ui-smaller);
		color: var(--text-faint);
	}

	.bf-onb-modes {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-onb-mode {
		display: flex;
		align-items: baseline;
		gap: var(--size-4-2);
		padding: var(--size-4-2);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		cursor: pointer;
	}

	/* Výběr jen barvou okraje – bez změny rozměrů. */
	.bf-onb-mode.is-active {
		border-color: var(--interactive-accent);
	}

	.bf-onb-sports {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-1) var(--size-4-4);
	}

	.bf-onb-sports label {
		display: inline-flex;
		align-items: center;
		gap: var(--size-4-1);
	}

	.bf-onb-buttons {
		display: flex;
		justify-content: flex-end;
		gap: var(--size-4-2);
	}
</style>
