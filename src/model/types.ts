// Typy datových poznámek (SPEC kap. 4).
// Názvy polí odpovídají přesně klíčům ve frontmatteru (snake_case), aby zápis
// a čtení nepotřebovaly převodní vrstvu. Odkazy na jiné poznámky (`[[Cvik]]`)
// se v modelu drží bez hranatých závorek – jen cíl odkazu.

import type {
	BlockType,
	BodySide,
	DayOffReason,
	GoalStatus,
	GoalType,
	NormKind,
	PainStatus,
	PlanIntensity,
	EvidenceLevel,
	ExerciseCategory,
	ExerciseKind,
	ExerciseMeasure,
	MuscleId,
	ProgressionRule,
	SupplementTiming,
	RunType,
	SetTag,
	Sport,
	SwimStyle,
	TestType,
	Weekday,
} from "./constants";
import type { SourceId } from "../evidence/sources";

/** Datum ve tvaru YYYY-MM-DD (místní čas). */
export type IsoDate = string;
/** Čas ve tvaru HH:MM. */
export type ClockTime = string;
/** Cíl wikiodkazu bez závorek, např. "Bench press". */
export type LinkTarget = string;

interface NoteBase {
	schema: number;
}

// ---------- 4.1 Denní poznámka ----------

export interface SleepData {
	bedtime?: ClockTime;
	sleep_onset?: ClockTime;
	wake?: ClockTime;
	duration_min?: number;
	quality?: number;
	awakenings?: number;
	morning_feeling?: number;
}

export interface CheckInData {
	fatigue?: number;
	soreness?: number;
	mood?: number;
	stress?: number;
}

export interface HrvData {
	rmssd_ms?: number;
	resting_hr?: number;
	elonga_readiness?: number;
}

export interface BodyData {
	weight_kg?: number;
	body_fat_pct?: number;
	/** Tělesné míry – obvody v centimetrech (nepovinné, z check-inu). */
	waist_cm?: number;
	hips_cm?: number;
	chest_cm?: number;
	arm_cm?: number;
	thigh_cm?: number;
	calf_cm?: number;
}

export interface DayNote extends NoteBase {
	forma: "day";
	date: IsoDate;
	sleep: SleepData;
	check_in: CheckInData;
	hrv: HrvData;
	body: BodyData;
	/** Kroky za den (z hodinek nebo telefonu) – vstup pro běžnou aktivitu ve výživě. */
	steps?: number;
	/** Názvy suplementů, které uživatel ten den vzal (poznámky `forma: supplement`). */
	supplements?: string[];
	notes?: string;
}

// ---------- 4.2 Trénink ----------

/** Jedna série. Která pole jsou vyplněná, závisí na typu cviku. */
export interface SetEntry {
	reps?: number;
	kg?: number;
	/** Přívažek u cviků s vlastní vahou; záporný = guma / asistence. */
	added_kg?: number;
	sec?: number;
	rir?: number;
	/** Rozcvičovací série; chybí = pracovní. Nepočítá se do progrese, 1RM ani objemu. */
	warmup?: boolean;
	/** Drop série nebo série do selhání (ta se bez RIR počítá jako RIR 0). */
	tag?: SetTag;
}

export interface SetsBlock {
	type: "sets";
	exercise: LinkTarget;
	sets: SetEntry[];
	/** Superset s předchozím blokem – cviky se střídají bez pauzy. */
	superset?: boolean;
}

export interface HoldBlock {
	type: "hold";
	exercise: LinkTarget;
	sets: SetEntry[];
	superset?: boolean;
}

export interface EmomBlock {
	type: "emom";
	exercise: LinkTarget;
	minutes: number;
	reps_per_min: number;
	kg?: number;
	added_kg?: number;
	/** Počet skutečně odjetých kol, pokud se nedokončilo všech `minutes`. */
	rounds?: number;
	rpe?: number;
}

/** Položka bloku s více cviky (AMRAP, komplex). */
export interface BlockItem {
	exercise: LinkTarget;
	reps?: number;
	kg?: number;
	added_kg?: number;
	sec?: number;
}

export interface AmrapBlock {
	type: "amrap";
	minutes: number;
	items: BlockItem[];
	rounds: number;
	/** Opakování navíc v nedokončeném kole. */
	extra_reps?: number;
	rpe?: number;
}

export interface LadderBlock {
	type: "ladder";
	exercise: LinkTarget;
	/** Opakování na jednotlivých příčkách, např. [1, 2, 3, 4, 5]. */
	steps: number[];
	kg?: number;
	added_kg?: number;
}

export interface ComplexBlock {
	type: "complex";
	items: BlockItem[];
	rounds: number;
	kg?: number;
	rpe?: number;
}

