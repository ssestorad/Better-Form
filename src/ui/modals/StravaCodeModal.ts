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
		this.titleEl.setText(t("Připojit Stravu ručně"));
		const steps = this.contentEl.createEl("ol");
		steps.createEl("li", { text: t("V prohlížeči, který se právě otevřel, povol přístup (nech zaškrtnuté čtení aktivit).") });
		steps.createEl("li", {
			text: t("Prohlížeč pak ukáže chybu „stránka nenalezena“ – to je v pořádku. Zkopíruj celou adresu z adresního řádku."),
		});
		steps.createEl("li", { text: t("Vlož ji sem a potvrď.") });

		const input = this.contentEl.createEl("textarea", {
			cls: "bf-import-text",
			attr: { rows: "3", placeholder: "http://localhost/better-form?state=…&code=…&scope=…", "aria-label": t("Adresa z prohlížeče nebo kód") },
		});
		const submit = () => {
			const text = input.value;
			this.close();
			void this.onSubmit(text);
		};
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText(t("Zrušit")).onClick(() => this.close()))
			.addButton((b) => b.setButtonText(t("Připojit")).setCta().onClick(submit));
		input.focus();
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
