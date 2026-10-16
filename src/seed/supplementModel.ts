// Model hodnocení suplementů: každá látka se hodnotí zvlášť v každé oblasti
// přínosu (výkon, regenerace, imunita…), ne jedním verdiktem. Rozlišuje se
// „nefunguje“ (testováno, nepotvrzeno) a „nevíme“ (jen laboratoř).
// Bez závislosti na Obsidianu.

import type { SourceId } from "../evidence/sources";
import type { EvidenceLevel, SupplementTiming } from "../model/constants";
import { translated } from "../i18n";

export const BENEFIT_AREAS = [
	"performance",
	"recovery",
	"body",
	"immunity",
	"cognition",
	"mood_stress",
	"sleep",
	"cardio_metabolic",
	"hormones",
	"bones_joints",
] as const;
export type BenefitArea = (typeof BENEFIT_AREAS)[number];

export const AREA_LABELS: Record<BenefitArea, string> = translated({
	performance: "Výkon",
	recovery: "Regenerace",
	body: "Svaly a složení těla",
	immunity: "Imunita",
	cognition: "Soustředění a paměť",
	mood_stress: "Nálada a stres",
	sleep: "Spánek",
	cardio_metabolic: "Srdce a metabolismus",
	hormones: "Hormony",
	bones_joints: "Kosti a klouby",
});

export function isBenefitArea(value: string): value is BenefitArea {
	return (BENEFIT_AREAS as readonly string[]).includes(value);
}

/**
 * Známka důkazů v jedné oblasti:
 * A – stanovisko odborné společnosti nebo více shodných metaanalýz,
 * B – metaanalýza nebo více RCT, efekt malý nebo jen u určité skupiny,
 * C – 1–3 malé studie, nejednotné výsledky nebo financování výrobcem,
 * D – jen zvířata nebo buňky, u lidí nic,
 * X – u lidí testováno a účinek se nepotvrdil.
 */
export const GRADES = ["A", "B", "C", "D", "X"] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_SHORT: Record<Grade, string> = { A: "A", B: "B", C: "C", D: "D", X: "✗" };

export const GRADE_HELP: Record<Grade, string> = translated({
	A: "Stanovisko odborné společnosti nebo více kvalitních metaanalýz se shodným závěrem.",
	B: "Metaanalýza nebo více kontrolovaných studií s převážně kladným výsledkem; účinek bývá malý nebo jen u určité skupiny lidí.",
	C: "Jedna až tři malé studie u lidí, nejednotné výsledky nebo studie placené výrobcem.",
	D: "Jen pokusy na zvířatech nebo buňkách – u lidí se neví.",
	X: "U lidí testováno a účinek se nepotvrdil.",
});

export interface Benefit {
	area: BenefitArea;
	grade: Grade;
	/** Podmínka nebo upřesnění: „jen při nedostatku“, „pastilky na začátku nachlazení“… */
	note?: string;
}

/** Bezpečnost při běžných dávkách. */
export type SafetyLevel = "ok" | "caution" | "risk";

export const SAFETY_LABELS: Record<SafetyLevel, string> = translated({
	ok: "bez známých problémů při běžných dávkách",
	caution: "možné vedlejší účinky nebo interakce",
	risk: "vážná rizika",
});

/** U látek s vedlejšími účinky nebo riziky vždy doporučit lékaře. */
export const SAFETY_DOCTOR_NOTE = "Pokud bereš léky nebo máš zdravotní potíže, poraď se s lékařem.";

/** Skupina podle shody s cíli uživatele – určuje pořadí a nadpis v knihovně. */
export type MatchGroup = "fits" | "maybe" | "other";

export const MATCH_TITLES: Record<MatchGroup, string> = translated({
	fits: "Má smysl pro tvoje cíle – silné nebo střední důkazy",
	maybe: "Možná pomáhá – předběžné důkazy",
	other: "Pro tvoje cíle nepotvrzeno nebo mimo ně",
});

const GRADE_RANK: Record<Grade, number> = { A: 4, B: 3, C: 2, D: 1, X: 0 };

/** Oblasti, které se posuzují: vybrané cíle, bez výběru všechny. */
function relevant(benefits: readonly Benefit[], goals: readonly BenefitArea[]): Benefit[] {
	return goals.length === 0 ? [...benefits] : benefits.filter((b) => goals.includes(b.area));
}

/** Nejlepší známka látky v oblastech cílů; null, když v nich není hodnocená. */
export function bestGrade(benefits: readonly Benefit[], goals: readonly BenefitArea[]): Grade | null {
	let best: Grade | null = null;
	for (const b of relevant(benefits, goals)) if (best === null || GRADE_RANK[b.grade] > GRADE_RANK[best]) best = b.grade;
	return best;
}

