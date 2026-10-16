<script lang="ts">
	import { t } from "../../i18n";
	import { usePlugin } from "../context";

	const plugin = usePlugin();
</script>

<section class="bf-card">
	<h4>{t("Setup guide")}</h4>
	<p class="bf-muted">{t("Profile for calculations, goal, typical day, mode and sports in one place.")}</p>
	<div class="bf-actions">
		<button type="button" class="mod-cta" onclick={() => plugin.openOnboarding()}>{t("Start guide")}</button>
	</div>
</section>

<section class="bf-card">
	<h4>{t("All settings")}</h4>
	<p class="bf-muted">{t("Folders, equipment, Strava, nutrition, export and backup, calculation thresholds.")}</p>
	<div class="bf-actions">
		<button type="button" onclick={() => plugin.openSettings()}>{t("Open settings")}</button>
	</div>
</section>

<style>
	h4,
	p {
		margin: 0;
	}
</style>
