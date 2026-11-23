<script lang="ts">
	// Odškrtnutí suplementu na dnešek se všemi varovnými štítky (kofein před spaním, vysoká dávka, jen tréninkové dny).
	import { Notice } from "obsidian";
	import { CAFFEINE_EXCESS_MG_PER_KG, caffeineIsExcessive, doseToMg, isTaken } from "../../calc/supplements";
	import type { SupplementEntry } from "../../data/SupplementService";
	import { t } from "../../i18n";
	import { minutesOfDay } from "../../model/dates";
	import { caffeineTooLate } from "../../seed/supplementModel";
	import { usePlugin } from "../context";

	interface Props {
		entry: SupplementEntry;
		today: string;
		/** Dávka a načasování za názvem. */
		detail?: string;
	}
	let { entry, today, detail = "" }: Props = $props();

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const taken = $derived.by(() => {
		void $indexVersion;
		return isTaken(plugin.supplements.taken(today), entry.note.name);
	});
	const trainedToday = $derived.by(() => {
		void $indexVersion;
		return plugin.supplements.hasWorkout(today);
	});
	const caffeine = $derived(entry.note.catalog === "caffeine");
	// Kofein méně než 6 h před obvyklým ulehnutím (Drake 2013).
	const bedtime = $derived.by(() => {
		void $indexVersion;
		if (!caffeine) return null;
		const time = plugin.index
			.all("day")
			.filter((d) => d.note.sleep.bedtime !== undefined)
			.sort((a, b) => b.note.date.localeCompare(a.note.date))[0]?.note.sleep.bedtime;
		return time ? minutesOfDay(time) : null;
	});
	let nowMin = $state(new Date().getHours() * 60 + new Date().getMinutes());
	$effect(() => {
		if (!caffeine) return;
		const timer = window.setInterval(() => (nowMin = new Date().getHours() * 60 + new Date().getMinutes()), 60_000);
		return () => window.clearInterval(timer);
	});
	const late = $derived(bedtime !== null && caffeineTooLate(nowMin, bedtime));
	const over = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		if (!caffeine || entry.note.dose === undefined) return false;
		const mg = doseToMg(entry.note.dose, entry.note.unit);
		const kg = plugin.supplements.weightKg();
		return mg !== null && kg !== null && caffeineIsExcessive(mg, kg);
	});

	async function toggle(checked: boolean) {
		try {
			await plugin.supplements.setTaken(today, entry.note.name, checked);
		} catch (err) {
			new Notice(t("Failed: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}
</script>

<label class="bf-supp-row">
	<input type="checkbox" checked={taken} onchange={(e) => void toggle(e.currentTarget.checked)} />
	<span class="bf-supp-check-name">{entry.note.name}</span>
	{#if detail}<span class="bf-muted bf-small">{detail}</span>{/if}
	{#if late && !taken}
		<span class="bf-tag bf-tag-warn" title={t("Caffeine even 6 h before bed shortens sleep (Drake 2013, research)")}>{t("less than 6 h before bed")}</span>
	{/if}
	{#if over}
		<span class="bf-tag bf-tag-warn" title={t("From {CAFFEINE_EXCESS_MG_PER_KG} mg/kg side effects increase with no further benefit (IOC 2018, consensus)", { CAFFEINE_EXCESS_MG_PER_KG })}>{t("dose above {CAFFEINE_EXCESS_MG_PER_KG} mg/kg", { CAFFEINE_EXCESS_MG_PER_KG })}</span>
	{/if}
	{#if entry.note.training_days_only && !trainedToday}
		<span class="bf-tag" title={t("Taken only on training days; no workout logged today yet")}>{t("no workout today")}</span>
	{/if}
</label>

<style>
	.bf-supp-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-4-2);
		/* Pevná výška řádku – odškrtnutí nic neposune. */
		min-height: var(--input-height);
		cursor: pointer;
	}

	.bf-supp-check-name {
		font-weight: var(--font-semibold);
	}
</style>
