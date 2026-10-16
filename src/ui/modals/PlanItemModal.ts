import { Modal, Notice } from "obsidian";
import { mount, unmount } from "svelte";
import { planItemTitle } from "../../data/planBlock";
import type BetterFormPlugin from "../../main";
import type { Sport } from "../../model/constants";
import type { PlanItem } from "../../model/types";
import { formatShortDate } from "../format";
import PlanItemForm from "../plan/PlanItemForm.svelte";
import { confirmAction } from "./ConfirmModal";
import { t } from "../../i18n";

export interface PlanItemModalOptions {
	/** Den nové položky. */
	date: string;
	/** Upravovaná položka; chybí = nová. */
	item?: PlanItem;
}

/** Přidání nebo úprava položky plánu týdne (SPEC 5.16). */
export class PlanItemModal extends Modal {
	private component: ReturnType<typeof mount> | null = null;

	constructor(
		private readonly plugin: BetterFormPlugin,
		private readonly options: PlanItemModalOptions,
	) {
		super(plugin.app);
	}

	override onOpen(): void {
		const { plugin } = this;
		const { item, date } = this.options;
		this.modalEl.addClass("bf-modal");
		this.titleEl.setText(item ? t("Upravit plán") : t("Naplánovat trénink"));
		const sports = (Object.keys(plugin.settings.sports) as Sport[]).filter((s) => plugin.settings.sports[s]);
		this.component = mount(PlanItemForm, {
			target: this.contentEl,
			props: {
				date,
				item,
				sports,
				templates: plugin.index
					.all("template")
					.map((t) => ({ name: t.note.name, sport: t.note.sport }))
					.sort((a, b) => a.name.localeCompare(b.name, "cs")),
				onSave: async (draft) => {
					if (item) await plugin.plans.update(item, draft);
					else await plugin.plans.add(draft);
					new Notice(t("Plán uložen: {v}.", { v: formatShortDate(draft.date) }));
					this.close();
				},
				onDelete: item
					? async () => {
							if (!(await confirmAction(this.app, t("Smazat z plánu?"), t("{v} ({v2}) zmizí z plánu týdne. Zapsané tréninky zůstanou.", { v: planItemTitle(item), v2: formatShortDate(item.date) }), t("Smazat")))) return;
							await plugin.plans.remove(item);
							this.close();
						}
					: undefined,
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
