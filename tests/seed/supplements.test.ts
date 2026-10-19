import { describe, expect, it } from "vitest";
import { UPPER_LIMITS, checkUpperLimit } from "../../src/calc/supplements";
import { getSource, isSourceId } from "../../src/evidence/sources";
import { parseDay, parseSupplement } from "../../src/model/parse";
import {
	AMINO_ACIDS,
	AMINO_BASIS,
	AMINO_SUPPLEMENT_IDS,
	SUPPLEMENT_AMINO_CONTENT,
	aminoRequirementMg,
	totalEssentialMgPerKg,
} from "../../src/seed/aminoAcids";
import { supplementToFrontmatter } from "../../src/model/serialize";
import {
	MIN_STUDIES,
	MIN_VARIANT_STUDIES,
	SUPPLEMENT_CATALOG,
	catalog,
	catalogSupplement,
	findCatalogSupplement,
	labelCatalogId,
	matchesCatalogQuery,
	matchingVariant,
	variantName,
} from "../../src/seed/supplements";
import { getLanguage, setLanguage } from "../../src/i18n";
import { CAFFEINE_EVENING_WARNING, adherenceLabel, doseLabel, formatAmount, limitMessage, personalDose } from "../../src/ui/supplements/text";
import {
	BENEFIT_AREAS,
	GRADES,
	benefitText,
	bestGrade,
	caffeineTooLate,
	compareByGoals,
	matchGroup,
	splitBenefits,
	type Benefit,
	type BenefitArea,
	type Grade,
} from "../../src/seed/supplementModel";

describe("katalog suplementů", () => {
	it("ID a názvy jsou jednoznačné", () => {
		expect(new Set(SUPPLEMENT_CATALOG.map((s) => s.id)).size).toBe(SUPPLEMENT_CATALOG.length);
		expect(new Set(SUPPLEMENT_CATALOG.map((s) => s.name)).size).toBe(SUPPLEMENT_CATALOG.length);
	});

	it("každá položka má texty a existující zdroje", () => {
		for (const item of SUPPLEMENT_CATALOG) {
			for (const text of [item.summary, item.dosing, item.forWhom, item.risks]) {
				expect(text.trim(), item.id).not.toBe("");
			}
			expect(item.basis.sourceIds.length, item.id).toBeGreaterThan(0);
			for (const id of item.basis.sourceIds) expect(isSourceId(id), `${item.id}: ${id}`).toBe(true);
		}
	});

	it("každá položka srovnává nejméně čtyři různé zdroje, z toho aspoň čtyři studie nebo stanoviska", () => {
		// Tabulky limitů a databáze (EFSA, LiverTox) se do minima nepočítají – nejsou to studie účinku.
		const REFERENCE = ["efsaUl", "efsaOmega2012", "livertoxAshwagandha"];
		for (const item of SUPPLEMENT_CATALOG) {
			const ids = item.studies.map((s) => s.source);
			expect(new Set(ids).size, item.id).toBe(ids.length);
			expect(ids.filter((id) => !REFERENCE.includes(id)).length, item.id).toBeGreaterThanOrEqual(MIN_STUDIES);
			for (const study of item.studies) expect(study.finding.trim(), `${item.id}: ${study.source}`).not.toBe("");
			expect(item.agreement.trim(), item.id).not.toBe("");
			expect(item.basis.sourceIds, item.id).toEqual(ids);
		}
	});

	it("štítek položky není silnější, než dovolují její zdroje", () => {
		// „výzkum“ nebo „konsenzus“ jen tehdy, když takový zdroj položka opravdu má.
		for (const item of SUPPLEMENT_CATALOG) {
			const levels = item.basis.sourceIds.map((id) => getSource(id).evidence);
			expect(levels, item.id).toContain(item.basis.evidence);
		}
	});

	it("obsahuje látky, které si uživatel vyžádal", () => {
		for (const id of ["creatine", "caffeine", "protein", "vitamin_d", "omega3", "magnesium", "zinc", "tribulus", "ashwagandha", "maca"]) {
			expect(catalogSupplement(id), id).toBeDefined();
		}
		for (const id of ["vitamin_a", "vitamin_b", "vitamin_c", "vitamin_d", "vitamin_e", "vitamin_k", "bcaa", "eaa", "citrulline", "glutamine"]) {
			expect(catalogSupplement(id), id).toBeDefined();
		}
	});

	it("výchozí dávky nepřekračují horní limity a limity patří k položkám katalogu", () => {
		for (const id of Object.keys(UPPER_LIMITS)) expect(catalogSupplement(id), id).toBeDefined();
		for (const item of SUPPLEMENT_CATALOG) {
			expect(checkUpperLimit(item.id, item.defaults.dose, item.defaults.unit).status, item.id).not.toBe("over");
		}
	});

	it("hledání podle názvu a aliasu", () => {
		expect(findCatalogSupplement("magnezium")?.id).toBe("magnesium");
		expect(findCatalogSupplement(" KREATIN ")?.id).toBe("creatine");
		expect(findCatalogSupplement("neexistuje")).toBeUndefined();
		expect(findCatalogSupplement("")).toBeUndefined();
	});

	it("hledání v knihovně: část názvu nebo aliasu bez ohledu na diakritiku", () => {
		const find = (q: string) => catalog("cs").filter((s) => matchesCatalogQuery(s, q)).map((s) => s.id);
		expect(find("horcik")).toEqual(["magnesium"]);
		expect(find("LION")).toEqual(["lions_mane"]);
		expect(find("chondroitin")).toEqual(["glucosamine"]);
		expect(find("  ")).toHaveLength(SUPPLEMENT_CATALOG.length);
		expect(find("neexistuje")).toEqual([]);
	});
});

