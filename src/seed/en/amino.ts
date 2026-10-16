// Anglické názvy a role aminokyselin: klíč = id (src/seed/aminoAcids.ts).

export const AMINO_EN: Record<string, { name: string; role: string }> = {
	leu: { name: "Leucine", role: "triggers muscle protein synthesis" },
	ile: { name: "Isoleucine", role: "muscle building, energy during exercise" },
	val: { name: "Valine", role: "muscle building, energy during exercise" },
	lys: { name: "Lysine", role: "collagen, calcium absorption; grains contain little of it" },
	met: { name: "Methionine", role: "a source of sulfur, the start of every protein; legumes contain little of it" },
	phe: { name: "Phenylalanine", role: "the body makes tyrosine from it" },
	thr: { name: "Threonine", role: "collagen, the gut lining" },
	trp: { name: "Tryptophan", role: "the body makes serotonin and melatonin from it" },
	his: { name: "Histidine", role: "part of carnosine (with beta-alanine), histamine production" },
	arg: { name: "Arginine", role: "nitric oxide production (widening of blood vessels); the body also makes it from citrulline" },
	cys: { name: "Cysteine", role: "part of glutathione; the body makes it from methionine" },
	gln: { name: "Glutamine", role: "the most abundant amino acid in the blood, fuel for the gut and immune cells" },
	gly: { name: "Glycine", role: "a third of collagen; the body makes creatine from it" },
	pro: { name: "Proline", role: "collagen – tendons, ligaments, skin" },
	tyr: { name: "Tyrosine", role: "the body makes dopamine, adrenaline and thyroid hormones from it" },
	ala: { name: "Alanine", role: "carries nitrogen from the muscles to the liver" },
	asn: { name: "Asparagine", role: "protein building" },
	asp: { name: "Aspartic acid", role: "urea cycle, energy production" },
	glu: { name: "Glutamic acid", role: "a signaling molecule in the brain; the body makes glutamine from it" },
	ser: { name: "Serine", role: "building proteins and cell membranes" },
};
