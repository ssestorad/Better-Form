// „Co říká výzkum“ u cviků a programů: shrnutí, praktické doporučení a studie
// s typem (stanovisko, metaanalýza, RCT, EMG…). Citace ověřené v src/evidence/sources.ts.
// Anglický zdroj, překlady v src/locales/<kód>/research.ts (klíč = id tématu, studie ve stejném pořadí).
// EMG měří aktivaci svalu, ne růst – je to nejslabší typ důkazu pro hypertrofii.
// Bez závislosti na Obsidianu.

import type { SourceId } from "../evidence/sources";
import { getLanguage } from "../i18n";
import type { EvidenceLevel } from "../model/constants";
import { builtinId, contentOf, exerciseId } from "./localize";

export interface ResearchFinding {
	source: SourceId;
	finding: string;
}

export interface ResearchTopic {
	id: string;
	title: string;
	summary: string;
	/** Co si z toho vzít do tréninku. */
	practical: string;
	studies: ResearchFinding[];
	/** Štítek celé položky (SPEC 7.1). */
	evidence: EvidenceLevel;
}

export const RESEARCH_TOPICS: ResearchTopic[] = [
	{
		id: "training",
		title: "Volume, frequency and proximity to failure",
		summary: "For muscle growth what matters most is weekly volume (at least around 10 sets per muscle group) and sets close to failure. Frequency and load matter less when volume is the same.",
		practical: "Train each muscle group at least twice a week, ending sets 0–3 reps short of failure (RIR); you don't have to go to failure. For muscle, staying close to failure matters more; for strength, sets further from failure work about as well. Lighter and heavier weights both build muscle; for maximal strength you also need heavy sets.",
		studies: [
			{ source: "schoenfeld2017", finding: "Meta-analysis: each additional weekly set increases muscle growth; 10 or more sets a week led to more growth than fewer than 5." },
			{ source: "schoenfeld2016freq", finding: "Meta-analysis: training a muscle group at least twice a week led to more growth than once a week." },
			{ source: "grgic2018freq", finding: "Meta-analysis: higher frequency increases strength, but with the same weekly volume its effect is not significant." },
			{ source: "refalo2023", finding: "Meta-analysis: training to failure isn't necessary for muscle growth; sets close to failure are enough." },
			{ source: "schoenfeld2017load", finding: "Meta-analysis: light and heavy weights produced similar muscle growth; heavy weights produced more maximal strength." },
			{ source: "hamarsland2021", finding: "Controlled trial in trained people: the same volume spread over different numbers of sessions per week led to similar gains in muscle and strength." },
			{ source: "pelland2025", finding: "Meta-regression: muscle and strength increase with higher weekly volume, but the gains gradually diminish; with the same volume frequency has a smaller effect." },
			{ source: "robinson2024", finding: "Meta-regressions: muscle growth increased the closer sets ended to failure; strength gains were similar across a wide range of reps in reserve." },
		],
		evidence: "research",
	},
	{
		id: "squat",
		title: "The squat and squat depth",
		summary: "A deep squat builds more glutes and adductors than a shallow one. With correct technique, depth in itself isn't a risk for the knees.",
		practical: "Squat to the depth you can manage with a neutral back and knees tracking over your toes. Increase depth and weight gradually.",
		studies: [
			{ source: "kubo2019", finding: "Controlled trial: the deep squat enlarged the glutes and adductors more than the half squat; the front of the thighs grew similarly." },
			{ source: "bloomquist2013", finding: "Controlled trial: a heavy deep squat increased thigh muscle cross-section more than a shallow one." },
			{ source: "hartmann2013", finding: "Biomechanics review: with correct technique the deep squat doesn't overload healthy knees more than a shallow one; shallow squats with heavy weight may actually increase the load." },
			{ source: "schoenfeld2010", finding: "Review: describes knee and hip loading in different phases of the squat and technique principles." },
			{ source: "yanagisawa2021", finding: "MRI study: with squat depth under heavy load, lumbar disc loading increases – adjust depth to your technique and mobility." },
		],
		evidence: "research",
	},
	{
		id: "deadlift",
		title: "The deadlift and its variations",
		summary: "The variations differ in how they distribute the load: the trap bar loads the knees more and the back less, the sumo loads the front of the thighs more. Choose by goal and comfort.",
		practical: "If the conventional deadlift hurts your back, try the trap bar or sumo. The heaviest sets above roughly 90 % of max increase upper-back flexion – save them for tests.",
		studies: [
			{ source: "swinton2011", finding: "Biomechanics: with the trap bar, less lower-back loading and more knee involvement, with higher force and power at the same relative load." },
			{ source: "escamilla2002", finding: "EMG: the sumo uses the front of the thighs more, the conventional deadlift the calves more; overall activation is similar." },
			{ source: "martinFuentes2020", finding: "Systematic review of EMG: deadlift variations differ in their pattern of muscle activation; growth can't be inferred from activation alone." },
			{ source: "plotkin2023", finding: "Controlled trial: the hip thrust and the squat led to similar glute growth and improved the deadlift similarly." },
		],
		evidence: "research",
	},
	{
		id: "push",
		title: "Bench press and push-ups",
		summary: "At a similar difficulty, push-ups give similar gains in strength and muscle as the bench press. A push-up lifts about 64 % of body weight.",
		practical: "If you don't have a barbell, push-ups are enough – just make them harder (feet raised, added weight, a band, slower tempo) so your sets stay close to failure.",
		studies: [
			{ source: "calatayud2015", finding: "Controlled trial: the bench press and push-ups with the same muscle activity led to similar strength improvements." },
			{ source: "kikuchi2017", finding: "Controlled trial: a light bench press and push-ups produced similar muscle growth and strength." },
			{ source: "kotarsky2018", finding: "Controlled trial: progressively harder push-ups increased strength and muscle thickness similarly to the bench press." },
			{ source: "ebben2011", finding: "Biomechanics: a push-up lifts about 64 % of body weight; variations range roughly from 41 to 75 %." },
			{ source: "yang2019", finding: "Cohort study in firefighters: 40 or more push-ups was associated with a lower risk of cardiovascular events – an association, not a cause." },
		],
		evidence: "research",
	},
	{
		id: "pull",
		title: "Pull-ups and rows",
		summary: "An overhand grip uses the lats and lower traps more, an underhand grip the biceps more. The lat pulldown is a good substitute and a path to the first pull-up.",
		practical: "Alternate overhand and underhand grips. Until you can do a pull-up, build up with rows, negatives and lat pulldowns.",
		studies: [
			{ source: "youdas2010", finding: "EMG: the underhand pull-up used the biceps and chest more, the overhand one the lower traps; the lats worked similarly." },
			{ source: "dickie2017", finding: "EMG: different grips and widths change muscle activation only a little." },
			{ source: "lusk2010", finding: "EMG in the lat pulldown: an overhand grip activated the lats more than an underhand grip; grip width made no difference." },
			{ source: "hewit2018", finding: "EMG: the kneeling lat pulldown was the closest to a pull-up in activation." },
		],
		evidence: "research",
	},
	{
		id: "glutes",
		title: "Hip thrust and glutes",
		summary: "The hip thrust activates the glutes more than the squat, but glute growth is similar with both exercises.",
		practical: "For the glutes, both the squat and the hip thrust work – choose the exercise that suits you and watch your weekly volume.",
		studies: [
			{ source: "contreras2015", finding: "EMG: the hip thrust activated the gluteus maximus more than the squat." },
			{ source: "plotkin2023", finding: "Controlled trial: the hip thrust and the squat led to similar glute growth." },
			{ source: "barbalho2020", finding: "Controlled trial in trained women: the squat gave similar or greater gains in strength and muscle than the hip thrust." },
			{ source: "kubo2019", finding: "Controlled trial: the deep squat enlarged the glutes more than the half squat." },
		],
		evidence: "research",
	},
	{
		id: "kettlebell",
		title: "Kettlebell",
		summary: "Swings improve strength and explosiveness; as cardio only partly – the heart rate goes high, oxygen uptake less so. For maximal strength and jumping, barbells are better.",
		practical: "The kettlebell is a good supplement for explosiveness, conditioning and the back. For maximal strength combine it with heavy barbell exercises.",
		studies: [
			{ source: "lake2012", finding: "Controlled trial: six weeks of swings improved maximal and explosive strength." },
			{ source: "farrar2010", finding: "Study: 12 minutes of swings raised the heart rate more than oxygen uptake would suggest – only partly cardio." },
			{ source: "otto2012", finding: "Controlled trial: barbell training (weightlifting) improved the squat and clean more than kettlebells; the jump improved similarly." },
			{ source: "jay2011", finding: "Controlled trial in workers: kettlebell training reduced neck, shoulder and lower back pain." },
			{ source: "meigh2019", finding: "Review of practical use: kettlebells have a place in rehabilitation and conditioning; good-quality studies are few." },
		],
		evidence: "research",
	},
	{
		id: "core",
		title: "Abs, sit-ups and the core",
		summary: "In a large study of soldiers, replacing sit-ups with core exercises didn't change the injury rate, and soldiers doing core exercises did slightly better on the sit-up test. Back pain was prevented by brief education, not core training.",
		practical: "For a sit-up test you can also train core exercises (plank, side plank, crunches). The crunch loads the lumbar spine much less than the sit-up.",
		studies: [
			{ source: "childs2009", finding: "Controlled trial in 3,900 soldiers: the core exercise group improved the sit-up test slightly more than the sit-up group." },
			{ source: "childs2010", finding: "Controlled trial: the injury rate didn't differ between groups." },
			{ source: "george2011", finding: "Controlled trial: back pain was reduced by brief pain education, not core stabilization." },
			{ source: "axler1997", finding: "Biomechanics: the crunch loads the lumbar spine much less than the sit-up; the side plank works the obliques without much pressure on the spine." },
			{ source: "escamilla2010", finding: "EMG: some exercises on a ball use the abs more than classic crunches." },
			{ source: "huxelBliven2013", finding: "Review: core training as injury prevention has mixed and limited evidence." },
		],
		evidence: "research",
	},
	{
		id: "frequency_programs",
		title: "Frequent practice of one exercise (challenges, grease the groove)",
		summary: "More frequent training works if the total volume makes sense and there's time to recover; frequency itself matters less than volume. The specific methods “grease the groove” and “100 push-ups a day” have no peer-reviewed study of their own.",
		practical: "With daily challenges, watch fatigue and pain; if they get worse, back off. What counts is the total of quality sets per week.",
		studies: [
			{ source: "grgic2018freq", finding: "Meta-analysis: frequency increases strength mainly by increasing volume; with the same volume the difference is small." },
			{ source: "schoenfeld2016freq", finding: "Meta-analysis: at least two sessions per muscle group a week are better than one." },
			{ source: "hamarsland2021", finding: "Controlled trial: the same volume over different numbers of sessions gave similar results." },
			{ source: "kotarsky2018", finding: "Controlled trial: progressively harder push-ups increased strength and muscle thickness." },
		],
		evidence: "practice",
	},
	{
		id: "novice_running",
		title: "Beginner runners",
		summary: "Beginners have the highest injury risk. Increasing slowly and getting enough rest are sensible, but the “10 % rule” on its own didn't reduce injuries.",
		practical: "Alternate running and walking, run 3× a week with a day off in between, and slow down or skip a run when something hurts.",
		studies: [
			{ source: "buist2008", finding: "Controlled trial: a more gradual plan (10 % a week) didn't reduce the number of injuries in beginner runners." },
			{ source: "videbaek2015", finding: "Meta-analysis: beginner runners have the most injuries per 1000 hours of running." },
			{ source: "vanDerDoes2023", finding: "Controlled trial (741 beginners): an online tool with injury prevention advice didn't reduce their number." },
			{ source: "nhsCouchTo5k", finding: "Public NHS plan: 9 weeks, three sessions a week, alternating running and walking up to 30 minutes of running." },
		],
		evidence: "research",
	},
	{
		id: "intensity",
		title: "80/20 running and intervals",
		summary: "Most of the time at low intensity and a smaller part in hard efforts is a proven distribution. Polarized training is better only for VO2max, mainly in elite athletes; otherwise the results are similar.",
		practical: "Run about 80 % of your time easy (zones 1–2) and the rest as intervals or tempo. Intervals are effective for VO2max, but don't overdo them.",
		studies: [
			{ source: "seiler2010", finding: "Review: the most successful endurance athletes spend roughly 80 % of their training at low intensity." },
			{ source: "stoggl2014", finding: "Controlled trial: polarized training improved key endurance markers more than other models." },
			{ source: "rosenblat2019", finding: "Meta-analysis: a small and uncertain difference in favor of polarized over threshold training in trained people." },
			{ source: "silvaOliveira2024", finding: "Meta-analysis: polarized training is better only for VO2peak, mainly in shorter programs and elite athletes; time trials were similar." },
			{ source: "milanovic2015", finding: "Meta-analysis: interval training improved VO2max more than continuous endurance training." },
		],
		evidence: "research",
	},
	{
		id: "hrv_training",
		title: "HRV-guided training",
		summary: "Training adjusted to morning HRV is at least as effective as a fixed plan, often with fewer hard sessions. The benefit is small.",
		practical: "When your HRV is below your baseline, take an easier day; within the baseline, train as planned. Measure the same way every morning.",
		studies: [
			{ source: "kiviniemi2007", finding: "Controlled trial: the HRV-guided group improved maximal performance more than the fixed-plan group." },
			{ source: "vesterinen2016", finding: "Controlled trial in recreational runners: HRV-guided training improved endurance similarly or slightly more, with fewer high-intensity sessions." },
			{ source: "javaloyes2019", finding: "Controlled trial in cyclists: HRV-guided training improved performance more than a traditional plan." },
			{ source: "medellinRuiz2020", finding: "Meta-analysis: HRV-guided training brings small improvements in some physiological markers compared with a fixed plan." },
			{ source: "duking2021", finding: "Meta-analysis (wearable measurement): small positive effects on submaximal markers, no clear difference in performance." },
		],
		evidence: "research",
	},
	{
		id: "deload",
		title: "Periodization and the deload week",
		summary: "Periodization helps maximal strength slightly; for muscle growth at the same volume it's similar to training without it. The deload week is common practice with consensus among coaches; studies are few.",
		practical: "Roughly every 4–8 weeks, or when fatigued, take a week with lower volume and intensity. Your muscles won't disappear in a week.",
		studies: [
			{ source: "williams2017period", finding: "Meta-analysis: periodized training increased maximal strength more than non-periodized training." },
			{ source: "moesgaard2022", finding: "Meta-analysis at equal volume: periodization helped strength slightly and had no effect on muscle growth." },
			{ source: "grgic2018period", finding: "Systematic review: similar muscle growth with and without periodization." },
			{ source: "bell2023", finding: "Delphi consensus of coaches and scientists: a deload = a period of reduced training load, usually a week, for fatigue and to prevent stagnation." },
			{ source: "coleman2024", finding: "Controlled trial: a week off in the middle of a nine-week program didn't harm muscle growth; for lower-body strength it may have reduced the gain slightly." },
		],
		evidence: "research",
	},
	{
		id: "range_of_motion",
		title: "Range of motion and training the stretched muscle",
		summary: "A full range of motion is a safe default. Studies increasingly show that the part of the movement where the muscle is stretched matters most for growth: exercises and partial reps at long muscle lengths built as much or more muscle than full reps or reps in the shortened position.",
		practical: "Use a full range of motion and don't cut the stretched part short. Prefer variants that load the stretched muscle – overhead triceps extensions, seated leg curls, incline curls. At the end of a set, partial reps in the stretched position are a reasonable way to add work.",
		studies: [
			{ source: "pallares2021", finding: "Meta-analysis of 16 studies: a full range of motion built more strength and more lower-body muscle than a partial range." },
			{ source: "pedrosa2022", finding: "Knee extensions: partial reps in the stretched part of the movement grew parts of the quadriceps more than full reps or partial reps in the shortened part." },
			{ source: "kassiano2023", finding: "Calf raises in young women: partial reps in the stretched position grew the inner calf about twice as much as full reps (15 vs 7 %)." },
			{ source: "wolf2025", finding: "Trained people, lat pulldowns: partial reps in the stretched position gave the same muscle growth as full reps." },
			{ source: "maeo2023", finding: "Overhead triceps extensions built substantially more triceps than extensions with the arms at the sides, even with lighter weights." },
			{ source: "maeo2021", finding: "Seated leg curls built more hamstring muscle than lying leg curls (+14 vs +9 %)." },
			{ source: "kobayashi2026", finding: "Incline curls grew the biceps slightly more, preacher curls the brachialis and brachioradialis; total growth of the arm flexors was similar." },
			{ source: "androulakiskorakakis2023", finding: "Narrative review: for muscle growth, emphasise training at long muscle lengths and use a rep tempo of about 2–8 seconds." },
		],
		evidence: "research",
	},
	{
		id: "technique",
		title: "Tempo, rest, cheating reps and set techniques",
		summary: "Most technique details matter less than the internet suggests: a wide range of tempos, free weights or machines, one side or both all build similar muscle. Rest of more than a minute helps a little; drop sets and supersets save time without losing muscle.",
		practical: "Lift under control (roughly 2–8 s per rep) and rest at least about 1.5 minutes between sets; when you're short on time, use drop sets or supersets. Pick exercises you can progress on and change them deliberately, not at random. A little momentum at the end of a set of curls doesn't hurt.",
		studies: [
			{ source: "schoenfeld2015tempo", finding: "Meta-analysis: reps lasting 0.5–8 seconds built similar muscle; very slow reps over 10 seconds seem worse." },
			{ source: "singer2024", finding: "Bayesian meta-analysis: rest longer than 60 s gave slightly more muscle; beyond 90 s no further difference was found." },
			{ source: "augustin2025", finding: "Arm training in trained people: curls and extensions with momentum ('cheating') built the same muscle as strict reps." },
			{ source: "schoenfeld2018focus", finding: "8 weeks: focusing on the working muscle grew the biceps more than focusing on the movement (12 vs 7 %); the quadriceps didn't differ." },
			{ source: "sodal2023", finding: "Meta-analysis of 6 studies: drop sets built similar muscle to traditional sets in less time." },
			{ source: "iversen2021", finding: "Review: supersets, drop sets and rest-pause roughly halve training time at the same volume; they probably suit muscle growth better than maximal strength." },
			{ source: "haugen2023", finding: "Meta-analysis: free weights and machines built similar muscle and strength; each improved strength more in its own kind of test." },
			{ source: "kassiano2025", finding: "Meta-analysis: one-sided and two-sided training built similar muscle; strength improved more in the form that was trained." },
			{ source: "kassiano2022", finding: "Systematic review: deliberate variation of exercises can help regional growth and strength, but frequent random rotation may hinder progress." },
			{ source: "vanevery2026", finding: "Review: post-workout hormones, metabolites and cell swelling ('the pump') aren't meaningful drivers of muscle growth, and sarcoplasmic hypertrophy isn't a meaningful part of it." },
		],
		evidence: "research",
	},
	{
		id: "rest_intervals",
		title: "Rest between sets",
		summary: "Longer rest lets you keep more weight and reps in the next set. For strength in trained people more than 2 minutes works best; for muscle, rest of more than about a minute helps a little.",
		practical: "Heavy compound exercises: rest 2–3 minutes or more. Isolation exercises and lighter sets: 1–2 minutes is enough. When you're short on time, shorter rest still works – just count on a little less weight.",
		studies: [
			{ source: "schoenfeld2016rest", finding: "8 weeks in trained men: 3-minute rest gave more strength in the squat and bench press and more thigh muscle than 1-minute rest." },
			{ source: "grgic2018rest", finding: "Systematic review of 23 studies: short rest (under 60 s) also builds strength, but trained people gain the most with rest over 2 minutes; for beginners 60–120 s is enough." },
			{ source: "grgic2017rest", finding: "Systematic review of 6 studies: short and long rest both build muscle; in trained people long rest seems slightly better." },
			{ source: "singer2024", finding: "Bayesian meta-analysis: rest longer than 60 s gave slightly more muscle; beyond 90 s no further difference was found." },
			{ source: "desalles2009", finding: "Earlier review: for maximal strength 3–5 minutes keep the performance in the next sets; for muscle growth it recommended short rest because of higher growth hormone – the newer studies above found longer rest slightly better." },
		],
		evidence: "research",
	},
	{
		id: "sleep_training",
		title: "Sleep and training",
		summary: "Too little sleep worsens performance, mainly in the afternoon and in compound strength exercises, and athletes who sleep little get injured and ill more often. Extending sleep is the intervention with the most benefit.",
		practical: "Aim for at least 7 hours and add sleep when your training load rises. After a short night, train earlier in the day and go easier on maximal attempts; a caffeine boost or training with others helps you keep up the effort.",
		studies: [
			{ source: "craven2022", finding: "Meta-analysis of 69 studies: sleep loss reduced performance by about 7.6 % on average; about 0.4 % less for every hour awake before exercise, mainly in the afternoon – morning tasks were largely unaffected." },
			{ source: "knowles2018", finding: "Review of 17 studies: one night without sleep barely changed strength, but several shortened nights reduced strength in compound exercises, not isolation ones." },
			{ source: "fullagar2015", finding: "Review: some maximal efforts hold up after sleep loss, sport-specific performance and thinking get worse; poor sleep shifts the nervous system in a similar way to overtraining." },
			{ source: "walsh2021", finding: "Expert consensus: regularly sleeping under 7 hours increases susceptibility to respiratory infections; sleep needs differ between people, so take your own into account." },
			{ source: "bonnar2018", finding: "Systematic review of 10 studies: of all sleep interventions, extending sleep had the most beneficial effect on performance." },
			{ source: "mah2011", finding: "Basketball players who extended their sleep for several weeks sprinted faster and shot more accurately." },
			{ source: "milewski2014", finding: "Adolescent athletes who slept less than 8 hours had more sports injuries." },
			{ source: "watson2015", finding: "Consensus: adults should regularly sleep at least 7 hours." },
		],
		evidence: "research",
	},
	{
		id: "concurrent",
		title: "Strength and endurance training together",
		summary: "Adding endurance training to strength training doesn't take away muscle or maximal strength in most people. Explosive strength and leg strength in already trained people can suffer, mainly when both are done in one session.",
		practical: "If both are in one session, lift first and run after. When strength is your priority, separate lifting and running by at least a few hours, ideally on different days; easy running interferes less than a lot of long or hard running.",
		studies: [
			{ source: "schumann2022", finding: "Meta-analysis of 43 studies: endurance training didn't reduce muscle growth or maximal strength; explosive strength gains were smaller, mainly when both were in one session." },
			{ source: "petre2021", finding: "Meta-analysis: leg strength (1RM) suffered with endurance training only in trained people, and only when both were in the same session." },
			{ source: "wilson2012", finding: "Earlier meta-analysis: running interfered with muscle growth and strength more than cycling, and the more frequent and longer the endurance training, the bigger the interference." },
			{ source: "eddens2018", finding: "Meta-analysis: strength first, then endurance in one session gave about 7 % more leg strength; muscle growth, aerobic capacity and fat didn't depend on the order." },
			{ source: "murlasits2018", finding: "Meta-analysis: strength before endurance in one session gave about 4 kg more in leg 1RM; aerobic capacity wasn't affected by the order." },
		],
		evidence: "research",
	},
	{
		id: "runners_strength",
		title: "Strength training for runners",
		summary: "Strength training two to three times a week improves running economy and race times without hurting body composition. Heavy lifting near maximal loads seems to work better than jumps alone. Increase running distance gradually.",
		practical: "Add 2–3 short strength sessions a week (heavy squats, deadlifts or lunges plus some jumps) for at least 8–10 weeks. Add mileage gradually – in beginners, big jumps in weekly distance (over 30 %) went with more overuse injuries, although the evidence is weak.",
		studies: [
			{ source: "blagrove2018", finding: "Systematic review: strength training mostly improved running economy (by 2–8 %), 1.5–10 km time trials and sprint speed; aerobic capacity and body composition were unaffected." },
			{ source: "llanoslagos2024", finding: "Meta-analysis: heavy and combined strength training improved running economy (more at higher speeds and in fitter runners); plyometrics helped only at slower speeds, submaximal and isometric training didn't." },
			{ source: "balsalobre2016", finding: "Meta-analysis in high-level runners: 8–12 weeks of strength training 2–3 times a week had a large positive effect on running economy." },
			{ source: "eihara2022", finding: "Meta-analysis: heavy lifting, especially at 90 % of 1RM or more, improved running economy and time trials more than plyometric training; longer programs (10–14 weeks) worked better." },
			{ source: "nielsen2014", finding: "Novice runners who increased their weekly distance by more than 30 % tended to have more overuse injuries (knee, shin, hip) than those who increased it by less than 10 %; the difference wasn't statistically significant." },
			{ source: "buist2008", finding: "Novice runners: a more gradual 13-week program didn't lead to fewer injuries than a standard 8-week one." },
		],
		evidence: "research",
	},
	{
		id: "maintaining",
		title: "Keeping muscle and strength during a break",
		summary: "Strength fades slowly and comes back quickly. With as little as one session a week, strength and muscle can be maintained for months, as long as the weight stays heavy. A few weeks off doesn't hurt long-term progress.",
		practical: "On vacation, during illness or busy periods, keep one or two short sessions a week with your usual weights, even with fewer sets. If you have to stop completely, a 2–3 week break isn't a problem – you'll catch up quickly.",
		studies: [
			{ source: "bickel2011", finding: "After 16 weeks of training, one-third of the volume kept the muscle in young people for 32 weeks (one-ninth too); older people needed more; strength stayed largely even with no training at all." },
			{ source: "spiering2021", finding: "Review: strength and muscle can be kept for up to 32 weeks with one session and one set per exercise a week, as long as the load stays heavy; older people may need 2 sessions with 2–3 sets." },
			{ source: "bosquet2013", finding: "Meta-analysis of 103 studies: stopping training reduces strength, the more the longer the break; older and less active people lose more." },
			{ source: "ogasawara2013", finding: "24 weeks: training with 3-week breaks after every 6 weeks built as much muscle and strength as training without breaks." },
			{ source: "psilander2019", finding: "After one-leg training and a long break the muscle returned to its starting size, but part of the strength gain stayed; renewed training wasn't faster in the previously trained leg." },
		],
		evidence: "research",
	},
	{
		id: "protein_intake",
		title: "Protein: how much and when",
		summary: "For muscle, what matters most is total daily protein; timing around the workout matters little once you get enough. Spreading it over several meals and a portion before bed are sensible extras.",
		practical: "Aim for about 1.6 g per kg of body weight a day (up to 2.2 g/kg), roughly 0.4 g/kg in each of four or more meals. A post-workout shake isn't essential; a protein-rich meal or casein before bed can help.",
		studies: [
			{ source: "schoenfeld2013timing", finding: "Meta-analysis of 23 studies: once total protein intake was taken into account, taking it right around the workout didn't improve muscle or strength; total intake was the strongest predictor of growth." },
			{ source: "morton2018", finding: "Meta-analysis: protein supplements added to training increased gains in muscle and strength; above about 1.6 g/kg a day there was little further benefit." },
			{ source: "schoenfeld2018meal", finding: "Review: for the most muscle building, about 0.4 g/kg per meal across at least four meals; with 2.2 g/kg a day up to about 0.55 g/kg per meal." },
			{ source: "trommelen2023", finding: "100 g of protein after a workout gave a larger and longer (over 12 hours) muscle-building response than 25 g – the body uses large portions better than was thought." },
			{ source: "snijders2015", finding: "12 weeks of training: protein before sleep added more strength and thigh muscle than a placebo drink." },
		],
		evidence: "research",
	},
	{
		id: "fat_loss",
		title: "Losing fat without losing muscle",
		summary: "In an energy deficit strength still improves, but muscle grows less – with a deficit of around 500 kcal a day muscle gain stops. A slower pace, strength training and plenty of protein protect muscle.",
		practical: "Keep lifting with heavy weights, eat about 1.6–2.4 g of protein per kg (more when you're lean) and aim for roughly 0.5–1 % of body weight a week. Avoid long, steep deficits.",
		studies: [
			{ source: "murphy2022", finding: "Meta-analysis: in an energy deficit, training still increased strength as usual, but gains in lean mass were smaller; a deficit of about 500 kcal a day prevented them." },
			{ source: "garthe2011", finding: "Elite athletes lost the same weight at 0.7 % or 1.4 % of body weight a week; the slower group gained lean mass (+2.1 %), the faster one didn't." },
			{ source: "longland2016", finding: "4 weeks with a large deficit and hard training: 2.4 g of protein per kg added lean mass (+1.2 kg) and removed more fat than 1.2 g/kg." },
			{ source: "helms2014protein", finding: "Systematic review: lean, strength-trained athletes in a deficit probably need 2.3–3.1 g of protein per kg of fat-free mass." },
			{ source: "sardeli2018", finding: "Meta-analysis in older people with obesity: adding strength training to a diet prevented about 94 % of the muscle loss, with the same weight and fat loss." },
		],
		evidence: "research",
	},
	{
		id: "steps_health",
		title: "Steps and health",
		summary: "More daily steps go with a lower risk of death and disease, with the biggest gains up to about 7000–10 000 steps. Walking pace adds little once the number of steps is accounted for.",
		practical: "If you walk little, every extra thousand steps counts; about 7000 steps a day is a realistic target, 8000–10 000 for younger people. The number of steps matters more than how fast you walk.",
		studies: [
			{ source: "paluch2022", finding: "Meta-analysis of 15 cohorts (47 471 adults): more steps meant progressively lower mortality, up to 6000–8000 steps a day in people over 60 and 8000–10 000 in younger people." },
			{ source: "ding2025", finding: "Meta-analysis: compared with 2000 steps, 7000 steps a day went with 47 % lower mortality and lower risk of heart disease, dementia, depressive symptoms and falls; 7000 may be a more realistic target than 10 000." },
			{ source: "banach2023", finding: "Meta-analysis of 17 cohorts: each extra 1000 steps a day went with 15 % lower mortality." },
			{ source: "saintmaurice2020", finding: "US adults: 8000 steps a day went with about half the mortality of 4000 steps; step intensity wasn't related to mortality once total steps were accounted for." },
			{ source: "paluch2021", finding: "Middle-aged adults: at least 7000 steps a day went with lower mortality; peak walking pace wasn't related to it." },
		],
		evidence: "research",
	},
	{
		id: "recovery_methods",
		title: "Recovery methods: cold, massage, foam rolling",
		summary: "Massage, compression garments and foam rolling slightly reduce soreness and help strength come back sooner. A regular ice bath after strength training reduces muscle and strength gains; after endurance training it doesn't seem to hurt.",
		practical: "After lifting, skip the regular ice bath – keep it for times when you need to recover quickly, for example between competition days. Massage, a foam roller or compression clothing are fine if they help you; sleep and food matter more.",
		studies: [
			{ source: "roberts2015", finding: "Strength training study: cold water after each workout led to smaller gains in muscle and strength than active cool-down; it also reduced the cellular signals for muscle growth." },
			{ source: "malta2021", finding: "Meta-analysis: regular cold-water immersion reduced strength gains from resistance training, but didn't change endurance gains." },
			{ source: "dupuy2018", finding: "Meta-analysis of 99 studies: massage reduced soreness and fatigue the most; active recovery, compression, immersion and cryotherapy helped less." },
			{ source: "wiewelhove2019", finding: "Meta-analysis: foam rolling had small effects – slightly better sprint and flexibility before exercise and less muscle pain after; effects on jumping and strength were negligible." },
			{ source: "brown2017", finding: "Meta-analysis: compression clothing helped recovery a little, most for strength 2–8 hours and over 24 hours after resistance training." },
		],
		evidence: "research",
	},
	{
		id: "warmup_stretching",
		title: "Warm-up and stretching",
		summary: "A warm-up improves performance. Long static stretching just before training slightly reduces strength, mainly when it's the only warm-up; stretching alone doesn't prevent injuries, strength training and structured warm-up programmes do.",
		practical: "Warm up with light movement and lighter sets of the first exercise. If you want to stretch before training, keep it short (under about 45–60 s per muscle) and follow it with dynamic movement; do longer stretching after training or separately.",
		studies: [
			{ source: "fradkin2010", finding: "Meta-analysis: a warm-up improved performance in 79 % of the measures studied; there was little evidence it harms." },
			{ source: "simic2013", finding: "Meta-analysis of 104 studies: static stretching on its own before exercise reduced strength by about 5 %; the effect was smallest with stretches of 45 s or less." },
			{ source: "behm2016", finding: "Review: static stretching of 60 s or more reduced performance by 4.6 %, shorter by 1.1 %; with dynamic activity afterwards there was no clear effect, and dynamic stretching improved performance slightly." },
			{ source: "lauersen2014", finding: "Meta-analysis of 25 trials: stretching didn't prevent injuries; strength training cut sports injuries to about a third, proprioception training to about half." },
			{ source: "thorborg2017", finding: "Meta-analysis: the FIFA 11+ warm-up programme reduced football injuries by 39 %." },
		],
		evidence: "research",
	},
	{
		id: "menstrual_cycle",
		title: "The menstrual cycle and training",
		summary: "Performance may be very slightly lower in the early follicular phase (the first days of a period), but the effect is trivial and the studies are of mixed quality. Planning strength training by cycle phase gave no extra muscle or strength.",
		practical: "Train by how you feel, not by the calendar: on days with worse symptoms adjust weights or volume, otherwise train as usual. You don't need a special cycle-based plan.",
		studies: [
			{ source: "mcnulty2020", finding: "Meta-analysis of 78 studies: performance was trivially lower in the early follicular phase than in other phases; with such a small effect and varied study quality, general cycle-based advice isn't justified." },
			{ source: "elliottsale2020", finding: "Meta-analysis of 42 studies: hormonal contraception might slightly lower performance on average compared with a natural cycle, but the effect is unlikely to be meaningful." },
			{ source: "colensosemple2023", finding: "Umbrella review: findings on strength and muscle growth by cycle phase vary a lot and many studies didn't verify the phase properly; it's premature to say the phase matters." },
			{ source: "dsouza2026", finding: "Randomized trial: training with more volume in the follicular or in the luteal phase gave the same muscle and strength as regular training; total training volume mattered, not the phase." },
		],
		evidence: "research",
	},
	{
		id: "hiit",
		title: "HIIT versus steady cardio",
		summary: "Interval training improves fitness (VO2max) more than steady cardio, especially in people with lifestyle diseases. For fat loss both work similarly; intervals take less time.",
		practical: "Pick what you'll stick to: 1–2 interval sessions a week for fitness, the rest easy. For fat loss what matters is the total amount of exercise and diet, not the form of cardio.",
		studies: [
			{ source: "milanovic2015", finding: "Meta-analysis: interval training improved VO2max more than continuous endurance training." },
			{ source: "weston2014", finding: "Meta-analysis in patients with lifestyle diseases: HIIT raised VO2peak almost twice as much as moderate continuous training (+9 %)." },
			{ source: "wewege2017", finding: "Meta-analysis in overweight adults: HIIT and steady training reduced fat and waist circumference equally; HIIT took about 40 % less time." },
			{ source: "keating2017", finding: "Meta-analysis of 31 studies: intervals and steady training reduced body fat similarly; shorter interval protocols with lower energy expenditure tended to be slightly worse." },
			{ source: "viana2019", finding: "Meta-analysis: body fat percentage fell similarly; interval training reduced absolute fat mass by about 2.3 kg more, sprint intervals the most." },
		],
		evidence: "research",
	},
	{
		id: "pain_training",
		title: "Training with pain: tendons and the lower back",
		summary: "With tendon problems and chronic lower back pain, exercise is a mainstay of treatment and full rest isn't usually needed. Mild pain during rehabilitation exercise didn't worsen outcomes.",
		practical: "Have pain assessed by a physiotherapist or doctor, especially at 4/10 or more or when it lasts over a week. Within an agreed plan keep moving with a load the pain tolerates and increase it gradually; stop if pain rises sharply or lasts into the next day.",
		studies: [
			{ source: "silbernagel2007", finding: "Achilles tendinopathy: patients who kept running and jumping, guided by a pain-monitoring model, recovered as well over 12 months as those who rested from them." },
			{ source: "silbernagel2011", finding: "5-year follow-up: 80 % of patients with Achilles tendinopathy recovered fully with exercise alone." },
			{ source: "hayden2021", finding: "Cochrane review of 249 trials: exercise reduced chronic low back pain more than no treatment or usual care, by a clinically important amount (moderate certainty)." },
			{ source: "smith2017pain", finding: "Meta-analysis: in chronic musculoskeletal pain, exercises allowed to be painful brought slightly more short-term pain relief than pain-free ones; in the long term they were similar." },
			{ source: "malliaras2013", finding: "Review: eccentric exercise alone wasn't clearly better than other loading programmes; for the patellar tendon heavy slow resistance had the most evidence." },
			{ source: "lim2018", finding: "Review of 15 studies of the patellar tendon: isometric holds had the strongest recommendation for pain during the competitive season, eccentric exercises the next strongest." },
		],
		evidence: "research",
	},
	{
		id: "flexibility",
		title: "Flexibility: stretching or strength training",
		summary: "Strength training through a full range of motion improves flexibility about as much as stretching. If you want maximal range, regular static stretching works; long stretching also adds a little strength and muscle.",
		practical: "If you lift through the full range, you don't need extra stretching for flexibility. For a specific goal (splits, deep squat) add static stretching several times a week; how long or hard you stretch matters less than doing it regularly.",
		studies: [
			{ source: "alizadeh2023", finding: "Meta-analysis: strength training with external load improved range of motion as much as stretching (bodyweight-only training didn't); untrained people gained the most." },
			{ source: "afonso2021", finding: "Meta-analysis of 11 trials: strength training and stretching didn't differ in range-of-motion gains." },
			{ source: "konrad2024", finding: "Meta-analysis: stretch training increased range of motion moderately; PNF and static stretching worked better than dynamic, and volume, intensity and frequency didn't seem to matter." },
			{ source: "morton2011", finding: "5 weeks: full-range strength training improved hamstring and hip flexibility as much as static stretching." },
			{ source: "warneke2024", finding: "Meta-analysis of 42 studies: long-term static stretching slightly increased strength and muscle size, more with longer durations and higher frequency – still much less than strength training." },
		],
		evidence: "research",
	},
	{
		id: "alcohol",
		title: "Alcohol and recovery",
		summary: "A large amount of alcohol after training reduces muscle protein synthesis and can slow strength recovery, even when you also eat protein. Smaller amounts had little measurable effect in studies.",
		practical: "If you drink, keep it moderate and not right after a hard workout, especially when you train again within a day or two. Eat and drink water first; avoid alcohol entirely when recovering from an injury.",
		studies: [
			{ source: "parr2014", finding: "A large dose of alcohol after training reduced muscle protein synthesis by 24–37 %, even when protein was eaten with it." },
			{ source: "barnes2010", finding: "A moderate amount of alcohol after hard eccentric exercise deepened the drop in leg strength over the next 36–60 hours." },
			{ source: "mcleay2017", finding: "In women, alcohol (0.88 g per kg of body weight) after eccentric exercise didn't measurably change strength recovery or soreness." },
			{ source: "lakicevic2019", finding: "Systematic review of 12 studies: alcohol after resistance training mostly didn't change strength, power, soreness or most blood markers; cortisol was an exception." },
			{ source: "barnes2014", finding: "Review: the effect depends on dose, timing and how soon you train again; amounts often drunk by athletes can impair recovery from muscle injury." },
		],
		evidence: "research",
	},
	{
		id: "training_load",
		title: "Training load and injury risk",
		summary: "Sudden jumps in load are linked to more injuries, while gradually built high load improves fitness. The popular acute:chronic workload ratio (ACWR) is disputed: studies use different methods and it predicts individual injuries poorly.",
		practical: "Increase load gradually, especially after a break or illness. Take the plugin's warning about a load jump as a reason to check how you feel and maybe hold back, not as a prediction of injury.",
		studies: [
			{ source: "gabbett2016", finding: "Review in team sports: gradually built high training loads improve fitness, which may protect against injury; the author proposed the acute:chronic ratio to catch sudden jumps." },
			{ source: "andrade2020", finding: "Systematic review of 20 studies: most found higher injury risk with a higher ACWR, but the ways of calculating it differed so much that results are hard to compare." },
			{ source: "maupin2020", finding: "Review of 27 studies: ratios of about 0.8–1.3 tended to carry the lowest risk, but the studies were of moderate quality and varied a lot." },
			{ source: "impellizzeri2021", finding: "Reanalysis of data: dividing the recent load by made-up or random 'chronic' loads gave a similar 'risk' as the real ratio, and neither predicted injuries meaningfully; the authors recommend dropping the ACWR." },
			{ source: "frandsen2025", finding: "Cohort of 5,205 runners: injuries became more frequent when a single run was more than 10 % longer than the longest run of the previous 30 days; a higher ACWR or week-to-week increase wasn't linked to more injuries." },
		],
		evidence: "research",
	},
	{
		id: "strength_health",
		title: "Strength training and health",
		summary: "Regular strength training is linked to a lower risk of death and chronic diseases, with most of the benefit at about 30–60 minutes a week. In older age it maintains strength, function and independence, and even a small amount helps.",
		practical: "Even 30–60 minutes of strength training a week counts; combine it with aerobic activity. It's never too late to start – in older age begin with a low volume and add gradually.",
		studies: [
			{ source: "momma2022", finding: "Meta-analysis of 16 cohort studies: muscle-strengthening activities were linked to a 10–17 % lower risk of death, heart disease, cancer and diabetes; the largest reduction was at about 30–60 minutes a week, and combining them with aerobic activity was linked to lower mortality still." },
			{ source: "fragala2019", finding: "NSCA position statement: resistance training is recommended for older adults to counter the loss of strength and muscle and to keep function and independence, including in frailty and chronic conditions." },
			{ source: "radaelli2025", finding: "Network meta-analysis of 151 trials in older adults: even a low training volume improved physical function, lean mass and muscle size; moderate and high volumes were best for leg strength." },
			{ source: "kashi2023", finding: "Meta-analysis of 21 studies in people over 60: resistance training improved strength, physical functioning and mental health and reduced depression." },
		],
		evidence: "research",
	},
	{
		id: "hydration",
		title: "Hydration and performance",
		summary: "A small fluid loss during exercise rarely matters. Larger losses lower muscle endurance, strength and concentration, mostly once you lose more than about 2–3 % of body weight. In endurance exercise, drinking to thirst worked well.",
		practical: "Don't start training dehydrated and drink to thirst during it. On long or hot sessions weigh yourself before and after and keep the loss below about 2 % of body weight.",
		studies: [
			{ source: "goulet2011", finding: "Meta-analysis of cycling time trials: losing up to about 4 % of body weight through sweat didn't impair performance compared with staying fully hydrated; drinking to thirst was better than drinking less." },
			{ source: "savoie2015", finding: "Meta-analysis of 28 studies: dehydration reduced muscle endurance by about 8 %, strength by about 5.5 % and anaerobic power by about 6 %; jump height wasn't affected." },
			{ source: "wittbrodt2018", finding: "Meta-analysis: dehydration slightly impaired attention, decision-making and coordination, more so with a loss above 2 % of body weight." },
			{ source: "deshayes2022", finding: "Meta-analysis of endurance exercise: perceived exertion rose by about 0.2 points per 1 % of body weight lost, which is unlikely to matter until a loss of at least 3 %." },
		],
		evidence: "research",
	},
	{
		id: "training_time",
		title: "Morning or evening training",
		summary: "Strength and endurance tend to be higher later in the day, but long-term gains in muscle, strength and health were similar whatever the time of day. Training in the morning raises morning strength.",
		practical: "Train when it suits you and you can keep it up. If you compete at a set time, train at that time too. Compare heart rate and performance with workouts from a similar time of day.",
		studies: [
			{ source: "grgic2019tod", finding: "Meta-analysis: people are stronger in the evening, but morning and evening training produced the same gains in strength and muscle size; morning training brought morning strength up to evening levels." },
			{ source: "kang2023", finding: "Meta-analysis: endurance performance was higher in the afternoon or evening than in the morning, and heart rate during exercise was higher too." },
			{ source: "sevillalorente2023", finding: "Meta-analysis: the effect of exercise on blood pressure and blood sugar didn't differ between morning and evening." },
			{ source: "wang2026", finding: "Meta-analysis: body composition and blood fats changed equally with morning and afternoon training; blood sugar markers differed only slightly (morning lowered HbA1c more in type 2 diabetes, afternoon lowered fasting glucose more)." },
		],
		evidence: "research",
	},
	{
		id: "running_injuries",
		title: "Running injuries: load, cadence and shoes",
		summary: "The strongest risk factor is a previous injury. A single run much longer than usual raises risk, while the type of running shoe makes little proven difference. A slightly higher cadence reduces load on the knee.",
		practical: "Don't make a single run more than about 10 % longer than your longest run in the past month. Choose shoes that feel comfortable. With knee pain, a slightly higher cadence may help – and have pain at 4/10 or more or lasting over a week checked by a professional.",
		studies: [
			{ source: "frandsen2025", finding: "Cohort of 5,205 runners: injuries became more frequent when a single run was more than 10 % longer than the longest run of the previous 30 days; a higher ACWR or week-to-week increase wasn't linked to more injuries." },
			{ source: "vanpoppel2021", finding: "Systematic review of 29 studies: a previous running injury was the strongest risk factor in long-distance runners; in short-distance runners higher BMI, older age, male sex and no running experience also raised risk." },
			{ source: "relph2022", finding: "Cochrane review of 12 trials with 11,240 runners: neither cushioned, minimalist nor motion-control shoes clearly prevented injuries, and choosing shoes by foot posture didn't help." },
			{ source: "anderson2022", finding: "Meta-analysis: a higher step rate (cadence) reduced knee bending, braking and load on the knee joint; very limited evidence suggested less pain in runners with knee pain, but running felt more effortful at first." },
			{ source: "doyle2022", finding: "Meta-analysis of 19 trials: step-rate retraining raised cadence and lowered the impact loading rate (moderate certainty); two trials found fewer injuries a year after running-technique retraining." },
			{ source: "alexander2022", finding: "Review of 30 trials: retraining to land more softly reduced knee injuries in one trial; footwear, exercise programmes and graduated running plans didn't change knee injury risk (low certainty)." },
		],
		evidence: "research",
	},
];

