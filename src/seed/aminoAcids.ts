// Tabulka 20 aminokyselin, ze kterých se skládají bílkoviny. Denní potřeba
// esenciálních aminokyselin podle WHO/FAO/UNU 2007 (zdroj `who2007`).
// Bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import { getLanguage, translated } from "../i18n";
import { AMINO_EN } from "./en/amino";

export type AminoCategory = "essential" | "conditional" | "nonessential";

export const AMINO_CATEGORY_LABELS: Record<AminoCategory, string> = translated({
	essential: "esenciální",
	conditional: "podmíněně esenciální",
	nonessential: "neesenciální",
});

export interface AminoAcid {
	id: string;
	name: string;
	/** Třípísmenná zkratka. */
	abbr: string;
	category: AminoCategory;
	/** Větvená aminokyselina (leucin, isoleucin, valin). */
	bcaa: boolean;
	/** Průměrná denní potřeba dospělého v mg na kg hmotnosti; jen u esenciálních. */
	requirementMgPerKg?: number;
	/** Potřeba je společná s jinou aminokyselinou (methionin + cystein, fenylalanin + tyrosin). */
	sharedWith?: string;
	/** K čemu hlavně slouží – jedna krátká poznámka. */
	role: string;
}

export const AMINO_ACIDS: AminoAcid[] = [
	// ---------- Esenciální: tělo je neumí vyrobit ----------
	{ id: "leu", name: "Leucin", abbr: "Leu", category: "essential", bcaa: true, requirementMgPerKg: 39, role: "spouští tvorbu svalových bílkovin" },
	{ id: "ile", name: "Isoleucin", abbr: "Ile", category: "essential", bcaa: true, requirementMgPerKg: 20, role: "stavba svalů, energie při zátěži" },
	{ id: "val", name: "Valin", abbr: "Val", category: "essential", bcaa: true, requirementMgPerKg: 26, role: "stavba svalů, energie při zátěži" },
	{ id: "lys", name: "Lysin", abbr: "Lys", category: "essential", bcaa: false, requirementMgPerKg: 30, role: "kolagen, vstřebávání vápníku; málo ho je v obilovinách" },
	{ id: "met", name: "Methionin", abbr: "Met", category: "essential", bcaa: false, requirementMgPerKg: 15, sharedWith: "cys", role: "zdroj síry, začátek každé bílkoviny; málo ho je v luštěninách" },
	{ id: "phe", name: "Fenylalanin", abbr: "Phe", category: "essential", bcaa: false, requirementMgPerKg: 25, sharedWith: "tyr", role: "tělo z něj vyrábí tyrosin" },
	{ id: "thr", name: "Threonin", abbr: "Thr", category: "essential", bcaa: false, requirementMgPerKg: 15, role: "kolagen, sliznice střeva" },
	{ id: "trp", name: "Tryptofan", abbr: "Trp", category: "essential", bcaa: false, requirementMgPerKg: 4, role: "tělo z něj vyrábí serotonin a melatonin" },
	{ id: "his", name: "Histidin", abbr: "His", category: "essential", bcaa: false, requirementMgPerKg: 10, role: "součást karnosinu (s beta-alaninem), tvorba histaminu" },

	// ---------- Podmíněně esenciální: při nemoci, růstu nebo velké zátěži nemusí vlastní výroba stačit ----------
	{ id: "arg", name: "Arginin", abbr: "Arg", category: "conditional", bcaa: false, role: "tvorba oxidu dusnatého (rozšíření cév); tělo ho vyrábí i z citrulinu" },
	{ id: "cys", name: "Cystein", abbr: "Cys", category: "conditional", bcaa: false, sharedWith: "met", role: "součást glutathionu; tělo ho vyrábí z methioninu" },
	{ id: "gln", name: "Glutamin", abbr: "Gln", category: "conditional", bcaa: false, role: "nejhojnější aminokyselina v krvi, palivo pro střevo a imunitní buňky" },
	{ id: "gly", name: "Glycin", abbr: "Gly", category: "conditional", bcaa: false, role: "třetina kolagenu; tělo z něj vyrábí kreatin" },
	{ id: "pro", name: "Prolin", abbr: "Pro", category: "conditional", bcaa: false, role: "kolagen – šlachy, vazy, kůže" },
	{ id: "tyr", name: "Tyrosin", abbr: "Tyr", category: "conditional", bcaa: false, sharedWith: "phe", role: "tělo z něj vyrábí dopamin, adrenalin a hormony štítné žlázy" },

	// ---------- Neesenciální: tělo si je vyrobí samo ----------
	{ id: "ala", name: "Alanin", abbr: "Ala", category: "nonessential", bcaa: false, role: "přenáší dusík ze svalů do jater" },
	{ id: "asn", name: "Asparagin", abbr: "Asn", category: "nonessential", bcaa: false, role: "stavba bílkovin" },
	{ id: "asp", name: "Kyselina asparagová", abbr: "Asp", category: "nonessential", bcaa: false, role: "močovinový cyklus, tvorba energie" },
	{ id: "glu", name: "Kyselina glutamová", abbr: "Glu", category: "nonessential", bcaa: false, role: "přenašeč signálů v mozku; tělo z ní vyrábí glutamin" },
	{ id: "ser", name: "Serin", abbr: "Ser", category: "nonessential", bcaa: false, role: "stavba bílkovin a buněčných membrán" },
];

/** Zdroj denní potřeby a rozdělení na esenciální / podmíněně esenciální. */
/** Aminokyseliny s názvem a rolí v jazyce rozhraní. */
export function aminoAcids(): AminoAcid[] {
	if (getLanguage() === "cs") return AMINO_ACIDS;
	return AMINO_ACIDS.map((a) => ({ ...a, ...(AMINO_EN[a.id] ?? {}) }));
}

export const AMINO_BASIS: Basis = { sourceIds: ["who2007"], evidence: "consensus" };

/** Aminokyseliny, které nejsou součástí bílkovin, ale prodávají se jako doplňky. */
export const NON_PROTEIN_AMINO_NOTE =
	"Mimo tabulku: citrulin a beta-alanin jsou aminokyseliny, které tělo do bílkovin nezabudovává. Kreatin je látka vyráběná z glycinu, argininu a methioninu.";

const ESSENTIAL_IDS = AMINO_ACIDS.filter((a) => a.category === "essential").map((a) => a.id);

/**
 * Které aminokyseliny z tabulky obsahuje suplement z katalogu (podle ID).
 * Protein obsahuje všech 20; přesné množství záleží na výrobku, proto jen ano/ne.
 */
export const SUPPLEMENT_AMINO_CONTENT: Record<string, string[]> = {
	bcaa: ["leu", "ile", "val"],
	eaa: ESSENTIAL_IDS,
	glutamine: ["gln"],
	protein: AMINO_ACIDS.map((a) => a.id),
};

/** ID katalogu suplementů, které se počítají do součtu aminokyselin v denním přehledu. */
export const AMINO_SUPPLEMENT_IDS = ["bcaa", "eaa", "glutamine", "citrulline", "beta_alanine"];

/** Denní potřeba v mg pro danou hmotnost; null u aminokyselin bez stanovené potřeby. */
export function aminoRequirementMg(amino: AminoAcid, weightKg: number): number | null {
	return amino.requirementMgPerKg === undefined ? null : amino.requirementMgPerKg * weightKg;
}

/** Součet potřeby esenciálních aminokyselin v mg/kg (184 podle WHO/FAO/UNU 2007). */
export function totalEssentialMgPerKg(): number {
	return AMINO_ACIDS.reduce((sum, a) => sum + (a.requirementMgPerKg ?? 0), 0);
}