/** „Na čas“ – buď daný počet opakování co nejrychleji, nebo co nejvíc opakování za daný čas. */
export interface TimedBlock {
	type: "timed";
	exercise: LinkTarget;
	sec: number;
	reps?: number;
	kg?: number;
	added_kg?: number;
}

export type Block =
	| SetsBlock
	| HoldBlock
	| EmomBlock
	| AmrapBlock
	| LadderBlock
	| ComplexBlock
	| TimedBlock;

export interface RunData {
	distance_km?: number;
	moving_time_s?: number;
	avg_hr?: number;
	max_hr?: number;
	elevation_m?: number;
	type?: RunType;
	shoes?: LinkTarget;
	/** Čas v tepových zónách 1–5 v sekundách. */
	hr_zone_s?: number[];
	/** Nejrychlejší úseky ze Stravy v sekundách: klíče 1k, 5k, 10k, half, marathon. */
	best_s?: Record<string, number>;
	/** Detail aktivity (úseky, zóny) už byl ze Stravy stažen. */
	strava_detail?: boolean;
}

export interface SwimData {
	distance_m?: number;
	style?: SwimStyle;
	pool_m?: number;
}

export interface RopeData {
	/** Celkový počet přeskoků. */
	jumps?: number;
}

export type WorkoutSource = "manual" | "strava" | "file";

export interface WorkoutNote extends NoteBase {
	forma: "workout";
	date: IsoDate;
	start?: ClockTime;
	sport: Sport;
	title?: string;
	template?: LinkTarget;
	program?: LinkTarget;
	duration_min?: number;
	/** Session RPE, CR-10 (0–10). */
	rpe?: number;
	/** Odkud trénink je: ruční zápis, synchronizace se Stravou, nebo import ze souboru GPX / TCX. */
	source: WorkoutSource;
	strava_id?: number;
	run?: RunData;
	swim?: SwimData;
	rope?: RopeData;
	blocks: Block[];
	pain: LinkTarget[];
	notes?: string;
}

// ---------- 4.3 Cvik ----------

export interface ExerciseNote extends NoteBase {
	forma: "exercise";
	name: string;
	category: ExerciseCategory;
	kind: ExerciseKind;
	measure: ExerciseMeasure;
	muscles: { primary: MuscleId[]; secondary: MuscleId[] };
	/** Podíl tělesné hmotnosti, který se zvedá (u `reps_bw`), SPEC 8.5. */
	bodyweight_fraction?: number;
	/** Zdroj podílu; chybí = orientační hodnota (praxe). */
	bodyweight_fraction_source?: SourceId;
	progression?: { ladder?: LinkTarget; level?: number };
	aliases: string[];
	/** Co cvik je a k čemu slouží (1–2 věty). */
	description?: string;
	/** Provedení krok za krokem (odrážky). */
	technique?: string;
	/** Časté chyby (odrážky). */
	mistakes?: string;
}

// ---------- 4.4 Šablona tréninku ----------

/** Cílová váha: číslo, nebo "last" = předvyplnit z minula. */
export type TargetWeight = number | "last";

export interface TemplateItem {
	exercise: LinkTarget;
	reps?: number;
	sec?: number;
	kg?: TargetWeight;
	added_kg?: TargetWeight;
}

export interface TemplateBlock {
	type: BlockType;
	/** Cvik u jednocvikových bloků (sets, hold, emom, ladder, timed). */
	exercise?: LinkTarget;
	/** Cviky u vícecvikových bloků (amrap, complex). */
	items?: TemplateItem[];
	sets?: number;
	reps?: number;
	sec?: number;
	kg?: TargetWeight;
	added_kg?: TargetWeight;
	minutes?: number;
	reps_per_min?: number;
	steps?: number[];
	rounds?: number;
	/** Superset s předchozím blokem (jen sets a hold). */
	superset?: boolean;
}

export interface TemplateNote extends NoteBase {
	forma: "template";
	name: string;
	sport: Sport;
	blocks: TemplateBlock[];
	notes?: string;
}

// ---------- 4.5 Program ----------

/** Úsek intervalového tréninku: `repeats` × (zátěž `work_s` + odpočinek `rest_s`). */
export interface IntervalStep {
	repeats: number;
	work_s: number;
	/** Odpočinek po každé zátěži; chybí = bez odpočinku (např. závěrečný úsek). */
	rest_s?: number;
}

