// Čtení složení z textu etikety doplňku („Vitamin C 80 mg 100 %“): z každého řádku
// název látky a první množství s hmotnostní jednotkou. Text dodá uživatel (opsaný
// nebo zkopírovaný z fotky funkcí telefonu či systému) – plugin sám obrázky nečte.
// Bez závislosti na Obsidianu.

export interface LabelRow {
	name: string;
	amount: number;
	/** g, mg, µg nebo IU. */
	unit: string;
}

// ponytail: mezera jako oddělovač tisíců („1 000 mg“) se nečte – nešla by odlišit
// od „Vitamin B6 100 mg“. Takový řádek se vynechá; opravit jde přepsáním na „1000 mg“.
const AMOUNT = /(\d+(?:[.,]\d+)?)\s*(mg|µg|μg|mcg|ug|g|iu|m\.\s?j\.)(?![\p{L}\d])/iu;

const UNITS: Record<string, string> = { mg: "mg", g: "g", "µg": "µg", "μg": "µg", mcg: "µg", ug: "µg", iu: "IU" };

function cleanName(text: string): string {
	return text
		.replace(/\([^)]*\)?/g, " ") // „Hořčík (citrát hořečnatý)“ → „Hořčík“
		.replace(/[|\t]+/g, " ")
		.replace(/^[\s\-–•*·]+/, "")
		.replace(/[\s:.,;\-–]+$/, "")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Řádky složení z textu etikety. Řádek bez hmotnostní jednotky (energie v kJ,
 * nadpisy, procenta) se přeskočí; stejná látka podruhé také.
 */
export function parseLabelText(text: string): LabelRow[] {
	const rows: LabelRow[] = [];
	const seen = new Set<string>();
	for (const line of text.split(/\r?\n/)) {
		const match = AMOUNT.exec(line);
		if (!match) continue;
		const name = cleanName(line.slice(0, match.index));
		const amount = Number(match[1]!.replace(",", "."));
		const unit = UNITS[match[2]!.toLowerCase().replace(/\s/g, "")] ?? "IU";
		const key = name.toLocaleLowerCase("cs");
		// Název musí obsahovat aspoň dvě písmena; „1 kapsle obsahuje“ a podobné úvody nejsou látka.
		if (!/\p{L}{2}/u.test(name) || /obsahuje|contains/i.test(name) || !(amount > 0) || seen.has(key)) continue;
		seen.add(key);
		rows.push({ name, amount, unit });
	}
	return rows;
}
