import { recommendedRmrFormula } from "../../calc/nutrition";
import { toIsoDate } from "../../model/dates";
import { Modal, Notice } from "obsidian";
import { mount, unmount } from "svelte";
import type BetterFormPlugin from "../../main";
import { applyOnboarding, onboardingFromSettings, type OnboardingValues } from "../../settings/onboarding";
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
		this.titleEl.setText(this.first ? t("Welcome to Better Form") : t("Setup guide"));
		this.component = mount(Onboarding, {
			target: this.contentEl,
			props: {
				initial: onboardingFromSettings(this.plugin.settings),
				first: this.first,
				onSave: async (values: OnboardingValues) => {
					applyOnboarding(this.plugin.settings, values);
					// Při prvním nastavení se rovnice klidového výdeje vybere podle profilu; později ji mění jen uživatel.
					if (this.first) this.plugin.settings.nutrition.rmrFormula = recommendedRmrFormula(this.plugin.nutritionProfile(toIsoDate(new Date())));
					await this.plugin.saveSettings();
					new Notice(t("Settings saved."));
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