describe("druhy látek (protein, hořčík…)", () => {
	const withVariants = SUPPLEMENT_CATALOG.filter((item) => item.variants);

	it("druhy mají látky, u kterých na formě záleží", () => {
		const ids = ["protein", "magnesium", "creatine", "iron", "vitamin_d", "omega3", "zinc", "calcium", "curcumin", "carbohydrate"];
		expect(withVariants.map((item) => item.id).sort()).toEqual([...ids].sort());
	});

	it("každý druh má jednoznačné id a název, popis a aspoň dva různé existující zdroje", () => {
		for (const item of withVariants) {
			const variants = item.variants!;
			expect(new Set(variants.map((v) => v.id)).size, item.id).toBe(variants.length);
			expect(new Set(variants.map((v) => v.name)).size, item.id).toBe(variants.length);
			for (const v of variants) {
				const key = `${item.id}/${v.id}`;
				expect(v.summary.trim(), key).not.toBe("");
				const ids = v.studies.map((s) => s.source);
				expect(new Set(ids).size, key).toBe(ids.length);
				expect(ids.length, key).toBeGreaterThanOrEqual(MIN_VARIANT_STUDIES);
				for (const study of v.studies) {
					expect(isSourceId(study.source), `${key}: ${study.source}`).toBe(true);
					expect(study.finding.trim(), `${key}: ${study.source}`).not.toBe("");
				}
			}
		}
	});

	it("hledání najde látku i podle druhu a druh předvybere", () => {
		const magnesium = catalog("cs").find((s) => s.id === "magnesium")!;
		expect(matchesCatalogQuery(magnesium, "bisglycinat")).toBe(true);
		expect(matchingVariant(magnesium, "bisglycinát")).toBe("glycinate");
		expect(matchingVariant(magnesium, "hořčík")).toBeUndefined();
		expect(matchingVariant(magnesium, "")).toBeUndefined();
		const protein = catalog("en").find((s) => s.id === "protein")!;
		expect(matchingVariant(protein, "casein")).toBe("casein");
		expect(matchingVariant(protein, "pea")).toBe("plant_blend");
	});

	it("název z etikety podle druhu vede na látku (kvůli horním limitům)", () => {
		expect(findCatalogSupplement("Magnesium citrate")?.id).toBe("magnesium");
		expect(findCatalogSupplement("citrát hořečnatý")?.id).toBe("magnesium");
		expect(labelCatalogId("Magnesium bisglycinate")).toBe("magnesium");
		expect(findCatalogSupplement("whey isolate")?.id).toBe("protein");
		expect(labelCatalogId("Zinc gluconate")).toBe("zinc");
		expect(labelCatalogId("Calcium carbonate")).toBe("calcium");
	});

	it("název druhu v jazyce rozhraní; neznámý druh nebo látka bez druhů = undefined", () => {
		const language = getLanguage();
		setLanguage("en");
		expect(variantName("protein", "casein")).toBe("Casein");
		setLanguage("cs");
		expect(variantName("protein", "casein")).toBe("Kasein");
		setLanguage(language);
		expect(variantName("protein", "neexistuje")).toBeUndefined();
		expect(variantName("creatine", "casein")).toBeUndefined();
		expect(variantName("protein", undefined)).toBeUndefined();
	});
});

