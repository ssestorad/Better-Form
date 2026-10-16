<script lang="ts">
	// Evidence bolestí a zranění (SPEC 5.10). Plugin nediagnostikuje – eviduje
	// intenzitu a při 4/10 nebo týdnu bez zlepšení doporučí odborníka.
	import { t } from "../../i18n";
	import { Notice } from "obsidian";
	import { PAIN_BASIS, assessPain } from "../../calc/pain";
	import type { PainEntryRef } from "../../data/PainService";
	import { BODY_SIDES, BODY_SIDE_LABELS, MUSCLES, MUSCLE_LABELS, PAIN_STATUS_LABELS, type BodySide, type MuscleId } from "../../model/constants";
	import { toIsoDate } from "../../model/dates";
	import BasisTag from "../components/BasisTag.svelte";
	import { usePlugin } from "../context";
	import { formatDays, formatShortDate } from "../format";

	interface Props {
		/** Partie předvybraná v panáčkovi – nová bolest se založí na ní. */
		muscle: MuscleId | null;
	}
	let { muscle }: Props = $props();

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

	const today = $derived.by(() => {
		void $indexVersion;
		return toIsoDate(new Date());
	});
	const limits = $derived.by(() => {
		void $settingsVersion;
		const th = plugin.settings.thresholds;
		return { professionalLevel: th.painProfessionalLevel, professionalDays: th.painProfessionalDays };
	});
	const all = $derived.by(() => {
		void $indexVersion;
		return plugin.pains.all();
	});
	const open = $derived(all.filter((e) => e.note.status !== "resolved").map((entry) => ({ entry, assessment: assessPain(entry.note, today, limits) })));
	const resolved = $derived(all.filter((e) => e.note.status === "resolved"));

	let adding = $state(false);
	let name = $state("");
	let newMuscle = $state<MuscleId>("quads");
	let side = $state<BodySide | "">("");
	let level = $state(3);
	let trigger = $state("");

	function startAdding() {
		if (muscle) newMuscle = muscle;
		adding = true;
	}

	async function run(action: () => Promise<unknown>, done?: string) {
		try {
			await action();
			if (done) new Notice(done);
		} catch (err) {
			new Notice(t("Failed: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}

	async function add(event: SubmitEvent) {
		event.preventDefault();
		await run(async () => {
			await plugin.pains.create({ name, muscle: newMuscle, side: side || undefined, level, trigger }, today);
			adding = false;
			name = "";
			trigger = "";
			level = 3;
			side = "";
		}, t("Pain logged."));
	}

	const record = (entry: PainEntryRef, value: number) =>
		run(() => plugin.pains.record(entry, today, value), value === 0 ? t("Pain marked as resolved.") : t("Today's intensity {value}/10 logged.", { value }));
	const openNote = (entry: PainEntryRef) => void plugin.app.workspace.openLinkText(entry.file.path, "", false);
</script>

<section class="bf-card">
	<header class="bf-pain-head">
		<h4>{t("Pain and injuries")}</h4>
		{#if !adding}<button type="button" onclick={startAdding}>{t("Log pain")}</button>{/if}
	</header>

	{#if open.length === 0 && !adding}
		<p class="bf-muted">{t("No pain logged.")}</p>
	{/if}

	{#each open as { entry, assessment } (entry.file.path)}
		<div class="bf-pain-item">
			<div class="bf-pain-row">
				<button type="button" class="bf-link-button bf-pain-name" onclick={() => openNote(entry)}>{entry.note.name}</button>
				<span class="bf-tag" class:bf-tag-warn={assessment.seeProfessional}>{assessment.level}/10 · {PAIN_STATUS_LABELS[entry.note.status]}</span>
			</div>
			<div class="bf-muted bf-pain-small">
				{t("{v}{v2} · since {v3} ({v4}){v5}", { v: MUSCLE_LABELS[entry.note.muscle], v2: entry.note.side ? ` ${BODY_SIDE_LABELS[entry.note.side]}` : "", v3: formatShortDate(entry.note.since), v4: formatDays(assessment.days), v5: entry.note.trigger
					? ` · ${entry.note.trigger}`
					: "" })}
			</div>
			{#if assessment.seeProfessional}
				<p class="bf-pain-warn bf-pain-small">
					{t("{v} – see a physiotherapist or doctor.", { v: assessment.reason === "level"
						? t("Intensity {professionalLevel}/10 or more", { professionalLevel: limits.professionalLevel })
						: t("Lasting more than {professionalDays} days without improvement", { professionalDays: limits.professionalDays }) })}
				</p>
			{/if}
			<label class="bf-pain-row bf-pain-small">
				<span>{t("Today's intensity")}</span>
				<select value={String(entry.note.level)} onchange={(e) => void record(entry, Number(e.currentTarget.value))}>
					{#each LEVELS as l (l)}
						<option value={String(l)}>{l === 0 ? t("0 – no pain (resolved)") : `${l}/10`}</option>
					{/each}
				</select>
			</label>
			<div class="bf-actions">
				<button type="button" onclick={() => void plugin.trashNote(entry.file, "pain", entry.note.name)}>{t("Delete entry")}</button>
			</div>
		</div>
	{/each}

	{#if adding}
		<form class="bf-pain-form" onsubmit={add}>
			<label class="bf-field">
				<span class="bf-field-label">{t("What hurts")}</span>
				<input type="text" bind:value={name} placeholder={t("e.g. right knee")} />
			</label>
			<div class="bf-grid-3">
				<label class="bf-field">
					<span class="bf-field-label">{t("Nearest muscle group")}</span>
					<select bind:value={newMuscle}>
						{#each MUSCLES as m (m)}
							<option value={m}>{MUSCLE_LABELS[m]}</option>
						{/each}
					</select>
				</label>
				<label class="bf-field">
					<span class="bf-field-label">{t("Side")}</span>
					<select bind:value={side}>
						<option value="">{t("not specified")}</option>
						{#each BODY_SIDES as s (s)}
							<option value={s}>{BODY_SIDE_LABELS[s]}</option>
						{/each}
					</select>
				</label>
				<label class="bf-field">
					<span class="bf-field-label">{t("Intensity 0–10")}</span>
					<select bind:value={level}>
						{#each LEVELS.slice(1) as l (l)}
							<option value={l}>{l}/10</option>
						{/each}
					</select>
				</label>
			</div>
			<label class="bf-field">
				<span class="bf-field-label">{t("Trigger")} <span class="bf-hint">{t("optional")}</span></span>
				<input type="text" bind:value={trigger} placeholder={t("e.g. downhill running")} />
			</label>
			<div class="bf-actions">
				<button type="submit" class="mod-cta" disabled={name.trim() === ""}>{t("Log")}</button>
				<button type="button" onclick={() => (adding = false)}>{t("Cancel")}</button>
			</div>
		</form>
	{/if}

	{#if resolved.length > 0}
		<details class="bf-pain-resolved">
			<summary>{t("Resolved ({resolved_length})", { resolved_length: resolved.length })}</summary>
			<ul>
				{#each resolved as entry (entry.file.path)}
					<li>
						<button type="button" class="bf-link-button" onclick={() => openNote(entry)}>{entry.note.name}</button>
						<span class="bf-muted"> {t("· {v} · since {v2}", { v: MUSCLE_LABELS[entry.note.muscle], v2: formatShortDate(entry.note.since) })}</span>
						<button type="button" class="bf-link-button" onclick={() => void record(entry, 1)}>{t("hurts again")}</button>
						<button type="button" class="bf-link-button" onclick={() => void plugin.trashNote(entry.file, "pain", entry.note.name)}>{t("delete")}</button>
					</li>
				{/each}
			</ul>
		</details>
	{/if}

	<p class="bf-muted bf-pain-small">
		{t("The plugin doesn't diagnose anything – it only records what you log. If the pain is {professionalLevel}/10 or more, or lasts more than {professionalDays} days without improvement, see a physiotherapist or doctor.", { professionalLevel: limits.professionalLevel, professionalDays: limits.professionalDays })} <BasisTag basis={PAIN_BASIS} />
	</p>
</section>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-pain-head,
	.bf-pain-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--size-4-2);
	}

	.bf-pain-item {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-1);
		padding: var(--size-4-2);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
	}

	.bf-pain-name {
		font-weight: var(--font-semibold);
		text-align: left;
	}

	.bf-pain-small {
		font-size: var(--font-ui-smaller);
	}

	.bf-pain-warn {
		color: var(--color-red);
	}

	.bf-pain-form {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-pain-form select {
		width: 100%;
	}

	.bf-pain-resolved > summary {
		cursor: pointer;
		font-size: var(--font-ui-small);
	}

	.bf-pain-resolved ul {
		margin: var(--size-4-1) 0 0;
		padding-left: var(--size-4-5);
		font-size: var(--font-ui-small);
	}
</style>
