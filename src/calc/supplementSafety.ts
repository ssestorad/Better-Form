// Bezpečnost suplementů: interakce s léky (podle skupin léků z profilu), nevhodné kombinace
// mezi vlastními suplementy a antidopingový stav (WADA 2026). Jen informace a odkaz na lékaře
// nebo lékárníka – žádná diagnóza (není to zdravotnická aplikace).

import type { SourceId } from "../evidence/sources";
import { translated } from "../i18n";
import type { MedicationId } from "../model/constants";
import { COMBINATIONS, type Combination } from "./supplementTables";

// ---------- Interakce s léky ----------

export { MEDICATIONS, type MedicationId } from "../model/constants";

export const MEDICATION_LABELS: Record<MedicationId, string> = translated({
	antidepressants: "Antidepressants (SSRI, SNRI and others)",
	blood_thinners: "Blood thinners (warfarin, aspirin and others)",
	thyroid: "Thyroid hormone (levothyroxine)",
	antibiotics: "Antibiotics (tetracyclines, quinolones)",
	diabetes: "Diabetes medication",
	blood_pressure: "Blood pressure and heart medication",
	sleep_aids: "Sleeping pills and sedatives",
	antiseizure: "Anti-seizure medication",
});

export interface DrugInteraction {
	/** Látky z katalogu (id), kterých se interakce týká. */
	substances: readonly string[];
	medications: readonly MedicationId[];
	/** Nekombinovat vůbec (jinak: jen po poradě s lékařem). */
	avoid?: boolean;
	sources: readonly SourceId[];
	text: { finding: string; advice: string };
}

/** Každý řádek má ověřený zdroj (SPEC kap. 14); co zdroj neříká, tu není. */
export const DRUG_INTERACTIONS: readonly DrugInteraction[] = [
	{
		substances: ["methylene_blue"],
		medications: ["antidepressants"],
		avoid: true,
		sources: ["ramsay2007", "gillman2011"],
		text: translated({
			finding: "It strongly blocks MAO-A, the enzyme that breaks down serotonin; 13 of 14 reported cases of nervous system toxicity were serotonin toxicity together with serotonin reuptake inhibitors.",
			advice: "Never combine them.",
		}),
	},
	{
		substances: ["caffeine"],
		medications: ["antidepressants", "antibiotics"],
		sources: ["carrillo2000"],
		text: translated({
			finding: "Some medicines slow the breakdown of caffeine in the liver, so it builds up – among them the antidepressant fluvoxamine and quinolone antibiotics such as enoxacin.",
			advice: "Ask your pharmacist whether this applies to your medicine; if it does, have less caffeine.",
		}),
	},
	{
		substances: ["vitamin_k"],
		medications: ["blood_thinners"],
		sources: ["sconce2007"],
		text: translated({
			finding: "Vitamin K counteracts warfarin. In people with unstable INR, a steady 150 µg a day agreed with their doctors made INR more stable – what matters is a steady intake.",
			advice: "With warfarin, don't start, stop or change vitamin K without your doctor.",
		}),
	},
	{
		substances: ["nattokinase"],
		medications: ["blood_thinners"],
		avoid: true,
		sources: ["chang2008"],
		text: translated({
			finding: "Case report: bleeding in the brain in a patient taking aspirin after a week of nattokinase.",
			advice: "Don't combine it with blood thinners.",
		}),
	},
	{
		substances: ["glucosamine"],
		medications: ["blood_thinners"],
		sources: ["knudsen2008"],
		text: translated({
			finding: "Reports to the FDA and WHO: higher INR, bleeding or bruising in people taking warfarin with glucosamine; INR mostly returned to normal after stopping it.",
			advice: "With warfarin, only after consulting your doctor and with INR checks.",
		}),
	},
	{
		substances: ["ginseng"],
		medications: ["blood_thinners"],
		sources: ["yuan2004"],
		text: translated({
			finding: "In a randomized trial in healthy people, American ginseng weakened the effect of warfarin (lower INR).",
			advice: "With warfarin, only after consulting your doctor.",
		}),
	},
	{
		substances: ["omega3"],
		medications: ["blood_thinners"],
		sources: ["wachira2014"],
		text: translated({
			finding: "A review found no higher risk of clinically significant bleeding, alone or together with blood thinners.",
			advice: "Tell your doctor that you take it.",
		}),
	},
	{
		substances: ["calcium"],
		medications: ["thyroid"],
		sources: ["singh2000"],
		text: translated({
			finding: "Calcium carbonate taken with levothyroxine reduced its absorption; TSH rose, in 20 % of patients above the normal range.",
			advice: "Take calcium and levothyroxine at different times of day – ask your pharmacist how far apart.",
		}),
	},
	{
		substances: ["iron"],
		medications: ["thyroid"],
		sources: ["campbell1992"],
		text: translated({
			finding: "Iron sulphate taken together with thyroxine: TSH rose from 1.6 to 5.4 mU/l in 12 weeks; iron binds thyroxine.",
			advice: "Take iron and levothyroxine at different times of day – ask your pharmacist how far apart.",
		}),
	},
	{
		substances: ["ashwagandha"],
		medications: ["thyroid"],
		sources: ["sharma2018"],
		text: translated({
			finding: "In people with a mildly underactive thyroid, 600 mg a day for 8 weeks raised T3 and T4 and lowered TSH.",
			advice: "With thyroid medication it can shift your hormone levels – only after consulting your doctor.",
		}),
	},
	{
		substances: ["iron", "calcium", "magnesium", "zinc"],
		medications: ["antibiotics"],
		sources: ["neuvonen1976", "lomaestro1995"],
		text: translated({
			finding: "Tetracyclines and quinolones bind iron, calcium, magnesium and zinc in the gut, which can reduce the absorption of tetracyclines by 50–90 %.",
			advice: "Keep these supplements apart from the antibiotic – with tetracyclines 3 hours were enough; ask your pharmacist about yours.",
		}),
	},
	{
		substances: ["berberine"],
		medications: ["diabetes"],
		sources: ["lan2015", "xie2022"],
		text: translated({
			finding: "Added to diabetes medication, berberine lowered blood sugar further; hypoglycaemia wasn't more frequent in the trials.",
			advice: "Tell your doctor – your medication may need adjusting.",
		}),
	},
	{
		substances: ["potassium_bicarbonate"],
		medications: ["blood_pressure"],
		sources: ["raebel2012"],
		text: translated({
			finding: "ACE inhibitors and sartans raise blood potassium – up to 10 % of patients had at least mild hyperkalaemia; potassium from supplements adds to it.",
			advice: "Only after consulting your doctor.",
		}),
	},
	{
		substances: ["green_tea_extract"],
		medications: ["blood_pressure"],
		sources: ["misaka2014"],
		text: translated({
			finding: "Green tea (700 ml a day for 2 weeks) cut blood levels of the beta blocker nadolol by 85 % and weakened its effect on blood pressure.",
			advice: "If you take a beta blocker, tell your doctor about green tea and its extracts.",
		}),
	},
	{
		substances: ["cbd"],
		medications: ["antiseizure"],
		sources: ["geffrey2015", "gaston2017"],
		text: translated({
			finding: "CBD raised the blood levels of clobazam and several other anti-seizure drugs; with valproate, liver tests got worse.",
			advice: "Only after consulting your neurologist.",
		}),
	},
	{
		substances: ["melatonin"],
		medications: ["sleep_aids"],
		sources: ["otmani2008"],
		text: translated({
			finding: "Melatonin added to zolpidem worsened psychomotor performance and driving more than zolpidem alone.",
			advice: "Don't combine them without your doctor; don't drive after taking them.",
		}),
	},
];

