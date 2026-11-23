// Navigace hlavního view (SPEC 5): šest sekcí s podsekcemi. Id pohledů jsou plochá a stará id
// karet zůstávají platná, takže odkazy, uložený layout i cíle doporučení fungují bez převodu.

import { inContext, translated } from "../i18n";
import type { ModuleKey } from "../settings/modules";

export interface TabDef {
	id: string;
	label: string;
	icon: string;
}

export const TABS = translated([
	{ id: "basic", label: "Basic", icon: "home" },
	{ id: "today", label: "Today", icon: "sun" },
	{ id: "log", label: inContext("view", "Log"), icon: "pencil" },
	{ id: "history", label: "History", icon: "history" },
	{ id: "exercises", label: "Exercises", icon: "book-open" },
	{ id: "plan", label: "Week", icon: "calendar-days" },
	{ id: "programs", label: "Programs", icon: "calendar" },
	{ id: "goals", label: "Goals", icon: "target" },
	{ id: "skills", label: "Skills", icon: "award" },
	{ id: "overview", label: "Summary", icon: "activity" },
	{ id: "charts", label: "Charts", icon: "line-chart" },
	{ id: "records", label: "Records", icon: "trophy" },
	{ id: "run", label: "Run", icon: "footprints" },
	{ id: "body", label: "Figure", icon: "user" },
	{ id: "measurements", label: "Measurements", icon: "ruler" },
	{ id: "pain", label: "Pain", icon: "alert-triangle" },
	{ id: "cycle", label: "Cycle", icon: "circle" },
	{ id: "nutrition", label: "Energy", icon: "apple" },
	{ id: "supplements", label: "Mine", icon: "pill" },
	{ id: "supplement-library", label: "Library", icon: "library" },
	{ id: "supplement-charts", label: inContext("supplements", "Charts"), icon: "table" },
	{ id: "settings", label: "Settings", icon: "settings" },
] as const satisfies readonly TabDef[]);

export type TabId = (typeof TABS)[number]["id"];

export function isTabId(value: unknown): value is TabId {
	return TABS.some((t) => t.id === value);
}

const SECTIONS = translated([
	{ id: "today", label: "Today", icon: "sun" },
	{ id: "training", label: "Training", icon: "dumbbell" },
	{ id: "planning", label: "Plan", icon: "calendar-days" },
	{ id: "progress", label: "Progress", icon: "activity" },
	{ id: "care", label: "Body", icon: "user" },
	{ id: "fuel", label: "Nutrition", icon: "apple" },
] as const satisfies readonly TabDef[]);

export type SectionId = (typeof SECTIONS)[number]["id"];

// Mimo translated(): překládat se smí jen popisky, ne id a klíče modulů.
const SECTION_VIEWS: Record<SectionId, readonly TabId[]> = {
	today: ["today"],
	training: ["log", "history", "exercises"],
	planning: ["plan", "programs", "goals", "skills"],
	progress: ["overview", "charts", "records", "run"],
	care: ["body", "measurements", "pain", "cycle"],
	fuel: ["nutrition", "supplements", "supplement-library", "supplement-charts"],
};

const VIEW_MODULE: Partial<Record<TabId, ModuleKey>> = {
	programs: "programs",
	goals: "goals",
	skills: "skills",
	nutrition: "nutrition",
	supplements: "supplements",
	"supplement-library": "supplements",
	"supplement-charts": "supplements.tables",
	run: "running.analysis",
	body: "body",
};

/** Pohledy jedné obrazovky sdílejí komponentu, takže její stav přežije přepnutí podsekce. */
const VIEW_SCREEN: Partial<Record<TabId, string>> = {
	history: "log",
	charts: "overview",
	records: "overview",
	run: "overview",
	measurements: "body",
	pain: "body",
	cycle: "body",
	"supplement-library": "supplements",
	"supplement-charts": "supplements",
};

export interface ViewAvailability {
	basic: boolean;
	cycleOn: boolean;
	moduleOn(key: ModuleKey): boolean;
}

export interface VisibleSection {
	id: SectionId;
	label: string;
	icon: string;
	views: TabId[];
}

function viewVisible(view: TabId, a: ViewAvailability): boolean {
	if (view === "cycle") return a.cycleOn;
	const module = VIEW_MODULE[view];
	return module === undefined || a.moduleOn(module);
}

export function visibleSections(a: ViewAvailability): VisibleSection[] {
	if (a.basic) return [];
	return SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon, views: SECTION_VIEWS[s.id].filter((v) => viewVisible(v, a)) })).filter((s) => s.views.length > 0);
}

export function sectionOf(view: TabId): SectionId | null {
	return (Object.keys(SECTION_VIEWS) as SectionId[]).find((s) => SECTION_VIEWS[s].includes(view)) ?? null;
}

export function screenOf(view: TabId): string {
	return VIEW_SCREEN[view] ?? view;
}

/** Pohled, který se smí ukázat: skrytý spadne na první viditelný ve své sekci, neznámý na Dnes. */
export function resolveView(requested: unknown, a: ViewAvailability): TabId {
	if (a.basic) return requested === "settings" ? "settings" : "basic";
	if (!isTabId(requested) || requested === "basic") return "today";
	if (requested === "settings") return requested;
	const section = sectionOf(requested);
	const views = visibleSections(a).find((s) => s.id === section)?.views ?? [];
	return views.includes(requested) ? requested : (views[0] ?? "today");
}

/** Kam vede klepnutí na sekci: poslední otevřená podsekce, jinak první. */
export function sectionTarget(section: VisibleSection, last: TabId | undefined): TabId {
	return last !== undefined && section.views.includes(last) ? last : section.views[0]!;
}
