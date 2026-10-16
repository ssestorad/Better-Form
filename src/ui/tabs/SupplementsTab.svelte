<script lang="ts">
	// Karta Suplementy: dnešní odškrtávání, dodržování, moje suplementy a doporučení se zdroji.
	import { t } from "../../i18n";
	import { Notice } from "obsidian";
	import { CAFFEINE_EXCESS_MG_PER_KG, caffeineIsExcessive, doseToMg, isTaken, trackedDays } from "../../calc/supplements";
	import type { LabelPhoto, SupplementDraft, SupplementEntry } from "../../data/SupplementService";
	import { SUPPLEMENT_TIMING_LABELS } from "../../model/constants";
	import { toIsoDate } from "../../model/dates";
	import { minutesOfDay } from "../../model/dates";
	import {
		AREA_LABELS,
		BENEFIT_AREAS,
		MATCH_TITLES,
		caffeineTooLate,
		NO_FILTER,
		compareByGoals,
		isBenefitArea,
		matchGroup,
		passesFilter,
		type BenefitArea,
		type CatalogFilter,
		type MatchGroup,
	} from "../../seed/supplementModel";
	import {
		SUPPLEMENT_CATALOG,
		catalog,
		SUPPLEMENT_CONTAMINATION_NOTE,
		SUPPLEMENT_DISCLAIMER,
		matchesCatalogQuery,
		type CatalogSupplement,
	} from "../../seed/supplements";
	import type { Diet } from "../../settings/settings";
	import { usePlugin } from "../context";
	import AminoAcidTable from "../supplements/AminoAcidTable.svelte";
	import DailyOverview from "../supplements/DailyOverview.svelte";
	import LabelForm from "../supplements/LabelForm.svelte";
	import ElectrolyteTable from "../supplements/ElectrolyteTable.svelte";
	import RecommendationCard from "../supplements/RecommendationCard.svelte";
	import SupplementForm from "../supplements/SupplementForm.svelte";
	import TrialCard from "../supplements/TrialCard.svelte";
	import { adherenceLabel, doseLabel } from "../supplements/text";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	// Karta má čtyři části – knihovna se 72 látkami a tabulky by jinak odsunuly dnešní odškrtávání o tisíce pixelů.
	const SECTIONS = [
		{ id: "today", label: t("Dnes") },
		{ id: "mine", label: t("Moje") },
		{ id: "library", label: t("Knihovna") },
		{ id: "tables", label: t("Tabulky") },
	] as const;
	type Section = (typeof SECTIONS)[number]["id"];
	let section = $state<Section>("today");

	const GROUPS: MatchGroup[] = ["fits", "maybe", "other"];
	const WINDOWS = [7, 30] as const;
	const DIETS: { value: Diet; label: string }[] = [
		{ value: "omnivore", label: t("běžná strava") },
		{ value: "vegetarian", label: t("vegetariánská") },
		{ value: "vegan", label: t("veganská") },
	];

	// Cíle u suplementů a strava (nastavení) – podle nich se řadí knihovna.
	const goals = $derived.by((): BenefitArea[] => {
		void $settingsVersion;
		return plugin.settings.supplementGoals.filter(isBenefitArea);
	});
	const diet = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.diet;
	});
	let query = $state("");
	// Filtry knihovny – jen pro tuto obrazovku, neukládají se.
	let filter = $state<CatalogFilter>({ ...NO_FILTER });
	let hideOwned = $state(false);
	const filtered = $derived(filter.evidence !== "all" || filter.safety !== "all" || hideOwned);
	const library = $derived(
		GROUPS.map((group) => ({
			group,
			items: catalog().filter(
				(s) => matchesCatalogQuery(s, query) && passesFilter(s, goals, filter) && !(hideOwned && owned(s)) && matchGroup(s.benefits, goals) === group,
			).sort(compareByGoals(goals)),
		})).filter((g) => g.items.length > 0),
	);
	/** Když hledání najde jedinou látku, rozbalí se rovnou. */
	const shownCount = $derived(library.reduce((sum, g) => sum + g.items.length, 0));

	async function toggleGoal(area: BenefitArea) {
		const set = new Set(goals);
		if (set.has(area)) set.delete(area);
		else set.add(area);
		plugin.settings.supplementGoals = BENEFIT_AREAS.filter((a) => set.has(a));
		await plugin.saveSettings();
	}

	async function setDiet(value: Diet) {
		plugin.settings.diet = value;
		await plugin.saveSettings();
	}

	// Kofein méně než 6 h před obvyklým ulehnutím (Drake 2013).
	const bedtime = $derived.by(() => {
		void $indexVersion;
		const days = plugin.index
			.all("day")
			.filter((d) => d.note.sleep.bedtime !== undefined)
			.sort((a, b) => b.note.date.localeCompare(a.note.date));
		const time = days[0]?.note.sleep.bedtime;
		return time ? minutesOfDay(time) : null;
	});
	let nowMin = $state(new Date().getHours() * 60 + new Date().getMinutes());
	$effect(() => {
		const timer = window.setInterval(() => (nowMin = new Date().getHours() * 60 + new Date().getMinutes()), 60_000);
		return () => window.clearInterval(timer);
	});
	const caffeineLate = $derived(bedtime !== null && caffeineTooLate(nowMin, bedtime));

	const today = $derived.by(() => {
		void $indexVersion;
		return toIsoDate(new Date());
	});
	const all = $derived.by(() => {
		void $indexVersion;
		return plugin.supplements.all();
	});
	const active = $derived(all.filter((e) => e.note.active));
	const inactive = $derived(all.filter((e) => !e.note.active));
	const dayNotes = $derived.by(() => {
		void $indexVersion;
		return plugin.index.all("day").map((d) => d.note);
	});

	// Vegani a vegetariáni potřebují B12 – připomenout, když ho nemají v seznamu.
	const b12Missing = $derived(diet !== "omnivore" && !active.some((e) => e.note.catalog === "vitamin_b" || /b\s?12|multivit/i.test(e.note.name)));

	const taken = $derived.by(() => {
		void $indexVersion;
		return plugin.supplements.taken(today);
	});
	const trainedToday = $derived.by(() => {
		void $indexVersion;
		return plugin.supplements.hasWorkout(today);
	});
	const weightKg = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		return plugin.supplements.weightKg();
	});
	/** Dávka kofeinu v mg, když jde z jednotky určit, je od 9 mg/kg zbytečně vysoká. */
	function caffeineOver(dose: number | undefined, unit: string | undefined): boolean {
		const mg = dose === undefined ? null : doseToMg(dose, unit);
		return mg !== null && weightKg !== null && caffeineIsExcessive(mg, weightKg);
	}
	const sex = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.profile.sex;
	});
	const overview = $derived.by(() => {
		void $indexVersion;
		return active.map((entry) => ({
			entry,
			cells: WINDOWS.map((days) =>
				adherenceLabel(
					plugin.supplements.adherence(entry.note, today, days),
					trackedDays(entry.note.since, today, days),
					days,
				),
			),
		}));
	});

	/** Cesta upravovaného suplementu, "new" = nový vlastní, "label" = podle etikety, "catalog:<id>" = přidání z katalogu. */
	let editing = $state<string | null>(null);

	async function run(action: () => Promise<unknown>, done?: string) {
		try {
			await action();
			if (done) new Notice(done);
		} catch (err) {
			new Notice(t("Nepodařilo se: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}

	function owned(item: CatalogSupplement): boolean {
		return all.some((e) => e.note.catalog === item.id || e.note.name.toLocaleLowerCase("cs") === item.name.toLocaleLowerCase("cs"));
	}

	function draftOf(entry: SupplementEntry): SupplementDraft {
		const { note } = entry;
		return {
			name: note.name,
			catalog: note.catalog,
			dose: note.dose,
			unit: note.unit,
			timing: note.timing,
			trainingDaysOnly: note.training_days_only,
		};
	}

	function catalogDraft(item: CatalogSupplement): SupplementDraft {
		return {
			name: item.name,
			catalog: item.id,
			dose: item.defaults.dose,
			unit: item.defaults.unit,
			timing: item.defaults.timing,
			trainingDaysOnly: item.defaults.trainingDaysOnly ?? false,
		};
	}

	const EMPTY_DRAFT: SupplementDraft = { name: "", timing: "any", trainingDaysOnly: false };

	async function create(draft: SupplementDraft, photo?: LabelPhoto) {
		await run(async () => {
			await plugin.supplements.create(draft, today, photo);
			editing = null;
		}, t("Suplement „{draft_name}“ přidán.", { draft_name: draft.name }));
	}

	async function update(entry: SupplementEntry, draft: SupplementDraft) {
		await run(async () => {
			await plugin.supplements.update(entry, draft);
			editing = null;
		});
	}

	function meta(entry: SupplementEntry): string {
		const composition = entry.note.ingredients ? t("látek ve složení: {ingredients_length}", { ingredients_length: entry.note.ingredients.length }) : "";
		return [doseLabel(entry.note.dose, entry.note.unit), SUPPLEMENT_TIMING_LABELS[entry.note.timing], composition]
			.filter((part) => part !== "")
			.join(" · ");
	}
</script>

<div class="bf-seg" role="tablist" aria-label={t("Části karty Suplementy")}>
	{#each SECTIONS as s (s.id)}
		<button type="button" role="tab" class:is-active={section === s.id} aria-selected={section === s.id} onclick={() => (section = s.id)}>{s.label}</button>
	{/each}
</div>

{#if section === "today"}
<section class="bf-card">
	<h4>{t("Dnes")}</h4>
	{#if active.length === 0}
		<p class="bf-muted">{t("Zatím nemáš žádný suplement. Vyber si v knihovně, nebo přidej vlastní.")}</p>
		<div class="bf-actions">
			<button type="button" onclick={() => (section = "library")}>{t("Otevřít knihovnu")}</button>
			<button type="button" onclick={() => ((section = "mine"), (editing = "new"))}>{t("Přidat vlastní")}</button>
		</div>
	{:else}
		<div class="bf-supp-table" role="table">
			<div class="bf-supp-tr bf-muted" role="row">
				<span role="columnheader">{t("Suplement")}</span>
				<span role="columnheader" class="bf-supp-num" title={t("Dodržování za posledních 7 dní")}>{t("7 dní")}</span>
				<span role="columnheader" class="bf-supp-num" title={t("Dodržování za posledních 30 dní")}>{t("30 dní")}</span>
			</div>
			{#each overview as { entry, cells } (entry.file.path)}
				<div class="bf-supp-tr" role="row">
					<div role="cell">
					<label class="bf-supp-row">
						<input
							type="checkbox"
							checked={isTaken(taken, entry.note.name)}
							onchange={(e) => void run(() => plugin.supplements.setTaken(today, entry.note.name, e.currentTarget.checked))}
						/>
						<span class="bf-supp-name">{entry.note.name}</span>
						<span class="bf-muted bf-small">{meta(entry)}</span>
						{#if entry.note.catalog === "caffeine" && caffeineLate && !isTaken(taken, entry.note.name)}
							<span class="bf-tag bf-tag-warn" title={t("Kofein i 6 h před ulehnutím zkracuje spánek (Drake 2013, výzkum)")}>{t("méně než 6 h do spaní")}</span>
						{/if}
						{#if entry.note.catalog === "caffeine" && caffeineOver(entry.note.dose, entry.note.unit)}
							<span class="bf-tag bf-tag-warn" title={t("Od {CAFFEINE_EXCESS_MG_PER_KG} mg/kg přibývá nežádoucích účinků bez dalšího přínosu (IOC 2018, konsenzus)", { CAFFEINE_EXCESS_MG_PER_KG })}>{t("dávka nad {CAFFEINE_EXCESS_MG_PER_KG} mg/kg", { CAFFEINE_EXCESS_MG_PER_KG })}</span>
						{/if}
						{#if entry.note.training_days_only && !trainedToday}
							<span class="bf-tag" title={t("Bere se jen ve dnech s tréninkem; dnes zatím žádný zapsaný není")}>{t("dnes bez tréninku")}</span>
						{/if}
					</label>
					</div>
					{#each cells as cell, i (i)}
						<!-- „62 % (5 z 8) · sbírám data (8 z 30 dní)“: stav sběru na vlastním řádku. -->
						<span role="cell" class="bf-small bf-supp-num">
							{#each cell.split(" · ") as part, j (j)}<span class:bf-supp-sub={j > 0}>{part}</span>{/each}
						</span>
					{/each}
				</div>
			{/each}
		</div>
		<p class="bf-muted bf-small">
			{t("Dodržování se počítá od data přidání. Dnešek se započítá, až suplement odškrtneš; u suplementů „jen ve dnech s tréninkem“ se počítají jen dny se zapsaným tréninkem.")}
		</p>
	{/if}
</section>

{#if active.length > 0}
	<DailyOverview entries={active} {weightKg} />
{/if}
{/if}

{#if section === "mine"}
<section class="bf-section">
	<h4>{t("Moje suplementy")}</h4>
	{#each [...active, ...inactive] as entry (entry.file.path)}
		<div class="bf-card">
			<div class="bf-supp-head">
				<button type="button" class="bf-link-button bf-supp-name" onclick={() => void plugin.app.workspace.openLinkText(entry.file.path, "", false)}>
					{entry.note.name}
				</button>
				<span class="bf-muted bf-small">{meta(entry)}{entry.note.training_days_only ? t(" · jen s tréninkem") : ""}</span>
				{#if !entry.note.active}<span class="bf-tag">{t("vypnutý")}</span>{/if}
			</div>
			{#if entry.note.ingredients}
				<details class="bf-small">
					<summary>{t("Složení jedné porce")}</summary>
					{entry.note.ingredients.map((i) => `${i.name} ${doseLabel(i.amount, i.unit)}`).join(" · ")}
				</details>
			{/if}
			{#if editing === entry.file.path}
				<SupplementForm initial={draftOf(entry)} onSave={(draft) => void update(entry, draft)} onCancel={() => (editing = null)} />
			{:else}
				<div class="bf-actions">
					<button type="button" onclick={() => (editing = entry.file.path)}>{t("Upravit")}</button>
					{#if entry.note.active}
						<button type="button" title={t("Přestane se nabízet k odškrtnutí; historie zůstane")} onclick={() => void run(() => plugin.supplements.setActive(entry, false, today))}>
							{t("Vypnout")}
						</button>
					{:else}
						<button type="button" onclick={() => void run(() => plugin.supplements.setActive(entry, true, today))}>{t("Zapnout")}</button>
					{/if}
					<button type="button" onclick={() => void plugin.trashNote(entry.file, "supplement", entry.note.name)}>{t("Smazat")}</button>
				</div>
			{/if}
		</div>
	{/each}
	{#if editing === "new"}
		<div class="bf-card">
			<SupplementForm initial={EMPTY_DRAFT} nameEditable saveLabel={t("Přidat")} onSave={(draft) => void create(draft)} onCancel={() => (editing = null)} />
		</div>
	{:else if editing === "label"}
		<div class="bf-card">
			<LabelForm onSave={(draft, photo) => void create(draft, photo)} onCancel={() => (editing = null)} />
		</div>
	{:else}
		<div class="bf-actions">
			<button type="button" onclick={() => (editing = "new")}>{t("Přidat vlastní suplement")}</button>
			<button type="button" title={t("Přípravek s více látkami: fotka etikety a text složení")} onclick={() => (editing = "label")}>{t("Přidat podle etikety")}</button>
		</div>
	{/if}
</section>

<TrialCard supplements={active} days={dayNotes} {today} />
{/if}

{#if section === "library"}
<section class="bf-section">
	<h4>{t("Knihovna")}</h4>
	<p class="bf-muted bf-small">{t(SUPPLEMENT_DISCLAIMER)}</p>
	<div class="bf-card">
		<div class="bf-small"><strong>{t("Co od suplementů chceš?")}</strong> {t("Knihovna se seřadí podle důkazů v oblastech, které vybereš (bez výběru podle všech). Kliknutím na látku se rozbalí podrobnosti.")}</div>
		<div class="bf-supp-goals">
			{#each BENEFIT_AREAS as area (area)}
				<button type="button" class="bf-supp-goal" class:is-active={goals.includes(area)} aria-pressed={goals.includes(area)} onclick={() => void toggleGoal(area)}>
					{AREA_LABELS[area]}
				</button>
			{/each}
		</div>
		<label class="bf-supp-diet bf-small">
			<span>Strava</span>
			<select value={diet} onchange={(e) => void setDiet(e.currentTarget.value as Diet)}>
				{#each DIETS as d (d.value)}
					<option value={d.value}>{d.label}</option>
				{/each}
			</select>
		</label>
	</div>
	{#if b12Missing}
		<p class="bf-supp-warning">
			{t("Při {v} stravě je nedostatek vitaminu B12 častý a vede k chudokrevnosti a poškození nervů – doplňuj ho (Pawlak 2014, výzkum). Najdeš ho níže ve „Vitaminy B“.", { v: diet === "vegan" ? t("veganské") : t("vegetariánské") })}
		</p>
	{/if}
	<input class="bf-supp-search" type="search" placeholder={t("Hledat látku ({SUPPLEMENT_CATALOG_length} v knihovně)", { SUPPLEMENT_CATALOG_length: SUPPLEMENT_CATALOG.length })} aria-label={t("Hledat v knihovně suplementů")} bind:value={query} />
	<div class="bf-supp-filters bf-small">
		<label>
			<span>{t("Důkazy")}</span>
			<select bind:value={filter.evidence}>
				<option value="all">{t("všechny")}</option>
				<option value="c">{t("aspoň předběžné (A–C)")}</option>
				<option value="b">{t("jen silné a střední (A, B)")}</option>
			</select>
		</label>
		<label>
			<span>{t("Bezpečnost")}</span>
			<select bind:value={filter.safety}>
				<option value="all">{t("všechny")}</option>
				<option value="no_risk">{t("bez vážných rizik (🟢 🟠)")}</option>
				<option value="ok">{t("jen bez známých problémů (🟢)")}</option>
			</select>
		</label>
		<label class="bf-supp-filter-check">
			<input type="checkbox" bind:checked={hideOwned} />
			<span>{t("skrýt, co už beru")}</span>
		</label>
		{#if filtered || query.trim() !== ""}
			<span class="bf-muted">{t("Zobrazeno {shownCount} z {SUPPLEMENT_CATALOG_length}", { shownCount, SUPPLEMENT_CATALOG_length: SUPPLEMENT_CATALOG.length })}</span>
		{/if}
		{#if filtered}
			<button type="button" class="bf-link-button" onclick={() => ((filter = { ...NO_FILTER }), (hideOwned = false))}>{t("zrušit filtry")}</button>
		{/if}
	</div>
	{#if library.length === 0}
		<p class="bf-muted bf-small">
			{filtered ? t("Filtrům nic neodpovídá – zkus je uvolnit.") : t("Nic takového v knihovně není. Vlastní suplement přidáš v části Moje.")}
		</p>
	{/if}
	{#each library as { group, items } (group)}
		<h5>{MATCH_TITLES[group]}</h5>
		{#each items as item (item.id)}
			<RecommendationCard {item} {weightKg} owned={owned(item)} open={shownCount === 1} onAdd={() => (editing = `catalog:${item.id}`)} />
			{#if editing === `catalog:${item.id}`}
				<div class="bf-card">
					<strong>{item.name}</strong>
					<SupplementForm initial={catalogDraft(item)} saveLabel={t("Přidat")} onSave={(draft) => void create(draft)} onCancel={() => (editing = null)} />
				</div>
			{/if}
		{/each}
	{/each}
	<p class="bf-muted bf-small">{t(SUPPLEMENT_CONTAMINATION_NOTE)} <span class="bf-tag">{t("konsenzus")}</span> {t("IOC 2018 (Maughan)")}</p>
	{#if weightKg === null}
		<p class="bf-muted bf-small">{t("Dávky podle hmotnosti (kofein, protein, beta-alanin) se dopočítají, až zapíšeš váhu v check-inu nebo v profilu.")}</p>
	{/if}
</section>
{/if}

{#if section === "tables"}
<AminoAcidTable {weightKg} owned={active.map((e) => ({ name: e.note.name, catalog: e.note.catalog }))} />

<ElectrolyteTable {weightKg} {sex} />
{/if}

<style>
	.bf-supp-search {
		width: 100%;
	}

	.bf-supp-filters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-2) var(--size-4-3);
		align-items: center;
	}

	.bf-supp-filters label {
		display: flex;
		gap: var(--size-2-3);
		align-items: center;
	}

	.bf-section {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	h4,
	h5,
	p {
		margin: 0;
	}

	.bf-supp-goals {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-1);
	}

	/* Vybraný cíl jen barvou – rozměr tlačítka se nemění. */
	.bf-supp-goal {
		height: 26px;
		padding: 0 var(--size-4-2);
		border-radius: 999px;
		font-size: var(--font-ui-smaller);
	}

	.bf-supp-goal.is-active {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.bf-supp-diet {
		display: flex;
		align-items: center;
		gap: var(--size-4-2);
	}

	.bf-supp-warning {
		color: var(--color-orange);
		font-size: var(--font-ui-small);
	}

	h5 {
		margin-top: var(--size-4-2);
		color: var(--text-muted);
		font-size: var(--font-ui-small);
	}

	.bf-small {
		font-size: var(--font-ui-small);
	}

	/* Pevná výška řádku – odškrtnutí nic neposune. */
	.bf-supp-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-4-2);
		min-height: var(--input-height);
		cursor: pointer;
	}

	.bf-supp-name {
		font-weight: var(--font-semibold);
	}

	.bf-supp-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--size-4-2);
	}

	.bf-supp-table {
		display: flex;
		flex-direction: column;
	}

	.bf-supp-tr {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 6.5em 6.5em;
		align-items: center;
		gap: var(--size-4-2);
		padding: var(--size-4-1) 0;
		border-top: 1px solid var(--background-modifier-border);
	}

	.bf-supp-num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.bf-supp-num span {
		display: block;
	}

	.bf-supp-sub {
		color: var(--text-muted);
		font-size: var(--font-ui-smaller);
	}

	.bf-supp-tr:first-child {
		border-top: none;
		font-size: var(--font-ui-small);
	}
</style>
