<script lang="ts">
	// Import běhů: ze souboru GPX / TCX, ruční synchronizace se Stravou a seznam
	// importovaných běhů k doplnění (SPEC 5.3, 6.1, 6.3).
	import { t } from "../../i18n";
	import { formatClockDuration, formatPace, paceSecondsPerKm } from "../../calc/performance";
	import { pendingImports } from "../../calc/running";
	import { usePlugin } from "../context";
	import { formatDayMonth, formatNumber, formatShortDate } from "../format";
	import { toIsoDate } from "../../model/dates";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;
	const stravaBusy = plugin.stravaBusy;

	/** Kolik běhů k doplnění ukázat najednou. */
	const VISIBLE = 5;
	let showAll = $state(false);

	const connected = $derived.by(() => {
		void $settingsVersion;
		return plugin.strava.isConnected;
	});
	const lastSync = $derived.by(() => {
		void $settingsVersion;
		const at = plugin.settings.strava.lastSyncAt;
		return at > 0 ? new Date(at * 1000) : null;
	});
	const pending = $derived.by(() => {
		void $indexVersion;
		return pendingImports(plugin.index.all("workout"));
	});
	const visible = $derived(showAll ? pending : pending.slice(0, VISIBLE));
	// Karta je vidět, když uživatel běhá (sport je zapnutý), má Stravu nebo něco k doplnění.
	const runner = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.sports.run;
	});

	function runText(km: number | undefined, seconds: number | undefined): string {
		const parts: string[] = [];
		if (km !== undefined) parts.push(`${formatNumber(km, 2)} km`);
		if (seconds !== undefined) parts.push(formatClockDuration(seconds));
		const pace = paceSecondsPerKm(km, seconds);
		if (pace !== null) parts.push(formatPace(pace));
		return parts.join(" · ");
	}

	function lastSyncText(date: Date): string {
		const day = formatDayMonth(toIsoDate(date));
		return `${day} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
	}
</script>

{#if runner || connected || pending.length > 0}
	<section class="bf-card">
		<header class="bf-strava-head">
			<h4>{t("Run import")}</h4>
			<span class="bf-strava-buttons">
				<button type="button" title={t("A GPX file from Strava, TCX from MapMyRun or FIT from a watch; you can pick several files at once")} onclick={() => plugin.pickRunFiles()}>{t("From file")}</button>
				{#if connected}
					<button type="button" disabled={$stravaBusy} onclick={() => void plugin.syncStrava()}>
						{$stravaBusy ? t("Syncing…") : t("Sync Strava")}
					</button>
				{/if}
			</span>
		</header>
		{#if connected}
			<p class="bf-muted bf-small">
				{lastSync ? t("Strava: last sync {v}.", { v: lastSyncText(lastSync) }) : t("Strava: not synced yet – the first download takes the last few months.")}
			</p>
		{/if}
		{#if pending.length > 0}
			<p class="bf-small">{t("Runs to complete ({pending_length}) – missing RPE, run type and shoes:", { pending_length: pending.length })}</p>
			<ul class="bf-strava-list">
				{#each visible as entry (entry.file.path)}
					<li>
						<button type="button" class="bf-link-button" onclick={() => plugin.openWorkout({ file: entry.file })}>
							{formatShortDate(entry.note.date)}{entry.note.title ? ` – ${entry.note.title}` : ""}
						</button>
						<span class="bf-muted"> · {runText(entry.note.run?.distance_km, entry.note.run?.moving_time_s)}</span>
					</li>
				{/each}
			</ul>
			{#if pending.length > VISIBLE}
				<button type="button" class="bf-link-button bf-small" onclick={() => (showAll = !showAll)}>
					{showAll ? t("Show less") : t("Show all {pending_length}", { pending_length: pending.length })}
				</button>
			{/if}
		{:else if connected}
			<p class="bf-muted bf-small">{t("All imported runs are complete.")}</p>
		{:else}
			<p class="bf-muted bf-small">{t("Import a run from a GPX (Strava), TCX (MapMyRun) or FIT (watch) file – the guide is in the settings. Otherwise log it manually.")}</p>
		{/if}
	</section>
{/if}

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-small {
		font-size: var(--font-ui-small);
	}

	.bf-strava-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-strava-head {
		flex-wrap: wrap;
	}

	.bf-strava-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-2);
	}

	.bf-strava-list {
		margin: 0;
		padding-left: var(--size-4-5);
	}
</style>
