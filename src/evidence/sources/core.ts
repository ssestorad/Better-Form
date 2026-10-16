// Zdroje ze SPEC kap. 14: zátěž, síla, běh, HRV, spánek, výživa, původní suplementy a programy
// Část katalogu zdrojů – skládá se v src/evidence/sources.ts. Nové zdroje jen ověřené (CLAUDE.md).

import type { Source } from "../sourceTypes";

export const CORE_SOURCES = {
	practice: {
		short: "Trenérská praxe",
		citation: "Osvědčená trenérská praxe nebo heuristika bez silných dat – nejde o výsledek výzkumu.",
		evidence: "practice",
	},
	foster2001: {
		short: "Foster 2001",
		citation: "Foster C. et al. (2001) A new approach to monitoring exercise training. J Strength Cond Res.",
		evidence: "research",
	},
	foster1998: {
		short: "Foster 1998",
		citation:
			"Foster C. (1998) Monitoring training in athletes with reference to overtraining syndrome. Med Sci Sports Exerc.",
		evidence: "research",
	},
	banister: {
		short: "Banister",
		citation: "Banister E. W. – impulse-response (fitness–fatigue) model.",
		evidence: "research",
		note: "Model trendu, ne přesná předpověď.",
	},
	williams2017: {
		short: "Williams 2017",
		citation:
			"Williams S. et al. (2017) Better way to determine the acute:chronic workload ratio? Br J Sports Med.",
		evidence: "research",
		note: "Metoda ACWR je kritizována (Impellizzeri 2020) – používá se jen jako upozornění.",
	},
	gabbett2016: {
		short: "Gabbett 2016",
		citation: "Gabbett T. J. (2016) The training–injury prevention paradox. Br J Sports Med.",
		evidence: "research",
	},
	impellizzeri2020: {
		short: "Impellizzeri 2020",
		citation:
			"Impellizzeri F. M. et al. (2020) Acute:chronic workload ratio: conceptual issues and fundamental pitfalls. Int J Sports Physiol Perform.",
		evidence: "research",
	},
	schoenfeld2017: {
		short: "Schoenfeld 2017",
		citation:
			"Schoenfeld B. J., Ogborn D., Krieger J. W. (2017) Dose-response relationship between weekly resistance training volume and increases in muscle mass. J Sports Sci.",
		evidence: "research",
	},
	helms2016: {
		short: "Helms 2016",
		citation:
			"Helms E. R. et al. (2016) Application of the repetitions in reserve-based RPE scale for resistance training. Strength Cond J.",
		evidence: "research",
	},
	ebben2011: {
		short: "Ebben 2011",
		citation: "Ebben W. P. et al. (2011) Kinetic analysis of several variations of push-ups. J Strength Cond Res.",
		evidence: "research",
	},
	kikuchi2017: {
		short: "Kikuchi 2017",
		citation:
			"Kikuchi N., Nakazato K. (2017) Low-load bench press and push-up induce similar muscle hypertrophy and strength gain. J Exerc Sci Fit.",
		evidence: "research",
	},
	kotarsky2018: {
		short: "Kotarsky 2018",
		citation:
			"Kotarsky C. J. et al. (2018) Effect of progressive calisthenic push-up training on muscle strength and thickness. J Strength Cond Res.",
		evidence: "research",
	},
	lake2012: {
		short: "Lake 2012",
		citation:
			"Lake J. P., Lauder M. A. (2012) Kettlebell swing training improves maximal and explosive strength. J Strength Cond Res.",
		evidence: "research",
	},
	farrar2010: {
		short: "Farrar 2010",
		citation: "Farrar R. E. et al. (2010) Oxygen cost of kettlebell swings. J Strength Cond Res.",
		evidence: "research",
	},
	seiler2010: {
		short: "Seiler 2010",
		citation:
			"Seiler S. (2010) What is best practice for training intensity and duration distribution in endurance athletes? Int J Sports Physiol Perform.",
		evidence: "research",
	},
	stoggl2014: {
		short: "Stöggl & Sperlich 2014",
		citation:
			"Stöggl T., Sperlich B. (2014) Polarized training has greater impact on key endurance variables than threshold, high intensity, or high volume training. Front Physiol.",
		evidence: "research",
	},
	buist2008: {
		short: "Buist 2008",
		citation:
			"Buist I. et al. (2008) No effect of a graded training program on the number of running-related injuries in novice runners. Am J Sports Med.",
		evidence: "research",
	},
	riegel1981: {
		short: "Riegel 1981",
		citation: "Riegel P. S. (1981) Athletic records and human endurance. American Scientist.",
		evidence: "research",
		note: "U delších tratí je odhad méně přesný.",
	},
	tanaka2001: {
		short: "Tanaka 2001",
		citation:
			"Tanaka H., Monahan K. D., Seals D. R. (2001) Age-predicted maximal heart rate revisited. J Am Coll Cardiol.",
		evidence: "research",
	},
	plews2012_2013: {
		short: "Plews 2012/2013",
		citation:
			"Plews D. J. et al. (2012, 2013) HRV v monitorování tréninku (klouzavé průměry lnRMSSD). Eur J Appl Physiol; Sports Med.",
		evidence: "research",
	},
	kiviniemi2007: {
		short: "Kiviniemi 2007",
		citation:
			"Kiviniemi A. M. et al. (2007) Endurance training guided individually by daily heart rate variability measurements. Eur J Appl Physiol.",
		evidence: "research",
	},
	watson2015: {
		short: "Watson 2015 (AASM & SRS)",
		citation:
			"Watson N. F. et al. (2015) Recommended amount of sleep for a healthy adult (AASM & SRS). Sleep.",
		evidence: "consensus",
	},
	milewski2014: {
		short: "Milewski 2014",
		citation:
			"Milewski M. D. et al. (2014) Chronic lack of sleep is associated with increased sports injuries in adolescent athletes. J Pediatr Orthop.",
		evidence: "research",
	},
	mah2011: {
		short: "Mah 2011",
		citation:
			"Mah C. D. et al. (2011) The effects of sleep extension on the athletic performance of collegiate basketball players. Sleep.",
		evidence: "research",
	},
	saw2016: {
		short: "Saw 2016",
		citation:
			"Saw A. E., Main L. C., Gastin P. B. (2016) Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures. Br J Sports Med.",
		evidence: "research",
	},
	tenHaaf2014: {
		short: "ten Haaf & Weijs 2014",
		citation:
			"ten Haaf T., Weijs P. J. M. (2014) Resting energy expenditure prediction in recreational athletes of 18–35 years: confirmation of Cunningham equation and an improved weight-based alternative. PLoS One 9(10):e108460.",
		evidence: "research",
		url: "https://doi.org/10.1371/journal.pone.0108460",
	},
	cunningham1980: {
		short: "Cunningham 1980",
		citation:
			"Cunningham J. J. (1980) A reanalysis of the factors influencing basal metabolic rate in normal adults. Am J Clin Nutr.",
		evidence: "research",
	},
	rmrAthletes2023: {
		short: "Metaanalýza RMR u sportovců 2023",
		citation:
			"Accuracy of Resting Metabolic Rate Prediction Equations in Athletes: A Systematic Review with Meta-analysis (2023). Sports Med.",
		evidence: "research",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10687135",
	},
	tudorLocke2004: {
		short: "Tudor-Locke & Bassett 2004",
		citation: "Tudor-Locke C., Bassett D. R. (2004) How many steps/day are enough? Preliminary pedometer indices for public health. Sports Med 34(1):1–8.",
		evidence: "research",
		kind: "review",
		url: "https://doi.org/10.2165/00007256-200434010-00001",
		note: "Třídy podle kroků za den: pod 5 000 sedavý, 5 000–7 499 málo aktivní, 7 500–9 999 středně aktivní, od 10 000 aktivní.",
	},
	mifflin1990: {
		short: "Mifflin–St Jeor 1990",
		citation: "Mifflin M. D., St Jeor S. T., Hill L. A., Scott B. J., Daugherty S. A., Koh Y. O. (1990) A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr 51(2):241–247.",
		evidence: "research",
		kind: "study",
		url: "https://doi.org/10.1093/ajcn/51.2.241",
		note: "498 zdravých lidí 19–78 let, s normální hmotností i obezitou.",
	},
	frankenfield2005: {
		short: "Frankenfield 2005",
		citation:
			"Frankenfield D. et al. (2005) Comparison of predictive equations for resting metabolic rate. J Am Diet Assoc.",
		evidence: "research",
	},
	margaria1963: {
		short: "Margaria 1963",
		citation: "Margaria R. et al. (1963) Energy cost of running. J Appl Physiol.",
		evidence: "research",
	},
	compendium2024: {
		short: "Compendium 2024",
		citation: "Herrmann S. D. et al. (2024) Compendium of Physical Activities.",
		evidence: "research",
		url: "https://pacompendium.com",
		note: "MET hodnoty z kódů aktivit 2024 (posilování 02050–02054, kalistenika 02020–02024, kettlebell 02058, plavání 182xx, švihadlo 02068–02069, běh 12020–12180).",
	},
	thomas2016: {
		short: "Thomas 2016 (ACSM/AND/DC)",
		citation:
			"Thomas D. T., Erdman K. A., Burke L. M. (2016) Nutrition and Athletic Performance (ACSM / AND / DC joint position). Med Sci Sports Exerc.",
		evidence: "consensus",
		url: "https://pubmed.ncbi.nlm.nih.gov/26891166/",
	},
	morton2018: {
		short: "Morton 2018",
		citation:
			"Morton R. W. et al. (2018) Protein supplementation and resistance training-induced gains: meta-analysis. Br J Sports Med.",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/28698222/",
	},
	nunes2022: {
		short: "Nunes 2022",
		citation:
			"Nunes E. A. et al. (2022) Systematic review and meta-analysis of protein intake to support muscle mass and function. J Cachexia Sarcopenia Muscle.",
		evidence: "research",
	},
	helms2014protein: {
		short: "Helms 2014",
		citation:
			"Helms E. R. et al. (2014) A systematic review of dietary protein during caloric restriction in resistance trained lean athletes. Int J Sport Nutr Exerc Metab.",
		evidence: "research",
	},
	helms2014contest: {
		short: "Helms 2014 (JISSN)",
		citation:
			"Helms E. R. et al. (2014) Evidence-based recommendations for natural bodybuilding contest preparation. JISSN.",
		evidence: "research",
	},
	mountjoy2023: {
		short: "IOC REDs 2023",
		citation:
			"Mountjoy M. et al. (2023) IOC consensus statement on Relative Energy Deficiency in Sport (REDs). Br J Sports Med.",
		evidence: "consensus",
		url: "https://pubmed.ncbi.nlm.nih.gov/37752011/",
	},
	maughan2018: {
		short: "IOC 2018 (Maughan)",
		citation:
			"Maughan R. J. et al. (2018) IOC consensus statement: dietary supplements and the high-performance athlete. Br J Sports Med 52(7):439–455.",
		evidence: "consensus",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5867441/",
	},
	kreider2017: {
		short: "ISSN 2017 (Kreider)",
		citation:
			"Kreider R. B. et al. (2017) International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine. J Int Soc Sports Nutr 14:18.",
		evidence: "consensus",
		url: "https://link.springer.com/article/10.1186/s12970-017-0173-z",
	},
	guest2021: {
		short: "ISSN 2021 (Guest)",
		citation:
			"Guest N. S. et al. (2021) International society of sports nutrition position stand: caffeine and exercise performance. J Int Soc Sports Nutr 18:1.",
		evidence: "consensus",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221/",
	},
	garrison2020: {
		short: "Garrison 2020 (Cochrane)",
		citation: "Garrison S. R. et al. (2020) Magnesium for skeletal muscle cramps. Cochrane Database Syst Rev CD009402.",
		evidence: "research",
		url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD009402.pub3/full",
		note: "Studie se týkají hlavně starších dospělých; pro křeče při sportu žádná randomizovaná studie není.",
	},
	wilborn2004: {
		short: "Wilborn 2004",
		citation:
			"Wilborn C. D. et al. (2004) Effects of zinc magnesium aspartate (ZMA) supplementation on training adaptations and markers of anabolism and catabolism. J Int Soc Sports Nutr 1(2):12–20.",
		evidence: "research",
		note: "Jedna studie na 42 trénovaných mužích bez nedostatku zinku a hořčíku.",
	},
	qureshi2014: {
		short: "Qureshi 2014",
		citation:
			"Qureshi A., Naughton D. P., Petroczi A. (2014) A systematic review on the herbal extract Tribulus terrestris and the roots of its putative aphrodisiac and performance enhancing effect. J Diet Suppl 11(1):64–79.",
		evidence: "research",
	},
	fernandezLazaro2022: {
		short: "Fernández-Lázaro 2022",
		citation:
			"Fernández-Lázaro D. et al. (2022) Effects of Tribulus terrestris L. on sport and health biomarkers in physically active adult males: a systematic review. Int J Environ Res Public Health 19(15):9533.",
		evidence: "research",
		url: "https://www.mdpi.com/1660-4601/19/15/9533",
	},
	bonilla2021: {
		short: "Bonilla 2021",
		citation:
			"Bonilla D. A. et al. (2021) Effects of ashwagandha (Withania somnifera) on physical performance: systematic review and Bayesian meta-analysis. J Funct Morphol Kinesiol 6(1):20.",
		evidence: "research",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8006238/",
		note: "Malé studie s různými extrakty a dávkami – výsledek ber s rezervou.",
	},
	livertoxAshwagandha: {
		short: "LiverTox – ashwagandha",
		citation: "LiverTox: Clinical and Research Information on Drug-Induced Liver Injury – Ashwagandha. NIDDK (NIH).",
		evidence: "research",
		url: "https://www.ncbi.nlm.nih.gov/books/NBK548536/",
		note: "Vychází z kazuistik – ukazuje, že poškození jater je možné, ne jak je časté.",
	},
	shin2010: {
		short: "Shin 2010",
		citation:
			"Shin B.-C. et al. (2010) Maca (L. meyenii) for improving sexual function: a systematic review. BMC Complement Altern Med 10:44.",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/20691074/",
	},
	paulsen2014: {
		short: "Paulsen 2014",
		citation:
			"Paulsen G. et al. (2014) Vitamin C and E supplementation hampers cellular adaptation to endurance training in humans: a double-blind, randomised, controlled trial. J Physiol 592(8):1887–1901.",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/24492839/",
		note: "Zhoršily se buněčné ukazatele adaptace, ne výsledky výkonnostních testů.",
	},
	hemila2013: {
		short: "Hemilä 2013 (Cochrane)",
		citation:
			"Hemilä H., Chalker E. (2013) Vitamin C for preventing and treating the common cold. Cochrane Database Syst Rev CD000980.",
		evidence: "research",
		url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD000980.pub4/full",
	},
	efsaUl: {
		short: "EFSA – horní limity",
		citation:
			"EFSA (2024) Overview on Tolerable Upper Intake Levels as derived by the Scientific Committee on Food (SCF) and the EFSA Panel on Dietetic Products, Nutrition and Allergies (NDA).",
		evidence: "consensus",
		url: "https://www.efsa.europa.eu/sites/default/files/2024-05/ul-summary-report.pdf",
		note: "Horní limit je hranice bezpečného dlouhodobého příjmu, ne doporučená dávka.",
	},
	efsaOmega2012: {
		short: "EFSA 2012 (omega-3)",
		citation:
			"EFSA NDA Panel (2012) Scientific Opinion on the Tolerable Upper Intake Level of eicosapentaenoic acid (EPA), docosahexaenoic acid (DHA) and docosapentaenoic acid (DPA). EFSA Journal 10(7):2815.",
		evidence: "consensus",
		url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2012.2815",
	},
	lanhers2017: {
		short: "Lanhers 2017",
		citation:
			"Lanhers C. et al. (2017) Creatine supplementation and upper limb strength performance: a systematic review and meta-analysis. Sports Med 47(1):163–173.",
		evidence: "research",
		url: "https://link.springer.com/article/10.1007/s40279-016-0571-4",
	},
	chilibeck2017: {
		short: "Chilibeck 2017",
		citation:
			"Chilibeck P. D. et al. (2017) Effect of creatine supplementation during resistance training on lean tissue mass and muscular strength in older adults: a meta-analysis. Open Access J Sports Med 8:213–226.",
		evidence: "research",
	},
	grgic2020: {
		short: "Grgic 2020",
		citation:
			"Grgic J. et al. (2020) Wake up and smell the coffee: caffeine supplementation and exercise performance – an umbrella review of 21 published meta-analyses. Br J Sports Med 54(11):681–688.",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/30926628/",
		note: "Většina zahrnutých studií proběhla na mladých mužích.",
	},
	southward2018: {
		short: "Southward 2018",
		citation:
			"Southward K., Rutherfurd-Markwick K. J., Ali A. (2018) The effect of acute caffeine ingestion on endurance performance: a systematic review and meta-analysis. Sports Med 48(8):1913–1928.",
		evidence: "research",
		url: "https://link.springer.com/article/10.1007/s40279-018-0939-8",
	},
	jager2017: {
		short: "ISSN 2017 (Jäger)",
		citation:
			"Jäger R. et al. (2017) International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr 14:20.",
		evidence: "consensus",
		url: "https://link.springer.com/article/10.1186/s12970-017-0177-8",
	},
	saunders2017: {
		short: "Saunders 2017",
		citation:
			"Saunders B. et al. (2017) β-alanine supplementation to improve exercise capacity and performance: a systematic review and meta-analysis. Br J Sports Med 51(8):658–669.",
		evidence: "research",
	},
	trexler2015: {
		short: "ISSN 2015 (Trexler)",
		citation:
			"Trexler E. T. et al. (2015) International society of sports nutrition position stand: Beta-Alanine. J Int Soc Sports Nutr 12:30.",
		evidence: "consensus",
		url: "https://link.springer.com/article/10.1186/s12970-015-0090-y",
	},
	farrokhyar2017: {
		short: "Farrokhyar 2017",
		citation:
			"Farrokhyar F. et al. (2017) Effects of vitamin D supplementation on serum 25-hydroxyvitamin D concentrations and physical performance in athletes: a systematic review and meta-analysis of randomized controlled trials. Sports Med 47(11):2323–2339.",
		evidence: "research",
	},
	owens2018: {
		short: "Owens 2018",
		citation:
			"Owens D. J., Allison R., Close G. L. (2018) Vitamin D and the athlete: current perspectives and new challenges. Sports Med 48(Suppl 1):3–16.",
		evidence: "research",
		note: "Přehledový článek, ne metaanalýza.",
	},
	thielecke2020: {
		short: "Thielecke 2020",
		citation:
			"Thielecke F., Blannin A. (2020) Omega-3 fatty acids for sport performance – are they equally beneficial for athletes and amateurs? A narrative review. Nutrients 12(12):3712.",
		evidence: "research",
		url: "https://www.mdpi.com/2072-6643/12/12/3712",
		note: "Přehledový článek, ne metaanalýza.",
	},
	jager2025: {
		short: "ISSN 2025 (Jäger)",
		citation:
			"Jäger R. et al. (2025) International Society of Sports Nutrition Position Stand: long-chain omega-3 polyunsaturated fatty acids. J Int Soc Sports Nutr 22(1).",
		evidence: "consensus",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11737053/",
	},
	wang2017: {
		short: "Wang 2017",
		citation:
			"Wang R. et al. (2017) The effect of magnesium supplementation on muscle fitness: a meta-analysis and systematic review. Magnes Res 30(4).",
		evidence: "research",
	},
	zhang2017: {
		short: "Zhang 2017",
		citation:
			"Zhang Y. et al. (2017) Can magnesium enhance exercise performance? Nutrients 9(9):946.",
		evidence: "research",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5622706/",
		note: "Přehled studií na zvířatech i lidech – mechanismy, ne důkaz účinku u sportovců.",
	},
	koehler2009: {
		short: "Koehler 2009",
		citation:
			"Koehler K. et al. (2009) Serum testosterone and urinary excretion of steroid hormone metabolites after administration of a high-dose zinc supplement. Eur J Clin Nutr 63:65–70.",
		evidence: "research",
		url: "https://www.nature.com/articles/1602899",
		note: "Malá studie na 14 mužích.",
	},
	hemila2017zinc: {
		short: "Hemilä 2017 (zinek)",
		citation:
			"Hemilä H. (2017) Zinc lozenges and the common cold: a meta-analysis comparing zinc acetate and zinc gluconate, and the role of zinc dosage. JRSM Open 8(5).",
		evidence: "research",
	},
	bjelakovic2012: {
		short: "Bjelakovic 2012 (Cochrane)",
		citation:
			"Bjelakovic G. et al. (2012) Antioxidant supplements for prevention of mortality in healthy participants and patients with various diseases. Cochrane Database Syst Rev CD007176.",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/22419320/",
		note: "Týká se úmrtnosti v běžné populaci, ne sportovního výkonu.",
	},
	woolf2006: {
		short: "Woolf & Manore 2006",
		citation:
			"Woolf K., Manore M. M. (2006) B-vitamins and exercise: does exercise alter requirements? Int J Sport Nutr Exerc Metab 16(5):453–484.",
		evidence: "research",
		note: "Přehledový článek.",
	},
	pawlak2013: {
		short: "Pawlak 2013",
		citation:
			"Pawlak R. et al. (2013) How prevalent is vitamin B12 deficiency among vegetarians? Nutr Rev 71(2):110–117.",
		evidence: "research",
	},
	ristow2009: {
		short: "Ristow 2009",
		citation:
			"Ristow M. et al. (2009) Antioxidants prevent health-promoting effects of physical exercise in humans. Proc Natl Acad Sci USA 106(21):8665–8670.",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/19433800/",
		note: "Malá studie (39 mužů), 4 týdny.",
	},
	uspstf2022: {
		short: "USPSTF 2022",
		citation:
			"US Preventive Services Task Force (2022) Vitamin, mineral, and multivitamin supplementation to prevent cardiovascular disease and cancer: recommendation statement. JAMA 327(23).",
		evidence: "consensus",
		url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/vitamin-supplementation-to-prevent-cvd-and-cancer-preventive-medication",
		note: "Týká se prevence nemocí v běžné populaci, ne sportovního výkonu.",
	},
	mott2019: {
		short: "Mott 2019",
		citation:
			"Mott A. et al. (2019) Effect of vitamin K on bone mineral density and fractures in adults: an updated systematic review and meta-analysis of randomised controlled trials. Osteoporos Int 30:1543–1559.",
		evidence: "research",
		note: "Hlavně ženy po menopauze a pacienti s osteoporózou.",
	},
	mcfarlin2017: {
		short: "McFarlin 2017",
		citation:
			"McFarlin B. K., Henning A. L., Venable A. S. (2017) Oral consumption of vitamin K2 for 8 weeks associated with increased maximal cardiac output during exercise. Altern Ther Health Med 23(4).",
		evidence: "research",
		note: "Jediná malá studie, výsledek zatím nikdo nezopakoval.",
	},
	wankhede2015: {
		short: "Wankhede 2015",
		citation:
			"Wankhede S. et al. (2015) Examining the effect of Withania somnifera supplementation on muscle strength and recovery: a randomized controlled trial. J Int Soc Sports Nutr 12:43.",
		evidence: "research",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4658772/",
		note: "Netrénovaní muži, 8 týdnů; extrakt dodal výrobce.",
	},
	bjornsson2020: {
		short: "Björnsson 2020",
		citation:
			"Björnsson H. K. et al. (2020) Ashwagandha-induced liver injury: a case series from Iceland and the US Drug-Induced Liver Injury Network. Liver Int 40(4).",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/31991029/",
		note: "Série případů – ukazuje, že riziko existuje, ne jak je časté.",
	},
	rogerson2007: {
		short: "Rogerson 2007",
		citation:
			"Rogerson S. et al. (2007) The effect of five weeks of Tribulus terrestris supplementation on muscle strength and body composition during preseason training in elite rugby league players. J Strength Cond Res 21(2):348–353.",
		evidence: "research",
	},
	stone2009: {
		short: "Stone 2009",
		citation:
			"Stone M. et al. (2009) A pilot investigation into the effect of maca supplementation on physical activity and sexual desire in sportsmen. J Ethnopharmacol 126(3):574–576.",
		evidence: "research",
		note: "Pilotní studie na 8 cyklistech.",
	},
	lee2016: {
		short: "Lee 2016",
		citation:
			"Lee M. S. et al. (2016) The use of maca (Lepidium meyenii) to improve semen quality: a systematic review. Maturitas 92:64–69.",
		evidence: "research",
	},
	lukaski2004: {
		short: "Lukaski 2004",
		citation:
			"Lukaski H. C. (2004) Vitamin and mineral status: effects on physical performance. Nutrition 20(7–8):632–644.",
		evidence: "research",
		note: "Přehledový článek.",
	},
	wolfe2017: {
		short: "Wolfe 2017",
		citation:
			"Wolfe R. R. (2017) Branched-chain amino acids and muscle protein synthesis in humans: myth or reality? J Int Soc Sports Nutr 14:30.",
		evidence: "research",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5568273/",
		note: "Přehledový článek.",
	},
	jackman2017: {
		short: "Jackman 2017",
		citation:
			"Jackman S. R. et al. (2017) Branched-chain amino acid ingestion stimulates muscle myofibrillar protein synthesis following resistance exercise in humans. Front Physiol 8:390.",
		evidence: "research",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5461297/",
		note: "Malá studie na 10 mužích; měřila tvorbu bílkovin pár hodin po tréninku, ne růst svalů.",
	},
	plotkin2021: {
		short: "Plotkin 2021",
		citation:
			"Plotkin D. L. et al. (2021) Isolated leucine and branched-chain amino acid supplementation for enhancing muscular strength and hypertrophy: a narrative review. Int J Sport Nutr Exerc Metab 31(3).",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/33741748/",
		note: "Přehledový článek.",
	},
	fedewa2019: {
		short: "Fedewa 2019",
		citation:
			"Fedewa M. V. et al. (2019) Effect of branched-chain amino acid supplementation on muscle soreness following exercise: a meta-analysis. Int J Vitam Nutr Res 89(5–6):348–356.",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/30938579/",
		note: "Jen 8 studií, většinou na netrénovaných lidech.",
	},
	ferrando2023: {
		short: "ISSN 2023 (Ferrando)",
		citation:
			"Ferrando A. A. et al. (2023) International Society of Sports Nutrition Position Stand: effects of essential amino acid supplementation on exercise and performance. J Int Soc Sports Nutr 20(1):2263409.",
		evidence: "consensus",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10561576/",
	},
	trexler2019: {
		short: "Trexler 2019",
		citation:
			"Trexler E. T. et al. (2019) Acute effects of citrulline supplementation on high-intensity strength and power performance: a systematic review and meta-analysis. Sports Med 49(5):707–718.",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/30895562/",
	},
	varvik2021: {
		short: "Vårvik 2021",
		citation:
			"Vårvik F. T., Bjørnsen T., Gonzalez A. M. (2021) Acute effect of citrulline malate on repetition performance during strength training: a systematic review and meta-analysis. Int J Sport Nutr Exerc Metab 31(4).",
		evidence: "research",
	},
	gough2021: {
		short: "Gough 2021",
		citation:
			"Gough L. A. et al. (2021) A critical review of citrulline malate supplementation and exercise performance. Eur J Appl Physiol 121(12).",
		evidence: "research",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8571142/",
		note: "Přehledový článek.",
	},
	ramezani2019: {
		short: "Ramezani Ahmadi 2019",
		citation:
			"Ramezani Ahmadi A. et al. (2019) The effect of glutamine supplementation on athletic performance, body composition, and immune function: a systematic review and a meta-analysis of clinical trials. Clin Nutr 38(3):1076–1091.",
		evidence: "research",
	},
	candow2001: {
		short: "Candow 2001",
		citation:
			"Candow D. G. et al. (2001) Effect of glutamine supplementation combined with resistance training in young adults. Eur J Appl Physiol 86(2):142–149.",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/11822473/",
	},
	gleeson2008: {
		short: "Gleeson 2008",
		citation:
			"Gleeson M. (2008) Dosing and efficacy of glutamine supplementation in human exercise and sport training. J Nutr 138(10):2045S–2049S.",
		evidence: "research",
		url: "https://pubmed.ncbi.nlm.nih.gov/18806122/",
		note: "Přehledový článek.",
	},
	who2007: {
		short: "WHO/FAO/UNU 2007",
		citation:
			"WHO/FAO/UNU (2007) Protein and amino acid requirements in human nutrition. Report of a joint expert consultation. WHO Technical Report Series 935.",
		evidence: "consensus",
		note: "Průměrná potřeba zdravého dospělého; nejde o doporučení pro sportovce.",
	},
	sawka2007: {
		short: "ACSM 2007 (Sawka)",
		citation:
			"Sawka M. N. et al. (2007) American College of Sports Medicine position stand: exercise and fluid replacement. Med Sci Sports Exerc 39(2):377–390.",
		evidence: "consensus",
		note: "Složení potu se mezi lidmi liší až několikanásobně.",
	},
	baker2017: {
		short: "Baker 2017",
		citation:
			"Baker L. B. (2017) Sweating rate and sweat sodium concentration in athletes: a review of methodology and intra/interindividual variability. Sports Med 47(Suppl 1):111–128.",
		evidence: "research",
		url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5371639/",
	},
	efsaDrv: {
		short: "EFSA – referenční příjem",
		citation:
			"EFSA (2017, doplněno 2019) Dietary Reference Values for nutrients: summary report. Sodík a chlorid: EFSA Journal 17(9):5778 a 5779.",
		evidence: "consensus",
		url: "https://multimedia.efsa.europa.eu/drvs/index.htm",
		note: "Hodnoty pro běžnou dospělou populaci, ne zvlášť pro sportovce.",
	},
	nhsCouchTo5k: {
		short: "NHS Couch to 5K",
		citation: "NHS Couch to 5K.",
		evidence: "consensus",
	},
	elongaHelp: {
		short: "Elonga – nápověda",
		citation: "Elonga – nápověda k propojení.",
		evidence: null,
		url: "https://support.elonga.com/cs/support/solutions/articles/205000048307",
	},
} as const satisfies Record<string, Source>;
