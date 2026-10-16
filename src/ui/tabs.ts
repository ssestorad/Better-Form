// Karty hlavního view (SPEC 5).

import { translated } from "../i18n";

export interface TabDef {
	id: string;
	label: string;
	icon: string;
}

export const TABS = translated([
	{ id: "basic", label: "Basic", icon: "home" },
	{ id: "today", label: "Today", icon: "sun" },
	{ id: "log", label: "Log", icon: "pencil" },
	{ id: "plan", label: "Plan", icon: "calendar-days" },
	{ id: "overview", label: "Overview", icon: "activity" },
	{ id: "body", label: "Body", icon: "user" },
	{ id: "skills", label: "Skills", icon: "award" },
	{ id: "programs", label: "Programs", icon: "calendar" },
	{ id: "goals", label: "Goals", icon: "target" },
	{ id: "nutrition", label: "Nutrition", icon: "apple" },
	{ id: "supplements", label: "Supplements", icon: "pill" },
	{ id: "settings", label: "Settings", icon: "settings" },
] as const satisfies readonly TabDef[]);

export type TabId = (typeof TABS)[number]["id"];

export function isTabId(value: unknown): value is TabId {
	return TABS.some((t) => t.id === value);
}
