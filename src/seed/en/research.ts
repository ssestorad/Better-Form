// Anglická verze „Co říká výzkum“: klíč = id tématu, `studies` ve stejném pořadí jako v src/seed/research.ts.

export interface ResearchEn {
	title: string;
	summary: string;
	practical: string;
	studies: string[];
}

export const RESEARCH_EN: Record<string, ResearchEn> = {
	training: {
		title: "Volume, frequency and proximity to failure",
		summary: "For muscle growth what matters most is weekly volume (at least around 10 sets per muscle group) and sets close to failure. Frequency and load matter less when volume is the same.",
		practical: "Train each muscle group at least twice a week, ending sets 0–3 reps short of failure (RIR); you don't have to go to failure. Lighter and heavier weights both build muscle; for maximal strength you also need heavy sets.",
		studies: [
			"Meta-analysis: each additional weekly set increases muscle growth; 10 or more sets a week led to more growth than fewer than 5.",
			"Meta-analysis: training a muscle group at least twice a week led to more growth than once a week.",
			"Meta-analysis: higher frequency increases strength, but with the same weekly volume its effect is not significant.",
			"Meta-analysis: training to failure isn't necessary for muscle growth; sets close to failure are enough.",
			"Meta-analysis: light and heavy weights produced similar muscle growth; heavy weights produced more maximal strength.",
			"Controlled trial in trained people: the same volume spread over different numbers of sessions per week led to similar gains in muscle and strength.",
			"Meta-regression: muscle and strength increase with higher weekly volume, but the gains gradually diminish; with the same volume frequency has a smaller effect.",
		],
	},
	squat: {
		title: "The squat and squat depth",
		summary: "A deep squat builds more glutes and adductors than a shallow one. With correct technique, depth in itself isn't a risk for the knees.",
		practical: "Squat to the depth you can manage with a neutral back and knees tracking over your toes. Increase depth and weight gradually.",
		studies: [
			"Controlled trial: the deep squat enlarged the glutes and adductors more than the half squat; the front of the thighs grew similarly.",
			"Controlled trial: a heavy deep squat increased thigh muscle cross-section more than a shallow one.",
			"Biomechanics review: with correct technique the deep squat doesn't overload healthy knees more than a shallow one; shallow squats with heavy weight may actually increase the load.",
			"Review: describes knee and hip loading in different phases of the squat and technique principles.",
			"MRI study: with squat depth under heavy load, lumbar disc loading increases – adjust depth to your technique and mobility.",
		],
	},
	deadlift: {
		title: "The deadlift and its variations",
		summary: "The variations differ in how they distribute the load: the trap bar loads the knees more and the back less, the sumo loads the front of the thighs more. Choose by goal and comfort.",
		practical: "If the conventional deadlift hurts your back, try the trap bar or sumo. The heaviest sets above roughly 90 % of max increase upper-back flexion – save them for tests.",
		studies: [
			"Biomechanics: with the trap bar, less lower-back loading and more knee involvement, with higher force and power at the same relative load.",
			"EMG: the sumo uses the front of the thighs more, the conventional deadlift the calves more; overall activation is similar.",
			"Systematic review of EMG: deadlift variations differ in their pattern of muscle activation; growth can't be inferred from activation alone.",
			"Controlled trial: the hip thrust and the squat led to similar glute growth and improved the deadlift similarly.",
		],
	},
	push: {
		title: "Bench press and push-ups",
		summary: "At a similar difficulty, push-ups give similar gains in strength and muscle as the bench press. A push-up lifts about 64 % of body weight.",
		practical: "If you don't have a barbell, push-ups are enough – just make them harder (feet raised, added weight, a band, slower tempo) so your sets stay close to failure.",
		studies: [
			"Controlled trial: the bench press and push-ups with the same muscle activity led to similar strength improvements.",
			"Controlled trial: a light bench press and push-ups produced similar muscle growth and strength.",
			"Controlled trial: progressively harder push-ups increased strength and muscle thickness similarly to the bench press.",
			"Biomechanics: a push-up lifts about 64 % of body weight; variations range roughly from 41 to 75 %.",
			"Cohort study in firefighters: 40 or more push-ups was associated with a lower risk of cardiovascular events – an association, not a cause.",
		],
	},
	pull: {
		title: "Pull-ups and rows",
		summary: "An overhand grip uses the lats and lower traps more, an underhand grip the biceps more. The lat pulldown is a good substitute and a path to the first pull-up.",
		practical: "Alternate overhand and underhand grips. Until you can do a pull-up, build up with rows, negatives and lat pulldowns.",
		studies: [
			"EMG: the underhand pull-up used the biceps and chest more, the overhand one the lower traps; the lats worked similarly.",
			"EMG: different grips and widths change muscle activation only a little.",
			"EMG in the lat pulldown: an overhand grip activated the lats more than an underhand grip; grip width made no difference.",
			"EMG: the kneeling lat pulldown was the closest to a pull-up in activation.",
		],
	},
	glutes: {
		title: "Hip thrust and glutes",
		summary: "The hip thrust activates the glutes more than the squat, but glute growth is similar with both exercises.",
		practical: "For the glutes, both the squat and the hip thrust work – choose the exercise that suits you and watch your weekly volume.",
		studies: [
			"EMG: the hip thrust activated the gluteus maximus more than the squat.",
			"Controlled trial: the hip thrust and the squat led to similar glute growth.",
			"Controlled trial in trained women: the squat gave similar or greater gains in strength and muscle than the hip thrust.",
			"Controlled trial: the deep squat enlarged the glutes more than the half squat.",
		],
	},
	kettlebell: {
		title: "Kettlebell",
		summary: "Swings improve strength and explosiveness; as cardio only partly – the heart rate goes high, oxygen uptake less so. For maximal strength and jumping, barbells are better.",
		practical: "The kettlebell is a good supplement for explosiveness, conditioning and the back. For maximal strength combine it with heavy barbell exercises.",
		studies: [
			"Controlled trial: six weeks of swings improved maximal and explosive strength.",
			"Study: 12 minutes of swings raised the heart rate more than oxygen uptake would suggest – only partly cardio.",
			"Controlled trial: barbell training (weightlifting) improved the squat and clean more than kettlebells; the jump improved similarly.",
			"Controlled trial in workers: kettlebell training reduced neck, shoulder and lower back pain.",
			"Review of practical use: kettlebells have a place in rehabilitation and conditioning; good-quality studies are few.",
		],
	},
	core: {
		title: "Abs, sit-ups and the core",
		summary: "In a large study of soldiers, replacing sit-ups with core exercises didn't change the injury rate, and soldiers doing core exercises did slightly better on the sit-up test. Back pain was prevented by brief education, not core training.",
		practical: "For a sit-up test you can also train core exercises (plank, side plank, crunches). The crunch loads the lumbar spine much less than the sit-up.",
		studies: [
			"Controlled trial in 3,900 soldiers: the core exercise group improved the sit-up test slightly more than the sit-up group.",
			"Controlled trial: the injury rate didn't differ between groups.",
			"Controlled trial: back pain was reduced by brief pain education, not core stabilization.",
			"Biomechanics: the crunch loads the lumbar spine much less than the sit-up; the side plank works the obliques without much pressure on the spine.",
			"EMG: some exercises on a ball use the abs more than classic crunches.",
			"Review: core training as injury prevention has mixed and limited evidence.",
		],
	},
	frequency_programs: {
		title: "Frequent practice of one exercise (challenges, grease the groove)",
		summary: "More frequent training works if the total volume makes sense and there's time to recover; frequency itself matters less than volume. The specific methods “grease the groove” and “100 push-ups a day” have no peer-reviewed study of their own.",
		practical: "With daily challenges, watch fatigue and pain; if they get worse, back off. What counts is the total of quality sets per week.",
		studies: [
			"Meta-analysis: frequency increases strength mainly by increasing volume; with the same volume the difference is small.",
			"Meta-analysis: at least two sessions per muscle group a week are better than one.",
			"Controlled trial: the same volume over different numbers of sessions gave similar results.",
			"Controlled trial: progressively harder push-ups increased strength and muscle thickness.",
		],
	},
	novice_running: {
		title: "Beginner runners",
		summary: "Beginners have the highest injury risk. Increasing slowly and getting enough rest are sensible, but the “10 % rule” on its own didn't reduce injuries.",
		practical: "Alternate running and walking, run 3× a week with a day off in between, and slow down or skip a run when something hurts.",
		studies: [
			"Controlled trial: a more gradual plan (10 % a week) didn't reduce the number of injuries in beginner runners.",
			"Meta-analysis: beginner runners have the most injuries per 1000 hours of running.",
			"Controlled trial (741 beginners): an online tool with injury prevention advice didn't reduce their number.",
			"Public NHS plan: 9 weeks, three sessions a week, alternating running and walking up to 30 minutes of running.",
		],
	},
	intensity: {
		title: "80/20 running and intervals",
		summary: "Most of the time at low intensity and a smaller part in hard efforts is a proven distribution. Polarized training is better only for VO2max, mainly in elite athletes; otherwise the results are similar.",
		practical: "Run about 80 % of your time easy (zones 1–2) and the rest as intervals or tempo. Intervals are effective for VO2max, but don't overdo them.",
		studies: [
			"Review: the most successful endurance athletes spend roughly 80 % of their training at low intensity.",
			"Controlled trial: polarized training improved key endurance markers more than other models.",
			"Meta-analysis: a small and uncertain difference in favor of polarized over threshold training in trained people.",
			"Meta-analysis: polarized training is better only for VO2peak, mainly in shorter programs and elite athletes; time trials were similar.",
			"Meta-analysis: interval training improved VO2max more than continuous endurance training.",
		],
	},
	hrv_training: {
		title: "HRV-guided training",
		summary: "Training adjusted to morning HRV is at least as effective as a fixed plan, often with fewer hard sessions. The benefit is small.",
		practical: "When your HRV is below your baseline, take an easier day; within the baseline, train as planned. Measure the same way every morning.",
		studies: [
			"Controlled trial: the HRV-guided group improved maximal performance more than the fixed-plan group.",
			"Controlled trial in recreational runners: HRV-guided training improved endurance similarly or slightly more, with fewer high-intensity sessions.",
			"Controlled trial in cyclists: HRV-guided training improved performance more than a traditional plan.",
			"Meta-analysis: HRV-guided training brings small improvements in some physiological markers compared with a fixed plan.",
			"Meta-analysis (wearable measurement): small positive effects on submaximal markers, no clear difference in performance.",
		],
	},
	deload: {
		title: "Periodization and the deload week",
		summary: "Periodization helps maximal strength slightly; for muscle growth at the same volume it's similar to training without it. The deload week is common practice with consensus among coaches; studies are few.",
		practical: "Roughly every 4–8 weeks, or when fatigued, take a week with lower volume and intensity. Your muscles won't disappear in a week.",
		studies: [
			"Meta-analysis: periodized training increased maximal strength more than non-periodized training.",
			"Meta-analysis at equal volume: periodization helped strength slightly and had no effect on muscle growth.",
			"Systematic review: similar muscle growth with and without periodization.",
			"Delphi consensus of coaches and scientists: a deload = a period of reduced training load, usually a week, for fatigue and to prevent stagnation.",
			"Controlled trial: a week off in the middle of a nine-week program didn't harm muscle growth; for lower-body strength it may have reduced the gain slightly.",
		],
	},
};
