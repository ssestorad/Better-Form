<script lang="ts">
	// Karta látky z katalogu. Sbalená ukazuje jen název, známky po oblastech a bezpečnost;
	// po rozkliknutí shrnutí, volbu druhu (protein, hořčík…), dávkování, rizika a srovnání studií rozdělené podle oblastí.
	import { t } from "../../i18n";
	import { STUDY_KIND_LABELS, getSource } from "../../evidence/sources";
	import SourceLinks from "../components/SourceLinks.svelte";
	import InteractionItem from "./InteractionItem.svelte";
	import { MEDICATION_LABELS, WADA_NOTES, WADA_SOURCES, interactionsFor, type MedicationId } from "../../calc/supplementSafety";
	import { EVIDENCE_LABELS } from "../../model/constants";
	import {
		AREA_LABELS,
		GRADE_HELP,
		GRADE_SHORT,
		SAFETY_DOCTOR_NOTE,
		SAFETY_LABELS,
		benefitText,
		splitBenefits,
		type BenefitArea,
	} from "../../seed/supplementModel";
	import type { CatalogSupplement } from "../../seed/supplements";
	import type { StudyFinding } from "../../seed/supplementModel";
	import { personalDose } from "./text";

	interface Props {
		item: CatalogSupplement;
		weightKg: number | null;
		/** Už je v „Moje suplementy“ (kterýkoli druh). */
		owned: boolean;
		/** Druhy, které už v „Moje suplementy“ jsou – další druh téže látky jde přidat. */
		ownedVariants?: readonly string[];
		/** Přidání do „Moje suplementy“ s vybraným druhem. */
		onAdd: (variant: string | undefined) => void;
		/** Rozbalit hned (např. když hledání našlo jedinou látku). */
		open?: boolean;
		/** Předvybraný druh (hledání našlo jeho název). */
		variant?: string;
		/** Skupiny léků z profilu – interakce s nimi se zvýrazní. */
		medications?: readonly MedicationId[];
	}
	let { item, weightKg, owned, ownedVariants = [], onAdd, open = false, variant, medications = [] }: Props = $props();

	const interactions = $derived(interactionsFor(item.id));
	const mine = (i: (typeof interactions)[number]) => i.medications.some((m) => medications.includes(m));
	const withMyMedication = $derived(interactions.some(mine));
	const wada = $derived(WADA_NOTES[item.id]);

	/** Druh vybraný klepnutím; "" = výběr zrušený. */
	let chosen = $state<string | undefined>(undefined);
	const selected = $derived(chosen ?? variant);
	const current = $derived(item.variants?.find((v) => v.id === selected));
	const withSource = (s: StudyFinding) => ({ ...getSource(s.source), finding: s.finding, funded: s.funded === true });

	const split = $derived(splitBenefits(item.benefits));
	const personal = $derived(personalDose(item.id, weightKg));
	const SAFETY_ICONS = { ok: "🟢", caution: "🟠", risk: "🔴" } as const;

	/** Studie rozdělené podle oblasti; obecné (bez oblasti) první. */
	const groups = $derived.by(() => {
		const order: (BenefitArea | null)[] = [null, ...item.benefits.map((b) => b.area)];
		const out: { area: BenefitArea | null; studies: (ReturnType<typeof getSource> & { finding: string; funded: boolean })[] }[] = [];
		for (const area of order) {
			if (out.some((g) => g.area === area)) continue;
			const studies = item.studies
				.filter((s) => (s.area ?? null) === area)
				.map(withSource);
			if (studies.length > 0) out.push({ area, studies });
		}
		// Studie k oblasti, která není v hodnocení, nesmí zmizet.
		const shown = new Set(out.flatMap((g) => g.studies.map((s) => s.citation)));
		const rest = item.studies.filter((s) => !shown.has(getSource(s.source).citation));
		if (rest.length > 0) out.push({ area: null, studies: rest.map(withSource) });
		return out;
	});
</script>

