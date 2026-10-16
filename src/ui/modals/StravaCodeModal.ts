import { Modal, Setting, type App } from "obsidian";
import { t } from "../../i18n";

/** Ruční připojení Stravy: uživatel vloží adresu z prohlížeče (nebo samotný kód). */
export class StravaCodeModal extends Modal {
	constructor(
		app: App,
		private readonly onSubmit: (text: string) => Promise<void>,
	) {
		super(app);
	}

	override onOpen(): void {
		this.titleEl.setText(t("Connect Strava manually"));
		const steps = this.contentEl.createEl("ol");
		steps.createEl("li", { text: t("In the browser that just opened, allow access (keep reading activities checked).") });
		steps.createEl("li", {
			text: t("The browser will then show a “page not found” error – that's fine. Copy the whole address from the address bar."),
		});
		steps.createEl("li", { text: t("Paste it here and confirm.") });

		const input = this.contentEl.createEl("textarea", {
			cls: "bf-import-text",
			attr: { rows: "3", placeholder: "http://localhost/better-form?state=…&code=…&scope=…", "aria-label": t("Address from the browser or code") },
		});
		const submit = () => {
			const text = input.value;
			this.close();
			void this.onSubmit(text);
		};
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText(t("Cancel")).onClick(() => this.close()))
			.addButton((b) => b.setButtonText(t("Connect")).setCta().onClick(submit));
		input.focus();
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
