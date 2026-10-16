# Forma – specifikace pluginu pro Obsidian

> Pracovní název „Forma“, plugin se jmenuje Better Form. Jazyk rozhraní: angličtina a čeština (5.17).
> Stav: návrh schválený 29. 9. 2026. Staví se po fázích (kap. 13).

---

## 1. Co to je

Plugin do Obsidianu, který z vaultu dělá osobní tréninkový systém:

- zápis tréninků (běh, posilovna, plavání, kalistenika, kettlebell) s knihovnou uložených tréninků,
- import běhů ze Stravy,
- ranní check-in (spánek, pocity, HRV z aplikace, např. Elonga),
- přehledy, grafy, osobní rekordy a „panáček“ se statistikami svalových partií,
- vlastní i předpřipravené programy (např. 100 kliků denně),
- cíle a **doporučení tréninku / odpočinku / úpravy plánu podle pravidel podložených výzkumem**,
- doporučený denní příjem kalorií a makroživin podle tréninku.

### Principy (platí pro všechno)

1. **Data patří uživateli.** Vše se ukládá jako běžné Markdown poznámky s YAML frontmatterem. Bez pluginu musí zůstat čitelné.
2. **Nic osobního napevno.** Všechny osobní údaje, cíle, vybavení a prahy jsou v nastavení. Plugin musí fungovat pro kohokoli (kamarád si ho nainstaluje k sobě).
3. **Každé doporučení má důvod a zdroj.** U každého výpočtu a pravidla je uvedeno, z čeho vychází, a **úroveň důkazu** (viz 7.1). Heuristiky se nevydávají za výzkum.
4. **Není to zdravotnická aplikace.** Doporučení jsou orientační; u bolesti a zdravotních otázek plugin odkazuje na odborníka.
5. **Jednoduché na zápis.** Zápis tréninku po návratu domů na PC má trvat do 1–2 minut.
6. **Offline.** Kromě synchronizace se Stravou funguje vše bez internetu.

### Uživatel a prostředí

- Primárně Obsidian na počítači. Plugin nesmí rozbít mobilní Obsidian (Android, iOS) – funkce závislé na Node/Electronu (např. lokální OAuth server) se na mobilu skryjí.
- Typické zdroje dat: telefon, Strava nebo jiná aplikace na běh, aplikace na HRV (např. Elonga – hodnoty se opisují ručně).

---

## 2. Technologie

- Obsidian plugin, **TypeScript**, build přes **esbuild** (vycházet z oficiální `obsidian-sample-plugin` šablony).
- UI: vlastní view (`ItemView`) a modaly. Doporučeno **Svelte** pro komponenty (běžné v Obsidian pluginech); alternativně čisté TS + DOM. Rozhodnout v 1. fázi a držet se toho.
- Grafy: vlastní lehké SVG komponenty (preferováno) nebo Chart.js. Panáček: vlastní SVG.
- **Žádná závislost na jiných pluginech** (Dataview, Templater apod.). Data číst přes `app.metadataCache` / `app.vault`, zapisovat přes `app.fileManager.processFrontMatter` a `app.vault`.
- Výpočty (kap. 8–10) oddělit do čistých funkcí bez závislosti na Obsidianu → **jednotkové testy** (Vitest nebo Jest).
- Konfigurace a stav pluginu: `loadData/saveData` (settings). Tokeny Stravy uložit také tam (upozornit uživatele, že jsou v `.obsidian/plugins/forma/data.json` a nemají se sdílet).

---

## 3. Struktura vaultu

Kořenová složka nastavitelná (výchozí `Forma/`). Podsložky:

```
Forma/
  Deník/              # denní poznámky: spánek, check-in, HRV, váha, výživa
    2026/2026-09-28.md
  Tréninky/           # jedna poznámka = jeden trénink
    2026/2026-09-28 Posilovna – Push.md
  Knihovna/
    Cviky/            # jedna poznámka na cvik (+ přiřazené svalové partie)
    Šablony tréninků/ # uložené tréninky, ze kterých se vybírá
    Programy/         # vlastní i předpřipravené programy
    Suplementy/       # jedna poznámka na suplement (dávka, kdy brát)
  Cíle/
  Zdraví/
    Bolesti/          # evidence bolestí a zranění
  Vybavení/           # boty, kettlebelly
  Testy/              # testy maxim, normy
  Souhrny/            # automatické měsíční souhrny
  Export/             # CSV exporty
  Plán/               # plány týdne, jedna poznámka na týden
    2026/Týden 2026-10-05.md
Forma zálohy/         # ZIP zálohy (mimo kořen, nastavitelné)
```

Názvy složek jsou v nastavení. Plugin při prvním spuštění otevře úvodního průvodce (5.15), složky vytvoří a naplní knihovnu cviků a předpřipravené programy (jen pokud neexistují – nikdy nepřepisovat uživatelova data).

---

## 4. Datový model (frontmatter)

Klíče ve frontmatteru jsou **anglicky bez diakritiky** (stabilní pro kód), zobrazované texty česky. Každá poznámka má `forma: <typ>` a `schema: 1` (kvůli budoucím migracím).

### 4.1 Denní poznámka (`forma: day`)

```yaml
forma: day
schema: 1
date: 2026-09-28
sleep:
  bedtime: "23:10"        # šel spát
  sleep_onset: "23:25"    # usnul (odhad)
  wake: "06:40"
  duration_min: 435       # dopočítá se, lze přepsat
  quality: 4              # 1–5
  awakenings: 1
  morning_feeling: 3      # 1–5
check_in:                 # 1–5, 5 = nejlepší
  fatigue: 3
  soreness: 3
  mood: 4
  stress: 3
hrv:                      # ruční opis z Elongy
  rmssd_ms: 62
  resting_hr: 52
  elonga_readiness: 71    # jen zobrazit, nepoužívat v pravidlech (viz 8.8)
body:
  weight_kg: 78.4         # volitelně, doporučeno 1–7× týdně
  body_fat_pct:           # volitelně
steps: 8200               # volitelně: kroky za den (vstup pro běžnou aktivitu ve výživě, 11.3)
supplements: ["Kreatin", "Vitamin D"]   # volitelně: co bylo ten den vzato (viz 4.7)
notes: ""
```

Pod frontmatterem může uživatel psát volný text. Plugin do těla vkládá blok s dnešními tréninky a doporučenou výživou (generovaný blok ohraničený komentáři `<!-- forma:start -->` / `<!-- forma:end -->`, uvnitř se přepisuje, mimo nikdy).

### 4.2 Trénink (`forma: workout`)

```yaml
forma: workout
schema: 1
date: 2026-09-28
start: "17:30"
sport: strength           # run | strength | swim | calisthenics | kettlebell | rope | other
title: "Push"
template: "[[Push day]]"  # pokud vznikl ze šablony
program: "[[Základ 4]]"   # pokud patří do programu
duration_min: 62
rpe: 7                    # session RPE, CR-10 (0–10), zadává se ~30 min po tréninku
source: manual            # manual | strava | file (import GPX / TCX, viz 6.3)
strava_id:                # u importu
run:                      # jen u běhu
  distance_km: 10.2
  moving_time_s: 3310
  avg_hr: 152
  max_hr: 178
  elevation_m: 85
  type: easy              # easy | long | tempo | intervals | race
  shoes: "[[Pegasus 40]]"
  hr_zone_s: [600, 1800, 700, 200, 10]   # čas v zónách 1–5, pokud jsou data
  best_s: { "5k": 1481, "10k": 3105 }    # nejrychlejší úseky ze Stravy v sekundách (1k, 5k, 10k, half, marathon)
  strava_detail: true                    # detail aktivity (úseky, zóny) už byl stažen
swim:
  distance_m: 2400
  style: freestyle        # freestyle | breaststroke | backstroke | butterfly | mixed
  pool_m: 25
blocks:                   # posilovna, kalistenika, kettlebell (i kombinace)
  - type: sets            # sets | hold | emom | amrap | ladder | complex | timed
    exercise: "[[Bench press]]"
    sets:
      - { reps: 6, kg: 80, rir: 2 }
      - { reps: 6, kg: 80, rir: 1 }
  - type: hold
    exercise: "[[L-sit]]"
    sets:
      - { sec: 15 }
      - { sec: 12 }
  - type: emom
    minutes: 10
    exercise: "[[Kettlebell swing]]"
    reps_per_min: 15
    kg: 24
  - type: sets
    exercise: "[[Shyby]]"
    sets:
      - { reps: 6, added_kg: 10, rir: 2 }   # u kalisteniky přívažek
pain: []                  # odkazy na záznamy bolesti, pokud se ozvala
notes: ""
```

Pravidla:
- `kg` = hmotnost závaží; u cviků s vlastní vahou `added_kg` (přívažek, může být záporný u gumy / asistence).
- `rir` (reps in reserve) volitelné, ale nutné pro počítání „efektivních sérií“ u kalisteniky a lehkých sérií (viz 8.4). Pokud chybí, série se počítá jako efektivní jen u `strength` s ≥ 60 % odhadovaného 1RM, jinak ne.
- Běh ze Stravy: `source: strava`, uživatel doplní jen `rpe`, typ, boty, poznámku.

### 4.3 Cvik v knihovně (`forma: exercise`)

```yaml
forma: exercise
schema: 1
name: "Bench press"
category: strength        # strength | calisthenics | kettlebell | cardio | mobility
kind: grind               # grind | ballistic | hold  (ballistic = swing, clean, snatch)
measure: reps_kg          # reps_kg | reps_bw | seconds | distance | time
muscles:
  primary: [chest]
  secondary: [triceps, shoulders]
bodyweight_fraction:      # u reps_bw: podíl tělesné hmotnosti, který se zvedá (viz 8.5)
progression:              # u kalistenických dovedností
  ladder: "[[Shyby – progrese]]"
  level: 3
aliases: []
technique: |
  Volný text: technika, na co si dát pozor.
```

Svalové partie (ID pro panáček): `chest, shoulders, biceps, triceps, forearms, abs, obliques, traps, lats, lowback, glutes, quads, hamstrings, calves`.

### 4.4 Šablona tréninku (`forma: template`)

Stejná struktura jako `blocks` v tréninku, bez výkonů (jen plán: série × opakování, cílová váha nebo „z minula“). Při výběru šablony se formulář předvyplní **posledními výkony** u každého cviku a navrhne malé navýšení (kap. 9.3).

Knihovna se zakládá se čtyřmi předpřipravenými šablonami (`src/seed/templates.ts`): „Push – posilovna“, „Pull – posilovna“, „Push – vlastní váha“ a „Pull – vlastní váha“. Výběr cviků a počty sérií jsou **praxe**, ne výsledek studie; uživatel si je upraví. Do existujícího vaultu se doplní příkazem „Doplnit knihovnu cviků, programy a šablony“ (šablona se stejným názvem se nepřepíše).

### 4.5 Program (`forma: program`)

```yaml
forma: program
schema: 1
name: "100 kliků denně"
builtin: true             # předpřipravený (uživatel si ho může zkopírovat a upravit)
evidence: practice        # research | consensus | practice  (viz 7.1)
duration_weeks:           # prázdné = bez konce
days: [mon, tue, wed, thu, fri, sat, sun]
items:
  - exercise: "[[Kliky]]"
    target: { daily_total: 100 }          # daily_total | sets_reps | pct_of_max | time | distance
progression:
  rule: none                              # none | weekly_add | retest_pct_of_max
retest_every_weeks:
active_since: 2026-09-29
session_min: 40           # volitelně – obvyklá délka tréninku; s ní se dny programu počítají do plánu týdne (5.16)
intensity: mid            # volitelně – low | mid | high; chybí = střední
```

Typy cílů: `daily_total` (průběžné počítadlo přes den; volitelně vlastní tlačítka `counter_steps`), `sets_reps`, `pct_of_max` (procento z posledního testu maxima), `time`, `distance`, `intervals` (úseky zátěž / odpočinek), `ladder` (žebřík), `emom`, `max_sets` (série na maximum). Položka může mít rozpis po týdnech (`schedule`: jiný cíl, cvik nebo počet tréninků v daném týdnu) a `max_from` (cviky, z jejichž testů se bere maximum). Program může mít `sources` – ID zdrojů z katalogu (kap. 7.2).

Trénink se švihadlem (`sport: rope`) má volitelně `rope: { jumps: 1200 }`. Série může mít `warmup: true` (rozcvičovací – nepočítá se do progrese, 1RM ani objemu). Cvik v knihovně má navíc volitelná pole `description`, `technique`, `mistakes` (popis, provedení, časté chyby) – zobrazují se v prohlížeči knihovny spolu s panáčkem zapojených partií.

### 4.6 Další typy

- `forma: goal` – cíl: `name`, `type` (`run_time`, `lift_1rm`, `reps_max`, `skill_level`, `weekly_volume`, `body_weight`, `norm`), `target` (sekundy u `run_time`, kg u `lift_1rm` a `body_weight`, opakování nebo sekundy výdrže u `reps_max`, stupeň u `skill_level`, km běhu za 7 dní u `weekly_volume`; u `norm` chybí), podle typu `exercise`, `distance_km`, `ladder` (název žebříčku), `norm` (odkaz na normu); `created`, `deadline` (volitelně), `start_value` (stav při založení – od něj se počítá průběh), `status` (`active | done | dropped`). Aktuální stav a předpověď dopočítává plugin, neukládají se.
- `forma: pain` – bolest/zranění: `name` (co bolí), `muscle` (nejbližší partie, ID), `side` (`left | right | both`), `level` (aktuální intenzita 0–10), `since`, `trigger`, `notes`, `status` (`active | improving | resolved`), `history` (seznam `{date, level}`). Zápis intenzity 0 záznam uzavře (`resolved`); nižší než předchozí = `improving`.
- `forma: gear` – vybavení. Boty: `kind: shoes`, `name`, `start_km` (najeto před začátkem evidence), `limit_km` (volitelně, jinak výchozí z nastavení), `active`. Najeté kilometry = `start_km` + běhy, které na boty odkazují v `run.shoes`. Kettlebelly jsou zatím jen v nastavení (seznam hmotností).
- `forma: test` – test maxima: cvik, typ (`max_reps`, `max_reps_timed` + sekundy, `max_hold`, `1rm`, `run_time`), výsledek, datum.
- `forma: norm` – tabulka norem zadaná uživatelem: `name`, `items` – disciplíny `{ exercise, kind: reps | hold | run_time, time_limit_s?, distance_km?, rows }`, kde `rows` jsou řádky `{ sex?, age_from?, age_to?, value }` (opakování, sekundy výdrže, nebo čas běhu v sekundách). Řádek bez pohlaví a věku platí pro všechny; z odpovídajících se použije nejpřesnější. Žádné normy se nepředvyplňují – uživatel si je zadá sám. Ukládají se do složky `Testy/`.
- `forma: summary` – automatický měsíční souhrn: `month` (`YYYY-MM`), soubor `Souhrny/YYYY-MM.md` (generovaný, přepisuje se jen generovaný blok).

### 4.7 Suplement (`forma: supplement`)

```yaml
forma: supplement
schema: 1
name: "Kreatin"
catalog: creatine         # ID položky vestavěného katalogu; chybí u vlastního suplementu
dose: 5                   # denní dávka
unit: g                   # g | mg | µg | IU | kapsle …
timing: any               # morning | pre_workout | post_workout | evening | with_meal | any
training_days_only: false # true = bere se jen ve dnech s tréninkem (např. kofein)
active: true
since: 2026-10-01         # od kdy se počítá dodržování
```

Vlastní přípravek s více látkami (z etikety) má navíc složení jedné porce; `dose` je pak počet porcí denně a `unit` název porce:

```yaml
dose: 2
unit: tablety
ingredients:
  - { name: "Hořčík", amount: 200, unit: mg, catalog: magnesium }   # catalog = ID v katalogu, jen když se látka rozpozná
  - { name: "Vitamin B12", amount: 2.5, unit: µg }
```

Co bylo který den vzato, je v denní poznámce (`supplements`, seznam názvů – viz 4.1).

### 4.8 Plán týdne (`forma: plan`)

```yaml
forma: plan
schema: 1
week: 2026-10-05          # pondělí týdne
items:
  - id: p1                # označení položky v poznámce
    date: 2026-10-06
    sport: run
    title: "Tempo"        # volitelně
    template: "[[Okruh 8 km]]"   # volitelně – šablona, ze které se trénink zapíše
    duration_min: 45
    intensity: high       # low | mid | high (lehká / střední / těžká)
    distance_km: 8        # jen u běhu
    notes: "po práci"
```

Jedna poznámka na týden (`Plán/RRRR/Týden RRRR-MM-DD.md`). Položka musí mít datum z daného týdne a sport; ostatní je volitelné, výchozí intenzita je střední. Řádky, které plugin neumí přečíst, při úpravách nechává být. V generovaném bloku poznámky je tabulka týdne po dnech (bez stavu splnění – ten se počítá ze zapsaných tréninků a v poznámce by zastaral).

---

## 5. Obrazovky a funkce

Hlavní view „Forma“ s kartami v levém panelu: **Dnes · Zapsat · Plán · Přehled · Tělo · Dovednosti · Programy · Cíle · Výživa · Suplementy · Nastavení**. Příkazy v paletě příkazů pro každou hlavní akci (např. „Forma: Zapsat trénink“, „Forma: Ranní check-in“, „Forma: Synchronizovat Stravu“) a ikona v ribbonu.

### 5.1 Dnes

- Připravenost dne (kap. 8.9) s rozpadem, z čeho vznikla.
- Dnešní plán (z programů / kalendáře) a doporučení (kap. 10).
- Doporučená výživa na dnešek (kap. 11).
- Rychlé akce: ranní check-in, zapsat trénink, přidat k dennímu počítadlu (např. +10 kliků).

### 5.2 Ranní check-in (modal, cíl < 30 s)

Spánek (šel spát, usnul, vstal → délka se dopočítá; kvalita, probuzení, pocit ráno), pocity (únava, bolest svalů, nálada, stres – 1–5), HRV z Elongy (rMSSD, klidový tep, volitelně skóre Elongy), volitelně váha a kroky za včerejšek (uloží se do včerejší denní poznámky). Hodnoty z minula jako nápověda. Uloží do denní poznámky.

**Tělesné míry** (nepovinné, sbalená část check-inu): podíl tuku a obvody pasu, boků, hrudníku, paže, stehna a lýtka v cm (`body.body_fat_pct`, `waist_cm`, `hips_cm`, `chest_cm`, `arm_cm`, `thigh_cm`, `calf_cm`). Karta Tělo ukazuje poslední hodnotu každé míry a změnu od minulého a od prvního měření. Fotky pokroku plugin nemá.

### 5.3 Zapsat trénink (modal / view)

1. Výběr sportu.
2. Výběr: **nový** / **ze šablony** / **z programu na dnes** / **doplnit import ze Stravy** (seznam nedoplněných běhů).
3. Formulář podle sportu; u silových sportů bloky (sets, hold, EMOM, AMRAP, žebřík, komplex, na čas), přidání cviku vyhledáváním v knihovně (včetně aliasů), u každého cviku zobrazit poslední výkon a návrh.
4. Kettlebell: výběr hmotnosti z vlastních zvonů (nastavení).
5. RPE 0–10 s popisky škály CR-10, délka, poznámka, případně bolest (vytvoří / aktualizuje záznam bolesti).
6. „Uložit jako šablonu“.
7. Po uložení: nové osobní rekordy (kap. 9.1) se ohlásí.
- **Kalkulačka kotoučů a rozcvičení** (u cviků kategorie posilovna s váhou): tlačítko „Kotouče“ pod tabulkou sérií ukáže kotouče na každou stranu osy pro pracovní váhy (bere vždy nejtěžší kotouč, který se vejde; když váhu nejde složit přesně, řekne nejbližší nižší a kolik chybí) a nabídne rozcvičovací řadu: prázdná osa ×10, 40 % ×5, 60 % ×3, 80 % ×2, zaokrouhleno dolů na naložitelnou váhu – **praxe**. Osa (výchozí 20 kg) a sada kotoučů jsou v nastavení. Ke každé váze je i obrázek osy s naloženými kotouči v závodních barvách (25 kg červená, 20 modrá, 15 žlutá, 10 zelená, 5 bílá, malé kotouče pořadí opakují); hmotnosti mimo toto značení, např. 1,25 kg, jsou šedé.
- **Druh série**: klepnutím na číslo série se střídá pracovní → rozcvičovací (R) → drop série (D) → do selhání (S). Ukládá se jako `warmup: true` nebo `tag: drop | failure`. Série do selhání bez RIR se pro efektivní série počítá jako RIR 0.
- **Superset**: blok sérií nebo výdrží jde označit „superset s předchozím cvikem“ (`superset: true` u bloku; první blok superset být nemůže). Šablona si superset pamatuje.
- **Detail cviku v knihovně** má část Historie: kolikrát a od kdy se cvik cvičil, nejlepší výkon, graf nejlepšího výkonu po trénincích (odhad 1RM, jinak nejvíc opakování, jinak nejdelší výdrž) a výpis tréninků od nejnovějšího. Tréninky zapsané pod aliasem se počítají k témuž cviku.

### 5.4 Přehled

Karta má čtyři části (přepínač nahoře): **Souhrn · Grafy · Rekordy · Běh**.

- **Souhrn** – kalendářní týden / měsíc / rok s listováním zpět: počet tréninků a dnů s tréninkem, čas, zátěž (sRPE), km běhu a plavání, objem posilovny (kg × opakování pracovních sérií; u cviků s vlastní vahou tělesná hmotnost × podíl + přívažek) a změna proti předchozímu období. **Heatmapa** posledních 53 týdnů (den = čtverec, 4 odstíny podle kvartilů dnů se zátěží; trénink bez RPE = nejsvětlejší odstín). Série a odznaky (9.2), tlačítka měsíčního souhrnu (9.5).
- **Grafy** (vlastní SVG, období 6 týdnů / 3 měsíce / rok): denní zátěž s kondicí / únavou / formou (8.2), tempo běhu, odhad 1RM tří nejčastěji cvičených cviků období, spánek vs. zátěž, váha (jednotlivá vážení, průměr za 7 dní a trend za 3 týdny – 11.6), HRV s normálním pásmem (8.8). Hodnoty bodu pod kurzorem jsou v řádku pevné výšky pod grafem.
- **Rekordy** – osobní rekordy (9.1) a odhad závodního času (8.7) z vybraného běžeckého rekordu.
- **Běh** – tepové zóny, rozložení intenzit (8.7) a boty (5.10).

### 5.5 Tělo (panáček)

Referenční návrh: postava zepředu a zezadu, 14 partií (4.3). „Týden“ = posledních 7 dní včetně dneška (ne kalendářní týden, aby v pondělí nebyl panáček prázdný); graf vývoje jde po sedmidenních oknech zpět. Režimy obarvení: **Objem** (efektivní série za týden: < 6 / 6–9 / 10–20 / > 20), **Regenerace** (čas od posledního tréninku partie: < 24 h / 24–48 / 48–72 / 72+), **Bolesti** (z evidence). Najetí myší = náhled partie, kliknutí = připnutí detailu:
- efektivní série tento týden vs. rozsah 10–20,
- kdy naposledy, regenerace v %,
- graf sérií za posledních 8 týdnů s pásem 10–20,
- cviky na partii: nejlepší série, odhad 1RM, změna za 4 týdny,
- kardio zátěž partie (běh → nohy, plavání → záda a ramena) jako informace, ne série,
- aktivní bolest,
- doporučení se zdrojem.

Pod panáčkem je karta **Bolesti a zranění** (5.10): otevřené záznamy s dnešní intenzitou, zápis nové bolesti (předvyplní se připnutá partie), vyřešené záznamy.

**UX požadavek (zjištěno v náhledu):** zvýraznění při najetí nesmí měnit geometrii tvarů (žádné tlustší obrysy přes sousední partie) – zvýraznit ztlumením ostatních partií. Panel detailu má pevné rozvržení, aby při přejíždění mezi partiemi nic neposkakovalo.

### 5.6 Dovednosti (kalistenika)

Žebříčky progresí (předpřipravené, upravitelné): kliky, shyby, dipy, dřep → pistol squat, stojka, L-sit, front lever, muscle-up, planche, sed-leh → alternativy. U každé úrovně: kritérium postupu (výchozí 3×8 opakování nebo 3×10 s výdrže – **úroveň důkazu: praxe**), datum dosažení, aktuální nejlepší výkon, další krok. Regrese pro začátečníky (např. australské přítahy → negativy → s gumou → shyb).

Žebříček není zvláštní poznámka: tvoří ho cviky v knihovně se stejným `progression.ladder` (název, např. „Shyby – progrese“) seřazené podle `progression.level`. Úprava = změna těchto polí v poznámkách cviků. Stupeň je splněný prvním tréninkem, kde aspoň 3 pracovní série cviku dosáhly kritéria (série s dopomocí – záporný přívažek – se nepočítají); počty jsou v nastavení. Do starší knihovny žebříčky doplní příkaz „Doplnit žebříčky dovedností do knihovny“ (přidá chybějící cviky, existujícím jen doplní chybějící `progression`).

### 5.7 Programy

- Seznam aktivních programů, dnešní úkoly, splnění.
- **Nový test maxima:** u úkolu počítaného z maxima se po `retest_every_weeks` týdnech od posledního testu nabídne tlačítko „Je čas na nový test maxima“; bez nastavení se nepřipomíná.
- Tvorba vlastního programu (4.5), kopie a úprava předpřipraveného, export / import programu jako souboru (sdílení s kamarádem).
- **Program ze souboru** (nastavení → Programy, karta Programy → „Ze souboru“; stejně funguje „Z textu“): výběr souboru `.md`, `.txt`, `.json`, `.yaml`. Čte se v tomto pořadí:
  1. JSON – objekt programu (klíče jako ve frontmatteru: `name`, `days`, `duration_weeks`, `items` s `exercise` a `target`), případně zabalený v klíči `program`; `description` se uloží jako text poznámky;
  2. poznámka programu s frontmatterem (export z pluginu);
  3. YAML se stejnými klíči;
  4. obyčejný seznam v Markdownu: první nadpis = název; nadpis se dny („Pondělí a pátek“) platí pro odrážky pod ním; řádky `Dny: po, st, pá` a `Týdnů: 8`; odrážka = `Cvik: cíl` (i `Cvik – cíl`, `Cvik 5 km`), dny jde dát do závorky za položku. Cíle: `3×10`, `3×45 s`, `2 min`, `5 km`, `800 m`, `100 denně`, `3× max`, `3×60 %`, `EMOM 10 min × 5`, `žebřík 1-2-3-4-5`. Položky jsou jen odrážky a číslované řádky – běžný text se přeskočí a zůstane jako popis v poznámce.
  Program se uloží jako vlastní a neaktivní, při shodě názvu s pořadovým číslem. Bez dnů se nastaví po, st, pá. Názvy cviků se sjednotí s knihovnou (i přes aliasy). Po importu hláška: počet položek, nepřečtené řádky, nenačtené položky a cviky, které v knihovně nejsou. Soubor se čte jen lokálně.
