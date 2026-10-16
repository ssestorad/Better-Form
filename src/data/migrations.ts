// Migrace schématu datových poznámek.
// Každý krok převádí frontmatter jednoho typu z verze n na n + 1. Při změně
// schématu: zvýšit SCHEMA_VERSION, přidat krok sem a test do tests/data/migrations.test.ts.

import { SCHEMA_VERSION, type FormaType } from "../model/constants";
import { asRecord, formaTypeOf } from "../model/parse";
import { t } from "../i18n";

type Raw = Record<string, unknown>;
export type MigrationStep = (data: Raw) => Raw;
/** Kroky podle typu poznámky; klíč = verze, ze které krok migruje. */
export type MigrationTable = Partial<Record<FormaType, Record<number, MigrationStep>>>;

export const MIGRATIONS: MigrationTable = {};

export type MigrationResult =
	| { status: "current"; data: Raw }
	| { status: "migrated"; data: Raw; from: number }
	/** Poznámka je z novější verze pluginu – jen číst, nikdy nezapisovat. */
	| { status: "newer"; data: Raw; version: number }
	| { status: "invalid"; reason: string };

/**
 * Převede frontmatter na aktuální verzi schématu. Vstup nemění.
 * Chybějící `schema` se bere jako verze 1 (ručně založená poznámka).
 */
export function migrateFrontmatter(
	input: unknown,
	migrations: MigrationTable = MIGRATIONS,
	target: number = SCHEMA_VERSION,
): MigrationResult {
	const raw = asRecord(input);
	const type = formaTypeOf(raw);
	if (!type) return { status: "invalid", reason: t("Neznámý nebo chybějící typ `forma`.") };

	const version = raw.schema === undefined || raw.schema === null ? 1 : raw.schema;
	if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
		return { status: "invalid", reason: t("Neplatná verze schématu: {v}.", { v: String(raw.schema) }) };
	}
	if (version > target) return { status: "newer", data: raw, version };
	if (version === target) return { status: "current", data: raw };

	let data: Raw = structuredClone(raw);
	for (let v = version; v < target; v++) {
		const step = migrations[type]?.[v];
		if (!step) {
			return { status: "invalid", reason: t("Chybí migrace typu „{type}“ z verze {v}.", { type, v }) };
		}
		data = step(data);
		data.schema = v + 1;
	}
	return { status: "migrated", data, from: version };
}
