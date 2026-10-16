// „Co říká výzkum“ u cviků a programů: shrnutí, praktické doporučení a studie
// s typem (stanovisko, metaanalýza, RCT, EMG…). Podklad: rešerše uživatele
// (VYZKUM.md, 10/2026); citace ověřené v src/evidence/sources.ts.
// EMG měří aktivaci svalu, ne růst – je to nejslabší typ důkazu pro hypertrofii.
// Bez závislosti na Obsidianu.

import type { SourceId } from "../evidence/sources";
import type { EvidenceLevel } from "../model/constants";
import { getLanguage } from "../i18n";
import { RESEARCH_EN } from "./en/research";
import { csExerciseName, csProgramName } from "./localize";

export interface ResearchFinding {
	source: SourceId;
	finding: string;
}

export interface ResearchTopic {
	id: string;
	title: string;
	summary: string;
	/** Co si z toho vzít do tréninku. */
	practical: string;
	studies: ResearchFinding[];
	/** Štítek celé položky (SPEC 7.1). */
	evidence: EvidenceLevel;
}

export const RESEARCH_TOPICS: ResearchTopic[] = [
	{
		id: "training",
		title: "Objem, frekvence a blízkost selhání",
		summary:
			"Pro růst svalů rozhoduje hlavně týdenní objem (aspoň kolem 10 sérií na partii) a série blízko vyčerpání. Frekvence a váha jsou méně důležité, pokud je objem stejný.",
		practical:
			"Cvič každou partii aspoň dvakrát týdně, série končí 0–3 opakování před selháním (RIR), do selhání chodit nemusíš. Lehčí i těžší váhy budují svaly; pro maximální sílu potřebuješ i těžké série.",
		studies: [
			{ source: "schoenfeld2017", finding: "Metaanalýza: každá další týdenní série zvyšuje růst svalu; 10 a více sérií týdně vedlo k většímu růstu než méně než 5." },
			{ source: "schoenfeld2016freq", finding: "Metaanalýza: trénink partie aspoň dvakrát týdně vedl k většímu růstu než jednou týdně." },
			{ source: "grgic2018freq", finding: "Metaanalýza: vyšší frekvence zvyšuje sílu, ale při stejném týdenním objemu je její vliv nevýznamný." },
			{ source: "refalo2023", finding: "Metaanalýza: trénink až do selhání není pro růst svalu nutný; série blízko selhání stačí." },
			{ source: "schoenfeld2017load", finding: "Metaanalýza: lehké i těžké váhy přinesly podobný růst svalů, těžké váhy víc maximální síly." },
			{ source: "hamarsland2021", finding: "Kontrolovaná studie u trénovaných: stejný objem rozložený do různého počtu tréninků za týden vedl k podobnému růstu svalů i síly." },
			{ source: "pelland2025", finding: "Metaregrese: s vyšším týdenním objemem rostou svaly i síla, přírůstky se ale postupně zmenšují; frekvence má při stejném objemu menší vliv." },
		],
		evidence: "research",
	},
	{
		id: "squat",
		title: "Dřep a hloubka dřepu",
		summary:
			"Hluboký dřep buduje víc hýždě a adduktory než mělký. Při správné technice není hloubka sama o sobě rizikem pro kolena.",
		practical: "Dřepuj do hloubky, kterou zvládneš s neutrálními zády a koleny ve směru špiček. Hloubku a váhu zvyšuj postupně.",
		studies: [
			{ source: "kubo2019", finding: "Kontrolovaná studie: hluboký dřep zvětšil hýžďové svaly a adduktory víc než poloviční; přední strana stehen rostla podobně." },
			{ source: "bloomquist2013", finding: "Kontrolovaná studie: těžký hluboký dřep zvětšil průřez svalů stehna víc než mělký." },
			{ source: "hartmann2013", finding: "Přehled biomechaniky: při správné technice hluboký dřep zdravá kolena nepřetěžuje víc než mělký; mělké dřepy s velkou vahou mohou zátěž naopak zvyšovat." },
			{ source: "schoenfeld2010", finding: "Přehled: popisuje zatížení kolen a kyčlí v různých fázích dřepu a technické zásady." },
			{ source: "yanagisawa2021", finding: "Studie s magnetickou rezonancí: s hloubkou dřepu pod těžkou vahou roste zatížení bederních plotének – hloubku přizpůsob technice a pohyblivosti." },
		],
		evidence: "research",
	},
	{
		id: "deadlift",
		title: "Mrtvý tah a jeho varianty",
		summary: "Varianty se liší rozložením zátěže: trap bar víc zatíží kolena a méně záda, sumo víc přední stranu stehen. Volba podle cíle a pohodlí.",
		practical: "Když tě klasický mrtvý tah bolí v zádech, zkus trap bar nebo sumo. Nejtěžší série nad zhruba 90 % maxima zvyšují ohyb hrudní páteře – nech si je na testy.",
		studies: [
			{ source: "swinton2011", finding: "Biomechanika: s trap barem menší zatížení beder a větší zapojení kolen, vyšší síla i výkon při stejné relativní zátěži." },
			{ source: "escamilla2002", finding: "EMG: sumo víc zapojí přední stranu stehen, klasický mrtvý tah víc lýtka; celkově je aktivace podobná." },
			{ source: "martinFuentes2020", finding: "Systematický přehled EMG: varianty mrtvého tahu se liší vzorcem aktivace svalů; ze samotné aktivace nejde usuzovat na růst." },
			{ source: "plotkin2023", finding: "Kontrolovaná studie: hip thrust i dřep vedly k podobnému růstu hýždí a podobně zlepšily mrtvý tah." },
		],
		evidence: "research",
	},
	{
		id: "push",
		title: "Bench press a kliky",
		summary: "Kliky při podobné náročnosti dávají podobný přírůstek síly a svalů jako bench press. Klik zvedá asi 64 % tělesné hmotnosti.",
		practical: "Když nemáš činku, kliky stačí – jen je ztěžuj (vyvýšené nohy, přívažek, guma, pomalejší tempo), aby série zůstaly blízko vyčerpání.",
		studies: [
			{ source: "calatayud2015", finding: "Kontrolovaná studie: bench press a kliky se stejnou svalovou aktivitou vedly k podobnému zlepšení síly." },
			{ source: "kikuchi2017", finding: "Kontrolovaná studie: lehký bench press a kliky přinesly podobný růst svalu a síly." },
			{ source: "kotarsky2018", finding: "Kontrolovaná studie: postupně ztěžované kliky zvýšily sílu a tloušťku svalů podobně jako bench press." },
			{ source: "ebben2011", finding: "Biomechanika: klik zvedá asi 64 % tělesné hmotnosti; varianty se liší v rozsahu zhruba 41–75 %." },
			{ source: "yang2019", finding: "Kohortová studie u hasičů: 40 a více kliků souviselo s nižším rizikem srdečních příhod – jde o souvislost, ne o příčinu." },
		],
		evidence: "research",
	},
	{
		id: "pull",
		title: "Shyby a přítahy",
		summary: "Nadhmat víc zapojí široký sval zádový a dolní trapéz, podhmat víc biceps. Stahování kladky je dobrá náhrada i cesta k prvnímu shybu.",
		practical: "Střídej nadhmat a podhmat. Než zvládneš shyb, posiluj přítahy, negativy a stahování kladky.",
		studies: [
			{ source: "youdas2010", finding: "EMG: shyb podhmatem víc zapojil biceps a prsní sval, nadhmatem dolní trapéz; široký sval zádový pracoval podobně." },
			{ source: "dickie2017", finding: "EMG: různé úchopy a šířky mění aktivaci svalů jen o málo." },
			{ source: "lusk2010", finding: "EMG u stahování kladky: nadhmat zapojil široký sval zádový víc než podhmat; šířka úchopu rozdíl nedělala." },
			{ source: "hewit2018", finding: "EMG: shybu se aktivací nejvíc podobalo stahování kladky vkleče." },
		],
		evidence: "research",
	},
	{
		id: "glutes",
		title: "Hip thrust a hýždě",
		summary: "Hip thrust aktivuje hýždě víc než dřep, růst hýždí je ale u obou cviků podobný.",
		practical: "Pro hýždě stačí dřep i hip thrust – vyber cvik, který ti sedí, a hlídej týdenní objem.",
		studies: [
			{ source: "contreras2015", finding: "EMG: hip thrust aktivoval velký hýžďový sval víc než dřep." },
			{ source: "plotkin2023", finding: "Kontrolovaná studie: hip thrust i dřep vedly k podobnému růstu hýždí." },
			{ source: "barbalho2020", finding: "Kontrolovaná studie u trénovaných žen: dřep přinesl podobný nebo větší přírůstek síly a svalů než hip thrust." },
			{ source: "kubo2019", finding: "Kontrolovaná studie: hluboký dřep zvětšil hýžďové svaly víc než poloviční." },
		],
		evidence: "research",
	},
	{
		id: "kettlebell",
		title: "Kettlebell",
		summary:
			"Swingy zlepšují sílu i výbušnost; jako kardio jen částečně – tep jde vysoko, spotřeba kyslíku méně. Pro maximální sílu a výskok jsou lepší klasické činky.",
		practical: "Kettlebell je dobrý doplněk pro výbušnost, kondici a záda. Pro maximální sílu ho kombinuj s těžkými cviky s činkou.",
		studies: [
			{ source: "lake2012", finding: "Kontrolovaná studie: šest týdnů swingů zlepšilo maximální i výbušnou sílu." },
			{ source: "farrar2010", finding: "Studie: 12 minut swingů zvýšilo tep víc, než by odpovídalo spotřebě kyslíku – kardio jen částečně." },
			{ source: "otto2012", finding: "Kontrolovaná studie: trénink s činkou (vzpírání) zlepšil dřep a přemístění víc než kettlebell; výskok se zlepšil podobně." },
			{ source: "jay2011", finding: "Kontrolovaná studie u pracovníků: kettlebell snížil bolest krku, ramen a dolní části zad." },
			{ source: "meigh2019", finding: "Přehled použití v praxi: kettlebell se uplatní v rehabilitaci i kondici; kvalitních studií je málo." },
		],
		evidence: "research",
	},
	{
		id: "core",
		title: "Břicho, sedy-lehy a core",
		summary:
			"Ve velké studii s vojáky nahrazení sedů-lehů core cviky nezměnilo výskyt zranění a v testu sedů-lehů obstáli vojáci s core cviky o něco lépe. Bolestem zad předcházela krátká edukace, ne core cvičení.",
		practical: "Na test sedů-lehů můžeš trénovat i core cviky (plank, boční vzpor, zkracovačky). Zkracovačka zatěžuje bederní páteř výrazně méně než sed-leh.",
		studies: [
			{ source: "childs2009", finding: "Kontrolovaná studie u 3 900 vojáků: skupina s core cviky zlepšila test sedů-lehů o něco víc než skupina se sedy-lehy." },
			{ source: "childs2010", finding: "Kontrolovaná studie: výskyt zranění se mezi skupinami nelišil." },
			{ source: "george2011", finding: "Kontrolovaná studie: bolesti zad snížila krátká edukace o bolesti, ne core stabilizace." },
			{ source: "axler1997", finding: "Biomechanika: zkracovačka zatěžuje bederní páteř výrazně méně než sed-leh; boční vzpor zapojí šikmé svaly bez velkého tlaku na páteř." },
			{ source: "escamilla2010", finding: "EMG: některé cviky na míči zapojí břišní svaly víc než klasické zkracovačky." },
			{ source: "huxelBliven2013", finding: "Přehled: core trénink jako prevence zranění má smíšené a omezené důkazy." },
		],
		evidence: "research",
	},
	{
		id: "frequency_programs",
		title: "Časté opakování jednoho cviku (výzvy, grease the groove)",
		summary:
			"Častější trénink funguje, pokud celkový objem dává smysl a je čas na regeneraci; frekvence sama je méně důležitá než objem. Konkrétní metody „grease the groove“ ani „100 kliků denně“ nemají vlastní recenzovanou studii.",
		practical: "U denních výzev sleduj únavu a bolest; když se zhorší, uber. Rozhoduje součet kvalitních sérií za týden.",
		studies: [
			{ source: "grgic2018freq", finding: "Metaanalýza: frekvence zvyšuje sílu hlavně tím, že zvyšuje objem; při stejném objemu je rozdíl malý." },
			{ source: "schoenfeld2016freq", finding: "Metaanalýza: aspoň dva tréninky partie týdně jsou lepší než jeden." },
			{ source: "hamarsland2021", finding: "Kontrolovaná studie: stejný objem v různém počtu tréninků dal podobné výsledky." },
			{ source: "kotarsky2018", finding: "Kontrolovaná studie: postupně ztěžované kliky zvýšily sílu a tloušťku svalů." },
		],
		evidence: "practice",
	},
	{
		id: "novice_running",
		title: "Začínající běžci",
		summary:
			"Začátečníci mají nejvyšší riziko zranění. Pomalé zvyšování a dostatek odpočinku jsou rozumné, ale samotné „pravidlo 10 %“ zranění nesnížilo.",
		practical: "Střídej běh a chůzi, běhej 3× týdně s dnem volna mezi tím a při bolesti zpomal nebo vynech.",
		studies: [
			{ source: "buist2008", finding: "Kontrolovaná studie: pozvolnější plán (o 10 % týdně) nesnížil počet zranění u začínajících běžců." },
			{ source: "videbaek2015", finding: "Metaanalýza: začínající běžci mají nejvíc zranění na 1000 hodin běhu." },
			{ source: "vanDerDoes2023", finding: "Kontrolovaná studie (741 začátečníků): online nástroj s radami k prevenci zranění jejich počet nesnížil." },
			{ source: "nhsCouchTo5k", finding: "Veřejný plán NHS: 9 týdnů, tři tréninky týdně, střídání běhu a chůze až k 30 minutám běhu." },
		],
		evidence: "research",
	},
	{
		id: "intensity",
		title: "Běh 80/20 a intervaly",
		summary:
			"Většina času v nízké intenzitě a menší část v intenzivních úsecích je osvědčené rozložení. Polarizovaný trénink je lepší jen pro VO2max, hlavně u vrcholových sportovců; jinak jsou výsledky podobné.",
		practical: "Asi 80 % času běhej lehce (zóna 1–2), zbytek intervaly nebo tempo. Intervaly jsou účinné na VO2max, ale nepřeháněj jejich počet.",
		studies: [
			{ source: "seiler2010", finding: "Přehled: vytrvalci s nejlepšími výsledky tráví zhruba 80 % tréninku v nízké intenzitě." },
			{ source: "stoggl2014", finding: "Kontrolovaná studie: polarizovaný trénink zlepšil klíčové vytrvalostní ukazatele víc než jiné modely." },
			{ source: "rosenblat2019", finding: "Metaanalýza: malý a nejistý rozdíl ve prospěch polarizovaného tréninku proti prahovému u trénovaných." },
			{ source: "silvaOliveira2024", finding: "Metaanalýza: polarizovaný trénink lepší jen pro VO2peak, hlavně u kratších programů a vrcholových sportovců; časovky podobné." },
			{ source: "milanovic2015", finding: "Metaanalýza: intervalový trénink zlepšil VO2max víc než souvislý vytrvalostní trénink." },
		],
		evidence: "research",
	},
	{
		id: "hrv_training",
		title: "Trénink řízený podle HRV",
		summary: "Trénink upravovaný podle ranního HRV je aspoň stejně účinný jako pevný plán, často s menším počtem těžkých tréninků. Přínos je malý.",
		practical: "Když je HRV pod tvou normou, dej lehčí den; v normě trénuj podle plánu. Měř každé ráno stejně.",
		studies: [
			{ source: "kiviniemi2007", finding: "Kontrolovaná studie: skupina řízená podle HRV zlepšila maximální výkon víc než skupina s pevným plánem." },
			{ source: "vesterinen2016", finding: "Kontrolovaná studie u rekreačních běžců: trénink podle HRV zlepšil vytrvalost podobně nebo o něco víc, s menším počtem intenzivních tréninků." },
			{ source: "javaloyes2019", finding: "Kontrolovaná studie u cyklistů: trénink podle HRV zlepšil výkon víc než tradiční plán." },
			{ source: "medellinRuiz2020", finding: "Metaanalýza: trénink podle HRV přináší malé zlepšení některých fyziologických ukazatelů proti pevnému plánu." },
			{ source: "duking2021", finding: "Metaanalýza (měření nositelnou elektronikou): malé příznivé účinky na submaximální ukazatele, na výkon bez jasného rozdílu." },
		],
		evidence: "research",
	},
	{
		id: "deload",
		title: "Periodizace a odlehčovací týden",
		summary:
			"Periodizace mírně pomáhá maximální síle, pro růst svalů je při stejném objemu podobná jako trénink bez ní. Odlehčovací týden je běžná praxe s konsenzem trenérů, studií je málo.",
		practical: "Zhruba každých 4–8 týdnů nebo při únavě dej týden s nižším objemem a intenzitou. Svaly za týden nezmizí.",
		studies: [
			{ source: "williams2017period", finding: "Metaanalýza: periodizovaný trénink zvýšil maximální sílu víc než neperiodizovaný." },
			{ source: "moesgaard2022", finding: "Metaanalýza při stejném objemu: periodizace mírně pomohla síle, na růst svalů vliv neměla." },
			{ source: "grgic2018period", finding: "Systematický přehled: podobný růst svalů s periodizací i bez ní." },
			{ source: "bell2023", finding: "Delphi konsenzus trenérů a vědců: odlehčení = období se sníženou tréninkovou zátěží, obvykle týden, pro únavu a prevenci stagnace." },
			{ source: "coleman2024", finding: "Kontrolovaná studie: týden pauzy uprostřed devítitýdenního programu svalovému růstu neuškodil; u síly dolní poloviny těla mohl přírůstek o něco snížit." },
		],
		evidence: "research",
	},
];