export type ProgramTarget =
	/** `counter_steps` = vlastní tlačítka počítadla (např. 50, 100 u přeskoků); jinak z nastavení. */
	| { kind: "daily_total"; daily_total: number; counter_steps?: number[] }
	| { kind: "sets_reps"; sets: number; reps: number }
	| { kind: "pct_of_max"; sets: number; pct_of_max: number }
	| { kind: "time"; time_s: number; sets?: number }
	| { kind: "distance"; distance_km: number }
	| { kind: "intervals"; warmup_s?: number; steps: IntervalStep[]; cooldown_s?: number }
	| LadderTarget
	| EmomTarget
	| { kind: "max_sets"; sets: number; rest_s?: number };

/**
 * Žebřík / pyramida. Buď pevné příčky (`steps`, např. 1-2-3-4-5-4-3-2-1),
 * nebo otevřený žebřík „do selhání“ (`open` se `start` a `step`, např. 2, 4, 6…).
 */
export interface LadderTarget {
	kind: "ladder";
	steps?: number[];
	open?: boolean;
	start?: number;
	step?: number;
	/** Kolikrát se celý žebřík opakuje (výchozí 1). */
	rounds?: number;
	/** Pauza po příčce = počet opakování × tolik sekund. */
	rest_per_rep_s?: number;
	/** Pauza mezi koly. */
	round_rest_s?: number;
}

/** EMOM: každou minutu `reps` opakování, nebo `pct_of_max` % z posledního maxima. */
export interface EmomTarget {
	kind: "emom";
	reps?: number;
	pct_of_max?: number;
	/** Pevná délka v minutách. */
	minutes?: number;
	/** Pokračovat do selhání, nejvýš `max_minutes`. */
	until_failure?: boolean;
	max_minutes?: number;
}

/** Cíl pro konkrétní týden programu (1 = první týden). */
export interface WeekSchedule {
	week: number;
	/** Cvik pro tento týden místo výchozího cviku položky (rotace variant). */
	exercise?: LinkTarget;
	/** Cíl pro všechny tréninky týdne. */
	target?: ProgramTarget;
	/** Cíle pro jednotlivé tréninky týdne v pořadí dnů programu (přebíjí `target`). */
	sessions?: ProgramTarget[];
}

export interface ProgramItem {
	exercise: LinkTarget;
	/** Výchozí cíl – platí v týdnech, které nemají záznam v `schedule`. */
	target: ProgramTarget;
	/** Dny, kdy se položka dělá; prázdné = všechny dny programu. */
	days?: Weekday[];
	/** Plán po týdnech (např. Couch to 5K, rotace variant cviku). */
	schedule?: WeekSchedule[];
	/**
	 * Cviky, z jejichž testů se bere poslední maximum pro cíle s % maxima.
	 * Chybí = jen cvik položky (v daném týdnu).
	 */
	max_from?: LinkTarget[];
}

export interface ProgramNote extends NoteBase {
	forma: "program";
	name: string;
	builtin: boolean;
	evidence: EvidenceLevel;
	/** ID zdrojů z katalogu (src/evidence/sources.ts). */
	sources?: SourceId[];
	duration_weeks?: number;
	days: Weekday[];
	items: ProgramItem[];
	progression: { rule: ProgressionRule; add?: number };
	retest_every_weeks?: number;
	active: boolean;
	active_since?: IsoDate;
	/** Obvyklá délka jednoho tréninku programu – s ní se dny programu počítají do plánu týdne (5.16). */
	session_min?: number;
	/** Obvyklá intenzita tréninku programu pro plán týdne; chybí = střední. */
	intensity?: PlanIntensity;
	notes?: string;
}

// ---------- 4.6 Test maxima ----------

export interface TestNote extends NoteBase {
	forma: "test";
	date: IsoDate;
	exercise: LinkTarget;
	test_type: TestType;
	/** Časový limit u `max_reps_timed`. */
	time_limit_s?: number;
	/** Výsledek: opakování, sekundy (výdrž / čas běhu) nebo kg (1RM). */
	result: number;
	/** Vzdálenost u `run_time`. */
	distance_km?: number;
	notes?: string;
}

// ---------- 4.6 Vybavení ----------

/** Běžecké boty (SPEC 5.10). Najeté kilometry = `start_km` + běhy, které na boty odkazují. */
export interface GearNote extends NoteBase {
	forma: "gear";
	kind: "shoes";
	name: string;
	/** Kilometry najeté před začátkem evidence. */
	start_km: number;
	/** Vlastní limit; chybí = výchozí z nastavení. */
	limit_km?: number;
	active: boolean;
	notes?: string;
}

// ---------- 4.6 Bolest / zranění ----------

export interface PainEntry {
	date: IsoDate;
	/** Intenzita 0–10. */
	level: number;
}

