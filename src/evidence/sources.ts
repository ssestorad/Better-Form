// Katalog zdrojů (SPEC kap. 7.2 a 14). Pravidla a výpočty odkazují na zdroje přes ID.
// Citace odpovídají SPEC kap. 14 – nové zdroje přidávat jen ověřené (viz CLAUDE.md).
// Samotné zdroje jsou rozdělené podle oblastí v src/evidence/sources/.

import type { EvidenceLevel } from "../model/constants";
import type { Source } from "./sourceTypes";
import { CORE_SOURCES } from "./sources/core";
import { RESEARCH_SOURCES } from "./sources/research";
import { SUPPLEMENT_SOURCES } from "./sources/supplements";
import { MORE_SUPPLEMENT_SOURCES } from "./sources/supplementsMore";
import { SOURCES_EN } from "./sources/en";
import { getLanguage } from "../i18n";

export { STUDY_KIND_LABELS, type Source, type StudyKind } from "./sourceTypes";

/** Části katalogu – ID se mezi nimi nesmí opakovat (hlídá test). */
export const SOURCE_PARTS = [CORE_SOURCES, SUPPLEMENT_SOURCES, RESEARCH_SOURCES, MORE_SUPPLEMENT_SOURCES] as const;

export const SOURCES = {
	...CORE_SOURCES,
	...SUPPLEMENT_SOURCES,
	...RESEARCH_SOURCES,
	...MORE_SUPPLEMENT_SOURCES,
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

/** Z čeho výpočet nebo pravidlo vychází – zobrazuje se v UI u výsledku. */
export interface Basis {
	sourceIds: SourceId[];
	evidence: EvidenceLevel;
}

/** Zdroj s popiskem, citací a poznámkou v jazyce rozhraní (citace jsou většinou anglicky už v originále). */
export function getSource(id: SourceId): Source {
	const source: Source = SOURCES[id];
	const en = getLanguage() === "en" ? SOURCES_EN[id] : undefined;
	return en ? { ...source, ...en } : source;
}

export function isSourceId(id: string): id is SourceId {
	return Object.prototype.hasOwnProperty.call(SOURCES, id);
}
