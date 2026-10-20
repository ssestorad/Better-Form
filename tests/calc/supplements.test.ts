import { describe, expect, it } from "vitest";
import {
	adherence,
	adherenceRatio,
	betaAlanineDoseG,
	caffeineDoseMg,
	caffeineIsExcessive,
	checkUpperLimit,
	dailyTotals,
	doseToMg,
	itemDoseMg,
	isTaken,
	proteinTargetG,
	toggleTaken,
	trackedDays,
} from "../../src/calc/supplements";

const TODAY = "2026-10-07";
const never = () => false;

describe("adherence", () => {
	it("počítá vzaté dny z okna; dnešek jen když je vzato", () => {
		// Okno 7 dní = 1.–7. 10. Vzato 1., 2., 4., 6. 10.; dnes (7.) ještě ne.
		const taken = new Set(["2026-10-01", "2026-10-02", "2026-10-04", "2026-10-06"]);
		const a = adherence({ trainingDaysOnly: false }, (d) => taken.has(d), never, TODAY, 7);
		// Mělo být 6 dnů (1.–6.), dnešek se zatím nepočítá → 4 z 6.
		expect(a).toEqual({ taken: 4, due: 6 });
		expect(adherenceRatio(a)).toBeCloseTo(4 / 6, 10);
	});

	it("dnešek se započítá po odškrtnutí", () => {
		const taken = new Set(["2026-10-06", "2026-10-07"]);
		expect(adherence({ trainingDaysOnly: false }, (d) => taken.has(d), never, TODAY, 7)).toEqual({ taken: 2, due: 7 });
	});

	it("před datem `since` se nepočítá nic", () => {
		// Od 5. 10.: dny 5., 6. (a dnešek jen když je vzato). Vzato 5. 10. → 1 ze 2.
		const taken = new Set(["2026-10-02", "2026-10-05"]);
		const a = adherence({ since: "2026-10-05", trainingDaysOnly: false }, (d) => taken.has(d), never, TODAY, 7);
		expect(a).toEqual({ taken: 1, due: 2 });
	});

	it("jen tréninkové dny: počítají se dny s tréninkem a dny, kdy bylo vzato", () => {
		// Tréninky 2., 4., 6. 10.; vzato 2., 4. a navíc 5. 10. (bez tréninku).
		const trained = new Set(["2026-10-02", "2026-10-04", "2026-10-06"]);
		const taken = new Set(["2026-10-02", "2026-10-04", "2026-10-05"]);
		const a = adherence({ trainingDaysOnly: true }, (d) => taken.has(d), (d) => trained.has(d), TODAY, 7);
		// Mělo být: 2., 4., 6. (tréninky) + 5. (vzato navíc) = 4; vzato 3.
		expect(a).toEqual({ taken: 3, due: 4 });
	});

	it("bez plánovaných dnů je podíl null, ne NaN", () => {
		const a = adherence({ trainingDaysOnly: true }, never, never, TODAY, 7);
		expect(a).toEqual({ taken: 0, due: 0 });
		expect(adherenceRatio(a)).toBeNull();
	});
});

describe("trackedDays", () => {
	it("bez data = celé okno; jinak dny od začátku včetně dneška, nejvýš okno", () => {
		expect(trackedDays(undefined, TODAY, 30)).toBe(30);
		expect(trackedDays("2026-10-07", TODAY, 7)).toBe(1);
		expect(trackedDays("2026-10-02", TODAY, 30)).toBe(6);
		expect(trackedDays("2026-08-01", TODAY, 30)).toBe(30);
		expect(trackedDays("2026-10-10", TODAY, 7)).toBe(0);
	});
});

describe("dávky podle hmotnosti", () => {
	it("kofein 3–6 mg/kg: 80 kg → 240–480 mg", () => {
		expect(caffeineDoseMg(80)).toEqual({ min: 240, max: 480, unit: "mg" });
	});

	it("kofein od 9 mg/kg je zbytečně moc: 80 kg → od 720 mg", () => {
		expect(caffeineIsExcessive(719, 80)).toBe(false);
		expect(caffeineIsExcessive(720, 80)).toBe(true);
	});

	it("bílkoviny 1,6–2,2 g/kg: 75 kg → 120–165 g", () => {
		const d = proteinTargetG(75);
		expect(d.min).toBeCloseTo(120, 10);
		expect(d.max).toBeCloseTo(165, 10);
	});

	it("beta-alanin 65 mg/kg: 80 kg → 5,2 g", () => {
		expect(betaAlanineDoseG(80)).toBeCloseTo(5.2, 10);
	});
});

describe("doseToMg", () => {
	it("převádí g, mg a µg", () => {
		expect(doseToMg(5, "g")).toBe(5000);
		expect(doseToMg(250, "mg")).toBe(250);
		expect(doseToMg(50, "µg")).toBeCloseTo(0.05, 10);
		expect(doseToMg(50, "mcg")).toBeCloseTo(0.05, 10);
		expect(doseToMg(1, " G ")).toBe(1000);
	});

	it("IU jen s převodem; vitamin D 40 IU = 1 µg → 2000 IU = 0,05 mg", () => {
		expect(doseToMg(2000, "IU", 40)).toBeCloseTo(0.05, 10);
		expect(doseToMg(2000, "IU")).toBeNull();
	});

	it("neznámá jednotka = null", () => {
		expect(doseToMg(2, "kapsle")).toBeNull();
		expect(doseToMg(2, undefined)).toBeNull();
	});
});

