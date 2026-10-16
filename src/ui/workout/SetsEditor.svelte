<script lang="ts">
	// Tabulka sérií (bloky „série“ a „výdrž“). Enter v řádku přeskočí na další
	// sérii, v posledním řádku přidá novou (kopie předchozí bez RIR).
	import { t } from "../../i18n";
	import { tick } from "svelte";
	import { WARMUP_BASIS, plateLoad, plateText, warmupSets, type BarbellSettings } from "../../calc/plates";
	import { SET_TAG_LABELS, SET_TAG_SHORT, type ExerciseMeasure } from "../../model/constants";
	import type { SetEntry } from "../../model/types";
	import BasisTag from "../components/BasisTag.svelte";
	import NumInput from "../components/NumInput.svelte";
	import WeightInput from "../components/WeightInput.svelte";
	import { formatNumber } from "../format";
	import { setErrorKey, type DraftBlock, type DraftErrors } from "./draft";
	import PlateBar from "./PlateBar.svelte";

	interface Props {
		block: DraftBlock;
		measure: ExerciseMeasure;
		bells: number[];
		/** Osa a kotouče – s nimi je u cviků s váhou k dispozici kalkulačka kotoučů. */
		barbell?: BarbellSettings;
		errors: DraftErrors;
	}
	let { block, measure, bells, barbell, errors }: Props = $props();

	let table: HTMLDivElement | undefined = $state();

	const timed = $derived(block.type === "hold" || measure === "seconds" || measure === "distance" || measure === "time");
	const bodyweight = $derived(measure === "reps_bw" || measure === "seconds");
	const showRir = $derived(!timed);

	// Kalkulačka kotoučů: jen u cviků s váhou na ose (ne kettlebell, ne vlastní váha).
	const canLoad = $derived(barbell !== undefined && !timed && !bodyweight && bells.length === 0);
	let showPlates = $state(false);
	const kgText = (kg: number) => formatNumber(kg, 2);
	/** Různé pracovní váhy v bloku, od nejtěžší (nejvýš tři řádky). */
	const loads = $derived.by(() => {
		if (!barbell) return [];
		const weights = [...new Set(block.sets.filter((s) => !s.warmup && s.kg !== undefined && !Number.isNaN(s.kg) && s.kg > 0).map((s) => s.kg!))].sort((a, b) => b - a);
		return weights.slice(0, 3).map((kg) => ({ kg, load: plateLoad(kg, barbell) }));
	});
	const firstWorkKg = $derived(block.sets.find((s) => !s.warmup && s.kg !== undefined && !Number.isNaN(s.kg) && s.kg > 0)?.kg);
	const warmups = $derived(barbell && firstWorkKg !== undefined ? warmupSets(firstWorkKg, barbell) : []);
	const hasWarmup = $derived(block.sets.some((s) => s.warmup));

	function addWarmups() {
		if (warmups.length === 0 || hasWarmup) return;
		block.sets.unshift(...warmups.map((w): SetEntry => ({ reps: w.reps, kg: w.kg, warmup: true })));
	}

	/** Druh série se střídá klepnutím: pracovní → rozcvičovací → drop → do selhání → pracovní. */
	function cycleKind(set: SetEntry) {
		if (set.warmup) {
			set.warmup = undefined;
			set.tag = "drop";
		} else if (set.tag === "drop") set.tag = "failure";
		else if (set.tag === "failure") set.tag = undefined;
		else set.warmup = true;
	}
	const kindTitle = (set: SetEntry) =>
		set.warmup
			? t("Rozcvičovací série – klepni pro drop sérii")
			: set.tag === "drop"
				? t("Drop série – klepni pro sérii do selhání")
				: set.tag === "failure"
					? t("Série do selhání (počítá se jako RIR 0) – klepni pro běžnou pracovní")
					: t("Pracovní série – klepni pro rozcvičovací");

	function workingNumber(index: number): number {
		return block.sets.slice(0, index + 1).filter((s) => !s.warmup).length;
	}

	async function addSet(focus = true) {
		const last = block.sets[block.sets.length - 1];
		const copy: SetEntry = last ? { reps: last.reps, kg: last.kg, added_kg: last.added_kg, sec: last.sec } : {};
		block.sets.push(copy);
		if (focus) {
			await tick();
			table?.querySelector<HTMLElement>(`[data-row="${block.sets.length - 1}"] input, [data-row="${block.sets.length - 1}"] select`)?.focus();
		}
	}

	async function onKeydown(event: KeyboardEvent, index: number) {
		if (event.key !== "Enter" || event.ctrlKey || event.metaKey) return;
		event.preventDefault();
		if (index === block.sets.length - 1) await addSet();
		else table?.querySelector<HTMLElement>(`[data-row="${index + 1}"] input, [data-row="${index + 1}"] select`)?.focus();
	}

	function err(index: number, field: keyof SetEntry): string | undefined {
		return errors[setErrorKey(block.id, index, field)];
	}
</script>

