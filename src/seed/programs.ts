// Předpřipravené programy (SPEC 5.7). Vytvoří se jako neaktivní (`active: false`);
// uživatel si program zapne nebo zkopíruje a upraví. Existující poznámky se nepřepisují.
// Štítek programu = nejslabší štítek jeho částí (heuristiky se nevydávají za výzkum).
// Doporučení v popisech odkazují jen na zdroje z katalogu (src/evidence/sources.ts).

import { SCHEMA_VERSION, WEEKDAYS } from "../model/constants";
import type { IntervalStep, ProgramNote, ProgramTarget, WeekSchedule } from "../model/types";
import { getLanguage, type Language } from "../i18n";
import { PROGRAMS_EN } from "./en/programs";
import { exerciseName } from "./localize";

export interface SeedProgram {
	note: ProgramNote;
	/** Popis do těla poznámky (jen při založení, pak patří uživateli). */
	description: string;
}

function program(fields: Omit<ProgramNote, "forma" | "schema" | "builtin" | "active">): ProgramNote {
	return { forma: "program", schema: SCHEMA_VERSION, builtin: true, active: false, ...fields };
}

// ---------- Společná doporučení (se zdrojem a štítkem) ----------

const REC_SLEEP = "**Spánek:** aspoň 7 hodin denně; po kratší noci zvol lehčí den. *(Watson 2015 – konsenzus)*";
const REC_PROTEIN = "**Bílkoviny:** zhruba 1,6–2,2 g na kg hmotnosti denně podporují nárůst síly a svalů. *(Morton 2018 – výzkum)*";
const REC_RIR =
	"**Rezerva:** série ukončuj 1–3 opakování před selháním – stejný efekt s menší únavou. *(Helms 2016 – výzkum / praxe)*";
const REC_PAIN =
	"**Bolest:** když cvik bolí, uber nebo ho vynech. Při bolesti 4/10 a víc nebo trvající déle než týden se poraď s fyzioterapeutem nebo lékařem.";
const REC_EASY_RUNS = "**Tempo:** většinu běhů běhej lehce – tak, abys zvládl mluvit. *(Seiler 2010 – výzkum)*";
const REC_LOAD_JUMP =
	"**Zátěž:** nepřidávej skokově; prudký nárůst zátěže je spojovaný s vyšším rizikem zranění (metoda je ale sporná). *(Gabbett 2016, Impellizzeri 2020 – výzkum)*";
const REC_WARMUP = "**Rozcvičení:** před tréninkem 5 minut rozhýbání a 1–2 lehké série. *(praxe)*";
const REC_CHECKIN =
	"**Check-in:** když se několik dní po sobě zhoršuje únava, bolest svalů nebo spánek, uber objem nebo si dej den volna. *(Saw 2016 – výzkum; konkrétní postup praxe)*";

function recommendations(...items: string[]): string {
	return `## Doporučení\n\n${items.map((item) => `- ${item}`).join("\n")}`;
}

// ---------- Couch to 5K ----------
// Intervaly podle plánu NHS Couch to 5K (nhs.uk, ověřeno 30. 9. 2026):
// každý trénink začíná a končí 5 min svižné chůze; zátěž = běh, odpočinek = chůze.

const min = (m: number): number => Math.round(m * 60);
/** Úsek běhu, volitelně s chůzí po něm a opakováním. */
const run = (runMin: number, walkMin?: number, repeats = 1): IntervalStep =>
	walkMin === undefined ? { repeats, work_s: min(runMin) } : { repeats, work_s: min(runMin), rest_s: min(walkMin) };
const c25k = (...steps: IntervalStep[]): ProgramTarget => ({
	kind: "intervals",
	warmup_s: min(5),
	steps,
	cooldown_s: min(5),
});