/** Cviky z knihovny (src/seed/exercises.ts), ke kterým se téma zobrazí. */
export const EXERCISE_TOPICS: Record<string, string[]> = {
	squat: ["Dřep s činkou", "Přední dřep", "Dřepy", "Goblet dřep", "Bulharský dřep", "Pistol squat"],
	deadlift: ["Mrtvý tah", "Rumunský mrtvý tah", "Mrtvý tah sumo", "Kettlebell mrtvý tah"],
	push: [
		"Bench press",
		"Tlak na šikmé lavici",
		"Tlak s jednoručkami na lavici",
		"Kliky",
		"Kliky na kolenou",
		"Kliky o vyvýšení",
		"Kliky s nohama na vyvýšení",
		"Diamantové kliky",
		"Široké kliky",
		"Archer kliky",
		"Kliky na jedné ruce",
	],
	pull: ["Shyby", "Shyby podhmatem", "Shyby širokým úchopem", "Negativní shyby", "Shyby s gumou", "Shyby k hrudníku", "Australské přítahy", "Stahování kladky"],
	glutes: ["Hip thrust", "Most"],
	kettlebell: ["Kettlebell swing", "Kettlebell swing jednoruč", "Kettlebell clean", "Kettlebell snatch", "Turecký vztyk"],
	core: ["Sedy-lehy", "Zkracovačky", "Plank", "Boční plank", "Hollow hold", "Sklapovačky", "Zvedání nohou ve visu", "Zvedání kolen ve visu"],
};