describe("tabulka aminokyselin", () => {
	it("20 aminokyselin: 9 esenciálních, 6 podmíněně esenciálních, 5 neesenciálních; 3 BCAA", () => {
		expect(AMINO_ACIDS).toHaveLength(20);
		const count = (c: string) => AMINO_ACIDS.filter((a) => a.category === c).length;
		expect(count("essential")).toBe(9);
		expect(count("conditional")).toBe(6);
		expect(count("nonessential")).toBe(5);
		expect(AMINO_ACIDS.filter((a) => a.bcaa).map((a) => a.id).sort()).toEqual(["ile", "leu", "val"]);
		expect(new Set(AMINO_ACIDS.map((a) => a.id)).size).toBe(20);
		expect(new Set(AMINO_ACIDS.map((a) => a.abbr)).size).toBe(20);
	});

	it("denní potřeba jen u esenciálních, součet 184 mg/kg (WHO/FAO/UNU 2007)", () => {
		for (const a of AMINO_ACIDS) {
			expect(a.requirementMgPerKg !== undefined, a.id).toBe(a.category === "essential");
		}
		// 39 + 20 + 26 + 30 + 15 + 25 + 15 + 4 + 10 = 184
		expect(totalEssentialMgPerKg()).toBe(184);
	});

	it("potřeba podle hmotnosti: leucin 39 mg/kg × 80 kg = 3120 mg", () => {
		const leu = AMINO_ACIDS.find((a) => a.id === "leu")!;
		const gly = AMINO_ACIDS.find((a) => a.id === "gly")!;
		expect(aminoRequirementMg(leu, 80)).toBe(3120);
		expect(aminoRequirementMg(gly, 80)).toBeNull();
	});

	it("obsah v suplementech a součtové ID odkazují na existující položky", () => {
		const ids = new Set(AMINO_ACIDS.map((a) => a.id));
		for (const [supplement, aminos] of Object.entries(SUPPLEMENT_AMINO_CONTENT)) {
			expect(catalogSupplement(supplement), supplement).toBeDefined();
			for (const id of aminos) expect(ids.has(id), `${supplement}: ${id}`).toBe(true);
		}
		expect(SUPPLEMENT_AMINO_CONTENT.eaa).toHaveLength(9);
		for (const id of AMINO_SUPPLEMENT_IDS) expect(catalogSupplement(id), id).toBeDefined();
		for (const a of AMINO_ACIDS) if (a.sharedWith) expect(ids.has(a.sharedWith), a.id).toBe(true);
		expect(isSourceId(AMINO_BASIS.sourceIds[0]!)).toBe(true);
	});
});

