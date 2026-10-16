<script lang="ts">
	// Karta Zapsat: nový trénink podle sportu, ze šablony, úprava posledních tréninků.
	import { t } from "../../i18n";
	import { workoutDetails, workoutLabel } from "../../data/dayBlock";
	import { SPORT_LABELS, type Sport } from "../../model/constants";
	import { toIsoDate } from "../../model/dates";
	import { usePlugin } from "../context";
	import { formatShortDate } from "../format";
	import StravaCard from "../strava/StravaCard.svelte";
	import { normalizeSearch } from "../workout/search";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	let query = $state("");

	const sports = $derived.by(() => {
		void $settingsVersion;
		return (Object.keys(plugin.settings.sports) as Sport[]).filter((s) => plugin.settings.sports[s]);
	});
	const templates = $derived.by(() => {
		void $indexVersion;
		const q = normalizeSearch(query);
		return plugin.index
			.all("template")
			.filter((x) => q === "" || normalizeSearch(x.note.name).includes(q))
			.sort((a, b) => a.note.name.localeCompare(b.note.name, "cs"));
	});
	// Aktivní programy, které mají dnes něco k zapsání (kromě denního počítadla).
	const programsToday = $derived.by(() => {
		void $indexVersion;
		return plugin.programs
			.active(toIsoDate(new Date()))
			.filter((p) => p.tasks.some((x) => x.target.kind !== "daily_total"));
	});
	const hasTemplates = $derived.by(() => {
		void $indexVersion;
		return plugin.index.all("template").length > 0;
	});
	const recent = $derived.by(() => {
		void $indexVersion;
		return plugin.index.workouts().slice(0, 8);
	});
</script>

<StravaCard />

<section class="bf-card">
	<h4>{t("New workout")}</h4>
	<div class="bf-log-sports">
		{#each sports as sport (sport)}
			<button type="button" onclick={() => plugin.openWorkout({ sport })}>{SPORT_LABELS[sport]}</button>
		{/each}
	</div>
</section>

{#if programsToday.length > 0}
	<section class="bf-card">
		<h4>{t("From today's program")}</h4>
		<div class="bf-log-sports">
			{#each programsToday as p (p.entry.file.path)}
				<button type="button" onclick={() => plugin.openWorkout({ program: p.entry.file })}>{p.entry.note.name}</button>
			{/each}
		</div>
	</section>
{/if}

<section class="bf-card">
	<h4>{t("From a template")}</h4>
	{#if !hasTemplates}
		<p class="bf-muted">{t("No templates yet – save a workout with the “Save as template” button.")}</p>
	{:else}
		<input type="search" placeholder={t("Search templates…")} bind:value={query} />
		<ul class="bf-list">
			{#each templates as x (x.file.path)}
				<li>
					<button type="button" class="bf-link-button" onclick={() => plugin.openWorkout({ template: x.file })}>
						{x.note.name}
					</button>
					<span class="bf-muted"> {t("· {v} · {blocks_length} blocks", { v: SPORT_LABELS[x.note.sport], blocks_length: x.note.blocks.length })}</span>
					<button type="button" class="bf-link-button" aria-label={t("Delete template {note_name}", { note_name: x.note.name })} onclick={() => void plugin.trashNote(x.file, "template", x.note.name)}>{t("delete")}</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<div class="bf-actions">
	<button type="button" onclick={() => plugin.openLibrary({})}>{t("Exercise library")}</button>
</div>

<section class="bf-card">
	<h4>{t("Recent workouts")}</h4>
	{#if recent.length === 0}
		<p class="bf-muted">{t("No workout logged yet.")}</p>
	{:else}
		<ul class="bf-list">
			{#each recent as w (w.file.path)}
				<li>
					<button type="button" class="bf-link-button" onclick={() => plugin.openWorkout({ file: w.file })}>
						{formatShortDate(w.note.date)} · {workoutLabel(w.note)}
					</button>
					{#if w.note.rpe === undefined && !plugin.programs.isCounterWorkout(w.note)}<span class="bf-tag bf-tag-warn">{t("add RPE")}</span>{/if}
					{#if workoutDetails(w.note, false)}<span class="bf-muted"> · {workoutDetails(w.note, false)}</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	h4 {
		margin: 0;
	}

	.bf-log-sports {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
		gap: var(--size-4-2);
	}

	.bf-list {
		margin: 0;
		padding-left: var(--size-4-5);
	}

	.bf-list li {
		margin-bottom: var(--size-4-1);
	}
</style>
