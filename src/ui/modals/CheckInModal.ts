import { Modal, Notice } from "obsidian";
import { mount, unmount } from "svelte";
import { hasCheckIn, initialCheckIn, lastValues } from "../../calc/checkIn";
import { addDays } from "../../model/dates";
import type BetterFormPlugin from "../../main";
import CheckIn from "./CheckIn.svelte";
import { t } from "../../i18n";

export class CheckInModal extends Modal {
	private component: ReturnType<typeof mount> | null = null;

	constructor(
		private readonly plugin: BetterFormPlugin,
		private readonly date: string,
	) {
		super(plugin.app);
	}

	override onOpen(): void {
		this.modalEl.addClass("bf-modal");
		this.titleEl.setText(t("Ranní check-in"));
		this.component = mount(CheckIn, {
			target: this.contentEl,
			props: {
				initialDate: this.date,
				load: (date: string) => this.load(date),
				onSave: async (values, stepsYesterday) => {
					await this.plugin.days.saveCheckIn(values);
					// Kroky patří k předchozímu dni; zapisují se jen při změně.
					const yesterday = addDays(values.date, -1);
					if (stepsYesterday !== this.plugin.index.day(yesterday)?.note.steps) await this.plugin.days.setSteps(yesterday, stepsYesterday);
					new Notice(t("Check-in uložen."));
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

	private load(date: string) {
		const existing = this.plugin.index.day(date)?.note;
		const history = this.plugin.index.all("day").map((e) => e.note);
		return {
			values: initialCheckIn(date, existing, history),
			hints: lastValues(history, date),
			existing: hasCheckIn(existing),
			stepsYesterday: this.plugin.index.day(addDays(date, -1))?.note.steps,
		};
	}
}
