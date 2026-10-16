// Čeština: „Co říká výzkum“. Klíč = id tématu (src/seed/research.ts), studie ve stejném pořadí.

import type { ResearchLocale } from "../types";

export const RESEARCH: Record<string, ResearchLocale> = {
	"training": {
		title: "Objem, frekvence a blízkost selhání",
		summary: "Pro růst svalů rozhoduje hlavně týdenní objem (aspoň kolem 10 sérií na partii) a série blízko vyčerpání. Frekvence a váha jsou méně důležité, pokud je objem stejný.",
		practical: "Cvič každou partii aspoň dvakrát týdně, série končí 0–3 opakování před selháním (RIR), do selhání chodit nemusíš. Lehčí i těžší váhy budují svaly; pro maximální sílu potřebuješ i těžké série.",
		studies: [
			"Metaanalýza: každá další týdenní série zvyšuje růst svalu; 10 a více sérií týdně vedlo k většímu růstu než méně než 5.",
			"Metaanalýza: trénink partie aspoň dvakrát týdně vedl k většímu růstu než jednou týdně.",
			"Metaanalýza: vyšší frekvence zvyšuje sílu, ale při stejném týdenním objemu je její vliv nevýznamný.",
			"Metaanalýza: trénink až do selhání není pro růst svalu nutný; série blízko selhání stačí.",
			"Metaanalýza: lehké i těžké váhy přinesly podobný růst svalů, těžké váhy víc maximální síly.",
			"Kontrolovaná studie u trénovaných: stejný objem rozložený do různého počtu tréninků za týden vedl k podobnému růstu svalů i síly.",
			"Metaregrese: s vyšším týdenním objemem rostou svaly i síla, přírůstky se ale postupně zmenšují; frekvence má při stejném objemu menší vliv.",
		],
	},
	"squat": {
		title: "Dřep a hloubka dřepu",
		summary: "Hluboký dřep buduje víc hýždě a adduktory než mělký. Při správné technice není hloubka sama o sobě rizikem pro kolena.",
		practical: "Dřepuj do hloubky, kterou zvládneš s neutrálními zády a koleny ve směru špiček. Hloubku a váhu zvyšuj postupně.",
		studies: [
			"Kontrolovaná studie: hluboký dřep zvětšil hýžďové svaly a adduktory víc než poloviční; přední strana stehen rostla podobně.",
			"Kontrolovaná studie: těžký hluboký dřep zvětšil průřez svalů stehna víc než mělký.",
			"Přehled biomechaniky: při správné technice hluboký dřep zdravá kolena nepřetěžuje víc než mělký; mělké dřepy s velkou vahou mohou zátěž naopak zvyšovat.",
			"Přehled: popisuje zatížení kolen a kyčlí v různých fázích dřepu a technické zásady.",
			"Studie s magnetickou rezonancí: s hloubkou dřepu pod těžkou vahou roste zatížení bederních plotének – hloubku přizpůsob technice a pohyblivosti.",
		],
	},
	"deadlift": {
		title: "Mrtvý tah a jeho varianty",
		summary: "Varianty se liší rozložením zátěže: trap bar víc zatíží kolena a méně záda, sumo víc přední stranu stehen. Volba podle cíle a pohodlí.",
		practical: "Když tě klasický mrtvý tah bolí v zádech, zkus trap bar nebo sumo. Nejtěžší série nad zhruba 90 % maxima zvyšují ohyb hrudní páteře – nech si je na testy.",
		studies: [
			"Biomechanika: s trap barem menší zatížení beder a větší zapojení kolen, vyšší síla i výkon při stejné relativní zátěži.",
			"EMG: sumo víc zapojí přední stranu stehen, klasický mrtvý tah víc lýtka; celkově je aktivace podobná.",
			"Systematický přehled EMG: varianty mrtvého tahu se liší vzorcem aktivace svalů; ze samotné aktivace nejde usuzovat na růst.",
			"Kontrolovaná studie: hip thrust i dřep vedly k podobnému růstu hýždí a podobně zlepšily mrtvý tah.",
		],
	},
	"push": {
		title: "Bench press a kliky",
		summary: "Kliky při podobné náročnosti dávají podobný přírůstek síly a svalů jako bench press. Klik zvedá asi 64 % tělesné hmotnosti.",
		practical: "Když nemáš činku, kliky stačí – jen je ztěžuj (vyvýšené nohy, přívažek, guma, pomalejší tempo), aby série zůstaly blízko vyčerpání.",
		studies: [
			"Kontrolovaná studie: bench press a kliky se stejnou svalovou aktivitou vedly k podobnému zlepšení síly.",
			"Kontrolovaná studie: lehký bench press a kliky přinesly podobný růst svalu a síly.",
			"Kontrolovaná studie: postupně ztěžované kliky zvýšily sílu a tloušťku svalů podobně jako bench press.",
			"Biomechanika: klik zvedá asi 64 % tělesné hmotnosti; varianty se liší v rozsahu zhruba 41–75 %.",
			"Kohortová studie u hasičů: 40 a více kliků souviselo s nižším rizikem srdečních příhod – jde o souvislost, ne o příčinu.",
		],
	},
	"pull": {
		title: "Shyby a přítahy",
		summary: "Nadhmat víc zapojí široký sval zádový a dolní trapéz, podhmat víc biceps. Stahování kladky je dobrá náhrada i cesta k prvnímu shybu.",
		practical: "Střídej nadhmat a podhmat. Než zvládneš shyb, posiluj přítahy, negativy a stahování kladky.",
		studies: [
			"EMG: shyb podhmatem víc zapojil biceps a prsní sval, nadhmatem dolní trapéz; široký sval zádový pracoval podobně.",
			"EMG: různé úchopy a šířky mění aktivaci svalů jen o málo.",
			"EMG u stahování kladky: nadhmat zapojil široký sval zádový víc než podhmat; šířka úchopu rozdíl nedělala.",
			"EMG: shybu se aktivací nejvíc podobalo stahování kladky vkleče.",
		],
	},
	"glutes": {
		title: "Hip thrust a hýždě",
		summary: "Hip thrust aktivuje hýždě víc než dřep, růst hýždí je ale u obou cviků podobný.",
		practical: "Pro hýždě stačí dřep i hip thrust – vyber cvik, který ti sedí, a hlídej týdenní objem.",
		studies: [
			"EMG: hip thrust aktivoval velký hýžďový sval víc než dřep.",
			"Kontrolovaná studie: hip thrust i dřep vedly k podobnému růstu hýždí.",
			"Kontrolovaná studie u trénovaných žen: dřep přinesl podobný nebo větší přírůstek síly a svalů než hip thrust.",
			"Kontrolovaná studie: hluboký dřep zvětšil hýžďové svaly víc než poloviční.",
		],
	},
	"kettlebell": {
		title: "Kettlebell",
		summary: "Swingy zlepšují sílu i výbušnost; jako kardio jen částečně – tep jde vysoko, spotřeba kyslíku méně. Pro maximální sílu a výskok jsou lepší klasické činky.",
		practical: "Kettlebell je dobrý doplněk pro výbušnost, kondici a záda. Pro maximální sílu ho kombinuj s těžkými cviky s činkou.",
		studies: [
			"Kontrolovaná studie: šest týdnů swingů zlepšilo maximální i výbušnou sílu.",
			"Studie: 12 minut swingů zvýšilo tep víc, než by odpovídalo spotřebě kyslíku – kardio jen částečně.",
			"Kontrolovaná studie: trénink s činkou (vzpírání) zlepšil dřep a přemístění víc než kettlebell; výskok se zlepšil podobně.",
			"Kontrolovaná studie u pracovníků: kettlebell snížil bolest krku, ramen a dolní části zad.",
			"Přehled použití v praxi: kettlebell se uplatní v rehabilitaci i kondici; kvalitních studií je málo.",
		],
	},
	"core": {
		title: "Břicho, sedy-lehy a core",
		summary: "Ve velké studii s vojáky nahrazení sedů-lehů core cviky nezměnilo výskyt zranění a v testu sedů-lehů obstáli vojáci s core cviky o něco lépe. Bolestem zad předcházela krátká edukace, ne core cvičení.",
		practical: "Na test sedů-lehů můžeš trénovat i core cviky (plank, boční vzpor, zkracovačky). Zkracovačka zatěžuje bederní páteř výrazně méně než sed-leh.",
		studies: [
			"Kontrolovaná studie u 3 900 vojáků: skupina s core cviky zlepšila test sedů-lehů o něco víc než skupina se sedy-lehy.",
			"Kontrolovaná studie: výskyt zranění se mezi skupinami nelišil.",
			"Kontrolovaná studie: bolesti zad snížila krátká edukace o bolesti, ne core stabilizace.",
			"Biomechanika: zkracovačka zatěžuje bederní páteř výrazně méně než sed-leh; boční vzpor zapojí šikmé svaly bez velkého tlaku na páteř.",
			"EMG: některé cviky na míči zapojí břišní svaly víc než klasické zkracovačky.",
			"Přehled: core trénink jako prevence zranění má smíšené a omezené důkazy.",
		],
	},
	"frequency_programs": {
		title: "Časté opakování jednoho cviku (výzvy, grease the groove)",
		summary: "Častější trénink funguje, pokud celkový objem dává smysl a je čas na regeneraci; frekvence sama je méně důležitá než objem. Konkrétní metody „grease the groove“ ani „100 kliků denně“ nemají vlastní recenzovanou studii.",
		practical: "U denních výzev sleduj únavu a bolest; když se zhorší, uber. Rozhoduje součet kvalitních sérií za týden.",
		studies: [
			"Metaanalýza: frekvence zvyšuje sílu hlavně tím, že zvyšuje objem; při stejném objemu je rozdíl malý.",
			"Metaanalýza: aspoň dva tréninky partie týdně jsou lepší než jeden.",
			"Kontrolovaná studie: stejný objem v různém počtu tréninků dal podobné výsledky.",
			"Kontrolovaná studie: postupně ztěžované kliky zvýšily sílu a tloušťku svalů.",
		],
	},
	"novice_running": {
		title: "Začínající běžci",
		summary: "Začátečníci mají nejvyšší riziko zranění. Pomalé zvyšování a dostatek odpočinku jsou rozumné, ale samotné „pravidlo 10 %“ zranění nesnížilo.",
		practical: "Střídej běh a chůzi, běhej 3× týdně s dnem volna mezi tím a při bolesti zpomal nebo vynech.",
		studies: [
			"Kontrolovaná studie: pozvolnější plán (o 10 % týdně) nesnížil počet zranění u začínajících běžců.",
			"Metaanalýza: začínající běžci mají nejvíc zranění na 1000 hodin běhu.",
			"Kontrolovaná studie (741 začátečníků): online nástroj s radami k prevenci zranění jejich počet nesnížil.",
			"Veřejný plán NHS: 9 týdnů, tři tréninky týdně, střídání běhu a chůze až k 30 minutám běhu.",
		],
	},
	"intensity": {
		title: "Běh 80/20 a intervaly",
		summary: "Většina času v nízké intenzitě a menší část v intenzivních úsecích je osvědčené rozložení. Polarizovaný trénink je lepší jen pro VO2max, hlavně u vrcholových sportovců; jinak jsou výsledky podobné.",
		practical: "Asi 80 % času běhej lehce (zóna 1–2), zbytek intervaly nebo tempo. Intervaly jsou účinné na VO2max, ale nepřeháněj jejich počet.",
		studies: [
			"Přehled: vytrvalci s nejlepšími výsledky tráví zhruba 80 % tréninku v nízké intenzitě.",
			"Kontrolovaná studie: polarizovaný trénink zlepšil klíčové vytrvalostní ukazatele víc než jiné modely.",
			"Metaanalýza: malý a nejistý rozdíl ve prospěch polarizovaného tréninku proti prahovému u trénovaných.",
			"Metaanalýza: polarizovaný trénink lepší jen pro VO2peak, hlavně u kratších programů a vrcholových sportovců; časovky podobné.",
			"Metaanalýza: intervalový trénink zlepšil VO2max víc než souvislý vytrvalostní trénink.",
		],
	},
	"hrv_training": {
		title: "Trénink řízený podle HRV",
		summary: "Trénink upravovaný podle ranního HRV je aspoň stejně účinný jako pevný plán, často s menším počtem těžkých tréninků. Přínos je malý.",
		practical: "Když je HRV pod tvou normou, dej lehčí den; v normě trénuj podle plánu. Měř každé ráno stejně.",
		studies: [
			"Kontrolovaná studie: skupina řízená podle HRV zlepšila maximální výkon víc než skupina s pevným plánem.",
			"Kontrolovaná studie u rekreačních běžců: trénink podle HRV zlepšil vytrvalost podobně nebo o něco víc, s menším počtem intenzivních tréninků.",
			"Kontrolovaná studie u cyklistů: trénink podle HRV zlepšil výkon víc než tradiční plán.",
			"Metaanalýza: trénink podle HRV přináší malé zlepšení některých fyziologických ukazatelů proti pevnému plánu.",
			"Metaanalýza (měření nositelnou elektronikou): malé příznivé účinky na submaximální ukazatele, na výkon bez jasného rozdílu.",
		],
	},
	"deload": {
		title: "Periodizace a odlehčovací týden",
		summary: "Periodizace mírně pomáhá maximální síle, pro růst svalů je při stejném objemu podobná jako trénink bez ní. Odlehčovací týden je běžná praxe s konsenzem trenérů, studií je málo.",
		practical: "Zhruba každých 4–8 týdnů nebo při únavě dej týden s nižším objemem a intenzitou. Svaly za týden nezmizí.",
		studies: [
			"Metaanalýza: periodizovaný trénink zvýšil maximální sílu víc než neperiodizovaný.",
			"Metaanalýza při stejném objemu: periodizace mírně pomohla síle, na růst svalů vliv neměla.",
			"Systematický přehled: podobný růst svalů s periodizací i bez ní.",
			"Delphi konsenzus trenérů a vědců: odlehčení = období se sníženou tréninkovou zátěží, obvykle týden, pro únavu a prevenci stagnace.",
			"Kontrolovaná studie: týden pauzy uprostřed devítitýdenního programu svalovému růstu neuškodil; u síly dolní poloviny těla mohl přírůstek o něco snížit.",
		],
	},
};
