<script lang="ts">
	// Trénink → Cviky: knihovna cviků přímo v panelu.
	import { libraryProps } from "../../plugin/library";
	import { usePlugin } from "../context";
	import LibraryBrowser from "../library/LibraryBrowser.svelte";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const props = $derived.by(() => {
		void $indexVersion;
		return libraryProps(plugin, {}, (file) => void plugin.app.workspace.getLeaf(false).openFile(file));
	});
</script>

<LibraryBrowser {...props} />