describe("poznámka suplementu", () => {
	it("zápis a čtení se shodují", () => {
		const note = parseSupplement({
			forma: "supplement",
			schema: 1,
			name: "Kreatin",
			catalog: "creatine",
			dose: 5,
			unit: "g",
			timing: "morning",
			training_days_only: false,
			active: true,
			since: "2026-10-01",
		});
		expect(note).not.toBeNull();
		expect(parseSupplement(supplementToFrontmatter(note!))).toEqual(note);
	});

	it("druh látky se uloží a přečte; bez druhu klíč chybí", () => {
		const note = parseSupplement({ forma: "supplement", schema: 1, name: "Hořčík", catalog: "magnesium", variant: "glycinate", timing: "evening" });
		expect(note?.variant).toBe("glycinate");
		expect(parseSupplement(supplementToFrontmatter(note!))).toEqual(note);
		expect(supplementToFrontmatter({ ...note!, variant: undefined })).not.toHaveProperty("variant");
		expect(parseSupplement({ forma: "supplement", name: "Hořčík", variant: "" })?.variant).toBeUndefined();
	});

	it("tolerantní výchozí hodnoty; bez názvu null", () => {
		expect(parseSupplement({ forma: "supplement", name: "Zinek", dose: "15", timing: "nesmysl" })).toEqual({
			forma: "supplement",
			schema: 1,
			name: "Zinek",
			dose: 15,
			timing: "any",
			training_days_only: false,
			active: true,
		});
		expect(parseSupplement({ forma: "supplement" })).toBeNull();
	});

	it("denní poznámka čte seznam vzatých suplementů (i jako odkazy, bez duplicit)", () => {
		const day = parseDay({ forma: "day", date: "2026-10-01", supplements: ["Kreatin", "[[Vitamin D]]", "Kreatin", ""] });
		expect(day?.supplements).toEqual(["Kreatin", "Vitamin D"]);
		expect(parseDay({ forma: "day", date: "2026-10-01" })?.supplements).toBeUndefined();
	});
});

describe("texty karty Suplementy", () => {
	it("doseLabel", () => {
		expect(doseLabel(5, "g")).toBe("5 g");
		expect(doseLabel(2.5, "g")).toBe("2,5 g");
		expect(doseLabel(undefined, "g")).toBe("");
	});

	it("formatAmount: gramy od 1 g, jinak mg nebo µg", () => {
		expect(formatAmount(20200.05)).toBe("20,2 g");
		expect(formatAmount(1000)).toBe("1 g");
		expect(formatAmount(250)).toBe("250 mg");
		expect(formatAmount(0.05)).toBe("50 µg");
	});

	it("limitMessage jen při překročení", () => {
		expect(limitMessage(checkUpperLimit("magnesium", 250, "mg"))).toBeNull();
		expect(limitMessage(checkUpperLimit("magnesium", 400, "mg"))).toBe(
			"Dávka 400 mg je nad horním limitem 250 mg denně (z doplňků).",
		);
		expect(limitMessage(checkUpperLimit("vitamin_d", 5000, "IU"))).toBe(
			"Dávka 125 µg je nad horním limitem 100 µg denně (ze všech zdrojů včetně jídla).",
		);
	});

	it("personalDose podle hmotnosti", () => {
		expect(personalDose("caffeine", 80)).toBe("Pro tvých 80 kg: 240–480 mg před výkonem.");
		expect(personalDose("caffeine", null)).toBeNull();
		expect(personalDose("zinc", 80)).toBeNull();
	});

	it("adherenceLabel: procenta, sbírání dat, žádné NaN", () => {
		expect(adherenceLabel({ taken: 6, due: 7 }, 7, 7)).toBe("86 % (6 z 7)");
		expect(adherenceLabel({ taken: 2, due: 3 }, 3, 30)).toBe("67 % (2 z 3) · sbírám data (3 z 30 dní)");
		expect(adherenceLabel({ taken: 0, due: 0 }, 1, 7)).toBe("sbírám data (1 z 7 dní)");
		expect(adherenceLabel({ taken: 0, due: 0 }, 7, 7)).toBe("bez plánovaných dnů");
	});
});

