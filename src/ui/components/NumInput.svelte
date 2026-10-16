<script lang="ts">
	// Kompaktní číselné pole bez popisku (tabulky sérií). Prázdné = undefined,
	// nečíselný text = NaN (validace ho ohlásí). Hodnotu změněnou zvenku převezme.
	import { untrack } from "svelte";
	import { asNumber } from "../../model/parse";
	import { formatNumber } from "../format";

	interface Props {
		value: number | undefined;
		label: string;
		placeholder?: string;
		error?: string;
		decimals?: boolean;
		signed?: boolean;
		onkeydown?: (event: KeyboardEvent) => void;
	}
	let { value = $bindable(), label, placeholder = "", error, decimals = false, signed = false, onkeydown }: Props =
		$props();

	const format = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? "" : formatNumber(v, 2));
	const parse = (t: string) => (t.trim() === "" ? undefined : (asNumber(t.replace("−", "-")) ?? Number.NaN));
	const same = (a: number | undefined, b: number | undefined) =>
		a === b || (a !== undefined && b !== undefined && Number.isNaN(a) && Number.isNaN(b));

	let text = $state(untrack(() => format(value)));

	// Hodnota změněná zvenku (např. „vrátit na minule“) → přepsat text.
	$effect(() => {
		const current = value;
		untrack(() => {
			if (!same(parse(text), current)) text = format(current);
		});
	});
</script>

<input
	type="text"
	class="bf-num"
	class:bf-invalid={!!error}
	inputmode={decimals || signed ? "decimal" : "numeric"}
	autocomplete="off"
	aria-label={label}
	title={error ?? label}
	{placeholder}
	value={text}
	oninput={(e) => {
		text = e.currentTarget.value;
		value = parse(text);
	}}
	{onkeydown}
/>

<style>
	.bf-num {
		width: 100%;
		min-width: 0;
		text-align: right;
	}
</style>
