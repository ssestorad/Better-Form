<script lang="ts">
	interface Props {
		value: string | undefined;
		label: string;
		/** Doplňující text vpravo od popisku, např. ke kterému dni čas patří. */
		note?: string;
		error?: string;
	}
	let { value = $bindable(), label, note, error }: Props = $props();

	const id = `bf-time-${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="bf-field">
	<label class="bf-field-label" for={id}>
		<span>{label}</span>
		{#if note}<span class="bf-hint">{note}</span>{/if}
	</label>
	<input
		{id}
		type="time"
		class:bf-invalid={!!error}
		value={value ?? ""}
		oninput={(e) => (value = e.currentTarget.value || undefined)}
	/>
	{#if error}<div class="bf-error">{error}</div>{/if}
</div>