- **Co říká výzkum** – u cviků v knihovně (dřep, mrtvý tah, bench a kliky, shyby a přítahy, hip thrust, kettlebell, břicho a core + obecné principy objemu a frekvence u silových cviků), u předpřipravených programů (časté opakování cviku, začínající běžci, kettlebell, odlehčovací týden), u rozložení intenzit běhu a u grafu HRV: shrnutí, praktické doporučení a aspoň tři studie s typem. EMG výsledky jsou označené jako nejslabší důkaz pro růst svalů; metody bez vlastní studie (grease the groove, 100 kliků denně) mají štítek praxe.
- Průběžné počítadlo pro `daily_total` (tlačítka +5/+10/+15/+vlastní, každá dávka se uloží jako samostatná série daného dne; na konci dne jeden záznam tréninku za program nebo průběžně aktualizovaný).
- Předpřipravené programy (u každého `evidence`):
  - **Základ 4** – kliky, shyby, dřepy, sedy-lehy; vstupní test maxim, 2–3× týdně na cvik, série 50–70 % maxima, přidávání, retest à 2–4 týdny (frekvence: výzkum; procenta: praxe).
  - **Od nuly k prvnímu shybu** (praxe).
  - **Od gauče k 5 km** – dle programu NHS Couch to 5K (konsenzus / praxe).
  - **100 kliků denně** – výzva (praxe).
  - **Grease the groove** – časté submaximální série přes den (praxe).
  - **Kettlebell denně** – swingy + turecký vztyk (praxe).
  - **Odlehčovací týden** (praxe).
  - **Kliky a shyby – 6 týdnů** – submaximální série, žebříky, EMOM a série na maximum (praxe).
  - **Švihadlo od nuly – 4 týdny**, **Švihadlo – kondice 6 týdnů**, **Švihadlo – 1000 přeskoků** (praxe).
- Každý předpřipravený program má v poznámce popis: pro koho je, jak postupovat, doporučení a zdroje.
- Pojistka: u denních výzev bez volna plugin sleduje check-in a bolesti a při zhoršení navrhne ubrat.

### 5.8 Cíle

Zadání cíle (typy 4.6), průběh, předpověď splnění podle trendu, navázaná doporučení. Normy (4.6 `norm`): uživatel zadá vlastní tabulku; plugin ukáže vzdálenost od splnění a nejslabší disciplínu.

- **Aktuální stav:** nejlepší výkon za posledních 42 dní (u času běhu nejnižší), jinak poslední známý; hmotnost = průměr vážení za 7 dní; týdenní kilometry = posledních 7 dní; dovednost = nejvyšší splněný stupeň; norma = splnění nejslabší disciplíny v %.
- **Průběh:** podíl cesty od `start_value` k cíli. U hmotnosti se směr (nahoru / dolů) určí podle výchozího stavu.
- **Předpověď** – **praxe**: přímka metodou nejmenších čtverců přes výkony za posledních 56 dní (aspoň 3 body v rozpětí aspoň 14 dní, jinak „sbírám data“). Datum, kdy přímka protne cíl, se porovná s termínem: *na dobré cestě* / *ohrožený* (po termínu, trend opačným směrem, nebo splnění dál než za 5 let).
- **Norma:** výkon disciplíny = nejlepší z testů maxim a tréninků za posledních 90 dní (jinak poslední známý); u opakování na čas jen test se stejným nebo kratším limitem. Splnění = výkon / norma (u běhu norma / čas).

### 5.9 Výživa

Doporučený denní příjem (kap. 11) s rozpadem výpočtu a zdroji: střed („asi X kcal“) a pod ním rozsah. Listování po dnech zpět, makroživiny v g a g/kg se štítky, varování pojistek, ruční volba zátěže dne. Bez údajů v profilu stav „chybí: …“ s odkazem do nastavení. Na kartě Dnes řádek „Výživa na dnešek“ a v generovaném bloku denní poznámky řádek „Výživa – doporučení“. Zápis jídla zatím **ne** (budoucí fáze); při jeho přidání adaptivní dolaďování výdeje (11.6).

### 5.10 Zdraví a vybavení

- Evidence bolestí (4.6) na kartě Tělo, vazba na panáček (režim Bolesti: mírná 1–3, střední 4–6, silná 7–10) a doporučení (pravidlo 8). Bolest jde zapsat i při zápisu tréninku – vytvoří nebo aktualizuje záznam a trénink na něj odkáže (`pain`).
- Boty: najeté km (součet běhů s botami), upozornění od 85 % limitu a při jeho překročení (výchozí 700 km, nastavitelné; **praxe/heuristika**). Správa bot na kartě Přehled, výběr bot ve formuláři běhu.
- Kettlebelly: seznam zvonů.

### 5.11 Režim „Základ“

Přepínač v nastavení a na kartě Dnes. Domovská obrazovka s kartami základních cviků (výchozí kliky, shyby, dřepy, sedy-lehy) a běhu; seznam je v nastavení (lze přidat např. švihadlo): dnešní plán, poslední výkon, rekord, rychlý zápis. Vstupní test maxim všech silových cviků najednou. Pokročilé části skryté. Data jsou stejná jako v plném režimu – přepnutí nic neztrácí. U sedů-lehů nabídnout šetrnější alternativu (curl-up, plank), pokud je uživatel nepotřebuje kvůli testu.

### 5.12 Export a záloha

Export do CSV (příkaz a tlačítko v nastavení): tři soubory – tréninky (řádek na trénink, se zátěží a objemem), série (řádek na sérii, EMOM, AMRAP, žebřík a komplex rozepsané) a denní data (spánek, check-in, HRV, hmotnost, suplementy). Formát pro český Excel: středník, desetinná čárka, UTF-8 s BOM. Ukládá se do `Forma/Export/` s datem a časem v názvu, nic se nepřepisuje.

Záloha = ZIP celé kořenové složky do složky záloh (nastavení, výchozí `Forma zálohy/` mimo kořen, aby se zálohy nezálohovaly). ZIP se skládá přímo v pluginu (bez komprese, bez Node), takže funguje i na mobilu.

### 5.14 Mazání z rozhraní

Trénink (tlačítko ve formuláři úpravy), suplement, cíl, norma, záznam bolesti, boty, program z knihovny a šablona jdou smazat přímo z pluginu. Vždy s potvrzením, které říká, co smazání způsobí a co zůstane, a nabízí šetrnější možnost, pokud existuje (vypnout suplement, uzavřít cíl, zapsat bolest 0, vyřadit boty). Smazání = přesun poznámky do koše podle nastavení Obsidianu (`fileManager.trashFile`, ve starším Obsidianu systémový koš) – nikdy trvalé smazání. Po smazání tréninku se obnoví souhrn v denní poznámce toho dne.

### 5.15 Úvodní průvodce

Jeden krátký formulář: pohlaví, rok narození, výška, hmotnost, volitelně podíl tuku; cíl, počet tréninků týdně, běžný den mimo trénink; režim (plný / Základ) a sporty. Otevře se sám po prvním spuštění (po založení složek a knihovny), jinak příkazem „Průvodce nastavením“, z karty Nastavení, z nastavení Obsidianu a z karet Výživa a Dnes, když pro výpočet chybí údaje. Prázdná pole profilu nejsou chyba – průvodce jen napíše, co bez nich nepůjde spočítat. „Později“ nic neuloží.

### 5.16 Plán týdne

Karta **Plán**: sedm řádků po–ne s pevným rozvržením, listování po týdnech, dnešek zvýrazněný barvou okraje a pozadí.

- **Položka plánu**: den, sport, šablona nebo název, délka, intenzita (lehká / střední / těžká), u běhu vzdálenost, poznámka. Přidání tlačítkem + u dne nebo příkazem „Naplánovat trénink“; úprava kliknutím na název (změna dne = přesun, i do jiného týdne; smazání s potvrzením).
- **Stav** se pozná sám ze zapsaných tréninků téhož dne – nejdřív podle šablony, potom podle sportu; jeden trénink splní jednu položku. Nespárovaná položka je do dneška „v plánu“, starší „vynecháno“. Tréninky z denního počítadla programů plán neplní.
- **Zapsat**: otevře formulář tréninku ze šablony, jinak předvyplněný sportem, názvem, délkou a vzdáleností z plánu. RPE se nepředvyplňuje.
- **Aktivní programy**: každý den, kdy má program úkol, je v řádku dne vidět. Když má program vyplněnou obvyklou délku tréninku (`session_min`, případně `intensity`; nastavuje se na kartě Programy u aktivního programu, i u předpřipraveného, a obnova předpřipravených programů ji zachová), počítá se den programu jako položka plánu: do souhrnu, zátěže, výhledu, těžkých dnů, výživy i doporučení. Splněný je, když jsou splněné úkoly dne nebo je zapsaný trénink z programu s délkou. Taková položka není v poznámce týdne uložená a nejde upravit ani přesunout – řídí se dny programu. Trénink z takového programu neplní ručně naplánovanou položku stejného sportu. Den, kde má program jen denní počítadlo, se nepočítá nikdy (počítadlo nemá délku ani RPE a do zátěže nejde ani po zapsání); program bez délky se jen zobrazí s poznámkou. **Historie zůstává**: den, ze kterého je zapsaný trénink z programu, je v plánu vidět jako splněný (s odkazem na trénink), i když program už neběží – je pozastavený, skončil, nebo byl znovu spuštěný od pozdějšího data. Nesplněné dny pozastaveného programu se neukazují (není z čeho poznat, kdy běžel).
- **Tabulka v poznámce týdne** obsahuje i dny programů; obnovuje se při každé změně plánu a při zobrazení týdne na kartě Plán (zapisuje se jen při rozdílu).
- **Souhrn týdne**: splněno / vynecháno, čas a kilometry běhu v plánu a skutečně, očekávaná zátěž týdne.
- **Zátěž z plánu** – **praxe**: odhad RPE z intenzity (lehká 3, střední 5, těžká 8) × délka (vzorec session RPE, Foster 2001). U běhu bez délky se čas dopočítá ze vzdálenosti a vlastního tempa (medián běhů za 90 dní, aspoň 3 běhy); jinak se položka bez délky do zátěže nepočítá.
- **Výhled**: očekávaná zátěž týdne = zapsané tréninky + položky, které jsou ještě v plánu; srovnává se s průměrem 4 týdnů před aktuálním týdnem (poměr z týdenních součtů, Gabbett 2016 – s plánem místo skutečnosti jen orientačně, **praxe**). Nad prahem ACWR z nastavení (výchozí 1,5) upozornění. Bez 4 týdnů historie stav „sbírám data“.
- **Těžké dny po sobě** (těžká položka v plánu nebo zapsaný trénink s RPE od 7, aspoň dva dny za sebou, z toho aspoň jeden ještě v plánu) → upozornění – **praxe**.
- „Zkopírovat minulý týden“ přidá položky předchozího týdne na stejné dny; „Otevřít poznámku týdne“.
- **Volné dny**: nabídka u dne (tlačítko ⋯) označí den jako volno, nemoc nebo dovolenou, i do konce týdne; uloží se do poznámky týdne (`off: [{ date, reason: rest | illness | vacation }]`). Nesplněná položka v takový den má stav „odloženo“ – nepočítá se jako vynechaná, do zbývající zátěže ani do výživy. Nemoc a dovolená navíc omlouvají série dnů (9.2). Tatáž nabídka přesune nesplněné položky dne na další den (u minulých dnů na dnešek).
- **Dnes**: karta „Dnešní plán“ s tlačítkem Zapsat a řádkem „Zítra: …“.
- **Výživa** (11.5): nesplněné položky plánu dne se počítají jako tréninky (výdej i zátěž dne) a jsou označené „plán“; listovat jde i týden dopředu. Řádek výživy v denní poznámce počítá jen se zapsanými tréninky.
- **Doporučení** (kap. 10): pravidla 1 a 2 při těžké položce v dnešním plánu nabídnou „Přesunout na zítra“ (u dne programu jen odkaz na plán – přesunout nejde); pravidla 12 a 13.

### 5.13 Suplementy

Karta jen v plném režimu.

Karta má přepínač čtyř částí, aby dlouhá knihovna a tabulky neodsouvaly dnešní odškrtávání: **Dnes** (odškrtávání s dodržováním v jedné tabulce a Denní přehled), **Moje** (správa suplementů a Osobní test), **Knihovna** (cíle, strava, hledání, filtry a katalog) a **Tabulky** (aminokyseliny, elektrolyty a tekutiny). Otevírá se na části Dnes.

- **Dnes** – aktivní suplementy k odškrtnutí jedním kliknutím; zápis do denní poznámky (`supplements`) a řádek v jejím generovaném bloku.
- **Dodržování** (sloupce 7 a 30 dní v téže tabulce) – u každého suplementu podíl vzatých dnů za 7 a 30 dní. Počítá se od `since`; dnešek až po odškrtnutí; u `training_days_only` jen dny se zapsaným tréninkem. Při neúplném okně stav „sbírám data (X z Y dní)“.
- **Moje suplementy** – přidání z katalogu nebo vlastní, úprava dávky a časování, vypnutí (historie zůstává).
- **Přípravek podle etikety** („Přidat podle etikety“): název, nepovinná fotka etikety (uloží se vedle poznámky suplementu a vloží do jejího textu), text složení a počet porcí denně. Z každého řádku textu se vezme název látky a první množství v g, mg, µg nebo IU; řádky bez takového množství (energie, nadpisy) se přeskočí a vyčtené řádky jde jednotlivě odškrtnout. Látky se podle názvu a aliasů přiřadí ke katalogu – z vitaminů B jen B6, protože jen pro něj platí horní limit. Denní množství = porce × obsah; horní limity se hlídají u každé látky zvlášť ve formuláři i v Denním přehledu. **Text z obrázku plugin sám nečte** (žádné OCR ani odesílání fotky mimo zařízení) – uživatel ho zkopíruje z fotky funkcí telefonu nebo systému, případně opíše. Množství zapsané s mezerou jako oddělovačem tisíců („1 000 mg“) se nepřečte.
- **Filtry knihovny** pod hledáním: síla důkazů v oblastech cílů (všechny / aspoň C / jen A a B), bezpečnost (všechny / bez vážných rizik / jen bez známých problémů) a skrytí látek, které už uživatel bere; ukazuje se počet zobrazených látek. Filtry se neukládají.
- **Stejná látka z více suplementů**: Denní přehled sčítá každou látku katalogu přes samostatné suplementy i složení přípravků. Horní limit se hlásí i tehdy, když ho překročí až součet (např. zinek v multivitaminu a zvlášť); překročení jediným suplementem hlásí jeho řádek. Kofein se hlásí od 9 mg/kg celkem za den, i když je jen ve složení přípravku (IOC 2018 – **konsenzus**). Počítá se tréninkový den, tedy včetně suplementů „jen s tréninkem“.
- **Doporučení** – vestavěný katalog 72 látek s hledáním podle názvu (bez ohledu na diakritiku). Látky jsou sbalené do řádku (název, známky po oblastech, bezpečnost, „máš“) a rozbalí se kliknutím; když hledání najde jedinou látku, rozbalí se sama. V rozbalené kartě jsou hned vidět dávkování, pro koho a rizika; srovnání studií je až pod nimi v dalším rozbalení. Látka se nehodnotí jedním verdiktem, ale **zvlášť v každé oblasti přínosu**: výkon, regenerace, svaly a složení těla, imunita, soustředění a paměť, nálada a stres, spánek, srdce a metabolismus, hormony, kosti a klouby. Známky: **A** silné (stanovisko nebo více shodných metaanalýz), **B** střední (metaanalýza nebo více RCT, malý účinek nebo jen určitá skupina), **C** předběžné (1–3 malé studie, nejednotné, nebo financování výrobcem), **D** jen laboratoř, **✗** u lidí testováno a nepotvrzeno – „nefunguje“ a „nevíme“ jsou dvě různé věci. Ke známce volitelně podmínka („jen při nedostatku“). Karta: *Má smysl pro* (A/B), *Možná pomáhá* (C), *Nepotvrzeno / nefunguje* (D, ✗), bezpečnost (🟢 bez problémů / 🟠 vedlejší účinky nebo interakce / 🔴 vážná rizika; u 🟠 a 🔴 konkrétní upozornění a „poraď se s lékařem“), dávkování, pro koho, rizika, štítek (kap. 7) a **srovnání nejméně tří zdrojů** rozdělené podle oblastí, s typem studie (stanovisko, metaanalýza, RCT, studie, přehled, kohortová, EMG/biomechanika) a příznakem „financoval výrobce“ (taková oblast má nejvýš známku C). Uživatel si vybere **cíle** (oblasti) a knihovna se rozdělí na „má smysl pro tvoje cíle“ (A/B), „možná pomáhá“ (C) a ostatní; bez výběru podle všech oblastí. Látky: kreatin, kofein, protein, beta-alanin, dusičnany, bikarbonát, vitaminy A, B, C, D, E, K, omega-3, hořčík, zinek, multivitamin, EAA, BCAA, citrulin, glutamin, kolagen, probiotika, melatonin, železo, ashwagandha, tribulus, maca, shilajit, korálovec ježatý, reishi, čaga, cordyceps, elektrolyty a sodík, glukosamin a chondroitin, L-karnitin, HMB, rozchodnice růžová, višňová šťáva, předtréninkové směsi, L-tyrosin, kolostrum, ženšen, alfa-GPC, koenzym Q10, D-asparagová kyselina, extrakt ze zeleného čaje, sacharidy během výkonu, glycerol, arginin, spirulina a chlorella, betain, fosforečnan sodný, selen, vápník, kyselina hyaluronová, vláknina (psyllium), taurin, L-theanin, kurkumin, kakaové flavanoly, citrát sodný, glycin, kvasinkové beta-glukany, zázvor, kapsaicin, ekdysteron a turkesteron, tongkat ali, exogenní ketony, CBD, fosfatidylcholin (lecitin), hydrogenuhličitan draselný, thiamin (B1). Horní limity EFSA hlídá aplikace i u selenu (255 µg) a vápníku (2 500 mg). U čagy neexistují klinické studie – karta to říká a opírá se o kazuistiky (typ „kazuistika“). Podklad: rešerše uživatele (SUPLEMENTY.md, VYZKUM.md, 10/2026), citace ověřené přes Crossref / PubMed.
- **Kofein a spánek:** u kofeinu v seznamu „Dnes“ upozornění, když je méně než 6 h do obvyklého ulehnutí (z posledního check-inu), a ve formuláři při časování „večer“ (Drake 2013 – **výzkum**). Když je zapsaná dávka kofeinu od 9 mg/kg výš, je u něj štítek „dávka nad 9 mg/kg“ – nad touto hranicí přibývá nežádoucích účinků bez dalšího přínosu (IOC 2018 – **konsenzus**).
- **Strava** (nastavení na kartě): běžná / vegetariánská / veganská; u vegetariánů a veganů bez B12 v seznamu připomínka vitaminu B12.
- **Osobní test (N-of-1):** u aktivního suplementu srovnání vybraného ukazatele z check-inu (kvalita a délka spánku, nálada, stres, únava, svaly) za 4 týdny před začátkem užívání (`since`) a během užívání (nejvýš 8 týdnů); výsledek až od 4 týdnů užívání a aspoň 14 měření v každém období, jinak „sbírám data“. Změna pod 0,3 bodu (u spánku 15 min) = „beze zřetelné změny“. Bez placeba jen orientační – **praxe**.
- Dávky podle hmotnosti (kofein 3–6 mg/kg, bílkoviny 1,6–2,2 g/kg celkem, beta-alanin ~65 mg/kg) se dopočítají z poslední zapsané váhy nebo z profilu.
- Kontrola horních limitů EFSA při zadání dávky: hořčík 250 mg/den z doplňků, zinek 25 mg, vitamin D 100 µg (4000 IU), vitamin A 3000 µg, vitamin E 300 mg, vitamin B6 12 mg. Překročení = upozornění, ne zákaz.
- **Denní přehled** – tabulka aktivních suplementů s denní dávkou a součet v gramech pro tréninkový den a den volna (suplementy „jen s tréninkem“ se počítají jen do tréninkového dne), zvlášť součet aminokyselin a přepočet na kg hmotnosti. Dávky v nepřevoditelných jednotkách (kapsle, tableta) se do součtu nepočítají a je to uvedeno.
- **Tabulka aminokyselin** – všech 20 aminokyselin bílkovin: zkratka, typ (esenciální / podmíněně esenciální / neesenciální), označení BCAA, průměrná denní potřeba dospělého podle WHO/FAO/UNU 2007 (mg/kg a přepočet na hmotnost uživatele) a ve kterých jeho suplementech je obsažena. Pod tabulkou aminokyseliny, které nejsou součástí bílkovin (citrulin, beta-alanin).
- **Elektrolyty a tekutiny** – tabulka sodíku, chloridu, draslíku, vápníku a hořčíku pro zadanou váhu, délku tréninku a míru pocení (zadání se neukládá): den bez tréninku = referenční příjem EFSA (s přepočtem na kg jen pro orientaci – hodnoty na váze nezávisí), ztráta potem = rychlost pocení × čas × koncentrace v potu podle ACSM 2007 (průměr a rozsah), den s tréninkem = součet. Pod tabulkou tekutiny podle ACSM 2007: 5–7 ml/kg nejméně 4 h před tréninkem, asi 1,5 l na kg ztracené hmotnosti po něm, 20–50 mEq sodíku na litr nápoje při delší zátěži. Rychlost pocení (0,5 / 1 / 1,5 l/h) je odhad se štítkem praxe.
- Není to zdravotní rada: obecné upozornění, rizika u každé látky, upozornění na kontaminaci doplňků zakázanými látkami a doporučení certifikovaných výrobků (IOC 2018).

### 5.17 Jazyk rozhraní

- Rozhraní je anglicky a česky; výchozí je angličtina, přepínač „Language / Jazyk“ je nahoře v nastavení. Po přepnutí se karta Better Form hned vykreslí znovu; názvy příkazů v paletě se změní až po restartu pluginu (Obsidian je načítá při startu).
- Texty: zdrojem je český text, anglický překlad je ve slovníku `src/i18n/en.ts` (klíč = český text, `{jmeno}` = zástupná značka, u čísel tvary [1, ostatní]). Chybějící překlad se ukáže česky; test hlídá úplnost a shodu zástupných značek.
- Čísla a data podle jazyka: desetinná čárka / tečka, „st 30. 9.“ / „Wed 30 Sep“.
- Stav: přeložené je rozhraní, nastavení, příkazy a hlášky (fáze 1), texty doporučení, výpočtů, chybových hlášek, exportu CSV a generovaných bloků v poznámkách – denní poznámka, trénink, plán, souhrny (fáze 2) – i obsah knihovny: cviky, suplementy, programy, šablony, žebříčky dovedností, „Co říká výzkum“, aminokyseliny a popisky zdrojů (fáze 3). Data, která uživatel zapsal, se nepřekládají. Generovaný blok v poznámce se při dalším obnovení přepíše ve zvoleném jazyce.
- Vestavěný obsah: anglické verze jsou v `src/seed/en/*` (klíč = český název nebo id), test hlídá úplnost a stejné pořadí studií. Nový vault v angličtině dostane anglické složky („Better Form/Workouts“…) a poznámky knihovny pod anglickými názvy; cviky mají druhý jazyk jako alias, takže staré záznamy i odkazy fungují v obou jazycích. Vestavěné programy a šablony se poznají podle názvu v kterémkoli jazyce a při přepnutí jazyka se nezaloží znovu. Existující poznámky ve vaultu se nepřejmenovávají. Plán a souhrn týdne se hledají podle frontmatteru, název nového souboru je v jazyce rozhraní („Week RRRR-MM-DD“ / „Týden RRRR-MM-DD“).

---

## 6. Integrace

### 6.1 Strava (fáze 2)

- Každý uživatel si založí **vlastní API aplikaci** na strava.com/settings/api (nové aplikace mají limit 1 sportovec, dokud neprojdou schválením). V pluginu **návod krok za krokem**.
- **Od června 2026 Strava vyžaduje pro založení API aplikace placené předplatné** (developers.strava.com → Getting Started: „A Strava subscription is a prerequisite for creating an app“). Bez předplatného propojení nejde nastavit; návod v nastavení to říká a plugin musí bez Stravy fungovat celý (import běhu ze souboru – 6.3, nebo ruční zápis).
- Nastavení: Client ID, Client Secret.
- OAuth: autorizační URL `https://www.strava.com/oauth/authorize`, scope `activity:read_all`, výměna kódu na `https://www.strava.com/oauth/token`, ukládat `refresh_token`, obnovovat access token.
  - Desktop: dočasný lokální HTTP server na `localhost:28547` pro zachycení `code` (Authorization Callback Domain = `localhost`). Poslouchá jen na 127.0.0.1, vypne se po dokončení nebo po 5 minutách; parametr `state` chrání proti podvržené odpovědi.
  - Záložní cesta (i mobil): přesměrování na `http://localhost/better-form`, kde nic neběží; uživatel zkopíruje adresu z adresního řádku a vloží ji do pluginu.
  - Tokeny a Client Secret jsou jen v `data.json`; nikdy se nelogují ani nevypisují do hlášek.
