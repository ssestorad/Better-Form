import { Modal, Notice } from "obsidian";
import { mount, unmount } from "svelte";
import type BetterFormPlugin from "../../main";
import type { TestType } from "../../model/constants";
import type { TestNote } from "../../model/types";
import { formatNumber, formatShortDate } from "../format";
import TestForm from "../program/TestForm.svelte";
import { t } from "../../i18n";

export interface TestModalOptions {
	date: string;
	exercise?: string;
}

export class TestModal extends Modal {
	private component: ReturnType<typeof mount> | null = null;

	constructor(
		private readonly plugin: BetterFormPlugin,
		private readonly options: TestModalOptions,
	) {
		super(plugin.app);
	}

	override onOpen(): void {
		this.modalEl.addClass("bf-modal");
		this.titleEl.setText(t("Max test"));
		this.component = mount(TestForm, {
			target: this.contentEl,
			props: {
				date: this.options.date,
				exercise: this.options.exercise,
				options: this.plugin.index.all("exercise").map((e) => ({
					name: e.note.name,
					aliases: e.note.aliases,
					category: e.note.category,
				})),
				lastText: (exercise: string, type: TestType) => this.lastText(exercise, type),
				onSave: async (test: Omit<TestNote, "forma" | "schema">) => {
					await this.plugin.programs.saveTest(test);
					new Notice(t("Test saved: {exercise} – {v}.", { exercise: test.exercise, v: formatNumber(test.result, 1) }));
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

	private lastText(exercise: string, type: TestType): string | undefined {
		const last = this.plugin.index
			.all("test")
			.map((t) => t.note)
			.filter((t) => t.test_type === type && this.plugin.workouts.isSameExercise(t.exercise, exercise))
			.sort((a, b) => b.date.localeCompare(a.date))[0];
		return last ? t("last time {v} ({v2})", { v: formatNumber(last.result, 1), v2: formatShortDate(last.date) }) : undefined;
	}
}