export function matchGroup(benefits: readonly Benefit[], goals: readonly BenefitArea[]): MatchGroup {
	const best = bestGrade(benefits, goals);
	if (best === "A" || best === "B") return "fits";
	return best === "C" ? "maybe" : "other";
}

/** Filtr knihovny: nejslabší přípustné důkazy (v cílech uživatele) a nejhorší přípustná bezpečnost. */
export interface CatalogFilter {
	/** "b" = jen A a B, "c" = aspoň C. */
	evidence: "all" | "c" | "b";
	/** "no_risk" = bez vážných rizik, "ok" = jen bez známých problémů. */
	safety: "all" | "no_risk" | "ok";
}

export const NO_FILTER: CatalogFilter = { evidence: "all", safety: "all" };

export function passesFilter(item: { benefits: readonly Benefit[]; safety: SafetyLevel }, goals: readonly BenefitArea[], filter: CatalogFilter): boolean {
	const best = bestGrade(item.benefits, goals);
	const rank = best === null ? -1 : GRADE_RANK[best];
	if (filter.evidence !== "all" && rank < (filter.evidence === "b" ? GRADE_RANK.B : GRADE_RANK.C)) return false;
	if (filter.safety === "ok") return item.safety === "ok";
	return filter.safety === "all" || item.safety !== "risk";
}

/** Řazení uvnitř skupiny: lepší známka v cílech první, pak podle názvu. */
export function compareByGoals<T extends { name: string; benefits: readonly Benefit[] }>(goals: readonly BenefitArea[]): (a: T, b: T) => number {
	const rank = (item: T) => {
		const best = bestGrade(item.benefits, goals);
		return best === null ? -1 : GRADE_RANK[best];
	};
	return (a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, "cs");
}

/** Rozdělení přínosů pro kartu: „má smysl pro“ (A/B), „možná pomáhá“ (C), „nepotvrzeno / nefunguje“ (D, X). */
export function splitBenefits(benefits: readonly Benefit[]): { good: Benefit[]; maybe: Benefit[]; none: Benefit[] } {
	return {
		good: benefits.filter((b) => b.grade === "A" || b.grade === "B"),
		maybe: benefits.filter((b) => b.grade === "C"),
		none: benefits.filter((b) => b.grade === "D" || b.grade === "X"),
	};
}

/** „Výkon A (zátěž 30 s – 12 min)“. */
export function benefitText(b: Benefit): string {
	return `${AREA_LABELS[b.area]} ${GRADE_SHORT[b.grade]}${b.note ? ` (${b.note})` : ""}`;
}

// ---------- Kofein a spánek ----------

/** Kofein méně než tolik hodin před spaním zkracuje spánek (Drake 2013). */
export const CAFFEINE_SLEEP_HOURS = 6;

/**
 * Je teď (minuty od půlnoci) méně než 6 h do obvyklého ulehnutí? Ulehnutí po
 * půlnoci (např. 00:30) se bere jako následující den.
 */
export function caffeineTooLate(nowMin: number, bedtimeMin: number): boolean {
	const bed = bedtimeMin < 12 * 60 ? bedtimeMin + 24 * 60 : bedtimeMin;
	const now = nowMin < 4 * 60 ? nowMin + 24 * 60 : nowMin;
	const diff = bed - now;
	return diff > 0 && diff < CAFFEINE_SLEEP_HOURS * 60;
}

// ---------- Studie v katalogu ----------

/** Co zjistil jeden zdroj. */
export interface StudyFinding {
	source: SourceId;
	finding: string;
	/** Oblast přínosu, které se zjištění týká; chybí = obecné (hlavní účinek látky). */
	area?: BenefitArea;
	/** Studii platil nebo psal výrobce testovaného přípravku. */
	funded?: boolean;
}

/** Jedna látka katalogu – stejný tvar pro všechny části (supplementsBase / New / More). */
export interface CatalogEntry {
	id: string;
	name: string;
	/** Další názvy pro hledání. */
	aliases: string[];
	/** Jedna až tři věty: co důkazy říkají. */
	summary: string;
	/** Srovnávané zdroje a co který zjistil. */
	studies: StudyFinding[];
	/** Shodují se zdroje, nebo se rozcházejí? */
	agreement: string;
	/** Dávkování podle zdrojů. */
	dosing: string;
	/** Pro koho a kdy to má smysl. */
	forWhom: string;
	/** Rizika, limity, kdy nebrat. */
	risks: string;
	evidence: EvidenceLevel;
	/** Výchozí hodnoty při přidání do „Moje suplementy“. */
	defaults: { dose?: number; unit?: string; timing: SupplementTiming; trainingDaysOnly?: boolean };
	/** Známka důkazů v každé hodnocené oblasti přínosu. */
	benefits: Benefit[];
	safety: SafetyLevel;
	/** Konkrétní upozornění k bezpečnosti (interakce, kdo by neměl užívat). */
	safetyNote?: string;
}