- Synchronizace: `GET /athlete/activities?after=<poslední sync>`, stránkování, jen typy běhu (Run, TrailRun, VirtualRun; nastavitelné). Detail + zóny tepu, pokud dostupné. Deduplikace podle `strava_id`. Respektovat rate limity Stravy (zpracovat HTTP 429, zobrazit hlášku).
- Spouští se **jen ručně** (tlačítko na kartách Dnes a Zapsat, v nastavení, příkaz „Synchronizovat Stravu“). První synchronizace stáhne posledních 90 dní (nastavitelné), další od poslední synchronizace s týdenním přesahem kvůli pozdě nahraným aktivitám.
- Z importu vznikne poznámka `forma: workout`, `source: strava`, označená jako „k doplnění“ (chybí RPE). Seznam běhů k doplnění je na kartách Dnes a Zapsat.
- **Sloučení s ručním zápisem:** když už na stejný den existuje ručně zapsaný běh bez `strava_id` se vzdáleností do ±10 % (nebo jediný běh toho dne bez vzdálenosti), import se do něj sloučí – měřené údaje ze Stravy, RPE, typ, boty, název a poznámka uživatele zůstanou.
- **Detail aktivity:** nejrychlejší úseky (`best_efforts` → `run.best_s`) a čas v tepových zónách (`/activities/{id}/zones`, jen pro předplatitele Stravy – při odmítnutí se dál nezkouší). Kvůli limitu 100 čtecích požadavků za 15 minut dostane detail nejvýš 30 běhů na synchronizaci, od nejnovějších; zbytek se doplní při dalších.
- Kalorie ze Stravy se **nepoužívají** pro výživu (viz 11.2).

### 6.2 Elonga (HRV)

- Teď: ruční opis v check-inu (rMSSD, klidový tep, volitelně skóre připravenosti Elongy).
- Elonga podle své nápovědy data jen přijímá (z Apple Health / Google Fit), export ani API neuvádí. Google Fit API končí koncem roku 2026.
- Budoucí možnost: pokud Elonga začne zapisovat HRV do **Health Connect**, import přes CSV z exportní aplikace do synchronizované složky vaultu. Připravit parser CSV jako rozšiřitelný „importér“ (rozhraní), neimplementovat dřív, než bude známý formát.

### 6.3 Import běhu ze souboru (GPX, TCX, FIT)

Cesta bez předplatného Stravy: Strava na webu exportuje vlastní aktivitu do GPX i z bezplatného účtu, MapMyRun do TCX; stejné formáty umí hodinky a další aplikace. Soubor se čte jen lokálně.

- **FIT** (binární formát hodinek Garmin, Coros, Wahoo, Suunto): pozná se podle hlavičky souboru, ne podle přípony. Čtou se jen zprávy „record“ (čas, poloha v polokruzích, výška, tep, vzdálenost zapsaná zařízením) a „session“ (sport, celková vzdálenost a čas jako záloha, když body chybí); ostatní zprávy a vývojářská pole se přeskočí, „neplatné“ hodnoty se berou jako chybějící. Dál se záznam zpracuje stejně jako GPX a TCX. Čtečka je ověřená jen na souboru sestaveném podle popisu formátu, ne na záznamu ze skutečných hodinek.

- **Spuštění**: tlačítko „Ze souboru“ na kartě Import běhů (Dnes, Zapsat), v nastavení (s návodem, kde soubor vzít) a příkaz „Importovat běh ze souboru (GPX, TCX)“. Jde vybrat víc souborů; vadný soubor ostatní nezastaví a hláška řekne proč.
- **Čtení**: formát se pozná podle obsahu. Z GPX body stopy (poloha, čas, výška, tep z rozšíření), název a typ; z TCX body (čas, poloha, výška, tep, vzdálenost od startu), typ a součty kol. Bez knihoven a bez DOM, aby šlo o čistou testovanou funkci (`src/calc/runFile.ts`).
- **Výpočty**:
  - vzdálenost – ze vzdálenosti zapsané zařízením (TCX), jinak součet úseků mezi polohami (haversine, koule o poloměru 6 371 km); bez poloh součet kol;
  - čas v pohybu – součet úseků rychlejších než 0,5 m/s (**praxe**); bez poloh čas kol, jinak celý záznam;
  - tep – průměr a maximum z bodů;
  - převýšení – stoupání se sčítá až po vzestupu o 3 m od posledního zlomu, aby se nesčítal šum GPS (**praxe**, odhad; aplikace výšky korigují podle mapy);
  - nejrychlejší úseky 1 km, 5 km, 10 km, půlmaraton, maraton – nejkratší čas včetně pauz, konec úseku dopočítaný mezi body (`run.best_s`, stejně jako ze Stravy).
- **Datum a čas** v místním čase zařízení. Soubor bez časů (naplánovaná trasa) se odmítne.
- **Typ aktivity**: běh nebo neznámý typ → běh; plavání → plavání se vzdáleností; kolo, chůze a ostatní → sport „jiné“ jen s délkou.
- Vznikne poznámka `forma: workout`, `source: file`, „k doplnění“ (chybí RPE, typ běhu, boty) – ve stejném seznamu jako běhy ze Stravy.
- **Duplicity**: tentýž záznam podruhé (stejný den a sport, start do 2 minut, vzdálenost do 3 %, ať je ze souboru nebo ze Stravy) se přeskočí. **Sloučení** s ručně zapsaným během funguje stejně jako u Stravy (6.1).
- Časy v tepových zónách se ze souboru nepočítají (plugin nemá nastavení zón).
- Když soubor tep neobsahuje (záznam bez snímače tepu, nebo ho aplikace do exportu nezapsala), hláška po importu to řekne – ať to nevypadá jako chyba importu.

### 6.4 Import historie ze Strong a Hevy (CSV)

Přechod z jiného silového deníku: nastavení → Import historie, nebo příkaz „Importovat historii ze Strong nebo Hevy (CSV)“. Soubor se čte jen lokálně.

- **Formáty** (řádek = série): Strong – `Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, Distance, Seconds, Notes, Workout Notes, RPE` (jednotka váhy v souboru není, uživatel ji zvolí; `Set Order` W / D / F = rozcvičovací / drop / do selhání); Hevy – `title, start_time, end_time, description, exercise_title, superset_id, exercise_notes, set_index, set_type, weight_kg | weight_lbs, reps, distance_…, duration_seconds, rpe` (jednotka v názvu sloupce, `set_type` normal / warmup / dropset / failure). CSV se čte s uvozovkami podle RFC 4180, oddělovač čárka nebo středník.
- **Převod**: série jdoucí po sobě se stejným cvikem tvoří blok (s opakováními „série“, jen se sekundami „výdrž“); libry se převedou na kg (× 0,45359237); u cviků s vlastní vahou je váha přívažek; RPE série 5–10 se převede na RIR = 10 − RPE (škála podle opakování v rezervě, Helms 2016); superset z Hevy se propíše do bloků; sport tréninku podle toho, ke kterému patří nejvíc sérií. Řádky kardia se vzdáleností a prázdné série se přeskočí.
- **Názvy cviků** se sjednotí s knihovnou: zkouší se celý název, „nářadí + cvik“ ze závorky a u velké činky a vlastní váhy i samotný cvik, vždy i s variantou se spojovníkem („Pull Up“ → „Pull-up“). Neznámé cviky zůstanou pod původním názvem a vypíšou se.
- **Průběh**: před zápisem souhrn (počet tréninků a sérií, období, kolik už v deníku je, neznámé cviky) a potvrzení. Trénink se stejným dnem a začátkem se přeskočí. Tréninky mají `source: manual` a nemají RPE celého tréninku (aplikace ho nevedou), takže se do zátěže započítají až po doplnění.
- Ověřeno jen na souborech sestavených podle nápovědy obou aplikací, ne na skutečném exportu.

### 6.5 Import denních dat z CSV

Kroky, délka spánku, HRV (rMSSD), klidový tep a váha z exportu hodinek nebo aplikace: nastavení → Import denních dat, nebo příkaz „Importovat denní data z CSV“.

- **Sloupce se poznávají podle názvu** (česky i anglicky, bez ohledu na diakritiku a velikost písmen), ne podle pořadí: datum; kroky (`steps`, `step count`, `kroky`); délka spánku (`sleep duration`, `total sleep`, `délka spánku` – ne skóre, kvalita ani fáze spánku); HRV (`hrv`, `rmssd` – ne skóre nebo balance); klidový tep (`resting heart rate`, `rhr`, `klidový tep`); váha (`weight`, `váha` – ne cíl a ne libry). Oddělovač čárka nebo středník, desetinná čárka i tečka.
- **Hodnoty**: datum jako `RRRR-MM-DD` (i s časem), `RRRR/MM/DD` nebo `D. M. RRRR`; americký zápis `MM/DD/RRRR` se nečte. Délka spánku jako `7:45`, `7h 45m`, nebo číslo – do 24 se bere jako hodiny, nad 1440 jako sekundy, jinak minuty. Hodnoty mimo rozsahy check-inu se zahodí. Víc řádků jednoho dne se sloučí, pozdější hodnota platí.
- **Zápis**: doplní se jen hodnoty, které v denní poznámce chybí; zapsané se nepřepisují a délka spánku se nedoplní ani tam, kde ji poznámka počítá z časů ulehnutí a vstávání. Před zápisem se ukáže, kolik dnů a hodnot se doplní a kolik denních poznámek vznikne.
- Elonga export nenabízí (6.2), HRV z ní se dál opisuje ručně. Ověřeno jen na ručně sestavených souborech, ne na skutečném exportu.

---

## 7. Úrovně důkazu a zdroje

### 7.1 Štítky

Každé pravidlo, výpočet a program nese štítek:
- **výzkum** – opřeno o konkrétní studie / metaanalýzy,
- **konsenzus** – stanovisko odborné společnosti,
- **praxe** – osvědčená trenérská praxe nebo heuristika bez silných dat.

V UI se u doporučení zobrazí text + krátký zdroj + štítek. Detail zdroje (celá citace) v rozbalení.

### 7.2 Katalog zdrojů

Zdroje drž v jednom katalogu v kódu (`src/evidence/sources.ts`, části podle oblastí v `src/evidence/sources/`) s ID, citací a štítkem; pravidla na ně odkazují ID. Seznam viz kap. 14 – test hlídá, že každý zdroj s DOI je i tam.

---

## 8. Výpočty – trénink a regenerace

Všechny výpočty jako čisté funkce s testy. Parametry (okna, prahy) v nastavení s výchozími hodnotami níže.

### 8.1 Zátěž tréninku (session RPE)
`load = rpe (0–10, CR-10) × duration_min` [AU]. Foster 2001 – **výzkum**. Platí pro všechny sporty. Denní zátěž = součet.

### 8.2 Kondice, únava, forma (fitness–fatigue)
EWMA denní zátěže: kondice `CTL` (τ = 42 dní), únava `ATL` (τ = 7 dní), forma `TSB = CTL − ATL`. Banister – **výzkum (model)**; v UI uvést, že jde o model trendu, ne přesnou předpověď. Potřebuje ≥ 28 dní dat, jinak zobrazit „sbírám data“.

Výpočet: `X(t) = X(t−1) + (zátěž(t) − X(t−1)) × (1 − e^(−1/τ))`, od nuly v den první zapsané zátěže; dny bez tréninku mají zátěž 0.

### 8.3 Poměr akutní/chronické zátěže (ACWR)
EWMA varianta (Williams 2017): `ACWR = EWMA7 / EWMA28`, kde `EWMA(t) = zátěž(t) × λ + (1 − λ) × EWMA(t−1)`, `λ = 2 / (N + 1)` a první hodnota = první zátěž. Počítá se až od 28 dní dat. Použít **jen jako upozornění** při prudkém nárůstu (výchozí > 1,5). Uvést, že metoda je kritizována (Impellizzeri 2020). Štítek: **výzkum (sporný)**.

### 8.4 Monotónnost a strain
Za posledních 7 dní: `monotony = mean(daily_load) / sd(daily_load)`, `strain = sum(daily_load) × monotony`. Upozornění při monotony > 2,0 (Foster 1998) – **výzkum**. Směrodatná odchylka je výběrová (n − 1); při stejné zátěži každý den (odchylka 0) se monotónnost zastaví na 10. Počítá se až od 7 dní dat.

### 8.5 Svalový objem (panáček)
- Efektivní série: `sets` s RIR ≤ 4, nebo bez RIR u `strength` s ≥ 60 % odhadovaného 1RM (cviky s vlastní vahou viz níže); `hold` série s výdrží blízko maxima (≥ 70 % osobního maxima výdrže); EMOM/AMRAP/komplex: série = počet kol, jen pokud RPE bloku/tréninku ≥ 7.
- Primární partie = 1 série, sekundární = 0,5.
- Doporučený rozsah 10–20 týdně na partii (Schoenfeld 2017 dose-response) – **výzkum**.
- Regenerace partie: čas od posledního dne s ≥ 3 efektivními sériemi (tréninky jednoho dne se sčítají); pásma 24/48/72 h – **praxe**.
- Odhad 1RM a maximum výdrže pro posouzení série se berou z historie do daného tréninku včetně – pozdější rekord starší týdny nepřepočítá.
- Žebřík (série = počet příček) a blok „na čas“ (1 série) se počítají při RPE tréninku ≥ 7 – **praxe**.
- **Cviky s vlastní vahou bez RIR** (rozhodnuto 9. 10. 2026, **praxe**): rezerva se odhadne jako maximum opakování minus odcvičená opakování. Maximum = nejvíc z testu maxima (`max_reps`), ze série se zapsaným RIR (opakování + RIR) a ze série do selhání, vždy z historie do daného tréninku; pro sérii s přívažkem platí jen maxima se stejným nebo větším přívažkem. Série s odhadnutou rezervou do prahu RIR (výchozí 4) je efektivní. Série dál od maxima se nezahodí, ale počítá se poměrem opakování k maximu (10 × 10 kliků při maximu 30 = 3,3 série) – jinak by se denní počítadlo a časté submaximální série v objemu vůbec neprojevily; stejně se počítá i série se zapsaným RIR nad prahem. Platí ve všech sportech, tedy i pro shyby zapsané v posilovně.
- **Když maximum doložené není** (žádný test, žádný RIR, žádná série do selhání), bere se za něj nejdelší zapsaná série. Kdo cvičí jen daleko od maxima, tomu objem vyjde vyšší, než je – takové série karta Tělo spočítá a nabídne test maxima.
- Série bez RIR, kterou nejde posoudit ani takto (mimo posilovnu se závažím, bez opakování), se nepočítá; karta Tělo ukáže, kolik jich za týden bylo.
- Kalistenika: kliky ≈ 64 % tělesné hmotnosti (Ebben 2011) – `bodyweight_fraction` v knihovně; ostatní cviky s vlastní vahou orientační hodnoty označené **praxe**.

### 8.6 Odhad 1RM
Epley: `1RM = kg × (1 + reps/30)`, jen pro `reps ≤ 10` a `kind: grind`. U kalisteniky s přívažkem `kg = tělesná hmotnost × bodyweight_fraction + added_kg` (tělesná hmotnost = poslední zapsaná). U švihových cviků (swing, clean, snatch) se **nepočítá**; sleduje se nejtěžší zvon × opakování a hustota (opakování / min). V rekordech, grafech a cílech se u cviků s vlastní vahou odhaduje 1RM jen ze sérií s přívažkem – bez něj by odhad jen kopíroval tělesnou hmotnost.

### 8.7 Běh
- Tempo min/km, osobní rekordy na 1, 5, 10 km, půlmaraton, maraton (z nejrychlejších úseků, pokud jsou data; jinak z celých běhů dané vzdálenosti ±2 %).
- Odhad závodního času – Riegel: `T2 = T1 × (D2/D1)^1.06` – **výzkum** (s upozorněním na nepřesnost u delších tratí).
- Tepové zóny: HRmax změřený (nastavení), jinak Tanaka `208 − 0,7 × věk` – **výzkum**. Zóny přes rezervu tepu (Karvonen), s klidovým tepem z check-inů (průměr posledních 7 měření); pět zón po 10 % rezervy od 50 % – **praxe**. Bez klidového tepu z podílu maxima.
- Rozložení intenzit 80/20 (Seiler 2010; Stöggl & Sperlich 2014): podíl času v zónách 1–2 vs. 3–5 za 4 týdny – **výzkum**.
- Pravidlo „+10 % týdně“ se **nepoužívá** jako pravidlo (Buist 2008), max. jako informace.

### 8.8 HRV
- Pracovat s `lnRMSSD = ln(rmssd_ms)`.
- 7denní klouzavý průměr vs. osobní norma = průměr ± 0,5 SD za posledních 60 dní (min. 14 měření, jinak „sbírám data“). Plews a kol. 2012/2013 – **výzkum**.
- Stejně klidový tep (7denní průměr vs. 60denní norma).
- Sedmidenní průměr se hodnotí, jen když jsou v okně aspoň 3 měření – **praxe**. SD je výběrová. V grafu se hodnoty převádějí zpět na milisekundy.
- Skóre Elongy („připravenost“, „stres“, „funkční věk“) se jen zobrazí, **do pravidel nevstupují** (LF/HF metriky a složená skóre nemají dostatečnou nezávislou validaci).

### 8.9 Připravenost dne (0–100)
Transparentní složené skóre – **praxe** (jednotlivé složky jsou podložené, jejich vážení je heuristika; v UI to tak napsat):
- HRV 7d vs. norma (pod / v / nad),
- klidový tep 7d vs. norma,
- spánek: délka vs. 7 h (Watson 2015, AASM/SRS – **konsenzus**) a vs. osobní průměr, kvalita,
- subjektivní check-in (únava, bolest svalů, nálada, stres; Saw 2016 – subjektivní ukazatele citlivější než objektivní – **výzkum**),
- forma TSB.
Chybějící složky se vynechají a váhy přepočítají; UI ukáže rozpad.

Bodování složek (0–100) a váhy – **praxe**:
- HRV, váha 25: pod normou 30, v normě 80, nad normou 90. Klidový tep, váha 10: nad normou 30, v normě 80, pod normou 90.
- Spánek, váha 25: délka = 100 od cílové délky, každá hodina pod ní −25; kvalita 1–5 → 0–100; výsledek 60 % délka + 40 % kvalita; −10, když je spánek aspoň o hodinu kratší než osobní průměr za 28 dní (aspoň 7 nocí).
- Pocity, váha 25: průměr vyplněných škál 1–5 → 0–100.
- Forma, váha 15: `60 + 100 × TSB / CTL`, oříznuto na 0–100.
- Slovní hodnocení: od 70 „připraveno“, 45–69 „s rozmyslem“, pod 45 „lehce nebo volno“.
- **Trend** (karta Připravenost): skóre posledních 14 dní jako sloupce pevné výšky a průměr posledních 7 dnů proti 7 dnům před nimi (průměr jen z týdne s aspoň 3 skóre, jinak „sbírám data“). Každý den se počítá jen z toho, co bylo známé ten den; den bez denní poznámky skóre nemá. Důvod: jedno denní číslo má malou výpovědní hodnotu, smysl dává směr za několik dní – **praxe**.

---

## 9. Výpočty – progres a rekordy

9.1 **Osobní rekordy**: nejvyšší 1RM odhad, nejtěžší série pro počet opakování (1, 3, 5, 8, 10), max opakování s vlastní vahou, nejdelší výdrž, běžecké rekordy (8.7), nejdelší plavání, nejrychlejší 100 m průměr. Oznámení po uložení tréninku.
- „Nejtěžší série pro N opakování“ = nejtěžší váha (u vlastní váhy přívažek) v sérii s aspoň N opakováními. Opakování s dopomocí (záporný přívažek) se do maxima opakování nepočítají. Testy maxim (1RM, max opakování, max výdrž) se počítají také.
- Průměr na 100 m u plavání se počítá z délky celého tréninku (od 100 m).
- Oznámení po uložení **nového** tréninku: jen zlepšení dosavadní hodnoty (první výkon ve cviku rekordem není); z nejtěžších sérií se stejnou vahou jen ta s nejvíc opakováními.

9.2 **Série a odznaky**: týdenní cíl tréninků (nastavitelný), série splněných týdnů / dní programu, odznaky (první 10 km, 100 km za měsíc, 50 tréninků, první shyb). **Shovívavost**: dny nemoci a dovolené z plánu týdne (5.16) sérii nepřeruší – cíl týdne se sníží poměrně podle zbylých dnů (zaokrouhleno nahoru), plně omluvený týden se přeskočí a den programu v takový den se nepočítá. Běžné volno cíl nesnižuje. Série a odznaky jdou v nastavení vypnout (někoho motivují, někoho stresují).
- Týden = pondělí–neděle. Rozdělaný týden sérii nepřeruší; započítá se, jakmile je splněný. Záznamy denního počítadla se počítají jako trénink jen ve dnech bez jiného tréninku.
- Série dnů programu: po sobě jdoucí dny s úkoly, které jsou všechny splněné (dohledává se 90 dní zpět; dnešek bez splnění sérii nepřeruší).
- „První shyb“ = pracovní série shybů (nadhmatem, podhmatem, širokým úchopem, k hrudníku) bez dopomoci.

9.3 **Návrh navýšení („z minula“)**: pokud v posledním tréninku cviku byly všechny série splněny s RIR ≥ 2 → navrhnout +2,5 kg (horní polovina těla) / +5 kg (dolní) nebo +1–2 opakování; pokud RIR 0 nebo nesplněno → stejná váha. Progresivní přetížení, řízení podle RIR (Helms 2016) – **výzkum / praxe**.

9.4 **Deload**: navrhnout odlehčený týden, pokud ≥ 2 z: TSB dlouhodobě velmi záporné (výchozí < −20 % CTL 7 dní), HRV 7d pod normou ≥ 5 dní, zhoršující se check-in, stagnace výkonů 3 týdny – **praxe** (složky mají oporu, kombinace je heuristika).

Signály přesně: (a) forma pod −20 % kondice každý z posledních 7 dní; (b) sedmidenní průměr HRV pod normou aspoň 5 z posledních 7 dní; (c) průměr pocitů z check-inu za poslední 3 dny (aspoň 2 dny s check-inem) nejméně o 0,5 bodu nižší než za předchozích 14 dní (aspoň 5 dní); (d) žádný cvik s aspoň 2 tréninky za poslední 3 týdny nepřekonal své maximum z předchozích 6 týdnů (odhad 1RM, jinak opakování, jinak výdrž). Prahy (a), (b) a (d) jsou v nastavení.

9.5 **Měsíční souhrn**: automatická poznámka v `Souhrny/` – čísla, rekordy, srovnání s minulým měsícem. Souhrn za uplynulý měsíc se vytvoří po startu pluginu, když ještě neexistuje a v měsíci je aspoň jeden trénink; ručně příkazem „Vytvořit nebo obnovit měsíční souhrn“ a tlačítky na kartě Přehled. Obsah: tabulka (tréninky, dny, čas, zátěž, běh, plavání, zvednuto, průměrný spánek) se změnou proti předchozímu měsíci, rozpad podle sportu, změna hmotnosti a rekordy překonané v měsíci.

9.6 **Roční souhrn „Rok v číslech“**: poznámka `Souhrny/RRRR.md` (`forma: summary`, `year`), na vyžádání příkazem nebo tlačítkem na kartě Přehled. Obsah: srovnání s loňskem (tréninky, dny, čas, zátěž, běh, plavání, zvednuto, spánek), rozdělení podle sportu, tabulka po měsících, nejaktivnější měsíc, nejvíc tréninků za týden, nejdelší běh a trénink, změna hmotnosti a rekordy roku. Přepisuje se jen generovaný blok.

9.7 **Týdenní souhrn**: poznámka `Souhrny/Týden RRRR-MM-DD.md` (`forma: summary`, `week` = pondělí), na vyžádání příkazem (výchozí je minulý, dokončený týden; z otevřeného souhrnu jeho týden) nebo tlačítkem „Souhrn týdne“ na kartě Plán pro zobrazený týden. Obsah: stejná tabulka jako měsíční souhrn proti minulému týdnu, splnění plánu (splněno z plánovaných, vynecháno, odloženo), zátěž týdne jako násobek průměru čtyř předchozích týdnů, změna hmotnosti a nové rekordy. Automaticky se nevytváří.

---

## 10. Doporučovací engine

- Sada pravidel `Rule { id, evaluate(ctx) → Recommendation | null, sources: SourceId[], evidence }`.
- `Recommendation { level: info | suggest | warn, title, text, reasons[], sourceIds[], evidence, action? }`.
- Vstupní kontext: zátěž (8.1–8.4), svalový objem a regenerace (8.5), HRV, spánek, check-in, připravenost (8.9), bolesti, cíle, aktivní programy, plán dne.
- Výstup: seřazené podle závažnosti (varování, návrhy, informace; při shodě pořadí pravidel); max. 3 hlavní doporučení na kartě Dnes, zbytek rozbalitelný.
- Zdroje a štítek má definice pravidla a engine je doplní do každého doporučení; štítek nesmí být silnější než nejslabší zdroj pravidla (hlídá test).

Pravidla (minimum pro fázi 4):
1. Spánek < 7 h (nebo výrazně pod osobním průměrem) → lehčí den / přesunout těžký trénink (Watson 2015; Milewski 2014; Mah 2011).
2. HRV 7d pod normou → lehčí den; nad / v normě → podle plánu (Kiviniemi 2007; Plews 2013).
3. Prudký nárůst zátěže (ACWR > 1,5) → upozornění, nepřidávat (Gabbett 2016; s poznámkou Impellizzeri 2020).
4. Monotónnost > 2 → zařadit lehčí den (Foster 1998).
5. Partie pod 10 efektivními sériemi týdně (u partií, které uživatel cíleně trénuje) → návrh doplnit (Schoenfeld 2017).
6. Partie trénovaná < 48 h → netrénovat těžce (praxe).
7. Běh: podíl intenzivního času > 30 % za 4 týdny → víc lehkých běhů (Seiler 2010).
8. Aktivní bolest → vynechat / upravit cviky zatěžující partii; bolest ≥ 4/10 nebo > 7 dní bez zlepšení → doporučit odborníka (fyzioterapeut / lékař). Nikdy nediagnostikovat.
9. Deload (9.4).
10. Cíl ohrožen trendem → návrh úpravy plánu (praxe).
11. Program – denní výzva + zhoršený check-in / bolest partie → ubrat (praxe).
12. Plán týdne: očekávaná zátěž týdne nad prahem ACWR proti průměru 4 týdnů a v plánu ještě něco zbývá → zkrátit nebo zlehčit (Gabbett 2016; Impellizzeri 2020; odhad z plánu – praxe).
13. Plán týdne: těžká položka dnes a včera zapsaný těžký trénink (RPE od 7) → prohodit s lehčím dnem (praxe).
14. Výživa: trend váhy neodpovídá cíli a týdenní kontrola nabízí korekci (11.6) → odkaz na kartu Výživa (praxe).

