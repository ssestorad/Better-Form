<script lang="ts">
	// Čísla za týden / měsíc / rok se srovnáním s předchozím obdobím (SPEC 5.4).
	// Mřížka dlaždic je pevná – při přepínání období se nic neposouvá.
	import { t } from "../../i18n";
	import { percentChange } from "../../calc/monthlySummary";
	import { periodLabel, periodOf, periodStats, shiftPeriod, type PeriodKind, type TonnageContext } from "../../calc/overview";
	import { SESSION_LOAD_BASIS } from "../../calc/load";
	import { PUSHUP_BODYWEIGHT_BASIS } from "../../calc/oneRm";
	import { SPORT_LABELS, SPORTS } from "../../model/constants";
	import type { WorkoutNote } from "../../model/types";
	import BasisTag from "../components/BasisTag.svelte";
	import { formatDurationMin, formatNumber } from "../format";

	interface Props {
		workouts: WorkoutNote[];
		ctx: TonnageContext;
		today: string;
	}
	let { workouts, ctx, today }: Props = $props();

	const KINDS: { kind: PeriodKind; label: string }[] = [
		{ kind: "week", label: t("Týden") },
		{ kind: "month", label: t("Měsíc") },
		{ kind: "year", label: t("Rok") },
	];

	let kind = $state<PeriodKind>("week");
	/** Posun proti aktuálnímu období (0 = teď, −1 = minulé). */
	let offset = $state(0);

	const period = $derived(shiftPeriod(periodOf(kind, today), offset));
	const previous = $derived(shiftPeriod(period, -1));
	const stats = $derived(periodStats(workouts, period.from, period.to, ctx));
	const before = $derived(periodStats(workouts, previous.from, previous.to, ctx));

	const tiles = $derived([
		{ label: t("Tréninky"), value: String(stats.workouts), change: percentChange(stats.workouts, before.workouts) },
		{ label: t("Dny s tréninkem"), value: String(stats.activeDays), change: percentChange(stats.activeDays, before.activeDays) },
		{ label: t("Čas"), value: formatDurationMin(stats.durationMin), change: percentChange(stats.durationMin, before.durationMin) },
		{ label: t("Zátěž (sRPE)"), value: formatNumber(stats.load, 0), change: percentChange(stats.load, before.load) },
		{ label: t("Běh"), value: `${formatNumber(stats.runKm, 1)} km`, change: percentChange(stats.runKm, before.runKm) },
		{ label: t("Plavání"), value: `${formatNumber(stats.swimM / 1000, 2)} km`, change: percentChange(stats.swimM, before.swimM) },
		{ label: t("Zvednuto"), value: `${formatNumber(stats.tonnageKg / 1000, 1)} t`, change: percentChange(stats.tonnageKg, before.tonnageKg) },
	]);
	const sports = $derived(
		SPORTS.filter((s) => (stats.bySport[s] ?? 0) > 0)
			.map((s) => `${SPORT_LABELS[s].toLocaleLowerCase("cs")} ${stats.bySport[s]}×`)
			.join(" · "),
	);

	function setKind(next: PeriodKind) {
		kind = next;
		offset = 0;
	}
</script>

<section class="bf-card">
	<div class="bf-num-head">
		<div class="bf-seg" role="tablist" aria-label={t("Období")}>
			{#each KINDS as k (k.kind)}
				<button type="button" role="tab" aria-selected={kind === k.kind} class:is-active={kind === k.kind} onclick={() => setKind(k.kind)}>{k.label}</button>
			{/each}
		</div>
		<div class="bf-num-nav">
			<button type="button" aria-label={t("Předchozí období")} onclick={() => (offset -= 1)}>‹</button>
			<span class="bf-num-label">{periodLabel(period)}</span>
			<button type="button" aria-label={t("Další období")} disabled={offset >= 0} onclick={() => (offset += 1)}>›</button>
		</div>
	</div>

	<div class="bf-num-grid">
		{#each tiles as tile (tile.label)}
			<div class="bf-num-tile">
				<div class="bf-num-name">{tile.label}</div>
				<div class="bf-num-value">{tile.value}</div>
				<div class="bf-num-change" title={t("Změna proti předchozímu období")}>{tile.change}</div>
			</div>
		{/each}
	</div>

	<p class="bf-muted bf-num-foot">
		{sports || t("V tomto období žádný trénink.")}
		{#if stats.missingLoad > 0}
			{t("· {missingLoad}× chybí RPE nebo délka (do zátěže se nepočítá)", { missingLoad: stats.missingLoad })}
		{/if}
	</p>
	<p class="bf-muted bf-num-foot">
		{t("Zátěž = RPE × minuty")} <BasisTag basis={SESSION_LOAD_BASIS} named />{t(". Zvednuto = kg × opakování pracovních sérií; u cviků s vlastní vahou odhad z tělesné hmotnosti (podíl u kliků")} <BasisTag basis={PUSHUP_BODYWEIGHT_BASIS} named />{t(", u ostatních cviků orientační).")}
	</p>
</section>

<style>
	p {
		margin: 0;
	}

	.bf-num-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-num-nav {
		display: flex;
		align-items: center;
		gap: var(--size-4-1);
	}

	.bf-num-nav button {
		width: 28px;
		padding: 0;
	}

	/* Pevná šířka popisku – šipky se při změně období nehýbou. */
	.bf-num-label {
		width: 11.5em;
		text-align: center;
		font-size: var(--font-ui-small);
		font-variant-numeric: tabular-nums;
	}

	.bf-num-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
		gap: var(--size-4-2);
	}

	.bf-num-tile {
		height: 72px;
		box-sizing: border-box;
		padding: var(--size-4-2);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
		overflow: hidden;
	}

	.bf-num-name,
	.bf-num-change {
		color: var(--text-muted);
		font-size: var(--font-ui-smaller);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bf-num-value {
		font-size: var(--font-ui-medium);
		font-weight: var(--font-bold);
		white-space: nowrap;
	}

	.bf-num-foot {
		font-size: var(--font-ui-small);
	}
</style>
