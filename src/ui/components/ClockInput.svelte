<script lang="ts">
	// Čas „h:mm:ss“, „mm:ss“ nebo minuty → sekundy. Neplatný text = NaN.
	import { untrack } from "svelte";
	import { formatClockDuration, parseClockDuration } from "../../calc/performance";

	interface Props {
		value: number | undefined;
		label: string;
		placeholder?: string;
		error?: string;
	}
	let { value = $bindable(), label, placeholder = "mm:ss", error }: Props = $props();

	const format = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? "" : formatClockDuration(v));
	const parse = (text: string) => (text.trim() === "" ? undefined : (parseClockDuration(text) ?? Number.NaN));

	let text = $state(untrack(() => format(value)));

	$effect(() => {
		const current = value;
		untrack(() => {
			const parsed = parse(text);
			const same = parsed === current || (Number.isNaN(parsed ?? 0) && Number.isNaN(current ?? 0));
			if (!same) text = format(current);
		});
	});
</script>

<input
	type="text"
	class:bf-invalid={!!error}
	inputmode="numeric"
	autocomplete="off"
	aria-label={label}
	title={error ?? label}
	{placeholder}
	value={text}
	oninput={(e) => {
		text = e.currentTarget.value;
		value = parse(text);
	}}
/>