describe("hodnocení po oblastech přínosu", () => {
	it("každá látka má aspoň jednu hodnocenou oblast, oblasti se neopakují", () => {
		for (const item of SUPPLEMENT_CATALOG) {
			expect(item.benefits.length, item.id).toBeGreaterThan(0);
			const areas = item.benefits.map((b) => b.area);
			expect(new Set(areas).size, item.id).toBe(areas.length);
			for (const b of item.benefits) {
				expect(BENEFIT_AREAS, item.id).toContain(b.area);
				expect(GRADES, item.id).toContain(b.grade);
			}
		}
	});

	it("studie přiřazené k oblasti patří k hodnocené oblasti látky", () => {
		for (const item of SUPPLEMENT_CATALOG) {
			const areas = item.benefits.map((b) => b.area);
			for (const s of item.studies) if (s.area) expect(areas, `${item.id}: ${s.source}`).toContain(s.area);
		}
	});

	it("oblast doložená jen studiemi placenými výrobcem nemá lepší známku než C", () => {
		for (const item of SUPPLEMENT_CATALOG) {
			for (const b of item.benefits) {
				const studies = item.studies.filter((s) => s.area === b.area);
				if (studies.length > 0 && studies.every((s) => s.funded)) expect(["C", "D", "X"], `${item.id}: ${b.area}`).toContain(b.grade);
			}
		}
	});

	it("rizikové látky mají konkrétní upozornění", () => {
		for (const item of SUPPLEMENT_CATALOG) {
			if (item.safety !== "ok") expect(item.safetyNote?.trim() ?? "", item.id).not.toBe("");
		}
	});

	it("nové látky z rešerše 10/2026 a nové zdroje s ověřeným DOI", () => {
		for (const id of ["nitrate", "bicarbonate", "collagen", "probiotics", "melatonin", "iron"]) expect(catalogSupplement(id), id).toBeDefined();
		const more = ["shilajit", "lions_mane", "reishi", "chaga", "cordyceps", "electrolytes", "glucosamine", "carnitine", "hmb", "rhodiola", "tart_cherry", "preworkout", "tyrosine", "colostrum", "ginseng", "alpha_gpc", "coq10", "daa", "green_tea_extract", "carbohydrate", "glycerol", "arginine", "spirulina", "betaine", "sodium_phosphate", "selenium", "calcium", "hyaluronic_acid"];
		for (const id of more) expect(catalogSupplement(id), id).toBeDefined();
		// Doplněno 8. 10. 2026.
		for (const id of ["psyllium", "taurine", "theanine", "curcumin", "cocoa_flavanols", "sodium_citrate", "glycine", "beta_glucan", "ginger", "capsaicin", "ecdysterone", "tongkat_ali", "ketones", "cbd"]) expect(catalogSupplement(id), id).toBeDefined();
		// Doplněno 13. 10. 2026.
		for (const id of ["phosphatidylcholine", "potassium_bicarbonate", "thiamine"]) expect(catalogSupplement(id), id).toBeDefined();
		expect(SUPPLEMENT_CATALOG).toHaveLength(93);
		for (const item of SUPPLEMENT_CATALOG) {
			for (const id of item.basis.sourceIds) {
				const source = getSource(id);
				if (source.kind) expect(source.url ?? "", id).toMatch(/^https:\/\/doi\.org\/10\./);
				// Zdroj, který podle poznámky financoval výrobce nebo ho psali jeho lidé, musí být označený
				// jako placený výrobcem. Jen dodaný přípravek („extrakt dodal výrobce“) se nepočítá.
				if (source.note && /financ|sponzor|pracuj|zaměstnanc|střet zájmů/i.test(source.note) && !/neuvedeno/.test(source.note)) {
					expect(item.studies.find((s) => s.source === id)?.funded, `${item.id}: ${id}`).toBe(true);
				}
			}
		}
		// Podklad uváděl „Yi 2019“ – podle Crossref je první autorkou Han.
		expect(getSource("han2019").citation).toContain("Han Q.");
		// Podklad uváděl metaanalýzu bez autora – podle Crossref je první autorkou Simental-Mendía.
		expect(getSource("simentalMendia2018").citation).toMatch(/^Simental-Mendía M\./);
		// U čagy neexistuje klinická studie – zdrojem jsou jen kazuistiky a monografie.
		expect(catalogSupplement("chaga")?.studies.map((s) => getSource(s.source).kind ?? null)).toEqual([null, "case", "case", "case"]);
	});
});