describe("checkUpperLimit", () => {
	it("hořčík: 250 mg je v limitu, 400 mg nad ním (limit jen z doplňků)", () => {
		expect(checkUpperLimit("magnesium", 250, "mg")).toEqual({ status: "ok", doseMg: 250, limitMg: 250, supplementsOnly: true });
		expect(checkUpperLimit("magnesium", 400, "mg")).toMatchObject({ status: "over", limitMg: 250 });
		expect(checkUpperLimit("magnesium", 0.4, "g")).toMatchObject({ status: "over" });
	});

	it("zinek 25 mg, vitamin E 300 mg, vitamin A 3000 µg, B6 12 mg", () => {
		expect(checkUpperLimit("zinc", 25, "mg")).toMatchObject({ status: "ok", supplementsOnly: false });
		expect(checkUpperLimit("zinc", 50, "mg")).toMatchObject({ status: "over" });
		expect(checkUpperLimit("vitamin_e", 400, "mg")).toMatchObject({ status: "over" });
		expect(checkUpperLimit("vitamin_a", 3000, "µg")).toMatchObject({ status: "ok" });
		expect(checkUpperLimit("vitamin_a", 5000, "µg")).toMatchObject({ status: "over" });
		expect(checkUpperLimit("vitamin_b", 25, "mg")).toMatchObject({ status: "over" });
	});

	it("selen 255 µg a vápník 2 500 mg ze všech zdrojů", () => {
		expect(checkUpperLimit("selenium", 200, "µg")).toMatchObject({ status: "ok", limitMg: 0.255, supplementsOnly: false });
		expect(checkUpperLimit("selenium", 300, "µg")).toMatchObject({ status: "over" });
		expect(checkUpperLimit("calcium", 2, "g")).toMatchObject({ status: "ok" });
		expect(checkUpperLimit("calcium", 3000, "mg")).toMatchObject({ status: "over", limitMg: 2500 });
	});

	it("vitamin D: limit 100 µg = 4000 IU", () => {
		expect(checkUpperLimit("vitamin_d", 4000, "IU")).toMatchObject({ status: "ok" });
		expect(checkUpperLimit("vitamin_d", 5000, "IU")).toMatchObject({ status: "over" });
		expect(checkUpperLimit("vitamin_d", 125, "µg")).toMatchObject({ status: "over" });
	});

	it("bez limitu, bez dávky nebo s nepřevoditelnou jednotkou = unknown", () => {
		expect(checkUpperLimit("creatine", 5, "g")).toEqual({ status: "unknown" });
		expect(checkUpperLimit(undefined, 5, "g")).toEqual({ status: "unknown" });
		expect(checkUpperLimit("zinc", undefined, "mg")).toEqual({ status: "unknown" });
		expect(checkUpperLimit("zinc", 2, "tableta")).toEqual({ status: "unknown" });
	});
});

describe("dailyTotals", () => {
	const isAmino = (id: string | undefined) => id === "bcaa" || id === "glutamine";

	it("sečte dávky zvlášť pro tréninkový den a den volna", () => {
		const totals = dailyTotals(
			[
				{ catalogId: "creatine", dose: 5, unit: "g", trainingDaysOnly: false }, // 5000 mg
				{ catalogId: "caffeine", dose: 200, unit: "mg", trainingDaysOnly: true }, // 200 mg, jen trénink
				{ catalogId: "bcaa", dose: 10, unit: "g", trainingDaysOnly: true }, // 10 000 mg, jen trénink
				{ catalogId: "glutamine", dose: 5, unit: "g", trainingDaysOnly: false }, // 5000 mg
				{ catalogId: "vitamin_d", dose: 2000, unit: "IU", trainingDaysOnly: false }, // 50 µg = 0,05 mg
				{ catalogId: "multivitamin", dose: 1, unit: "tableta", trainingDaysOnly: false }, // nepřevoditelné
				{ trainingDaysOnly: false }, // bez dávky
			],
			isAmino,
		);
		// Trénink: 5000 + 200 + 10000 + 5000 + 0,05 = 20200,05; volno: 5000 + 5000 + 0,05 = 10000,05.
		expect(totals.trainingDayMg).toBeCloseTo(20200.05, 6);
		expect(totals.restDayMg).toBeCloseTo(10000.05, 6);
		// Aminokyseliny: trénink 10000 + 5000, volno 5000.
		expect(totals.aminoTrainingDayMg).toBe(15000);
		expect(totals.aminoRestDayMg).toBe(5000);
		expect(totals.trainingDayCount).toBe(7);
		expect(totals.restDayCount).toBe(5);
		expect(totals.unconverted).toBe(2);
	});

	it("prázdný seznam = nuly", () => {
		expect(dailyTotals([], isAmino)).toEqual({
			trainingDayCount: 0,
			restDayCount: 0,
			trainingDayMg: 0,
			restDayMg: 0,
			aminoTrainingDayMg: 0,
			aminoRestDayMg: 0,
			unconverted: 0,
		});
	});

	it("itemDoseMg: IU jen u látky s převodem", () => {
		expect(itemDoseMg({ catalogId: "vitamin_d", dose: 1000, unit: "IU", trainingDaysOnly: false })).toBeCloseTo(0.025, 10);
		expect(itemDoseMg({ catalogId: "vitamin_a", dose: 1000, unit: "IU", trainingDaysOnly: false })).toBeNull();
		expect(itemDoseMg({ dose: 3, unit: "g", trainingDaysOnly: false })).toBe(3000);
	});
});