Upřesnění: (1) spánek víc než 2 h pod cílem je varování, jinak návrh; „výrazně pod průměrem“ = aspoň o 60 min méně než průměr předchozích 28 dní (aspoň 7 nocí) – štítek konsenzus (nejslabší ze zdrojů). (2) HRV v normě / nad normou dává jen informaci „podle plánu“. (5) ozve se, jen když jsou za poslední 4 týdny zapsané nějaké efektivní série. (6) partie z dnešního nesplněného plánu programů = návrh, ostatní partie v regeneraci jen informace. (7) počítá se jen z běhů s časem v tepových zónách. (11) denní výzva = aktivní program na všech 7 dní s denním počítadlem; zhoršený check-in viz 9.4 (c).

---

## 11. Výživa – doporučený denní příjem

Zobrazovat **rozsahy**, rozpad výpočtu a zdroje. Upozornění: orientační, nejde o jídelníček od nutričního specialisty.

### 11.1 Klidový výdej (RMR)
- Výchozí: **ten Haaf & Weijs 2014** (vyvinuto a v metaanalýze u sportovců nejpřesnější – 80 % osob v ±10 %):
  `RMR = 11,936 × hmotnost_kg + 587,728 × výška_m − 8,129 × věk + 191,027 × muž(1/0) + 29,279`
- Pokud je zadáno % tuku: ten Haaf FFM verze `RMR = 22,771 × FFM_kg + 484,264` nebo Cunningham 1980 `RMR = 500 + 22 × FFM_kg` (volba v nastavení).
- Koeficienty ověřeny proti originální publikaci (PLoS One 9(10):e108460, rovnice v kcal/den; 3. 10. 2026); testy s ručně spočítanými hodnotami (muž 80 kg, 1,80 m, 30 let = 1 989,2 kcal; žena 60 kg, 1,65 m, 25 let = 1 512,0 kcal). Bez % tuku se u rovnic z FFM použije rovnice z hmotnosti (s poznámkou). Rozsah RMR ±10 %.
- Věk z roku narození v profilu, hmotnost z posledního check-inu (jinak profil), % tuku z posledního měření v denní poznámce (jinak profil).
- Zdroj přesnosti: metaanalýza „Accuracy of RMR Prediction Equations in Athletes“ (Sports Medicine 2023); obecná populace Frankenfield 2005.
- Volitelně **Mifflin–St Jeor 1990** pro běžnou populaci: `RMR = 9,99 × kg + 6,25 × výška_cm − 4,92 × věk + 166 × muž(1/0) − 161` (podle Frankenfield 2005 nejspolehlivější z běžných rovnic).
- ten Haafova rovnice vznikla na 90 rekreačních sportovcích 18–35 let trénujících aspoň 3 h týdně, v průměru 9 h (muži 62–100 kg, BMI 18,6–27; ženy 53–78 kg, BMI 17,9–26,7). U lehčích a méně trénujících vychází výš.
- **Která rovnice se k profilu hodí** (rozhodnuto 9. 10. 2026; pořadí podle zdrojů, pravidlo samo je **praxe**): 1. profil odpovídá skupině ten Haafovy studie (věk, hmotnost, BMI a průměr tréninku za poslední 4 týdny aspoň 3 h týdně, pokud je znám) → ten Haaf z hmotnosti – v metaanalýze u sportovců nejpřesnější (do ±10 % změřené hodnoty 80 % odhadů, ostatní rovnice 41–64 %), zatímco Mifflin–St Jeor u sportovců vychází se soustavnou odchylkou; 2. pravidelně trénující mimo tuto skupinu se zapsaným podílem tuku → Cunningham 1980 z beztukové hmoty (u sportovců bez soustavné odchylky, nezávisí na průměrné stavbě skupiny); 3. jinak Mifflin–St Jeor (běžná populace, Frankenfield 2005). Metaanalýza sama radí vybírat rovnici podle skupiny s podobnými vlastnostmi.
- **Rovnici mění jen uživatel.** Při prvním průvodci nastavením se vybere podle profilu; potom karta Výživa u klidového výdeje napíše, když se k profilu hodí jiná rovnice než zvolená, kolik by s ní vyšlo, a nabídne přepnutí jedním klepnutím. Automatické přepínání se zavrhlo: rovnice se liší asi o desetinu a na hranici skupiny (hmotnost, BMI, hodiny tréninku) by doporučený příjem přeskakoval ze dne na den.
- Příklad (muž 60 kg, 180 cm, 25 let, pod 3 h tréninku týdně): ten Haaf 1 791 kcal, Mifflin–St Jeor 1 606 kcal, Cunningham při 10 % tuku 1 688 kcal. Profil je mimo skupinu ten Haafovy studie hmotností, BMI i tréninkem, takže se nabídne Mifflin–St Jeor; den bez tréninku pak vyjde 2 250 kcal místo 2 510 kcal. Který odhad je blíž skutečnosti, ukáže až vývoj váhy (11.6).

### 11.2 Výdej z tréninku (čistý, nad klidový)
- Běh: ≈ 1 kcal × kg × km celkově (Margaria 1963, energetická cena běhu málo závisí na rychlosti); čistý výdej = celkový − RMR za dobu běhu.
- Ostatní: `kcal = (MET − 1) × kg × hodiny`, MET z Compendium of Physical Activities 2024 podle sportu a intenzity (RPE do 4 nízká, 5–6 střední, od 7 vysoká, bez RPE střední – **praxe**). Kódy (nízká / střední / vysoká): posilovna 02054 3,5 / 02052 5,0 / 02050 6,0; kalistenika 02024 2,8 / 02022 3,8 / 02020 7,5; kettlebell 02054 3,5 / 02050 6,0 / 02058 9,8; plavání 18240 5,8 / 18290 8,0 / 18230 9,8; švihadlo 02069 9,0 / 02068 11,0 / 02068 11,0; běh bez vzdálenosti 12020 7,5 / 12150 8,0 / 12180 10,0; ostatní 02030 3,5 / 02060 5,5 / 02062 7,8. Trénink bez délky se nepočítá (a je to vidět).
- Kalorie ze Stravy se nepoužívají.

### 11.3 Běžná aktivita mimo trénink
Koeficient nad RMR podle nastavení (sedavá / lehce aktivní / aktivní práce), např. 1,2 / 1,4 / 1,6 – **praxe** (uvést jako odhad). Týká se jen běžného dne mimo trénink (tréninky se přičítají zvlášť): sedavá = většinu dne sezení, lehce aktivní = část dne na nohou nebo hodně chůze, aktivní = fyzická práce. Vysvětlení je v nastavení i na kartě.

**Kroky místo odhadu:** když jsou v denní poznámce kroky (`steps`), koeficient se určí z nich. Kroky naběhané při běhu se odečítají (asi 1 000 na km – **praxe**), protože běh se počítá jako trénink. Pásma podle Tudor-Locke & Bassett 2004 (**výzkum**): pod 5 000 sedavý, 5 000–9 999 lehce aktivní, od 10 000 aktivní. Převod na koeficient je **praxe** a je plynulý, aby pár kroků kolem hranice neznamenalo skok: 2 500 kroků = koeficient „sedavá“, 7 500 = „lehce aktivní“, 12 500 = „aktivní“, mezi nimi přímka. Bez kroků toho dne se bere průměr z předchozích 7 dní (aspoň 3 záznamy), jinak úroveň z nastavení. Kroky jdou zapsat na kartě Výživa i v ranním check-inu (za včerejšek).

`TDEE = RMR × koeficient + čistý výdej z tréninků dne`.

### 11.4 Úprava podle cíle
- Udržování: 0.
- Hubnutí: deficit tak, aby tempo bylo 0,5–1 % hmotnosti týdně (Helms 2014) – **výzkum**; přepočet 1 kg ≈ 7 700 kcal – **praxe**.
- Udržování: rozsah = přesnost odhadu RMR (±10 %).
- Nabírání: mírný přebytek (výchozí +5–10 %) – **praxe**.
- **Pojistka energetické dostupnosti**: `EA = (příjem − čistý výdej z tréninku) / FFM`. Pokud by doporučený příjem vedl k EA pod ~30 kcal/kg FFM/den, doporučení se zvedne a zobrazí varování (IOC konsenzus RED-S 2023 – **konsenzus**, práh orientační). Nikdy nedoporučit příjem pod RMR. Varování se ukáže, jen když pojistka zvedla doporučení samo: při hubnutí spodní konec rozsahu (rychlejší tempo), při udržování a nabírání střed. Spodní konec rozsahu při udržování je jen nejistota odhadu RMR, ne záměr jíst míň – ten se na pojistce drží bez varování.

### 11.5 Makroživiny
- **Bílkoviny**: 1,6–2,2 g/kg, výchozí 2,0 g/kg (Morton 2018; novější analýzy Nunes 2022, Tagawa, IAAO studie ~1,7–2,0 g/kg průměrná potřeba). Při deficitu 2,3–3,1 g/kg FFM (Helms 2014). Rozložení ~0,3–0,4 g/kg na jídlo – informativně.
- **Sacharidy** podle dne (Thomas 2016 – ACSM/AND/DC – **konsenzus**):
  - lehký den / volno: 3–5 g/kg,
  - střední (~1 h/den): 5–7 g/kg,
  - vysoký (1–3 h/den střední–vysoká intenzita): 6–10 g/kg,
  - velmi vysoký (4–5 h/den): 8–12 g/kg.
  Kategorie dne podle zapsaných tréninků – **praxe**: od 4 h velmi vysoký; pod 45 min nebo méně než 30 min ve střední a vyšší intenzitě lehký; do 1,5 h střední; jinak vysoký. Nesplněné položky plánu týdne (5.16) se počítají jako tréninky s plánovanou délkou a odhadem RPE z intenzity; bez plánu si zátěž dne dopředu uživatel vybere ručně.
- **Tuky**: zbytek energie, minimálně 20 % energie (Thomas 2016).
- Pokud součet nevyjde (vysoké sacharidy + deficit), priorita: bílkoviny → minimum tuků → sacharidy; ukázat hlášku.
- Energetická dostupnost se počítá z beztukové hmoty; bez % tuku z celé hmotnosti (přísnější odhad, s poznámkou). Hlásí se jen pojistka, která opravdu zvedla příjem (EA, nebo RMR).

### 11.6 Kontrola podle váhy; budoucí adaptivní výdej
**Hotovo (bez zápisu jídla) – „Co říká váha“:** trend = přímka metodou nejmenších čtverců přes vážení za posledních 21 dní (aspoň 5 vážení v rozpětí aspoň 14 dní, jinak „sbírám data“). Z něj změna v kg a % hmotnosti za týden a odpovídající denní bilance (1 kg ≈ 7 700 kcal) – **praxe**. Porovnání s cílem:
- udržování: do ±0,25 % hmotnosti týdně „váha drží“, jinak návrh, o kolik kcal denně příjem upravit;
- hubnutí: v rozsahu zvoleného tempa (0,5–1 %/týden, Helms 2014) / pomaleji / rychleji / opačným směrem;
- nabírání: v rozsahu zvoleného přebytku / pomaleji / rychleji / opačným směrem.
Návrh úpravy se zaokrouhluje na 50 kcal. Skutečný výdej se z toho spočítat nedá – jen jestli je příjem nad, nebo pod ním.

**Budoucí:** až bude zápis jídla, odhad skutečného výdeje z trendu hmotnosti a příjmu za 2–3 týdny a postupná korekce TDEE.

**Týdenní kontrola – osobní korekce výdeje** (**praxe**): když trend váhy neodpovídá cíli a doporučená úprava je aspoň 100 kcal, karta Výživa nabídne posunout odhad výdeje o tuto hodnotu (nastavení `nutrition.correctionKcal`, rozsah ±500 kcal). Předpoklad je, že se uživatel doporučení zhruba držel – bez zápisu jídla to přesněji nejde a v rozhraní je to řečeno. Korekce se přičítá k výdeji před pojistkami (RMR, energetická dostupnost platí dál) a je vidět v rozpadu výpočtu. Po úpravě se další nenabízí 21 dní, dokud trend váhy neobsahuje jen dny po ní. Korekci jde zrušit. Když doporučení už stojí na pojistce (RMR nebo energetická dostupnost), korekce směrem dolů se nenabízí – nic by nezměnila; místo ní je vysvětlení a odkaz na odborníka.

---

## 12. Nastavení (vše nastavitelné, nic napevno)

- Profil: jméno (volitelné), pohlaví, rok narození, výška, aktuální hmotnost (z denních poznámek), % tuku (volitelně), HRmax (volitelně), aktivita mimo trénink, cíl (hubnutí / udržování / nabírání).
- Režim: plný / Základ.
- Složky vaultu.
- Sporty zapnuté / vypnuté.
- Vybavení: kettlebelly, boty a limity km.
- Strava: Client ID, Secret, připojení / odpojení, typy aktivit, poslední synchronizace.
- Prahy a okna výpočtů (výchozí dle kap. 8–11) s tlačítkem „obnovit výchozí“, včetně kritéria postupu v dovednostech (5.6) a signálů odlehčeného týdne (9.4).
- Týdenní cíl tréninků, partie „cíleně trénuji“.
- Cíle u suplementů (oblasti přínosu) a způsob stravování (běžná / vegetariánská / veganská) – nastavují se na kartě Suplementy.
- Výživa: rovnice klidového výdeje, koeficienty aktivity (1,2 / 1,4 / 1,6), tempo hubnutí (0,5–1 %/týden), přebytek při nabírání (5–10 %), bílkoviny (2 g/kg).
- Složka záloh.
- Jednotky (kg, km) – připravit, výchozí metrické.

---

## 13. Fáze a akceptační kritéria

**Fáze 1 – Základ zápisu**
- Kostra pluginu, view s kartami, nastavení, vytvoření složek, předplněná knihovna cviků (≥ 60 cviků: posilovna, kalistenika, kettlebell, kardio, s partiemi).
- Denní poznámka, ranní check-in (spánek, pocity, HRV z Elongy, váha).
- Zápis tréninku všech sportů, bloky (sets, hold, EMOM, AMRAP, žebřík, komplex, na čas), RPE, šablony, „z minula“, uložení jako šablona.
- Režim Základ (4 karty, rychlý zápis, vstupní test).
- Programy: datový model, vlastní program, předpřipravené programy, denní počítadlo.
- Suplementy (5.13): evidence, dodržování, doporučení se zdroji.
- ✅ Kritérium: uživatel zapíše trénink ze šablony do 1 minuty; data jsou čitelná v Obsidianu bez pluginu; testy výpočtů zátěže procházejí.

**Fáze 2 – Strava a běh**
- OAuth, synchronizace, doplnění importu, zóny, evidence bot, běžecké rekordy.
- ✅ Kritérium: nový běh ze Stravy se po synchronizaci objeví jako trénink k doplnění, bez duplicit.

**Fáze 3 – Přehledy**
- Přehled (grafy, heatmapa, rekordy, odhad závodu), Tělo (panáček dle 5.5), Dovednosti, měsíční souhrn, série a odznaky.
- ✅ Kritérium: najetí na partii nic neposouvá; čísla v panáčkovi odpovídají testovaným výpočtům 8.5.

**Fáze 4 – Doporučení a cíle**
- Výpočty 8.2–8.4, 8.8, 8.9, doporučovací engine (kap. 10), cíle a normy, bolesti a zranění, deload.
- ✅ Kritérium: každé doporučení má důvod, zdroj a štítek; všechna pravidla mají testy.

**Fáze 5 – Výživa a doplňky**
- Kap. 11, export CSV, záloha.
- ✅ Kritérium: výpočty RMR ověřené proti publikovaným příkladům; pojistka EA funguje.

**Plán týdne (5.16)** – doplněno po fázi 5
- Poznámka `forma: plan`, karta Plán, napojení na Dnes, výživu a doporučení.
- ✅ Kritérium: naplánování tréninku do půl minuty; zapsaný trénink položku sám splní; výpočty stavu, zátěže a výhledu mají testy.

**Později**: zápis jídla + adaptivní výdej, import HRV/spánku přes Health Connect (pokud Elonga umožní), srovnání s kamarádem, publikace do katalogu komunitních pluginů, živý zápis tréninku s časovačem pauzy (7. 10. 2026 odloženo). K plánu týdne (5.16): automatické sestavení plánu pluginem, přetahování položek myší, export plánu do kalendáře.

### Největší problémy (stav k 15. 10. 2026)

Seřazeno podle závažnosti. Jsou to slabiny celku, ne jednotlivé úkoly – ty jsou v „Otevřených bodech“ níže.

1. **Ve skutečném Obsidianu chybí ověřit importy, výživu a mobil.** Podle testovacího seznamu (15. 10. 2026) je v Obsidianu ověřené: zápis tréninku ze šablon (včetně osy s kotouči, označení sérií a supersetu), panáček, check-in a denní poznámka, plán týdne se souhrnem, celá karta Suplementy, Přehled a historie cviků; dřív mazání z rozhraní a import GPX. Neověřené zůstávají importy TCX, FIT, Strong/Hevy a denního CSV, karta Výživa, měsíční a roční souhrn. Na mobilu plugin neběžel vůbec, ačkoli `manifest.json` tvrdí, že tam funguje.
2. **Rozsah předběhl používání.** Jedenáct karet, přes dvacet příkazů, 268 cviků, 72 suplementů a šest importů – a plugin zatím nikdo nepoužívá déle než pár dní. Postup po fázích se schválením (začátek této kapitoly) se od fáze 2 nedodržuje. Není ověřené ani to hlavní: že check-in zabere půl minuty a zápis tréninku minutu až dvě.
3. **Importy stojí na ručně sestavených souborech.** Ze šesti cest (GPX, TCX, FIT, Strong a Hevy, denní CSV, Strava API) je na skutečných datech ověřená jedna – GPX ze Stravy, a to bez tepu. Čtečka FIT je napsaná podle popisu formátu a skutečný soubor z hodinek neviděla.
4. **Odhad výdeje ve výživě zůstává odhadem.** Výběr rovnice a hlášení pojistek je od 9. 10. 2026 rozhodnuté (11.1, 11.4), ale rovnice mají přesnost ±10 % a mezi sebou se liší o podobnou hodnotu; ověřit ho může jen vývoj váhy za několik týdnů (11.6), případně zápis jídla. V testovacím vaultu zatím není jediné vážení.
5. **Objem u cviků s vlastní vahou je odhad.** Od 9. 10. 2026 se série bez RIR počítají podle maxima opakování (8.5), takže kliky a shyby se na panáčkovi ukážou. Bez testu maxima nebo aspoň jednoho RIR se ale za maximum bere nejdelší zapsaná série a objem pak může vycházet vyšší, než je.
6. **Katalog suplementů je nejcitlivější a nejhůř udržitelná část.** U 14 látek doplněných 8. 10. 2026 jsou popisy výsledků z abstraktů, ne z plných textů; tři upozornění (psyllium a léky, zázvor a léky na ředění krve, THC v přípravcích s CBD) nemají zdroj v katalogu; neexistuje postup, jak katalog aktualizovat, když vyjde nový výzkum.
7. **Denní data se opisují ručně.** HRV z Elongy importovat nejde (6.2) a připravenost i polovina doporučení stojí na každodenním check-inu; když ho uživatel vynechá, není z čeho počítat.
8. **Ověřovací nástroj není v repozitáři.** Náhled obrazovek v prohlížeči existuje jen v dočasné složce a rozhraní nemá žádné automatické testy – po změně vzhledu ho nejde spolehlivě zkontrolovat.
9. **Plugin není v katalogu Obsidianu.** Vydání se zakládá samo po pushi tagu s číslem verze (workflow „Vydání“) a plugin jde nainstalovat ručně nebo přes BRAT; do katalogu komunitních pluginů zatím nebyl odeslán. Anglické rozhraní (od 0.2.0) v Obsidianu ještě nikdo neprošel.

### Otevřené body (k dořešení)

1. **Výživa – přesnost odhadu výdeje** (zjištěno 4. 10. 2026 při testu na lehkém, málo trénujícím profilu: den bez tréninku vyšel podle ten Haafa zhruba o desetinu výš než podle Mifflin–St Jeor a působil nadsazeně; ověřené to není – rozhodne až vývoj váhy). Zatím zmírněno (volba Mifflin–St Jeor, upozornění mimo rozsah studie, vysvětlení úrovní aktivity, střed místo rozsahu, kroky místo odhadu aktivity, kontrola podle trendu váhy). Zbývá rozhodnout:
   - ~~výchozí rovnice~~ – rozhodnuto 9. 10. 2026: rovnici doporučuje plugin podle profilu a přepíná ji uživatel (11.1);
   - výchozí úroveň aktivity (teď „lehce aktivní“ = 1,4) a koeficienty 1,2 / 1,4 / 1,6 zůstávají (rozhodnuto 9. 10. 2026): tréninky se přičítají zvlášť a koeficient kryje jen běžný den; bez vlastních dat není podle čeho je zpřesnit – přesnější je zapisovat kroky;
   - ~~pojistka energetické dostupnosti při udržování~~ – rozhodnuto 9. 10. 2026: bez % tuku se dál počítá z celé hmotnosti (přísnější), ale při udržování už nevaruje kvůli spodnímu konci rozsahu (11.4);
   - převod kroků na koeficient (kotvy 2 500 / 7 500 / 12 500 kroků) je odhad – ověřit na vlastních datech;
   - ověření proti skutečnosti: karta „Co říká váha“ ukáže směr po 2–3 týdnech vážení; skutečný výdej až se zápisem jídla (11.6).
2. ~~Efektivní série bez RIR u cviků s vlastní vahou~~ – rozhodnuto 9. 10. 2026 (8.5). Zbývá ověřit na vlastních datech, jestli poměrné započítání submaximálních sérií dává rozumná čísla u denního počítadla; série se závažím mimo posilovnu (kettlebell) se bez RIR dál nepočítají.
3. **Strava proti skutečnému API** – zatím vyzkoušeno jen na testech. Od června 2026 je pro založení API aplikace potřeba předplatné Stravy (zjištěno 5. 10. 2026), takže integrace zůstává neověřená, dokud ji nevyzkouší někdo s předplatným. Náhradou je import běhu ze souboru (6.3); na skutečném exportu GPX ze Stravy je ověřené, že vzdálenost, čas v pohybu a převýšení sedí s tím, co ukazuje Strava (6. 10. 2026; soubor byl bez tepu). Neověřené zůstává načtení tepu ze skutečného souboru a TCX z MapMyRun – ty jsou vyzkoušené jen na ručně sestavených souborech. Formát FIT (původní soubory z hodinek) přibyl 9. 10. 2026, ověřený je jen na ručně sestaveném souboru.
4. **Vyzkoušení fází 2–5 v Obsidianu** uživatelem (akceptační kritéria kap. 13).
5. **Funkce z průzkumu trhu (10/2026)** – trend připravenosti, kalkulačka kotoučů, roční souhrn, detail cviku, volné dny a shovívavé série, druh série a supersety, týdenní kontrola výživy, tělesné míry, import ze Strong a Hevy: ověřené testy a v náhledu, v Obsidianu zatím ne; import ze Strong a Hevy navíc jen na ručně sestavených souborech. Stejně tak novější přídavky (10/2026): obrázek osy, přípravek podle etikety, filtry suplementů, součet limitů, import FIT, import denních dat z CSV a týdenní souhrn.

---

## 14. Zdroje

