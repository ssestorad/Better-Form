<script lang="ts">
	// Režim Základ (SPEC 5.11): karty základních cviků a běhu, rychlý zápis, vstupní test.
	import { t } from "../../i18n";
	import { hasCheckIn } from "../../calc/checkIn";
	import { daySummary } from "../../data/dayBlock";
	import { toIsoDate } from "../../model/dates";
	import CardioCard from "../basic/CardioCard.svelte";
	import ExerciseCard from "../basic/ExerciseCard.svelte";
	import { usePlugin } from "../context";
	import { formatCzechDate } from "../format";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const SITUPS = "Sedy-lehy"; // i18n-ignore: název cviku v knihovně (data)
	const ALTERNATIVES = ["Zkracovačky", "Plank"]; // i18n-ignore: názvy cviků v knihovně (data)

	const today = $derived.by(() => {
		void $indexVersion;
		return toIsoDate(new Date());
	});
	const day = $derived.by(() => {
		void $indexVersion;
		return plugin.index.day(today)?.note;
	});
	const summary = $derived(daySummary(day));
	const situpAlternative = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.situpAlternative;
	});
	// Karty podle nastavení; sedy-lehy může nahradit šetrnější alternativa.
	const cards = $derived.by(() => {
		void $settingsVersion;
		void $indexVersion;
		return plugin.settings.basicExercises.map((name) => {
			const isSitup = plugin.workouts.isSameExercise(name, SITUPS);
			const exercise = isSitup && situpAlternative ? situpAlternative : name;
			return { key: name, exercise, isSitup, cardio: plugin.workouts.exerciseInfo(exercise)?.category === "cardio" };
		});
	});
	const strength = $derived(cards.filter((c) => !c.cardio).map((c) => c.exercise));
	// Vstupní test se nabízí, dokud žádný ze silových cviků nemá test maxima.
	const needsEntryTest = $derived.by(() => {
		void $indexVersion;
		const tests = plugin.index.all("test");
		return strength.length > 0 && !strength.some((e) => tests.some((x) => plugin.workouts.isSameExercise(x.note.exercise, e)));
	});

	async function setAlternative(value: string) {
		plugin.settings.situpAlternative = value;
		await plugin.saveSettings();
	}
</script>

<p class="bf-date">{formatCzechDate(today)}</p>

<section class="bf-card">
	<header class="bf-basic-row">
		<h4>{t("Ranní check-in")}</h4>
		<button type="button" class:mod-cta={!hasCheckIn(day)} onclick={() => plugin.openCheckIn(today)}>
			{hasCheckIn(day) ? t("Upravit") : t("Vyplnit")}
		</button>
	</header>
	{#if hasCheckIn(day)}
		<p class="bf-muted bf-small">{[summary.sleep, summary.feelings].filter(Boolean).join(" · ")}</p>
	{/if}
</section>

{#if needsEntryTest}
	<section class="bf-card">
		<h4>{t("Začni vstupním testem")}</h4>
		<p class="bf-muted bf-small">{t("Zjisti své maximum u každého cviku. Podle něj se počítají cíle programu Základ 4.")}</p>
		<div class="bf-actions">
			<button type="button" class="mod-cta" onclick={() => plugin.openEntryTest()}>{t("Vstupní test")}</button>
		</div>
	</section>
{/if}

{#each cards as card (card.key)}
	{#if card.cardio}
		<CardioCard exercise={card.exercise} date={today} />
	{:else}
		<ExerciseCard exercise={card.exercise} date={today} />
		{#if card.isSitup}
			<!-- Šetrnější alternativa k sedům-lehům (SPEC 5.11). -->
			<label class="bf-situp">
				<span class="bf-muted">{t("Nepotřebuješ sedy-lehy kvůli testu? Šetrnější varianta:")}</span>
				<select class="dropdown" value={situpAlternative} onchange={(e) => void setAlternative(e.currentTarget.value)}>
					<option value="">{plugin.exerciseInfo(SITUPS)?.name ?? SITUPS}</option>
					{#each ALTERNATIVES as alt (alt)}<option value={alt}>{alt}</option>{/each}
				</select>
			</label>
		{/if}
	{/if}
{/each}

<div class="bf-actions">
	{#if !needsEntryTest}
		<button type="button" onclick={() => plugin.openEntryTest()}>{t("Přetestovat maxima")}</button>
	{/if}
	<button type="button" onclick={() => void plugin.days.openDayNote(today)}>{t("Denní poznámka")}</button>
	<button type="button" onclick={() => void plugin.setMode("full")}>{t("Přepnout na plný režim")}</button>
</div>

<style>
	.bf-date {
		margin: 0;
		color: var(--text-muted);
		text-transform: capitalize;
	}

	h4,
	p {
		margin: 0;
	}

	.bf-basic-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-small {
		font-size: var(--font-ui-small);
	}

	.bf-situp {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-4-2);
		font-size: var(--font-ui-small);
	}
</style>
