// Typy katalogu zdrojů (SPEC kap. 7.2). Bez závislosti na Obsidianu.

import type { EvidenceLevel } from "../model/constants";
import { translated } from "../i18n";

/** Typ práce: stanovisko odborné společnosti, metaanalýza / systematický přehled, RCT, jiná studie, přehled, kazuistika (popis jednoho případu). */
export type StudyKind = "position" | "meta" | "rct" | "study" | "review" | "cohort" | "biomech" | "case";

export const STUDY_KIND_LABELS: Record<StudyKind, string> = translated({
	position: "position stand",
	meta: "meta-analysis",
	rct: "RCT",
	study: "study",
	review: "review",
	cohort: "cohort study",
	biomech: "EMG / biomechanics",
	case: "case report",
});

export interface Source {
	/** Krátký popisek do UI, např. „Foster 2001“. */
	short: string;
	/** Celá citace pro rozbalený detail. */
	citation: string;
	/** Úroveň důkazu; null u dokumentace, která není důkazem (nápověda aplikace). */
	evidence: EvidenceLevel | null;
	url?: string;
	/** Typ práce – určuje sílu důkazu (stanovisko, metaanalýza, RCT…). */
	kind?: StudyKind;
	/** Upozornění k použití zdroje, zobrazí se v detailu. */
	note?: string;
}
