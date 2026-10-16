import { Modal, Setting, type App } from "obsidian";
import { t } from "../../i18n";

/** Jednoduché potvrzení akce. Vrací true, pokud uživatel potvrdil. */
export function confirmAction(app: App, title: string, message: string, confirmText: string): Promise<boolean> {
	return new Promise((resolve) => {
		let confirmed = false;
		const modal = new (class extends Modal {
			override onOpen(): void {
				this.titleEl.setText(title);
				this.contentEl.createEl("p", { text: message });
				new Setting(this.contentEl)
					.addButton((b) => b.setButtonText(t("Cancel")).onClick(() => this.close()))
					.addButton((b) =>
						b
							.setButtonText(confirmText)
							.setWarning()
							.onClick(() => {
								confirmed = true;
								this.close();
							}),
					);
			}
			override onClose(): void {
				this.contentEl.empty();
				resolve(confirmed);
			}
		})(app);
		modal.open();
	});
}
