<script lang="ts">
	// Přehled – běh: tepové zóny, rozložení intenzit (SPEC 8.7) a boty (5.10).
	import { t } from "../../i18n";
	import { Notice } from "obsidian";
	import {
		HR_MAX_BASIS,
		HR_ZONE_BASIS,
		SHOE_LIMIT_BASIS,
		ZONE_LABELS,
		averageRestingHr,
		INTENSITY_BASIS,
		hrZones,
		intensityShare,
		resolveHrMax,
	} from "../../calc/running";
	import type { ShoeEntry } from "../../data/GearService";
	import { getSource } from "../../evidence/sources";
	import { EVIDENCE_LABELS } from "../../model/constants";
	import { toIsoDate } from "../../model/dates";
	import { researchTopic } from "../../seed/research";
	import BasisTag from "../components/BasisTag.svelte";
	import ResearchCard from "../components/ResearchCard.svelte";
	import NumInput from "../components/NumInput.svelte";
	import { usePlugin } from "../context";
	import { formatNumber } from "../format";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const workouts = $derived.by(() => {
		void $indexVersion;
		return plugin.index.all("workout").map((w) => w.note);
	});
	const today = $derived.by(() => {
		void $indexVersion;
		return toIsoDate(new Date());
	});
	const intensity = $derived(intensityShare(workouts, today, 28));
	const warnPct = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.thresholds.intenseShareWarnPct;
	});

	const hrMax = $derived.by(() => {
		void $settingsVersion;
		const { hrMax: measured, birthYear } = plugin.settings.profile;
		return resolveHrMax(measured, birthYear, new Date().getFullYear());
	});
	const restingHr = $derived.by(() => {
		void $indexVersion;
		const values = plugin.index
			.all("day")
			.filter((d) => d.note.hrv.resting_hr !== undefined)
			.sort((a, b) => b.note.date.localeCompare(a.note.date))
			.map((d) => d.note.hrv.resting_hr!);
		return averageRestingHr(values);
	});
	const zones = $derived(hrMax ? hrZones(hrMax.value, restingHr) : []);

	const shoes = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		return plugin.gear.shoes().map((entry) => ({ entry, usage: plugin.gear.usage(entry) }));
	});

	let adding = $state(false);
	let name = $state("");
	let startKm = $state<number | undefined>(undefined);
	let limitKm = $state<number | undefined>(undefined);

	async function run(action: () => Promise<unknown>, done?: string) {
		try {
			await action();
			if (done) new Notice(done);
		} catch (err) {
			new Notice(t("Nepodařilo se: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}

	async function addShoes(event: SubmitEvent) {
		event.preventDefault();
		await run(async () => {
			await plugin.gear.create({ name, startKm, limitKm });
			adding = false;
			name = "";
			startKm = undefined;
			limitKm = undefined;
		}, t("Boty přidány."));
	}

	function openNote(entry: ShoeEntry) {
		void plugin.app.workspace.openLinkText(entry.file.path, "", false);
	}
</script>

<section class="bf-card">
	<h4>{t("Tepové zóny")}</h4>
	{#if hrMax}
		<p class="bf-small">
			{t("Maximální tep {hrMax_value}", { hrMax_value: hrMax.value })}
			{#if hrMax.from === "estimated"}
				{t("– odhad z věku (208 − 0,7 × věk)")}
				<span class="bf-tag" title={getSource(HR_MAX_BASIS.sourceIds[0]!).citation}>{EVIDENCE_LABELS[HR_MAX_BASIS.evidence]}</span>
			{:else}
				{t("– změřený, z profilu")}
			{/if}
			{t("· klidový tep {v}", { v: restingHr ?? t("není zapsaný") })}
		</p>
		<div class="bf-ov-table" role="table">
			{#each zones as zone (zone.zone)}
				<div class="bf-ov-tr bf-ov-zones" role="row">
					<span role="cell">{ZONE_LABELS[zone.zone - 1]}</span>
					<span role="cell" class="bf-ov-num">{zone.from}–{zone.to}</span>
				</div>
			{/each}
		</div>
		<p class="bf-muted bf-small">
			{t("Zóny po 10 % {v}", { v: restingHr !== null ? t("tepové rezervy (klidový tep z posledních check-inů)") : t("maximálního tepu – s klidovým tepem z check-inu budou přesnější") })}
			<span class="bf-tag">{EVIDENCE_LABELS[HR_ZONE_BASIS.evidence]}</span>{t(". Odhad maxima z věku se u jednotlivce může lišit o 10 i více tepů.")}
		</p>
	{:else}
		<p class="bf-muted">{t("Vyplň v profilu rok narození nebo změřený maximální tep.")}</p>
	{/if}
</section>

<section class="bf-card">
	<h4>{t("Rozložení intenzit (4 týdny)")}</h4>
	{#if intensity}
		<div class="bf-ov-bar bf-ov-split" role="img" aria-label={t("Intenzivní čas {v} %", { v: formatNumber(intensity.share * 100, 0) })}>
			<div class="bf-ov-bar-fill" style:width={`${(1 - intensity.share) * 100}%`}></div>
			<div class="bf-ov-bar-fill is-warn" style:width={`${intensity.share * 100}%`}></div>
		</div>
		<p class="bf-small">
			{t("Lehké zóny 1–2:")} <strong>{formatNumber((1 - intensity.share) * 100, 0)} %</strong> {t("· intenzivní zóny 3–5:")}
			<strong>{formatNumber(intensity.share * 100, 0)} %</strong>
			<span class="bf-muted">{t("({runs} běhů s daty o tepu)", { runs: intensity.runs })}</span>
		</p>
		<p class="bf-muted bf-small">
			{t("Vytrvalci s nejlepšími výsledky tráví zhruba 80 % času v nízké intenzitě")} <BasisTag basis={INTENSITY_BASIS} named />{t(". Upozornění přijde nad {warnPct} % intenzivního času.", { warnPct })}
		</p>
	{:else}
		<p class="bf-muted">{t("Sbírám data – rozložení se počítá z času v tepových zónách, který ke běhům dodává Strava (jen s předplatným).")}</p>
	{/if}
	{#if researchTopic("intensity")}<ResearchCard topic={researchTopic("intensity")!} />{/if}
</section>

<section class="bf-card">
	<h4>{t("Boty")}</h4>
	{#if shoes.length === 0 && !adding}
		<p class="bf-muted">{t("Zatím žádné boty. Po přidání je vybereš u běhu a plugin bude počítat kilometry.")}</p>
	{/if}
	{#each shoes as { entry, usage } (entry.file.path)}
		<div class="bf-ov-shoe">
			<div class="bf-ov-shoe-head">
				<button type="button" class="bf-link-button bf-ov-shoe-name" onclick={() => openNote(entry)}>{entry.note.name}</button>
				{#if !entry.note.active}<span class="bf-tag">{t("vyřazené")}</span>{/if}
				{#if usage.status === "over"}
					<span class="bf-tag bf-tag-warn">{t("nad limitem")}</span>
				{:else if usage.status === "near"}
					<span class="bf-tag bf-tag-warn">{t("blíží se limitu")}</span>
				{/if}
			</div>
			<div class="bf-ov-bar" role="img" aria-label={t("{km} z {limit} km", { km: formatNumber(usage.km, 0), limit: formatNumber(usage.limitKm, 0) })}>
				<div class="bf-ov-bar-fill" class:is-warn={usage.status !== "ok"} style:width={`${Math.min(100, usage.ratio * 100)}%`}></div>
			</div>
			<div class="bf-muted bf-small bf-ov-shoe-foot">
				<span>{t("{v} z {v2} km · {runs} běhů", { v: formatNumber(usage.km, 0), v2: formatNumber(usage.limitKm, 0), runs: usage.runs })}</span>
				<button type="button" class="bf-link-button" onclick={() => void run(() => plugin.gear.setActive(entry, !entry.note.active))}>
					{entry.note.active ? t("Vyřadit") : t("Vrátit")}
				</button>
				<button type="button" class="bf-link-button" onclick={() => void plugin.trashNote(entry.file, "shoes", entry.note.name)}>{t("Smazat")}</button>
			</div>
		</div>
	{/each}
	{#if adding}
		<form class="bf-ov-form" onsubmit={addShoes}>
			<label class="bf-field">
				<span class="bf-field-label">{t("Název")}</span>
				<input type="text" bind:value={name} placeholder={t("např. Pegasus 40")} />
			</label>
			<div class="bf-grid-2">
				<label class="bf-field">
					<span class="bf-field-label">{t("Už najeto (km)")}</span>
					<NumInput bind:value={startKm} label={t("Už najeto km")} decimals placeholder="0" />
				</label>
				<label class="bf-field">
					<span class="bf-field-label">{t("Limit (km)")}</span>
					<NumInput bind:value={limitKm} label={t("Limit km")} placeholder={String(plugin.settings.thresholds.shoeLimitKm)} />
				</label>
			</div>
			<div class="bf-actions">
				<button type="submit" class="mod-cta" disabled={name.trim() === ""}>{t("Přidat")}</button>
				<button type="button" onclick={() => (adding = false)}>{t("Zrušit")}</button>
			</div>
		</form>
	{:else}
		<div class="bf-actions">
			<button type="button" onclick={() => (adding = true)}>{t("Přidat boty")}</button>
		</div>
	{/if}
	<p class="bf-muted bf-small">
		{t("Limit kilometrů je orientační zvyklost")} <span class="bf-tag">{EVIDENCE_LABELS[SHOE_LIMIT_BASIS.evidence]}</span> {t("– rozhoduje stav bot a to, jak se v nich běhá. Výchozí limit změníš v nastavení.")}
	</p>
</section>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-small {
		font-size: var(--font-ui-small);
	}

	.bf-ov-table {
		display: flex;
		flex-direction: column;
	}

	/* Pevné sloupce, čísla zarovnaná vpravo. */
	.bf-ov-tr {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1.1fr);
		gap: var(--size-4-2);
		padding: var(--size-4-1) 0;
		border-top: 1px solid var(--background-modifier-border);
	}

	.bf-ov-tr:first-child {
		border-top: none;
	}

	.bf-ov-zones {
		grid-template-columns: minmax(0, 1fr) auto;
	}

	.bf-ov-num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.bf-ov-shoe {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-1);
	}

	.bf-ov-shoe-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--size-4-2);
	}

	.bf-ov-shoe-name {
		font-weight: var(--font-semibold);
	}

	.bf-ov-shoe-foot {
		display: flex;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	/* Ukazatel má pevnou výšku; mění se jen šířka výplně. */
	.bf-ov-bar {
		height: 6px;
		border-radius: 3px;
		background-color: var(--background-modifier-border);
		overflow: hidden;
	}

	.bf-ov-bar-fill {
		height: 100%;
		background-color: var(--interactive-accent);
	}

	.bf-ov-bar-fill.is-warn {
		background-color: var(--color-orange);
	}

	.bf-ov-split {
		display: flex;
		height: 10px;
	}

	.bf-ov-form {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}
</style>