export const COUCH_TO_5K_SCHEDULE: WeekSchedule[] = [
	// 1: 7× (běh 1 min, chůze 1,5 min), pak běh 1 min
	{ week: 1, target: c25k(run(1, 1.5, 7), run(1)) },
	// 2: 5× (běh 1,5 min, chůze 2 min), pak běh 1,5 min
	{ week: 2, target: c25k(run(1.5, 2, 5), run(1.5)) },
	// 3: běh 1,5 / chůze 1,5 / běh 3 / chůze 3 / běh 1,5 / chůze 1,5 / běh 3
	{ week: 3, target: c25k(run(1.5, 1.5), run(3, 3), run(1.5, 1.5), run(3)) },
	// 4: běh 3 / chůze 1,5 / běh 5 / chůze 2,5 / běh 3 / chůze 1,5 / běh 5
	{ week: 4, target: c25k(run(3, 1.5), run(5, 2.5), run(3, 1.5), run(5)) },
	{
		week: 5,
		sessions: [
			c25k(run(5, 3, 2), run(5)), // běh 5 / chůze 3 / běh 5 / chůze 3 / běh 5
			c25k(run(8, 5), run(8)), // běh 8 / chůze 5 / běh 8
			c25k(run(20)), // běh 20 min
		],
	},
	{
		week: 6,
		sessions: [
			c25k(run(5, 3), run(8, 3), run(5)), // běh 5 / chůze 3 / běh 8 / chůze 3 / běh 5
			c25k(run(10, 3), run(10)), // běh 10 / chůze 3 / běh 10
			c25k(run(25)), // běh 25 min
		],
	},
	{ week: 7, target: c25k(run(25)) },
	{ week: 8, target: c25k(run(28)) },
	{ week: 9, target: c25k(run(30)) },
];

// ---------- Švihadlo ----------
// Vlastní programy z obecných intervalových metod; štítek praxe.

/** Úsek: `repeats` × (skákání `workS` s + odpočinek `restS` s). */
const iv = (workS: number, restS?: number, repeats = 1): IntervalStep =>
	restS === undefined ? { repeats, work_s: workS } : { repeats, work_s: workS, rest_s: restS };
const rope = (...steps: IntervalStep[]): ProgramTarget => ({ kind: "intervals", steps });
/** Pyramida v minutách s odpočinkem 45 s mezi úseky (po posledním už ne). */
const pyramid = (...minutes: number[]): ProgramTarget =>
	rope(...minutes.map((m, i) => (i < minutes.length - 1 ? iv(m * 60, 45) : iv(m * 60))));

export const ROPE_START: WeekSchedule[] = [
	{ week: 1, target: rope(iv(20, 40, 8)) }, // 8 × 60 s = 8 min
	{ week: 2, target: rope(iv(30, 30, 10)) }, // 10 min
	{ week: 3, target: rope(iv(40, 20, 10)) }, // 10 min
	{ week: 4, target: rope(iv(60, 30, 8)) }, // 8 × 90 s = 12 min
];

const ropeWeek = (week: number, fast: ProgramTarget, long: ProgramTarget, mixed: ProgramTarget): WeekSchedule => ({
	week,
	sessions: [fast, long, mixed],
});

export const ROPE_FITNESS: WeekSchedule[] = [
	...[1, 2].map((w) => ropeWeek(w, rope(iv(30, 30, 10)), rope(iv(120, 60, 4)), pyramid(1, 2, 3, 2, 1))),
	...[3, 4].map((w) => ropeWeek(w, rope(iv(40, 20, 12)), rope(iv(180, 60, 4)), pyramid(1, 2, 3, 3, 2, 1))),
	...[5, 6].map((w) => ropeWeek(w, rope(iv(40, 20, 15)), rope(iv(180, 60, 5)), pyramid(2, 3, 4, 3, 2))),
];

// ---------- Kliky a shyby – 6 týdnů ----------
// Vlastní program postavený z obecných metod (EMOM, série s % maxima, těžší
// varianty, retest). Série nejdou do selhání; maximum se testuje ve 3. a 6. týdnu.

const TEST_SET: ProgramTarget = { kind: "max_sets", sets: 1 };
/** Pátek: těžší varianta, střídá se po týdnech; ve 3. a 6. týdnu test maxima základního cviku. */
function variantSchedule(base: string, a: string, b: string): WeekSchedule[] {
	return [
		{ week: 1, exercise: a },
		{ week: 2, exercise: b },
		{ week: 3, exercise: base, target: TEST_SET },
		{ week: 4, exercise: a },
		{ week: 5, exercise: b },
		{ week: 6, exercise: base, target: TEST_SET },
	];
}

