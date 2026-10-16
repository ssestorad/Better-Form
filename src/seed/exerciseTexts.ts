// Texty k předplněné knihovně cviků: popis, provedení a časté chyby.
// Obecné, běžně přijímané zásady – úroveň „praxe“, ne náhrada trenéra.
// Klíč = název cviku v knihovně (src/seed/exercises.ts).

import { MORE_EXERCISES } from "./exercisesMore";

export interface ExerciseText {
	/** Co cvik je a k čemu slouží. */
	about: string;
	/** Provedení krok za krokem. */
	how: string[];
	/** Časté chyby. */
	mistakes: string[];
}

const text = (about: string, how: string[], mistakes: string[]): ExerciseText => ({ about, how, mistakes });

const BASE_TEXTS: Record<string, ExerciseText> = {
	// ---------- Posilovna ----------
	"Bench press": text(
		"Základní tlakový cvik na horní polovinu těla. Zatěžuje hlavně prsní svaly, pomáhají tricepsy a přední část ramen.",
		[
			"Lopatky stáhni k sobě a dolů, chodidla pevně na zemi.",
			"Činku spouštěj kontrolovaně na spodní část hrudníku, lokty zhruba 45–70° od těla.",
			"Vytlač nahoru nad ramena, zápěstí drž rovně nad lokty.",
			"Těžké série cvič s dopomocí nebo v bezpečnostních zarážkách.",
		],
		["Odrážení činky od hrudníku.", "Lokty v pravém úhlu od těla – zbytečně zatěžuje ramena.", "Zvedání hýždí z lavice."],
	),
	"Tlak na šikmé lavici": text(
		"Tlak na lavici se zvednutým opěradlem. Víc zapojí horní část prsních svalů a ramena.",
		[
			"Opěradlo lavice nastav zhruba na 30–45°.",
			"Lopatky stažené, činku spouštěj na horní část hrudníku.",
			"Tlač nahoru nad ramena, bedra se neodlepují od lavice.",
		],
		["Příliš strmé opěradlo – z cviku se stane tlak na ramena.", "Prohýbání beder ve snaze zvednout víc."],
	),
	"Tlak s jednoručkami na lavici": text(
		"Varianta bench pressu s jednoručkami. Každá paže pracuje zvlášť, což pomáhá vyrovnat rozdíly mezi stranami a dovolí větší rozsah pohybu.",
		[
			"Jednoručky začínají nad hrudníkem, lopatky stažené.",
			"Spouštěj je do stran hrudníku, lokty mírně k tělu.",
			"Tlač nahoru, nahoře jednoručky o sebe nenarážej.",
		],
		["Příliš hluboké spouštění, které táhne v ramenou.", "Nestabilní zápěstí – jednoručka se kývá."],
	),
	"Rozpažování s jednoručkami": text(
		"Izolovaný cvik na prsní svaly v protažení. Cvičí se s lehčí váhou a kontrolovaně.",
		[
			"Lokty lehce pokrčené, úhel v nich se během pohybu nemění.",
			"Spouštěj do stran jen tak hluboko, dokud cítíš protažení prsou bez bolesti v ramenou.",
			"Obloukem se vrať nad hrudník.",
		],
		["Příliš těžká váha – pohyb se změní v tlak.", "Propnuté lokty a příliš hluboké spouštění."],
	),
	"Tlak nad hlavu": text(
		"Základní tlak ve stoje na ramena. Zapojuje i tricepsy a střed těla, který musí držet trup zpevněný.",
		[
			"Stoj na šíři ramen, zpevni střed těla a hýždě.",
			"Činku tlač svisle nahoru těsně kolem obličeje, nahoře hlavu lehce vsuň pod činku.",
			"Neprohýbej bedra – pokud musíš, sniž váhu.",
		],
		["Záklon a prohnutí beder.", "Tlačení činky dopředu místo nahoru.", "Dopomáhání nohama (pak jde o jiný cvik)."],
	),
	"Tlak s jednoručkami vsedě": text(
		"Tlak na ramena vsedě s oporou zad. Šetrnější k bedrům než tlak ve stoje.",
		["Záda opřená o opěradlo, jednoručky ve výši ramen.", "Tlač nahoru, lokty mírně před tělem.", "Kontrolovaně spouštěj zpět k ramenům."],
		["Odlepování beder od opěradla.", "Zkrácený pohyb – jednoručky nejdou dolů k ramenům."],
	),
	Upažování: text(
		"Izolovaný cvik na střední část deltových svalů, která dává ramenům šířku.",
		["Lokty mírně pokrčené, trup v klidu.", "Zvedej paže do stran do výše ramen, pohyb vede loket.", "Bez švihu, dolů pomalu."],
		["Švih celým tělem.", "Zvedání ramen k uším – přebírají trapézy.", "Příliš těžké jednoručky."],
	),
	"Face pull": text(
		"Přítah lana k obličeji. Posiluje zadní část ramen a svaly mezi lopatkami, pomáhá držení těla.",
		[
			"Kladka ve výši obličeje, lano v obou rukou.",
			"Přitahuj k obličeji, lokty vysoko a do stran, na konci vytoč ruce ven.",
			"Lopatky stáhni k sobě, trup se nekýve.",
		],
		["Příliš těžká váha a zaklánění.", "Lokty padají dolů – cvik se změní v přítah."],
	),
	"Dřep s činkou": text(
		"Základní cvik na dolní polovinu těla. Zatěžuje stehna a hýždě, střed těla drží trup.",
		[
			"Činka na horní části trapézů, chodidla zhruba na šíři ramen, špičky mírně ven.",
			"Nádech, zpevni střed těla a jdi dolů, kolena míří ve směru špiček.",
			"Hloubka jen taková, kterou zvládneš s neutrální páteří a patami na zemi.",
			"Vstávej tlakem přes celé chodidlo, hrudník nahoře.",
		],
		["Kolena padající dovnitř.", "Zvedání pat.", "Kulacení beder v dolní poloze.", "Předklon – „dobré ráno“ místo dřepu."],
	),
	"Přední dřep": text(
		"Dřep s činkou vpředu na ramenou. Víc zatíží přední stranu stehen a vyžaduje vzpřímený trup.",
		["Činka vpředu na ramenou, lokty vysoko.", "Trup zůstává vzpřímenější než u klasického dřepu.", "Když lokty padají dolů, sniž váhu."],
		["Padající lokty a kulacení horní části zad.", "Držení činky jen rukama místo na ramenou."],
	),
	"Mrtvý tah": text(
		"Zvednutí činky ze země do stoje. Zapojuje zadní stranu těla – hýždě, zadní stranu stehen a vzpřimovače zad.",
		[
			"Činka nad středem chodidla, úchop těsně vně kolen.",
			"Záda neutrální, hrudník nahoru, před tahem zpevni záda i břicho.",
			"Tlač nohama do země, činka jede těsně u nohou, kyčle a ramena stoupají současně.",
			"Nahoře se jen napřim, bez záklonu.",
		],
		["Kulatá záda.", "Činka daleko od těla.", "Trhnutí ze země.", "Záklon v horní poloze."],
	),
	"Rumunský mrtvý tah": text(
		"Mrtvý tah s téměř propnutými koleny shora dolů. Zaměřuje se na zadní stranu stehen a hýždě v protažení.",
		[
			"Začni ve stoje s činkou, kolena mírně pokrčená.",
			"Posílej kyčle dozadu, činka klouže po stehnech, záda zůstávají neutrální.",
			"Jdi dolů, dokud cítíš tah v zadní straně stehen, pak se vrať tlakem kyčlí vpřed.",
		],
		["Kulacení zad ve snaze dostat činku níž.", "Pokrčování kolen – z cviku se stává dřep."],
	),
	Výpady: text(
		"Jednostranný cvik na stehna a hýždě. Zlepšuje i rovnováhu a vyrovnává rozdíly mezi nohama.",
		[
			"Udělej krok vpřed a pokrč obě kolena zhruba do pravého úhlu.",
			"Přední koleno míří ve směru špičky, trup vzpřímený.",
			"Odraž se přední nohou zpět do stoje.",
		],
		["Příliš krátký krok.", "Přední koleno padá dovnitř.", "Předklon trupu."],
	),
	"Bulharský dřep": text(
		"Dřep na jedné noze se zadní nohou na lavici. Náročný cvik na stehna, hýždě a stabilitu.",
		[
			"Zadní noha nártem na lavici, přední chodidlo dost daleko vpředu.",
			"Klesej dolů, přední koleno míří ve směru špičky.",
			"Vstávej tlakem přes celé přední chodidlo.",
		],
		["Přední noha příliš blízko lavice.", "Odrážení se zadní nohou."],
	),
	"Leg press": text(
		"Tlak nohama na stroji. Umožní zatížit stehna a hýždě bez nároků na stabilitu trupu.",
		[
			"Chodidla na šíři ramen uprostřed plošiny.",
			"Spouštěj jen tak hluboko, dokud se bedra neodlepují od opěradla.",
			"Tlač přes celé chodidlo, kolena nahoře prudce nezamykej.",
		],
		["Odlepení pánve a beder od opěradla.", "Prudké zamykání kolen.", "Kolena padající dovnitř."],
	),
	Předkopávání: text(
		"Izolovaný cvik na přední stranu stehen na stroji.",
		["Osa stroje v úrovni kolena, opěrka těsně nad kotníky.", "Plynule propni kolena, nahoře krátce podrž.", "Pomalu zpět, bez švihu."],
		["Švih a odlepování hýždí ze sedačky.", "Příliš těžká váha s trhavým pohybem."],
	),
	Zakopávání: text(
		"Izolovaný cvik na zadní stranu stehen na stroji.",
		["Osa stroje v úrovni kolena, opěrka nad patami.", "Přitahuj paty k hýždím, pánev zůstává na lavici.", "Pomalu zpět."],
		["Zvedání pánve z lavice.", "Poloviční rozsah pohybu."],
	),
	"Hip thrust": text(
		"Zvedání pánve s činkou s oporou o lavici. Jeden z nejúčinnějších cviků na hýždě.",
		[
			"Lopatky opřené o lavici, činka přes pánev (s podložkou).",
			"Chodidla umísti tak, aby byly holeně v horní poloze svislé.",
			"Zvedej pánev tlakem přes paty, nahoře stáhni hýždě bez prohnutí beder.",
		],
		["Prohýbání beder místo propnutí kyčlí.", "Chodidla příliš daleko nebo blízko.", "Záklon hlavy."],
	),
	"Výpony na lýtka": text(
		"Výpony na špičky ve stoje. Posilují lýtkové svaly.",
		["Přední část chodidel na vyvýšení, paty volně.", "Spusť paty do protažení, pak se vytáhni co nejvýš na špičky.", "Nahoře krátce podrž, bez houpání."],
		["Krátký, houpavý pohyb.", "Pokrčování kolen."],
	),
	"Přítahy v předklonu": text(
		"Přítah činky k trupu v předklonu. Základní cvik na šířku a sílu zad.",
		[
			"Předklon zhruba 45°, kolena mírně pokrčená, záda neutrální.",
			"Přitahuj činku ke spodní části hrudníku, lokty vedou dozadu.",
			"Trup se při přítahu nezvedá.",
		],
		["Kulatá záda.", "Švih trupem.", "Přitahování jen rukama bez stažení lopatek."],
	),
	"Přítahy jednoručky": text(
		"Jednostranný přítah s oporou o lavici. Dovolí velký rozsah pohybu a šetří bedra.",
		["Jedna ruka a koleno opřené o lavici, záda rovně.", "Přitahuj jednoručku k boku, loket podél těla.", "Bez rotace trupu, dolů pomalu."],
		["Rotace trupu a švih.", "Tah ramenem k uchu."],
	),
	"Stahování kladky": text(
		"Stahování horní kladky k hrudníku. Posiluje široký sval zádový, dobrá příprava na shyby.",
		[
			"Úchop o něco širší než ramena, stehna zapřená pod opěrkou.",
			"Stáhni lopatky dolů a přitahuj tyč k horní části hrudníku.",
			"Bez záklonu a švihu trupem.",
		],
		["Stahování za hlavu.", "Velký záklon a švih.", "Ramena u uší."],
	),
	"Přítahy kladky vsedě": text(
		"Přítah spodní kladky k břichu. Posiluje střed zad a široký sval zádový.",
		["Sed s mírně pokrčenými koleny, záda rovně.", "Přitahuj rukojeť k břichu, lopatky k sobě.", "Trup se nekýve dopředu a dozadu."],
		["Kývání trupem.", "Kulacení zad při návratu."],
	),
	"Krčení ramen": text(
		"Zvedání ramen se zátěží. Posiluje horní část trapézů.",
		["Činku nebo jednoručky drž podél těla, paže propnuté.", "Zvedej ramena přímo nahoru k uším, nahoře podrž.", "Rameny nekruž."],
		["Kroužení rameny.", "Pokrčování loktů."],
	),
	"Bicepsový zdvih": text(
		"Zdvih činky nebo jednoruček ohybem v lokti. Základní cvik na biceps.",
		["Lokty u těla, zápěstí rovně.", "Zvedej pohybem jen v loktech, bez švihu trupem.", "Pomalu spouštěj až do propnutí."],
		["Švih trupem.", "Lokty jdou dopředu.", "Poloviční rozsah."],
	),
	"Kladivový zdvih": text(
		"Zdvih jednoruček s palci nahoru. Vedle bicepsu víc zatíží předloktí.",
		["Jednoručky v neutrálním úchopu (palce nahoru).", "Lokty u těla, zvedej bez švihu.", "Pomalu dolů."],
		["Švih trupem.", "Vytáčení zápěstí."],
	),
	"Stahování kladky na triceps": text(
		"Propínání loktů na horní kladce. Izolovaný cvik na triceps.",
		["Lokty u těla a nehybné.", "Propni lokty dolů, dole krátce podrž.", "Vrať se zhruba do pravého úhlu v loktech."],
		["Lokty se pohybují dopředu a dozadu.", "Naléhání vahou těla na kladku."],
	),
	"Francouzský tlak": text(
		"Propínání loktů vleže s činkou. Cvik na triceps ve velkém rozsahu pohybu.",
		["Vleže na lavici, činka nad rameny, lokty míří ke stropu.", "Spouštěj k čelu nebo za hlavu pohybem jen v loktech.", "Propni zpět, lokty se nerozjíždějí do stran."],
		["Lokty se rozjíždějí do stran.", "Příliš těžká váha – bolí lokty."],
	),
	"Farmářská chůze": text(
		"Chůze s těžkým břemenem v rukou. Posiluje úchop, trapézy a zpevnění celého těla.",
		["Těžké jednoručky nebo kettlebelly v rukou, vzpřímený postoj.", "Ramena dolů, střed těla zpevněný.", "Krátké pravidelné kroky, bez klátení do stran."],
		["Kulatá záda při zvedání břemen.", "Naklánění do stran."],
	),
	"Tlak na lavici úzkým úchopem": text(
		"Bench press s úchopem na šíři ramen. Přenáší víc práce na tricepsy.",
		["Úchop zhruba na šíři ramen, lopatky stažené.", "Spouštěj činku na spodní část hrudníku, lokty blízko těla.", "Vytlač nahoru do propnutí."],
		["Příliš úzký úchop – zatěžuje zápěstí.", "Lokty do stran."],
	),
	"Mrtvý tah sumo": text(
		"Mrtvý tah se širokým postojem a úchopem mezi koleny. Víc zapojí stehna a hýždě, trup zůstává vzpřímenější.",
		["Široký postoj, špičky ven, úchop mezi koleny.", "Kolena tlač ven nad špičky, hrudník nahoru, záda neutrální.", "Tlač nohama do země a propni kyčle."],
		["Kolena padající dovnitř.", "Zvedání hýždí dřív než činky."],
	),
	"Dobré ráno": text(
		"Předklon s činkou na zádech. Posiluje zadní stranu stehen, hýždě a vzpřimovače zad. Cvičí se s lehčí váhou.",
		["Činka na trapézech, kolena mírně pokrčená.", "Posílej kyčle dozadu a předkláněj se s neutrálními zády.", "Vrať se tlakem kyčlí vpřed."],
		["Kulacení zad.", "Příliš těžká váha.", "Pokrčování kolen místo pohybu v kyčlích."],
	),
	"Rozpažování v předklonu": text(
		"Upažování v předklonu s jednoručkami. Zaměřuje se na zadní část ramen.",
		["Předklon s rovnými zády nebo opora hrudníku o lavici.", "Zvedej paže do stran, lokty mírně pokrčené.", "Nahoře krátce podrž, dolů pomalu."],
		["Švih trupem.", "Tah trapézy – ramena k uším."],
	),
	Předpažování: text(
		"Zvedání paží před tělo. Izolovaný cvik na přední část ramen.",
		["Jednoručky před stehny, lokty mírně pokrčené.", "Zvedej paže před sebe do výše ramen.", "Pomalu dolů, bez švihu."],
		["Švih a záklon.", "Zvedání nad úroveň ramen s těžkou vahou."],
	),
	"Stahování protisměrných kladek": text(
		"Stahování kladek před tělo. Izolovaný cvik na prsní svaly se stálým napětím.",
		["Stoj mezi kladkami, mírný předklon, lokty lehce pokrčené.", "Stahuj ruce obloukem před tělo, dokud se nesetkají.", "Pomalu zpět do protažení prsou."],
		["Tlačení místo stahování – pracují tricepsy.", "Ramena vytažená dopředu."],
	),
	"Zkracovačky na kladce": text(
		"Zkracovačky vkleče s horní kladkou. Umožní přidávat břišním svalům zátěž.",
		["Klek pod kladkou, lano u hlavy.", "Ohýbej páteř – přitahuj hrudník k pánvi.", "Pomalu zpět, pánev zůstává na místě."],
		["Tah rukama.", "Pohyb v kyčlích místo v páteři."],
	),
	Dřevorubec: text(
		"Rotace trupu s kladkou šikmo přes tělo. Posiluje šikmé břišní svaly.",
		["Stoj bokem ke kladce, paže téměř propnuté.", "Táhni šikmo přes tělo, otáčej trupem i pánví.", "Kontrolovaně zpět."],
		["Pohyb jen rukama.", "Kulatá záda."],
	),
	Hyperextenze: text(
		"Zvedání trupu na lavici pro hyperextenze. Posiluje vzpřimovače zad, hýždě a zadní stranu stehen.",
		["Opěrka pod pánví, nohy zapřené.", "Spusť trup dolů s rovnými zády.", "Zvedni se do přímky s nohama, ne výš."],
		["Záklon nad úroveň těla.", "Švih."],
	),
	"Výstupy na bednu": text(
		"Vystupování na vyvýšenou plochu. Jednostranný cvik na stehna a hýždě, šetrný ke kolenům.",
		["Celé chodidlo polož na bednu.", "Vystup tlakem přední nohy, trup vzpřímený.", "Pomalu sestup stejnou nohou."],
		["Odraz zadní nohou.", "Koleno padá dovnitř."],
	),

	// ---------- Kalistenika ----------
	Kliky: text(
		"Základní cvik s vlastní vahou na prsa, tricepsy a ramena. Zvedáš zhruba 64 % své hmotnosti (Ebben 2011).",
		[
			"Ruce o něco šíř než ramena, tělo v jedné přímce od hlavy k patám.",
			"Zpevni břicho a hýždě, lokty zhruba 45° od těla.",
			"Hrudník až těsně nad zem, pak vytlač do propnutí.",
		],
		["Propadlá bedra nebo vystrčené hýždě.", "Poloviční rozsah pohybu.", "Lokty v pravém úhlu od těla.", "Předsunutá hlava."],
	),
	"Kliky na kolenou": text(
		"Lehčí varianta kliku s oporou o kolena. Vhodná pro začátek a pro doražení série.",
		["Kolena na podložce, tělo v přímce od hlavy ke kolenům.", "Technika jako u kliků, jen s menší zátěží."],
		["Vystrčené hýždě – tělo není v přímce.", "Poloviční rozsah."],
	),
	"Kliky o vyvýšení": text(
		"Klik s rukama na lavici nebo stole. Čím výš ruce, tím snazší.",
		["Ruce na lavici nebo stole – čím výš, tím snazší.", "Tělo v přímce, hrudník spouštěj k hraně."],
		["Propadlá bedra.", "Nestabilní opora."],
	),
	"Kliky s nohama na vyvýšení": text(
		"Těžší varianta kliku s nohama na lavici. Víc zatíží horní část hrudníku a ramena.",
		["Chodidla na lavici, ruce na zemi.", "Tělo v přímce, nepropadej v bedrech.", "Více zatěžuje horní část hrudníku a ramena."],
		["Propadlá bedra.", "Hlava padá k zemi dřív než hrudník."],
	),
	"Diamantové kliky": text(
		"Klik s rukama u sebe. Přenáší víc práce na tricepsy.",
		["Ruce pod hrudníkem, palce a ukazováčky tvoří „diamant“.", "Lokty podél těla, tělo v přímce.", "Když bolí zápěstí nebo lokty, ruce trochu rozšiř."],
		["Lokty do stran.", "Ruce příliš vpředu pod obličejem."],
	),
	"Široké kliky": text(
		"Klik s rukama o dlaň dál od sebe než obvykle. Víc zatíží prsní svaly a uleví tricepsům.",
		["Ruce zhruba o šířku dlaně dál než u běžného kliku.", "Paže svírají s tělem asi 60–70°, ne pravý úhel.", "Hrudník těsně nad zem, pak do propnutí."],
		["Paže v pravém úhlu k tělu („téčko“).", "Příliš široký úchop.", "Propadlá bedra."],
	),
	"Pike kliky": text(
		"Klik s pánví vysoko. Přenáší zátěž na ramena, příprava na kliky ve stojce.",
		["Vzpor s pánví vysoko, tělo tvoří obrácené V.", "Spouštěj hlavu mezi ruce, lokty mírně vpřed.", "Vytlač zpět."],
		["Pohyb dopředu místo dolů.", "Lokty do stran."],
	),
	Shyby: text(
		"Přitažení ve visu na hrazdě nadhmatem. Základní cvik na záda a paže.",
		["Nadhmat o něco šíř než ramena, začni v plném visu.", "Stáhni lopatky dolů a přitahuj se, až je brada nad hrazdou.", "Bez švihu nohama, dolů pomalu do plného visu."],
		["Švih a kopání nohama.", "Poloviční rozsah – bez plného visu.", "Natahování brady přes hrazdu."],
	),
	"Shyby podhmatem": text(
		"Shyb s dlaněmi k sobě. Víc zapojí bicepsy a pro většinu lidí je o něco snazší.",
		["Podhmat na šíři ramen, začni v plném visu.", "Přitahuj hrudník k hrazdě, lokty vedou dolů.", "Pomalu spouštěj do plného visu."],
		["Švih.", "Nedotažení do plného visu."],
	),
	"Shyby širokým úchopem": text(
		"Shyb s úchopem o dlaň širším než obvykle. Víc zatíží široký sval zádový a méně bicepsy.",
		["Úchop zhruba o šířku dlaně širší než u běžného shybu.", "Stáhni lopatky a přitahuj hrudník k hrazdě.", "Pomalu dolů do plného visu."],
		["Příliš široký úchop.", "Švih.", "Krátký rozsah pohybu."],
	),
	"Negativní shyby": text(
		"Jen pomalé spouštění z horní polohy shybu. Buduje sílu pro první shyb.",
		["Vyskoč nebo vystup tak, aby byla brada nad hrazdou.", "Spouštěj se pomalu (3–5 s) až do plného visu.", "Mezi opakováními se postav a začni znovu nahoře."],
		["Rychlý pád dolů.", "Vynechání plného visu na konci."],
	),
	"Shyby s gumou": text(
		"Shyb s dopomocí odporové gumy. Krok mezi negativy a plným shybem.",
		["Guma přes hrazdu, chodidlo nebo koleno v gumě.", "Technika jako u shybů; slabší guma = větší zátěž.", "Dopomoc gumy můžeš zapsat jako záporný přívažek (odhad)."],
		["Odraz z gumy dole.", "Příliš silná guma po dlouhou dobu."],
	),
	"Australské přítahy": text(
		"Přítah k nízké hrazdě s patami na zemi. Posiluje záda a je základem pro shyby.",
		["Nízká hrazda nebo kruhy, tělo v přímce, paty na zemi.", "Přitahuj hrudník k hrazdě, lopatky k sobě.", "Čím vodorovnější tělo, tím těžší cvik."],
		["Propadlá pánev.", "Tah jen rukama bez stažení lopatek."],
	),
	"Muscle-up": text(
		"Přechod ze shybu do vzporu nad hrazdou. Pokročilý cvik spojující tah a tlak.",
		["Z visu výbušný shyb až ke spodní části hrudníku.", "Rychle přetoč zápěstí a trup nad hrazdu.", "Dotlač jako dip do propnutí.", "Zkoušej až po zvládnutí čistých shybů a dipů."],
		["Přechod přes jeden loket („kuřecí křídlo“).", "Pokusy bez dostatečné síly ve shybech."],
	),
	Dipy: text(
		"Klik na bradlech. Silný cvik na tricepsy, prsa a ramena.",
		["Opora na bradlech s propnutými pažemi, ramena dolů od uší.", "Spouštěj, dokud jsou ramena zhruba v úrovni loktů, bez bolesti v ramenou.", "Vytlač zpět do propnutí."],
		["Příliš hluboké spouštění s bolestí ramen.", "Ramena u uší.", "Švih nohama."],
	),
	"Dipy na lavici": text(
		"Klik s rukama za tělem na lavici. Lehčí varianta dipu zaměřená na tricepsy.",
		["Ruce na hraně lavice za tělem, prsty dopředu.", "Pokrč lokty zhruba do pravého úhlu, záda blízko lavice.", "Nechoď hlouběji, pokud to tlačí na přední stranu ramen."],
		["Příliš hluboko – zátěž na ramena.", "Záda daleko od lavice."],
	),
	"Kliky ve stojce": text(
		"Klik ve stojce u zdi. Pokročilý cvik na ramena a tricepsy.",
		["Stojka u zdi, ruce o něco šíř než ramena.", "Spouštěj hlavu kontrolovaně k podložce, lokty mírně vpřed.", "Vytlač zpět; začni s pike kliky."],
		["Prohnutá bedra.", "Nekontrolovaný pád na hlavu."],
	),
	Dřepy: text(
		"Dřep s vlastní vahou. Základ pro stehna a hýždě a pro správný pohybový vzor.",
		["Chodidla na šíři ramen, špičky mírně ven.", "Kyčle dozadu a dolů, kolena ve směru špiček, paty na zemi.", "Hrudník nahoře, vstávej tlakem přes celé chodidlo."],
		["Zvedání pat.", "Kolena padající dovnitř.", "Kulatá záda."],
	),
	"Pistol squat": text(
		"Dřep na jedné noze s druhou nataženou vpřed. Vyžaduje sílu, rovnováhu i pohyblivost.",
		["Stoj na jedné noze, druhá natažená vpřed.", "Klesej kontrolovaně co nejníž, koleno ve směru špičky, pata na zemi.", "Pro začátek se drž opory nebo si sedej na lavici."],
		["Zvedání paty.", "Pád do dolní polohy.", "Koleno padá dovnitř."],
	),
	"Výskoky z dřepu": text(
		"Výbušný výskok z dřepu. Rozvíjí výbušnou sílu nohou.",
		["Z dřepu výbušně vyskoč.", "Doskoč měkce přes špičky na celé chodidlo, kolena ve směru špiček.", "Plynule pokračuj do dalšího dřepu."],
		["Tvrdý doskok na paty.", "Kolena padající dovnitř při doskoku."],
	),
	Most: text(
		"Zvedání pánve vleže na zádech. Posiluje hýždě a zadní stranu stehen.",
		["Leh na zádech, kolena pokrčená, chodidla blízko hýždí.", "Zvedni pánev tlakem přes paty do přímky kolena–kyčle–ramena.", "Nahoře stáhni hýždě, bedra neprohýbej."],
		["Prohnutá bedra.", "Odraz špičkami místo patami."],
	),
	"Sedy-lehy": text(
		"Zvedání trupu z lehu do sedu. Bývá součástí testů; šetrnější alternativou jsou zkracovačky nebo plank.",
		["Leh na zádech, kolena pokrčená, chodidla na zemi.", "Ruce na hrudníku nebo u spánků, za hlavu netahej.", "Zvedej trup plynule do sedu a pomalu se vrať."],
		["Tahání za hlavu.", "Švih a odrážení od podložky."],
	),
	Zkracovačky: text(
		"Krátké zvednutí hlavy a lopatek. Šetrnější cvik na břicho než sedy-lehy.",
		["Leh na zádech, kolena pokrčená.", "Zvedni hlavu a lopatky od podložky, bedra zůstávají na zemi.", "Šetrnější alternativa sedů-lehů."],
		["Tahání za hlavu.", "Zvedání celého trupu."],
	),
	Sklapovačky: text(
		"Současné zvednutí trupu a natažených nohou do tvaru V. Náročný cvik na břišní svaly.",
		["Leh na zádech, paže za hlavou.", "Zvedni zároveň trup a natažené nohy, rukama se dotkni chodidel.", "Kontrolovaně zpět, nohy nepokládej úplně."],
		["Švih pažemi.", "Kulatá záda a pokrčená kolena.", "Dopad zpět bez kontroly."],
	),
	"Kolo vleže": text(
		"Střídavé přitahování lokte k protějšímu kolenu. Zapojuje přímý i šikmé břišní svaly.",
		["Leh na zádech, ruce u spánků, lopatky nad zemí.", "Střídavě přitahuj loket k protějšímu kolenu, druhou nohu propínej.", "Pomalu, s rotací trupu, ne jen loktů."],
		["Tahání za hlavu.", "Rychlé „šlapání“ bez rotace trupu."],
	),
	"Ruský twist": text(
		"Rotace trupu v sedu se záklonem. Posiluje šikmé břišní svaly.",
		["Sed se záklonem, kolena pokrčená, chodidla na zemi nebo těsně nad ní.", "Otáčej trupem ze strany na stranu, ruce před hrudníkem.", "Záda rovně, pohyb vychází z trupu."],
		["Kulatá záda.", "Pohyb jen rukama."],
	),
	Nůžky: text(
		"Střídavé kmitání nataženýma nohama těsně nad zemí. Posiluje spodní část břicha a ohýbače kyčlí.",
		["Leh na zádech, bedra přitlačená k zemi, ruce pod hýžděmi nebo podél těla.", "Natažené nohy těsně nad zemí, střídavě kmitej nahoru a dolů.", "Při počítání na 4 doby je jedno opakování = čtyři kmity."],
		["Odlepení beder od země.", "Záklon hlavy."],
	),
	"Nohy nad zemí": text(
		"Výdrž s nataženýma nohama asi 15 cm nad zemí. Statický cvik na břicho.",
		["Leh na zádech, bedra přitlačená k zemi.", "Natažené nohy drž zhruba 15 cm nad zemí.", "Když se bedra odlepí, zvedni nohy výš nebo pokrč kolena."],
		["Prohnutá bedra.", "Zadržování dechu."],
	),
	"Zvedání nohou ve visu": text(
		"Zvedání nohou ve visu na hrazdě. Náročný cvik na břicho a úchop.",
		["Plný vis, ramena zapojená.", "Zvedej pokrčené nebo natažené nohy bez švihu.", "Dolů pomalu."],
		["Houpání.", "Pohyb jen v kyčlích bez podsazení pánve."],
	),
	"Zvedání kolen ve visu": text(
		"Lehčí varianta zvedání nohou ve visu s pokrčenými koleny.",
		["Vis na hrazdě, ramena zapojená.", "Přitahuj kolena k hrudníku a podsaď pánev.", "Pomalu dolů bez houpání."],
		["Švih.", "Zvedání jen do vodorovné polohy stehen bez podsazení pánve."],
	),
	Superman: text(
		"Současné zvednutí paží a nohou vleže na břiše. Posiluje vzpřimovače zad a hýždě.",
		["Leh na břiše, paže natažené vpřed.", "Zvedni současně paže, hrudník a nohy kousek nad zem, pohled k zemi.", "Krátce podrž, bez přehnaného záklonu."],
		["Záklon hlavy.", "Švihání."],
	),
	Plank: text(
		"Výdrž ve vzporu na předloktích. Základní cvik na zpevnění středu těla.",
		["Opora o předloktí a špičky, lokty pod rameny.", "Tělo v přímce, stáhni břicho a hýždě.", "Nepropadej v bedrech a nezvedej pánev."],
		["Propadlá bedra.", "Vystrčené hýždě.", "Zadržování dechu."],
	),
	"Boční plank": text(
		"Výdrž na boku s oporou o předloktí. Posiluje šikmé břišní svaly a stabilitu trupu.",
		["Opora o předloktí pod ramenem a o boky chodidel.", "Tělo v přímce, pánev nahoře.", "Vystřídej strany."],
		["Propadlá pánev.", "Rotace trupu dopředu."],
	),
	"Plank se salutováním": text(
		"Plank ve vzporu na rukou se střídavým zvedáním ruky k čelu. Trénuje stabilitu trupu proti rotaci.",
		["Vzpor na propnutých pažích, chodidla dál od sebe.", "Střídavě zvedej ruku k čelu jako při salutování.", "Pánev drž v klidu, bez přenášení váhy do stran."],
		["Houpání pánve.", "Propadlá bedra."],
	),
	Horolezec: text(
		"Střídavé přitahování kolen k hrudníku ve vzporu. Zatěžuje břicho a zvedá tep.",
		["Vzpor na propnutých pažích, tělo v přímce.", "Střídavě přitahuj kolena k hrudníku.", "Pánev nízko, ramena nad zápěstími."],
		["Vystrčené hýždě.", "Poskakování pánve."],
	),
	"Hollow hold": text(
		"Výdrž v „loďce“ na zádech. Základní gymnastický cvik na zpevnění středu těla.",
		["Leh na zádech, bedra přitlač k zemi.", "Zvedni lopatky a natažené nohy kousek nad zem.", "Když se bedra odlepí, pokrč kolena nebo zvedni nohy výš."],
		["Odlepená bedra.", "Předsunutá hlava."],
	),
	"L-sit": text(
		"Výdrž v opoře s nohama ve vodorovné poloze. Náročný cvik na břicho, ohýbače kyčlí a tricepsy.",
		["Opora na bradlech, paraletách nebo zemi, paže propnuté, ramena dolů.", "Zvedni natažené nohy do vodorovné polohy.", "Začni s pokrčenými koleny u hrudníku."],
		["Ramena u uší.", "Pokrčené lokty."],
	),
	"Stojka u zdi": text(
		"Stojka s oporou o zeď. Buduje sílu ramen a jistotu hlavou dolů.",
		["Ruce na šíři ramen kousek od zdi, nohy vyšvihni nebo vyjdi po zdi.", "Paže propnuté, tlač se od země, tělo zpevněné.", "Pohled mezi ruce, bedra neprohýbej."],
		["Prohnutá bedra („banán“).", "Pokrčené lokty."],
	),
	"Front lever": text(
		"Výdrž ve visu s tělem vodorovně obličejem nahoru. Pokročilý cvik na záda a břicho.",
		["Vis na hrazdě, paže propnuté, lopatky stažené dolů.", "Zvedni tělo do vodorovné polohy obličejem nahoru.", "Postupuj přes skrčenou polohu (kolena u hrudníku) a jednu nataženou nohu."],
		["Pokrčené lokty.", "Propadlá pánev."],
	),
	Planche: text(
		"Výdrž v opoře na rukou s tělem vodorovně. Velmi pokročilý cvik na ramena.",
		["Opora na rukou, paže propnuté, ramena předsunutá před dlaně.", "Nakloň se vpřed a zvedni nohy od země, tělo zpevněné.", "Postupuj přes náklon a skrčenou polohu; před cvičením rozcvič zápěstí."],
		["Pokrčené lokty.", "Přeskakování progresí – přetížení zápěstí a loktů."],
	),
	"Vis na hrazdě": text(
		"Prostý vis na hrazdě. Posiluje úchop a připravuje ramena na shyby.",
		["Nadhmat na šíři ramen, vis celým tělem.", "Ramena volně (pasivní vis) nebo stažená dolů (aktivní vis).", "Posiluje úchop a připravuje na shyby."],
		["Houpání.", "Zadržování dechu."],
	),
	Angličáky: text(
		"Spojení dřepu, vzporu a výskoku. Kondiční cvik na celé tělo.",
		["Z postoje do dřepu, ruce na zem.", "Výskok nohama dozadu do polohy kliku, pak zpět do dřepu.", "Výskok vzhůru s rukama nad hlavou."],
		["Propadlá bedra ve vzporu.", "Tvrdé doskoky."],
	),

	// ---------- Kettlebell ----------
	"Kettlebell swing": text(
		"Švih kettlebellem do výše hrudníku. Výbušný cvik na hýždě a zadní stranu stehen.",
		[
			"Pohyb vychází z kyčlí (předklon s neutrálními zády), ne z dřepu.",
			"Švihni zvon mezi nohama dozadu, pak výbušně propni kyčle.",
			"Paže jen vedou, zvon vyletí zhruba do výše hrudníku; nahoře zpevni hýždě a břicho.",
		],
		["Dřepování místo pohybu v kyčlích.", "Zvedání zvonu rukama.", "Kulatá záda.", "Záklon nahoře."],
	),
	"Kettlebell swing jednoruč": text(
		"Swing s jednou rukou. Přidává nárok na úchop a stabilitu trupu proti rotaci.",
		["Stejně jako oboruční swing, zvon v jedné ruce.", "Trup se nepřetáčí, rameno drž zapojené.", "Vystřídej ruce."],
		["Rotace trupu.", "Rameno vytažené dopředu."],
	),
	"Turecký vztyk": text(
		"Vstávání ze země do stoje se zvonem nad hlavou. Komplexní cvik na stabilitu ramen a středu těla.",
		[
			"Leh, zvon v propnuté ruce nad ramenem, pohled na zvon po celou dobu.",
			"Postupně: opora o loket → o dlaň → zvednutí pánve → podsunutí nohy do kleku → stoj.",
			"Stejnou cestou zpět; začni bez zátěže nebo s lehkým zvonem.",
		],
		["Spěch.", "Pokrčený loket ruky se zvonem.", "Ztráta pohledu na zvon."],
	),
	"Goblet dřep": text(
		"Dřep se zvonem u hrudníku. Zátěž vpředu pomáhá udržet vzpřímený trup.",
		["Zvon u hrudníku za rohy, lokty dolů.", "Dřep mezi kolena, trup vzpřímený, paty na zemi.", "Vstávej tlakem přes celé chodidlo."],
		["Zvedání pat.", "Kulacení zad dole."],
	),
	"Kettlebell clean": text(
		"Přemístění zvonu ze švihu k rameni. Základ pro tlaky a další cviky se zvonem.",
		["Začni jako swing, zvon veď blízko těla.", "Propni kyčle a nech zvon obtočit ruku do polohy u ramene, bez nárazu na předloktí.", "Loket u těla, zápěstí rovně."],
		["Náraz zvonu na předloktí.", "Tah rukou místo práce kyčlí.", "Zalomené zápěstí."],
	),
	"Kettlebell snatch": text(
		"Švih zvonu jedním pohybem nad hlavu. Pokročilý výbušný cvik.",
		[
			"Začni jako swing, po propnutí kyčlí veď zvon těsně u těla nahoru.",
			"Nahoře vsuň ruku do rukojeti, aby zvon měkce dosedl na předloktí, paže propnutá nad hlavou.",
			"Nejdřív zvládni swing a clean.",
		],
		["Náraz zvonu na předloktí.", "Velký oblouk daleko od těla."],
	),
	"Kettlebell tlak": text(
		"Tlak zvonu od ramene nad hlavu. Posiluje ramena a stabilitu trupu.",
		["Zvon v poloze u ramene, zpevněný střed těla a hýždě.", "Tlač nahoru do propnutí paže.", "Kontrolovaně spouštěj zpět k rameni."],
		["Záklon.", "Úklon do strany."],
	),
	"Kettlebell přítah": text(
		"Přítah zvonu k boku v předklonu. Cvik na záda.",
		["Předklon s neutrálními zády nebo opora o lavici.", "Přitahuj zvon k boku, loket podél těla.", "Dolů pomalu, bez rotace trupu."],
		["Rotace trupu.", "Kulatá záda."],
	),
	"Kettlebell mrtvý tah": text(
		"Zvednutí zvonu ze země. Učí správný předklon v kyčlích, základ pro swing.",
		["Zvon mezi chodidly, kyčle dozadu, záda neutrální.", "Uchop rukojeť, zpevni záda a vstaň propnutím kyčlí a kolen.", "Stejnou cestou zpět."],
		["Kulatá záda.", "Dřep místo předklonu v kyčlích."],
	),
	"Kettlebell halo": text(
		"Kroužení zvonem kolem hlavy. Rozhýbe a zpevní ramena.",
		["Zvon dnem vzhůru za rohy před hrudníkem.", "Krouž jím těsně kolem hlavy, lokty blízko.", "Vystřídej směr, trup se nehýbe."],
		["Záklon a pohyb trupem.", "Příliš těžký zvon."],
	),
	"Kettlebell větrný mlýn": text(
		"Úklon se zvonem nad hlavou. Posiluje šikmé břišní svaly a stabilitu ramene.",
		["Zvon nad hlavou v propnuté paži, špičky natočené od zvonu.", "Vysuň bok ke straně zvonu a předkláněj se, pohled na zvon.", "Volnou rukou sjeď po vnitřní straně nohy, pak se vrať."],
		["Pokrčený loket.", "Kulatá záda.", "Ztráta pohledu na zvon."],
	),
	"Kettlebell thruster": text(
		"Dřep spojený s tlakem nad hlavu. Kondiční cvik na celé tělo.",
		["Zvon nebo zvony u ramen.", "Udělej dřep a při vstávání plynule vytlač nad hlavu.", "Spusť zpět k ramenům a pokračuj do dalšího dřepu."],
		["Oddělení dřepu a tlaku.", "Zvedání pat."],
	),

	// ---------- Kardio ----------
	Běh: text(
		"Základní vytrvalostní aktivita. Většina běhů má být v lehkém tempu.",
		["Uvolněná ramena, vzpřímený trup.", "Kratší krok s došlapem pod tělo.", "Většinu běhů v lehkém tempu, kdy zvládneš mluvit."],
		["Dlouhý krok s došlapem daleko před tělo.", "Příliš rychlé tempo u lehkých běhů.", "Prudké zvýšení objemu."],
	),
	Chůze: text(
		"Nejdostupnější pohyb. Vhodná pro regeneraci i jako základ běžné aktivity.",
		["Vzpřímeně, pohled vpřed, paže přirozeně spolupracují.", "Pro vyšší intenzitu zrychli nebo jdi do kopce."],
		["Shrbená ramena a pohled do země."],
	),
	Plavání: text(
		"Vytrvalostní aktivita šetrná ke kloubům. Zatěžuje hlavně záda, ramena a paže.",
		["Tělo co nejvodorovněji, hlava v prodloužení páteře.", "Pravidelné dýchání, u kraulu např. každé 2–3 záběry.", "Záběr vede dlaň s předloktím."],
		["Zvednutá hlava a potopené nohy.", "Zadržování dechu."],
	),
	Kolo: text(
		"Vytrvalostní aktivita šetrná ke kloubům. Zatěžuje hlavně stehna.",
		["Sedlo nastav tak, aby bylo koleno v dolní poloze jen mírně pokrčené.", "Plynulé šlapání, vyšší kadence je šetrnější ke kolenům.", "Na silnici vždy přilba."],
		["Nízké sedlo.", "Příliš těžký převod."],
	),
	Veslování: text(
		"Vytrvalostní cvik na celé tělo na trenažéru. Většinu práce dělají nohy.",
		["Pořadí záběru: nohy → trup → paže; při návratu obráceně.", "Záda rovně, ramena uvolněná.", "Většinu síly dávají nohy."],
		["Tah pažemi dřív než nohama.", "Kulatá záda."],
	),
	Švihadlo: text(
		"Skákání přes švihadlo. Rozvíjí kondici, koordinaci a lýtka.",
		["Švihadlo točí zápěstí, lokty u těla.", "Nízké, měkké odrazy přes špičky.", "Délka: stoupni doprostřed, rukojeti sahají zhruba do podpaží."],
		["Vysoké skoky.", "Točení celými pažemi."],
	),
	"Švihadlo – střídavé skoky": text(
		"Přeskoky střídavě z nohy na nohu, jako lehký běh na místě. Šetrnější k lýtkům než snožné skoky a vydržíš déle.",
		["Přenášej váhu z nohy na nohu, švihadlo projde pod každým došlapem.", "Odrazy nízké a měkké přes špičky, kolena lehce pokrčená.", "Švihadlo točí zápěstí, lokty u těla."],
		["Vysoké zvedání chodidel dozadu.", "Tvrdý došlap na paty."],
	),
	"Švihadlo – vysoká kolena": text(
		"Střídavé skoky se zvedáním kolen do výše pasu. Výrazně zvedá tep a zapojuje stehna a břicho.",
		["Střídej nohy a zvedej kolena zhruba do výše kyčlí.", "Trup vzpřímený, nezakláněj se.", "Krátké úseky (15–30 s) s odpočinkem."],
		["Záklon trupu.", "Kolena jen do poloviny – pak jde o běžné střídavé skoky."],
	),
	"Švihadlo – křížení": text(
		"Přeskok se zkříženýma rukama před tělem. Koordinační varianta, která zapojí víc ramena a předloktí.",
		["Z běžného skoku zkřiž ruce před tělem ve výši pasu a proskoč vzniklou smyčkou.", "Při dalším otočení ruce zase rozkřiž.", "Ruce kříž nízko a široce, zápěstí dál točí švihadlem."],
		["Křížení vysoko u hrudníku – smyčka je malá.", "Zastavení zápěstí při křížení."],
	),
	Dvojšvihy: text(
		"Švihadlo projde pod nohama dvakrát během jednoho výskoku. Náročné na výbušnost lýtek, rytmus a rychlost zápěstí.",
		["Nejdřív zvládni plynulé jednoduché přeskoky.", "Vyskoč o něco výš, tělo rovně a zpevněné, a zrychli zápěstí.", "Začni vzorem: několik jednoduchých skoků a jeden dvojšvih."],
		["Skrčování nohou („oslí kop“) místo rovného výskoku.", "Točení celými pažemi.", "Příliš mnoho pokusů v únavě – přetěžuje lýtka a Achillovy šlachy."],
	),
	Sprinty: text(
		"Krátké úseky v maximálním úsilí. Náročné na svaly a šlachy – vyžadují důkladné rozcvičení.",
		["Důkladně se rozcvič a udělej několik stupňovaných rovinek.", "Krátké úseky (10–30 s) s plným odpočinkem mezi nimi.", "Skonči, když rychlost výrazně klesá."],
		["Sprint bez rozcvičení.", "Příliš mnoho opakování v únavě."],
	),
	"Eliptický trenažér": text(
		"Vytrvalostní stroj bez dopadů. Šetrná alternativa běhu.",
		["Vzpřímený postoj, celá chodidla na pedálech.", "Plynulý pohyb, paže spolupracují.", "Zátěž nastav tak, aby pohyb nebyl trhavý."],
		["Opírání vahou těla o madla.", "Shrbená záda."],
	),

	// ---------- Mobilita ----------
	"Protažení flexorů kyčle": text(
		"Protažení přední strany kyčle. Hodí se po dlouhém sezení.",
		["Výpadový klek, zadní koleno na podložce.", "Podsaď pánev a posuň ji mírně vpřed, trup vzpřímený.", "Drž 20–40 s na každé straně, bez bolesti."],
		["Prohnutí beder místo podsazení pánve."],
	),
	"Protažení zadní strany stehen": text(
		"Protažení hamstringů v předklonu z kyčlí.",
		["Natáhni nohu na vyvýšení nebo vleže s páskem.", "Předkloň se z kyčlí s rovnými zády.", "Drž 20–40 s, bez bolesti."],
		["Kulacení zad.", "Pružení."],
	),
	"Kočka a kráva": text(
		"Střídavé vyhrbení a prohnutí páteře ve vzporu klečmo. Rozhýbe páteř.",
		["Vzpor klečmo, dlaně pod rameny, kolena pod kyčlemi.", "S výdechem vyhrb záda, s nádechem je prohni – pomalu po celé páteři.", "5–10 opakování."],
		["Rychlý pohyb.", "Pohyb jen v bedrech."],
	),
	"Rotace hrudní páteře": text(
		"Otáčení hrudníku při stabilní pánvi. Zlepšuje pohyblivost hrudní páteře.",
		["Vzpor klečmo nebo leh na boku s pokrčenými koleny.", "Otáčej hrudník a paži ke stropu, pánev zůstává na místě.", "Pomalu, 5–10 opakování na každou stranu."],
		["Otáčení pánví místo hrudníkem."],
	),
	"Holubí pozice": text(
		"Protažení hýždí a vnější strany kyčle.",
		["Přední noha pokrčená před tělem, zadní natažená dozadu.", "Pánev rovně, trup vzpřímený nebo v předklonu.", "Drž 30–60 s na každé straně, bez bolesti v koleni."],
		["Přetočená pánev.", "Tlak do kolene."],
	),
	"Dětská pozice": text(
		"Uvolňující poloha v sedu na patách s předklonem. Protáhne záda a ramena.",
		["Klek, sed na paty, předklon s čelem k zemi.", "Paže natažené vpřed nebo podél těla.", "Dýchej klidně, 30–60 s."],
		["Zvedání hýždí od pat."],
	),
	"Protažení prsních svalů": text(
		"Protažení prsou a přední strany ramen o zárubeň nebo stěnu.",
		["Předloktí opři o zárubeň, loket ve výši ramene.", "Udělej krok vpřed a otoč trup od paže.", "Drž 20–40 s, bez bolesti v rameni."],
		["Vytažené rameno dopředu.", "Bolest v přední části ramene."],
	),
	"Protažení lýtek": text(
		"Protažení lýtkových svalů ve výpadu o stěnu.",
		["Výpad proti stěně, zadní noha propnutá, pata na zemi.", "Nakláněj se vpřed, dokud cítíš tah v lýtku.", "Drž 20–40 s; s pokrčeným kolenem protáhneš hlubší část."],
		["Zvednutá pata.", "Vytočená špička."],
	),
	// ---------- Stupně žebříčků dovedností ----------
	"Archer kliky": text(
		"Klik s jednou paží nataženou do strany. Většinu váhy nese pokrčená paže – mezistupeň ke kliku na jedné ruce.",
		["Ruce výrazně širší než ramena.", "Spouštěj se k jedné ruce, druhá paže zůstává téměř natažená.", "Vytlač zpět a strany střídej, tělo v přímce."],
		["Pomáhání nataženou paží víc, než je nutné.", "Vytáčení boků."],
	),
	"Kliky na jedné ruce": text(
		"Klik s oporou jen o jednu ruku. Pokročilý cvik na prsa, triceps a zpevnění trupu.",
		["Nohy široce od sebe, ruka pod ramenem, druhá za zády.", "Spouštěj kontrolovaně, loket blízko těla.", "Boky a ramena drž co nejvíc rovnoběžně se zemí."],
		["Vytočený trup a boky.", "Poloviční rozsah pohybu."],
	),
	"Negativní dipy": text(
		"Jen pomalá spouštěcí fáze dipu. Buduje sílu pro první celý dip.",
		["Do horní polohy na bradlech vyskoč nebo vystup ze stupínku.", "Spouštěj se 3–5 sekund, ramena dolů od uší.", "Dole sestup na zem a opakuj od horní polohy."],
		["Rychlé „propadnutí“ dolů.", "Spouštění do bolesti v přední části ramen."],
	),
	"Pistol squat s oporou": text(
		"Dřep na jedné noze s přidržením nebo dosednutím na lavici. Mezistupeň k volnému pistol squatu.",
		["Přidrž se zárubně, kruhů nebo tyče – jen tolik, kolik je potřeba.", "Volnou nohu drž před sebou, pata stojné nohy na zemi.", "Sjeď co nejníž s kontrolou a vytlač se zpět."],
		["Tahání se nahoru rukama.", "Koleno padající dovnitř."],
	),
	Stojka: text(
		"Volná stojka na rukou bez opory. Cvik na ramena, zpevnění těla a rovnováhu.",
		["Ruce na šíři ramen, prsty roztažené, paže propnuté.", "Tlač se od země, žebra stažená, hýždě zpevněné.", "Rovnováhu drž tlakem prstů a dlaní; nauč se bezpečně vyskočit bokem."],
		["Prohnutá bedra.", "Pokrčené lokty.", "Zkoušení bez nacvičeného bezpečného pádu."],
	),
	"L-sit s pokrčenýma nohama": text(
		"Výdrž v opoře s koleny přitaženými k hrudníku. Lehčí stupeň před L-sitem.",
		["Opora na bradlech nebo paraletách, paže propnuté, ramena tlač dolů.", "Zvedni chodidla ze země a přitáhni kolena k hrudníku.", "Postupně kolena oddaluj a nohy natahuj."],
		["Ramena u uší.", "Pokrčené lokty."],
	),
	"Tuck front lever": text(
		"Přední váha s koleny u hrudníku. První stupeň na cestě k front leveru.",
		["Vis na hrazdě, paže propnuté, lopatky stažené dolů.", "Přitáhni kolena k hrudníku a zvedni boky do úrovně ramen.", "Záda drž co nejvíc vodorovně."],
		["Pokrčené lokty.", "Boky pod úrovní ramen."],
	),
	"Advanced tuck front lever": text(
		"Přední váha s rovnými zády a koleny dál od hrudníku. Stupeň mezi skrčenou polohou a plným front leverem.",
		["Z polohy tuck front lever narovnej záda.", "Kolena oddal od hrudníku, stehna svisle.", "Paže propnuté, lopatky stažené."],
		["Kulatá záda.", "Pokrčené lokty."],
	),
	"Shyby k hrudníku": text(
		"Shyb vytažený až k dotyku hrudníku s hrazdou. Buduje výbušný tah potřebný pro muscle-up.",
		["Úchop nadhmatem o něco širší než ramena.", "Táhni výbušně a lokty stahuj dolů a dozadu.", "Hrazda se dotkne horní části hrudníku, kontrolovaně dolů."],
		["Kopání nohama místo tahu.", "Předsunutá brada bez zvednutí hrudníku."],
	),
	"Negativní muscle-up": text(
		"Pomalý sestup z opory nad hrazdou do visu. Učí přechod, který je na muscle-upu nejtěžší.",
		["Nahoru do vzporu vyskoč nebo vystup z bedny.", "Spouštěj se pomalu přes dip a přechod zápěstí do shybu.", "Pokračuj kontrolovaně až do visu."],
		["Rychlé propadnutí přechodem.", "Lokty utíkající do stran."],
	),
	"Planche lean": text(
		"Náklon vpřed v opoře jako na klik. Připravuje ramena a zápěstí na planche.",
		["Vzpor ležmo, paže propnuté, prsty mírně do stran.", "Nakláněj se vpřed, ramena před dlaně.", "Zakulať horní záda a zpevni trup; nejdřív rozcvič zápěstí."],
		["Pokrčené lokty.", "Propadlá bedra."],
	),
	"Tuck planche": text(
		"Planche s koleny u hrudníku. Tělo drží jen ruce, nohy jsou skrčené.",
		["Opora na zemi nebo paraletách, paže propnuté.", "Nakloň se vpřed a zvedni skrčené nohy od země.", "Boky drž v úrovni ramen, horní záda zakulacená."],
		["Pokrčené lokty.", "Boky příliš nízko."],
	),
};

/** Text do těla poznámky cviku při založení. */
export const EXERCISE_NOTE_BODY =
	"Popis techniky je obecný návod (praxe), ne náhrada trenéra. Když cvik bolí, přeruš ho; při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.";

/** Text do těla nově zakládané poznámky cviku v jazyce. */
export function exerciseNoteBody(language: "cs" | "en"): string {
	return language === "cs"
		? EXERCISE_NOTE_BODY
		: "The technique description is a general guide (practice), not a substitute for a coach. Stop the exercise if it hurts; if the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.";
}

/** Texty původní knihovny + rozšíření (exercisesMore.ts, kde jsou u řádku cviku). */
export const EXERCISE_TEXTS: Record<string, ExerciseText> = {
	...BASE_TEXTS,
	...Object.fromEntries(MORE_EXERCISES.map((exercise) => [exercise.name, exercise.text])),
};

/** Odrážkový text z řádků. */
export function bullets(lines: string[]): string {
	return lines.map((line) => `- ${line}`).join("\n");
}
