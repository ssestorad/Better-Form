<script lang="ts">
	// Osobní test (N-of-1): ukazatel z ranního check-inu za 4 týdny před začátkem
	// užívání proti období užívání (nejvýš 8 týdnů). Jen orientačně – bez placeba.
	import { t } from "../../i18n";
	import { TRIAL_DAYS, TRIAL_METRICS, TRIAL_METRIC_LABELS, TRIAL_MIN_SAMPLES, personalTrial, type TrialMetric } from "../../calc/supplements";
	import { sleepDurationMin } from "../../calc/sleep";
	import type { SupplementEntry } from "../../data/SupplementService";
	import type { DayNote } from "../../model/types";
	import { formatCzechDate, formatNumber } from "../format";

	interface Props {
		supplements: SupplementEntry[];
		days: DayNote[];
		today: string;
	}
	let { supplements, days, today }: Props = $props();

	const candidates = $derived(supplements.filter((e) => e.note.since !== undefined));
	let chosen = $state("");
	let metric = $state<TrialMetric>("sleep_quality");
	const entry = $derived(candidates.find((e) => e.file.path === chosen) ?? candidates[0]);

	const trialDays = $derived(
		days.map((d) => ({
			date: d.date,
			sleep: { quality: d.sleep.quality, duration_min: d.sleep.duration_min ?? sleepDurationMin(d.sleep) ?? undefined },
			check_in: d.check_in,
		})),
	);
	const result = $derived(entry?.note.since ? personalTrial(trialDays, entry.note.since, today, metric) : null);

	/** Vyšší hodnota je u všech ukazatelů lepší (škály 5 = nejlepší, délka spánku). */
	function verdict(diff: number): string {
		const threshold = metric === "sleep_duration" ? 0.25 : 0.3;
		if (Math.abs(diff) < threshold) return t("beze zřetelné změny");
		return diff > 0 ? t("zlepšení") : t("zhoršení");
	}
	const unit = $derived(metric === "sleep_duration" ? " h" : "");
</script>

<section class="bf-card">
	<h4>{t("Osobní test")}</h4>
	<p class="bf-muted bf-trial-small">
		{t("Porovná ukazatel z ranního check-inu za {v} týdny před začátkem užívání se stejným obdobím během něj (nejvýš 8 týdnů). Začátek je datum přidání nebo opětovného zapnutí suplementu.", { v: TRIAL_DAYS / 7 })}
	</p>
	{#if candidates.length === 0}
		<p class="bf-muted">{t("Zatím nemáš aktivní suplement s datem začátku.")}</p>
	{:else}
		<div class="bf-grid-2">
			<label class="bf-field">
				<span class="bf-field-label">{t("Suplement")}</span>
				<select value={entry?.file.path ?? ""} onchange={(e) => (chosen = e.currentTarget.value)}>
					{#each candidates as c (c.file.path)}
						<option value={c.file.path}>{c.note.name}</option>
					{/each}
				</select>
			</label>
			<label class="bf-field">
				<span class="bf-field-label">{t("Co sledovat")}</span>
				<select bind:value={metric}>
					{#each TRIAL_METRICS as m (m)}
						<option value={m}>{TRIAL_METRIC_LABELS[m]}</option>
					{/each}
				</select>
			</label>
		</div>
		{#if entry && result}
			<p class="bf-trial-small">{t("Užíváš od {v}.", { v: formatCzechDate(entry.note.since!, false) })}</p>
			{#if result.ready}
				<div class="bf-trial-row">
					<span>{t("Před:")} <strong>{formatNumber(result.before, 2)}{unit}</strong> <span class="bf-muted">{t("({samplesBefore} měření)", { samplesBefore: result.samplesBefore })}</span></span>
					<span>{t("Během:")} <strong>{formatNumber(result.during, 2)}{unit}</strong> <span class="bf-muted">{t("({samplesDuring} měření)", { samplesDuring: result.samplesDuring })}</span></span>
					<span><strong>{verdict(result.diff)}</strong> ({result.diff > 0 ? "+" : "−"}{formatNumber(Math.abs(result.diff), 2)}{unit})</span>
				</div>
			{:else}
				<p class="bf-muted">
					{t("Sbírám data – užívání {v} z {TRIAL_DAYS} dní; měření před {samplesBefore} a během {samplesDuring} (potřeba aspoň {TRIAL_MIN_SAMPLES} v každém období).", { v: Math.min(result.daysDuring, TRIAL_DAYS), TRIAL_DAYS, samplesBefore: result.samplesBefore, samplesDuring: result.samplesDuring, TRIAL_MIN_SAMPLES })}
				</p>
			{/if}
		{/if}
		<p class="bf-muted bf-trial-small">
			{t("Bez placeba je to jen orientační: výsledek ovlivní i očekávání, roční období, trénink a stres.")} <span class="bf-tag">{t("praxe")}</span>
		</p>
	{/if}
</section>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-trial-small {
		font-size: var(--font-ui-smaller);
	}

	.bf-trial-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-1) var(--size-4-3);
		font-size: var(--font-ui-small);
	}

	select {
		width: 100%;
	}
</style>