/** Téma → id cviků z knihovny (src/seed/exerciseData.ts), u kterých se zobrazí. */
export const EXERCISE_TOPICS: Record<string, string[]> = {
	squat: ["back-squat", "front-squat", "bodyweight-squat", "goblet-squat", "bulgarian-split-squat", "pistol-squat"],
	deadlift: ["deadlift", "romanian-deadlift", "sumo-deadlift", "kettlebell-deadlift"],
	push: ["bench-press", "incline-bench-press", "dumbbell-bench-press", "push-up", "knee-push-up", "incline-push-up", "decline-push-up", "diamond-push-up", "wide-push-up", "archer-push-up", "one-arm-push-up"],
	pull: ["pull-up", "chin-up", "wide-grip-pull-up", "negative-pull-up", "band-assisted-pull-up", "chest-to-bar-pull-up", "inverted-row", "lat-pulldown"],
	glutes: ["hip-thrust", "glute-bridge"],
	kettlebell: ["kettlebell-swing", "one-arm-kettlebell-swing", "kettlebell-clean", "kettlebell-snatch", "turkish-get-up"],
	range_of_motion: ["overhead-triceps-extension", "triceps-pushdown", "skull-crusher", "leg-curl", "leg-extension", "calf-raise", "seated-calf-raise", "single-leg-calf-raise", "leg-press-calf-raise", "biceps-curl", "incline-dumbbell-curl", "preacher-curl", "lat-pulldown"],
	core: ["sit-up", "crunch", "plank", "side-plank", "hollow-hold", "v-up", "hanging-leg-raise", "hanging-knee-raise"],
};