- Foster C. et al. (2001) A new approach to monitoring exercise training. *J Strength Cond Res* – session RPE.
- Foster C. (1998) Monitoring training in athletes with reference to overtraining syndrome. *Med Sci Sports Exerc* – monotónnost, strain.
- Banister E. W. – impulse-response (fitness–fatigue) model.
- Williams S. et al. (2017) Better way to determine the acute:chronic workload ratio? *Br J Sports Med* – EWMA ACWR.
- Gabbett T. J. (2016) The training–injury prevention paradox. *Br J Sports Med*.
- Impellizzeri F. M. et al. (2020) Acute:chronic workload ratio: conceptual issues and fundamental pitfalls. *Int J Sports Physiol Perform*.
- Schoenfeld B. J., Ogborn D., Krieger J. W. (2017) Dose-response relationship between weekly resistance training volume and increases in muscle mass. *J Sports Sci*.
- Helms E. R. et al. (2016) Application of the repetitions in reserve-based RPE scale for resistance training. *Strength Cond J*.
- Ebben W. P. et al. (2011) Kinetic analysis of several variations of push-ups. *J Strength Cond Res*.
- Kikuchi N., Nakazato K. (2017) Low-load bench press and push-up induce similar muscle hypertrophy and strength gain. *J Exerc Sci Fit*.
- Kotarsky C. J. et al. (2018) Effect of progressive calisthenic push-up training on muscle strength and thickness. *J Strength Cond Res*.
- Lake J. P., Lauder M. A. (2012) Kettlebell swing training improves maximal and explosive strength. *J Strength Cond Res*.
- Farrar R. E. et al. (2010) Oxygen cost of kettlebell swings. *J Strength Cond Res*.
- Seiler S. (2010) What is best practice for training intensity and duration distribution in endurance athletes? *Int J Sports Physiol Perform*.
- Stöggl T., Sperlich B. (2014) Polarized training has greater impact on key endurance variables than threshold, high intensity, or high volume training. *Front Physiol*.
- Buist I. et al. (2008) No effect of a graded training program on the number of running-related injuries in novice runners. *Am J Sports Med*.
- Riegel P. S. (1981) Athletic records and human endurance. *American Scientist*.
- Tanaka H., Monahan K. D., Seals D. R. (2001) Age-predicted maximal heart rate revisited. *J Am Coll Cardiol*.
- Plews D. J. et al. (2012, 2013) HRV v monitorování tréninku (klouzavé průměry lnRMSSD). *Eur J Appl Physiol*; *Sports Med*.
- Kiviniemi A. M. et al. (2007) Endurance training guided individually by daily heart rate variability measurements. *Eur J Appl Physiol*.
- Watson N. F. et al. (2015) Recommended amount of sleep for a healthy adult (AASM & SRS). *Sleep*.
- Milewski M. D. et al. (2014) Chronic lack of sleep is associated with increased sports injuries in adolescent athletes. *J Pediatr Orthop*.
- Mah C. D. et al. (2011) The effects of sleep extension on the athletic performance of collegiate basketball players. *Sleep*.
- Saw A. E., Main L. C., Gastin P. B. (2016) Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures. *Br J Sports Med*.
- ten Haaf T., Weijs P. J. M. (2014) Resting energy expenditure prediction in recreational athletes of 18–35 years: confirmation of Cunningham equation and an improved weight-based alternative. *PLoS One* 9(10):e108460. https://doi.org/10.1371/journal.pone.0108460
- Cunningham J. J. (1980) A reanalysis of the factors influencing basal metabolic rate in normal adults. *Am J Clin Nutr*.
- Accuracy of Resting Metabolic Rate Prediction Equations in Athletes: A Systematic Review with Meta-analysis (2023). *Sports Med*. https://pmc.ncbi.nlm.nih.gov/articles/PMC10687135
- Tudor-Locke C., Bassett D. R. (2004) How many steps/day are enough? Preliminary pedometer indices for public health. *Sports Med* 34(1):1–8. https://doi.org/10.2165/00007256-200434010-00001 (doplněno a ověřeno 4. 10. 2026)
- Mifflin M. D., St Jeor S. T., Hill L. A., Scott B. J., Daugherty S. A., Koh Y. O. (1990) A new predictive equation for resting energy expenditure in healthy individuals. *Am J Clin Nutr* 51(2):241–247. https://doi.org/10.1093/ajcn/51.2.241 (doplněno a ověřeno 4. 10. 2026)
- Frankenfield D. et al. (2005) Comparison of predictive equations for resting metabolic rate. *J Am Diet Assoc*.
- Margaria R. et al. (1963) Energy cost of running. *J Appl Physiol*.
- Herrmann S. D. et al. (2024) Compendium of Physical Activities. https://pacompendium.com
- Thomas D. T., Erdman K. A., Burke L. M. (2016) Nutrition and Athletic Performance (ACSM / AND / DC joint position). *Med Sci Sports Exerc*. https://pubmed.ncbi.nlm.nih.gov/26891166/
- Morton R. W. et al. (2018) Protein supplementation and resistance training-induced gains: meta-analysis. *Br J Sports Med*. https://pubmed.ncbi.nlm.nih.gov/28698222/
- Nunes E. A. et al. (2022) Systematic review and meta-analysis of protein intake to support muscle mass and function. *J Cachexia Sarcopenia Muscle*.
- Helms E. R. et al. (2014) A systematic review of dietary protein during caloric restriction in resistance trained lean athletes. *Int J Sport Nutr Exerc Metab*; Helms et al. (2014) Evidence-based recommendations for natural bodybuilding contest preparation. *JISSN*.
- Mountjoy M. et al. (2023) IOC consensus statement on Relative Energy Deficiency in Sport (REDs). *Br J Sports Med*. https://pubmed.ncbi.nlm.nih.gov/37752011/
- NHS Couch to 5K.
- Maughan R. J. et al. (2018) IOC consensus statement: dietary supplements and the high-performance athlete. *Br J Sports Med* 52(7):439–455. https://pmc.ncbi.nlm.nih.gov/articles/PMC5867441/
- Kreider R. B. et al. (2017) International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine. *J Int Soc Sports Nutr* 14:18. https://link.springer.com/article/10.1186/s12970-017-0173-z
- Guest N. S. et al. (2021) International society of sports nutrition position stand: caffeine and exercise performance. *J Int Soc Sports Nutr* 18:1. https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221/
- Garrison S. R. et al. (2020) Magnesium for skeletal muscle cramps. *Cochrane Database Syst Rev* CD009402.
- Wilborn C. D. et al. (2004) Effects of zinc magnesium aspartate (ZMA) supplementation on training adaptations and markers of anabolism and catabolism. *J Int Soc Sports Nutr* 1(2):12–20.
- Qureshi A., Naughton D. P., Petroczi A. (2014) A systematic review on the herbal extract Tribulus terrestris and the roots of its putative aphrodisiac and performance enhancing effect. *J Diet Suppl* 11(1):64–79.
- Fernández-Lázaro D. et al. (2022) Effects of Tribulus terrestris L. on sport and health biomarkers in physically active adult males: a systematic review. *Int J Environ Res Public Health* 19(15):9533.
- Bonilla D. A. et al. (2021) Effects of ashwagandha (Withania somnifera) on physical performance: systematic review and Bayesian meta-analysis. *J Funct Morphol Kinesiol* 6(1):20.
- LiverTox – Ashwagandha. NIDDK (NIH). https://www.ncbi.nlm.nih.gov/books/NBK548536/
- Shin B.-C. et al. (2010) Maca (L. meyenii) for improving sexual function: a systematic review. *BMC Complement Altern Med* 10:44.
- Paulsen G. et al. (2014) Vitamin C and E supplementation hampers cellular adaptation to endurance training in humans. *J Physiol* 592(8):1887–1901.
- Hemilä H., Chalker E. (2013) Vitamin C for preventing and treating the common cold. *Cochrane Database Syst Rev* CD000980.
- EFSA (2024) Overview on Tolerable Upper Intake Levels (SCF / NDA). https://www.efsa.europa.eu/sites/default/files/2024-05/ul-summary-report.pdf
- EFSA NDA Panel (2012) Scientific Opinion on the Tolerable Upper Intake Level of EPA, DHA and DPA. *EFSA Journal* 10(7):2815.
- Lanhers C. et al. (2017) Creatine supplementation and upper limb strength performance: a systematic review and meta-analysis. Sports Med 47(1):163–173.
- Chilibeck P. D. et al. (2017) Effect of creatine supplementation during resistance training on lean tissue mass and muscular strength in older adults: a meta-analysis. Open Access J Sports Med 8:213–226.
- Grgic J. et al. (2020) Wake up and smell the coffee: caffeine supplementation and exercise performance – an umbrella review of 21 published meta-analyses. Br J Sports Med 54(11):681–688.
- Southward K., Rutherfurd-Markwick K. J., Ali A. (2018) The effect of acute caffeine ingestion on endurance performance: a systematic review and meta-analysis. Sports Med 48(8):1913–1928.
- Jäger R. et al. (2017) International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr 14:20.
- Saunders B. et al. (2017) β-alanine supplementation to improve exercise capacity and performance: a systematic review and meta-analysis. Br J Sports Med 51(8):658–669.
- Trexler E. T. et al. (2015) International society of sports nutrition position stand: Beta-Alanine. J Int Soc Sports Nutr 12:30.
- Farrokhyar F. et al. (2017) Effects of vitamin D supplementation on serum 25-hydroxyvitamin D concentrations and physical performance in athletes: a systematic review and meta-analysis of randomized controlled trials. Sports Med 47(11):2323–2339.
- Owens D. J., Allison R., Close G. L. (2018) Vitamin D and the athlete: current perspectives and new challenges. Sports Med 48(Suppl 1):3–16.
- Thielecke F., Blannin A. (2020) Omega-3 fatty acids for sport performance – are they equally beneficial for athletes and amateurs? A narrative review. Nutrients 12(12):3712.
- Jäger R. et al. (2025) International Society of Sports Nutrition Position Stand: long-chain omega-3 polyunsaturated fatty acids. J Int Soc Sports Nutr 22(1).
- Wang R. et al. (2017) The effect of magnesium supplementation on muscle fitness: a meta-analysis and systematic review. Magnes Res 30(4).
- Zhang Y. et al. (2017) Can magnesium enhance exercise performance? Nutrients 9(9):946.
- Koehler K. et al. (2009) Serum testosterone and urinary excretion of steroid hormone metabolites after administration of a high-dose zinc supplement. Eur J Clin Nutr 63:65–70.
- Hemilä H. (2017) Zinc lozenges and the common cold: a meta-analysis comparing zinc acetate and zinc gluconate, and the role of zinc dosage. JRSM Open 8(5).
- Bjelakovic G. et al. (2012) Antioxidant supplements for prevention of mortality in healthy participants and patients with various diseases. Cochrane Database Syst Rev CD007176.
- Woolf K., Manore M. M. (2006) B-vitamins and exercise: does exercise alter requirements? Int J Sport Nutr Exerc Metab 16(5):453–484.
- Pawlak R. et al. (2013) How prevalent is vitamin B12 deficiency among vegetarians? Nutr Rev 71(2):110–117.
- Ristow M. et al. (2009) Antioxidants prevent health-promoting effects of physical exercise in humans. Proc Natl Acad Sci USA 106(21):8665–8670.
- US Preventive Services Task Force (2022) Vitamin, mineral, and multivitamin supplementation to prevent cardiovascular disease and cancer: recommendation statement. JAMA 327(23).
- Mott A. et al. (2019) Effect of vitamin K on bone mineral density and fractures in adults: an updated systematic review and meta-analysis of randomised controlled trials. Osteoporos Int 30:1543–1559.
- McFarlin B. K., Henning A. L., Venable A. S. (2017) Oral consumption of vitamin K2 for 8 weeks associated with increased maximal cardiac output during exercise. Altern Ther Health Med 23(4).
- Wankhede S. et al. (2015) Examining the effect of Withania somnifera supplementation on muscle strength and recovery: a randomized controlled trial. J Int Soc Sports Nutr 12:43.
- Björnsson H. K. et al. (2020) Ashwagandha-induced liver injury: a case series from Iceland and the US Drug-Induced Liver Injury Network. Liver Int 40(4).
- Rogerson S. et al. (2007) The effect of five weeks of Tribulus terrestris supplementation on muscle strength and body composition during preseason training in elite rugby league players. J Strength Cond Res 21(2):348–353.
- Stone M. et al. (2009) A pilot investigation into the effect of maca supplementation on physical activity and sexual desire in sportsmen. J Ethnopharmacol 126(3):574–576.
- Lee M. S. et al. (2016) The use of maca (Lepidium meyenii) to improve semen quality: a systematic review. Maturitas 92:64–69.
- Lukaski H. C. (2004) Vitamin and mineral status: effects on physical performance. Nutrition 20(7–8):632–644.
- Sawka M. N. et al. (2007) American College of Sports Medicine position stand: exercise and fluid replacement. Med Sci Sports Exerc 39(2):377–390.
- Baker L. B. (2017) Sweating rate and sweat sodium concentration in athletes: a review of methodology and intra/interindividual variability. Sports Med 47(Suppl 1):111–128.
- EFSA (2017, doplněno 2019) Dietary Reference Values for nutrients: summary report. Sodík a chlorid: EFSA Journal 17(9):5778 a 5779.
- Wolfe R. R. (2017) Branched-chain amino acids and muscle protein synthesis in humans: myth or reality? J Int Soc Sports Nutr 14:30.
- Jackman S. R. et al. (2017) Branched-chain amino acid ingestion stimulates muscle myofibrillar protein synthesis following resistance exercise in humans. Front Physiol 8:390.
- Plotkin D. L. et al. (2021) Isolated leucine and branched-chain amino acid supplementation for enhancing muscular strength and hypertrophy: a narrative review. Int J Sport Nutr Exerc Metab 31(3).
- Fedewa M. V. et al. (2019) Effect of branched-chain amino acid supplementation on muscle soreness following exercise: a meta-analysis. Int J Vitam Nutr Res 89(5–6):348–356.
- Ferrando A. A. et al. (2023) International Society of Sports Nutrition Position Stand: effects of essential amino acid supplementation on exercise and performance. J Int Soc Sports Nutr 20(1):2263409.
- Trexler E. T. et al. (2019) Acute effects of citrulline supplementation on high-intensity strength and power performance: a systematic review and meta-analysis. Sports Med 49(5):707–718.
- Vårvik F. T., Bjørnsen T., Gonzalez A. M. (2021) Acute effect of citrulline malate on repetition performance during strength training: a systematic review and meta-analysis. Int J Sport Nutr Exerc Metab 31(4).
- Gough L. A. et al. (2021) A critical review of citrulline malate supplementation and exercise performance. Eur J Appl Physiol 121(12).
- Ramezani Ahmadi A. et al. (2019) The effect of glutamine supplementation on athletic performance, body composition, and immune function: a systematic review and a meta-analysis of clinical trials. Clin Nutr 38(3):1076–1091.
- Candow D. G. et al. (2001) Effect of glutamine supplementation combined with resistance training in young adults. Eur J Appl Physiol 86(2):142–149.
- Gleeson M. (2008) Dosing and efficacy of glutamine supplementation in human exercise and sport training. J Nutr 138(10):2045S–2049S.
- WHO/FAO/UNU (2007) Protein and amino acid requirements in human nutrition. Report of a joint expert consultation. WHO Technical Report Series 935.
- Elonga – nápověda k propojení: https://support.elonga.com/cs/support/solutions/articles/205000048307

Doplněno 3. 10. 2026 z podkladové rešerše (mimo repozitář); každá citace ověřena přes Crossref / PubMed (autoři, rok, časopis, DOI). Opravy proti podkladu: „Yi 2019“ má první autorku Han Q., „Granero-Gallegos 2020“ je ve skutečnosti Medellín Ruiz J. P. et al., Hewit 2018 má jediného autora.

