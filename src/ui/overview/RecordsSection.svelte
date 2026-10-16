<script lang="ts">
	// Osobní rekordy (SPEC 9.1) a odhad závodního času (8.7).
	import { t } from "../../i18n";
	import { formatClockDuration, formatPace } from "../../calc/performance";
	import { REP_MAX_COUNTS, exerciseRecords, swimRecords, type ExerciseRecords, type RecordContext } from "../../calc/records";
	import { RECORD_DISTANCES, RIEGEL_BASIS, longestRun, riegelTime, runRecords } from "../../calc/running";
	import { EPLEY_BASIS } from "../../calc/oneRm";
	import type { TestNote, WorkoutNote } from "../../model/types";
	import BasisTag from "../components/BasisTag.svelte";
	import { formatNumber, formatSeconds, formatShortDate } from "../format";

	interface Props {
		workouts: WorkoutNote[];
		tests: TestNote[];
		ctx: RecordContext;
	}
	let { workouts, tests, ctx }: Props = $props();

	/** Kolik cviků se ukáže, než uživatel rozbalí zbytek. */
	const TOP = 8;

	const runs = $derived(runRecords(workouts));
	const longest = $derived(longestRun(workouts));
	const hasRuns = $derived(workouts.some((w) => w.sport === "run"));
	const swim = $derived(swimRecords(workouts));
	const exercises = $derived(exerciseRecords(workouts, tests, ctx));
	let showAll = $state(false);
	const shown = $derived(showAll ? exercises : exercises.slice(0, TOP));

	// Odhad závodu: výchozí je nejnovější rekord.
	let baseKey = $state<string | null>(null);
	const base = $derived(runs.find((r) => r.distance.key === baseKey) ?? [...runs].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null);
	const estimates = $derived(
		base
			? RECORD_DISTANCES.filter((d) => d.key !== "1k").map((d) => {
					const seconds = d.key === base.distance.key ? base.seconds : riegelTime(base.seconds, base.distance.km, d.km);
					return { distance: d, seconds, actual: d.key === base.distance.key };
				})
			: [],
	);

	const kgText = (v: number) => `${formatNumber(v, 1)} kg`;

	/** Hlavní rekordy cviku jako krátké položky s datem v bublině. */
	function parts(rec: ExerciseRecords): { text: string; date: string }[] {
		const out: { text: string; date: string }[] = [];
		if (rec.oneRm) out.push({ text: `1RM ${kgText(rec.oneRm.value)}`, date: rec.oneRm.date });
		if (rec.maxReps) out.push({ text: t("{n} opak.", { n: rec.maxReps.value }), date: rec.maxReps.date });
		if (rec.longestHold) out.push({ text: formatSeconds(rec.longestHold.value), date: rec.longestHold.date });
		if (rec.heaviest) out.push({ text: `${kgText(rec.heaviest.kg)} × ${rec.heaviest.reps}`, date: rec.heaviest.date });
		if (rec.density) {
			out.push({ text: t("{n} opak./min", { n: rec.density.repsPerMin }) + (rec.density.kg ? ` (${kgText(rec.density.kg)})` : ""), date: rec.density.date });
		}
		// Nejtěžší série: stejná váha pro víc počtů se ukáže jen u nejvyššího.
		let previous: number | null = null;
		for (const n of [...REP_MAX_COUNTS].reverse()) {
			const r = rec.repMax[n];
			if (!r || r.value === previous) continue;
			previous = r.value;
			out.push({ text: `${n}× ${rec.measure === "reps_bw" ? "+" : ""}${kgText(r.value)}`, date: r.date });
		}
		return out;
	}
</script>

