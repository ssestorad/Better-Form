<script lang="ts">
	// Váha: u kettlebellů výběr z vlastních zvonů (nastavení), jinak číslo.
	import { t } from "../../i18n";
	import { formatNumber } from "../format";
	import NumInput from "./NumInput.svelte";

	interface Props {
		value: number | undefined;
		label: string;
		/** Vlastní zvony; prázdné = obyčejné číselné pole. */
		bells?: number[];
		error?: string;
		signed?: boolean;
		placeholder?: string;
		onkeydown?: (event: KeyboardEvent) => void;
	}
	let { value = $bindable(), label, bells = [], error, signed = false, placeholder, onkeydown }: Props = $props();

	let custom = $state(false);
	const useSelect = $derived(bells.length > 0 && !custom && (value === undefined || bells.includes(value)));
</script>

{#if useSelect}
	<select
		class="dropdown bf-bell"
		aria-label={label}
		value={value === undefined ? "" : String(value)}
		onchange={(e) => {
			const v = e.currentTarget.value;
			if (v === "other") custom = true;
			else value = v === "" ? undefined : Number(v);
		}}
		{onkeydown}
	>
		<option value="">–</option>
		{#each bells as bell (bell)}
			<option value={String(bell)}>{formatNumber(bell, 2)} kg</option>
		{/each}
		<option value="other">{t("other…")}</option>
	</select>
{:else}
	<NumInput bind:value {label} {error} decimals {signed} {placeholder} {onkeydown} />
{/if}

<style>
	.bf-bell {
		width: 100%;
		min-width: 0;
	}
</style>