/** Id předpřipravených programů (src/seed/programData.ts) a jejich témata. */
export const PROGRAM_TOPICS: Record<string, string[]> = {
	"basic-4": ["frequency_programs", "training", "strength_health"],
	"push-ups-and-pull-ups-6-weeks": ["frequency_programs", "push", "pull"],
	"zero-to-your-first-pull-up": ["pull", "frequency_programs"],
	"couch-to-5k": ["novice_running", "runners_strength", "running_injuries"],
	"100-push-ups-a-day": ["frequency_programs", "push"],
	"grease-the-groove": ["frequency_programs"],
	"daily-kettlebell": ["kettlebell"],
	"deload-week": ["deload", "maintaining"],
};

/** Téma v jazyce rozhraní (studie ve stejném pořadí). */
function localize(topic: ResearchTopic): ResearchTopic {
	const local = contentOf(getLanguage())?.research[topic.id];
	if (!local) return topic;
	return { ...topic, title: local.title, summary: local.summary, practical: local.practical, studies: topic.studies.map((s, i) => ({ ...s, finding: local.studies[i] ?? s.finding })) };
}

export function researchTopic(id: string): ResearchTopic | undefined {
	const topic = RESEARCH_TOPICS.find((x) => x.id === id);
	return topic && localize(topic);
}

/** Témata ke cviku (název v kterémkoli jazyce): konkrétní téma a u silových cviků i obecné principy tréninku a techniky. */
export function topicsForExercise(name: string, category: string): ResearchTopic[] {
	const id = exerciseId(name);
	const ids = Object.entries(EXERCISE_TOPICS)
		.filter(([, exercises]) => id !== undefined && exercises.includes(id))
		.map(([topic]) => topic);
	if (category === "strength" || category === "calisthenics" || category === "kettlebell") ids.push("training");
	if (category === "strength" || category === "calisthenics") ids.push("technique", "rest_intervals");
	if (category === "mobility") ids.push("warmup_stretching", "flexibility");
	return [...new Set(ids)].map(researchTopic).filter((t): t is ResearchTopic => t !== undefined);
}

/** Témata k programu (název v kterémkoli jazyce). */
export function topicsForProgram(name: string): ResearchTopic[] {
	const id = builtinId("program", name);
	return ((id && PROGRAM_TOPICS[id]) || []).map(researchTopic).filter((t): t is ResearchTopic => t !== undefined);
}