describe("řazení podle cílů", () => {
	const benefits = (list: [BenefitArea, Grade][]): Benefit[] => list.map(([area, grade]) => ({ area, grade }));

	it("skupina podle nejlepší známky v cílech; bez cílů podle všech oblastí", () => {
		const creatine = benefits([["performance", "A"], ["cognition", "C"]]);
		expect(matchGroup(creatine, ["performance"])).toBe("fits");
		expect(matchGroup(creatine, ["cognition"])).toBe("maybe");
		expect(matchGroup(creatine, ["sleep"])).toBe("other");
		expect(matchGroup(creatine, [])).toBe("fits");
		expect(matchGroup(benefits([["performance", "X"], ["recovery", "D"]]), [])).toBe("other");
		expect(bestGrade(creatine, ["sleep"])).toBeNull();
	});

	it("filtr knihovny: síla důkazů v cílech a bezpečnost", async () => {
		const { passesFilter, NO_FILTER } = await import("../../src/seed/supplementModel");
		const item = { benefits: [{ area: "performance" as const, grade: "A" as const }, { area: "sleep" as const, grade: "C" as const }], safety: "caution" as const };
		expect(passesFilter(item, [], NO_FILTER)).toBe(true);
		expect(passesFilter(item, [], { evidence: "b", safety: "all" })).toBe(true); // bez cílů rozhoduje nejlepší známka
		expect(passesFilter(item, ["sleep"], { evidence: "b", safety: "all" })).toBe(false); // ve spánku jen C
		expect(passesFilter(item, ["sleep"], { evidence: "c", safety: "all" })).toBe(true);
		expect(passesFilter(item, ["immunity"], { evidence: "c", safety: "all" })).toBe(false); // v cíli nehodnoceno
		expect(passesFilter(item, [], { evidence: "all", safety: "ok" })).toBe(false);
		expect(passesFilter(item, [], { evidence: "all", safety: "no_risk" })).toBe(true);
		expect(passesFilter({ ...item, safety: "risk" }, [], { evidence: "all", safety: "no_risk" })).toBe(false);
	});

	it("„nefunguje“ a „nevíme“ jsou různé známky", () => {
		const split = splitBenefits(benefits([["performance", "B"], ["recovery", "C"], ["immunity", "D"], ["hormones", "X"]]));
		expect(split.good.map((b) => b.area)).toEqual(["performance"]);
		expect(split.maybe.map((b) => b.area)).toEqual(["recovery"]);
		expect(split.none.map((b) => b.grade)).toEqual(["D", "X"]);
		expect(benefitText({ area: "hormones", grade: "X", note: "testosteron" })).toBe("Hormony ✗ (testosteron)");
	});

	it("v rámci skupiny lepší známka první, pak abecedně", () => {
		const items = [
			{ name: "Zinek", benefits: benefits([["immunity", "B"]]) },
			{ name: "Kreatin", benefits: benefits([["performance", "A"]]) },
			{ name: "Bikarbonát", benefits: benefits([["performance", "A"]]) },
		];
		expect([...items].sort(compareByGoals([])).map((i) => i.name)).toEqual(["Bikarbonát", "Kreatin", "Zinek"]);
		expect([...items].sort(compareByGoals(["immunity"])).map((i) => i.name)).toEqual(["Zinek", "Bikarbonát", "Kreatin"]);
	});
});

describe("kofein a spánek (Drake 2013)", () => {
	it("méně než 6 h před obvyklým ulehnutím", () => {
		// ulehnutí 23:00
		expect(caffeineTooLate(16 * 60 + 59, 23 * 60)).toBe(false);
		expect(caffeineTooLate(17 * 60 + 30, 23 * 60)).toBe(true);
		expect(caffeineTooLate(23 * 60 + 30, 23 * 60)).toBe(false);
		// ulehnutí po půlnoci (00:30)
		expect(caffeineTooLate(19 * 60, 30)).toBe(true);
		expect(caffeineTooLate(18 * 60, 30)).toBe(false);
		expect(caffeineTooLate(60, 30)).toBe(false);
	});

	it("upozornění ve formuláři u kofeinu večer", () => {
		expect(CAFFEINE_EVENING_WARNING).toContain("Drake 2013");
	});
});