export const SEED_PROGRAMS: SeedProgram[] = [
	{
		note: program({
			name: "Základ 4",
			evidence: "practice",
			sources: ["kikuchi2017", "kotarsky2018", "helms2016", "practice"],
			days: ["mon", "wed", "fri"],
			items: [
				{ exercise: "Kliky", target: { kind: "pct_of_max", sets: 3, pct_of_max: 60 } },
				{ exercise: "Shyby", target: { kind: "pct_of_max", sets: 3, pct_of_max: 60 } },
				{ exercise: "Dřepy", target: { kind: "pct_of_max", sets: 3, pct_of_max: 60 } },
				{ exercise: "Sedy-lehy", target: { kind: "pct_of_max", sets: 3, pct_of_max: 60 } },
			],
			progression: { rule: "retest_pct_of_max" },
			retest_every_weeks: 3,
		}),
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

${recommendations(REC_RIR, REC_SLEEP, REC_PROTEIN, REC_CHECKIN, REC_PAIN)}

Štítek: **praxe** – procenta z maxima a počty sérií jsou trenérská praxe. Že trénink kliků vede k nárůstu síly a svalu, podporuje výzkum (Kikuchi 2017, Kotarsky 2018).`,
	},
	{
		note: program({
			name: "Kliky a shyby – 6 týdnů",
			evidence: "practice",
			sources: ["kikuchi2017", "kotarsky2018", "helms2016", "practice"],
			duration_weeks: 6,
			days: ["mon", "wed", "fri"],
			items: [
				// Pondělí – hustota
				{ exercise: "Kliky", days: ["mon"], target: { kind: "emom", pct_of_max: 40, minutes: 10 } },
				{ exercise: "Shyby", days: ["mon"], target: { kind: "emom", pct_of_max: 40, minutes: 10 } },
				// Středa – objem
				{ exercise: "Kliky", days: ["wed"], target: { kind: "pct_of_max", sets: 5, pct_of_max: 60 } },
				{ exercise: "Shyby", days: ["wed"], target: { kind: "pct_of_max", sets: 5, pct_of_max: 60 } },
				// Pátek – těžší varianta, ve 3. a 6. týdnu test maxima
				{
					exercise: "Kliky",
					days: ["fri"],
					target: { kind: "pct_of_max", sets: 4, pct_of_max: 50 },
					max_from: ["Kliky"],
					schedule: variantSchedule("Kliky", "Diamantové kliky", "Kliky s nohama na vyvýšení"),
				},
				{
					exercise: "Shyby",
					days: ["fri"],
					target: { kind: "pct_of_max", sets: 4, pct_of_max: 50 },
					max_from: ["Shyby"],
					schedule: variantSchedule("Shyby", "Shyby podhmatem", "Shyby širokým úchopem"),
				},
			],
			progression: { rule: "retest_pct_of_max" },
			retest_every_weeks: 3,
		}),
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

${recommendations(REC_RIR, REC_WARMUP, REC_SLEEP, REC_PROTEIN, REC_CHECKIN, REC_PAIN)}

Štítek: **praxe** – rozvržení, procenta a délky jsou trenérská praxe. Že trénink kliků vede k nárůstu síly a svalu, podporuje výzkum (Kikuchi 2017, Kotarsky 2018); ukončování sérií před selháním vychází z Helms 2016.`,
	},
	{
		note: program({
			name: "Od nuly k prvnímu shybu",
			evidence: "practice",
			sources: ["practice"],
			days: ["mon", "wed", "fri"],
			items: [
				{ exercise: "Australské přítahy", target: { kind: "sets_reps", sets: 3, reps: 8 } },
				{ exercise: "Negativní shyby", target: { kind: "sets_reps", sets: 3, reps: 3 } },
				{ exercise: "Vis na hrazdě", target: { kind: "time", time_s: 20, sets: 3 } },
			],
			progression: { rule: "none" },
		}),
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

${recommendations(REC_WARMUP, REC_SLEEP, REC_PROTEIN, REC_PAIN)}

Štítek: **praxe**.`,
	},
	{
		note: program({
			name: "Od gauče k 5 km",
			evidence: "practice",
			sources: ["nhsCouchTo5k", "seiler2010", "gabbett2016", "impellizzeri2020"],
			duration_weeks: 9,
			days: ["mon", "wed", "sat"],
			items: [{ exercise: "Běh", target: COUCH_TO_5K_SCHEDULE[0]!.target!, schedule: COUCH_TO_5K_SCHEDULE }],
			progression: { rule: "none" },
		}),
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

${recommendations(REC_EASY_RUNS, REC_LOAD_JUMP, REC_SLEEP, REC_CHECKIN, REC_PAIN)}

Plán intervalů převzat z NHS Couch to 5K (nhs.uk, © Crown copyright).

Štítek: **konsenzus / praxe** (veřejný program NHS) – v pluginu vedeno jako praxe.`,
	},
	{
		note: program({
			name: "100 kliků denně",
			evidence: "practice",
			sources: ["practice"],
			days: [...WEEKDAYS],
			items: [{ exercise: "Kliky", target: { kind: "daily_total", daily_total: 100 } }],
			progression: { rule: "none" },
		}),
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

${recommendations(REC_RIR, REC_CHECKIN, REC_SLEEP, REC_PAIN)}

Štítek: **praxe**.`,
	},
	{
		note: program({
			name: "Grease the groove",
			evidence: "practice",
			sources: ["practice"],
			days: ["mon", "tue", "wed", "thu", "fri"],
			items: [{ exercise: "Shyby", target: { kind: "pct_of_max", sets: 5, pct_of_max: 50 } }],
			progression: { rule: "retest_pct_of_max" },
			retest_every_weeks: 2,
		}),
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

${recommendations(REC_RIR, REC_SLEEP, REC_CHECKIN, REC_PAIN)}

Štítek: **praxe**.`,
	},
	{
		note: program({
			name: "Kettlebell denně",
			evidence: "practice",
			sources: ["lake2012", "farrar2010", "practice"],
			days: [...WEEKDAYS],
			items: [
				{ exercise: "Kettlebell swing", target: { kind: "sets_reps", sets: 10, reps: 10 } },
				{ exercise: "Turecký vztyk", target: { kind: "sets_reps", sets: 5, reps: 2 } },
			],
			progression: { rule: "none" },
		}),
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

${recommendations(REC_WARMUP, REC_CHECKIN, REC_SLEEP, REC_PAIN)}

Štítek: **praxe** – rozvržení je trenérská praxe. Že trénink swingů zlepšuje maximální a výbušnou sílu a je kondičně náročný, podporuje výzkum (Lake 2012, Farrar 2010).`,
	},
	{
		note: program({
			name: "Odlehčovací týden",
			evidence: "practice",
			sources: ["practice"],
			duration_weeks: 1,
			days: [...WEEKDAYS],
			items: [],
			progression: { rule: "none" },
		}),
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

${recommendations(REC_SLEEP, REC_PROTEIN, REC_CHECKIN)}

Štítek: **praxe** – jednotlivé signály únavy mají oporu ve výzkumu, konkrétní podoba odlehčení je trenérská praxe.`,
	},
	{
		note: program({
			name: "Švihadlo od nuly – 4 týdny",
			evidence: "practice",
			sources: ["practice"],
			duration_weeks: 4,
			days: ["mon", "wed", "fri"],
			items: [{ exercise: "Švihadlo", target: ROPE_START[0]!.target!, schedule: ROPE_START }],
			progression: { rule: "none" },
		}),
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

${recommendations(REC_LOAD_JUMP, REC_CHECKIN, REC_SLEEP, REC_PAIN)}

Štítek: **praxe**.`,
	},
	{
		note: program({
			name: "Švihadlo – kondice 6 týdnů",
			evidence: "practice",
			sources: ["practice"],
			duration_weeks: 6,
			days: ["mon", "wed", "fri"],
			items: [{ exercise: "Švihadlo", target: ROPE_FITNESS[0]!.sessions![0]!, schedule: ROPE_FITNESS }],
			progression: { rule: "none" },
		}),
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

${recommendations(REC_LOAD_JUMP, REC_WARMUP, REC_CHECKIN, REC_SLEEP, REC_PAIN)}

Štítek: **praxe**.`,
	},
	{
		note: program({
			name: "Švihadlo – 1000 přeskoků",
			evidence: "practice",
			sources: ["practice"],
			duration_weeks: 4,
			days: ["mon", "tue", "wed", "thu", "fri", "sat"],
			items: [
				{ exercise: "Švihadlo", target: { kind: "daily_total", daily_total: 1000, counter_steps: [50, 100, 200] } },
			],
			progression: { rule: "none" },
		}),
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

${recommendations(REC_LOAD_JUMP, REC_CHECKIN, REC_SLEEP, REC_PAIN)}

Štítek: **praxe**.`,
	},
];

/** Program v jazyce: název, popis a názvy cviků (v položkách, rozpisu i u testů maxima). */
function localizeProgram(seed: SeedProgram): SeedProgram {
	const en = PROGRAMS_EN[seed.note.name];
	if (!en) return seed;
	const name = (exercise: string) => exerciseName(exercise, "en");
	const note: ProgramNote = {
		...seed.note,
		name: en.name,
		items: seed.note.items.map((item) => ({
			...item,
			exercise: name(item.exercise),
			...(item.max_from ? { max_from: item.max_from.map(name) } : {}),
			...(item.schedule ? { schedule: item.schedule.map((s) => (s.exercise ? { ...s, exercise: name(s.exercise) } : s)) } : {}),
		})),
	};
	if (en.notes !== undefined) note.notes = en.notes;
	return { note, description: en.description };
}

let englishPrograms: SeedProgram[] | null = null;

export function seedPrograms(language: Language = getLanguage()): SeedProgram[] {
	if (language === "cs") return SEED_PROGRAMS;
	englishPrograms ??= SEED_PROGRAMS.map(localizeProgram);
	return englishPrograms;
}