<div class="bf-sets" class:has-rir={showRir} bind:this={table}>
	<div class="bf-sets-row bf-sets-head">
		<span></span>
		<span>{timed ? t("Sekundy") : t("Opak.")}</span>
		<span>{bodyweight ? t("Přívažek kg") : "kg"}</span>
		{#if showRir}<span title={t("Kolik opakování ti ještě zbývalo do selhání")}>RIR</span>{/if}
		<span></span>
	</div>
	{#each block.sets as set, i (i)}
		<div class="bf-sets-row" class:is-warmup={set.warmup} data-row={i}>
			<button
				type="button"
				class="bf-set-kind"
				class:is-tagged={!set.warmup && set.tag !== undefined}
				title={kindTitle(set)}
				aria-label={set.warmup ? t("Rozcvičovací série") : set.tag ? t("Série {v}: {v2}", { v: workingNumber(i), v2: SET_TAG_LABELS[set.tag] }) : t("Pracovní série {v}", { v: workingNumber(i) })}
				onclick={() => cycleKind(set)}
			>
				{set.warmup ? t("R") : set.tag ? SET_TAG_SHORT[set.tag] : workingNumber(i)}
			</button>
			{#if timed}
				<NumInput bind:value={set.sec} label={t("Sekundy")} error={err(i, "sec")} onkeydown={(e) => onKeydown(e, i)} />
			{:else}
				<NumInput bind:value={set.reps} label={t("Opakování")} error={err(i, "reps")} onkeydown={(e) => onKeydown(e, i)} />
			{/if}
			{#if bodyweight}
				<NumInput bind:value={set.added_kg} label={t("Přívažek (kg)")} signed placeholder="0" error={err(i, "added_kg")} onkeydown={(e) => onKeydown(e, i)} />
			{:else}
				<WeightInput bind:value={set.kg} label={t("Váha (kg)")} {bells} error={err(i, "kg")} onkeydown={(e) => onKeydown(e, i)} />
			{/if}
			{#if showRir}
				<NumInput bind:value={set.rir} label="RIR" error={err(i, "rir")} onkeydown={(e) => onKeydown(e, i)} />
			{/if}
			<button type="button" class="clickable-icon bf-set-remove" aria-label={t("Smazat sérii")} onclick={() => block.sets.splice(i, 1)}>×</button>
		</div>
	{/each}
	<div class="bf-sets-actions">
		<button type="button" onclick={() => addSet()}>{t("+ série")}</button>
		{#if canLoad}
			<button type="button" aria-expanded={showPlates} title={t("Kolik kotoučů naložit na každou stranu osy a návrh rozcvičovacích sérií")} onclick={() => (showPlates = !showPlates)}>{t("Kotouče")}</button>
		{/if}
		<span class="bf-hint">{t("Klepnutím na číslo série: R = rozcvičovací, D = drop série, S = do selhání · RIR = kolik opakování zbývalo do selhání")}</span>
	</div>
	{#if canLoad && showPlates && barbell}
		<div class="bf-plates">
			{#if loads.length === 0}
				<span class="bf-hint">{t("Zadej váhu pracovní série – ukážu kotouče na každou stranu osy ({v} kg).", { v: kgText(barbell.barKg) })}</span>
			{:else}
				{#each loads as row (row.kg)}
					<div>
						<strong>{kgText(row.kg)} kg</strong>
						{#if row.load === null}
							<span class="bf-hint">{t("– méně než osa ({v} kg)", { v: kgText(barbell.barKg) })}</span>
						{:else}
							{t("– na stranu {v}", { v: plateText(row.load, kgText) })}
							{#if row.load.missingKg > 0}<span class="bf-hint"> {t("· přesně to nejde, vyjde {v} kg (chybí {v2} kg)", { v: kgText(row.load.loadedKg), v2: kgText(row.load.missingKg) })}</span>{/if}
							<PlateBar perSide={row.load.perSide} />
						{/if}
					</div>
				{/each}
				<span class="bf-hint">{t("Osa {v} kg; osu a kotouče změníš v nastavení. Barvy podle závodního značení, kotouče mimo něj šedě.", { v: kgText(barbell.barKg) })}</span>
			{/if}
			{#if warmups.length > 0}
				<div class="bf-plates-warmup">
					<span>{t("Rozcvičení: {v}", { v: warmups.map((w) => `${kgText(w.kg)} kg × ${w.reps}`).join(", ") })}</span>
					<button type="button" disabled={hasWarmup} title={hasWarmup ? t("Rozcvičovací série už v tabulce jsou") : t("Přidá rozcvičovací série na začátek tabulky")} onclick={addWarmups}>{t("Přidat")}</button>
				</div>
				<span class="bf-hint">{t("Prázdná osa a 40, 60, 80 % pracovní váhy – uprav si podle sebe.")} <BasisTag basis={WARMUP_BASIS} /></span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.bf-sets {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.bf-sets-row {
		display: grid;
		grid-template-columns: 2.2em minmax(0, 1fr) minmax(0, 1.2fr) 2em;
		gap: var(--size-4-1);
		align-items: center;
	}

	.has-rir .bf-sets-row {
		grid-template-columns: 2.2em minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 0.8fr) 2em;
	}

	.bf-sets-head {
		font-size: var(--font-ui-smaller);
		color: var(--text-muted);
	}

	.bf-set-kind {
		padding: 0;
		height: 28px;
		font-size: var(--font-ui-small);
	}

	/* Drop série a série do selhání jen barvou písmena – bez změny rozměrů. */
	.bf-set-kind.is-tagged {
		color: var(--text-accent);
		font-weight: var(--font-semibold);
	}

	/* Rozcvičovací série jen barvou – bez změny rozměrů. */
	.is-warmup .bf-set-kind {
		background-color: var(--background-modifier-hover);
		color: var(--text-muted);
	}

	.is-warmup :global(input),
	.is-warmup :global(select) {
		color: var(--text-muted);
	}

	.bf-set-remove {
		justify-content: center;
	}

	.bf-sets-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-4-2);
	}

	.bf-plates {
		display: flex;
		flex-direction: column;
		gap: var(--size-2-3);
		padding: var(--size-4-2);
		border-radius: var(--radius-s);
		background-color: var(--background-secondary);
		font-size: var(--font-ui-small);
	}

	.bf-plates-warmup {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-4-2);
	}
</style>
