import { recommendedRmrFormula } from "../../calc/nutrition";
import { toIsoDate } from "../../model/dates";
import { Modal, Notice } from "obsidian";
import { mount, unmount } from "svelte";
import type BetterFormPlugin from "../../main";
import { applyOnboarding, onboardingFromSettings } from "../../settings/onboarding";
import Onboarding from "./Onboarding.svelte";
import { t } from "../../i18n";

/** Úvodní průvodce nastavením; `first` = otevřený automaticky po prvním spuštění. */
export class OnboardingModal extends Modal {
	private component: ReturnType<typeof mount> | null = null;

	constructor(
		private readonly plugin: BetterFormPlugin,
		private readonly first: boolean,
	) {
		super(plugin.app);
	}

	override onOpen(): void {
		this.modalEl.addClass("bf-modal");
		this.titleEl.setText(this.first ? t("Vítej v Better Form") : t("Průvodce nastavením"));
		this.component = mount(Onboarding, {
			target: this.contentEl,
			props: {
				initial: onboardingFromSettings(this.plugin.settings),
				first: this.first,
				onSave: async (values) => {
					applyOnboarding(this.plugin.settings, values);
					// Při prvním nastavení se rovnice klidového výdeje vybere podle profilu; později ji mění jen uživatel.
					if (this.first) this.plugin.settings.nutrition.rmrFormula = recommendedRmrFormula(this.plugin.nutritionProfile(toIsoDate(new Date())));
					await this.plugin.saveSettings();
					new Notice(t("Nastavení uloženo."));
					this.close();
				},
				onCancel: () => this.close(),
			},
		});
	}

	override onClose(): void {
		if (this.component) {
			void unmount(this.component);
			this.component = null;
		}
		this.contentEl.empty();
	}
}
