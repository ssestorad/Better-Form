// Tabulka 20 aminokyselin, ze kterých se skládají bílkoviny. Denní potřeba
// esenciálních aminokyselin podle WHO/FAO/UNU 2007 (zdroj `who2007`).
// Bez závislosti na Obsidianu.

import type { Basis } from "../evidence/sources";
import { getLanguage, translated } from "../i18n";
import { contentOf } from "./localize";

export type AminoCategory = "essential" | "conditional" | "nonessential";

export const AMINO_CATEGORY_LABELS: Record<AminoCategory, string> = translated({
	essential: "essential",
	conditional: "conditionally essential",
	nonessential: "non-essential",
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
	{ id: "leu", name: "Leucine", abbr: "Leu", category: "essential", bcaa: true, requirementMgPerKg: 39, role: "triggers muscle protein synthesis" },
	{ id: "ile", name: "Isoleucine", abbr: "Ile", category: "essential", bcaa: true, requirementMgPerKg: 20, role: "muscle building, energy during exercise" },
	{ id: "val", name: "Valine", abbr: "Val", category: "essential", bcaa: true, requirementMgPerKg: 26, role: "muscle building, energy during exercise" },
	{ id: "lys", name: "Lysine", abbr: "Lys", category: "essential", bcaa: false, requirementMgPerKg: 30, role: "collagen, calcium absorption; grains contain little of it" },
	{ id: "met", name: "Methionine", abbr: "Met", category: "essential", bcaa: false, requirementMgPerKg: 15, sharedWith: "cys", role: "a source of sulfur, the start of every protein; legumes contain little of it" },
	{ id: "phe", name: "Phenylalanine", abbr: "Phe", category: "essential", bcaa: false, requirementMgPerKg: 25, sharedWith: "tyr", role: "the body makes tyrosine from it" },
	{ id: "thr", name: "Threonine", abbr: "Thr", category: "essential", bcaa: false, requirementMgPerKg: 15, role: "collagen, the gut lining" },
	{ id: "trp", name: "Tryptophan", abbr: "Trp", category: "essential", bcaa: false, requirementMgPerKg: 4, role: "the body makes serotonin and melatonin from it" },
	{ id: "his", name: "Histidine", abbr: "His", category: "essential", bcaa: false, requirementMgPerKg: 10, role: "part of carnosine (with beta-alanine), histamine production" },

	// ---------- Podmíněně esenciální: při nemoci, růstu nebo velké zátěži nemusí vlastní výroba stačit ----------
	{ id: "arg", name: "Arginine", abbr: "Arg", category: "conditional", bcaa: false, role: "nitric oxide production (widening of blood vessels); the body also makes it from citrulline" },
	{ id: "cys", name: "Cysteine", abbr: "Cys", category: "conditional", bcaa: false, sharedWith: "met", role: "part of glutathione; the body makes it from methionine" },
	{ id: "gln", name: "Glutamine", abbr: "Gln", category: "conditional", bcaa: false, role: "the most abundant amino acid in the blood, fuel for the gut and immune cells" },
	{ id: "gly", name: "Glycine", abbr: "Gly", category: "conditional", bcaa: false, role: "a third of collagen; the body makes creatine from it" },
	{ id: "pro", name: "Proline", abbr: "Pro", category: "conditional", bcaa: false, role: "collagen – tendons, ligaments, skin" },
	{ id: "tyr", name: "Tyrosine", abbr: "Tyr", category: "conditional", bcaa: false, sharedWith: "phe", role: "the body makes dopamine, adrenaline and thyroid hormones from it" },

	// ---------- Neesenciální: tělo si je vyrobí samo ----------
	{ id: "ala", name: "Alanine", abbr: "Ala", category: "nonessential", bcaa: false, role: "carries nitrogen from the muscles to the liver" },
	{ id: "asn", name: "Asparagine", abbr: "Asn", category: "nonessential", bcaa: false, role: "protein building" },
	{ id: "asp", name: "Aspartic acid", abbr: "Asp", category: "nonessential", bcaa: false, role: "urea cycle, energy production" },
	{ id: "glu", name: "Glutamic acid", abbr: "Glu", category: "nonessential", bcaa: false, role: "a signaling molecule in the brain; the body makes glutamine from it" },
	{ id: "ser", name: "Serine", abbr: "Ser", category: "nonessential", bcaa: false, role: "building proteins and cell membranes" },
];

/** Aminokyseliny s názvem a rolí v jazyce rozhraní (anglický zdroj, překlad v src/locales/<kód>/amino.ts). */
export function aminoAcids(): AminoAcid[] {
	const local = contentOf(getLanguage())?.amino;
	return local ? AMINO_ACIDS.map((a) => ({ ...a, ...(local[a.id] ?? {}) })) : AMINO_ACIDS;
}

export const AMINO_BASIS: Basis = { sourceIds: ["who2007"], evidence: "consensus" };

/** Aminokyseliny, které nejsou součástí bílkovin, ale prodávají se jako doplňky. */
export const NON_PROTEIN_AMINO_NOTE =
	"Not in the table: citrulline and beta-alanine are amino acids the body doesn't build into proteins. Creatine is made from glycine, arginine and methionine.";

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
