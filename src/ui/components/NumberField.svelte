<script lang="ts">
	// Číselné pole s desetinnou čárkou. Prázdné = undefined, nečíselný text = NaN
	// (validace ho pak ohlásí a nedovolí uložit).
	import { t } from "../../i18n";
	import { asNumber } from "../../model/parse";
	import { formatNumber } from "../format";

	interface Props {
		value: number | undefined;
		label: string;
		unit?: string;
		hint?: number;
		placeholder?: string;
		error?: string;
		decimals?: boolean;
	}
	let { value = $bindable(), label, unit, hint, placeholder, error, decimals = false }: Props = $props();

	const id = `bf-num-${Math.random().toString(36).slice(2, 8)}`;
	// Text pole se inicializuje jednou; formulář se při změně data vytvoří znovu.
	let text = $state(value === undefined || Number.isNaN(value) ? "" : formatNumber(value, 2));

	function onInput(event: Event & { currentTarget: HTMLInputElement }) {
		text = event.currentTarget.value;
		value = text.trim() === "" ? undefined : (asNumber(text) ?? Number.NaN);
	}
</script>

<div class="bf-field">
	<label class="bf-field-label" for={id}>
		<span>{label}{unit ? ` (${unit})` : ""}</span>
		{#if hint !== undefined}<span class="bf-hint">{t("minule {v}", { v: formatNumber(hint, 2) })}</span>{/if}
	</label>
	<input
		{id}
		type="text"
		inputmode={decimals ? "decimal" : "numeric"}
		autocomplete="off"
		class:bf-invalid={!!error}
		value={text}
		placeholder={placeholder ?? (hint !== undefined ? formatNumber(hint, 2) : "")}
		oninput={onInput}
	/>
	{#if error}<div class="bf-error">{error}</div>{/if}
</div>