- Antonio J. et al. (2021) Common questions and misconceptions about creatine supplementation: what does the scientific evidence really show? J Int Soc Sports Nutr 18:13. https://doi.org/10.1186/s12970-021-00412-w
- Avgerinos K. I. et al. (2018) Effects of creatine supplementation on cognitive function of healthy individuals: a systematic review of randomized controlled trials. Exp Gerontol 108:166–173. https://doi.org/10.1016/j.exger.2018.04.013
- Xu C., Bi S., Zhang W., Luo L. (2024) The effects of creatine supplementation on cognitive function in adults: a systematic review and meta-analysis. Front Nutr 11:1424972. https://doi.org/10.3389/fnut.2024.1424972
- Grgic J., Trexler E. T., Lazinica B., Pedisic Z. (2018) Effects of caffeine intake on muscle strength and power: a systematic review and meta-analysis. J Int Soc Sports Nutr 15:11. https://doi.org/10.1186/s12970-018-0216-0
- Drake C., Roehrs T., Shambroom J., Roth T. (2013) Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. J Clin Sleep Med 9(11):1195–1200. https://doi.org/10.5664/jcsm.3170
- Haskell C. F. et al. (2008) The effects of L-theanine, caffeine and their combination on cognition and mood. Biol Psychol 77(2):113–122. https://doi.org/10.1016/j.biopsycho.2007.09.008
- Owen G. N., Parnell H., De Bruin E. A., Rycroft J. A. (2008) The combined effects of L-theanine and caffeine on cognitive performance and mood. Nutr Neurosci 11(4):193–198. https://doi.org/10.1179/147683008X301513
- Giesbrecht T., Rycroft J. A., Rowson M. J., De Bruin E. A. (2010) The combination of L-theanine and caffeine improves cognitive performance and increases subjective alertness. Nutr Neurosci 13(6):283–290. https://doi.org/10.1179/147683010X12611460764840
- Rezende N. S. et al. (2020) The muscle carnosine response to beta-alanine supplementation: a systematic review with Bayesian individual and aggregate data E-max model and meta-analysis. Front Physiol 11:913. https://doi.org/10.3389/fphys.2020.00913
- Hill C. A. et al. (2007) Influence of β-alanine supplementation on skeletal muscle carnosine concentrations and high intensity cycling capacity. Amino Acids 32(2):225–233. https://doi.org/10.1007/s00726-006-0364-4
- Georgiou G. D. et al. (2024) Effect of beta-alanine supplementation on maximal intensity exercise in trained young male individuals: a systematic review and meta-analysis. Int J Sport Nutr Exerc Metab 34(6):397–412. https://doi.org/10.1123/ijsnem.2024-0027
- Bailey S. J. et al. (2009) Dietary nitrate supplementation reduces the O2 cost of low-intensity exercise and enhances tolerance to high-intensity exercise in humans. J Appl Physiol 107(4):1144–1155. https://doi.org/10.1152/japplphysiol.00722.2009
- Hoon M. W., Johnson N. A., Chapman P. G., Burke L. M. (2013) The effect of nitrate supplementation on exercise performance in healthy individuals: a systematic review and meta-analysis. Int J Sport Nutr Exerc Metab 23(5):522–532. https://doi.org/10.1123/ijsnem.23.5.522
- Wong T. H., Sim A., Burns S. F. (2022) The effects of nitrate ingestion on high-intensity endurance time-trial performance: a systematic review and meta-analysis. J Exerc Sci Fit 20(4):305–316. https://doi.org/10.1016/j.jesf.2022.06.004
- Silva K. V. C. et al. (2022) Factors that moderate the effect of nitrate ingestion on exercise performance in adults: a systematic review with meta-analyses and meta-regressions. Adv Nutr 13(5):1866–1881. https://doi.org/10.1093/advances/nmac054
- Poon E. T. et al. (2025) Dietary nitrate supplementation and exercise performance: an umbrella review of 20 published systematic reviews with meta-analyses. Sports Med 55(5):1213–1231. https://doi.org/10.1007/s40279-025-02194-6
- Grgic J. et al. (2021) International Society of Sports Nutrition position stand: sodium bicarbonate and exercise performance. J Int Soc Sports Nutr 18:61. https://doi.org/10.1186/s12970-021-00458-w
- Grgic J. et al. (2021) Effects of sodium bicarbonate supplementation on exercise performance: an umbrella review. J Int Soc Sports Nutr 18:71. https://doi.org/10.1186/s12970-021-00469-7
- Carr A. J., Hopkins W. G., Gore C. J. (2011) Effects of acute alkalosis and acidosis on performance: a meta-analysis. Sports Med 41(10):801–814. https://doi.org/10.2165/11591440-000000000-00000
- Grgic J. et al. (2020) Effects of sodium bicarbonate supplementation on muscular strength and endurance: a systematic review and meta-analysis. Sports Med 50(7):1361–1375. https://doi.org/10.1007/s40279-020-01275-y
- de Oliveira L. F. et al. (2022) Extracellular buffering supplements to improve exercise capacity and performance: a comprehensive systematic review and meta-analysis. Sports Med 52(3):505–526. https://doi.org/10.1007/s40279-021-01575-x
- Cermak N. M. et al. (2012) Protein supplementation augments the adaptive response of skeletal muscle to resistance-type exercise training: a meta-analysis. Am J Clin Nutr 96(6):1454–1464. https://doi.org/10.3945/ajcn.112.037556
- Antonio J. et al. (2024) Common questions and misconceptions about protein supplementation: what does the scientific evidence really show? J Int Soc Sports Nutr 21(1):2341903. https://doi.org/10.1080/15502783.2024.2341903
- Han Q. et al. (2019) Effects of vitamin D3 supplementation on serum 25(OH)D concentration and strength in athletes: a systematic review and meta-analysis of randomized controlled trials. J Int Soc Sports Nutr 16:55. https://doi.org/10.1186/s12970-019-0323-6
- Zhang L., Quan M., Cao Z. (2019) Effect of vitamin D supplementation on upper and lower limb muscle strength and muscle power in athletes: a meta-analysis. PLoS One 14(4):e0215826. https://doi.org/10.1371/journal.pone.0215826
- Sist M., Zou L., Galloway S. D. R., Rodriguez-Sanchez N. (2023) Effects of vitamin D supplementation on maximal strength and power in athletes: a systematic review and meta-analysis of randomized controlled trials. Front Nutr 10:1163313. https://doi.org/10.3389/fnut.2023.1163313
- Han Q. et al. (2024) Effects of vitamin D3 supplementation on strength of lower and upper extremities in athletes: an updated systematic review and meta-analysis of randomized controlled trials. Front Nutr 11:1381301. https://doi.org/10.3389/fnut.2024.1381301
- Martineau A. R. et al. (2017) Vitamin D supplementation to prevent acute respiratory tract infections: systematic review and meta-analysis of individual participant data. BMJ 356:i6583. https://doi.org/10.1136/bmj.i6583
- Jolliffe D. A. et al. (2021) Vitamin D supplementation to prevent acute respiratory infections: a systematic review and meta-analysis of aggregate data from randomised controlled trials. Lancet Diabetes Endocrinol 9(5):276–292. https://doi.org/10.1016/S2213-8587(21)00051-6
- Jolliffe D. A. et al. (2025) Vitamin D supplementation to prevent acute respiratory infections: systematic review and meta-analysis of stratified aggregate data. Lancet Diabetes Endocrinol 13(4):307–320. https://doi.org/10.1016/S2213-8587(24)00348-6
- Lv Z., Zhang J., Zhu W. (2020) Omega-3 polyunsaturated fatty acid supplementation for reducing muscle soreness after eccentric exercise: a systematic review and meta-analysis of randomized controlled trials. Biomed Res Int 2020:8062017. https://doi.org/10.1155/2020/8062017
- Li Z., Zhang B. (2026) Effects of omega-3 supplementation on inflammation and recovery in sports: a meta-analysis. FASEB J 40(7):e71709. https://doi.org/10.1096/fj.202504783R
- Liao Y. et al. (2019) Efficacy of omega-3 PUFAs in depression: a meta-analysis. Transl Psychiatry 9:190. https://doi.org/10.1038/s41398-019-0515-5
- Kelaiditis C. F., Gibson E. L., Dyall S. C. (2023) Effects of long-chain omega-3 polyunsaturated fatty acids on reducing anxiety and/or depression in adults; a systematic review and meta-analysis of randomised controlled trials. Prostaglandins Leukot Essent Fatty Acids 192:102572. https://doi.org/10.1016/j.plefa.2023.102572
- Lu Y., Qiao D., Mi G. (2024) Clinical impacts of n-3 fatty acids supplementation on depression symptoms: an umbrella review of meta-analyses. Br J Nutr 131(5):841–850. https://doi.org/10.1017/S000711452300226X
- Peters E. M., Goetzsche J. M., Grobbelaar B., Noakes T. D. (1993) Vitamin C supplementation reduces the incidence of postrace symptoms of upper-respiratory-tract infection in ultramarathon runners. Am J Clin Nutr 57(2):170–174. https://doi.org/10.1093/ajcn/57.2.170
- Constantini N. W. et al. (2011) The effect of vitamin C on upper respiratory infections in adolescent swimmers: a randomized trial. Eur J Pediatr 170(1):59–63. https://doi.org/10.1007/s00431-010-1270-z
- Carr A. C., Maggini S. (2017) Vitamin C and immune function. Nutrients 9(11):1211. https://doi.org/10.3390/nu9111211
- Akhgarjand C. et al. (2022) Does ashwagandha supplementation have a beneficial effect on the management of anxiety and stress? A systematic review and meta-analysis of randomized controlled trials. Phytother Res 36(11):4115–4124. https://doi.org/10.1002/ptr.7598
- Albalawi A. A. (2025) Dual impact of ashwagandha: significant cortisol reduction but no effects on perceived stress – a systematic review and meta-analysis. Nutr Health 31(4):1395–1408. https://doi.org/10.1177/02601060251363647
- Cheah K. L., Norhayati M. N., Yaacob L. H., Abdul Rahman R. (2021) Effect of ashwagandha (Withania somnifera) extract on sleep: a systematic review and meta-analysis. PLoS One 16(9):e0257843. https://doi.org/10.1371/journal.pone.0257843
- Rahimi M. H., Shab-Bidar S., Mollahosseini M., Djafarian K. (2017) Branched-chain amino acid supplementation and exercise-induced muscle damage in exercise recovery: a meta-analysis of randomized clinical trials. Nutrition 42:30–36. https://doi.org/10.1016/j.nut.2017.05.005
- Martinho D. V. et al. (2022) Oral branched-chain amino acids supplementation in athletes: a systematic review. Nutrients 14(19):4002. https://doi.org/10.3390/nu14194002
- Volpi E. et al. (2003) Essential amino acids are primarily responsible for the amino acid stimulation of muscle protein anabolism in healthy elderly adults. Am J Clin Nutr 78(2):250–258. https://doi.org/10.1093/ajcn/78.2.250
- Church D. D. et al. (2020) Essential amino acids and protein synthesis: insights into maximizing the muscle and whole-body response to feeding. Nutrients 12(12):3717. https://doi.org/10.3390/nu12123717
- Ispoglou T., Witard O. C., Duckworth L. C., Lees M. J. (2021) The efficacy of essential amino acid supplementation for augmenting dietary protein intake in older adults: implications for skeletal muscle mass, strength and function. Proc Nutr Soc 80(2):230–242. https://doi.org/10.1017/S0029665120008010
- Shaw G. et al. (2017) Vitamin C–enriched gelatin supplementation before intermittent activity augments collagen synthesis. Am J Clin Nutr 105(1):136–143. https://doi.org/10.3945/ajcn.116.138594
- Jerger S. et al. (2022) Effects of specific collagen peptide supplementation combined with resistance training on Achilles tendon properties. Scand J Med Sci Sports 32(7):1131–1141. https://doi.org/10.1111/sms.14164
- Bischof K., Moitzi A. M., Stafilidis S., König D. (2024) Impact of collagen peptide supplementation in combination with long-term physical training on strength, musculotendinous remodeling, functional recovery, and body composition in healthy adults: a systematic review with meta-analysis. Sports Med 54(11):2865–2888. https://doi.org/10.1007/s40279-024-02079-0
- Zdzieblik D. et al. (2015) Collagen peptide supplementation in combination with resistance training improves body composition and increases muscle strength in elderly sarcopenic men: a randomised controlled trial. Br J Nutr 114(8):1237–1245. https://doi.org/10.1017/S0007114515002810
- Khatri M. et al. (2021) The effects of collagen peptide supplementation on body composition, collagen synthesis, and recovery from joint injury and exercise: a systematic review. Amino Acids 53(10):1493–1506. https://doi.org/10.1007/s00726-021-03072-x
- O’Connor E. A. et al. (2022) Vitamin and mineral supplements for the primary prevention of cardiovascular disease and cancer: updated evidence report and systematic review for the US Preventive Services Task Force. JAMA 327(23):2334–2347. https://doi.org/10.1001/jama.2021.15650
- Sesso H. D. et al. (2022) Multivitamins in the prevention of cancer and cardiovascular disease: the COcoa Supplement and Multivitamin Outcomes Study (COSMOS) randomized clinical trial. Am J Clin Nutr 115(6):1501–1510. https://doi.org/10.1093/ajcn/nqac056
- Yeung L.-K. et al. (2023) Multivitamin supplementation improves memory in older adults: a randomized clinical trial. Am J Clin Nutr 118(1):273–282. https://doi.org/10.1016/j.ajcnut.2023.05.011
- Grodstein F. et al. (2013) Long-term multivitamin supplementation and cognitive function in men: a randomized trial. Ann Intern Med 159(12):806–814. https://doi.org/10.7326/0003-4819-159-12-201312170-00006
- Mah J., Pitre T. (2021) Oral magnesium supplementation for insomnia in older adults: a systematic review & meta-analysis. BMC Complement Med Ther 21:125. https://doi.org/10.1186/s12906-021-03297-z
- Boyle N. B., Lawton C., Dye L. (2017) The effects of magnesium supplementation on subjective anxiety and stress – a systematic review. Nutrients 9(5):429. https://doi.org/10.3390/nu9050429
- Nault D. et al. (2024) Zinc for prevention and treatment of the common cold. Cochrane Database Syst Rev CD014914. https://doi.org/10.1002/14651858.CD014914.pub2
- Science M., Johnstone J., Roth D. E., Guyatt G., Loeb M. (2012) Zinc for the treatment of the common cold: a systematic review and meta-analysis of randomized controlled trials. CMAJ 184(10):E551–E561. https://doi.org/10.1503/cmaj.111990
- Hunter J. et al. (2021) Zinc for the prevention or treatment of acute viral respiratory tract infections in adults: a rapid systematic review and meta-analysis of randomised controlled trials. BMJ Open 11(11):e047474. https://doi.org/10.1136/bmjopen-2020-047474
- Wang M. X., Win S. S., Pang J. (2020) Zinc supplementation reduces common cold duration among healthy adults: a systematic review of randomized controlled trials with micronutrients supplementation. Am J Trop Med Hyg 103(1):86–99. https://doi.org/10.4269/ajtmh.19-0718
- Prasad A. S. et al. (2000) Duration of symptoms and plasma cytokine levels in patients with the common cold treated with zinc acetate: a randomized, double-blind, placebo-controlled trial. Ann Intern Med 133(4):245–252. https://doi.org/10.7326/0003-4819-133-4-200008150-00006
- Jäger R. et al. (2019) International Society of Sports Nutrition position stand: probiotics. J Int Soc Sports Nutr 16:62. https://doi.org/10.1186/s12970-019-0329-0
- Zhao Y., Dong B. R., Hao Q. (2022) Probiotics for preventing acute upper respiratory tract infections. Cochrane Database Syst Rev CD006895. https://doi.org/10.1002/14651858.CD006895.pub4
- Coleman J. L. et al. (2022) Orally ingested probiotics, prebiotics, and synbiotics as countermeasures for respiratory tract infections in nonelderly adults: a systematic review and meta-analysis. Adv Nutr 13(6):2277–2295. https://doi.org/10.1093/advances/nmac086
- Cox A. J., Pyne D. B., Saunders P. U., Fricker P. A. (2010) Oral administration of the probiotic Lactobacillus fermentum VRI-003 and mucosal immunity in endurance athletes. Br J Sports Med 44(4):222–226. https://doi.org/10.1136/bjsm.2007.044628
- Ferracioli-Oda E., Qawasmi A., Bloch M. H. (2013) Meta-analysis: melatonin for the treatment of primary sleep disorders. PLoS One 8(5):e63773. https://doi.org/10.1371/journal.pone.0063773
- Cruz-Sanabria F. et al. (2024) Optimizing the time and dose of melatonin as a sleep-promoting drug: a systematic review of randomized controlled trials and dose–response meta-analysis. J Pineal Res 76(5):e12985. https://doi.org/10.1111/jpi.12985
- Menczel Schrire Z. et al. (2022) Safety of higher doses of melatonin in adults: a systematic review and meta-analysis. J Pineal Res 72(2):e12782. https://doi.org/10.1111/jpi.12782
- Choi K., Lee Y. J., Park S., Je N. K., Suh H. S. (2022) Efficacy of melatonin for chronic insomnia: systematic reviews and meta-analyses. Sleep Med Rev 66:101692. https://doi.org/10.1016/j.smrv.2022.101692
- Legault Z., Bagnall N., Kimmerly D. S. (2015) The influence of oral L-glutamine supplementation on muscle strength recovery and soreness following unilateral knee extension eccentric exercise. Int J Sport Nutr Exerc Metab 25(5):417–426. https://doi.org/10.1123/ijsnem.2014-0209
- Street B., Byrne C., Eston R. (2011) Glutamine supplementation in recovery from eccentric exercise attenuates strength loss and muscle soreness. J Exerc Sci Fit 9(2):116–122. https://doi.org/10.1016/S1728-869X(12)60007-0
- Burden R. J. et al. (2015) Is iron treatment beneficial in, iron-deficient but non-anaemic (IDNA) endurance athletes? A systematic review and meta-analysis. Br J Sports Med 49(21):1389–1397. https://doi.org/10.1136/bjsports-2014-093624
- Rubeor A., Goojha C., Manning J., White J. (2018) Does iron supplementation improve performance in iron-deficient nonanemic athletes? Sports Health 10(5):400–405. https://doi.org/10.1177/1941738118777488
- Sim M. et al. (2019) Iron considerations for the athlete: a narrative review. Eur J Appl Physiol 119(7):1463–1478. https://doi.org/10.1007/s00421-019-04157-y
- Pengelly M., Pumpa K., Pyne D. B., Etxebarria N. (2025) Iron deficiency, supplementation, and sports performance in female athletes: a systematic review. J Sport Health Sci 14:101009. https://doi.org/10.1016/j.jshs.2024.101009
- Nakamoto F. P., de Almeida K. M., Gonçalves L. C., dos Santos Quaresma M. V. L. (2026) Effect of iron supplementation on exercise performance of women with non-anemic iron deficiency or iron deficiency anemia – a systematic review and meta-analysis. J Trace Elem Miner 15:100275. https://doi.org/10.1016/j.jtemin.2025.100275
- Markun S. et al. (2021) Effects of vitamin B12 supplementation on cognitive function, depressive symptoms, and fatigue: a systematic review, meta-analysis, and meta-regression. Nutrients 13(3):923. https://doi.org/10.3390/nu13030923
- Pawlak R., Lester S. E., Babatunde T. (2014) The prevalence of cobalamin deficiency among vegetarians assessed by serum vitamin B12: a review of literature. Eur J Clin Nutr 68(5):541–548. https://doi.org/10.1038/ejcn.2014.46
- Gonzalez A. M., Trexler E. T. (2020) Effects of citrulline supplementation on exercise performance in humans: a review of the current literature. J Strength Cond Res 34(5):1480–1495. https://doi.org/10.1519/JSC.0000000000003426
- Rhim H. C., Kim S. J., Park J., Jang K.-M. (2020) Effect of citrulline on post-exercise rating of perceived exertion, muscle soreness, and blood lactate levels: a systematic review and meta-analysis. J Sport Health Sci 9(6):553–561. https://doi.org/10.1016/j.jshs.2020.02.003
- Morgado A. et al. (2024) Do “testosterone boosters” really increase serum total testosterone? A systematic review. Int J Impot Res 36(4):348–364. https://doi.org/10.1038/s41443-023-00763-9
- Pokrywka A. et al. (2014) Insights into supplements with Tribulus terrestris used by athletes. J Hum Kinet 41:99–105. https://doi.org/10.2478/hukin-2014-0037
- Shin D. et al. (2023) Efficacy and safety of maca (Lepidium meyenii) in patients with symptoms of late-onset hypogonadism: a randomized, double-blind, placebo-controlled clinical trial. World J Mens Health 41(3):692–700. https://doi.org/10.5534/wjmh.220112
- Lee H. W., Lee M. S., Kil K. J. (2023) Maca (L. meyenii) for erectile dysfunction: a systematic review and meta-analysis. J Mens Health 19(1):1–6. https://doi.org/10.22514/jomh.2023.003
- Knapen M. H. J., Drummen N. E., Smit E., Vermeer C., Theuwissen E. (2013) Three-year low-dose menaquinone-7 supplementation helps decrease bone loss in healthy postmenopausal women. Osteoporos Int 24(9):2499–2507. https://doi.org/10.1007/s00198-013-2325-6
- Li T., Wang Y., Tu W.-P. (2023) Vitamin K supplementation and vascular calcification: a systematic review and meta-analysis of randomized controlled trials. Front Nutr 10:1115069. https://doi.org/10.3389/fnut.2023.1115069
- Schoenfeld B. J., Ogborn D., Krieger J. W. (2016) Effects of resistance training frequency on measures of muscle hypertrophy: a systematic review and meta-analysis. Sports Med 46(11):1689–1697. https://doi.org/10.1007/s40279-016-0543-8
- Grgic J. et al. (2018) Effect of resistance training frequency on gains in muscular strength: a systematic review and meta-analysis. Sports Med 48(5):1207–1220. https://doi.org/10.1007/s40279-018-0872-x
- Refalo M. C. et al. (2023) Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy: a systematic review with meta-analysis. Sports Med 53(3):649–665. https://doi.org/10.1007/s40279-022-01784-y
- Schoenfeld B. J., Grgic J., Ogborn D., Krieger J. W. (2017) Strength and hypertrophy adaptations between low- vs. high-load resistance training: a systematic review and meta-analysis. J Strength Cond Res 31(12):3508–3523. https://doi.org/10.1519/JSC.0000000000002200
- Hamarsland H. et al. (2022) Equal-volume strength training with different training frequencies induces similar muscle hypertrophy and strength improvement in trained participants. Front Physiol 12:789403. https://doi.org/10.3389/fphys.2021.789403
- Pelland J. C. et al. (2025) The resistance training dose response: meta-regressions exploring the effects of weekly volume and frequency on muscle hypertrophy and strength gains. Sports Med 56(2):481–505. https://doi.org/10.1007/s40279-025-02344-w
- Schoenfeld B. J. (2010) Squatting kinematics and kinetics and their application to exercise performance. J Strength Cond Res 24(12):3497–3506. https://doi.org/10.1519/JSC.0b013e3181bac2d7
- Kubo K., Ikebukuro T., Yata H. (2019) Effects of squat training with different depths on lower limb muscle volumes. Eur J Appl Physiol 119(9):1933–1942. https://doi.org/10.1007/s00421-019-04181-y
- Bloomquist K. et al. (2013) Effect of range of motion in heavy load squatting on muscle and tendon adaptations. Eur J Appl Physiol 113(8):2133–2142. https://doi.org/10.1007/s00421-013-2642-7
- Hartmann H., Wirth K., Klusemann M. (2013) Analysis of the load on the knee joint and vertebral column with changes in squatting depth and weight load. Sports Med 43(10):993–1008. https://doi.org/10.1007/s40279-013-0073-6
- Yanagisawa O. et al. (2021) Acute effects of varying squat depths on lumbar intervertebral disks during high-load barbell back squat exercise. Scand J Med Sci Sports 31(2):350–357. https://doi.org/10.1111/sms.13850
- Swinton P. A. et al. (2011) A biomechanical analysis of straight and hexagonal barbell deadlifts using submaximal loads. J Strength Cond Res 25(7):2000–2009. https://doi.org/10.1519/JSC.0b013e3181e73f87
- Escamilla R. F. et al. (2002) An electromyographic analysis of sumo and conventional style deadlifts. Med Sci Sports Exerc 34(4):682–688. https://doi.org/10.1097/00005768-200204000-00019
- Martín-Fuentes I., Oliva-Lozano J. M., Muyor J. M. (2020) Electromyographic activity in deadlift exercise and its variants. A systematic review. PLoS One 15(2):e0229507. https://doi.org/10.1371/journal.pone.0229507
- Plotkin D. L. et al. (2023) Hip thrust and back squat training elicit similar gluteus muscle hypertrophy and transfer similarly to the deadlift. Front Physiol 14:1279170. https://doi.org/10.3389/fphys.2023.1279170
- Calatayud J. et al. (2015) Bench press and push-up at comparable levels of muscle activity results in similar strength gains. J Strength Cond Res 29(1):246–253. https://doi.org/10.1519/JSC.0000000000000589
- Yang J. et al. (2019) Association between push-up exercise capacity and future cardiovascular events among active adult men. JAMA Netw Open 2(2):e188341. https://doi.org/10.1001/jamanetworkopen.2018.8341
- Youdas J. W. et al. (2010) Surface electromyographic activation patterns and elbow joint motion during a pull-up, chin-up, or Perfect-Pullup rotational exercise. J Strength Cond Res 24(12):3404–3414. https://doi.org/10.1519/JSC.0b013e3181f1598c
- Dickie J. A., Faulkner J. A., Barnes M. J., Lark S. D. (2017) Electromyographic analysis of muscle activation during pull-up variations. J Electromyogr Kinesiol 32:30–36. https://doi.org/10.1016/j.jelekin.2016.11.004
- Lusk S. J., Hale B. D., Russell D. M. (2010) Grip width and forearm orientation effects on muscle activity during the lat pull-down. J Strength Cond Res 24(7):1895–1900. https://doi.org/10.1519/JSC.0b013e3181ddb0ab
- Hewit J. K. (2018) A comparison of muscle activation during the pull-up and three alternative pulling exercises. J Phys Fit Med Treat Sports 5(4):555669. https://doi.org/10.19080/JPFMTS.2018.05.555669
- Contreras B. et al. (2015) A comparison of gluteus maximus, biceps femoris, and vastus lateralis electromyographic activity in the back squat and barbell hip thrust exercises. J Appl Biomech 31(6):452–458. https://doi.org/10.1123/jab.2014-0301
- Barbalho M. et al. (2020) Back squat vs. hip thrust resistance-training programs in well-trained women. Int J Sports Med 41(5):306–310. https://doi.org/10.1055/a-1082-1126
- Otto W. H., Coburn J. W., Brown L. E., Spiering B. A. (2012) Effects of weightlifting vs. kettlebell training on vertical jump, strength, and body composition. J Strength Cond Res 26(5):1199–1202. https://doi.org/10.1519/JSC.0b013e31824f233e
- Jay K. et al. (2011) Kettlebell training for musculoskeletal and cardiovascular health: a randomized controlled trial. Scand J Work Environ Health 37(3):196–203. https://doi.org/10.5271/sjweh.3136
- Meigh N. J., Keogh J. W. L., Schram B., Hing W. A. (2019) Kettlebell training in clinical practice: a scoping review. BMC Sports Sci Med Rehabil 11:19. https://doi.org/10.1186/s13102-019-0130-z
- Childs J. D. et al. (2009) Effects of sit-up training versus core stabilization exercises on sit-up performance. Med Sci Sports Exerc 41(11):2072–2083. https://doi.org/10.1249/MSS.0b013e3181a84db2
- Childs J. D. et al. (2010) Effects of traditional sit-up training versus core stabilization exercises on short-term musculoskeletal injuries in US Army soldiers: a cluster randomized trial. Phys Ther 90(10):1404–1412. https://doi.org/10.2522/ptj.20090389
- Escamilla R. F. et al. (2010) Core muscle activation during Swiss ball and traditional abdominal exercises. J Orthop Sports Phys Ther 40(5):265–276. https://doi.org/10.2519/jospt.2010.3073
- Axler C. T., McGill S. M. (1997) Low back loads over a variety of abdominal exercises: searching for the safest abdominal challenge. Med Sci Sports Exerc 29(6):804–811. https://doi.org/10.1097/00005768-199706000-00011
- George S. Z. et al. (2011) Brief psychosocial education, not core stabilization, reduced incidence of low back pain: results from the Prevention of Low Back Pain in the Military (POLM) cluster randomized trial. BMC Med 9:128. https://doi.org/10.1186/1741-7015-9-128
- Huxel Bliven K. C., Anderson B. E. (2013) Core stability training for injury prevention. Sports Health 5(6):514–522. https://doi.org/10.1177/1941738113481200
- Videbæk S., Bueno A. M., Nielsen R. O., Rasmussen S. (2015) Incidence of running-related injuries per 1000 h of running in different types of runners: a systematic review and meta-analysis. Sports Med 45(7):1017–1026. https://doi.org/10.1007/s40279-015-0333-8
- Bertelsen M. L., Hansen M., Rasmussen S., Nielsen R. O. (2018) The start-to-run distance and running-related injury among obese novice runners: a randomized trial. Int J Sports Phys Ther 13(6):943–955. https://pubmed.ncbi.nlm.nih.gov/30534460/
- van der Does H., Kemler E., Gouttebarge V. (2023) Can running-related injuries be prevented through an online behavioural intervention in adult novice runners? Results of a randomised controlled trial. BMJ Open Sport Exerc Med 9(2):e001522. https://doi.org/10.1136/bmjsem-2022-001522
- Rosenblat M. A., Perrotta A. S., Vicenzino B. (2019) Polarized vs. threshold training intensity distribution on endurance sport performance: a systematic review and meta-analysis of randomized controlled trials. J Strength Cond Res 33(12):3491–3500. https://doi.org/10.1519/JSC.0000000000002618
- Silva Oliveira P., Boppre G., Fonseca H. (2024) Comparison of polarized versus other types of endurance training intensity distribution on athletes’ endurance performance: a systematic review with meta-analysis. Sports Med 54(8):2071–2095. https://doi.org/10.1007/s40279-024-02034-z
- Milanović Z., Sporiš G., Weston M. (2015) Effectiveness of high-intensity interval training (HIT) and continuous endurance training for VO2max improvements: a systematic review and meta-analysis of controlled trials. Sports Med 45(10):1469–1481. https://doi.org/10.1007/s40279-015-0365-0
- Vesterinen V. et al. (2016) Individual endurance training prescription with heart rate variability. Med Sci Sports Exerc 48(7):1347–1354. https://doi.org/10.1249/MSS.0000000000000910
- Javaloyes A., Sarabia J. M., Lamberts R. P., Moya-Ramon M. (2019) Training prescription guided by heart-rate variability in cycling. Int J Sports Physiol Perform 14(1):23–32. https://doi.org/10.1123/ijspp.2018-0122
- Medellín Ruiz J. P., Rubio-Arias J. Á., Clemente-Suarez V. J., Ramos-Campo D. J. (2020) Effectiveness of training prescription guided by heart rate variability versus predefined training for physiological and aerobic performance improvements: a systematic review and meta-analysis. Appl Sci 10(23):8532. https://doi.org/10.3390/app10238532
- Düking P. et al. (2021) Monitoring and adapting endurance training on the basis of heart rate variability monitored by wearable technologies: a systematic review with meta-analysis. J Sci Med Sport 24(11):1180–1192. https://doi.org/10.1016/j.jsams.2021.04.012
- Williams T. D., Tolusso D. V., Fedewa M. V., Esco M. R. (2017) Comparison of periodized and non-periodized resistance training on maximal strength: a meta-analysis. Sports Med 47(10):2083–2100. https://doi.org/10.1007/s40279-017-0734-y
- Moesgaard L. et al. (2022) Effects of periodization on strength and muscle hypertrophy in volume-equated resistance training programs: a systematic review and meta-analysis. Sports Med 52(7):1647–1666. https://doi.org/10.1007/s40279-021-01636-1
- Bell L. et al. (2023) Integrating deloading into strength and physique sports training programmes: an international Delphi consensus approach. Sports Med Open 9:87. https://doi.org/10.1186/s40798-023-00633-0
- Coleman M. et al. (2024) Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations. PeerJ 12:e16777. https://doi.org/10.7717/peerj.16777
- Grgic J., Lazinica B., Mikulic P., Schoenfeld B. J. (2018) Should resistance training programs aimed at muscular hypertrophy be periodized? A systematic review of periodized versus non-periodized approaches. Sci Sports 33(3):e97–e104. https://doi.org/10.1016/j.scispo.2017.09.005

Doplněno 3. 10. 2026 (další látky z podkladové rešerše); citace ověřeny přes Crossref / PubMed včetně financování a střetu zájmů (PubMed, Crossref „funder“). Opravy proti podkladu: metaanalýza v Rheumatol Int 2018 má první autorku Simental-Mendía M.; přehled hub Hericium 2025 je Menon A. et al. (Front Nutr, PMID 40959699); nepoužito: Guadagna 2018 (DOI se nepodařilo dohledat), Ziegenfuss 2008 (jen konferenční abstrakt), Motta 2025 (výsledek se nepodařilo ověřit), Yu 2025 (obecný přehled bez výsledku k fosfátu v abstraktu).

