import type { ExerciseCategory } from "../../model/constants";
import { translated } from "../../i18n";

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = translated({
	strength: "Posilovna",
	calisthenics: "Kalistenika",
	kettlebell: "Kettlebell",
	cardio: "Kardio",
	mobility: "Mobilita",
});
