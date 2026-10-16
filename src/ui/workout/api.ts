// Rozhraní mezi formulářem tréninku a pluginem (index, knihovna, ukládání).

import type { Sport } from "../../model/constants";
import type { DraftBlock, ExerciseInfo, WorkoutDraft } from "./draft";
import type { ExerciseOption } from "./search";

export interface WorkoutFormApi {
	exercises: () => ExerciseOption[];
	info: (exercise: string) => ExerciseInfo | undefined;
	/** „28. 9.: 3×6 × 80 kg (RIR 2, 2, 3)“ – poslední výkon před datem. */
	lastText: (exercise: string, date: string) => string | undefined;
	/** Nový blok pro cvik, předvyplněný z minula. */
	newBlock: (exercise: string, date: string) => DraftBlock;
	createExercise: (name: string, sport: Sport) => Promise<void>;
	/** Názvy aktivních bot pro výběr u běhu. */
	shoes: () => string[];
	/** Otevřené záznamy bolestí pro výběr „bolest při tréninku“. */
	pains: () => { name: string; level: number }[];
	/** Otevře detail cviku v knihovně (panáček, provedení, chyby). */
	showExercise: (exercise: string) => void;
	save: (draft: WorkoutDraft) => Promise<void>;
	saveTemplate: (draft: WorkoutDraft, name: string) => Promise<void>;
	cancel: () => void;
	/** Smazat upravovaný trénink (jen u existujícího). */
	remove?: () => Promise<void>;
	setDirty: (dirty: boolean) => void;
}