- Pandit S., Biswas S., Jana U., De R. K. et al. (2016) Clinical evaluation of purified Shilajit on testosterone levels in healthy volunteers. Andrologia 48(5):570–575. https://doi.org/10.1111/and.12482
- Biswas T. K., Pandit S., Mondal S., Biswas S. K. et al. (2010) Clinical evaluation of spermatogenic activity of processed Shilajit in oligospermia. Andrologia 42(1):48–56. https://doi.org/10.1111/j.1439-0272.2009.00956.x
- Keller J. L., Housh T. J., Hill E. C., Smith C. M. et al. (2019) The effects of Shilajit supplementation on fatigue-induced decreases in muscular strength and serum hydroxyproline levels. J Int Soc Sports Nutr 16(1):3. https://doi.org/10.1186/s12970-019-0270-2
- Pingali U., Nutalapati C. (2022) Shilajit extract reduces oxidative stress, inflammation, and bone loss to dose-dependently preserve bone mineral density in postmenopausal women with osteopenia: a randomized, double-blind, placebo-controlled trial. Phytomedicine 105:154334. https://doi.org/10.1016/j.phymed.2022.154334
- Stohs S. J. (2014) Safety and efficacy of Shilajit (Mumie, Moomiyo). Phytother Res 28(4):475–479. https://doi.org/10.1002/ptr.5018
- Operation Supplement Safety (U.S. Department of Defense): Shilajit as a dietary supplement ingredient. https://www.opss.org/article/shilajit-dietary-supplement-ingredient
- Mori K., Inatomi S., Ouchi K., Azumi Y., Tuchida T. (2009) Improving effects of the mushroom Yamabushitake (Hericium erinaceus) on mild cognitive impairment: a double-blind placebo-controlled clinical trial. Phytother Res 23(3):367–372. https://doi.org/10.1002/ptr.2634
- Nagano M., Shimizu K., Kondo R., Hayashi C. et al. (2010) Reduction of depression and anxiety by 4 weeks Hericium erinaceus intake. Biomed Res 31(4):231–237. https://doi.org/10.2220/biomedres.31.231
- Saitsu Y., Nishide A., Kikushima K., Shimizu K. et al. (2019) Improvement of cognitive functions by oral intake of Hericium erinaceus. Biomed Res 40(4):125–131. https://doi.org/10.2220/biomedres.40.125
- Docherty S., Doughty F. L., Smith E. F. (2023) The acute and chronic effects of Lion's Mane mushroom supplementation on cognitive function, stress and mood in young adults: a double-blind, parallel groups, pilot study. Nutrients 15(22):4842. https://doi.org/10.3390/nu15224842
- Menon A., Jalal A., Arshad Z., Nawaz F. A. et al. (2025) Benefits, side effects, and uses of Hericium erinaceus as a supplement: a systematic review. Front Nutr 12:1641246. https://doi.org/10.3389/fnut.2025.1641246
- Li I. C., Chang H. H., Lin C. H., Chen W. P. et al. (2020) Prevention of early Alzheimer's disease by erinacine A-enriched Hericium erinaceus mycelia pilot double-blind placebo-controlled study. Front Aging Neurosci 12:155. https://doi.org/10.3389/fnagi.2020.00155
- Klupp N. L., Chang D., Hawke F., Kiat H. et al. (2015) Ganoderma lucidum mushroom for the treatment of cardiovascular risk factors. Cochrane Database Syst Rev, CD007259. https://doi.org/10.1002/14651858.CD007259.pub2
- Klupp N. L., Kiat H., Bensoussan A., Steiner G. Z. et al. (2016) A double-blind, randomised, placebo-controlled trial of Ganoderma lucidum for the treatment of cardiovascular risk factors of metabolic syndrome. Sci Rep 6:29540. https://doi.org/10.1038/srep29540
- Jin X., Ruiz Beguerie J., Sze D. M., Chan G. C. (2016) Ganoderma lucidum (Reishi mushroom) for cancer treatment. Cochrane Database Syst Rev, CD007731. https://doi.org/10.1002/14651858.CD007731.pub3
- Jafari A., Mardani H., Mirzaei Fashtali Z., Arghavan B. (2025) The nutritional significance of Ganoderma lucidum on human health: a GRADE-assessed systematic review and meta-analysis of clinical trials. Food Sci Nutr 13(6):e70423. https://doi.org/10.1002/fsn3.70423
- Chen S.-N., Nan F.-H., Liu M.-W., Yang M.-F. et al. (2023) Evaluation of immune modulation by β-1,3; 1,6 D-glucan derived from Ganoderma lucidum in healthy adult volunteers, a randomized controlled trial. Foods 12(3):659. https://doi.org/10.3390/foods12030659
- Wanmuang H., Leopairut J., Kositchaiwat C., Wananukul W. et al. (2007) Fatal fulminant hepatitis associated with Ganoderma lucidum (Lingzhi) mushroom powder. J Med Assoc Thai 90(1):179–181. https://pubmed.ncbi.nlm.nih.gov/17621752/
- Kikuchi Y., Seta K., Ogawa Y., Takayama T. et al. (2014) Chaga mushroom-induced oxalate nephropathy. Clin Nephrol 81(6):440–444. https://doi.org/10.5414/CN107655
- Lee S., Lee H. Y., Park Y., Ko E. J. et al. (2020) Development of end stage renal disease after long-term ingestion of Chaga mushroom: case report and review of literatures. J Korean Med Sci 35(19):e122. https://doi.org/10.3346/jkms.2020.35.e122
- Kwon O., Kim Y., Paek J. H., Park W. Y. et al. (2022) Chaga mushroom-induced oxalate nephropathy that clinically manifested as nephrotic syndrome. Medicine (Baltimore) 101(10):e28997. https://doi.org/10.1097/MD.0000000000028997
- Memorial Sloan Kettering Cancer Center – About Herbs: Chaga Mushroom. https://www.mskcc.org/cancer-care/integrative-medicine/herbs/chaga-mushroom
- Hirsch K. R., Smith-Ryan A. E., Roelofs E. J., Trexler E. T. et al. (2017) Cordyceps militaris improves tolerance to high-intensity exercise after acute and chronic supplementation. J Diet Suppl 14(1):42–53. https://doi.org/10.1080/19390211.2016.1203386
- Parcell A. C., Smith J. M., Schulthies S. S., Myrer J. W. et al. (2004) Cordyceps sinensis (CordyMax Cs-4) supplementation does not improve endurance exercise performance. Int J Sport Nutr Exerc Metab 14(2):236–242. https://doi.org/10.1123/ijsnem.14.2.236
- Chen S., Li Z., Krochmal R., Abrazado M. et al. (2010) Effect of Cs-4 (Cordyceps sinensis) on exercise performance in healthy older subjects: a double-blind, placebo-controlled trial. J Altern Complement Med 16(5):585–590. https://doi.org/10.1089/acm.2009.0226
- Dewi L., Khemtong C. (2025) Ergogenic aid by Cordyceps: does it work? Curr Nutr Rep 14(1):97. https://doi.org/10.1007/s13668-025-00690-9
- Jędrejko M., Jędrejko K., Granda D., Kała K. et al. (2026) Current evidence of ergogenic and post-exercise recovery effects of dietary supplementation with Cordyceps militaris in humans – a narrative review. Nutrients 18(5):781. https://doi.org/10.3390/nu18050781
- McDermott B. P., Anderson S. A., Armstrong L. E., Casa D. J. et al. (2017) National Athletic Trainers' Association position statement: fluid replacement for the physically active. J Athl Train 52(9):877–895. https://doi.org/10.4085/1062-6050-52.9.02
- Hew-Butler T., Rosner M. H., Fowkes-Godek S., Dugas J. P. et al. (2015) Statement of the Third International Exercise-Associated Hyponatremia Consensus Development Conference, Carlsbad, California, 2015. Clin J Sport Med 25(4):303–320. https://doi.org/10.1097/JSM.0000000000000221
- Knechtle B., Chlíbková D., Papadopoulou S., Mantzorou M. et al. (2019) Exercise-associated hyponatremia in endurance and ultra-endurance performance – aspects of sex, race location, ambient temperature, sports discipline, and length of performance: a narrative review. Medicina (Kaunas) 55(9):537. https://doi.org/10.3390/medicina55090537
- Clegg D. O., Reda D. J., Harris C. L., Klein M. A. et al. (2006) Glucosamine, chondroitin sulfate, and the two in combination for painful knee osteoarthritis. N Engl J Med 354(8):795–808. https://doi.org/10.1056/NEJMoa052771
- Sawitzke A. D., Shi H., Finco M. F., Dunlop D. D. et al. (2008) The effect of glucosamine and/or chondroitin sulfate on the progression of knee osteoarthritis: a report from the glucosamine/chondroitin arthritis intervention trial. Arthritis Rheum 58(10):3183–3191. https://doi.org/10.1002/art.23973
- Wandel S., Jüni P., Tendal B., Nüesch E. et al. (2010) Effects of glucosamine, chondroitin, or placebo in patients with osteoarthritis of hip or knee: network meta-analysis. BMJ 341:c4675. https://doi.org/10.1136/bmj.c4675
- Singh J. A., Noorbaloochi S., MacDonald R., Maxwell L. J. (2015) Chondroitin for osteoarthritis. Cochrane Database Syst Rev, CD005614. https://doi.org/10.1002/14651858.CD005614.pub2
- Simental-Mendía M., Sánchez-García A., Vilchez-Cavazos F., Acosta-Olivo C. A. et al. (2018) Effect of glucosamine and chondroitin sulfate in symptomatic knee osteoarthritis: a systematic review and meta-analysis of randomized placebo-controlled trials. Rheumatol Int 38(8):1413–1428. https://doi.org/10.1007/s00296-018-4077-2
- Pooyandjoo M., Nouhi M., Shab-Bidar S., Djafarian K. et al. (2016) The effect of (L-)carnitine on weight loss in adults: a systematic review and meta-analysis of randomized controlled trials. Obes Rev 17(10):970–976. https://doi.org/10.1111/obr.12436
- Gnoni A., Longo S., Gnoni G. V., Giudetti A. M. (2020) Carnitine in human muscle bioenergetics: can carnitine supplementation improve physical exercise? Molecules 25(1):182. https://doi.org/10.3390/molecules25010182
- Fielding R., Riede L., Lugo J. P., Bellamine A. (2018) L-carnitine supplementation in recovery after exercise. Nutrients 10(3):349. https://doi.org/10.3390/nu10030349
- Koeth R. A., Wang Z., Levison B. S., Buffa J. A. et al. (2013) Intestinal microbiota metabolism of L-carnitine, a nutrient in red meat, promotes atherosclerosis. Nat Med 19(5):576–585. https://doi.org/10.1038/nm.3145
- Sanchez-Martinez J., Santos-Lozano A., García-Hermoso A., Sadarangani K. P., Cristi-Montero C. (2018) Effects of beta-hydroxy-beta-methylbutyrate supplementation on strength and body composition in trained and competitive athletes: a meta-analysis of randomized controlled trials. J Sci Med Sport 21(7):727–735. https://doi.org/10.1016/j.jsams.2017.11.003
- Wilson J. M., Fitschen P. J., Campbell B., Wilson G. J. et al. (2013) International Society of Sports Nutrition position stand: beta-hydroxy-beta-methylbutyrate (HMB). J Int Soc Sports Nutr 10(1):6. https://doi.org/10.1186/1550-2783-10-6
- Rathmacher J. A., Pitchford L. M., Stout J. R., Townsend J. R. et al. (2025) International Society of Sports Nutrition position stand: β-hydroxy-β-methylbutyrate (HMB). J Int Soc Sports Nutr 22(1):2434734. https://doi.org/10.1080/15502783.2024.2434734
- Bideshki M. V., Behzadi M., Jamali M., Jamilian P. et al. (2025) Ergogenic benefits of β-hydroxy-β-methyl butyrate (HMB) supplementation on body composition and muscle strength: an umbrella review of meta-analyses. J Cachexia Sarcopenia Muscle 16(1):e13671. https://doi.org/10.1002/jcsm.13671
- Li N., Chen S., He Y., Chen Y. et al. (2025) Effects of oral supplementation of β-hydroxy-β-methylbutyrate on muscle mass and strength in individuals over the age of 50: a meta-analysis. Front Nutr 12:1522287. https://doi.org/10.3389/fnut.2025.1522287
- Ishaque S., Shamseer L., Bukutu C., Vohra S. (2012) Rhodiola rosea for physical and mental fatigue: a systematic review. BMC Complement Altern Med 12:70. https://doi.org/10.1186/1472-6882-12-70
- Darbinyan V., Kteyan A., Panossian A., Gabrielian E. et al. (2000) Rhodiola rosea in stress induced fatigue – a double blind cross-over study of a standardized extract SHR-5 with a repeated low-dose regimen on the mental performance of healthy physicians during night duty. Phytomedicine 7(5):365–371. https://doi.org/10.1016/S0944-7113(00)80055-0
- Olsson E. M. G., von Schéele B., Panossian A. G. (2009) A randomised, double-blind, placebo-controlled, parallel-group study of the standardised extract SHR-5 of the roots of Rhodiola rosea in the treatment of subjects with stress-related fatigue. Planta Med 75(2):105–112. https://doi.org/10.1055/s-0028-1088346
- Punja S., Shamseer L., Olson K., Vohra S. (2014) Rhodiola rosea for mental and physical fatigue in nursing students: a randomized controlled trial. PLoS One 9(9):e108416. https://doi.org/10.1371/journal.pone.0108416
- Hill J. A., Keane K. M., Quinlan R., Howatson G. (2021) Tart cherry supplementation and recovery from strenuous exercise: a systematic review and meta-analysis. Int J Sport Nutr Exerc Metab 31(2):154–167. https://doi.org/10.1123/ijsnem.2020-0145
- Howatson G., McHugh M. P., Hill J. A., Brouner J. et al. (2010) Influence of tart cherry juice on indices of recovery following marathon running. Scand J Med Sci Sports 20(6):843–852. https://doi.org/10.1111/j.1600-0838.2009.01005.x
- Howatson G., Bell P. G., Tallent J., Middleton B. et al. (2012) Effect of tart cherry juice (Prunus cerasus) on melatonin levels and enhanced sleep quality. Eur J Nutr 51(8):909–916. https://doi.org/10.1007/s00394-011-0263-7
- Daab W., Bouzid M. A., Nassis G. P., Arumugam A. et al. (2026) Effects of tart cherry juice supplementation on recovery from exercise-induced muscle damage in athletes: a systematic review and meta-analysis. Sports Med Open 12:40. https://doi.org/10.1186/s40798-026-00993-3
- McHugh M. P. (2022) „Precovery“ versus recovery: understanding the role of cherry juice in exercise recovery. Scand J Med Sci Sports 32(6):940–950. https://doi.org/10.1111/sms.14141
- Harty P. S., Zabriskie H. A., Erickson J. L., Molling P. E., Kerksick C. M., Jagim A. R. (2018) Multi-ingredient pre-workout supplements, safety implications, and performance outcomes: a brief review. J Int Soc Sports Nutr 15(1):41. https://doi.org/10.1186/s12970-018-0247-6
- Geyer H., Parr M. K., Mareck U., Reinhart U., Schrader Y., Schänzer W. (2004) Analysis of non-hormonal nutritional supplements for anabolic-androgenic steroids – results of an international study. Int J Sports Med 25(2):124–129. https://doi.org/10.1055/s-2004-819955
- Cohen P. A., Bloszies C., Yee C., Gerona R. (2016) An amphetamine isomer whose efficacy and safety in humans has never been studied, β-methylphenylethylamine (BMPEA), is found in multiple dietary supplements. Drug Test Anal 8(3–4):328–333. https://doi.org/10.1002/dta.1793
- Cameron M., Camic C. L., Doberstein S., Erickson J. L., Jagim A. R. (2018) The acute effects of a multi-ingredient pre-workout supplement on resting energy expenditure and exercise performance in recreationally active females. J Int Soc Sports Nutr 15(1):1. https://doi.org/10.1186/s12970-017-0206-7
- Puente-Fernández J., Larumbe-Zabala E., Roberts J., Naclerio F. (2025) Pre-workout multi-ingredients or carbohydrate alone promote similar resistance training outcomes in middle-aged adults: a double-blind, randomized controlled trial. J Int Soc Sports Nutr 22(1):2519515. https://doi.org/10.1080/15502783.2025.2519515
- Jongkees B. J., Hommel B., Kühn S., Colzato L. S. (2015) Effect of tyrosine supplementation on clinical and healthy populations under stress or cognitive demands – a review. J Psychiatr Res 70:50–57. https://doi.org/10.1016/j.jpsychires.2015.08.014
- Deijen J. B., Wientjes C. J. E., Vullinghs H. F. M., Cloin P. A. et al. (1999) Tyrosine improves cognitive performance and reduces blood pressure in cadets after one week of a combat training course. Brain Res Bull 48(2):203–209. https://doi.org/10.1016/S0361-9230(98)00163-4
- O'Brien C., Mahoney C., Tharion W. J., Sils I. V., Castellani J. W. (2007) Dietary tyrosine benefits cognitive and psychomotor performance during body cooling. Physiol Behav 90(2–3):301–307. https://doi.org/10.1016/j.physbeh.2006.09.027
- Donnan K. J., Williams E. L., Stanger N. (2025) Tyrosine supplementation is ineffective in facilitating soccer players' physical and cognitive performance during high-intensity intermittent exercise in hot conditions. PLoS One 20(1):e0317486. https://doi.org/10.1371/journal.pone.0317486
- Jones A. W., Cameron S. J. S., Thatcher R., Beecroft M. S., Mur L. A. J., Davison G. (2014) Effects of bovine colostrum supplementation on upper respiratory illness in active males. Brain Behav Immun 39:194–203. https://doi.org/10.1016/j.bbi.2013.10.032
- Główka N., Durkalec-Michalski K., Woźniewicz M. (2020) Immunological outcomes of bovine colostrum supplementation in trained and physically active people: a systematic review and meta-analysis. Nutrients 12(4):1023. https://doi.org/10.3390/nu12041023
- Jones A. W., March D. S., Curtis F., Bridle C. (2016) Bovine colostrum supplementation and upper respiratory symptoms during exercise training: a systematic review and meta-analysis of randomised controlled trials. BMC Sports Sci Med Rehabil 8:21. https://doi.org/10.1186/s13102-016-0047-8
- Marchbank T., Davison G., Oakes J. R., Ghatei M. A. et al. (2011) The nutriceutical bovine colostrum truncates the increase in gut permeability caused by heavy exercise in athletes. Am J Physiol Gastrointest Liver Physiol 300(3):G477–G484. https://doi.org/10.1152/ajpgi.00281.2010
- Rathe M., Müller K., Sangild P. T., Husby S. (2014) Clinical applications of bovine colostrum therapy: a systematic review. Nutr Rev 72(4):237–254. https://doi.org/10.1111/nure.12089
- Bach H. V., Kim J., Myung S.-K., Cho Y. A. (2016) Efficacy of ginseng supplements on fatigue and physical performance: a meta-analysis. J Korean Med Sci 31(12):1879–1886. https://doi.org/10.3346/jkms.2016.31.12.1879
- Arring N. M., Millstine D., Marks L. A., Nail L. M. (2018) Ginseng as a treatment for fatigue: a systematic review. J Altern Complement Med 24(7):624–633. https://doi.org/10.1089/acm.2017.0361
- Geng J., Dong J., Ni H., Lee M. S. et al. (2010) Ginseng for cognition. Cochrane Database Syst Rev, CD007769. https://doi.org/10.1002/14651858.CD007769.pub2
- Zeng M., Zhang K., Yang J., Zhang Y. et al. (2024) Effects of ginseng on cognitive function: a systematic review and meta-analysis. Phytother Res 38(12):6023–6034. https://doi.org/10.1002/ptr.8359
- Zhu J., Xu X., Zhang X., Zhuo Y. et al. (2022) Efficacy of ginseng supplements on disease-related fatigue: a systematic review and meta-analysis. Medicine (Baltimore) 101(26):e29767. https://doi.org/10.1097/MD.0000000000029767
- Marcus L., Soileau J., Judge L. W., Bellar D. (2017) Evaluation of the effects of two doses of alpha glycerylphosphorylcholine on physical and psychomotor performance. J Int Soc Sports Nutr 14(1):39. https://doi.org/10.1186/s12970-017-0196-5
- Bellar D., LeBlanc N. R., Campbell B. (2015) The effect of 6 days of alpha glycerylphosphorylcholine on isometric strength. J Int Soc Sports Nutr 12:42. https://doi.org/10.1186/s12970-015-0103-x
- Lee G., Choi S., Chang J., Choi D. et al. (2021) Association of L-α glycerylphosphorylcholine with subsequent stroke risk after 10 years. JAMA Netw Open 4(11):e2136008. https://doi.org/10.1001/jamanetworkopen.2021.36008
- Li J., Zhang J., Wang Y., Yang Y. J. et al. (2025) L-alpha-glycerylphosphorylcholine (L-α-GPC): a comprehensive review of its preparation techniques and versatile biological effects. J Food Sci 90(6):e70338. https://doi.org/10.1111/1750-3841.70338
- Cooke M., Iosia M., Buford T., Shelmadine B. et al. (2008) Effects of acute and 14-day coenzyme Q10 supplementation on exercise performance in both trained and untrained individuals. J Int Soc Sports Nutr 5:8. https://doi.org/10.1186/1550-2783-5-8
- Fernandes M. S. S., Fidelis D. E. S., Aidar F. J., Badicu G. et al. (2023) Coenzyme Q10 supplementation in athletes: a systematic review. Nutrients 15(18):3990. https://doi.org/10.3390/nu15183990
- Talebi S., Pourgharib Shahi M. H., Zeraattalab-Motlagh S., Asoudeh F. et al. (2024) The effects of coenzyme Q10 supplementation on biomarkers of exercise-induced muscle damage, physical performance, and oxidative stress: a GRADE-assessed systematic review and dose-response meta-analysis of randomized controlled trials. Clin Nutr ESPEN 60:122–134. https://doi.org/10.1016/j.clnesp.2024.01.015
- Mortensen S. A., Rosenfeldt F., Kumar A., Dolliner P. et al. (2014) The effect of coenzyme Q10 on morbidity and mortality in chronic heart failure: results from Q-SYMBIO: a randomized double-blind trial. JACC Heart Fail 2(6):641–649. https://doi.org/10.1016/j.jchf.2014.06.008
- Raizner A. E., Quiñones M. A. (2021) Coenzyme Q10 for patients with cardiovascular disease: JACC focus seminar. J Am Coll Cardiol 77(5):609–619. https://doi.org/10.1016/j.jacc.2020.12.009
- Melville G. W., Siegler J. C., Marshall P. W. M. (2015) Three and six grams supplementation of D-aspartic acid in resistance trained men. J Int Soc Sports Nutr 12:15. https://doi.org/10.1186/s12970-015-0078-7
- Melville G. W., Siegler J. C., Marshall P. W. M. (2017) The effects of D-aspartic acid supplementation in resistance-trained men over a three month training period: a randomised controlled trial. PLoS One 12(8):e0182630. https://doi.org/10.1371/journal.pone.0182630
- Lak M., Goudarzi K., Shahrbaf M. A. (2022) D-aspartic acid supplementation effects on body composition: a systematic review of randomized clinical trials on trained males. Asian J Sports Med 13(2):e120161. https://doi.org/10.5812/asjsm-120161
- Płoszczyca K., Czuba M., Zakrzeska A., Gajda R. (2024) The effects of six-gram D-aspartic acid supplementation on the testosterone, cortisol, and hematological responses of male boxers subjected to 11 days of nocturnal exposure to normobaric hypoxia. Nutrients 16(1):76. https://doi.org/10.3390/nu16010076
- Jurgens T. M., Whelan A. M., Killian L., Doucette S. et al. (2012) Green tea for weight loss and weight maintenance in overweight or obese adults. Cochrane Database Syst Rev, CD008650. https://doi.org/10.1002/14651858.CD008650.pub2
- EFSA ANS Panel, Younes M., Aggett P., Aguilar F. et al. (2018) Scientific opinion on the safety of green tea catechins. EFSA Journal 16(4):5239. https://doi.org/10.2903/j.efsa.2018.5239
- Lin Y., Shi D., Su B., Wei J. et al. (2020) The effect of green tea supplementation on obesity: a systematic review and dose–response meta-analysis of randomized controlled trials. Phytother Res 34(10):2459–2470. https://doi.org/10.1002/ptr.6697
- Zhong X., Zhang T., Liu Y., Wei X. et al. (2015) Short-term weight-centric effects of tea or tea extract in patients with metabolic syndrome: a meta-analysis of randomized controlled trials. Nutr Diabetes 5(6):e160. https://doi.org/10.1038/nutd.2015.10
- Jeukendrup A. (2014) A step towards personalized sports nutrition: carbohydrate intake during exercise. Sports Med 44(Suppl 1):25–33. https://doi.org/10.1007/s40279-014-0148-z
- Stellingwerff T., Cox G. R. (2014) Systematic review: carbohydrate supplementation on exercise performance or capacity of varying durations. Appl Physiol Nutr Metab 39(9):998–1011. https://doi.org/10.1139/apnm-2014-0027
- Podlogar T., Wallis G. A. (2022) New horizons in carbohydrate research and application for endurance athletes. Sports Med 52(Suppl 1):5–23. https://doi.org/10.1007/s40279-022-01757-1
- van Rosendal S. P., Osborne M. A., Fassett R. G., Coombes J. S. (2010) Guidelines for glycerol use in hyperhydration and rehydration associated with exercise. Sports Med 40(2):113–129. https://doi.org/10.2165/11530760-000000000-00000
- Koehler K., Thevis M., Schaenzer W. (2013) Meta-analysis: effects of glycerol administration on plasma volume, haemoglobin, and haematocrit. Drug Test Anal 5(11–12):896–899. https://doi.org/10.1002/dta.1580
- Koehler K., Braun H., de Marées M., Geyer H. et al. (2014) Glycerol administration before endurance exercise: metabolism, urinary glycerol excretion and effects on doping-relevant blood parameters. Drug Test Anal 6(3):202–209. https://doi.org/10.1002/dta.1446
- Herrera-Amante C. A., García-Zepeda G., García-Zepeda C. E., Yáñez-Sepúlveda R. et al. (2025) Effects of glycerol hyperhidration on the running economy of long-distance runners: a randomized crossover clinical trial. Front Nutr 12:1630462. https://doi.org/10.3389/fnut.2025.1630462
- Viribay A., Burgos J., Fernández-Landa J., Seco-Calvo J. et al. (2020) Effects of arginine supplementation on athletic performance based on energy metabolism: a systematic review and meta-analysis. Nutrients 12(5):1300. https://doi.org/10.3390/nu12051300
- Trexler E. T. (2025) Common errors in sports nutrition meta-analyses lead to distortion of pooled effect estimates. Comment on Viribay et al. Nutrients 17(14):2375. https://doi.org/10.3390/nu17142375
- Rezaei S., Gholamalizadeh M., Tabrizi R., Nowrouzi-Sohrabi P. et al. (2021) The effect of L-arginine supplementation on maximal oxygen uptake: a systematic review and meta-analysis. Physiol Rep 9(3):e14739. https://doi.org/10.14814/phy2.14739
- Pasa C., Godinho de Oliveira R., da Rosa Lima T., Jalousie Kommers M. et al. (2022) Effectiveness of acute L-arginine supplementation on physical performance in strength training: a systematic review and meta-analysis. F1000Research 10:1072. https://doi.org/10.12688/f1000research.73905.2
- Kalafati M., Jamurtas A. Z., Nikolaidis M. G., Paschalis V. et al. (2010) Ergogenic and antioxidant effects of spirulina supplementation in humans. Med Sci Sports Exerc 42(1):142–151. https://doi.org/10.1249/MSS.0b013e3181ac7a45
- Naeini F., Zarezadeh M., Mohiti S., Tutunchi H. et al. (2021) Spirulina supplementation as an adjuvant therapy in enhancement of antioxidant capacity: a systematic review and meta-analysis of controlled clinical trials. Int J Clin Pract 75(10):e14618. https://doi.org/10.1111/ijcp.14618
- Bohórquez-Medina S. L., Bohórquez-Medina A. L., Benites Zapata V. A., Ignacio-Cconchoy F. L. et al. (2021) Impact of spirulina supplementation on obesity-related metabolic disorders: a systematic review and meta-analysis of randomized controlled trials. NFS Journal 25:21–30. https://doi.org/10.1016/j.nfs.2021.09.003
- Hernández-Lepe M. A., Olivas-Aguirre F. J., Gómez-Miranda L. M., Hernández-Torres R. P. et al. (2019) Systematic physical exercise and Spirulina maxima supplementation improve body composition, cardiorespiratory fitness, and blood lipid profile: correlations of a randomized double-blind controlled trial. Antioxidants 8(11):507. https://doi.org/10.3390/antiox8110507
- Vichi S., Lavorini P., Funari E., Scardala S., Testai E. (2012) Contamination by Microcystis and microcystins of blue–green algae food supplements (BGAS) on the Italian market and possible risk for the exposed population. Food Chem Toxicol 50(12):4493–4499. https://doi.org/10.1016/j.fct.2012.09.029
- Cholewa J. M., Wyszczelska-Rokiel M., Glowacki R., Jakubowski H. et al. (2013) Effects of betaine on body composition, performance, and homocysteine thiolactone. J Int Soc Sports Nutr 10(1):39. https://doi.org/10.1186/1550-2783-10-39
- Ashtary-Larky D., Bagheri R., Tinsley G. M., Asbaghi O. et al. (2022) Betaine supplementation fails to improve body composition: a systematic review and meta-analysis. Br J Nutr 128(5):975–988. https://doi.org/10.1017/S0007114521004062
- Zawieja E., Machek S., Zanchi N. E., Cholewa J., Woźniewicz M. (2024) Effects of chronic betaine supplementation on exercise performance: systematic review and meta-analysis. J Sports Sci 42(22):2131–2144. https://doi.org/10.1080/02640414.2024.2423578
- Nikrandt G., Chmurzynska A. (2024) Decoding betaine: a critical analysis of therapeutic potential compared with marketing hype – a narrative review. J Nutr 154(11):3167–3176. https://doi.org/10.1016/j.tjnut.2024.08.030
- Cholewa J. M., Guimarães-Ferreira L., Zanchi N. E. (2014) Effects of betaine on performance and body composition: a review of recent findings and potential mechanisms. Amino Acids 46(8):1785–1793. https://doi.org/10.1007/s00726-014-1748-5
- Buck C. L., Wallman K. E., Dawson B., Guelfi K. J. (2013) Sodium phosphate as an ergogenic aid. Sports Med 43(6):425–435. https://doi.org/10.1007/s40279-013-0042-0
- Brewer C. P., Dawson B., Wallman K. E., Guelfi K. J. (2015) Effect of sodium phosphate supplementation on repeated high-intensity cycling efforts. J Sports Sci 33(11):1109–1116. https://doi.org/10.1080/02640414.2014.989536
- Brewer C. P., Dawson B., Wallman K. E., Guelfi K. J. (2014) Effect of sodium phosphate supplementation on cycling time trial performance and VO2 1 and 8 days post loading. J Sports Sci Med 13(3):529–534. https://pubmed.ncbi.nlm.nih.gov/25177178/
- Vinceti M., Filippini T., Del Giovane C., Dennert G. et al. (2018) Selenium for preventing cancer. Cochrane Database Syst Rev, CD005195. https://doi.org/10.1002/14651858.CD005195.pub4
- Stranges S., Marshall J. R., Natarajan R., Donahue R. P. et al. (2007) Effects of long-term selenium supplementation on the incidence of type 2 diabetes: a randomized trial. Ann Intern Med 147(4):217–223. https://doi.org/10.7326/0003-4819-147-4-200708210-00175
- Avery J. C., Hoffmann P. R. (2018) Selenium, selenoproteins, and immunity. Nutrients 10(9):1203. https://doi.org/10.3390/nu10091203
- Winther K. H., Wichman J. E. M., Bonnema S. J., Hegedüs L. (2017) Insufficient documentation for clinical efficacy of selenium supplementation in chronic autoimmune thyroiditis, based on a systematic review and meta-analysis. Endocrine 55(2):376–385. https://doi.org/10.1007/s12020-016-1098-z
- Bolland M. J., Leung W., Tai V., Bastin S. et al. (2015) Calcium intake and risk of fracture: systematic review. BMJ 351:h4580. https://doi.org/10.1136/bmj.h4580
- Tai V., Leung W., Grey A., Reid I. R., Bolland M. J. (2015) Calcium intake and bone mineral density: systematic review and meta-analysis. BMJ 351:h4183. https://doi.org/10.1136/bmj.h4183
- Lappe J., Cullen D., Haynatzki G., Recker R. et al. (2008) Calcium and vitamin D supplementation decreases incidence of stress fractures in female navy recruits. J Bone Miner Res 23(5):741–749. https://doi.org/10.1359/jbmr.080102
- Chung M., Tang A. M., Fu Z., Wang D. D., Newberry S. J. (2016) Calcium intake and cardiovascular disease risk: an updated systematic review and meta-analysis. Ann Intern Med 165(12):856–866. https://doi.org/10.7326/M16-1165
- Liu Y., Le S., Liu Y., Jiang H. et al. (2022) The effect of calcium supplementation in people under 35 years old: a systematic review and meta-analysis of randomized controlled trials. eLife 11:e79002. https://doi.org/10.7554/eLife.79002
- Oe M., Tashiro T., Yoshida H., Nishiyama H. et al. (2016) Oral hyaluronan relieves knee pain: a review. Nutr J 15:11. https://doi.org/10.1186/s12937-016-0128-2
- de Carvalho J. F., Davidson J. (2024) Oral hyaluronic acid in osteoarthritis and low back pain: a systematic review. Mediterr J Rheumatol 35(4):557–562. https://doi.org/10.31138/mjr.240724.oha
- Dolečková I., Kušnierik P., Berka V., Šimek M. et al. (2026) Oral sodium hyaluronate improves skin hydration, barrier function and signs of aging: a randomized, double-blind, placebo-controlled trial in 150 healthy adults. Sci Rep 16:2941. https://doi.org/10.1038/s41598-025-32758-5
- Amin P., Sarabi A., Choe S., Scott S., Suh S., Mesinkovska N. A. (2025) Oral hyaluronic acid supplement: efficacy in skin hydration, elasticity, and wrinkle depth reduction. J Drugs Dermatol 24(9):910–919. https://doi.org/10.36849/JDD.8542

