<script lang="ts">
	// Štítek úrovně důkazu se zdroji (SPEC 7.1); celé citace jsou v bublině.
	import { getSource, type Basis } from "../../evidence/sources";
	import { EVIDENCE_LABELS } from "../../model/constants";

	interface Props {
		basis: Basis;
		/** Ukázat i krátké názvy zdrojů („Foster 1998 · výzkum“). */
		named?: boolean;
	}
	let { basis, named = false }: Props = $props();

	const sources = $derived(basis.sourceIds.map(getSource));
	const names = $derived(
		sources
			.filter((s) => s.evidence !== "practice" || basis.sourceIds.length === 1)
			.map((s) => s.short)
			.join(", "),
	);
</script>

<span class="bf-tag" title={sources.map((s) => s.citation).join("\n")}>{named && names ? `${names} · ` : ""}{EVIDENCE_LABELS[basis.evidence]}</span>
