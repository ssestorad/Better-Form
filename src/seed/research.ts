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
		practical: "Train each muscle group at least twice a week, ending sets 0–3 reps short of failure (RIR); you don't have to go to failure. Lighter and heavier weights both build muscle; for maximal strength you also need heavy sets.",
		studies: [
			{ source: "schoenfeld2017", finding: "Meta-analysis: each additional weekly set increases muscle growth; 10 or more sets a week led to more growth than fewer than 5." },
			{ source: "schoenfeld2016freq", finding: "Meta-analysis: training a muscle group at least twice a week led to more growth than once a week." },
			{ source: "grgic2018freq", finding: "Meta-analysis: higher frequency increases strength, but with the same weekly volume its effect is not significant." },
			{ source: "refalo2023", finding: "Meta-analysis: training to failure isn't necessary for muscle growth; sets close to failure are enough." },
			{ source: "schoenfeld2017load", finding: "Meta-analysis: light and heavy weights produced similar muscle growth; heavy weights produced more maximal strength." },
			{ source: "hamarsland2021", finding: "Controlled trial in trained people: the same volume spread over different numbers of sessions per week led to similar gains in muscle and strength." },
			{ source: "pelland2025", finding: "Meta-regression: muscle and strength increase with higher weekly volume, but the gains gradually diminish; with the same volume frequency has a smaller effect." },
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
];

/** Téma → id cviků z knihovny (src/seed/exerciseData.ts), u kterých se zobrazí. */
export const EXERCISE_TOPICS: Record<string, string[]> = {
	squat: ["back-squat", "front-squat", "bodyweight-squat", "goblet-squat", "bulgarian-split-squat", "pistol-squat"],
	deadlift: ["deadlift", "romanian-deadlift", "sumo-deadlift", "kettlebell-deadlift"],
	push: ["bench-press", "incline-bench-press", "dumbbell-bench-press", "push-up", "knee-push-up", "incline-push-up", "decline-push-up", "diamond-push-up", "wide-push-up", "archer-push-up", "one-arm-push-up"],
	pull: ["pull-up", "chin-up", "wide-grip-pull-up", "negative-pull-up", "band-assisted-pull-up", "chest-to-bar-pull-up", "inverted-row", "lat-pulldown"],
	glutes: ["hip-thrust", "glute-bridge"],
	kettlebell: ["kettlebell-swing", "one-arm-kettlebell-swing", "kettlebell-clean", "kettlebell-snatch", "turkish-get-up"],
	core: ["sit-up", "crunch", "plank", "side-plank", "hollow-hold", "v-up", "hanging-leg-raise", "hanging-knee-raise"],
};

/** Id předpřipravených programů (src/seed/programData.ts) a jejich témata. */
export const PROGRAM_TOPICS: Record<string, string[]> = {
	"basic-4": ["frequency_programs", "training"],
	"push-ups-and-pull-ups-6-weeks": ["frequency_programs", "push", "pull"],
	"zero-to-your-first-pull-up": ["pull", "frequency_programs"],
	"couch-to-5k": ["novice_running"],
	"100-push-ups-a-day": ["frequency_programs", "push"],
	"grease-the-groove": ["frequency_programs"],
	"daily-kettlebell": ["kettlebell"],
	"deload-week": ["deload"],
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

/** Témata ke cviku (název v kterémkoli jazyce): konkrétní téma a u silových cviků i obecné principy tréninku. */
export function topicsForExercise(name: string, category: string): ResearchTopic[] {
	const id = exerciseId(name);
	const ids = Object.entries(EXERCISE_TOPICS)
		.filter(([, exercises]) => id !== undefined && exercises.includes(id))
		.map(([topic]) => topic);
	if (category === "strength" || category === "calisthenics" || category === "kettlebell") ids.push("training");
	return [...new Set(ids)].map(researchTopic).filter((t): t is ResearchTopic => t !== undefined);
}

/** Témata k programu (název v kterémkoli jazyce). */
export function topicsForProgram(name: string): ResearchTopic[] {
	const id = builtinId("program", name);
	return ((id && PROGRAM_TOPICS[id]) || []).map(researchTopic).filter((t): t is ResearchTopic => t !== undefined);
}
