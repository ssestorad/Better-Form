// Texty potvrzení při mazání poznámek z rozhraní. Mazání = přesun do koše
// (podle nastavení Obsidianu), nikdy trvalé smazání. Bez závislosti na Obsidianu.

import { inContext, t, translated } from "../i18n";

export const TRASH_KINDS = ["workout", "supplement", "goal", "norm", "pain", "shoes", "program", "template"] as const;
export type TrashKind = (typeof TRASH_KINDS)[number];

interface TrashText {
	/** „trénink“ – 4. pád, do titulku „Smazat trénink?“. */
	what: string;
	/** Co smazání způsobí a co zůstane. */
	effect: string;
}

const TEXTS: Record<TrashKind, TrashText> = translated({
	workout: { what: "workout", effect: "It disappears from overviews, records, volume and load." },
	supplement: {
		what: "supplement",
		effect: "Intake records in daily notes stay, but adherence stops being calculated. To keep the history, just turn it off.",
	},
	goal: { what: "goal", effect: "If you only want to close it, use “Done” or “Drop goal” – the note then stays." },
	norm: { what: "standard", effect: "Goals linked to this standard stop showing progress." },
	pain: { what: "pain entry", effect: "Its history disappears too. If it no longer hurts, just log intensity 0 – the entry closes and stays." },
	shoes: { what: "shoes", effect: "Runs stay; only the shoe kilometers stop being counted for them. If you no longer wear them, just retire them." },
	program: { what: "program", effect: "Workouts logged from the program stay." },
	template: { what: inContext("delete", "template"), effect: "Workouts logged from the template stay." },
});

export interface TrashPrompt {
	title: string;
	message: string;
}

/** Titulek a text potvrzení; `extra` = doplnění pro konkrétní případ (např. předpřipravený program). */
export function trashPrompt(kind: TrashKind, name: string, extra = ""): TrashPrompt {
	const { what, effect } = TEXTS[kind];
	return {
		title: t("Delete {what}?", { what }),
		message: t("“{name}” will be moved to the trash – it can be restored from there. {effect}{v}", { name, effect, v: extra ? ` ${extra}` : "" }),
	};
}
