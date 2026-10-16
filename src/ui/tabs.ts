// Karty hlavního view (SPEC 5).

import { translated } from "../i18n";

export interface TabDef {
	id: string;
	label: string;
	icon: string;
}

export const TABS = translated([
	{ id: "basic", label: "Základ", icon: "home" },
	{ id: "today", label: "Dnes", icon: "sun" },
	{ id: "log", label: "Zapsat", icon: "pencil" },
	{ id: "plan", label: "Plán", icon: "calendar-days" },
	{ id: "overview", label: "Přehled", icon: "activity" },
	{ id: "body", label: "Tělo", icon: "user" },
	{ id: "skills", label: "Dovednosti", icon: "award" },
	{ id: "programs", label: "Programy", icon: "calendar" },
	{ id: "goals", label: "Cíle", icon: "target" },
	{ id: "nutrition", label: "Výživa", icon: "apple" },
	{ id: "supplements", label: "Suplementy", icon: "pill" },
	{ id: "settings", label: "Nastavení", icon: "settings" },
] as const satisfies readonly TabDef[]);

export type TabId = (typeof TABS)[number]["id"];

export function isTabId(value: unknown): value is TabId {
	return TABS.some((t) => t.id === value);
}
