<script lang="ts">
	// Karta Programy (SPEC 5.7): aktivní programy s dnešními úkoly, knihovna programů,
	// nový program, kopie, import / export.
	import { t } from "../../i18n";
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
			new Notice(t("Nepodařilo se: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}

	async function exportProgram(entry: ProgramEntry) {
		const text = await plugin.programs.exportText(entry);
		await navigator.clipboard.writeText(text);
	}

	function status(entry: ProgramEntry): string {
		const { note } = entry;
		if (note.active && note.active_since && note.active_since > today) return t("začíná {active_since}", { active_since: note.active_since });
		if (note.active && note.duration_weeks !== undefined) return t("dokončený");
		return note.builtin ? t("předpřipravený") : t("vlastní");
	}
</script>

<section class="bf-section">
	<h4>{t("Aktivní programy")}</h4>
	{#if active.length === 0}
		<p class="bf-muted">{t("Žádný aktivní program. Vyber si z knihovny níže a klikni na Aktivovat.")}</p>
	{:else}
		{#each active as item (item.entry.file.path)}
			<ProgramCard today={item} date={today} manage />
		{/each}
	{/if}
</section>

<section class="bf-section">
	<h4>{t("Knihovna programů")}</h4>
	{#if library.length === 0}
		<p class="bf-muted">{t("Všechny programy jsou aktivní, nebo knihovna ještě není založená (Nastavení → Doplnit knihovnu).")}</p>
	{/if}
	{#each library as entry (entry.file.path)}
		<div class="bf-card">
			<div class="bf-library-head">
				<button type="button" class="bf-link-button bf-library-name" onclick={() => void plugin.app.workspace.openLinkText(entry.file.path, "", false)}>
					{entry.note.name}
				</button>
				<span class="bf-tag">{status(entry)}</span>
				<span class="bf-tag" title={t("Úroveň důkazu programu")}>{EVIDENCE_LABELS[entry.note.evidence]}</span>
			</div>
			<div class="bf-muted bf-library-info">
				{describeDays(entry.note.days)}{entry.note.duration_weeks !== undefined ? t(" · {duration_weeks} týdnů", { duration_weeks: entry.note.duration_weeks }) : ""}
				{#if entry.note.items.length > 0} · {entry.note.items.map((i) => i.exercise).filter((e, i, all) => all.indexOf(e) === i).join(", ")}{/if}
			</div>
			<ProgramDetails {entry} />
			<div class="bf-actions">
				<button type="button" class="mod-cta" onclick={() => void run(() => plugin.programs.activate(entry, today), t("Program „{note_name}“ začíná dnes.", { note_name: entry.note.name }))}>
					{t("Aktivovat")}
				</button>
				{#if entry.note.builtin}
					<button type="button" title={t("Vytvoří vlastní kopii, kterou můžeš upravit")} onclick={() => void run(() => plugin.programs.copy(entry), t("Kopie programu vytvořena."))}>{t("Kopie")}</button>
				{:else}
					<button type="button" onclick={() => plugin.openProgramEditor(entry)}>{t("Upravit")}</button>
				{/if}
				<button type="button" title={t("Zkopíruje program do schránky jako text")} onclick={() => void run(() => exportProgram(entry), t("Program zkopírován do schránky."))}>{t("Export")}</button>
				<button
					type="button"
					onclick={() =>
						void plugin.trashNote(entry.file, "program", entry.note.name, entry.note.builtin ? t("Předpřipravený program jde vrátit v Nastavení → Doplnit knihovnu.") : "")}
				>
					{t("Smazat")}
				</button>
			</div>
		</div>
	{/each}
</section>

<div class="bf-actions">
	<button type="button" onclick={() => plugin.openProgramEditor()}>{t("Nový program")}</button>
	<button type="button" title={t("Vytvoří program ze souboru .md, .txt, .json nebo .yaml")} onclick={() => plugin.pickProgramFile()}>{t("Ze souboru")}</button>
	<button type="button" title={t("Vytvoří program z vloženého textu")} onclick={() => plugin.openProgramImport()}>{t("Z textu")}</button>
	<button type="button" onclick={() => plugin.openTest({ date: today })}>{t("Test maxima")}</button>
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
