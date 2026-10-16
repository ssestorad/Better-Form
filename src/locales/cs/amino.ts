// Čeština: aminokyseliny. Klíč = id (src/seed/aminoAcids.ts).

export const AMINO: Record<string, { name: string; role: string }> = {
	leu: { name: "Leucin", role: "spouští tvorbu svalových bílkovin" },
	ile: { name: "Isoleucin", role: "stavba svalů, energie při zátěži" },
	val: { name: "Valin", role: "stavba svalů, energie při zátěži" },
	lys: { name: "Lysin", role: "kolagen, vstřebávání vápníku; málo ho je v obilovinách" },
	met: { name: "Methionin", role: "zdroj síry, začátek každé bílkoviny; málo ho je v luštěninách" },
	phe: { name: "Fenylalanin", role: "tělo z něj vyrábí tyrosin" },
	thr: { name: "Threonin", role: "kolagen, sliznice střeva" },
	trp: { name: "Tryptofan", role: "tělo z něj vyrábí serotonin a melatonin" },
	his: { name: "Histidin", role: "součást karnosinu (s beta-alaninem), tvorba histaminu" },
	arg: { name: "Arginin", role: "tvorba oxidu dusnatého (rozšíření cév); tělo ho vyrábí i z citrulinu" },
	cys: { name: "Cystein", role: "součást glutathionu; tělo ho vyrábí z methioninu" },
	gln: { name: "Glutamin", role: "nejhojnější aminokyselina v krvi, palivo pro střevo a imunitní buňky" },
	gly: { name: "Glycin", role: "třetina kolagenu; tělo z něj vyrábí kreatin" },
	pro: { name: "Prolin", role: "kolagen – šlachy, vazy, kůže" },
	tyr: { name: "Tyrosin", role: "tělo z něj vyrábí dopamin, adrenalin a hormony štítné žlázy" },
	ala: { name: "Alanin", role: "přenáší dusík ze svalů do jater" },
	asn: { name: "Asparagin", role: "stavba bílkovin" },
	asp: { name: "Kyselina asparagová", role: "močovinový cyklus, tvorba energie" },
	glu: { name: "Kyselina glutamová", role: "přenašeč signálů v mozku; tělo z ní vyrábí glutamin" },
	ser: { name: "Serin", role: "stavba bílkovin a buněčných membrán" },
};
