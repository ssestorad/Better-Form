import { Modal, Notice, Setting } from "obsidian";
import { mount, unmount } from "svelte";
import { describeImport } from "../../calc/programFile";
import type { ProgramEntry } from "../../data/ProgramService";
import type BetterFormPlugin from "../../main";
import { SCHEMA_VERSION } from "../../model/constants";
import type { ProgramNote } from "../../model/types";
import ProgramEditor from "../program/ProgramEditor.svelte";
import { t } from "../../i18n";

/** Nový vlastní program, nebo úprava existujícího vlastního. */
export class ProgramEditorModal extends Modal {
	private component: ReturnType<typeof mount> | null = null;

	constructor(
		private readonly plugin: BetterFormPlugin,
		private readonly entry?: ProgramEntry,
	) {
		super(plugin.app);
	}

	override onOpen(): void {
		this.modalEl.addClass("bf-modal", "bf-modal-wide");
		this.titleEl.setText(this.entry ? t("Upravit program") : t("Nový program"));
		const initial: ProgramNote = this.entry?.note ?? {
			forma: "program",
			schema: SCHEMA_VERSION,
			name: "",
			builtin: false,
			evidence: "practice",
			sources: ["practice"],
			days: ["mon", "wed", "fri"],
			items: [],
			progression: { rule: "none" },
			active: false,
		};
		this.component = mount(ProgramEditor, {
			target: this.contentEl,
			props: {
				initial,
				options: this.plugin.index.all("exercise").map((e) => ({
					name: e.note.name,
					aliases: e.note.aliases,
					category: e.note.category,
				})),
				onSave: async (program: ProgramNote) => {
					if (this.entry) await this.plugin.programs.update(this.entry, program);
					else await this.plugin.programs.create(program);
					new Notice(t("Program „{program_name}“ uložen.", { program_name: program.name }));
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

/** Import programu z textu poznámky (sdílení s kamarádem). */
export class ProgramImportModal extends Modal {
	constructor(private readonly plugin: BetterFormPlugin) {
		super(plugin.app);
	}

	override onOpen(): void {
		this.modalEl.addClass("bf-modal");
		this.titleEl.setText(t("Importovat program"));
		this.contentEl.createEl("p", {
			cls: "bf-muted",
			text: t("Vlož text programu: poznámku programu (včetně úvodního bloku mezi řádky ---), JSON, nebo obyčejný seznam s odrážkami „Cvik: 3×10“. Program se uloží jako vlastní a neaktivní."),
		});
		const area = this.contentEl.createEl("textarea", { cls: "bf-import-text" });
		area.rows = 12;
		area.placeholder = "---\nforma: program\nname: …\n---";

		new Setting(this.contentEl)
			.addButton((b) =>
				b.setButtonText(t("Vložit ze schránky")).onClick(async () => {
					try {
						area.value = await navigator.clipboard.readText();
					} catch {
						new Notice(t("Schránku nejde přečíst – vlož text ručně (Ctrl+V)."));
					}
				}),
			)
			.addButton((b) => b.setButtonText(t("Zrušit")).onClick(() => this.close()))
			.addButton((b) =>
				b
					.setButtonText(t("Importovat"))
					.setCta()
					.onClick(async () => {
						try {
							const report = await this.plugin.programs.importFile("", area.value);
							new Notice(describeImport(report), 12000);
							this.close();
						} catch (err) {
							new Notice(err instanceof Error ? err.message : String(err), 10000);
						}
					}),
			);
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
