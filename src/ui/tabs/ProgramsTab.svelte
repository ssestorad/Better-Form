<script lang="ts">
	// Karta Programy (SPEC 5.7): aktivní programy s dnešními úkoly, knihovna programů,
	// nový program, kopie, import / export.
	import { t, tn } from "../../i18n";
	import { Notice } from "obsidian";
	import { describeDays } from "../../calc/programText";
	import { programWeek } from "../../calc/programs";
	import type { ProgramEntry } from "../../data/ProgramService";
	import { EVIDENCE_LABELS } from "../../model/constants";
	import { toIsoDate } from "../../model/dates";
	import { usePlugin } from "../context";
	import ProgramCard from "../program/ProgramCard.svelte";
	import ProgramDetails from "../program/ProgramDetails.svelte";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;

	const today = $derived.by(() => {
		void $indexVersion;
		return toIsoDate(new Date());
	});
	const active = $derived.by(() => {
		void $indexVersion;
		return plugin.programs.active(today);
	});
	const library = $derived.by(() => {
		void $indexVersion;
		return plugin.programs.programs().filter((p) => programWeek(p.note, today) === null);
	});

	async function run(action: () => Promise<unknown>, done?: string) {
		try {
			await action();
			if (done) new Notice(done);
		} catch (err) {
			new Notice(t("Failed: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}

	async function exportProgram(entry: ProgramEntry) {
		const text = await plugin.programs.exportText(entry);
		await navigator.clipboard.writeText(text);
	}

	function status(entry: ProgramEntry): string {
		const { note } = entry;
		if (note.active && note.active_since && note.active_since > today) return t("starts {active_since}", { active_since: note.active_since });
		if (note.active && note.duration_weeks !== undefined) return t("finished");
		return note.builtin ? t("built-in") : t("custom");
	}
</script>

<section class="bf-section">
	<h4>{t("Active programs")}</h4>
	{#if active.length === 0}
		<p class="bf-muted">{t("No active program. Pick one from the library below and click Activate.")}</p>
	{:else}
		{#each active as item (item.entry.file.path)}
			<ProgramCard today={item} date={today} manage />
		{/each}
	{/if}
</section>

<section class="bf-section">
	<h4>{t("Program library")}</h4>
	{#if library.length === 0}
		<p class="bf-muted">{t("All programs are active, or the library hasn't been created yet (Settings → Add to library).")}</p>
	{/if}
	{#each library as entry (entry.file.path)}
		<div class="bf-card">
			<div class="bf-library-head">
				<button type="button" class="bf-link-button bf-library-name" onclick={() => void plugin.app.workspace.openLinkText(entry.file.path, "", false)}>
					{entry.note.name}
				</button>
				<span class="bf-tag">{status(entry)}</span>
				<span class="bf-tag" title={t("Program evidence level")}>{EVIDENCE_LABELS[entry.note.evidence]}</span>
			</div>
			<div class="bf-muted bf-library-info">
				{describeDays(entry.note.days)}{entry.note.duration_weeks !== undefined ? tn(entry.note.duration_weeks, [" · {n} week", " · {n} weeks"]) : ""}
				{#if entry.note.items.length > 0} · {entry.note.items.map((i) => i.exercise).filter((e, i, all) => all.indexOf(e) === i).join(", ")}{/if}
			</div>
			<ProgramDetails {entry} />
			<div class="bf-actions">
				<button type="button" class="mod-cta" onclick={() => void run(() => plugin.programs.activate(entry, today), t("The program “{note_name}” starts today.", { note_name: entry.note.name }))}>
					{t("Activate")}
				</button>
				{#if entry.note.builtin}
					<button type="button" title={t("Creates your own copy that you can edit")} onclick={() => void run(() => plugin.programs.copy(entry), t("Program copy created."))}>{t("Copy")}</button>
				{:else}
					<button type="button" onclick={() => plugin.openProgramEditor(entry)}>{t("Edit")}</button>
				{/if}
				<button type="button" title={t("Copies the program to the clipboard as text")} onclick={() => void run(() => exportProgram(entry), t("Program copied to the clipboard."))}>{t("Export")}</button>
				<button
					type="button"
					onclick={() =>
						void plugin.trashNote(entry.file, "program", entry.note.name, entry.note.builtin ? t("A built-in program can be restored in Settings → Add to library.") : "")}
				>
					{t("Delete")}
				</button>
			</div>
		</div>
	{/each}
</section>

<div class="bf-actions">
	<button type="button" onclick={() => plugin.openProgramEditor()}>{t("New program")}</button>
	<button type="button" title={t("Creates a program from an .md, .txt, .json or .yaml file")} onclick={() => plugin.pickProgramFile()}>{t("From file")}</button>
	<button type="button" title={t("Creates a program from pasted text")} onclick={() => plugin.openProgramImport()}>{t("From text")}</button>
	<button type="button" onclick={() => plugin.openTest({ date: today })}>{t("Max test")}</button>
</div>

<style>
	.bf-section {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	h4 {
		margin: 0;
	}

	.bf-library-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--size-4-2);
	}

	.bf-library-name {
		font-weight: var(--font-semibold);
	}

	.bf-library-info {
		font-size: var(--font-ui-small);
	}
</style>
