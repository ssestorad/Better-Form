// Původních 21 látek katalogu, seřazených podle síly důkazů. Hodnocení po oblastech
// přínosu a bezpečnost vycházejí z rešerše uživatele (SUPLEMENTY.md, VYZKUM.md, 10/2026);
// citace jsou ověřené v src/evidence/sources.ts. Bez závislosti na Obsidianu.

import type { CatalogEntry } from "./supplementModel";

export const BASE_ENTRIES: CatalogEntry[] = [
	// ---------- Podložené ----------
	{
		id: "creatine",
		name: "Kreatin",
		aliases: ["kreatin monohydrát", "creatine"],
		summary:
			"Nejlépe prozkoumaný doplněk: zlepšuje opakované krátké intenzivní výkony a spolu se silovým tréninkem podporuje přírůstky síly a svalové hmoty.",
		studies: [
			{ source: "kreider2017", finding: "Stanovisko ISSN: kreatin monohydrát je nejúčinnější dostupný doplněk pro intenzivní výkon a svalovou hmotu; u zdravých lidí nenašlo škodlivé účinky ani při dlouhodobém užívání." },
			{ source: "maughan2018", finding: "Konsenzus MOV ho řadí mezi několik málo doplňků s dobrými důkazy; počítá s přírůstkem hmotnosti 1–2 kg po nasycení." },
			{ source: "lanhers2017", finding: "Metaanalýza 53 studií: malý až střední přínos pro sílu horní poloviny těla (velikost účinku 0,32) u výkonů do 3 minut, bez ohledu na dávku a trénovanost." },
			{ source: "chilibeck2017", finding: "Metaanalýza 22 studií u starších dospělých: se silovým tréninkem o 1,4 kg více svalové hmoty než placebo a větší síla v tlaku na hrudník i nohy." },
			{ source: "antonio2021", finding: "Přehled častých mýtů: u zdravých lidí kreatin v doporučených dávkách nepoškozuje ledviny, nezpůsobuje dehydrataci ani křeče a vypadávání vlasů se neprokázalo." },
			{ source: "avgerinos2018", area: "cognition", finding: "Systematický přehled 6 kontrolovaných studií: možné zlepšení krátkodobé paměti a uvažování; u ostatních funkcí se výsledky rozcházejí." },
			{ source: "xu2024", area: "cognition", finding: "Metaanalýza: zlepšení paměti a rychlosti pozornosti a zpracování informací; bez účinku na celkovou kognici a exekutivní funkce." },
		],
		agreement: "Zdroje se shodují – stanoviska i nezávislé metaanalýzy nacházejí malý až střední, ale spolehlivý účinek.",
		dosing:
			"3–5 g kreatin monohydrátu denně, každý den, na čase nezáleží. Volitelně nasycovací fáze: asi 20 g denně ve čtyřech dávkách po 5–7 dní, potom 3–5 g denně. Bez nasycení se zásoby naplní zhruba za čtyři týdny.",
		forWhom: "Silový trénink, sprinty, intervalový a kolektivní sport. Větší přínos mívají lidé s nízkým příjmem masa a ryb.",
		risks:
			"Po nasycení obvykle přibude 1–2 kg hmotnosti (voda ve svalech) – počítej s tím u běhu a váhových kategorií. U zdravých lidí nebyly při doporučeném dávkování prokázány škodlivé účinky. Při onemocnění ledvin jen po domluvě s lékařem.",
		evidence: "consensus",
		defaults: { dose: 5, unit: "g", timing: "any" },
		benefits: [
			{ area: "performance", grade: "A", note: "síla a opakované krátké intenzivní výkony" },
			{ area: "body", grade: "A", note: "se silovým tréninkem" },
			{ area: "cognition", grade: "C", note: "smíšené výsledky; spíš starší lidé, vegetariáni, nedostatek spánku" },
		],
		safety: "ok",
	},
	{
		id: "caffeine",
		name: "Kofein",
		aliases: ["káva", "caffeine"],
		summary: "Zlepšuje vytrvalostní výkon zhruba o 2–4 % a v menší míře i sílu, svalovou vytrvalost, sprint a výbušnost.",
		studies: [
			{ source: "guest2021", finding: "Stanovisko ISSN: 3–6 mg/kg zlepšuje vytrvalost o 2–4 %; malý až střední přínos i pro sílu, sprint a skoky." },
			{ source: "grgic2020", finding: "Souhrn 21 metaanalýz: kofein pomáhá u vytrvalosti, síly, svalové vytrvalosti, výkonu a skoků; většina studií ale proběhla na mladých mužích." },
			{ source: "southward2018", finding: "Metaanalýza 46 studií časovek: průměrný výkon vyšší o 3,0 %, čas kratší o 2,2 % při dávce 3–6 mg/kg." },
			{ source: "maughan2018", finding: "Konsenzus MOV: 3–6 mg/kg asi 60 minut před výkonem; od 9 mg/kg už jen přibývá nežádoucích účinků." },
			{ source: "grgic2018strength", finding: "Metaanalýza: malé zlepšení maximální síly a výbušnosti, hlavně u horní poloviny těla." },
			{ source: "drake2013", area: "sleep", finding: "Kontrolovaná studie: 400 mg kofeinu zkrátilo spánek, i když byl podán 6 hodin před ulehnutím – o více než hodinu." },
			{ source: "haskell2008", area: "cognition", finding: "Kontrolovaná studie: kofein s L-theaninem zrychlil reakce a zlepšil bdělost víc než každá látka zvlášť." },
			{ source: "owen2008", area: "cognition", funded: true, finding: "Kontrolovaná studie: 50 mg kofeinu se 100 mg L-theaninu zlepšilo rychlost a přesnost přepínání pozornosti." },
			{ source: "giesbrecht2010", area: "cognition", funded: true, finding: "Kontrolovaná studie: 40 mg kofeinu s 97 mg L-theaninu zlepšilo přesnost při přepínání úloh a pocit bdělosti." },
		],
		agreement: "Zdroje se shodují na účinku i na dávce. Velikost účinku je malá a u jednotlivců se liší.",
		dosing:
			"3–6 mg na kg hmotnosti asi 60 minut před výkonem. Fungují i nižší dávky (pod 3 mg/kg, kolem 200 mg). Dávky od 9 mg/kg výkon dál nezlepší a přidají nežádoucí účinky.",
		forWhom: "Před závodem nebo těžkým tréninkem. Reakce je individuální – vyzkoušej v tréninku, ne poprvé v závodě.",
		risks:
			"Nervozita, bušení srdce, zažívací potíže a hlavně horší spánek – odpoledne a večer se mu vyhni. Počítej i kávu, čaj a energetické nápoje. Při potížích se srdcem, vysokém tlaku nebo v těhotenství se poraď s lékařem.",
		evidence: "consensus",
		defaults: { dose: 200, unit: "mg", timing: "pre_workout", trainingDaysOnly: true },
		benefits: [
			{ area: "performance", grade: "A", note: "vytrvalost; u síly menší účinek" },
			{ area: "cognition", grade: "A", note: "bdělost a pozornost; kombinace s L-theaninem B" },
			{ area: "sleep", grade: "X", note: "zhoršuje – méně než 6 h před spaním zkracuje spánek" },
		],
		safety: "caution",
		safetyNote:
			"Vyšší dávky zvyšují tep, nervozitu a zhoršují spánek. Opatrně při potížích se srdcem, vysokém tlaku a v těhotenství.",
	},
	{
		id: "protein",
		name: "Protein",
		aliases: ["bílkoviny", "syrovátka", "whey", "proteinový nápoj"],
		summary:
			"Dostatek bílkovin zvyšuje přírůstky síly a svalů ze silového tréninku. Rozhoduje celkový denní příjem – proteinový nápoj je jen pohodlný způsob, jak ho dosáhnout.",
		studies: [
			{ source: "morton2018", finding: "Metaanalýza 49 studií (1863 lidí): doplnění bílkovin zvyšuje přírůstky síly a svalů; nad celkový příjem asi 1,6 g/kg denně už další přínos nenašla." },
			{ source: "jager2017", finding: "Stanovisko ISSN: většině cvičících stačí 1,4–2,0 g/kg denně." },
			{ source: "maughan2018", finding: "Konsenzus MOV: optimum kolem 1,6 g/kg denně (do 2,2 g/kg bez nežádoucích účinků), 0,3–0,5 g/kg na jídlo." },
			{ source: "cermak2012", finding: "Metaanalýza 22 studií: bílkovinný doplněk při silovém tréninku přidal asi 0,7 kg beztukové hmoty a zvýšil sílu nohou proti placebu." },
			{ source: "nunes2022", finding: "Metaanalýza: vyšší příjem bílkovin podporuje svalovou hmotu hlavně ve spojení se silovým tréninkem; účinek je malý." },
			{ source: "antonio2024protein", finding: "Přehled častých otázek: u zdravých lidí vyšší příjem bílkovin nepoškozuje ledviny ani kosti." },
		],
		agreement: "Zdroje se shodují na rozmezí zhruba 1,4–2,2 g/kg denně; liší se jen v tom, kde přesně přínos končí.",
		dosing:
			"Celkem asi 1,6 g bílkovin na kg hmotnosti denně včetně jídla (rozumný strop je 2,2 g/kg). Na jedno jídlo 0,3–0,5 g/kg, 3–4× denně.",
		forWhom: "Když se ti nedaří pokrýt bílkoviny běžným jídlem – při hubnutí, vegetariánské stravě nebo nabitém dni.",
		risks:
			"Jde o potravinu, ne o zázrak: pokud máš bílkovin dost z jídla, další nepřidají. Při onemocnění ledvin se o příjmu bílkovin poraď s lékařem.",
		evidence: "research",
		defaults: { dose: 30, unit: "g", timing: "post_workout" },
		benefits: [
			{ area: "body", grade: "A", note: "rozhoduje celkový denní příjem bílkovin" },
			{ area: "performance", grade: "B", note: "síla, se silovým tréninkem" },
		],
		safety: "ok",
	},
	{
		id: "beta_alanine",
		name: "Beta-alanin",
		aliases: ["beta alanin", "beta-alanine"],
		summary: "Malé, ale měřitelné zlepšení u intenzivních výkonů trvajících zhruba 30 sekund až 10 minut.",
		studies: [
			{ source: "saunders2017", finding: "Metaanalýza: největší přínos u výkonů trvajících 0,5–10 minut; u výkonů kratších než 30 sekund žádné zlepšení." },
			{ source: "trexler2015", finding: "Stanovisko ISSN: 4–6 g denně po 4 týdny výrazně zvýší svalový karnosin; jediný popsaný vedlejší účinek je mravenčení." },
			{ source: "maughan2018", finding: "Konsenzus MOV: asi 65 mg/kg denně rozděleně po 10–12 týdnů; přínos zhruba 0,2–3 % u výkonů 30 s až 10 min." },
			{ source: "hill2007", finding: "Studie: 4 a 10 týdnů užívání zvýšilo karnosin ve svalu zhruba o 60 a 80 % a celkovou práci při intenzivní jízdě na kole o 13 a 16 %." },
			{ source: "rezende2020", finding: "Metaanalýza: karnosin ve svalu se zvýšil téměř u všech (99 % lidí); běžné protokoly svaly zdaleka nenasytí." },
			{ source: "georgiou2024", finding: "Metaanalýza 18 kontrolovaných studií u trénovaných mužů: malý účinek, nejlépe po 4 týdnech s 5,6–6,4 g denně u výkonů 4–10 minut." },
		],
		agreement: "Zdroje se shodují: účinek je malý a týká se jen středně dlouhých intenzivních výkonů.",
		dosing:
			"Asi 65 mg na kg hmotnosti denně (obvykle 4–6 g), rozděleně po 0,8–1,6 g každé 3–4 hodiny, po dobu nejméně 4 týdnů, lépe 10–12. Účinek se staví postupně – jednorázová dávka před tréninkem nic neudělá.",
		forWhom:
			"Intervaly, běhy na 400–3000 m, plavání na střední tratě, okruhový trénink. Pro čistou sílu a dlouhou vytrvalost má malý význam.",
		risks: "Mravenčení kůže po větší dávce (neškodné; zmírní ho rozdělení dávek). Dlouhodobá data jsou omezená.",
		evidence: "consensus",
		defaults: { dose: 4, unit: "g", timing: "with_meal" },
		benefits: [{ area: "performance", grade: "A", note: "intenzivní úsilí zhruba 1–10 minut" }],
		safety: "ok",
		safetyNote: "Neškodné brnění kůže (parestézie) po větší jednorázové dávce – pomáhá dávku rozdělit.",
	},
	// ---------- Jen v určité situaci ----------
	{
		id: "vitamin_d",
		name: "Vitamin D",
		aliases: ["vitamin d3", "déčko", "cholekalciferol"],
		summary:
			"Má smysl při nedostatku, který je v zimě v našich zeměpisných šířkách běžný. Samotné doplnění ale sílu ani výkon sportovců nezvyšuje.",
		studies: [
			{ source: "farrokhyar2017", finding: "Metaanalýza u sportovců: doplňování zvedlo hladinu vitaminu D na dostatečnou, ale na svalovou sílu nemělo významný vliv." },
			{ source: "owens2018", finding: "Přehled: nízká hladina je u sportovců v zimě častá; vitamin D není „nový doplněk na výkon“, jde o zdraví kostí, svalů a imunitu. Varuje před extrémními dávkami." },
			{ source: "maughan2018", finding: "Konsenzus MOV: doplňovat při nedostatečné hladině, běžně 800–2000 IU denně; vyšší dávky jen krátkodobě pod dohledem." },
			{ source: "efsaUl", finding: "EFSA: horní limit pro dospělé je 100 µg (4000 IU) denně." },
			{ source: "han2019", area: "performance", finding: "Metaanalýza kontrolovaných studií u sportovců: hladina vitaminu D stoupla, síla se celkově nezlepšila." },
			{ source: "zhang2019vitd", area: "performance", finding: "Metaanalýza u sportovců: mírné zlepšení síly dolních končetin, hlavně u halových sportů; horní končetiny a výbušnost beze změny." },
			{ source: "sist2023", area: "performance", finding: "Metaanalýza kontrolovaných studií: bez významného účinku na maximální sílu a výbušnost." },
			{ source: "han2024", area: "performance", finding: "Aktualizovaná metaanalýza: jen mírné zlepšení síly kvadricepsu, jinak bez účinku." },
			{ source: "martineau2017", area: "immunity", finding: "Metaanalýza dat jednotlivých účastníků (25 studií): mírně nižší riziko akutních respiračních infekcí, víc u lidí s výrazným nedostatkem a při denním nebo týdenním dávkování." },
			{ source: "jolliffe2021", area: "immunity", finding: "Metaanalýza kontrolovaných studií: malé snížení rizika respiračních infekcí." },
			{ source: "jolliffe2025", area: "immunity", finding: "Aktualizace (40 studií, přes 60 000 lidí): účinek už nebyl statisticky významný a nelišil se podle výchozí hladiny ani dávkování; autoři upozorňují na možné publikační zkreslení." },
		],
		agreement: "Zdroje se shodují: doplnit nedostatek ano, čekat zlepšení výkonu ne.",
		dosing:
			"Běžně 800–2000 IU (20–50 µg) denně, hlavně od podzimu do jara. Vyšší dávky při prokázaném nedostatku patří pod dohled lékaře. Nejlepší je nechat si hladinu změřit z krve.",
		forWhom: "Málo slunce (zima, práce uvnitř, trénink v hale), tmavší pleť, důsledné používání opalovacích krémů.",
		risks:
			"Horní limit pro dospělé je 100 µg (4000 IU) denně ze všech zdrojů. Dlouhodobé předávkování zvyšuje hladinu vápníku v krvi.",
		evidence: "consensus",
		defaults: { dose: 1000, unit: "IU", timing: "with_meal" },
		benefits: [
			{ area: "performance", grade: "X", note: "při dostatečné hladině sílu nezlepšuje; smysl má při nedostatku" },
			{ area: "immunity", grade: "C", note: "hraniční – nejnovější metaanalýza účinek nepotvrdila" },
		],
		safety: "ok",
	},
	{
		id: "omega3",
		name: "Omega-3",
		aliases: ["rybí olej", "epa", "dha", "omega 3"],
		summary:
			"Může zmírnit svalovou bolest po těžkém tréninku a podle novějších zdrojů i podpořit vytrvalost, ale výsledky studií nejsou jednotné. Smysl dává hlavně tehdy, když skoro nejíš tučné ryby.",
		studies: [
			{ source: "maughan2018", finding: "Konsenzus MOV (2018): důkazy pro výkon a regeneraci jsou omezené; doporučuje spíš tučné ryby než kapsle." },
			{ source: "thielecke2020", finding: "Přehled: řada studií naznačuje lepší vytrvalost a menší svalovou bolest, ale výsledky se nepřenášejí spolehlivě do praxe, takže jasné doporučení dát nejde." },
			{ source: "jager2025", finding: "Stanovisko ISSN (2025): omega-3 zlepšují vytrvalostní kapacitu a mohou snížit pociťovanou svalovou bolest; na růst svalů u mladých dospělých vliv nejspíš nemají." },
			{ source: "efsaOmega2012", finding: "EFSA: doplňkový příjem EPA + DHA do 5 g denně nevzbuzuje obavy o bezpečnost." },
			{ source: "lv2020", area: "recovery", finding: "Metaanalýza: snížení svalové bolesti po excentrické zátěži je statisticky významné, ale klinicky malé." },
			{ source: "li2026omega", area: "recovery", finding: "Metaanalýza 41 kontrolovaných studií: středně velké snížení zánětlivých ukazatelů a svalové bolesti, nejlépe od 2 g EPA + DHA denně po aspoň 6 týdnů." },
			{ source: "liao2019", area: "mood_stress", finding: "Metaanalýza 26 studií: zmírnění depresivních příznaků u přípravků s aspoň 60 % EPA." },
			{ source: "kelaiditis2023", area: "mood_stress", finding: "Metaanalýza 10 kontrolovaných studií (1 509 lidí): přípravky s převahou EPA v dávce pod 2 g denně snížily depresivní příznaky." },
			{ source: "lu2023", area: "mood_stress", finding: "Souhrn 22 metaanalýz: většina nachází účinek, hlavně u velké depresivní poruchy; EPA účinnější než DHA." },
		],
		agreement:
			"Zdroje se rozcházejí: starší konsenzus MOV je zdrženlivý, novější stanovisko ISSN příznivější. Jisté je jen to, že účinek, pokud je, není velký.",
		dosing:
			"Ve studiích nejčastěji kolem 1–3 g EPA + DHA denně po dobu několika týdnů. Tučné ryby dvakrát týdně (losos, makrela, sleď, sardinky) pokryjí běžnou potřebu.",
		forWhom: "Kdo nejí ryby vůbec nebo jen výjimečně; období těžkého tréninku s velkou svalovou bolestí.",
		risks:
			"Podle EFSA nevzbuzuje obavy doplňkový příjem EPA + DHA do 5 g denně. Při užívání léků na ředění krve se poraď s lékařem.",
		evidence: "consensus",
		defaults: { dose: 2, unit: "g", timing: "with_meal" },
		benefits: [
			{ area: "recovery", grade: "C", note: "svalová bolest a zánět; spíš od 2 g EPA + DHA denně aspoň 6 týdnů" },
			{ area: "mood_stress", grade: "B", note: "depresivní příznaky, přípravky s převahou EPA; nenahrazuje léčbu" },
		],
		safety: "ok",
	},
	{
		id: "magnesium",
		name: "Hořčík",
		aliases: ["magnezium", "magnesium"],
		summary:
			"Má smysl při nízkém příjmu ze stravy. U sportovců s dostatkem hořčíku svalovou výkonnost nezlepšuje a na křeče nejspíš nepomáhá.",
		studies: [
			{ source: "wang2017", finding: "Metaanalýza 14 studií: u sportovců a aktivních lidí s dobrou hladinou hořčíku žádný přínos pro svalovou zdatnost; pomoci může lidem s nedostatkem (senioři, alkoholici)." },
			{ source: "garrison2020", finding: "Přehled Cochrane: u starších dospělých hořčík křeče nejspíš nesnižuje; pro křeče při sportu neexistuje žádná randomizovaná studie." },
			{ source: "zhang2017", finding: "Přehled mechanismů: hořčík by mohl výkon ovlivnit přes dostupnost glukózy a odbourávání laktátu, ale opírá se hlavně o studie na zvířatech." },
			{ source: "efsaUl", finding: "EFSA: horní limit 250 mg denně z doplňků (vyšší dávky působí projímavě)." },
			{ source: "mah2021", area: "sleep", finding: "Metaanalýza u starších lidí s nespavostí: usínání kratší asi o 17 minut, kvalita důkazů nízká." },
			{ source: "boyle2017", area: "mood_stress", finding: "Systematický přehled: náznak příznivého účinku na subjektivní úzkost u ohrožených skupin; studie jsou nekvalitní." },
		],
		agreement:
			"Zdroje se shodují, že přínos je vidět jen při nedostatku. Teoretické mechanismy (Zhang 2017) se u dobře živených sportovců v metaanalýze nepotvrdily.",
		dosing:
			"Pokud ho bereš, drž se do 250 mg denně z doplňků. Hořčík je v ořeších, semínkách, luštěninách, celozrnném pečivu a listové zelenině.",
		forWhom: "Jednostranná strava, dlouhodobě nízký příjem energie, lékařem zjištěný nedostatek.",
		risks:
			"Horní limit 250 mg denně se týká jen hořčíku z doplňků (ne z jídla); vyšší dávky působí projímavě. Při onemocnění ledvin jen po domluvě s lékařem.",
		evidence: "research",
		defaults: { dose: 250, unit: "mg", timing: "evening" },
		benefits: [
			{ area: "performance", grade: "C", note: "jen při nedostatku; na svalové křeče nepomáhá" },
			{ area: "sleep", grade: "C", note: "starší lidé s nespavostí, nízká kvalita důkazů" },
			{ area: "mood_stress", grade: "C", note: "náznaky u úzkosti, slabé studie" },
		],
		safety: "ok",
		safetyNote: "Vyšší dávky působí projímavě. Při onemocnění ledvin jen po domluvě s lékařem.",
	},
	{
		id: "zinc",
		name: "Zinek",
		aliases: ["zinc", "zma"],
		summary:
			"U lidí bez nedostatku testosteron ani výsledky tréninku nezvyšuje. Zinkové pastilky nasazené hned na začátku nachlazení mohou zkrátit jeho trvání.",
		studies: [
			{ source: "wilborn2004", finding: "Studie na 42 trénovaných mužích: ZMA (zinek + hořčík + B6) nezměnil testosteron, růstový hormon, sílu ani složení těla." },
			{ source: "koehler2009", finding: "Studie na 14 mužích s dostatečným příjmem zinku: ZMA zvýšil zinek v krvi, ale testosteron ne." },
			{ source: "hemila2017zinc", finding: "Metaanalýza 7 studií (575 lidí): zinkové pastilky zkrátily nachlazení o 33 %; dávky nad 100 mg denně nebyly účinnější." },
			{ source: "maughan2018", finding: "Konsenzus MOV: pastilky fungují jen při nasazení do 24 hodin; prevence podložená není a vysoké dávky oslabují imunitu." },
			{ source: "efsaUl", finding: "EFSA: horní limit 25 mg denně ze všech zdrojů." },
			{ source: "nault2024", area: "immunity", finding: "Přehled Cochrane: na prevenci nachlazení má zinek malý nebo žádný vliv; probíhající nachlazení možná zkrátí (nízká jistota) za cenu častějších mírných nežádoucích účinků." },
			{ source: "science2012", area: "immunity", finding: "Metaanalýza kontrolovaných studií: zinek zkrátil trvání nachlazení u dospělých; výsledky studií se hodně liší a nežádoucí účinky byly časté." },
			{ source: "hunter2021", area: "immunity", finding: "Metaanalýza: zinek může zkrátit trvání respirační infekce zhruba o dva dny; jistota důkazů nízká." },
			{ source: "wang2020zinc", area: "immunity", finding: "Systematický přehled u zdravých dospělých: zinek zkrátil trvání nachlazení, na jeho závažnost vliv neměl." },
			{ source: "prasad2000", area: "immunity", finding: "Kontrolovaná studie: pastilky se zinkem (acetát) od začátku příznaků zkrátily nachlazení zhruba z 8 na 4,5 dne." },
		],
		agreement:
			"Zdroje se shodují: na testosteron bez nedostatku nefunguje (obě nezávislé studie), krátkodobě při nachlazení pomoci může.",
		dosing:
			"Dlouhodobě jen při zjištěném nedostatku. Při nachlazení krátkodobě pastilky se zinkem (ve studiích 75–90 mg denně, začít do 24 hodin od prvních příznaků, jen po dobu nachlazení).",
		forWhom: "Vegetariáni a vegani s nízkým příjmem zinku, lékařem zjištěný nedostatek.",
		risks:
			"Horní limit je 25 mg denně ze všech zdrojů. Vysoké dávky dlouhodobě oslabují imunitu a zhoršují vstřebávání mědi – krátkodobá kúra při nachlazení není důvod brát zinek trvale.",
		evidence: "research",
		defaults: { dose: 15, unit: "mg", timing: "with_meal" },
		benefits: [
			{ area: "immunity", grade: "B", note: "pastilky nasazené hned na začátku nachlazení ho mohou zkrátit; prevenci neovlivní" },
			{ area: "hormones", grade: "X", note: "testosteron při dostatku zinku nezvyšuje" },
		],
		safety: "caution",
		safetyNote: "Dlouhodobě vysoké dávky mohou vyvolat nedostatek mědi; častá je nevolnost a kovová pachuť.",
	},
	{
		id: "vitamin_a",
		name: "Vitamin A",
		aliases: ["retinol", "áčko"],
		summary: "Pro sportovní výkon nemá doplňování žádný prokázaný přínos a vyšší dávky škodí.",
		studies: [
			{ source: "lukaski2004", finding: "Přehled: nedostatek vitaminu A u sportovců doložený není (tělo má velké zásoby); doplňky u dobře živeného člověka působí nanejvýš jako placebo." },
			{ source: "thomas2016", finding: "Stanovisko ACSM: při pestré stravě s dostatkem energie nejsou vitaminové doplňky potřeba." },
			{ source: "bjelakovic2012", finding: "Přehled Cochrane (78 studií, téměř 300 000 lidí): antioxidační doplňky úmrtnost nesnižují; vyšší dávky vitaminu A byly spojené s vyšší úmrtností." },
			{ source: "efsaUl", finding: "EFSA: horní limit 3000 µg denně; nadbytek poškozuje játra a v těhotenství plod." },
		],
		agreement: "Zdroje se shodují: přínos žádný, při vyšších dávkách riziko.",
		dosing:
			"Bez lékařem zjištěného nedostatku ho samostatně nedoplňuj. Zdroje v jídle: játra, vejce, mléčné výrobky, mrkev a další barevná zelenina.",
		forWhom: "Jen při prokázaném nedostatku, po domluvě s lékařem.",
		risks:
			"Vitamin rozpustný v tucích – v těle se hromadí. Horní limit je 3000 µg denně; nadbytek poškozuje játra a v těhotenství může poškodit plod.",
		evidence: "consensus",
		defaults: { unit: "µg", timing: "with_meal" },
		benefits: [{ area: "performance", grade: "X", note: "bez nedostatku žádný přínos" }],
		safety: "caution",
		safetyNote: "Nadbytek poškozuje játra a v těhotenství plod – nepřekračuj horní limit.",
	},
	{
		id: "vitamin_b",
		name: "Vitaminy B",
		aliases: ["b-komplex", "b komplex", "b12", "b6", "vitamin b"],
		summary:
			"Při dostatečném příjmu další dávky výkon nezvyšují. Výjimkou je B12: ve veganské stravě chybí a je potřeba ho doplňovat.",
		studies: [
			{ source: "woolf2006", finding: "Přehled: cvičení může mírně zvýšit potřebu riboflavinu (B2) a B6; doplněk dává smysl hlavně při špatné stravě, nízkém příjmu energie nebo vyřazení skupin potravin." },
			{ source: "pawlak2013", finding: "Přehled 18 studií: nedostatek B12 je u vegetariánů častý a u veganů ještě častější." },
			{ source: "thomas2016", finding: "Stanovisko ACSM: při pestré stravě s dostatkem energie doplňky potřeba nejsou; vegetariáni mají riziko nízkého příjmu B12." },
			{ source: "efsaUl", finding: "EFSA: horní limit vitaminu B6 je 12 mg denně; vyšší dávky dlouhodobě poškozují nervy." },
			{ source: "markun2021", area: "cognition", finding: "Metaanalýza: u lidí bez nedostatku doplňování B12 nezlepšilo kognici, depresivní příznaky ani únavu." },
			{ source: "pawlak2014", finding: "Přehled: nedostatek B12 je u vegetariánů a veganů častý; podíl se mezi studiemi hodně liší." },
		],
		agreement: "Zdroje se shodují: doplňovat podle stravy, ne kvůli výkonu.",
		dosing:
			"B12 při veganské (a často i vegetariánské) stravě podle údajů na přípravku. B-komplex jen při jednostranné stravě nebo nízkém příjmu energie.",
		forWhom: "Vegani a vegetariáni (B12), dlouhodobě nízký příjem energie.",
		risks:
			"U vitaminu B6 je horní limit 12 mg denně – vyšší dávky dlouhodobě poškozují nervy (brnění a necitlivost končetin). Zkontroluj obsah B6 v B-komplexu a v předtréninkových směsích.",
		evidence: "consensus",
		defaults: { timing: "morning" },
		benefits: [
			{ area: "performance", grade: "X", note: "bez nedostatku žádný přínos" },
			{ area: "cognition", grade: "X", note: "B12 bez nedostatku paměť ani únavu nezlepšuje" },
		],
		safety: "ok",
		safetyNote:
			"Vegani a dlouhodobí vegetariáni B12 doplňovat potřebují – nedostatek je u nich častý. Vysoké dávky B6 dlouhodobě poškozují nervy.",
	},
	{
		id: "vitamin_c",
		name: "Vitamin C",
		aliases: ["céčko", "kyselina askorbová"],
		summary:
			"Běžné populaci výskyt nachlazení nesnižuje, jen ho mírně zkracuje. Pomáhá lidem v krátkodobé extrémní zátěži; vysoké dávky dlouhodobě naopak mohou tlumit přínos tréninku.",
		studies: [
			{ source: "hemila2013", finding: "Přehled Cochrane (29 srovnání, 11 306 lidí): výskyt nachlazení se v běžné populaci nezměnil; u maratonců, lyžařů a vojáků v extrémní zátěži klesl na polovinu. Trvání nachlazení kratší o 8 % u dospělých." },
			{ source: "paulsen2014", finding: "Kontrolovaná studie: 1000 mg vitaminu C + vitamin E denně ztlumily buněčnou adaptaci svalů na vytrvalostní trénink; výsledky výkonnostních testů se nelišily." },
			{ source: "ristow2009", finding: "Studie na 39 mužích: 1000 mg vitaminu C + 400 IU vitaminu E zabránily zlepšení citlivosti na inzulin, které jinak cvičení přináší." },
			{ source: "maughan2018", finding: "Konsenzus MOV: 0,25–1 g denně v období těžké zátěže může pomoci proti infekcím; vysoké dávky antioxidantů mohou tlumit adaptaci." },
			{ source: "peters1993", area: "immunity", finding: "Kontrolovaná studie u ultramaratonců: 600 mg denně tři týdny před závodem – příznaky infekce horních cest dýchacích po závodě u 33 % proti 68 % s placebem." },
			{ source: "constantini2011", area: "immunity", finding: "Kontrolovaná studie u dospívajících plavců: výskyt infekcí stejný; u chlapců kratší a mírnější průběh." },
			{ source: "carr2017", area: "immunity", finding: "Přehled: k prevenci stačí 100–200 mg denně ze stravy; léčba probíhající infekce by vyžadovala gramové dávky." },
		],
		agreement:
			"Zdroje se shodují v obou směrech: krátkodobě při extrémní zátěži ano, dlouhodobě ve vysokých dávkách ne. Obě studie o tlumení adaptace jsou malé.",
		dosing: "Před a během období velmi těžké zátěže 0,25–1 g denně. Nasadit ho až po začátku nachlazení nepomáhá.",
		forWhom: "Krátká období extrémní zátěže – závod, soustředění, výprava v zimě.",
		risks:
			"Vysoké dávky antioxidantů, hlavně vitaminu C spolu s E, mohou tlumit adaptaci na trénink – nebrat dlouhodobě „pro jistotu“. EFSA horní limit nestanovila; gramové dávky mohou dráždit zažívání.",
		evidence: "research",
		defaults: { dose: 500, unit: "mg", timing: "morning" },
		benefits: [
			{ area: "immunity", grade: "B", note: "jen při velké fyzické zátěži (maraton, náročný výcvik); jinak nachlazení nepředchází" },
			{ area: "performance", grade: "X", note: "vysoké dávky mohou tlumit adaptaci na trénink" },
		],
		safety: "ok",
	},
	{
		id: "vitamin_k",
		name: "Vitamin K",
		aliases: ["k2", "k1", "vitamin k2"],
		summary:
			"Pro sportovní výkon existuje jediná malá studie, kterou nikdo nezopakoval. Ani přínos pro kosti není u zdravých lidí spolehlivě prokázaný.",
		studies: [
			{ source: "mcfarlin2017", finding: "Jedna malá studie: po 8 týdnech vitaminu K2 o 12 % vyšší maximální srdeční výdej při zátěži. Výsledek zatím nikdo nezopakoval a výkon se neměřil." },
			{ source: "mott2019", finding: "Metaanalýza 36 studií (hlavně ženy po menopauze): méně zlomenin jen na hranici průkaznosti; po vyřazení méně kvalitních studií rozdíl v hustotě kostí mizí." },
			{ source: "thomas2016", finding: "Stanovisko ACSM: při pestré stravě s dostatkem energie nejsou vitaminové doplňky potřeba." },
			{ source: "efsaUl", finding: "EFSA: horní limit nestanoven – chybějí data, ne důkaz neškodnosti." },
			{ source: "knapen2013", area: "bones_joints", finding: "Kontrolovaná studie, 3 roky, ženy po menopauze: 180 µg vitaminu K2 (MK-7) denně zpomalilo úbytek kostní hustoty v bederní páteři a krčku stehenní kosti." },
			{ source: "li2023vitk", area: "cardio_metabolic", finding: "Metaanalýza 14 kontrolovaných studií: mírné zpomalení růstu kalciového skóre koronárních tepen, na hranici významnosti." },
		],
		agreement: "Zdroje se nerozcházejí, ale je jich málo: pro výkon jedna nezopakovaná studie, pro kosti nejisté výsledky.",
		dosing: "Bez důvodu ho samostatně nedoplňuj. Zdroje v jídle: listová zelenina (K1), kvašené potraviny a sýry (K2).",
		forWhom: "Jen na doporučení lékaře.",
		risks:
			"EFSA horní limit nestanovila. Pozor při užívání warfarinu a podobných léků na ředění krve – vitamin K mění jejich účinek.",
		evidence: "research",
		defaults: { unit: "µg", timing: "with_meal" },
		benefits: [
			{ area: "bones_joints", grade: "C", note: "pomalejší úbytek kostní hmoty u žen po menopauze; u mladých sportovců data chybí" },
			{ area: "cardio_metabolic", grade: "C", note: "kalcifikace cév – nejisté" },
		],
		safety: "risk",
		safetyNote: "Při léčbě warfarinem nebo jinými léky na ředění krve jen se souhlasem lékaře – vitamin K jejich účinek ruší.",
	},
	{
		id: "multivitamin",
		name: "Multivitamin",
		aliases: ["multivitamín", "vitaminy a minerály"],
		summary:
			"Sportovec, který jí pestře a má dostatek energie, ho nepotřebuje. Smysl má při omezené stravě; nemocem nepředchází.",
		studies: [
			{ source: "thomas2016", finding: "Stanovisko ACSM: při pestré stravě s dostatkem energie nejsou vitaminové a minerální doplňky potřeba." },
			{ source: "woolf2006", finding: "Přehled: sportovci se špatnou stravou, s omezeným příjmem energie nebo vyřazenými skupinami potravin by multivitamin měli zvážit." },
			{ source: "uspstf2022", finding: "Doporučení USPSTF: u zdravých dospělých nejsou dostatečné důkazy, že multivitamin předchází srdečním chorobám nebo rakovině; přínos je malý nebo žádný." },
			{ source: "efsaUl", finding: "EFSA: vitaminy A, D, E, B6 a zinek mají horní limity – dávky z více doplňků se sčítají." },
			{ source: "oconnor2022", area: "cardio_metabolic", finding: "Systematický přehled pro USPSTF: doplňky vitaminů a minerálů přinášejí malý nebo žádný přínos v prevenci rakoviny, srdečních onemocnění a úmrtí." },
			{ source: "sesso2022", area: "cardio_metabolic", finding: "Velká kontrolovaná studie COSMOS: multivitamin nesnížil výskyt rakoviny, kardiovaskulárních onemocnění ani úmrtnost." },
			{ source: "yeung2023", area: "cognition", finding: "Kontrolovaná studie (asi 3 500 lidí nad 60 let): mírně lepší paměť po roce užívání." },
			{ source: "grodstein2013", area: "cognition", finding: "Dlouhodobá kontrolovaná studie u mužů lékařů: multivitamin kognitivní funkce neovlivnil." },
		],
		agreement: "Zdroje se shodují: pojistka při omezené stravě ano, zlepšení výkonu nebo zdraví u dobře živeného člověka ne.",
		dosing: "Pokud ho bereš, stačí přípravek s dávkami kolem doporučených denních hodnot – ne „megadávky“.",
		forWhom: "Hubnutí s nízkým příjmem energie, vyřazení celých skupin potravin, cestování s omezeným výběrem jídla.",
		risks: "Sečti si dávky se svými dalšími doplňky – hlavně vitaminy A, D, E, B6 a zinek mají horní limity.",
		evidence: "consensus",
		defaults: { dose: 1, unit: "tableta", timing: "morning" },
		benefits: [
			{ area: "cardio_metabolic", grade: "X", note: "nesnižuje riziko srdečních onemocnění ani rakoviny" },
			{ area: "cognition", grade: "C", note: "mírně lepší paměť u starších lidí" },
		],
		safety: "ok",
	},
	{
		id: "eaa",
		name: "EAA",
		aliases: ["esenciální aminokyseliny", "essential amino acids"],
		summary:
			"Všech devět esenciálních aminokyselin spouští tvorbu svalových bílkovin stejně jako kvalitní bílkovina. Když máš bílkovin dost z jídla nebo proteinu, navíc nic nepřidají.",
		studies: [
			{ source: "ferrando2023", finding: "Stanovisko ISSN: volné EAA spouštějí tvorbu svalových bílkovin už od 1,5–3 g, účinek se vyrovná kolem 15–18 g; největší přínos mají lidé, kteří na bílkoviny reagují hůř (senioři, nemoc, nízký příjem)." },
			{ source: "wolfe2017", finding: "Přehled: pro tvorbu svalových bílkovin je potřeba všech devět esenciálních aminokyselin, samotné tři (BCAA) nestačí." },
			{ source: "morton2018", finding: "Metaanalýza 49 studií: rozhoduje celkový denní příjem bílkovin; nad asi 1,6 g/kg denně už další doplňování přírůstky nezvyšuje." },
			{ source: "volpi2003", finding: "Kontrolovaná studie u starších lidí: samotné esenciální aminokyseliny povzbudily tvorbu svalových bílkovin stejně jako směs všech aminokyselin." },
			{ source: "church2020", finding: "Přehled: reakci svalu určuje obsah esenciálních aminokyselin; volné EAA se vstřebají rychle a účinkují i v malé dávce." },
			{ source: "ispoglou2021", finding: "Přehled u starších lidí: EAA nezasytí, takže se dají přidat k jídlu s nízkým obsahem bílkovin." },
		],
		agreement:
			"Zdroje se shodují, že EAA fungují jako bílkovina. Že by byly lepší než dostatek bílkovin z jídla, dlouhodobé studie neukazují.",
		dosing: "6–15 g kolem tréninku nebo k jídlu chudému na bílkoviny. Počítej je do celkového denního příjmu bílkovin.",
		forWhom:
			"Trénink nalačno, hubnutí s nízkým příjmem energie, veganská strava, starší sportovci, kdo špatně snáší proteinové nápoje.",
		risks:
			"Při běžných dávkách bez známých rizik. Jsou dražší než protein se stejným účinkem. Při onemocnění ledvin nebo jater se poraď s lékařem.",
		evidence: "consensus",
		defaults: { dose: 10, unit: "g", timing: "pre_workout", trainingDaysOnly: true },
		benefits: [{ area: "body", grade: "B", note: "jako plnohodnotná bílkovina; hlavně vegani, starší lidé, nízký příjem bílkovin" }],
		safety: "ok",
	},
	{
		id: "citrulline",
		name: "Citrulin malát",
		aliases: ["citrulin", "citrulline", "citrulline malate", "l-citrulin", "citrulin malat"],
		summary:
			"V silovém tréninku přidá v průměru pár opakování navíc (asi 6 %). Účinek je malý, studie se liší a kvalita přípravků kolísá.",
		studies: [
			{ source: "trexler2019", finding: "Metaanalýza 12 studií (198 lidí): malý, ale průkazný přínos pro silový a výbušný výkon (velikost účinku 0,20)." },
			{ source: "varvik2021", finding: "Metaanalýza 8 studií (137 lidí): 8 g citrulin malátu 40–60 minut před tréninkem přidalo v průměru asi 3 opakování za trénink, tedy o 6,4 % víc než placebo." },
			{ source: "gough2021", finding: "Kritický přehled: účinnost zůstává nejednoznačná – studie se liší dávkou i načasováním a u některých výrobků neodpovídal skutečný poměr citrulinu a malátu údaji na obalu." },
			{ source: "gonzalez2020", finding: "Přehled: mírné zlepšení silové vytrvalosti je možné, výsledky studií ale nejsou jednotné." },
			{ source: "rhim2020", area: "recovery", finding: "Metaanalýza: nižší vnímaná námaha a menší bolest svalů 24 a 48 hodin po zátěži; laktát beze změny." },
		],
		agreement:
			"Zdroje se shodují, že pokud účinek je, je malý. Rozcházejí se v tom, jak moc se na něj dá spolehnout: metaanalýzy ho nacházejí, kritický přehled ho má za nejistý.",
		dosing: "8 g citrulin malátu 40–60 minut před tréninkem (odpovídá zhruba 4–5 g samotného citrulinu).",
		forWhom: "Silový trénink s více sériemi do vyčerpání. U vytrvalosti účinek doložený není.",
		risks: "Občas zažívací potíže. Při užívání léků na tlak nebo na erekci se poraď s lékařem (citrulin rozšiřuje cévy).",
		evidence: "research",
		defaults: { dose: 8, unit: "g", timing: "pre_workout", trainingDaysOnly: true },
		benefits: [
			{ area: "performance", grade: "C", note: "malý účinek na počet opakování" },
			{ area: "recovery", grade: "C", note: "mírně menší námaha a bolest svalů" },
		],
		safety: "ok",
	},
	// ---------- Nepodložené ----------
	{
		id: "bcaa",
		name: "BCAA",
		aliases: ["větvené aminokyseliny", "leucin isoleucin valin", "branched-chain amino acids"],
		summary:
			"Při dostatku bílkovin růst svalů ani sílu nezvyšují. Mohou mírně zmenšit svalovou bolest po tréninku, hlavně u začátečníků.",
		studies: [
			{ source: "wolfe2017", finding: "Přehled: tvrzení, že samotné BCAA zvyšují tvorbu svalových bílkovin, není oprávněné – bez ostatních esenciálních aminokyselin nemá sval z čeho stavět." },
			{ source: "jackman2017", finding: "Studie na 10 mužích: 5,6 g BCAA po tréninku zvýšilo tvorbu svalových bílkovin o 22 % oproti placebu – to je asi polovina toho, co udělá dávka syrovátkové bílkoviny." },
			{ source: "plotkin2021", finding: "Přehled: při dostatečném příjmu energie a bílkovin mají BCAA malý nebo žádný přínos pro svalovou hmotu; při hubnutí možná pomáhají omezit ztrátu svalů." },
			{ source: "fedewa2019", finding: "Metaanalýza 8 studií: BCAA snížily svalovou bolest po cvičení; většina účastníků byla netrénovaná." },
			{ source: "rahimi2017", area: "recovery", finding: "Metaanalýza kontrolovaných studií: BCAA snížily ukazatel svalového poškození (kreatinkinázu) a mírně bolest po zátěži." },
			{ source: "martinho2022", finding: "Systematický přehled 24 studií u sportovců: zanedbatelný vliv na výkon a složení těla; většina studií neuváděla celkový příjem bílkovin." },
		],
		agreement:
			"Zdroje se shodují, že pro růst svalů jsou BCAA slabší než úplná bílkovina. Jediný doložený přínos je menší svalová bolest, a to z malých studií.",
		dosing:
			"Dávka s prokázaným přínosem pro svaly neexistuje. Studie svalové bolesti používaly různé dávky a nedá se z nich vyvodit jedna doporučená. Stejné aminokyseliny dostaneš z proteinu nebo běžného jídla.",
		forWhom:
			"Kdo má bílkovin dost, ten je nepotřebuje. Smysl mohou mít při tréninku nalačno nebo při přísném hubnutí – tam ale lépe poslouží EAA nebo protein.",
		risks: "Při běžných dávkách bez známých rizik; hlavní nevýhoda je cena za malý účinek.",
		evidence: "research",
		defaults: { dose: 5, unit: "g", timing: "pre_workout", trainingDaysOnly: true },
		benefits: [
			{ area: "body", grade: "X", note: "při dostatku bílkovin nic nepřidají" },
			{ area: "performance", grade: "X" },
			{ area: "recovery", grade: "C", note: "mírně menší svalová bolest" },
		],
		safety: "ok",
	},
	{
		id: "glutamine",
		name: "Glutamin",
		aliases: ["l-glutamin", "glutamine"],
		summary:
			"U zdravých sportovců nezlepšuje výkon, složení těla ani imunitu. Tělo si ho vyrábí samo a v jídle s bílkovinami ho je dost.",
		studies: [
			{ source: "ramezani2019", finding: "Metaanalýza klinických studií: žádný vliv na imunitu sportovců, vytrvalostní výkon ani složení těla." },
			{ source: "candow2001", finding: "Kontrolovaná studie, 6 týdnů silového tréninku: síla i svalová hmota rostly stejně s glutaminem jako s placebem." },
			{ source: "gleeson2008", finding: "Přehled: jednorázové dávky 20–30 g zdraví dospělí snášejí bez potíží; přínos pro výkon nebo imunitu sportovců doložený není." },
			{ source: "maughan2018", finding: "Konsenzus MOV: pro podporu imunity u sportovců má glutamin jen omezené důkazy." },
			{ source: "legault2015", area: "recovery", finding: "Malá kontrolovaná studie: rychlejší návrat síly a menší bolest po excentrické zátěži kolene." },
			{ source: "street2011", area: "recovery", finding: "Malá kontrolovaná studie (15 lidí): 0,3 g/kg po zátěži – menší ztráta síly a menší bolest." },
		],
		agreement: "Zdroje se shodují: bezpečný, ale u zdravých sportovců bez prokázaného přínosu.",
		dosing: "Dávka s prokázaným účinkem na výkon neexistuje. Výrobci obvykle uvádějí 5–10 g denně.",
		forWhom:
			"Podle dostupných důkazů nemá pro sportovní výkon smysl. Využití v nemocniční výživě je jiná věc a patří lékaři.",
		risks: "Při běžných dávkách dobře snášený. Při onemocnění jater nebo ledvin se poraď s lékařem.",
		evidence: "research",
		defaults: { dose: 5, unit: "g", timing: "post_workout" },
		benefits: [
			{ area: "performance", grade: "X" },
			{ area: "immunity", grade: "X" },
			{ area: "recovery", grade: "C", note: "pár malých studií po excentrické zátěži" },
		],
		safety: "ok",
	},
	{
		id: "vitamin_e",
		name: "Vitamin E",
		aliases: ["tokoferol", "éčko"],
		summary:
			"Výkon nezlepšuje. Ve vysokých dávkách (spolu s vitaminem C) tlumil přínos tréninku a v běžné populaci byl spojený s vyšší úmrtností.",
		studies: [
			{ source: "paulsen2014", finding: "Kontrolovaná studie: vitamin E + C ztlumily buněčnou adaptaci svalů na vytrvalostní trénink." },
			{ source: "ristow2009", finding: "Studie na 39 mužích: 400 IU vitaminu E + 1000 mg vitaminu C zabránily zlepšení citlivosti na inzulin po cvičení." },
			{ source: "bjelakovic2012", finding: "Přehled Cochrane (78 studií): doplňky vitaminu E úmrtnost mírně, ale průkazně zvyšovaly." },
			{ source: "maughan2018", finding: "Konsenzus MOV: vysoké dávky jednotlivých antioxidantů mohou tlumit adaptaci na trénink." },
			{ source: "efsaUl", finding: "EFSA: horní limit 300 mg denně." },
		],
		agreement: "Zdroje se shodují: žádný přínos, možná škoda.",
		dosing: "Sportovcům se doplňování nedoporučuje. Zdroje v jídle: rostlinné oleje, ořechy, semínka.",
		forWhom: "Jen při lékařem zjištěném nedostatku.",
		risks: "Horní limit je 300 mg denně. Při užívání léků na ředění krve jen po domluvě s lékařem.",
		evidence: "research",
		defaults: { unit: "mg", timing: "with_meal" },
		benefits: [{ area: "performance", grade: "X", note: "vysoké dávky mohou tlumit adaptaci na trénink" }],
		safety: "caution",
		safetyNote: "Vysoké dávky dlouhodobě mohou zvyšovat krvácivost; opatrně při lécích na ředění krve.",
	},
	{
		id: "ashwagandha",
		name: "Ashwagandha",
		aliases: ["ašvaganda", "withania somnifera", "vitánie snodárná", "ashwaganda"],
		summary:
			"Studie ukazují zlepšení síly, ale jsou malé, krátké a často s extraktem od výrobce. Proti tomu stojí popsané případy poškození jater. Slibné, zatím ne spolehlivé.",
		studies: [
			{ source: "bonilla2021", finding: "Metaanalýza 13 studií (615 lidí): střední pozitivní účinek na sílu a výkon (d = 0,68); studie jsou malé a používají různé extrakty a dávky." },
			{ source: "wankhede2015", finding: "Studie na 50 netrénovaných mužích, 8 týdnů, 600 mg denně: bench press +46 kg oproti +26 kg u placeba, vyšší nárůst testosteronu. Extrakt dodal výrobce." },
			{ source: "bjornsson2020", finding: "Série případů z Islandu a USA: poškození jater se žloutenkou po ashwagandze; po vysazení se upravilo." },
			{ source: "livertoxAshwagandha", finding: "Databáze NIH: ashwagandha je pravděpodobnou příčinou poškození jater, obvykle 2–12 týdnů po začátku užívání; popsány jsou i smrtelné případy u lidí s nemocnými játry." },
			{ source: "akhgarjand2022", area: "mood_stress", finding: "Metaanalýza 12 kontrolovaných studií: snížení úzkosti a stresu; jistota důkazů nízká." },
			{ source: "albalawi2025", area: "mood_stress", finding: "Metaanalýza: kortizol klesá, ale vnímaný stres se proti placebu významně nezměnil." },
			{ source: "cheah2021", area: "sleep", finding: "Metaanalýza 5 kontrolovaných studií (400 lidí): malé zlepšení spánku, víc u nespavosti, od 600 mg denně po aspoň 8 týdnů." },
		],
		agreement:
			"Zdroje se rozcházejí v celkovém obrazu: studie účinku jsou příznivé, ale slabé kvality; zprávy o bezpečnosti varují. Dlouhodobá nezávislá data chybějí.",
		dosing:
			"Ve studiích obvykle 300–600 mg extraktu z kořene denně po dobu 8–12 týdnů. Ověřené doporučené dávkování neexistuje.",
		forWhom: "Nepatří mezi základní doplňky. Pokud ji chceš zkusit, ber ji jako pokus s nejistým výsledkem.",
		risks:
			"Jsou popsané případy poškození jater, obvykle 2–12 týdnů po začátku užívání (žloutenka, svědění). Nebrat při onemocnění jater, v těhotenství a při kojení; při onemocnění štítné žlázy nebo užívání léků jen po domluvě s lékařem. Při zežloutnutí kůže, tmavé moči nebo svědění ihned vysadit a jít k lékaři.",
		evidence: "research",
		defaults: { dose: 600, unit: "mg", timing: "evening" },
		benefits: [
			{ area: "mood_stress", grade: "B", note: "stres a úzkost; výsledky nejednotné, jistota důkazů nízká" },
			{ area: "sleep", grade: "C", note: "malý účinek, spíš při nespavosti" },
			{ area: "performance", grade: "C", note: "málo studií nízké kvality" },
		],
		safety: "caution",
		safetyNote: "Vzácně hlášeno poškození jater. Nevhodná v těhotenství a při onemocnění štítné žlázy.",
	},
	{
		id: "tribulus",
		name: "Tribulus terrestris",
		aliases: ["tribulus", "kotvičník", "kotvičník zemní"],
		summary:
			"Testosteron u lidí nezvyšuje a zlepšení síly, svalové hmoty ani výkonu se v kontrolovaných studiích neprokázalo.",
		studies: [
			{ source: "qureshi2014", finding: "Systematický přehled: tribulus hladinu testosteronu u lidí nezvyšuje." },
			{ source: "rogerson2007", finding: "Studie na 22 elitních ragbistech, 5 týdnů, 450 mg denně: síla i svalová hmota rostly stejně jako u placeba; poměr testosteronu v moči se nezměnil." },
			{ source: "fernandezLazaro2022", finding: "Systematický přehled u aktivních mužů: žádný jasný důkaz účinku na hormony ani na ukazatele svalového poškození." },
			{ source: "morgado2024", area: "hormones", finding: "Systematický přehled „boosterů testosteronu“: většina prodávaných přípravků nemá pro svá tvrzení podklad." },
			{ source: "pokrywka2014", finding: "Přehled: testosteron ani výkon nezvyšuje; u těchto doplňků hrozí kontaminace." },
		],
		agreement: "Zdroje se shodují: slibovaný účinek se nepotvrdil.",
		dosing: "Žádná dávka s prokázaným účinkem neexistuje.",
		forWhom: "Podle dostupných důkazů nemá pro sportovní výkon smysl.",
		risks:
			"Doplňky prodávané jako „podpora testosteronu“ patří mezi rizikové z hlediska kontaminace zakázanými látkami – pozor, pokud podléháš dopingovým kontrolám.",
		evidence: "research",
		defaults: { timing: "any" },
		benefits: [
			{ area: "performance", grade: "X" },
			{ area: "hormones", grade: "X", note: "testosteron nezvyšuje" },
		],
		safety: "ok",
		safetyNote: "Doplňky na „podporu testosteronu“ bývají kontaminované zakázanými látkami.",
	},
	{
		id: "maca",
		name: "Maca",
		aliases: ["maka", "lepidium meyenii", "řeřicha peruánská"],
		summary:
			"Jen omezené důkazy pro sexuální funkce a kvalitu spermatu z malých studií. Pro sportovní výkon existuje jediná pilotní studie, která rozdíl proti placebu nenašla.",
		studies: [
			{ source: "shin2010", finding: "Systematický přehled: omezené důkazy pro zlepšení sexuálních funkcí; studií je málo a jsou malé, pevný závěr nejde udělat." },
			{ source: "stone2009", funded: true, finding: "Pilotní studie na 8 cyklistech, 14 dní: čas na 40 km se zlepšil oproti výchozímu testu, ale ne oproti placebu; chuť na sex stoupla i oproti placebu." },
			{ source: "lee2016", finding: "Systematický přehled (3 kontrolované a 2 nekontrolované studie): náznak zlepšení kvality spermatu, důkazy slabé." },
			{ source: "shin2023", area: "hormones", finding: "Kontrolovaná studie u mužů s příznaky nízkého testosteronu: lepší skóre příznaků a erekce než placebo." },
			{ source: "lee2023", area: "hormones", finding: "Metaanalýza: mírný přínos u lehké poruchy erekce; důkazy omezené." },
		],
		agreement: "Zdroje se shodují, že důkazů je málo: náznaky u sexuálních funkcí, žádný průkaz u výkonu.",
		dosing: "Ve studiích 1,5–3,5 g denně. Dávka s prokázaným účinkem na výkon neexistuje.",
		forWhom: "Podle dostupných důkazů nemá pro sportovní výkon smysl.",
		risks: "Bezpečnost dlouhodobého užívání je málo prozkoumaná.",
		evidence: "research",
		defaults: { timing: "morning" },
		benefits: [
			{ area: "hormones", grade: "C", note: "libido a erekce; testosteron nemění" },
			{ area: "performance", grade: "X", note: "jediná malá studie placená dodavatelem extraktu" },
		],
		safety: "ok",
	},
];
