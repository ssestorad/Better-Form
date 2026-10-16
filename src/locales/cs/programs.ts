// Čeština: programy, šablony tréninků a žebříčky dovedností. Klíč = id (src/seed/programData.ts, src/seed/skills.ts).

import type { ProgramLocale } from "../types";

export const PROGRAMS: Record<string, ProgramLocale> = {
	"basic-4": {
		name: "Základ 4",
		description: `Čtyři základní cviky s vlastní vahou – kliky, shyby, dřepy a sedy-lehy – třikrát týdně. Jednoduchý program bez vybavení (stačí hrazda), který se sám přizpůsobí tvé úrovni.

## Pro koho

Pro začátečníky i pro návrat po pauze. Hodí se také jako příprava na testy fyzické zdatnosti, kde se tyto cviky měří.

## Jak to funguje

1. **Vstupní test:** u každého cviku udělej maximum opakování v jedné sérii a zapiš ho (Programy → Test maxima). Před testem se rozcvič.
2. **Trénink (po, st, pá):** u každého cviku 3 série po 60 % maxima. Mezi sériemi 1–2 minuty pauza.
3. **Retest každé 3 týdny:** nové maximum přepočítá cíle.

Příklad: maximum 30 kliků → 3 série po 18.

## Jak přidávat

- Rozsah je 50–70 % maxima. Když je 60 % snadné (po sérii ti zbývají víc než 3 opakování), uprav v kopii programu procento na 70 nebo přidej čtvrtou sérii.
- Když 60 % nezvládáš dokončit, sniž na 50 %.
- Neumíš ještě shyb? Použij program „Od nuly k prvnímu shybu“ a v kopii Základu 4 nahraď shyby australskými přítahy.

## Kdy ubrat

- Maximum při retestu kleslo nebo stagnuje dva retesty po sobě → týden s polovičním objemem (viz „Odlehčovací týden“).
- Sedy-lehy táhnou v bedrech → nahraď je zkracovačkami nebo plankem, pokud je nepotřebuješ kvůli testu.

## Doporučení

- **Rezerva:** série ukončuj 1–3 opakování před selháním – stejný efekt s menší únavou. *(Helms 2016 – výzkum / praxe)*
- **Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*
- **Bílkoviny:** zhruba 1,6–2,2 g na kg hmotnosti denně podporují nárůst síly a svalů. *(Morton 2018 – výzkum)*
- **Check-in:** když se několik dní po sobě zhoršuje únava, bolest svalů nebo spánek, uber objem nebo si dej den volna. *(Saw 2016 – výzkum; konkrétní postup praxe)*
- **Bolest:** když cvik bolí, uber nebo ho vynech. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.

Štítek: **praxe** – procenta z maxima a počty sérií jsou trenérská praxe. Že trénink kliků vede k nárůstu síly a svalu, podporuje výzkum (Kikuchi 2017, Kotarsky 2018).`,
	},
	"push-ups-and-pull-ups-6-weeks": {
		name: "Kliky a shyby – 6 týdnů",
		description: `Šestitýdenní program na zvýšení maxima kliků a shybů. Tři krátké tréninky týdně (15–25 minut), každý s jiným zaměřením; dá se přidat k běhu nebo jinému tréninku.

## Pro koho

Pro toho, kdo už zvládne aspoň 10 kliků a 3 shyby a chce počty zvednout. S menším počtem shybů začni programem „Od nuly k prvnímu shybu“.

## Jak to funguje

Před začátkem otestuj maximum kliků a shybů (Programy → Test maxima). Z něj se počítají všechny cíle.

| Den | Zaměření | Co dělat |
|---|---|---|
| **Pondělí – hustota** | hodně opakování v krátkém čase | EMOM 10 minut: každou celou minutu 40 % maxima, zbytek minuty pauza |
| **Středa – objem** | kvalitní série | 5 sérií po 60 % maxima, pauza asi 90 s |
| **Pátek – těžší varianta** | síla ve slabších úhlech | 4 série těžší varianty po 50 % maxima; varianty se střídají po týdnech |

- Kliky a shyby cvič ve stejný den – střídej je, ať jedna partie odpočívá, když druhá pracuje.
- **Ve 3. a 6. týdnu je v pátek test:** po rozcvičení jedna série na maximum. Výsledek se sám zapíše jako nové maximum a cíle se přepočítají.

Příklad: maximum 30 kliků a 9 shybů → pondělí 12 kliků a 4 shyby každou minutu, středa 5×18 a 5×5, pátek 4×15 a 4×5 (těžší varianta).

## Jak přidávat

- Cíle rostou samy s novým maximem po testu ve 3. týdnu.
- Když EMOM dokončíš s velkou rezervou, zpomal spouštění (2–3 s dolů) místo přidávání opakování.
- Pokročilí: ve středu přidej přívažek (vesta, batoh) místo dalších opakování.

## Kdy ubrat

- V EMOM nestíháš předepsaný počet už před 6. minutou → příště uber 1–2 opakování.
- Bolí lokty, ramena nebo zápěstí → vynech těžší varianty a zůstaň u základního cviku.
- Po 6 týdnech si dej aspoň týden volnější (viz „Odlehčovací týden“), než program zopakuješ.

## Doporučení

- **Rezerva:** série ukončuj 1–3 opakování před selháním – stejný efekt s menší únavou. *(Helms 2016 – výzkum / praxe)*
- **Rozcvičení:** před tréninkem 5 minut rozhýbání a 1–2 lehké série. *(praxe)*
- **Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*
- **Bílkoviny:** zhruba 1,6–2,2 g na kg hmotnosti denně podporují nárůst síly a svalů. *(Morton 2018 – výzkum)*
- **Check-in:** když se několik dní po sobě zhoršuje únava, bolest svalů nebo spánek, uber objem nebo si dej den volna. *(Saw 2016 – výzkum; konkrétní postup praxe)*
- **Bolest:** když cvik bolí, uber nebo ho vynech. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.

Štítek: **praxe** – rozvržení, procenta a délky jsou trenérská praxe. Že trénink kliků vede k nárůstu síly a svalu, podporuje výzkum (Kikuchi 2017, Kotarsky 2018); ukončování sérií před selháním vychází z Helms 2016.`,
	},
	"zero-to-your-first-pull-up": {
		name: "Od nuly k prvnímu shybu",
		description: `Postup k prvnímu shybu přes lehčí varianty: australské přítahy → negativní shyby → shyby s gumou → shyb.

## Pro koho

Pro každého, kdo zatím neudělá ani jeden čistý shyb. Stačí hrazda a nízká hrazda (nebo pevný stůl, kruhy).

## Jak to funguje

Třikrát týdně (po, st, pá), mezi sériemi 1,5–2 minuty pauza:

1. **Australské přítahy 3×8** – tělo v přímce, přitahuj hrudník k hrazdě. Čím vodorovnější tělo, tím těžší.
2. **Negativní shyby 3×3** – vyskoč nad hrazdu a spouštěj se 3–5 sekund až do plného visu.
3. **Vis na hrazdě 3×20 s** – posiluje úchop a ramena.

## Jak přidávat

- Australské přítahy: přidávej opakování až do 3×10, pak sniž hrazdu nebo podlož nohy.
- Negativy: prodlužuj spouštění (až 5–8 s), pak přidávej opakování do 3×5.
- Vis: přidávej po 5 sekundách do 3×40 s.
- Až zvládneš 3×10 australských přítahů a 3×5 pomalých negativů, přidej **shyby s gumou** (2–3 série po 3–5) místo části negativů.
- **Jednou za 2 týdny zkus jeden celý shyb** – odpočatý, hned po rozcvičení.

## Kdy ubrat

- Bolí lokty nebo ramena → vynech negativy na týden a nech jen přítahy a vis.
- Tři týdny bez pokroku → zkontroluj spánek a zkus trénovat jen dvakrát týdně.

## Doporučení

- **Rozcvičení:** před tréninkem 5 minut rozhýbání a 1–2 lehké série. *(praxe)*
- **Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*
- **Bílkoviny:** zhruba 1,6–2,2 g na kg hmotnosti denně podporují nárůst síly a svalů. *(Morton 2018 – výzkum)*
- **Bolest:** když cvik bolí, uber nebo ho vynech. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.

Štítek: **praxe**.`,
	},
	"couch-to-5k": {
		name: "Od gauče k 5 km",
		description: `Devítitýdenní běžecký program pro úplné začátečníky podle NHS Couch to 5K. Střídá běh a chůzi; úseky běhu se postupně prodlužují, až v 9. týdnu uběhneš 30 minut v kuse.

## Pro koho

Pro toho, kdo neběhá vůbec nebo se vrací po dlouhé pauze. Při zdravotních potížích se před začátkem poraď s lékařem.

## Jak to funguje

- **3 tréninky týdně** (po, st, so), mezi nimi aspoň den volna.
- Každý trénink začíná a končí **5 minutami svižné chůze**.
- Intervaly pro každý týden jsou v programu a ukážou se u dnešního úkolu; v 5. a 6. týdnu se liší i jednotlivé tréninky.
- Běhej pomalu – cílem je vydržet, ne rychlost.

Po tréninku zapiš běh tlačítkem „Zapsat trénink z programu“ a doplň RPE.

## Jak postupovat

- Když je týden příliš těžký, **zopakuj ho** – program se dá kdykoli pozastavit a znovu aktivovat.
- Vynechaný trénink dožeň, nepřeskakuj týdny.
- Po dokončení pokračuj 3× týdně 30 minut a postupně prodlužuj jeden běh.

## Kdy ubrat

- Bolest kloubů, holení nebo šlach, která neodezní do druhého dne → dej si 2–3 dny volna a vrať se o týden zpět.
- Zadýchání, při kterém nezvládneš mluvit → zpomal.

## Doporučení

- **Tempo:** většinu běhů běhej lehce – tak, abys zvládl mluvit. *(Seiler 2010 – výzkum)*
- **Zátěž:** nepřidávej skokově; prudký nárůst zátěže je spojovaný s vyšším rizikem zranění (metoda je ale sporná). *(Gabbett 2016, Impellizzeri 2020 – výzkum)*
- **Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*
- **Check-in:** když se několik dní po sobě zhoršuje únava, bolest svalů nebo spánek, uber objem nebo si dej den volna. *(Saw 2016 – výzkum; konkrétní postup praxe)*
- **Bolest:** když cvik bolí, uber nebo ho vynech. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.

Plán intervalů převzat z NHS Couch to 5K (nhs.uk, © Crown copyright).

Štítek: **konsenzus / praxe** (veřejný program NHS) – v pluginu vedeno jako praxe.`,
	},
	"100-push-ups-a-day": {
		name: "100 kliků denně",
		description: `Výzva: 100 kliků každý den, rozdělených do libovolného počtu sérií přes den. Počítá se denním počítadlem (+5 / +10 / +15).

## Pro koho

Pro toho, kdo zvládne aspoň 15–20 kliků v jedné sérii. Jinak začni s nižším denním cílem (vytvoř si kopii programu a uprav číslo) nebo s kliky na kolenou.

## Jak to funguje

- Rozděl si den: např. 10 sérií po 10 nebo 5 sérií po 20, mezi sériemi klidně hodiny.
- Každou sérii ukonči s rezervou – žádná nemá být do selhání.
- Hlídej techniku: tělo v přímce, hrudník až těsně nad zem. Sto polovičních kliků se nepočítá.

## Jak přidávat

- Až je 100 denně snadných, nezvyšuj hned počet – zkus těžší varianty (diamantové, s nohama na vyvýšení) nebo pomalejší tempo.
- Pro vyváženost přidej tahový cvik (shyby, australské přítahy): samotné kliky zatěžují jen přední stranu těla.

## Kdy ubrat

Program **nemá volné dny** – o to důležitější je sledovat tělo:

- Bolest ramen, loktů nebo zápěstí → den volna a pak poloviční cíl.
- Zhoršující se ranní check-in (únava, bolest svalů) několik dní po sobě → 1–2 dny volna.
- Výzvu drž nejvýš 4–6 týdnů, pak zařaď odlehčovací týden.

## Doporučení

- **Rezerva:** série ukončuj 1–3 opakování před selháním – stejný efekt s menší únavou. *(Helms 2016 – výzkum / praxe)*
- **Check-in:** když se několik dní po sobě zhoršuje únava, bolest svalů nebo spánek, uber objem nebo si dej den volna. *(Saw 2016 – výzkum; konkrétní postup praxe)*
- **Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*
- **Bolest:** když cvik bolí, uber nebo ho vynech. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.

Štítek: **praxe**.`,
	},
	"grease-the-groove": {
		name: "Grease the groove",
		description: `„Promazávání drážky“: časté, snadné série jednoho cviku rozložené přes celý den. Cílem je nacvičit pohyb mnoha kvalitními opakováními bez únavy.

## Pro koho

Pro toho, kdo chce zvednout počet shybů (nebo kliků, dipů) a má hrazdu po ruce doma či v práci. Potřebuješ zvládnout aspoň 3–4 čistá opakování.

## Jak to funguje

- **Pondělí až pátek**, víkend volno.
- **5 sérií denně po 50 % maxima**, mezi sériemi **aspoň hodina**.
- Každá série má být snadná a technicky čistá – nikdy do selhání, nikdy „na krev“.

Příklad: maximum 8 shybů → pětkrát denně 4 shyby.

## Jak přidávat

- Každé 2 týdny přetestuj maximum (po víkendovém volnu).
- Když je 5 sérií snadných, přidej šestou a sedmou sérii – ne opakování v sérii.
- Cvik můžeš změnit: v kopii programu nahraď shyby kliky nebo dipy.

## Kdy ubrat

- Maximum při retestu kleslo → týden jen 3 série denně.
- Bolí lokty nebo předloktí → 2–3 dny volna; u shybů střídej nadhmat a podhmat.

## Doporučení

- **Rezerva:** série ukončuj 1–3 opakování před selháním – stejný efekt s menší únavou. *(Helms 2016 – výzkum / praxe)*
- **Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*
- **Check-in:** když se několik dní po sobě zhoršuje únava, bolest svalů nebo spánek, uber objem nebo si dej den volna. *(Saw 2016 – výzkum; konkrétní postup praxe)*
- **Bolest:** když cvik bolí, uber nebo ho vynech. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.

Štítek: **praxe**.`,
	},
	"daily-kettlebell": {
		name: "Kettlebell denně",
		description: `Krátký denní trénink s jedním kettlebellem: swingy a turecký vztyk. Zabere 20–30 minut a pokryje výbušnost, kondici i stabilitu ramen a středu těla.

## Pro koho

Pro toho, kdo má jeden kettlebell a chce jednoduchou každodenní rutinu. Nejdřív se nauč techniku swingu a vztyku (bez zátěže nebo s lehkým zvonem) – viz knihovna cviků.

## Jak to funguje

1. **Swing: 10 sérií po 10** – každá série výbušná, mezi sériemi pauza do uklidnění dechu.
2. **Turecký vztyk: 5 sérií po 2** (1 na každou stranu) – pomalu a kontrolovaně.

Nejde o rychlost. Když technika v sérii povolí, sérii ukonči.

## Jak přidávat

- Těžší zvon zkus, až je celý trénink se stávajícím zvonem snadný několik dní po sobě.
- Přechod dělej postupně: nejdřív 2–3 série s těžším zvonem, zbytek s původním.
- Swing obouruč → později jednoruč.

## Kdy ubrat

- Tahá v bedrech → zkontroluj techniku swingu (pohyb z kyčlí, ne ze zad) a uber váhu.
- Unavený úchop nebo rozedřené dlaně → den volna.
- Program nemá volné dny: při zhoršeném check-inu si dej 1–2 dny pauzu.

## Doporučení

- **Rozcvičení:** před tréninkem 5 minut rozhýbání a 1–2 lehké série. *(praxe)*
- **Check-in:** když se několik dní po sobě zhoršuje únava, bolest svalů nebo spánek, uber objem nebo si dej den volna. *(Saw 2016 – výzkum; konkrétní postup praxe)*
- **Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*
- **Bolest:** když cvik bolí, uber nebo ho vynech. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.

Štítek: **praxe** – rozvržení je trenérská praxe. Že trénink swingů zlepšuje maximální a výbušnou sílu a je kondičně náročný, podporuje výzkum (Lake 2012, Farrar 2010).`,
	},
	"deload-week": {
		name: "Odlehčovací týden",
		description: `Týden s nižší zátěží, aby tělo dohnalo únavu nasbíranou v předchozích týdnech. Nejde o volno – cvičíš dál, jen méně.

## Kdy ho zařadit

- Po 4–8 týdnech soustavného tréninku.
- Když výkony 2–3 týdny stagnují nebo klesají.
- Když se několik dní po sobě zhoršuje ranní check-in (únava, bolest svalů, nálada) nebo spánek.
- Po dokončení programu, než začneš další.

## Jak to funguje

- **Posilování:** počet sérií zhruba na polovinu, váhu ponech nebo mírně sniž. Žádná série do selhání.
- **Běh:** kratší a lehčí běhy, bez intervalů a tempových úseků.
- **Denní výzvy a počítadla:** poloviční cíl nebo 2–3 dny volna.
- Zachovej obvyklé dny a cviky – mění se objem, ne návyk.

Program nemá vlastní cviky; slouží jako připomínka a pravidla pro úpravu toho, co běžně děláš.

## Po odlehčení

Vrať se k běžnému objemu. Pokud jsi před odlehčením stagnoval, začni o krok níž (o 5–10 % nižší váha nebo o sérii méně) a přidávej znovu.

## Doporučení

- **Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*
- **Bílkoviny:** zhruba 1,6–2,2 g na kg hmotnosti denně podporují nárůst síly a svalů. *(Morton 2018 – výzkum)*
- **Check-in:** když se několik dní po sobě zhoršuje únava, bolest svalů nebo spánek, uber objem nebo si dej den volna. *(Saw 2016 – výzkum; konkrétní postup praxe)*

Štítek: **praxe** – jednotlivé signály únavy mají oporu ve výzkumu, konkrétní podoba odlehčení je trenérská praxe.`,
	},
	"jump-rope-from-zero-4-weeks": {
		name: "Švihadlo od nuly – 4 týdny",
		description: `Čtyři týdny, které tě naučí skákat přes švihadlo plynule několik minut. Krátké úseky skákání se střídají s odpočinkem a postupně se prodlužují.

## Pro koho

Pro úplné začátečníky a pro návrat ke švihadlu po dlouhé pauze. Potřebuješ jen švihadlo správné délky (stoupni doprostřed – rukojeti sahají zhruba do podpaží) a rovný, mírně pružný povrch.

## Jak to funguje

Třikrát týdně (po, st, pá), vždy 8–12 minut:

| Týden | Úseky | Celkem |
|---|---|---|
| 1 | 8× (20 s skákání / 40 s odpočinek) | 8 min |
| 2 | 10× (30 s / 30 s) | 10 min |
| 3 | 10× (40 s / 20 s) | 10 min |
| 4 | 8× (60 s / 30 s) | 12 min |

- Před tréninkem 3–5 minut rozhýbej kotníky, lýtka a ramena.
- Skákej nízko a měkce přes špičky, švihadlo točí zápěstí.
- Zakopnutí nevadí – pokračuj, úsek se počítá podle času.

Po tréninku zapiš „Zapsat trénink z programu“, případně doplň počet přeskoků a RPE.

## Jak postupovat

- Když týden nezvládáš, zopakuj ho.
- Střídej základní snožný skok se střídavými skoky (jako lehký běh) – ty jsou šetrnější k lýtkům.
- Po dokončení pokračuj programem „Švihadlo – kondice 6 týdnů“.

## Kdy ubrat

- Bolest lýtek, holení nebo Achillových šlach, která do druhého dne neodezní → 2–3 dny volna a návrat o týden zpět. Šlachy si na skákání zvykají pomaleji než kondice.
- Tvrdý povrch (beton, dlažba) → skákej na podložce, gumě nebo dřevěné podlaze.

## Doporučení

- **Zátěž:** nepřidávej skokově; prudký nárůst zátěže je spojovaný s vyšším rizikem zranění (metoda je ale sporná). *(Gabbett 2016, Impellizzeri 2020 – výzkum)*
- **Check-in:** když se několik dní po sobě zhoršuje únava, bolest svalů nebo spánek, uber objem nebo si dej den volna. *(Saw 2016 – výzkum; konkrétní postup praxe)*
- **Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*
- **Bolest:** když cvik bolí, uber nebo ho vynech. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.

Štítek: **praxe**.`,
	},
	"jump-rope-6-week-conditioning": {
		name: "Švihadlo – kondice 6 týdnů",
		description: `Šest týdnů kondičního tréninku se švihadlem. Tři různé tréninky týdně: krátké rychlé intervaly, delší souvislé úseky a pyramida.

## Pro koho

Pro toho, kdo už zvládne skákat aspoň minutu v kuse (např. po programu „Švihadlo od nuly“). Hodí se jako doplněk k běhu nebo posilování.

## Jak to funguje

| Den | Zaměření | Týden 1–2 | Týden 3–4 | Týden 5–6 |
|---|---|---|---|---|
| **Pondělí – rychlé intervaly** | tempo | 10× (30 s / 30 s) | 12× (40 s / 20 s) | 15× (40 s / 20 s) |
| **Středa – delší úseky** | vytrvalost | 4× (2 min / 1 min) | 4× (3 min / 1 min) | 5× (3 min / 1 min) |
| **Pátek – pyramida** | změny rytmu | 1-2-3-2-1 min | 1-2-3-3-2-1 min | 2-3-4-3-2 min |

- Mezi úseky pyramidy 45 sekund odpočinku.
- V pondělí skákej svižně, ve středu v tempu, které udržíš celé.
- Zařazuj varianty: střídavé skoky, vysoká kolena, křížení, pokročilí dvojšvihy.

## Jak postupovat

- Když je týden lehký, přidej varianty skoků nebo těžší švihadlo – ne další minuty navíc.
- Po 6 týdnech si dej volnější týden a pak cyklus zopakuj s náročnějšími variantami.

## Kdy ubrat

- Bolest lýtek, holení nebo Achillových šlach → vynech pondělní rychlé intervaly a zkrať zbytek na polovinu.
- Skákání kombinuješ s během? Hlídej celkovou zátěž lýtek – nedávej těžký běh a švihadlo na stejný den.

## Doporučení

- **Zátěž:** nepřidávej skokově; prudký nárůst zátěže je spojovaný s vyšším rizikem zranění (metoda je ale sporná). *(Gabbett 2016, Impellizzeri 2020 – výzkum)*
- **Rozcvičení:** před tréninkem 5 minut rozhýbání a 1–2 lehké série. *(praxe)*
- **Check-in:** když se několik dní po sobě zhoršuje únava, bolest svalů nebo spánek, uber objem nebo si dej den volna. *(Saw 2016 – výzkum; konkrétní postup praxe)*
- **Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*
- **Bolest:** když cvik bolí, uber nebo ho vynech. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.

Štítek: **praxe**.`,
	},
	"jump-rope-1000-skips": {
		name: "Švihadlo – 1000 přeskoků",
		description: `Čtyřtýdenní výzva: 1000 přeskoků denně, šest dní v týdnu (neděle volno). Přeskoky rozděl do libovolného počtu sérií a počítej denním počítadlem (+50 / +100 / +200).

## Pro koho

Pro toho, kdo už švihadlo ovládá a zvládne aspoň 100 přeskoků bez zastavení. Začátečník ať nejdřív projde „Švihadlo od nuly“ – tisíc skoků denně je pro nepřipravená lýtka a šlachy moc.

## Jak to funguje

- 1000 přeskoků zabere zhruba 8–12 minut čistého času.
- Rozděl si je: např. 10× 100 s krátkou pauzou, nebo 5× 200.
- Skákej nízko, měkce, na pružném povrchu.

## Jak přidávat

- Místo vyššího počtu zrychluj nebo zařazuj varianty (střídavé skoky, vysoká kolena).
- Menší cíl pro začátek: vytvoř si kopii programu a změň číslo na 300–500.

## Kdy ubrat

- Bolest lýtek, holení nebo Achillových šlach → den volna a pak poloviční cíl.
- Zhoršující se ranní check-in několik dní po sobě → 1–2 dny volna.
- Po 4 týdnech zařaď odlehčovací týden.

## Doporučení

- **Zátěž:** nepřidávej skokově; prudký nárůst zátěže je spojovaný s vyšším rizikem zranění (metoda je ale sporná). *(Gabbett 2016, Impellizzeri 2020 – výzkum)*
- **Check-in:** když se několik dní po sobě zhoršuje únava, bolest svalů nebo spánek, uber objem nebo si dej den volna. *(Saw 2016 – výzkum; konkrétní postup praxe)*
- **Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*
- **Bolest:** když cvik bolí, uber nebo ho vynech. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.

Štítek: **praxe**.`,
	},
};

export const TEMPLATES: Record<string, string> = {
	"push-gym": "Push – posilovna",
	"pull-gym": "Pull – posilovna",
	"push-bodyweight": "Push – vlastní váha",
	"pull-bodyweight": "Pull – vlastní váha",
};

export const LADDERS: Record<string, string> = {
	"push-up-progression": "Kliky – progrese",
	"pull-up-progression": "Shyby – progrese",
	"dip-progression": "Dipy – progrese",
	"single-leg-squat-progression": "Dřep na jedné noze – progrese",
	"handstand-progression": "Stojka – progrese",
	"l-sit-progression": "L-sit – progrese",
	"front-lever-progression": "Front lever – progrese",
	"muscle-up-progression": "Muscle-up – progrese",
	"planche-progression": "Planche – progrese",
	"abs-progression": "Břicho – progrese",
};