/** Předpřipravené programy (src/seed/programs.ts) a jejich témata. */
export const PROGRAM_TOPICS: Record<string, string[]> = {
	"Základ 4": ["frequency_programs", "training"],
	"Kliky a shyby – 6 týdnů": ["frequency_programs", "push", "pull"],
	"Od nuly k prvnímu shybu": ["pull", "frequency_programs"],
	"Od gauče k 5 km": ["novice_running"],
	"100 kliků denně": ["frequency_programs", "push"],
	"Grease the groove": ["frequency_programs"],
	"Kettlebell denně": ["kettlebell"],
	"Odlehčovací týden": ["deload"],
};

const key = (s: string) => s.trim().toLocaleLowerCase("cs");

/** Téma v jazyce rozhraní (studie ve stejném pořadí). */
function localize(topic: ResearchTopic): ResearchTopic {
	const en = getLanguage() === "en" ? RESEARCH_EN[topic.id] : undefined;
	if (!en) return topic;
	return { ...topic, title: en.title, summary: en.summary, practical: en.practical, studies: topic.studies.map((s, i) => ({ ...s, finding: en.studies[i] ?? s.finding })) };
}

export function researchTopic(id: string): ResearchTopic | undefined {
	const topic = RESEARCH_TOPICS.find((x) => x.id === id);
	return topic && localize(topic);
}

/** Témata ke cviku: konkrétní téma a u silových cviků i obecné principy tréninku. */
export function topicsForExercise(name: string, category: string): ResearchTopic[] {
	const ids = Object.entries(EXERCISE_TOPICS)
		.filter(([, names]) => names.some((n) => key(n) === key(csExerciseName(name))))
		.map(([id]) => id);
	if (category === "strength" || category === "calisthenics" || category === "kettlebell") ids.push("training");
	return [...new Set(ids)].map(researchTopic).filter((t): t is ResearchTopic => t !== undefined);
}

export function topicsForProgram(name: string): ResearchTopic[] {
	const entry = Object.entries(PROGRAM_TOPICS).find(([program]) => key(program) === key(csProgramName(name)));
	return (entry?.[1] ?? []).map(researchTopic).filter((t): t is ResearchTopic => t !== undefined);
}
