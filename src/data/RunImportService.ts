// Import běhu ze souboru GPX, TCX nebo FIT (SPEC 6.3) – cesta bez předplatného Stravy.
// Soubor se čte jen lokálně; z něj vznikne trénink „k doplnění“ (chybí RPE).

import type { TFile } from "obsidian";
import { isFit, parseFit } from "../calc/fitFile";
import { findSameRecording, parseRunFile, runFileToWorkout, type ParsedRunFile } from "../calc/runFile";
import type { WorkoutNote } from "../model/types";
import { findManualMatch, mergeIntoManual } from "../strava/activities";
import type { FormaIndex } from "./FormaIndex";
import type { WorkoutService } from "./WorkoutService";

export interface RunImportResult {
	/** Nový trénink, sloučení s ručně zapsaným během, nebo záznam, který už v deníku je. */
	action: "created" | "merged" | "duplicate";
	file: TFile;
	note: WorkoutNote;
	/** Soubor obsahoval tep (u sloučení může mít trénink tep zadaný ručně i bez něj). */
	hasHeartRate: boolean;
}

export class RunImportService {
	/** Tréninky zapsané v této relaci – index se o nich dozví se zpožděním. */
	private readonly recent = new Map<string, { file: TFile; note: WorkoutNote }>();

	constructor(
		private readonly index: FormaIndex,
		private readonly workouts: WorkoutService,
	) {}

	/**
	 * Zpracuje text jednoho souboru: tentýž záznam podruhé přeskočí, ručně zapsaný
	 * běh téhož dne se stejnou vzdáleností doplní o měřené údaje (RPE, typ, boty
	 * a poznámka zůstanou), jinak založí nový trénink.
	 */
	async importText(text: string): Promise<RunImportResult> {
		return this.importParsed(parseRunFile(text));
	}

	/** Obsah souboru tak, jak je na disku: FIT se pozná podle hlavičky, ostatní se čte jako text. */
	async importFile(data: ArrayBuffer): Promise<RunImportResult> {
		return this.importParsed(isFit(data) ? parseFit(data) : parseRunFile(new TextDecoder().decode(data)));
	}

	private async importParsed(parsed: ParsedRunFile): Promise<RunImportResult> {
		const note = runFileToWorkout(parsed);
		const known = new Map(this.index.all("workout").map((e) => [e.file.path, { file: e.file, note: e.note }]));
		for (const [path, entry] of this.recent) known.set(path, entry);
		const entries = [...known.values()];
		const notes = entries.map((e) => e.note);

		const same = entries[findSameRecording(note, notes)];
		const hasHeartRate = note.run?.avg_hr !== undefined;
		if (same) return { action: "duplicate", file: same.file, note: same.note, hasHeartRate };

		const manual = entries[findManualMatch(note, notes)];
		if (manual) {
			const merged = mergeIntoManual(manual.note, note);
			await this.workouts.saveNote(merged, manual.file);
			this.recent.set(manual.file.path, { file: manual.file, note: merged });
			return { action: "merged", file: manual.file, note: merged, hasHeartRate };
		}

		const file = await this.workouts.saveNote(note);
		this.recent.set(file.path, { file, note });
		return { action: "created", file, note, hasHeartRate };
	}
}
