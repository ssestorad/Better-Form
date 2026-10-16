// Import historie tréninků z exportu aplikací Strong a Hevy (SPEC 6.4). Soubor se
// čte jen lokálně; tréninky, které v deníku už jsou (stejný den a začátek), se přeskočí.

import type { TFile } from "obsidian";
import { exerciseNameCandidates, historyToNotes, isImportedAlready, parseHistoryCsv, type ParsedHistory, type WeightUnit } from "../calc/historyImport";
import type { WorkoutNote } from "../model/types";
import type { FormaIndex } from "./FormaIndex";
import type { WorkoutService } from "./WorkoutService";

export interface HistoryPreview {
	parsed: ParsedHistory;
	/** Tréninky k založení (bez těch, které v deníku už jsou). */
	fresh: WorkoutNote[];
	duplicates: number;
	/** Cviky, které knihovna nezná – zůstanou pod původním názvem. */
	unknownExercises: string[];
}

export class HistoryImportService {
	constructor(
		private readonly index: FormaIndex,
		private readonly workouts: WorkoutService,
	) {}

	/** Přečte soubor a řekne, co by se importovalo; nic nezapisuje. */
	preview(text: string, unit: WeightUnit): HistoryPreview {
		const parsed = parseHistoryCsv(text, unit);
		const { notes, unknownExercises } = historyToNotes(parsed.workouts, (name) => {
			for (const candidate of exerciseNameCandidates(name)) {
				const found = this.index.findExercise(candidate)?.note;
				if (found) return { name: found.name, category: found.category, measure: found.measure };
			}
			return undefined;
		});
		const existing = this.index.all("workout").map((e) => e.note);
		const fresh = notes.filter((note) => !isImportedAlready(note, existing));
		return { parsed, fresh, duplicates: notes.length - fresh.length, unknownExercises };
	}

	/** Založí tréninky z náhledu, od nejstaršího. `onProgress` dostane počet hotových. */
	async save(fresh: readonly WorkoutNote[], onProgress?: (done: number) => void): Promise<TFile[]> {
		const files: TFile[] = [];
		for (const note of fresh) {
			files.push(await this.workouts.saveNote(note));
			onProgress?.(files.length);
		}
		return files;
	}
}
