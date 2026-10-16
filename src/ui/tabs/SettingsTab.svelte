<script lang="ts">
	import { t } from "../../i18n";
	import { usePlugin } from "../context";

	const plugin = usePlugin();
</script>

<section class="bf-card">
	<h4>{t("Průvodce nastavením")}</h4>
	<p class="bf-muted">{t("Profil pro výpočty, cíl, běžný den, režim a sporty na jednom místě.")}</p>
	<div class="bf-actions">
		<button type="button" class="mod-cta" onclick={() => plugin.openOnboarding()}>{t("Spustit průvodce")}</button>
	</div>
</section>

<section class="bf-card">
	<h4>{t("Všechna nastavení")}</h4>
	<p class="bf-muted">{t("Složky, vybavení, Strava, výživa, export a záloha, prahy výpočtů.")}</p>
	<div class="bf-actions">
		<button type="button" onclick={() => plugin.openSettings()}>{t("Otevřít nastavení")}</button>
	</div>
</section>

<style>
	h4,
	p {
		margin: 0;
	}
</style>
