import { Modal } from "obsidian";
import { mount, unmount } from "svelte";
import { exerciseHistory } from "../../calc/exerciseHistory";
import { formatSets, performanceSets } from "../../calc/performance";
import type BetterFormPlugin from "../../main";
import { BLOCK_LABELS, type MuscleId } from "../../model/constants";
import { toIsoDate } from "../../model/dates";
import type { ExerciseNote } from "../../model/types";
import { withBuiltinTexts } from "../../seed/lookup";
import { formatShortDate } from "../format";
import LibraryBrowser from "../library/LibraryBrowser.svelte";
import { t } from "../../i18n";

export interface LibraryModalOptions {
	/** Cvik, jehož detail se má rovnou otevřít (název nebo alias). */
	exercise?: string;
	/** Předvybraná partie ve filtru. */
	muscle?: MuscleId;
}

export class LibraryModal extends Modal {
	private component: ReturnType<typeof mount> | null = null;

	constructor(
		private readonly plugin: BetterFormPlugin,
		private readonly options: LibraryModalOptions = {},
	) {
		super(plugin.app);
	}

	override onOpen(): void {
		this.modalEl.addClass("bf-modal", "bf-modal-wide");
		this.titleEl.setText(t("Exercise library"));
		const entries = this.plugin.index.all("exercise");
		const initial = this.options.exercise ? this.plugin.index.findExercise(this.options.exercise)?.note.name : undefined;
		this.component = mount(LibraryBrowser, {
			target: this.contentEl,
			props: {
				exercises: entries.map((e) => withBuiltinTexts(e.note)).sort((a, b) => a.name.localeCompare(b.name, "cs")),
				initialExercise: initial,
				initialMuscle: this.options.muscle,
				lastText: (exercise: string) => this.lastText(exercise),
				history: (exercise: ExerciseNote) =>
					exerciseHistory(
						this.plugin.index.all("workout").map((w) => w.note),
						exercise.name,
						exercise.measure,
						this.plugin.statsContext(),
					),
				onOpenNote: (exercise: string) => {
					const file = this.plugin.index.findExercise(exercise)?.file;
					if (!file) return;
					this.close();
					void this.app.workspace.getLeaf(false).openFile(file);
				},
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

	private lastText(exercise: string): string | undefined {
		const workouts = this.plugin.workouts;
		const perf = workouts.prefillContext(toIsoDate(new Date())).last(exercise);
		if (!perf) return undefined;
		const sets = performanceSets(perf);
		const text =
			sets.length > 0
				? formatSets(sets, workouts.measureOf(exercise) ?? "reps_kg")
				: perf.blocks.map((b) => BLOCK_LABELS[b.type]).join(", ");
		return `${formatShortDate(perf.date)}: ${text}`;
	}
}