export interface PainNote extends NoteBase {
	forma: "pain";
	/** Krátký popis, např. „Pravé koleno“. */
	name: string;
	/** Nejbližší svalová partie (ID pro panáčka). */
	muscle: MuscleId;
	side?: BodySide;
	/** Aktuální intenzita 0–10. */
	level: number;
	since: IsoDate;
	trigger?: string;
	status: PainStatus;
	/** Vývoj intenzity od nejstaršího záznamu. */
	history: PainEntry[];
	notes?: string;
}

// ---------- 4.6 Cíl ----------

export interface GoalNote extends NoteBase {
	forma: "goal";
	name: string;
	type: GoalType;
	/**
	 * Cílová hodnota: sekundy (run_time), kg (lift_1rm, body_weight), opakování
	 * nebo sekundy výdrže (reps_max), stupeň (skill_level), km za týden
	 * (weekly_volume); u normy se nepoužívá.
	 */
	target?: number;
	/** Cvik u lift_1rm a reps_max. */
	exercise?: LinkTarget;
	/** Trať u run_time. */
	distance_km?: number;
	/** Žebříček u skill_level. */
	ladder?: LinkTarget;
	/** Norma u typu norm. */
	norm?: LinkTarget;
	created: IsoDate;
	deadline?: IsoDate;
	/** Stav při založení – od něj se počítá průběh. */
	start_value?: number;
	status: GoalStatus;
	notes?: string;
}

// ---------- 4.6 Norma ----------

/** Řádek tabulky normy: požadovaná hodnota pro pohlaví a věk (prázdné = pro všechny). */
export interface NormRow {
	sex?: "male" | "female";
	age_from?: number;
	age_to?: number;
	/** Opakování, sekundy výdrže, nebo čas běhu v sekundách. */
	value: number;
}

export interface NormItem {
	exercise: LinkTarget;
	kind: NormKind;
	/** Časový limit u opakování na čas. */
	time_limit_s?: number;
	/** Trať u běhu. */
	distance_km?: number;
	rows: NormRow[];
}

export interface NormNote extends NoteBase {
	forma: "norm";
	name: string;
	items: NormItem[];
	notes?: string;
}

// ---------- 4.7 Suplement ----------

/** Jedna látka ve složení vlastního přípravku (z etikety); množství v jedné porci. */
export interface SupplementIngredient {
	name: string;
	amount: number;
	/** g, mg, µg nebo IU. */
	unit: string;
	/** ID látky v katalogu – podle něj se hlídá horní limit. */
	catalog?: string;
}

export interface SupplementNote extends NoteBase {
	forma: "supplement";
	name: string;
	/** ID položky katalogu (src/seed/supplements.ts); chybí u vlastního suplementu. */
	catalog?: string;
	/** Denní dávka v jednotkách `unit`. */
	dose?: number;
	/** Jednotka dávky, např. "g", "mg", "µg", "IU", "kapsle". */
	unit?: string;
	timing: SupplementTiming;
	/** Bere se jen ve dnech s tréninkem (např. kofein). */
	training_days_only: boolean;
	active: boolean;
	/** Od kdy se bere – od tohoto dne se počítá dodržování. */
	since?: IsoDate;
	notes?: string;
	/** Složení vlastního přípravku v jedné porci; `dose` je pak počet porcí denně. */
	ingredients?: SupplementIngredient[];
}

// ---------- 4.8 Plán týdne ----------

/** Jeden naplánovaný trénink. */
export interface PlanItem {
	/** Označení položky v rámci poznámky (p1, p2, …) – podle něj se položka upravuje a přesouvá. */
	id: string;
	date: IsoDate;
	sport: Sport;
	title?: string;
	/** Šablona, ze které se trénink zapíše. */
	template?: LinkTarget;
	duration_min?: number;
	intensity: PlanIntensity;
	/** Plánovaná vzdálenost běhu. */
	distance_km?: number;
	notes?: string;
}

/** Plán jednoho týdne (SPEC 4.8, 5.16); `week` je pondělí týdne. */
/** Den, kdy se netrénuje: plánované volno, nemoc nebo dovolená. */
export interface PlanDayOff {
	date: IsoDate;
	reason: DayOffReason;
}

export interface PlanNote extends NoteBase {
	forma: "plan";
	week: IsoDate;
	items: PlanItem[];
	/** Volné dny týdne; chybí = žádné. */
	off?: PlanDayOff[];
}

export type FormaNote =
	| PlanNote
	| DayNote
	| WorkoutNote
	| ExerciseNote
	| TemplateNote
	| ProgramNote
	| TestNote
	| GearNote
	| PainNote
	| GoalNote
	| NormNote
	| SupplementNote;
