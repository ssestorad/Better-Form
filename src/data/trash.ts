// Texty potvrzení při mazání poznámek z rozhraní. Mazání = přesun do koše
// (podle nastavení Obsidianu), nikdy trvalé smazání. Bez závislosti na Obsidianu.

import { t, translated } from "../i18n";

export const TRASH_KINDS = ["workout", "supplement", "goal", "norm", "pain", "shoes", "program", "template"] as const;
export type TrashKind = (typeof TRASH_KINDS)[number];

interface TrashText {
	/** „trénink“ – 4. pád, do titulku „Smazat trénink?“. */
	what: string;
	/** Co smazání způsobí a co zůstane. */
	effect: string;
}

const TEXTS: Record<TrashKind, TrashText> = translated({
	workout: { what: "trénink", effect: "Zmizí z přehledů, rekordů, objemu i zátěže." },
	supplement: {
		what: "suplement",
		effect: "Záznamy o užití v denních poznámkách zůstanou, ale přestane se počítat dodržování. Pokud chceš historii zachovat, stačí ho vypnout.",
	},
	goal: { what: "cíl", effect: "Pokud ho chceš jen uzavřít, použij „Splněno“ nebo „Zrušit cíl“ – poznámka pak zůstane." },
	norm: { what: "normu", effect: "Cíle navázané na tuto normu přestanou ukazovat průběh." },
	pain: { what: "záznam bolesti", effect: "Zmizí i její historie. Pokud už nebolí, stačí zapsat intenzitu 0 – záznam se uzavře a zůstane." },
	shoes: { what: "boty", effect: "Běhy zůstanou, jen se u nich přestanou počítat kilometry bot. Pokud je už nenosíš, stačí je vyřadit." },
	program: { what: "program", effect: "Tréninky zapsané podle programu zůstanou." },
	template: { what: "šablonu", effect: "Tréninky zapsané ze šablony zůstanou." },
});

export interface TrashPrompt {
	title: string;
	message: string;
}

/** Titulek a text potvrzení; `extra` = doplnění pro konkrétní případ (např. předpřipravený program). */
export function trashPrompt(kind: TrashKind, name: string, extra = ""): TrashPrompt {
	const { what, effect } = TEXTS[kind];
	return {
		title: t("Smazat {what}?", { what }),
		message: t("„{name}“ se přesune do koše – dá se z něj obnovit. {effect}{v}", { name, effect, v: extra ? ` ${extra}` : "" }),
	};
}