{#snippet studyItem(study: ReturnType<typeof withSource>)}
	<li>
		<div>
			<strong>{study.short}</strong>
			{#if study.kind}<span class="bf-tag">{STUDY_KIND_LABELS[study.kind]}</span>{/if}
			{#if study.funded}<span class="bf-tag bf-tag-warn" title={t("The study was paid for or written by the manufacturer of the tested product")}>{t("funded by the manufacturer")}</span>{/if}
		</div>
		<div>{study.finding}</div>
		{#if study.note}<div class="bf-muted">{t("Note: {note}", { note: study.note })}</div>{/if}
		<div class="bf-muted bf-rec-citation">
			{#if study.url}
				<a href={study.url} target="_blank" rel="noopener">{study.citation}</a>
			{:else}
				{study.citation}
			{/if}
		</div>
	</li>
{/snippet}

<details class="bf-card bf-rec" {open}>
	<summary class="bf-rec-summary">
		<span class="bf-rec-name">{item.name}</span>
		<span class="bf-rec-chips">
			{#each split.good as b (b.area)}<span class="bf-rec-benefit is-good" title={benefitText(b)}>{AREA_LABELS[b.area]} {GRADE_SHORT[b.grade]}</span>{/each}
			{#each split.maybe as b (b.area)}<span class="bf-rec-benefit" title={benefitText(b)}>{AREA_LABELS[b.area]} {GRADE_SHORT[b.grade]}</span>{/each}
			{#each split.none as b (b.area)}<span class="bf-rec-benefit is-none" title={benefitText(b)}>{AREA_LABELS[b.area]} {GRADE_SHORT[b.grade]}</span>{/each}
		</span>
		<span class="bf-rec-side">
			{#if owned}<span class="bf-tag">{t("you have it")}</span>{/if}
			{#if withMyMedication}<span class="bf-tag bf-tag-warn" title={t("Interacts with medication you take (settings → Profile)")}>{t("your medication")}</span>{/if}
			<span title={SAFETY_LABELS[item.safety]} aria-label={t("Safety: {v}", { v: SAFETY_LABELS[item.safety] })}>{SAFETY_ICONS[item.safety]}</span>
			<span class="bf-rec-chevron" aria-hidden="true">›</span>
		</span>
	</summary>
	<div class="bf-rec-body">
		<div class="bf-rec-head">
			<span class="bf-tag" class:bf-tag-warn={item.safety !== "ok"} title={SAFETY_LABELS[item.safety]}>{t("{v} safety", { v: SAFETY_ICONS[item.safety] })}</span>
			<span class="bf-tag" title={t("Evidence level of the whole entry")}>{EVIDENCE_LABELS[item.basis.evidence]}</span>
			{#if wada}<span class="bf-tag" title={wada}>WADA</span>{/if}
		</div>
		<p>{item.summary}</p>
		{#if item.variants}
			<div class="bf-rec-variants">
				<div class="bf-rec-chiprow" role="radiogroup" aria-label={t("Type")}>
					<span class="bf-muted">{t("Type")}</span>
					{#each item.variants as v (v.id)}
						<button
							type="button"
							class="bf-rec-variant"
							class:is-active={selected === v.id}
							role="radio"
							aria-checked={selected === v.id}
							onclick={() => (chosen = selected === v.id ? "" : v.id)}>{v.name}</button
						>
					{/each}
				</div>
				{#if current}
					<p>{current.summary}</p>
					<details class="bf-rec-more">
						<summary>{t("Sources comparing the types ({n})", { n: current.studies.length })}</summary>
						<ul class="bf-rec-studies bf-rec-list">
							{#each current.studies.map(withSource) as study, si (si)}{@render studyItem(study)}{/each}
						</ul>
					</details>
				{:else}
					<p class="bf-muted">{t("Pick a type to see how it differs.")}</p>
				{/if}
			</div>
		{/if}
		<dl class="bf-rec-rows">
			{#if split.good.length > 0}
				<dt>{t("Makes sense for")}</dt>
				<dd class="bf-rec-chiprow">
					{#each split.good as b (b.area)}<span class="bf-rec-benefit is-good" title={GRADE_HELP[b.grade]}>{benefitText(b)}</span>{/each}
				</dd>
			{/if}
			{#if split.maybe.length > 0}
				<dt>{t("May help")}</dt>
				<dd class="bf-rec-chiprow">
					{#each split.maybe as b (b.area)}<span class="bf-rec-benefit" title={GRADE_HELP[b.grade]}>{benefitText(b)}</span>{/each}
				</dd>
			{/if}
			{#if split.none.length > 0}
				<dt>{t("Not confirmed / doesn't work")}</dt>
				<dd class="bf-rec-chiprow">
					{#each split.none as b (b.area)}<span class="bf-rec-benefit is-none" title={GRADE_HELP[b.grade]}>{benefitText(b)}</span>{/each}
				</dd>
			{/if}
		</dl>
		{#if item.safety !== "ok"}
			<p class="bf-rec-safety">{SAFETY_ICONS[item.safety]} {item.safetyNote ?? SAFETY_LABELS[item.safety]} {t(SAFETY_DOCTOR_NOTE)}</p>
		{/if}
		<!-- Dávkování, pro koho a rizika jsou vidět hned – studie až pod nimi. -->
		<dl class="bf-rec-rows">
			<dt>{t("Dosing")}</dt>
			<dd>
				{item.dosing}
				{#if personal}<br /><strong>{personal}</strong>{/if}
			</dd>
			<dt>{t("Who it's for")}</dt>
			<dd>{item.forWhom}</dd>
			<dt>{t("Risks and limits")}</dt>
			<dd>{item.risks}</dd>
			{#if interactions.length > 0}
				<dt>{t("Medication")}</dt>
				<dd>
					<ul class="bf-rec-interactions">
						{#each interactions as i, ii (ii)}
							<InteractionItem
								title={i.medications.map((m) => MEDICATION_LABELS[m]).join(", ")}
								finding={i.text.finding}
								advice={i.text.advice}
								sources={i.sources}
								avoid={i.avoid}
								mine={mine(i)}
							/>
						{/each}
					</ul>
					<div class="bf-muted">{t("Interactions with medication you take are highlighted – set them in settings → Profile. If you take medication, ask a pharmacist or doctor before starting a supplement.")}</div>
				</dd>
			{/if}
			{#if wada}
				<dt>{t("Anti-doping")}</dt>
				<dd>
					{wada}
					<SourceLinks ids={WADA_SOURCES} />
				</dd>
			{/if}
		</dl>
		<details class="bf-rec-more">
			<summary>{t("Comparison of {studies_length} sources", { studies_length: item.studies.length })}</summary>
			<dl class="bf-rec-list">
				{#each groups as group, gi (gi)}
					<dt>{group.area ? t("Studies – {v}", { v: AREA_LABELS[group.area] }) : t("Studies – main effect and safety")}</dt>
					<dd>
						<ul class="bf-rec-studies">
							{#each group.studies as study, si (si)}{@render studyItem(study)}{/each}
						</ul>
					</dd>
				{/each}
				<dt>{t("Do they agree?")}</dt>
				<dd>{item.agreement}</dd>
				<dt>{t("How to read the grades")}</dt>
				<dd class="bf-muted">
					{#each Object.entries(GRADE_HELP) as [grade, help] (grade)}
						<div><strong>{GRADE_SHORT[grade as keyof typeof GRADE_SHORT]}</strong> – {help}</div>
					{/each}
				</dd>
			</dl>
		</details>
		<div class="bf-actions">
			{#if current ? ownedVariants.includes(current.id) : owned}
				<span class="bf-muted bf-rec-owned">{t("In your list")}</span>
			{:else}
				<button type="button" onclick={() => onAdd(current?.id)}>{current ? t("Add – {v}", { v: current.name }) : t("Add to my supplements")}</button>
			{/if}
		</div>
	</div>
</details>

<style>
	.bf-rec-interactions {
		margin: 0;
		padding-left: var(--size-4-5);
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-rec {
		font-size: var(--font-ui-small);
	}

	/* Obsah rozbalené karty: bloky pod sebou s mezerami (details sám flex neumí). */
	.bf-rec-body {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
		margin-top: var(--size-4-3);
		line-height: 1.5;
	}

	.bf-rec-body p {
		margin: 0;
	}

	.bf-rec-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--size-4-2);
	}

	/* Sbalený řádek: název, známky po oblastech, vpravo „máš“ a bezpečnost. */
	.bf-rec-summary {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--size-4-1) var(--size-4-2);
		align-items: baseline;
		color: var(--text-normal);
		list-style: none;
	}

	.bf-rec-summary::-webkit-details-marker {
		display: none;
	}

	.bf-rec-chips {
		grid-column: 1 / -1;
		grid-row: 2;
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-1);
	}

	.bf-rec-side {
		display: flex;
		align-items: baseline;
		gap: var(--size-4-1);
	}

	/* Šipka se jen otáčí – rozměry řádku se nemění. */
	.bf-rec-chevron {
		display: inline-block;
		width: 1em;
		text-align: center;
		color: var(--text-muted);
	}

	.bf-rec[open] > .bf-rec-summary .bf-rec-chevron {
		transform: rotate(90deg);
	}

	.bf-rec-name {
		font-size: var(--font-ui-medium);
		font-weight: var(--font-semibold);
	}

	/* Řádky „popisek – hodnota“; na úzkém panelu se popisek zalomí nad hodnotu. */
	.bf-rec-rows {
		display: grid;
		grid-template-columns: minmax(7em, auto) 1fr;
		gap: var(--size-4-2) var(--size-4-3);
		margin: 0;
	}

	.bf-rec-rows dt,
	.bf-rec-list dt {
		color: var(--text-muted);
	}

	.bf-rec-rows dd {
		margin: 0;
	}

	.bf-rec-chiprow {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-1) var(--size-4-2);
	}

	.bf-rec-benefit {
		padding: 1px var(--size-4-2);
		border-radius: var(--radius-s);
		background-color: var(--background-modifier-hover);
	}

	.bf-rec-benefit.is-good {
		background-color: rgba(var(--color-green-rgb), 0.15);
	}

	.bf-rec-benefit.is-none {
		color: var(--text-muted);
	}

	.bf-rec-variants {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	/* Volba druhu jako štítky; vybraný se jen přebarví – rozměry se nemění. */
	.bf-rec-variant {
		height: 26px;
		padding: 0 var(--size-4-2);
		border-radius: 999px;
		font-size: var(--font-ui-smaller);
	}

	.bf-rec-variant.is-active {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.bf-rec-safety {
		color: var(--color-orange);
	}

	summary {
		cursor: pointer;
	}

	.bf-rec-more > summary {
		color: var(--text-muted);
	}

	.bf-rec-list {
		margin: var(--size-4-3) 0 0;
	}

	.bf-rec-list dd {
		margin: var(--size-4-1) 0 var(--size-4-3);
	}

	.bf-rec-studies {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
	}

	.bf-rec-studies li {
		padding-left: var(--size-4-2);
		border-left: 2px solid var(--background-modifier-border);
	}

	.bf-rec-citation {
		font-size: var(--font-ui-smaller);
	}

	.bf-rec-owned {
		line-height: var(--input-height);
	}
</style>
