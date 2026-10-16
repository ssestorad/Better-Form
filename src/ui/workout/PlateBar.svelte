<script lang="ts">
	// Obrázek osy s naloženými kotouči (obě strany stejně). Je to jen ilustrace
	// k textu „na stranu 25 + 5“ vedle, proto ji čtečky přeskočí (aria-hidden).
	import { plateColor } from "../../calc/plates";

	let { perSide }: { perSide: number[] } = $props();

	/** Délka nakládací části osy v jednotkách viewBoxu. */
	const SLEEVE = 100;
	// Závodní kotouče od 10 kg mají stejný průměr, menší jsou nižší.
	const height = (kg: number) => (kg >= 10 ? 60 : kg >= 5 ? 36 : kg >= 2.5 ? 28 : 22);
	const plates = $derived.by(() => {
		const widths = perSide.map((kg) => Math.min(15, 4 + kg * 0.42));
		const total = widths.reduce((sum, w) => sum + w + 1, 0);
		// Když je kotoučů víc, než se na osu vejde, zúží se všechny stejně.
		const scale = Math.min(1, SLEEVE / total);
		let x = 0;
		return perSide.map((kg, i) => {
			const plate = { kg, x, w: widths[i]! * scale, h: height(kg) };
			x += plate.w + scale;
			return plate;
		});
	});
</script>

<svg class="bf-platebar" viewBox="0 0 300 64" aria-hidden="true">
	<rect class="bf-platebar-steel" x="110" y="30.5" width="80" height="3" />
	{#each [-1, 1] as side (side)}
		<g transform="translate({150 + side * 40} 0) scale({side} 1)">
			<rect class="bf-platebar-steel" x="0" y="26" width="4" height="12" />
			<rect class="bf-platebar-steel" x="4" y="29" width="104" height="6" />
			{#each plates as plate, i (i)}
				<rect class="bf-platebar-plate" x={5 + plate.x} y={32 - plate.h / 2} width={plate.w} height={plate.h} rx="1.5" fill={plateColor(plate.kg)} />
			{/each}
		</g>
	{/each}
</svg>

<style>
	.bf-platebar {
		display: block;
		width: 100%;
		max-width: 320px;
		height: auto;
	}

	.bf-platebar-steel {
		fill: var(--text-faint);
	}

	/* Obrys, aby byl bílý kotouč vidět na světlém a šedý na tmavém pozadí. */
	.bf-platebar-plate {
		stroke: var(--text-muted);
		stroke-width: 0.5;
	}
</style>