/** Interakce, které se týkají dané látky (všechny skupiny léků). */
export function interactionsFor(catalogId: string): DrugInteraction[] {
	return DRUG_INTERACTIONS.filter((i) => i.substances.includes(catalogId));
}

/** Interakce mezi vlastními suplementy a léky z profilu; každá jednou, i když se týká víc látek. */
export function drugWarnings(catalogIds: readonly string[], medications: readonly MedicationId[]): { interaction: DrugInteraction; substances: string[] }[] {
	return DRUG_INTERACTIONS.flatMap((interaction) => {
		const substances = interaction.substances.filter((s) => catalogIds.includes(s));
		const hits = interaction.medications.some((m) => medications.includes(m));
		return substances.length > 0 && hits ? [{ interaction, substances }] : [];
	});
}

// ---------- Kombinace mezi vlastními suplementy ----------

/**
 * Dvojice skupin látek (id z katalogu) k řádkům tabulky „Co nebrat spolu“ (podle id řádku).
 * Mimo translated(), aby se id nepřekládala.
 */
const COMBINATION_PAIRS: Record<string, readonly [readonly string[], readonly string[]]> = {
	"iron-calcium": [["iron"], ["calcium"]],
	"zinc-iron": [["zinc"], ["iron"]],
	"zinc-calcium": [["zinc"], ["calcium"]],
	stimulants: [["caffeine", "preworkout"], ["synephrine", "yohimbine"]],
};

/** Řádky „Co nebrat spolu“, ke kterým máš mezi aktivními suplementy obě strany (látky každé strany zvlášť). */
export function ownCombinations(catalogIds: readonly string[]): { combination: Combination; sides: [string[], string[]] }[] {
	return COMBINATIONS.flatMap((combination) => {
		const pair = COMBINATION_PAIRS[combination.id];
		if (!pair) return [];
		const left = pair[0].filter((s) => catalogIds.includes(s));
		const right = pair[1].filter((s) => catalogIds.includes(s));
		return left.length > 0 && right.length > 0 ? [{ combination, sides: [left, right] }] : [];
	});
}

// ---------- Antidoping ----------

/** Seznam zakázaných látek WADA 2026 a monitorovací program; jen látky katalogu, kterých se týká. */
export const WADA_NOTES: Record<string, string> = translated({
	caffeine: "In the WADA 2026 Monitoring Program – not prohibited.",
	synephrine: "In the WADA 2026 Monitoring Program – not prohibited.",
	cbd: "CBD itself isn't prohibited, but THC is prohibited in competition and CBD products can contain it.",
	preworkout: "WADA prohibits for example higenamine and methylsynephrine (oxilofrine), which have been found in some supplements – check the label.",
});

export const WADA_SOURCES: readonly SourceId[] = ["wada2026"];
/** Kontaminace doplňků a co s ní dělat. */
export const CONTAMINATION_SOURCES: readonly SourceId[] = ["geyer2004", "martinezsanz2017", "maughan2018"];
