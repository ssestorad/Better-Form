<script lang="ts">
	// Připravenost dne (SPEC 8.9) s rozpadem, z čeho vznikla. Složky jsou podložené,
	// jejich bodování a váhy jsou heuristika – v UI je to napsané.
	import { t } from "../../i18n";
	import { READINESS_BASIS, READINESS_LEVELS, TREND_MIN_SAMPLES, readinessTrend, type Readiness, type ReadinessDay, type ReadinessLevel } from "../../calc/readiness";
	import BasisTag from "../components/BasisTag.svelte";
	import { formatNumber, formatShortDate, formatSigned } from "../format";

	interface Props {
		readiness: Readiness | null;
		/** Skóre posledních 14 dní od nejstaršího (pro trend). */
		history?: ReadinessDay[];
		onCheckIn: () => void;
	}
	let { readiness, history = [], onCheckIn }: Props = $props();

	const trend = $derived(readinessTrend(history));
	const levelOf = (score: number): ReadinessLevel => (score >= READINESS_LEVELS.ready ? "ready" : score >= READINESS_LEVELS.caution ? "caution" : "rest");

	const LEVEL_TEXT: Record<ReadinessLevel, string> = {
		ready: t("Tělo je připravené na trénink"),
		caution: t("Trénuj s rozmyslem"),
		rest: t("Dnes spíš lehce nebo volno"),
	};
</script>

<section class="bf-card">
	<header class="bf-rd-head">
		<h4>{t("Připravenost")}</h4>
		<BasisTag basis={READINESS_BASIS} />
	</header>
	{#if readiness}
		<div class="bf-rd-main">
			<div class={`bf-rd-score is-${readiness.level}`}>{readiness.score}</div>
			<div>
				<div class="bf-rd-level">{LEVEL_TEXT[readiness.level]}</div>
				<div class="bf-muted bf-rd-small">{t("skóre 0–100 z {parts_length} {v}", { parts_length: readiness.parts.length, v: readiness.parts.length === 1 ? t("složky") : t("složek") })}</div>
			</div>
		</div>
		<div class="bf-rd-parts">
			{#each readiness.parts as part (part.id)}
				<div class="bf-rd-part">
					<div class="bf-rd-row">
						<span>{part.label}</span>
						<span class="bf-rd-num">{part.score} <span class="bf-muted">{t("· váha {v} %", { v: Math.round(part.share * 100) })}</span></span>
					</div>
					<div class="bf-rd-bar"><div class={`bf-rd-fill ${part.score >= 70 ? "is-ready" : part.score >= 45 ? "is-caution" : "is-rest"}`} style:width={`${part.score}%`}></div></div>
					<div class="bf-muted bf-rd-small bf-rd-row">
						<span>{part.detail}</span>
						<BasisTag basis={part.basis} named />
					</div>
				</div>
			{/each}
		</div>
		{#if readiness.missing.length > 0}
			<p class="bf-muted bf-rd-small">{t("Dnes chybí: {v}. Váhy ostatních složek se přepočítaly.", { v: readiness.missing.join(", ") })}</p>
		{/if}
		<p class="bf-muted bf-rd-small">{t("Jednotlivé složky mají oporu ve výzkumu; jejich bodování a váhy jsou odhad, ne měření. Ber skóre jako pomůcku.")}</p>
	{:else}
		<p class="bf-muted">{t("Sbírám data – připravenost se počítá ze spánku, pocitů a HRV z ranního check-inu a ze zátěže tréninků.")}</p>
		<div class="bf-actions"><button type="button" onclick={onCheckIn}>{t("Ranní check-in")}</button></div>
	{/if}
	{#if history.length > 0}
		<div class="bf-rd-trend">
			<div class="bf-rd-row">
				<span class="bf-rd-level">{t("Posledních {history_length} dní", { history_length: history.length })}</span>
				<span class="bf-rd-small bf-rd-num">
					{#if trend.recent !== null}
						{t("průměr za 7 dní {v}{v2}", { v: formatNumber(trend.recent, 0), v2: trend.delta !== null ? t(" ({v} proti předchozím 7 dnům)", { v: formatSigned(trend.delta, 0).replace(/^(\d)/, "+$1") }) : "" })}
					{:else}
						{t("sbírám data ({slice_length} z {TREND_MIN_SAMPLES} dnů se skóre za poslední týden)", { slice_length: history.slice(-7).filter((d) => d.score !== null).length, TREND_MIN_SAMPLES })}
					{/if}
				</span>
			</div>
			<div class="bf-rd-days" role="img" aria-label={t("Skóre připravenosti po dnech")}>
				{#each history as day (day.date)}
					<div class="bf-rd-day" title={`${formatShortDate(day.date)}: ${day.score === null ? t("bez dat") : day.score}`}>
						{#if day.score !== null}
							<div class={`bf-rd-daybar is-${levelOf(day.score)}`} style:height={`${Math.max(6, day.score)}%`}></div>
						{:else}
							<div class="bf-rd-daybar is-empty"></div>
						{/if}
					</div>
				{/each}
			</div>
			<p class="bf-muted bf-rd-small">{t("Jeden den moc neřekne – dívej se, kam skóre míří několik dní po sobě.")} <BasisTag basis={READINESS_BASIS} /></p>
		</div>
	{/if}
</section>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-rd-head,
	.bf-rd-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--size-4-2);
	}

	.bf-rd-main {
		display: flex;
		align-items: center;
		gap: var(--size-4-3);
	}

	/* Skóre má pevný čtverec – číslo nemění rozvržení. */
	.bf-rd-score {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		flex-shrink: 0;
		border-radius: var(--radius-m);
		font-size: var(--font-ui-large);
		font-weight: var(--font-bold);
		font-variant-numeric: tabular-nums;
		color: var(--text-on-accent);
	}

	.is-ready {
		background-color: var(--color-green);
	}

	.is-caution {
		background-color: var(--color-orange);
	}

	.is-rest {
		background-color: var(--color-red);
	}

	.bf-rd-level {
		font-weight: var(--font-semibold);
	}

	.bf-rd-trend {
		display: flex;
		flex-direction: column;
		gap: var(--size-2-3);
		padding-top: var(--size-4-2);
		border-top: 1px solid var(--background-modifier-border);
	}

	/* Sloupce mají pevnou výšku i šířku – při najetí myší se nic nehýbe. */
	.bf-rd-days {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 3px;
		height: 44px;
		align-items: end;
	}

	.bf-rd-day {
		display: flex;
		align-items: flex-end;
		height: 100%;
	}

	.bf-rd-daybar {
		width: 100%;
		border-radius: 2px;
	}

	.bf-rd-daybar.is-empty {
		height: 3px;
		background-color: var(--background-modifier-border);
	}

	.bf-rd-small {
		font-size: var(--font-ui-smaller);
	}

	.bf-rd-parts {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-rd-part {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: var(--font-ui-small);
	}

	.bf-rd-num {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.bf-rd-bar {
		height: 6px;
		border-radius: 3px;
		background-color: var(--background-modifier-border);
		overflow: hidden;
	}

	.bf-rd-fill {
		height: 100%;
	}
</style>
