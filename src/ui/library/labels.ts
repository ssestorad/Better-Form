import type { ExerciseCategory } from "../../model/constants";
import { translated } from "../../i18n";

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = translated({
	strength: "Gym",
	calisthenics: "Calisthenics",
	kettlebell: "Kettlebell",
	cardio: "Cardio",
	mobility: "Mobility",
});