describe("stejná látka z více suplementů", () => {
	const multi = { name: "Multivitamin", dose: 2, unit: "tablety", ingredients: [{ name: "Zinek", amount: 10, unit: "mg", catalog: "zinc" }, { name: "Vitamin D3", amount: 25, unit: "µg", catalog: "vitamin_d" }, { name: "Niacin", amount: 16, unit: "mg" }] };
	const zinc = { name: "Zinek", catalog: "zinc", dose: 15, unit: "mg" };

	it("součet přes samostatné látky i složení přípravků (porce × obsah)", async () => {
		const { substanceTotals } = await import("../../src/calc/supplements");
		// zinek: 2 × 10 + 15 = 35 mg; vitamin D: 2 × 25 µg + 1000 IU (= 25 µg) = 75 µg = 0,075 mg
		const totals = substanceTotals([multi, zinc, { name: "Déčko", catalog: "vitamin_d", dose: 1000, unit: "IU" }, { name: "Kapsle", catalog: "magnesium", dose: 2, unit: "kapsle" }]);
		expect(totals).toEqual([
			{ catalog: "zinc", mg: 35, from: ["Multivitamin", "Zinek"] },
			{ catalog: "vitamin_d", mg: expect.closeTo(0.075, 9), from: ["Multivitamin", "Déčko"] },
		]);
	});

	it("limit se hlásí, až když ho překročí součet z více suplementů; kofein od 9 mg/kg celkem", async () => {
		const { substanceTotals, combinedWarnings } = await import("../../src/calc/supplements");
		const { combinedMessage } = await import("../../src/ui/supplements/text");
		// Každý zvlášť je pod limitem 25 mg, dohromady 35 mg.
		const warnings = combinedWarnings(substanceTotals([multi, zinc]), 80);
		expect(warnings).toEqual([{ catalog: "zinc", mg: 35, from: ["Multivitamin", "Zinek"], kind: "limit", limitMg: 25, supplementsOnly: false }]);
		expect(combinedMessage(warnings[0]!, "Zinek")).toBe("Zinek celkem 35 mg denně (Multivitamin + Zinek) – nad horním limitem 25 mg (ze všech zdrojů včetně jídla).");
		// Jediný zdroj nad limitem hlásí jeho vlastní řádek, ne součet.
		expect(combinedWarnings(substanceTotals([{ ...zinc, dose: 40 }]), 80)).toEqual([]);
		// Kofein: 400 + 2 × 200 = 800 mg ≥ 9 × 80 = 720 mg; při 90 kg (810 mg) ještě ne; bez váhy nejde posoudit.
		const caffeine = [{ name: "Kofein", catalog: "caffeine", dose: 400, unit: "mg" }, { name: "Předtréninkovka", dose: 2, ingredients: [{ name: "Kofein", amount: 200, unit: "mg", catalog: "caffeine" }] }];
		expect(combinedWarnings(substanceTotals(caffeine), 80)).toEqual([{ catalog: "caffeine", mg: 800, from: ["Kofein", "Předtréninkovka"], kind: "caffeine", limitMg: 720 }]);
		expect(combinedWarnings(substanceTotals(caffeine), 90)).toEqual([]);
		expect(combinedWarnings(substanceTotals(caffeine), null)).toEqual([]);
	});
});

describe("denní seznam", () => {
	it("isTaken nerozlišuje velikost písmen a mezery", () => {
		expect(isTaken(["Kreatin", "Vitamin D"], " kreatin ")).toBe(true);
		expect(isTaken(["Kreatin"], "Zinek")).toBe(false);
		expect(isTaken(undefined, "Zinek")).toBe(false);
	});

	it("toggleTaken přidá bez duplicit a odebere", () => {
		expect(toggleTaken(["Kreatin"], "Zinek", true)).toEqual(["Kreatin", "Zinek"]);
		expect(toggleTaken(["Kreatin"], "kreatin", true)).toEqual(["kreatin"]);
		expect(toggleTaken(["Kreatin", "Zinek"], "Kreatin", false)).toEqual(["Zinek"]);
		expect(toggleTaken(undefined, "Zinek", false)).toEqual([]);
	});
});
