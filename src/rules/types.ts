// Doporučovací engine (SPEC kap. 10): typy pravidel, doporučení a kontextu.
// Bez závislosti na Obsidianu.

import type { CheckInTrend, DeloadSignals } from "../calc/deload";
import type { Acwr, Monotony } from "../calc/fitness";
import type { ForecastStatus } from "../calc/goals";
import type { Baseline } from "../calc/hrv";
import type { Recovery } from "../calc/muscleVolume";
import type { PainAssessment } from "../calc/pain";
import type { IntensityShare, RunSpike } from "../calc/running";
import type { SourceId } from "../evidence/sources";
import type { EvidenceLevel, MuscleId, PlanIntensity } from "../model/constants";
import type { ThresholdSettings } from "../settings/settings";

export type RecommendationLevel = "info" | "suggest" | "warn";

/** Kam doporučení vede (karta view nebo check-in). */
export interface RecommendationAction {
	label: string;
	target: "body" | "goals" | "overview" | "programs" | "plan" | "nutrition" | "check-in";
	/** Místo otevření karty přesune položku plánu týdne na jiný den. */
	move?: { itemId: string; from: string; to: string };
}

export interface Recommendation {
	ruleId: string;
	level: RecommendationLevel;
	title: string;
	text: string;
	/** Z čeho doporučení vzniklo – konkrétní čísla uživatele. */
	reasons: string[];
	sourceIds: SourceId[];
	evidence: EvidenceLevel;
	action?: RecommendationAction;
}

/** Co pravidlo vrací; zdroje a štítek doplní engine z definice pravidla. */
export type RuleOutput = Omit<Recommendation, "ruleId" | "sourceIds" | "evidence">;

export interface Rule {
	id: string;
	sources: SourceId[];
	/** Štítek nesmí být silnější než nejslabší zdroj. */
	evidence: EvidenceLevel;
	evaluate(ctx: RuleContext): RuleOutput | null;
}

export interface RuleGoal {
	name: string;
	status: ForecastStatus;
	overdue: boolean;
	eta: string | null;
	deadline?: string;
}

export interface RuleChallenge {
	/** Název programu – denní výzvy bez volných dnů. */
	name: string;
	muscles: MuscleId[];
}

export interface RulePlanItem {
	id: string;
	date: string;
	/** „Běh – Tempo“. */
	label: string;
	intensity: PlanIntensity;
	/** Ručně naplánovaná položka jde přesunout; den programu ne. */
	movable: boolean;
}

/** Běh delší než obvykle: dnes zapsaný, nebo naplánovaný do konce týdne. */
export interface RuleRunSpike extends RunSpike {
	date: string;
	/** Naplánovaný běh; chybí = běh už je dnes zapsaný. */
	planned?: { id: string; label: string };
}

/** Plán týdne z pohledu pravidel (SPEC 5.16). */
export interface RulePlan {
	/** Dnešní položky plánu, které ještě nejsou splněné. */
	today: RulePlanItem[];
	/** Včera je zapsaný těžký trénink (RPE od 7). */
	hardYesterday: boolean;
	/** Očekávaná zátěž tohoto týdne (zapsané + zbytek plánu) proti průměru 4 týdnů; null = není s čím srovnat. */
	week: { expected: number; remaining: number; average: number; ratio: number } | null;
}

export interface RuleContext {
	today: string;
	thresholds: ThresholdSettings;
	sleep: {
		/** Délka posledního spánku (z dnešního check-inu) v minutách. */
		lastMin: number | null;
		/** Osobní průměr za předchozí 4 týdny; null = málo nocí. */
		averageMin: number | null;
	};
	/** lnRMSSD proti osobní normě. */
	hrv: Baseline | null;
	restingHr: Baseline | null;
	acwr: Acwr | null;
	monotony: Monotony | null;
	/** Kondice a forma dnes; null, dokud model nemá dost dat. */
	form: { ctl: number; tsb: number } | null;
	/** Efektivní série za posledních 7 dní. */
	weeklySets: Record<MuscleId, number>;
	/** V posledních 4 týdnech je aspoň jedna efektivní série – jinak není objem z čeho hodnotit. */
	hasVolumeData: boolean;
	focusMuscles: MuscleId[];
	recoveries: Record<MuscleId, Recovery>;
	/** Hlavní partie cviků z dnešního nesplněného plánu. */
	plannedMuscles: MuscleId[];
	intensity: IntensityShare | null;
	/** Otevřené bolesti s intenzitou nad 0. */
	pains: PainAssessment[];
	checkIn: CheckInTrend;
	deload: DeloadSignals;
	goals: RuleGoal[];
	challenges: RuleChallenge[];
	/** Plán týdne; null, když v tomto týdnu žádný není. */
	plan: RulePlan | null;
	/** Běhy o víc než 10 % delší než nejdelší za předchozích 30 dní. */
	runSpikes: RuleRunSpike[];
	/** Týdenní kontrola výživy: o kolik kcal je odhad výdeje podle váhy vedle; null = v pořádku nebo málo dat. */
	nutritionCheck: { stepKcal: number } | null;
}
