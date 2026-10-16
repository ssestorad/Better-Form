<script lang="ts">
	// Karta Cíle (SPEC 5.8): cíle s průběhem a předpovědí podle trendu a normy
	// zadané uživatelem se vzdáleností od splnění a nejslabší disciplínou.
	import { t } from "../../i18n";
	import { Notice } from "obsidian";
	import { GOAL_FORECAST_BASIS } from "../../calc/goals";
	import type { NormItemStatus } from "../../calc/norms";
	import type { GoalDraft, GoalEntry, NormEntry } from "../../data/GoalService";
	import { GOAL_TYPE_LABELS, NORM_KIND_LABELS, type GoalStatus } from "../../model/constants";
	import { toIsoDate } from "../../model/dates";
	import type { NormNote } from "../../model/types";
	import BasisTag from "../components/BasisTag.svelte";
	import { usePlugin } from "../context";
	import { formatCzechDate, formatNumber, formatSeconds, formatShortDate } from "../format";
	import GoalForm from "../goals/GoalForm.svelte";
	import NormForm from "../goals/NormForm.svelte";
	import { STATUS_LABELS, forecastText, formatGoalValue } from "../goals/text";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const today = $derived.by(() => {
		void $indexVersion;
		return toIsoDate(new Date());
	});
	const goals = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		const entries = plugin.goals.goals();
		const data = entries.length > 0 ? plugin.goals.data(today) : null;
		return entries.map((entry) => ({ entry, evaluation: data ? plugin.goals.evaluate(entry, today, data) : null }));
	});
	const active = $derived(goals.filter((g) => g.entry.note.status === "active"));
	const closed = $derived(goals.filter((g) => g.entry.note.status !== "active"));
	const norms = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		return plugin.goals.norms().map((entry) => ({ entry, status: plugin.goals.normStatus(entry, today) }));
	});
	const profile = $derived.by(() => {
		void $settingsVersion;
		return plugin.goals.profile(today);
	});

	let addingGoal = $state(false);
	let addingNorm = $state(false);
	let editingNorm = $state<string | null>(null);

	async function run(action: () => Promise<unknown>, done?: string) {
		try {
			await action();
			if (done) new Notice(done);
		} catch (err) {
			new Notice(t("Nepodařilo se: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}

	async function createGoal(draft: GoalDraft) {
		await plugin.goals.create(draft, today);
		addingGoal = false;
		new Notice(t("Cíl přidán."));
	}

	async function saveNorm(note: Omit<NormNote, "forma" | "schema">, existing?: NormEntry) {
		await plugin.goals.saveNorm(note, existing);
		addingNorm = false;
		editingNorm = null;
		new Notice(t("Norma uložena."));
	}

	const setStatus = (entry: GoalEntry, status: GoalStatus, done: string) => run(() => plugin.goals.setStatus(entry, status), done);
	const open = (entry: GoalEntry | NormEntry) => void plugin.app.workspace.openLinkText(entry.file.path, "", false);

	const CLOSED_LABELS: Record<GoalStatus, string> = { active: t("aktivní"), done: t("splněný"), dropped: t("zrušený") };

	/** Hodnota disciplíny normy: čas, sekundy nebo opakování. */
	function normValue(item: NormItemStatus, value: number): string {
		if (item.item.kind === "run_time") return formatGoalValue(value, "time");
		return item.item.kind === "hold" ? formatSeconds(value) : t("{n} opak.", { n: formatNumber(value, 0) });
	}

	function normName(item: NormItemStatus): string {
		const { item: i } = item;
		if (i.kind === "run_time") return t("Běh {v} km", { v: formatNumber(i.distance_km ?? 0, 2) });
		return i.time_limit_s !== undefined ? `${i.exercise} (${formatSeconds(i.time_limit_s)})` : `${i.exercise}${i.kind === "hold" ? " – výdrž" : ""}`;
	}
</script>

<section class="bf-card">
	<header class="bf-goal-head">
		<h4>{t("Cíle")}</h4>
		{#if !addingGoal}<button type="button" class="mod-cta" onclick={() => (addingGoal = true)}>{t("Přidat cíl")}</button>{/if}
	</header>
	{#if addingGoal}
		<GoalForm onSave={createGoal} onCancel={() => (addingGoal = false)} />
	{:else if active.length === 0}
		<p class="bf-muted">{t("Zatím žádný aktivní cíl. Cíl může být čas na trati, síla, počet opakování, stupeň dovednosti, týdenní kilometry, hmotnost nebo splnění normy.")}</p>
	{/if}
</section>

{#each active as { entry, evaluation } (entry.file.path)}
	{@const note = entry.note}
	<section class="bf-card">
		<header class="bf-goal-head">
			<div>
				<button type="button" class="bf-link-button bf-goal-name" onclick={() => open(entry)}>{note.name}</button>
				<div class="bf-muted bf-goal-small">
					{GOAL_TYPE_LABELS[note.type]}{note.exercise ? ` · ${note.exercise}` : ""}{note.distance_km ? ` · ${formatNumber(note.distance_km, 2)} km` : ""}{note.ladder
						? ` · ${note.ladder}`
						: ""}{note.norm ? ` · ${note.norm}` : ""}
				</div>
			</div>
			{#if evaluation}
				<span class="bf-tag" class:bf-tag-done={evaluation.status === "reached" || evaluation.status === "on_track"} class:bf-tag-warn={evaluation.status === "at_risk"}>
					{STATUS_LABELS[evaluation.status]}
				</span>
			{/if}
		</header>
		{#if evaluation}
			<div class="bf-goal-bar" role="img" aria-label={t("Průběh {v} %", { v: Math.round((evaluation.fraction ?? 0) * 100) })}>
				<div class="bf-goal-fill" style:width={`${(evaluation.fraction ?? 0) * 100}%`}></div>
			</div>
			<div class="bf-goal-row bf-goal-small">
				<span>
					{t("Teď")} <strong>{evaluation.current === null ? "—" : formatGoalValue(evaluation.current, evaluation.unit)}</strong>
					{#if evaluation.start !== null}<span class="bf-muted"> {t("· začátek {v}", { v: formatGoalValue(evaluation.start, evaluation.unit) })}</span>{/if}
				</span>
				<span>{t("cíl")} <strong>{formatGoalValue(evaluation.target, evaluation.unit)}</strong></span>
			</div>
			<p class="bf-goal-small">
				{forecastText(evaluation, note.deadline)}
				{#if evaluation.eta !== null || evaluation.perWeek !== null}<BasisTag basis={GOAL_FORECAST_BASIS} />{/if}
			</p>
			<p class="bf-muted bf-goal-small">
				{t("{v} · založeno {v2}", { v: note.deadline ? t("Termín {v}", { v: formatCzechDate(note.deadline, false) }) : t("Bez termínu"), v2: formatCzechDate(note.created, false) })}
			</p>
		{/if}
		<div class="bf-actions">
			<button type="button" onclick={() => void setStatus(entry, "done", t("Cíl označen jako splněný."))}>{t("Splněno")}</button>
			<button type="button" onclick={() => void setStatus(entry, "dropped", t("Cíl zrušen – poznámka zůstává."))}>{t("Zrušit cíl")}</button>
			<button type="button" onclick={() => void plugin.trashNote(entry.file, "goal", note.name)}>{t("Smazat")}</button>
		</div>
	</section>
{/each}

{#if closed.length > 0}
	<details class="bf-goal-closed">
		<summary>{t("Splněné a zrušené cíle ({closed_length})", { closed_length: closed.length })}</summary>
		<ul>
			{#each closed as { entry } (entry.file.path)}
				<li>
					<button type="button" class="bf-link-button" onclick={() => open(entry)}>{entry.note.name}</button>
					<span class="bf-tag">{CLOSED_LABELS[entry.note.status]}</span>
					<button type="button" class="bf-link-button" onclick={() => void setStatus(entry, "active", t("Cíl je znovu aktivní."))}>{t("obnovit")}</button>
					<button type="button" class="bf-link-button" onclick={() => void plugin.trashNote(entry.file, "goal", entry.note.name)}>{t("smazat")}</button>
				</li>
			{/each}
		</ul>
	</details>
{/if}

<section class="bf-card">
	<header class="bf-goal-head">
		<h4>{t("Normy")}</h4>
		{#if !addingNorm}<button type="button" onclick={() => (addingNorm = true)}>{t("Přidat normu")}</button>{/if}
	</header>
	<p class="bf-muted bf-goal-small">
		{t("Tabulku normy si zadáš sám (cvik, limit, požadovaná hodnota podle věku a pohlaví) – plugin žádné normy nepředvyplňuje. Výkon se bere z testů maxim a z tréninků za posledních 90 dní.")}
		{#if profile.sex === null || profile.age === null}{t("Pro řádky podle pohlaví a věku vyplň profil v nastavení.")}{/if}
	</p>
	{#if addingNorm}
		<NormForm onSave={(note) => saveNorm(note)} onCancel={() => (addingNorm = false)} />
	{/if}
</section>

{#each norms as { entry, status } (entry.file.path)}
	<section class="bf-card">
		<header class="bf-goal-head">
			<button type="button" class="bf-link-button bf-goal-name" onclick={() => open(entry)}>{entry.note.name}</button>
			<span class="bf-tag" class:bf-tag-done={status.total > 0 && status.met === status.total}>{t("splněno {met} z {total}", { met: status.met, total: status.total })}</span>
		</header>
		{#if editingNorm === entry.file.path}
			<NormForm initial={entry.note} onSave={(note) => saveNorm(note, entry)} onCancel={() => (editingNorm = null)} />
		{:else}
			<div class="bf-norm-table" role="table">
				<div class="bf-norm-tr bf-muted" role="row">
					<span role="columnheader">{t("Disciplína")}</span>
					<span role="columnheader">{t("Teď")}</span>
					<span role="columnheader">{t("Norma")}</span>
					<span role="columnheader">{t("Splnění")}</span>
				</div>
				{#each status.items as item, i (i)}
					<div class="bf-norm-tr" class:is-weakest={status.weakest === item} role="row">
						<span role="cell" title={NORM_KIND_LABELS[item.item.kind]}>{normName(item)}</span>
						<span role="cell" title={item.current ? formatShortDate(item.current.date) : ""}>{item.current ? normValue(item, item.current.value) : "—"}</span>
						<span role="cell">{item.target === null ? "—" : normValue(item, item.target)}</span>
						<span role="cell" class:bf-norm-ok={item.met}>{item.ratio === null ? "—" : `${formatNumber(Math.min(item.ratio, 9.99) * 100, 0)} %`}</span>
					</div>
				{/each}
			</div>
			<p class="bf-goal-small">
				{#if status.total === 0}
					<span class="bf-muted">{t("Žádný řádek tabulky neodpovídá tvému profilu (pohlaví, věk).")}</span>
				{:else if status.weakest}
					<strong>{t("Nejslabší disciplína:")}</strong>
					{normName(status.weakest)}
					{#if status.weakest.current && status.weakest.target !== null}
						{t("– chybí {v}", { v: normValue(status.weakest, Math.abs(status.weakest.target - status.weakest.current.value)) })}
					{:else}
						{t("– zatím bez výkonu; udělej test maxima.")}
					{/if}
				{:else}
					<strong>{t("Všechny disciplíny jsou splněné.")}</strong>
				{/if}
			</p>
			<div class="bf-actions">
				<button type="button" onclick={() => (editingNorm = entry.file.path)}>{t("Upravit tabulku")}</button>
				<button type="button" onclick={() => plugin.openTest({})}>{t("Test maxima")}</button>
				<button type="button" onclick={() => void plugin.trashNote(entry.file, "norm", entry.note.name)}>{t("Smazat")}</button>
			</div>
		{/if}
	</section>
{/each}

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-goal-head,
	.bf-goal-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--size-4-2);
	}

	.bf-goal-name {
		font-weight: var(--font-semibold);
		text-align: left;
		white-space: normal;
	}

	.bf-goal-small {
		font-size: var(--font-ui-smaller);
	}

	.bf-goal-bar {
		height: 8px;
		border-radius: 4px;
		background-color: var(--background-modifier-border);
		overflow: hidden;
	}

	.bf-goal-fill {
		height: 100%;
		background-color: var(--interactive-accent);
	}

	.bf-goal-closed > summary {
		cursor: pointer;
		font-size: var(--font-ui-small);
	}

	.bf-goal-closed ul {
		margin: var(--size-4-1) 0 0;
		padding-left: var(--size-4-5);
		font-size: var(--font-ui-small);
	}

	.bf-norm-table {
		display: flex;
		flex-direction: column;
		font-size: var(--font-ui-small);
	}

	/* Pevné sloupce tabulky normy. */
	.bf-norm-tr {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.8fr);
		gap: var(--size-4-2);
		padding: var(--size-4-1);
		border-top: 1px solid var(--background-modifier-border);
	}

	.bf-norm-tr:first-child {
		border-top: none;
		font-size: var(--font-ui-smaller);
	}

	.bf-norm-tr.is-weakest {
		background-color: rgba(var(--color-orange-rgb), 0.12);
	}

	.bf-norm-ok {
		color: var(--text-success);
	}
</style>