Doplněno 8. 10. 2026 (taurin, L-theanin, kurkumin, vláknina, kakaové flavanoly, citrát sodný, glycin, beta-glukany, zázvor, kapsaicin, ekdysteron a turkesteron, tongkat ali, exogenní ketony, CBD); každá citace ověřena v PubMedu (autoři, rok, časopis, DOI, závěry abstraktu), Yamadera 2007 přes Crossref a OpenAlex. Financování a střet zájmů ověřeny v plných textech na Europe PMC, v grantech uvedených u záznamu a v afiliacích autorů.

- Jovanovski E., Yashpal S., Komishon A., Zurbau A. et al. (2018) Effect of psyllium (Plantago ovata) fiber on LDL cholesterol and alternative lipid targets, non-HDL cholesterol and apolipoprotein B: a systematic review and meta-analysis of randomized controlled trials. Am J Clin Nutr 108(5):922–932. https://doi.org/10.1093/ajcn/nqy115
- Gibb R. D., McRorie J. W. Jr., Russell D. A., Hasselblad V., D'Alessio D. A. (2015) Psyllium fiber improves glycemic control proportional to loss of glycemic control: a meta-analysis of data in euglycemic subjects, patients at risk of type 2 diabetes mellitus, and patients being treated for type 2 diabetes mellitus. Am J Clin Nutr 102(6):1604–1614. https://doi.org/10.3945/ajcn.115.106989
- Reynolds A., Mann J., Cummings J., Winter N. et al. (2019) Carbohydrate quality and human health: a series of systematic reviews and meta-analyses. Lancet 393(10170):434–445. https://doi.org/10.1016/S0140-6736(18)31809-9
- Clark C. C. T., Salek M., Aghabagheri E., Jafarnejad S. (2020) The effect of psyllium supplementation on blood pressure: a systematic review and meta-analysis of randomized controlled trials. Korean J Intern Med 35(6):1385–1399. https://doi.org/10.3904/kjim.2019.049
- Darooghegi Mofrad M., Mozaffari H., Mousavi S. M., Sheikhi A., Milajerdi A. (2020) The effects of psyllium supplementation on body weight, body mass index and waist circumference in adults: a systematic review and dose-response meta-analysis of randomized controlled trials. Crit Rev Food Sci Nutr 60(5):859–872. https://doi.org/10.1080/10408398.2018.1553140
- Waldron M., Patterson S. D., Tallent J., Jeffries O. (2018) The effects of an oral taurine dose and supplementation period on endurance exercise performance in humans: a meta-analysis. Sports Med 48(5):1247–1253. https://doi.org/10.1007/s40279-018-0896-2
- Deng H., Song T., Yin M., Xu K. et al. (2025) Does one shot work? The acute impact of a single taurine dose on exercise performance: a meta-analytic review. Scand J Med Sci Sports 35(9):e70123. https://doi.org/10.1111/sms.70123
- Kurtz J. A., VanDusseldorp T. A., Doyle J. A., Otis J. S. (2021) Taurine in sports and exercise. J Int Soc Sports Nutr 18(1):39. https://doi.org/10.1186/s12970-021-00438-0
- Balshaw T. G., Bampouras T. M., Barry T. J., Sparks S. A. (2013) The effect of acute taurine ingestion on 3-km running performance in trained middle-distance runners. Amino Acids 44(2):555–561. https://doi.org/10.1007/s00726-012-1372-1
- Hidese S., Ogawa S., Ota M., Ishida I. et al. (2019) Effects of L-theanine administration on stress-related symptoms and cognitive functions in healthy adults: a randomized controlled trial. Nutrients 11(10):2362. https://doi.org/10.3390/nu11102362
- Williams J. L., Everett J. M., D'Cunha N. M., Sergi D. et al. (2020) The effects of green tea amino acid L-theanine consumption on the ability to manage stress and anxiety levels: a systematic review. Plant Foods Hum Nutr 75(1):12–23. https://doi.org/10.1007/s11130-019-00771-5
- Camfield D. A., Stough C., Farrimond J., Scholey A. B. (2014) Acute effects of tea constituents L-theanine, caffeine, and epigallocatechin gallate on cognitive function and mood: a systematic review and meta-analysis. Nutr Rev 72(8):507–522. https://doi.org/10.1111/nure.12120
- Bulman A., D'Cunha N. M., Marx W., Turner M. et al. (2025) The effects of L-theanine consumption on sleep outcomes: a systematic review and meta-analysis. Sleep Med Rev 81:102076. https://doi.org/10.1016/j.smrv.2025.102076
- Fang W., Nasir Y. (2021) The effect of curcumin supplementation on recovery following exercise-induced muscle damage and delayed-onset muscle soreness: a systematic review and meta-analysis of randomized controlled trials. Phytother Res 35(4):1768–1781. https://doi.org/10.1002/ptr.6912
- Nicol L. M., Rowlands D. S., Fazakerly R., Kellett J. (2015) Curcumin supplementation likely attenuates delayed onset muscle soreness (DOMS). Eur J Appl Physiol 115(8):1769–1777. https://doi.org/10.1007/s00421-015-3152-6
- Talebi S., Mohammadi H., Zeraattalab-Motlagh S., Arab A. et al. (2024) Nutritional interventions for exercise-induced muscle damage: an umbrella review of systematic reviews and meta-analyses of randomized trials. Nutr Rev 82(5):639–653. https://doi.org/10.1093/nutrit/nuad078
- Daily J. W., Yang M., Park S. (2016) Efficacy of turmeric extracts and curcumin for alleviating the symptoms of joint arthritis: a systematic review and meta-analysis of randomized clinical trials. J Med Food 19(8):717–729. https://doi.org/10.1089/jmf.2016.3705
- Zeng L., Yu G., Hao W., Yang K., Chen H. (2021) The efficacy and safety of Curcuma longa extract and curcumin supplements on osteoarthritis: a systematic review and meta-analysis. Biosci Rep 41(6):BSR20210817. https://doi.org/10.1042/BSR20210817
- Halegoua-DeMarzio D., Navarro V., Ahmad J., Avula B. et al. (2023) Liver injury associated with turmeric – a growing problem: ten cases from the Drug-Induced Liver Injury Network [DILIN]. Am J Med 136(2):200–206. https://doi.org/10.1016/j.amjmed.2022.09.026
- Ried K., Fakler P., Stocks N. P. (2017) Effect of cocoa on blood pressure. Cochrane Database Syst Rev 4:CD008893. https://doi.org/10.1002/14651858.CD008893.pub3
- Hooper L., Kay C., Abdelhamid A., Kroon P. A. et al. (2012) Effects of chocolate, cocoa, and flavan-3-ols on cardiovascular health: a systematic review and meta-analysis of randomized trials. Am J Clin Nutr 95(3):740–751. https://doi.org/10.3945/ajcn.111.023457
- Sesso H. D., Manson J. E., Aragaki A. K., Rist P. M. et al. (2022) Effect of cocoa flavanol supplementation for the prevention of cardiovascular disease events: the COcoa Supplement and Multivitamin Outcomes Study (COSMOS) randomized clinical trial. Am J Clin Nutr 115(6):1490–1500. https://doi.org/10.1093/ajcn/nqac055
- Decroix L., Soares D. D., Meeusen R., Heyman E., Tonoli C. (2018) Cocoa flavanol supplementation and exercise: a systematic review. Sports Med 48(4):867–892. https://doi.org/10.1007/s40279-017-0849-1
- Urwin C. S., Dwyer D. B., Carr A. J. (2016) Induced alkalosis and gastrointestinal symptoms after sodium citrate ingestion: a dose-response investigation. Int J Sport Nutr Exerc Metab 26(6):542–548. https://doi.org/10.1123/ijsnem.2015-0336
- Oöpik V., Saaremets I., Medijainen L., Karelson K. et al. (2003) Effects of sodium citrate ingestion before exercise on endurance performance in well trained college runners. Br J Sports Med 37(6):485–489. https://doi.org/10.1136/bjsm.37.6.485
- Vaher I., Timpmann S., Aedma M., Ööpik V. (2015) Impact of acute sodium citrate ingestion on endurance running performance in a warm environment. Eur J Appl Physiol 115(4):813–823. https://doi.org/10.1007/s00421-014-3068-6
- Yamadera W., Inagawa K., Chiba S., Bannai M. et al. (2007) Glycine ingestion improves subjective sleep quality in human volunteers, correlating with polysomnographic changes. Sleep Biol Rhythms 5(2):126–131. https://doi.org/10.1111/j.1479-8425.2007.00262.x
- Bannai M., Kawai N., Ono K., Nakahara K., Murakami N. (2012) The effects of glycine on subjective daytime performance in partially sleep-restricted healthy volunteers. Front Neurol 3:61. https://doi.org/10.3389/fneur.2012.00061
- Soh J., Raventhiran S., Lee J. H., Lim Z. X. et al. (2024) The effect of glycine administration on the characteristics of physiological systems in human adults: a systematic review. GeroScience 46(1):219–239. https://doi.org/10.1007/s11357-023-00970-8
- Zhong K., Liu Z., Lu Y., Xu X. (2021) Effects of yeast β-glucans for the prevention and treatment of upper respiratory tract infection in healthy subjects: a systematic review and meta-analysis. Eur J Nutr 60(8):4175–4187. https://doi.org/10.1007/s00394-021-02566-4
- McFarlin B. K., Carpenter K. C., Davidson T., McFarlin M. A. (2013) Baker's yeast beta glucan supplementation increases salivary IgA and decreases cold/flu symptomatic days after intense exercise. J Diet Suppl 10(3):171–183. https://doi.org/10.3109/19390211.2013.820248
- Mah E., Kaden V. N., Kelley K. M., Liska D. J. (2020) Beverage containing dispersible yeast β-glucan decreases cold/flu symptomatic days after intense exercise: a randomized controlled trial. J Diet Suppl 17(2):200–210. https://doi.org/10.1080/19390211.2018.1495676
- Nieman D. C., Henson D. A., McMahon M., Wrieden J. L. et al. (2008) Beta-glucan, immune function, and upper respiratory tract infections in athletes. Med Sci Sports Exerc 40(8):1463–1471. https://doi.org/10.1249/MSS.0b013e31817057c2
- Black C. D., Herring M. P., Hurley D. J., O'Connor P. J. (2010) Ginger (Zingiber officinale) reduces muscle pain caused by eccentric exercise. J Pain 11(9):894–903. https://doi.org/10.1016/j.jpain.2009.12.013
- Wilson P. B. (2015) Ginger (Zingiber officinale) as an analgesic and ergogenic aid in sport: a systemic review. J Strength Cond Res 29(10):2980–2995. https://doi.org/10.1519/JSC.0000000000001098
- Matsumura M. D., Zavorsky G. S., Smoliga J. M. (2015) The effects of pre-exercise ginger supplementation on muscle damage and delayed onset muscle soreness. Phytother Res 29(6):887–893. https://doi.org/10.1002/ptr.5328
- Bartels E. M., Folmer V. N., Bliddal H., Altman R. D. et al. (2015) Efficacy and safety of ginger in osteoarthritis patients: a meta-analysis of randomized placebo-controlled trials. Osteoarthritis Cartilage 23(1):13–21. https://doi.org/10.1016/j.joca.2014.09.024
- Grgic J., Memon A. R., Chen S., Ramirez-Campillo R. et al. (2022) Effects of capsaicin and capsiate on endurance performance: a meta-analysis. Nutrients 14(21):4531. https://doi.org/10.3390/nu14214531
- Quizzini G. H., Campos J. M. S., Nunes F. A. S., Rossi P. A. Q. et al. (2026) Potential ergogenic aid of capsaicinoid or capsinoids in healthy adults: a systematic review with meta-analysis. Nutr Res 146:13–25. https://doi.org/10.1016/j.nutres.2025.12.004
- de Freitas M. C., Cholewa J. M., Gobbo L. A., de Oliveira J. V. N. S. et al. (2018) Acute capsaicin supplementation improves 1,500-m running time-trial performance and rate of perceived exertion in physically active adults. J Strength Cond Res 32(2):572–577. https://doi.org/10.1519/JSC.0000000000002329
- Conrado de Freitas M., Cholewa J. M., Freire R. V., Carmo B. A. et al. (2018) Acute capsaicin supplementation improves resistance training performance in trained men. J Strength Cond Res 32(8):2227–2232. https://doi.org/10.1519/JSC.0000000000002109
- Isenmann E., Ambrosio G., Joseph J. F., Mazzarino M. et al. (2019) Ecdysteroids as non-conventional anabolic agent: performance enhancement by ecdysterone supplementation in humans. Arch Toxicol 93(7):1807–1816. https://doi.org/10.1007/s00204-019-02490-x
- Wilborn C. D., Taylor L. W., Campbell B. I., Kerksick C. et al. (2006) Effects of methoxyisoflavone, ecdysterone, and sulfo-polysaccharide supplementation on training adaptations in resistance-trained males. J Int Soc Sports Nutr 3(2):19–27. https://doi.org/10.1186/1550-2783-3-2-19
- Ambrosio G., Wirth D., Joseph J. F., Mazzarino M. et al. (2020) How reliable is dietary supplement labelling? Experiences from the analysis of ecdysterone supplements. J Pharm Biomed Anal 177:112877. https://doi.org/10.1016/j.jpba.2019.112877
- Harris D. R., Chapman-Lopez T., Machek S. B., Forsse J. S. et al. (2024) The effects of multiple acute turkesterone doses on indirect measures of hypertrophy and metabolic measures: a preliminary investigation. Muscles 3(4):364–375. https://doi.org/10.3390/muscles3040031
- Leisegang K., Finelli R., Sikka S. C., Panner Selvam M. K. (2022) Eurycoma longifolia (Jack) improves serum total testosterone in men: a systematic review and meta-analysis of clinical trials. Medicina (Kaunas) 58(8):1047. https://doi.org/10.3390/medicina58081047
- Henkel R. R., Wang R., Bassett S. H., Chen T. et al. (2014) Tongkat Ali as a potential herbal supplement for physically active male and female seniors – a pilot study. Phytother Res 28(4):544–550. https://doi.org/10.1002/ptr.5017
- Talbott S. M., Talbott J. A., George A., Pugh M. (2013) Effect of Tongkat Ali on stress hormones and psychological mood state in moderately stressed subjects. J Int Soc Sports Nutr 10(1):28. https://doi.org/10.1186/1550-2783-10-28
- Chan K. Q., Stewart C., Chester N., Hamzah S. H., Yusof A. (2021) The effect of Eurycoma longifolia on the regulation of reproductive hormones in young males. Andrologia 53(4):e14001. https://doi.org/10.1111/and.14001
- Valenzuela P. L., Morales J. S., Castillo-García A., Lucia A. (2020) Acute ketone supplementation and exercise performance: a systematic review and meta-analysis of randomized controlled trials. Int J Sports Physiol Perform 15(3):298–308. https://doi.org/10.1123/ijspp.2019-0918
- Margolis L. M., O'Fallon K. S. (2020) Utility of ketone supplementation to enhance physical performance: a systematic review. Adv Nutr 11(2):412–419. https://doi.org/10.1093/advances/nmz104
- Cox P. J., Kirk T., Ashmore T., Willerton K. et al. (2016) Nutritional ketosis alters fuel preference and thereby endurance performance in athletes. Cell Metab 24(2):256–268. https://doi.org/10.1016/j.cmet.2016.07.010
- Leckey J. J., Ross M. L., Quod M., Hawley J. A., Burke L. M. (2017) Ketone diester ingestion impairs time-trial performance in professional cyclists. Front Physiol 8:806. https://doi.org/10.3389/fphys.2017.00806
- Poffé C., Ramaekers M., Van Thienen R., Hespel P. (2019) Ketone ester supplementation blunts overreaching symptoms during endurance training overload. J Physiol 597(12):3009–3027. https://doi.org/10.1113/JP277831
- McCartney D., Benson M. J., Desbrow B., Irwin C. et al. (2020) Cannabidiol and sports performance: a narrative review of relevant evidence and recommendations for future research. Sports Med Open 6(1):27. https://doi.org/10.1186/s40798-020-00251-0
- Cochrane-Snyman K. C., Cruz C., Morales J., Coles M. (2021) The effects of cannabidiol oil on noninvasive measures of muscle damage in men. Med Sci Sports Exerc 53(7):1460–1472. https://doi.org/10.1249/MSS.0000000000002606
- Isenmann E., Veit S., Starke L., Flenker U., Diel P. (2021) Effects of cannabidiol supplementation on skeletal muscle regeneration after intensive resistance training. Nutrients 13(9):3028. https://doi.org/10.3390/nu13093028
- Suraev A. S., Marshall N. S., Vandrey R., McCartney D. et al. (2020) Cannabinoid therapies in the management of sleep disorders: a systematic review of preclinical and clinical studies. Sleep Med Rev 53:101339. https://doi.org/10.1016/j.smrv.2020.101339
- Chesney E., Oliver D., Green A., Sovi S. et al. (2020) Adverse effects of cannabidiol: a systematic review and meta-analysis of randomized clinical trials. Neuropsychopharmacology 45(11):1799–1806. https://doi.org/10.1038/s41386-020-0667-2

Doplněno 13. 10. 2026 (fosfatidylcholin a lecitin, hydrogenuhličitan draselný, thiamin):

- EFSA NDA Panel (2016) Dietary Reference Values for choline. EFSA Journal 14(8):4484. https://doi.org/10.2903/j.efsa.2016.4484
- Penry J. T., Manore M. M. (2008) Choline: an important micronutrient for maximal endurance-exercise performance? Int J Sport Nutr Exerc Metab 18(2):191–203. https://doi.org/10.1123/ijsnem.18.2.191
- von Allwörden H. N., Horn S., Kahl J., Feldheim W. (1993) The influence of lecithin on plasma choline concentrations in triathletes and adolescent runners during exercise. Eur J Appl Physiol Occup Physiol 67(1):87–91. https://doi.org/10.1007/BF00377711
- Buchman A. L., Awal M., Jenden D., Roch M., Kang S. H. (2000) The effect of lecithin supplementation on plasma choline concentrations during a marathon. J Am Coll Nutr 19(6):768–770. https://doi.org/10.1080/07315724.2000.10718076
- Warber J. P., Patton J. F., Tharion W. J., Zeisel S. H. et al. (2000) The effects of choline supplementation on physical performance. Int J Sport Nutr Exerc Metab 10(2):170–181. https://doi.org/10.1123/ijsnem.10.2.170
- Jäger R., Purpura M., Kingsley M. (2007) Phospholipids and sports performance. J Int Soc Sports Nutr 4:5. https://doi.org/10.1186/1550-2783-4-5
- Higgins J. P., Flicker L. (2003) Lecithin for dementia and cognitive impairment. Cochrane Database Syst Rev (3):CD001015. https://doi.org/10.1002/14651858.CD001015
- Lippelt D. P., van der Kint S., van Herk K., Naber M. (2016) No acute effects of choline bitartrate food supplements on memory in healthy, young, human adults. PLoS One 11(6):e0157714. https://doi.org/10.1371/journal.pone.0157714
- Tang W. H. W., Wang Z., Levison B. S., Koeth R. A. et al. (2013) Intestinal microbial metabolism of phosphatidylcholine and cardiovascular risk. N Engl J Med 368(17):1575–1584. https://doi.org/10.1056/NEJMoa1109400
- Sebastian A., Harris S. T., Ottaway J. H., Todd K. M., Morris R. C. Jr. (1994) Improved mineral balance and skeletal metabolism in postmenopausal women treated with potassium bicarbonate. N Engl J Med 330(25):1776–1781. https://doi.org/10.1056/NEJM199406233302502
- Dawson-Hughes B., Harris S. S., Palermo N. J., Castaneda-Sceppa C. et al. (2009) Treatment with potassium bicarbonate lowers calcium excretion and bone resorption in older men and women. J Clin Endocrinol Metab 94(1):96–102. https://doi.org/10.1210/jc.2008-1662
- Dawson-Hughes B., Harris S. S., Palermo N. J., Gilhooly C. H. et al. (2015) Potassium bicarbonate supplementation lowers bone turnover and calcium excretion in older men and women: a randomized dose-finding trial. J Bone Miner Res 30(11):2103–2111. https://doi.org/10.1002/jbmr.2554
- Lambert H., Frassetto L., Moore J. B., Torgerson D. et al. (2015) The effect of supplementation with alkaline potassium salts on bone metabolism: a meta-analysis. Osteoporos Int 26(4):1311–1318. https://doi.org/10.1007/s00198-014-3006-9
- Ceglia L., Harris S. S., Abrams S. A., Rasmussen H. M. et al. (2009) Potassium bicarbonate attenuates the urinary nitrogen excretion that accompanies an increase in dietary protein and may promote calcium absorption. J Clin Endocrinol Metab 94(2):645–653. https://doi.org/10.1210/jc.2008-1796
- Dawson-Hughes B., Castaneda-Sceppa C., Harris S. S., Palermo N. J. et al. (2010) Impact of supplementation with bicarbonate on lower-extremity muscle performance in older men and women. Osteoporos Int 21(7):1171–1179. https://doi.org/10.1007/s00198-009-1049-0
- He F. J., Marciniak M., Carney C., Markandu N. D. et al. (2010) Effects of potassium chloride and potassium bicarbonate on endothelial function, cardiovascular risk factors, and bone turnover in mild hypertensives. Hypertension 55(3):681–688. https://doi.org/10.1161/HYPERTENSIONAHA.109.147488
- Filippini T., Naska A., Kasdagli M.-I., Torres D. et al. (2020) Potassium intake and blood pressure: a dose-response meta-analysis of randomized controlled trials. J Am Heart Assoc 9(12):e015719. https://doi.org/10.1161/JAHA.119.015719
- EFSA NDA Panel (2016) Dietary reference values for potassium. EFSA Journal 14(10):4592. https://doi.org/10.2903/j.efsa.2016.4592
- Cappuccio F. P., Buchanan L. A., Ji C., Siani A., Miller M. A. (2016) Systematic review and meta-analysis of randomised controlled trials on the effects of potassium supplements on serum potassium and creatinine. BMJ Open 6(8):e011716. https://doi.org/10.1136/bmjopen-2016-011716
- Chycki J., Golas A., Halz M., Maszczyk A. et al. (2018) Chronic ingestion of sodium and potassium bicarbonate, with potassium, magnesium and calcium citrate improves anaerobic performance in elite soccer players. Nutrients 10(11):1610. https://doi.org/10.3390/nu10111610
- EFSA NDA Panel (2016) Dietary reference values for thiamin. EFSA Journal 14(12):4653. https://doi.org/10.2903/j.efsa.2016.4653
- Manore M. M. (2000) Effect of physical activity on thiamine, riboflavin, and vitamin B-6 requirements. Am J Clin Nutr 72(2 Suppl):598S–606S. https://doi.org/10.1093/ajcn/72.2.598S
- Sato A., Shimoyama Y., Ishikawa T., Murayama N. (2011) Dietary thiamin and riboflavin intake and blood thiamin and riboflavin concentrations in college swimmers undergoing intensive training. Int J Sport Nutr Exerc Metab 21(3):195–204. https://doi.org/10.1123/ijsnem.21.3.195
- van der Beek E. J., van Dokkum W., Wedel M., Schrijver J., van den Berg H. (1994) Thiamin, riboflavin and vitamin B6: impact of restricted intake on physical performance in man. J Am Coll Nutr 13(6):629–640. https://doi.org/10.1080/07315724.1994.10718459
- Webster M. J., Scheett T. P., Doyle M. R., Branz M. (1997) The effect of a thiamin derivative on exercise performance. Eur J Appl Physiol Occup Physiol 75(6):520–524. https://doi.org/10.1007/s004210050198
- Webster M. J. (1998) Physiological and performance responses to supplementation with thiamin and pantothenic acid derivatives. Eur J Appl Physiol Occup Physiol 77(6):486–491. https://doi.org/10.1007/s004210050364
- Doyle M. R., Webster M. J., Erdmann L. D. (1997) Allithiamine ingestion does not enhance isokinetic parameters of muscle performance. Int J Sport Nutr 7(1):39–47. https://doi.org/10.1123/ijsn.7.1.39
- Suzuki M., Itokawa Y. (1996) Effects of thiamine supplementation on exercise-induced fatigue. Metab Brain Dis 11(1):95–106. https://doi.org/10.1007/BF02080935
- Choi S. K., Baek S. H., Choi S. W. (2013) The effects of endurance training and thiamine supplementation on anti-fatigue during exercise. J Exerc Nutrition Biochem 17(4):189–198. https://doi.org/10.5717/jenb.2013.17.4.189
- Bager P., Hvas C. L., Rud C. L., Dahlerup J. F. (2021) Randomised clinical trial: high-dose oral thiamine versus placebo for chronic fatigue in patients with quiescent inflammatory bowel disease. Aliment Pharmacol Ther 53(1):79–86. https://doi.org/10.1111/apt.16166