<section class="bf-card">
	<h4>{t("Běh")}</h4>
	{#if !hasRuns}
		<p class="bf-muted">{t("Zatím žádný běh. Zapiš ho ručně nebo připoj Stravu v nastavení.")}</p>
	{:else}
		<div class="bf-rec-table" role="table">
			{#each runs as record (record.distance.key)}
				<div class="bf-rec-run" role="row">
					<span role="cell">{record.distance.label}</span>
					<span role="cell" class="bf-rec-num">{formatClockDuration(record.seconds)}</span>
					<span role="cell" class="bf-muted bf-rec-num">{formatPace(record.seconds / record.distance.km)}</span>
					<span role="cell" class="bf-muted">{formatShortDate(record.date)}{record.from === "segment" ? t(" · úsek") : ""}</span>
				</div>
			{/each}
			{#if longest}
				<div class="bf-rec-run" role="row">
					<span role="cell">{t("Nejdelší běh")}</span>
					<span role="cell" class="bf-rec-num">{formatNumber(longest.km, 2)} km</span>
					<span role="cell"></span>
					<span role="cell" class="bf-muted">{formatShortDate(longest.date)}</span>
				</div>
			{/if}
		</div>
		<p class="bf-muted bf-rec-small">
			{runs.length === 0
				? t("Rekord na trati se objeví, až poběžíš 1, 5, 10 km, půlmaraton nebo maraton (±2 %), nebo až Strava dodá nejrychlejší úseky.")
				: t("„úsek“ = nejrychlejší úsek uvnitř delšího běhu podle Stravy; jinak celý běh dané délky (±2 %).")}
		</p>
	{/if}
</section>

{#if base}
	<section class="bf-card">
		<h4>{t("Odhad závodního času")}</h4>
		<label class="bf-rec-base bf-rec-small">
			<span>{t("Vychází z rekordu")}</span>
			<select value={base.distance.key} onchange={(e) => (baseKey = e.currentTarget.value)}>
				{#each runs as record (record.distance.key)}
					<option value={record.distance.key}>{t("{distance_label} za {v} ({v2})", { distance_label: record.distance.label, v: formatClockDuration(record.seconds), v2: formatShortDate(record.date) })}</option>
				{/each}
			</select>
		</label>
		<div class="bf-rec-table" role="table">
			{#each estimates as row (row.distance.key)}
				<div class="bf-rec-run" role="row">
					<span role="cell">{row.distance.label}</span>
					<span role="cell" class="bf-rec-num">{row.seconds === null ? "—" : formatClockDuration(row.seconds)}</span>
					<span role="cell" class="bf-muted bf-rec-num">{row.seconds === null ? "" : formatPace(row.seconds / row.distance.km)}</span>
					<span role="cell" class="bf-muted">{row.actual ? t("skutečný čas") : "odhad"}</span>
				</div>
			{/each}
		</div>
		<p class="bf-muted bf-rec-small">
			{t("Riegel: T2 = T1 × (D2 / D1)^1,06")} <BasisTag basis={RIEGEL_BASIS} named />{t(". Počítá s tím, že na delší trať máš natrénováno; u půlmaratonu a maratonu z krátkého běhu bývá odhad příliš optimistický.")}
		</p>
	</section>
{/if}

<section class="bf-card">
	<h4>{t("Síla, vlastní váha a výdrže")}</h4>
	{#if exercises.length === 0}
		<p class="bf-muted">{t("Zatím žádný zapsaný výkon.")}</p>
	{:else}
		<div class="bf-rec-table">
			{#each shown as rec (rec.name)}
				<div class="bf-rec-ex">
					<span class="bf-rec-name">{rec.name}</span>
					<span class="bf-rec-parts">
						{#each parts(rec) as part, i (i)}
							<span class="bf-rec-part" title={formatShortDate(part.date)}>{part.text}</span>
						{/each}
					</span>
				</div>
			{/each}
		</div>
		{#if exercises.length > TOP}
			<button type="button" class="bf-link-button" onclick={() => (showAll = !showAll)}>
				{showAll ? t("Jen nejčastější cviky") : t("Zobrazit všech {exercises_length} cviků", { exercises_length: exercises.length })}
			</button>
		{/if}
		<p class="bf-muted bf-rec-small">
			{t("1RM je odhad vzorcem Epley ze série do 10 opakování")} <BasisTag basis={EPLEY_BASIS} />{t("; u švihových cviků se nepočítá. „5× 80 kg“ = nejtěžší série s aspoň 5 opakováními. Datum rekordu se ukáže po najetí myší.")}
		</p>
	{/if}
</section>

{#if swim.longest}
	<section class="bf-card">
		<h4>{t("Plavání")}</h4>
		<div class="bf-rec-table" role="table">
			<div class="bf-rec-run" role="row">
				<span role="cell">{t("Nejdelší plavání")}</span>
				<span role="cell" class="bf-rec-num">{formatNumber(swim.longest.value, 0)} m</span>
				<span role="cell"></span>
				<span role="cell" class="bf-muted">{formatShortDate(swim.longest.date)}</span>
			</div>
			{#if swim.fastest100}
				<div class="bf-rec-run" role="row">
					<span role="cell">{t("Průměr na 100 m")}</span>
					<span role="cell" class="bf-rec-num">{formatClockDuration(swim.fastest100.value)}</span>
					<span role="cell"></span>
					<span role="cell" class="bf-muted">{formatShortDate(swim.fastest100.date)}</span>
				</div>
			{/if}
		</div>
		<p class="bf-muted bf-rec-small">{t("Průměr na 100 m se počítá z délky celého tréninku včetně přestávek.")}</p>
	</section>
{/if}

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-rec-small {
		font-size: var(--font-ui-smaller);
	}

	.bf-rec-table {
		display: flex;
		flex-direction: column;
	}

	/* Pevné sloupce, čísla zarovnaná vpravo. */
	.bf-rec-run {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1.1fr);
		gap: var(--size-4-2);
		padding: var(--size-4-1) 0;
		border-top: 1px solid var(--background-modifier-border);
		font-size: var(--font-ui-small);
	}

	.bf-rec-run:first-child,
	.bf-rec-ex:first-child {
		border-top: none;
	}

	.bf-rec-num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.bf-rec-ex {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
		gap: var(--size-4-2);
		padding: var(--size-4-1) 0;
		border-top: 1px solid var(--background-modifier-border);
		font-size: var(--font-ui-small);
	}

	.bf-rec-name {
		font-weight: var(--font-semibold);
	}

	.bf-rec-parts {
		display: flex;
		flex-wrap: wrap;
		gap: 2px var(--size-4-2);
	}

	.bf-rec-part {
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.bf-rec-base {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-4-2);
	}
</style>
