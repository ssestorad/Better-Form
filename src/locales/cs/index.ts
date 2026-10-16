// Čeština.

import type { Locale } from "../types";
import { AMINO } from "./amino";
import { EXERCISES } from "./exercises";
import { LADDERS, PROGRAMS, TEMPLATES } from "./programs";
import { RESEARCH } from "./research";
import { SOURCES } from "./sources";
import { SUPPLEMENTS } from "./supplements";
import { UI } from "./ui";

export const CS: Locale = {
	code: "cs",
	label: "Čeština",
	ui: UI,
	content: {
		exercises: EXERCISES,
		ladders: LADDERS,
		programs: PROGRAMS,
		templates: TEMPLATES,
		research: RESEARCH,
		supplements: SUPPLEMENTS,
		amino: AMINO,
		sources: SOURCES,
	},
};
