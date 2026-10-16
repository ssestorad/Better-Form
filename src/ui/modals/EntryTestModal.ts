import { Modal, Notice } from "obsidian";
import { mount, unmount } from "svelte";
import { programWeek } from "../../calc/programs";
import type BetterFormPlugin from "../../main";
import { toIsoDate } from "../../model/dates";
import EntryTest from "../basic/EntryTest.svelte";
import type { EntryTestItem, EntryTestResult } from "../basic/types";
import { formatNumber, formatShortDate } from "../format";
import { t } from "../../i18n";
import { builtinId } from "../../seed/localize";

/** Program, který se po vstupním testu nabídne k aktivaci. */
/** Id programu Basic 4 (src/seed/programData.ts). */
const BASIC_PROGRAM = "basic-4";
const SITUPS = "Sedy-lehy";

/** Vstupní test / retest maxim cviků režimu Základ. */
export class EntryTestModal extends Modal {
	private component: ReturnType<typeof mount> | null = null;

	constructor(private readonly plugin: BetterFormPlugin) {
		super(plugin.app);
	}

	override onOpen(): void {
		this.modalEl.addClass("bf-modal");
		this.titleEl.setText(t("Max tests"));
		const today = toIsoDate(new Date());
		const program = this.plugin.programs.programs().find((p) => builtinId("program", p.note.name) === BASIC_PROGRAM);
		const offer = program && programWeek(program.note, today) === null ? program : undefined;
		this.component = mount(EntryTest, {
			target: this.contentEl,
			props: {
				date: today,
				items: this.items(),
				offerProgram: offer?.note.name,
				onSave: async (date: string, results: EntryTestResult[], activate: boolean) => {
					for (const result of results) {
						await this.plugin.programs.saveTest({
							date,
							exercise: result.exercise,
							test_type: result.unit === "sec" ? "max_hold" : "max_reps",
							result: result.value,
						});
					}
					if (activate && offer) await this.plugin.programs.activate(offer, date);
					new Notice(
						t("Tests saved: {results_length}.{v}", { results_length: results.length, v: activate && offer ? t(" The program “{note_name}” is active.", { note_name: offer.note.name }) : "" }),
					);
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

	/** Silové cviky režimu Základ (bez kardia), se zohledněním alternativy k sedům-lehům. */
	private items(): EntryTestItem[] {
		const { settings, workouts, index } = this.plugin;
		const tests = index.all("test").map((t) => t.note);
		const items: EntryTestItem[] = [];
		for (const name of settings.basicExercises) {
			const exercise = workouts.isSameExercise(name, SITUPS) && settings.situpAlternative ? settings.situpAlternative : name;
			const info = workouts.exerciseInfo(exercise);
			if (info?.category === "cardio") continue;
			const unit = info?.measure === "seconds" ? "sec" : "reps";
			const type = unit === "sec" ? "max_hold" : "max_reps";
			const last = tests
				.filter((t) => t.test_type === type && workouts.isSameExercise(t.exercise, exercise))
				.sort((a, b) => b.date.localeCompare(a.date))[0];
			const item: EntryTestItem = { exercise, unit };
			if (last) item.last = t("last time {v} ({v2})", { v: formatNumber(last.result, 0), v2: formatShortDate(last.date) });
			items.push(item);
		}
		return items;
	}
}
