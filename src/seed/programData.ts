// Předpřipravené programy (SPEC 5.7) a šablony tréninků: anglický zdroj, překlady názvů a popisů
// v src/locales/<kód>/programs.ts (klíč = id). Programy se zakládají jako neaktivní; štítek programu
// = nejslabší štítek jeho částí. Doporučení v popisech odkazují jen na zdroje z katalogu.
// Couch to 5K podle plánu NHS (nhs.uk, ověřeno 30. 9. 2026): trénink začíná a končí 5 min chůze.

import { SCHEMA_VERSION } from "../model/constants";
import type { ProgramNote, TemplateNote, WeekSchedule } from "../model/types";

export interface ProgramData {
	id: string;
	note: ProgramNote;
	/** Popis do těla poznámky (jen při založení, pak patří uživateli). */
	description: string;
}

export interface TemplateData {
	id: string;
	note: TemplateNote;
}

function program(fields: Omit<ProgramNote, "forma" | "schema" | "builtin" | "active">): ProgramNote {
	return { forma: "program", schema: SCHEMA_VERSION, builtin: true, active: false, ...fields };
}

function template(fields: Omit<TemplateNote, "forma" | "schema">): TemplateNote {
	return { forma: "template", schema: SCHEMA_VERSION, ...fields };
}

export const COUCH_TO_5K_SCHEDULE: WeekSchedule[] = [
	{
		week: 1,
		target: {
			kind: "intervals",
			warmup_s: 300,
			steps: [
				{ repeats: 7, work_s: 60, rest_s: 90 },
				{ repeats: 1, work_s: 60 },
			],
			cooldown_s: 300,
		},
	},
	{
		week: 2,
		target: {
			kind: "intervals",
			warmup_s: 300,
			steps: [
				{ repeats: 5, work_s: 90, rest_s: 120 },
				{ repeats: 1, work_s: 90 },
			],
			cooldown_s: 300,
		},
	},
	{
		week: 3,
		target: {
			kind: "intervals",
			warmup_s: 300,
			steps: [
				{ repeats: 1, work_s: 90, rest_s: 90 },
				{ repeats: 1, work_s: 180, rest_s: 180 },
				{ repeats: 1, work_s: 90, rest_s: 90 },
				{ repeats: 1, work_s: 180 },
			],
			cooldown_s: 300,
		},
	},
	{
		week: 4,
		target: {
			kind: "intervals",
			warmup_s: 300,
			steps: [
				{ repeats: 1, work_s: 180, rest_s: 90 },
				{ repeats: 1, work_s: 300, rest_s: 150 },
				{ repeats: 1, work_s: 180, rest_s: 90 },
				{ repeats: 1, work_s: 300 },
			],
			cooldown_s: 300,
		},
	},
	{
		week: 5,
		sessions: [
			{
				kind: "intervals",
				warmup_s: 300,
				steps: [
					{ repeats: 2, work_s: 300, rest_s: 180 },
					{ repeats: 1, work_s: 300 },
				],
				cooldown_s: 300,
			},
			{
				kind: "intervals",
				warmup_s: 300,
				steps: [
					{ repeats: 1, work_s: 480, rest_s: 300 },
					{ repeats: 1, work_s: 480 },
				],
				cooldown_s: 300,
			},
			{
				kind: "intervals",
				warmup_s: 300,
				steps: [
					{ repeats: 1, work_s: 1200 },
				],
				cooldown_s: 300,
			},
		],
	},
	{
		week: 6,
		sessions: [
			{
				kind: "intervals",
				warmup_s: 300,
				steps: [
					{ repeats: 1, work_s: 300, rest_s: 180 },
					{ repeats: 1, work_s: 480, rest_s: 180 },
					{ repeats: 1, work_s: 300 },
				],
				cooldown_s: 300,
			},
			{
				kind: "intervals",
				warmup_s: 300,
				steps: [
					{ repeats: 1, work_s: 600, rest_s: 180 },
					{ repeats: 1, work_s: 600 },
				],
				cooldown_s: 300,
			},
			{
				kind: "intervals",
				warmup_s: 300,
				steps: [
					{ repeats: 1, work_s: 1500 },
				],
				cooldown_s: 300,
			},
		],
	},
	{
		week: 7,
		target: {
			kind: "intervals",
			warmup_s: 300,
			steps: [
				{ repeats: 1, work_s: 1500 },
			],
			cooldown_s: 300,
		},
	},
	{
		week: 8,
		target: {
			kind: "intervals",
			warmup_s: 300,
			steps: [
				{ repeats: 1, work_s: 1680 },
			],
			cooldown_s: 300,
		},
	},
	{
		week: 9,
		target: {
			kind: "intervals",
			warmup_s: 300,
			steps: [
				{ repeats: 1, work_s: 1800 },
			],
			cooldown_s: 300,
		},
	},
];

export const ROPE_START: WeekSchedule[] = [
	{
		week: 1,
		target: {
			kind: "intervals",
			steps: [
				{ repeats: 8, work_s: 20, rest_s: 40 },
			],
		},
	},
	{
		week: 2,
		target: {
			kind: "intervals",
			steps: [
				{ repeats: 10, work_s: 30, rest_s: 30 },
			],
		},
	},
	{
		week: 3,
		target: {
			kind: "intervals",
			steps: [
				{ repeats: 10, work_s: 40, rest_s: 20 },
			],
		},
	},
	{
		week: 4,
		target: {
			kind: "intervals",
			steps: [
				{ repeats: 8, work_s: 60, rest_s: 30 },
			],
		},
	},
];

export const ROPE_FITNESS: WeekSchedule[] = [
	{
		week: 1,
		sessions: [
			{
				kind: "intervals",
				steps: [
					{ repeats: 10, work_s: 30, rest_s: 30 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 4, work_s: 120, rest_s: 60 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 1, work_s: 60, rest_s: 45 },
					{ repeats: 1, work_s: 120, rest_s: 45 },
					{ repeats: 1, work_s: 180, rest_s: 45 },
					{ repeats: 1, work_s: 120, rest_s: 45 },
					{ repeats: 1, work_s: 60 },
				],
			},
		],
	},
	{
		week: 2,
		sessions: [
			{
				kind: "intervals",
				steps: [
					{ repeats: 10, work_s: 30, rest_s: 30 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 4, work_s: 120, rest_s: 60 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 1, work_s: 60, rest_s: 45 },
					{ repeats: 1, work_s: 120, rest_s: 45 },
					{ repeats: 1, work_s: 180, rest_s: 45 },
					{ repeats: 1, work_s: 120, rest_s: 45 },
					{ repeats: 1, work_s: 60 },
				],
			},
		],
	},
	{
		week: 3,
		sessions: [
			{
				kind: "intervals",
				steps: [
					{ repeats: 12, work_s: 40, rest_s: 20 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 4, work_s: 180, rest_s: 60 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 1, work_s: 60, rest_s: 45 },
					{ repeats: 1, work_s: 120, rest_s: 45 },
					{ repeats: 1, work_s: 180, rest_s: 45 },
					{ repeats: 1, work_s: 180, rest_s: 45 },
					{ repeats: 1, work_s: 120, rest_s: 45 },
					{ repeats: 1, work_s: 60 },
				],
			},
		],
	},
	{
		week: 4,
		sessions: [
			{
				kind: "intervals",
				steps: [
					{ repeats: 12, work_s: 40, rest_s: 20 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 4, work_s: 180, rest_s: 60 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 1, work_s: 60, rest_s: 45 },
					{ repeats: 1, work_s: 120, rest_s: 45 },
					{ repeats: 1, work_s: 180, rest_s: 45 },
					{ repeats: 1, work_s: 180, rest_s: 45 },
					{ repeats: 1, work_s: 120, rest_s: 45 },
					{ repeats: 1, work_s: 60 },
				],
			},
		],
	},
	{
		week: 5,
		sessions: [
			{
				kind: "intervals",
				steps: [
					{ repeats: 15, work_s: 40, rest_s: 20 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 5, work_s: 180, rest_s: 60 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 1, work_s: 120, rest_s: 45 },
					{ repeats: 1, work_s: 180, rest_s: 45 },
					{ repeats: 1, work_s: 240, rest_s: 45 },
					{ repeats: 1, work_s: 180, rest_s: 45 },
					{ repeats: 1, work_s: 120 },
				],
			},
		],
	},
	{
		week: 6,
		sessions: [
			{
				kind: "intervals",
				steps: [
					{ repeats: 15, work_s: 40, rest_s: 20 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 5, work_s: 180, rest_s: 60 },
				],
			},
			{
				kind: "intervals",
				steps: [
					{ repeats: 1, work_s: 120, rest_s: 45 },
					{ repeats: 1, work_s: 180, rest_s: 45 },
					{ repeats: 1, work_s: 240, rest_s: 45 },
					{ repeats: 1, work_s: 180, rest_s: 45 },
					{ repeats: 1, work_s: 120 },
				],
			},
		],
	},
];

export const PROGRAM_DATA: ProgramData[] = [
	{
		id: "basic-4",
		note: program({
			name: "Basic 4",
			evidence: "practice",
			sources: ["kikuchi2017", "kotarsky2018", "helms2016", "practice"],
			days: ["mon", "wed", "fri"],
			items: [
				{ exercise: "Push-up", target: { kind: "pct_of_max", sets: 3, pct_of_max: 60 } },
				{ exercise: "Pull-up", target: { kind: "pct_of_max", sets: 3, pct_of_max: 60 } },
				{ exercise: "Bodyweight squat", target: { kind: "pct_of_max", sets: 3, pct_of_max: 60 } },
				{ exercise: "Sit-up", target: { kind: "pct_of_max", sets: 3, pct_of_max: 60 } },
			],
			progression: { rule: "retest_pct_of_max" },
			retest_every_weeks: 3,
		}),
		description: `Four basic bodyweight exercises – push-ups, pull-ups, squats and sit-ups – three times a week. A simple program without equipment (a pull-up bar is enough) that adapts itself to your level.

## Who it's for

For beginners and for coming back after a break. It's also good preparation for fitness tests that measure these exercises.

## How it works

1. **Entry test:** for each exercise do as many reps as you can in one set and log it (Programs → Max test). Warm up before the test.
2. **Training (Mon, Wed, Fri):** 3 sets of 60 % of your max for each exercise. Rest 1–2 minutes between sets.
3. **Retest every 3 weeks:** the new max recalculates the targets.

Example: a max of 30 push-ups → 3 sets of 18.

## How to progress

- The range is 50–70 % of max. If 60 % is easy (you have more than 3 reps left after a set), change the percentage to 70 in a copy of the program or add a fourth set.
- If you can't finish 60 %, drop to 50 %.
- Can't do a pull-up yet? Use the “Zero to your first pull-up” program and replace pull-ups with inverted rows in a copy of Basic 4.

## When to back off

- Your max dropped at a retest or has stalled for two retests in a row → a week at half volume (see “Deload week”).
- Sit-ups pull on your lower back → replace them with crunches or a plank, unless you need them for a test.

## Recommendations

- **Reserve:** end your sets 1–3 reps short of failure – the same effect with less fatigue. *(Helms 2016 – research / practice)*
- **Sleep:** at least 7 hours a day; after a short night choose an easier day. *(Watson 2015 – consensus)*
- **Protein:** roughly 1.6–2.2 g per kg of body weight a day supports gains in strength and muscle. *(Morton 2018 – research)*
- **Check-in:** when fatigue, muscle soreness or sleep get worse several days in a row, reduce volume or take a day off. *(Saw 2016 – research; the specific approach is practice)*
- **Pain:** if an exercise hurts, reduce it or skip it. If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.

Label: **practice** – the percentages of max and set counts are coaching practice. That push-up training leads to gains in strength and muscle is supported by research (Kikuchi 2017, Kotarsky 2018).`,
	},
	{
		id: "push-ups-and-pull-ups-6-weeks",
		note: program({
			name: "Push-ups and pull-ups – 6 weeks",
			evidence: "practice",
			sources: ["kikuchi2017", "kotarsky2018", "helms2016", "practice"],
			duration_weeks: 6,
			days: ["mon", "wed", "fri"],
			items: [
				{ exercise: "Push-up", days: ["mon"], target: { kind: "emom", pct_of_max: 40, minutes: 10 } },
				{ exercise: "Pull-up", days: ["mon"], target: { kind: "emom", pct_of_max: 40, minutes: 10 } },
				{ exercise: "Push-up", days: ["wed"], target: { kind: "pct_of_max", sets: 5, pct_of_max: 60 } },
				{ exercise: "Pull-up", days: ["wed"], target: { kind: "pct_of_max", sets: 5, pct_of_max: 60 } },
				{
					exercise: "Push-up",
					days: ["fri"],
					target: { kind: "pct_of_max", sets: 4, pct_of_max: 50 },
					max_from: ["Push-up"],
					schedule: [
						{ week: 1, exercise: "Diamond push-up" },
						{ week: 2, exercise: "Decline push-up" },
						{ week: 3, exercise: "Push-up", target: { kind: "max_sets", sets: 1 } },
						{ week: 4, exercise: "Diamond push-up" },
						{ week: 5, exercise: "Decline push-up" },
						{ week: 6, exercise: "Push-up", target: { kind: "max_sets", sets: 1 } },
					],
				},
				{
					exercise: "Pull-up",
					days: ["fri"],
					target: { kind: "pct_of_max", sets: 4, pct_of_max: 50 },
					max_from: ["Pull-up"],
					schedule: [
						{ week: 1, exercise: "Chin-up" },
						{ week: 2, exercise: "Wide-grip pull-up" },
						{ week: 3, exercise: "Pull-up", target: { kind: "max_sets", sets: 1 } },
						{ week: 4, exercise: "Chin-up" },
						{ week: 5, exercise: "Wide-grip pull-up" },
						{ week: 6, exercise: "Pull-up", target: { kind: "max_sets", sets: 1 } },
					],
				},
			],
			progression: { rule: "retest_pct_of_max" },
			retest_every_weeks: 3,
		}),
		description: `A six-week program to raise your max push-ups and pull-ups. Three short sessions a week (15–25 minutes), each with a different focus; it can be added to running or other training.

## Who it's for

For anyone who can already do at least 10 push-ups and 3 pull-ups and wants to raise the numbers. With fewer pull-ups, start with the “Zero to your first pull-up” program.

## How it works

Before you start, test your max push-ups and pull-ups (Programs → Max test). All targets are calculated from it.

| Day | Focus | What to do |
|---|---|---|
| **Monday – density** | many reps in a short time | EMOM 10 minutes: 40 % of max at the start of every minute, rest for the rest of the minute |
| **Wednesday – volume** | quality sets | 5 sets of 60 % of max, rest about 90 s |
| **Friday – harder variation** | strength in weaker angles | 4 sets of a harder variation at 50 % of max; the variations rotate by week |

- Do push-ups and pull-ups on the same day – alternate them so one muscle group rests while the other works.
- **In weeks 3 and 6 Friday is a test:** after warming up, one set to max. The result is logged as a new max and the targets are recalculated.

Example: a max of 30 push-ups and 9 pull-ups → Monday 12 push-ups and 4 pull-ups every minute, Wednesday 5×18 and 5×5, Friday 4×15 and 4×5 (harder variation).

## How to progress

- The targets grow by themselves with the new max after the week 3 test.
- If you finish the EMOM with a lot in reserve, slow down the lowering (2–3 s down) instead of adding reps.
- Advanced: on Wednesday add weight (vest, backpack) instead of more reps.

## When to back off

- In the EMOM you can't keep up with the prescribed reps before minute 6 → take off 1–2 reps next time.
- Elbows, shoulders or wrists hurt → skip the harder variations and stay with the basic exercise.
- After 6 weeks take at least one easier week (see “Deload week”) before repeating the program.

## Recommendations

- **Reserve:** end your sets 1–3 reps short of failure – the same effect with less fatigue. *(Helms 2016 – research / practice)*
- **Warm-up:** 5 minutes of mobility and 1–2 light sets before training. *(practice)*
- **Sleep:** at least 7 hours a day; after a short night choose an easier day. *(Watson 2015 – consensus)*
- **Protein:** roughly 1.6–2.2 g per kg of body weight a day supports gains in strength and muscle. *(Morton 2018 – research)*
- **Check-in:** when fatigue, muscle soreness or sleep get worse several days in a row, reduce volume or take a day off. *(Saw 2016 – research; the specific approach is practice)*
- **Pain:** if an exercise hurts, reduce it or skip it. If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.

Label: **practice** – the layout, percentages and durations are coaching practice. That push-up training leads to gains in strength and muscle is supported by research (Kikuchi 2017, Kotarsky 2018); ending sets short of failure is based on Helms 2016.`,
	},
	{
		id: "zero-to-your-first-pull-up",
		note: program({
			name: "Zero to your first pull-up",
			evidence: "practice",
			sources: ["practice"],
			days: ["mon", "wed", "fri"],
			items: [
				{ exercise: "Inverted row", target: { kind: "sets_reps", sets: 3, reps: 8 } },
				{ exercise: "Negative pull-up", target: { kind: "sets_reps", sets: 3, reps: 3 } },
				{ exercise: "Dead hang", target: { kind: "time", time_s: 20, sets: 3 } },
			],
			progression: { rule: "none" },
		}),
		description: `A path to your first pull-up through easier variations: inverted rows → negative pull-ups → band-assisted pull-ups → pull-up.

## Who it's for

For anyone who can't yet do a single clean pull-up. You need a pull-up bar and a low bar (or a sturdy table, rings).

## How it works

Three times a week (Mon, Wed, Fri), rest 1.5–2 minutes between sets:

1. **Inverted rows 3×8** – body in line, pull your chest to the bar. The more horizontal your body, the harder it is.
2. **Negative pull-ups 3×3** – jump above the bar and lower yourself over 3–5 seconds to a full hang.
3. **Dead hang 3×20 s** – strengthens grip and shoulders.

## How to progress

- Inverted rows: add reps up to 3×10, then lower the bar or raise your feet.
- Negatives: lengthen the lowering (up to 5–8 s), then add reps up to 3×5.
- Hang: add 5 seconds at a time up to 3×40 s.
- Once you can do 3×10 inverted rows and 3×5 slow negatives, add **band-assisted pull-ups** (2–3 sets of 3–5) in place of some negatives.
- **Once every 2 weeks try one full pull-up** – rested, right after warming up.

## When to back off

- Elbows or shoulders hurt → skip negatives for a week and keep only rows and hangs.
- Three weeks without progress → check your sleep and try training only twice a week.

## Recommendations

- **Warm-up:** 5 minutes of mobility and 1–2 light sets before training. *(practice)*
- **Sleep:** at least 7 hours a day; after a short night choose an easier day. *(Watson 2015 – consensus)*
- **Protein:** roughly 1.6–2.2 g per kg of body weight a day supports gains in strength and muscle. *(Morton 2018 – research)*
- **Pain:** if an exercise hurts, reduce it or skip it. If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.

Label: **practice**.`,
	},
	{
		id: "couch-to-5k",
		note: program({
			name: "Couch to 5K",
			evidence: "practice",
			sources: ["nhsCouchTo5k", "seiler2010", "gabbett2016", "impellizzeri2020"],
			duration_weeks: 9,
			days: ["mon", "wed", "sat"],
			items: [
				{
					exercise: "Running",
					target: {
						kind: "intervals",
						warmup_s: 300,
						steps: [
							{ repeats: 7, work_s: 60, rest_s: 90 },
							{ repeats: 1, work_s: 60 },
						],
						cooldown_s: 300,
					},
					schedule: [
						{
							week: 1,
							target: {
								kind: "intervals",
								warmup_s: 300,
								steps: [
									{ repeats: 7, work_s: 60, rest_s: 90 },
									{ repeats: 1, work_s: 60 },
								],
								cooldown_s: 300,
							},
						},
						{
							week: 2,
							target: {
								kind: "intervals",
								warmup_s: 300,
								steps: [
									{ repeats: 5, work_s: 90, rest_s: 120 },
									{ repeats: 1, work_s: 90 },
								],
								cooldown_s: 300,
							},
						},
						{
							week: 3,
							target: {
								kind: "intervals",
								warmup_s: 300,
								steps: [
									{ repeats: 1, work_s: 90, rest_s: 90 },
									{ repeats: 1, work_s: 180, rest_s: 180 },
									{ repeats: 1, work_s: 90, rest_s: 90 },
									{ repeats: 1, work_s: 180 },
								],
								cooldown_s: 300,
							},
						},
						{
							week: 4,
							target: {
								kind: "intervals",
								warmup_s: 300,
								steps: [
									{ repeats: 1, work_s: 180, rest_s: 90 },
									{ repeats: 1, work_s: 300, rest_s: 150 },
									{ repeats: 1, work_s: 180, rest_s: 90 },
									{ repeats: 1, work_s: 300 },
								],
								cooldown_s: 300,
							},
						},
						{
							week: 5,
							sessions: [
								{
									kind: "intervals",
									warmup_s: 300,
									steps: [
										{ repeats: 2, work_s: 300, rest_s: 180 },
										{ repeats: 1, work_s: 300 },
									],
									cooldown_s: 300,
								},
								{
									kind: "intervals",
									warmup_s: 300,
									steps: [
										{ repeats: 1, work_s: 480, rest_s: 300 },
										{ repeats: 1, work_s: 480 },
									],
									cooldown_s: 300,
								},
								{
									kind: "intervals",
									warmup_s: 300,
									steps: [
										{ repeats: 1, work_s: 1200 },
									],
									cooldown_s: 300,
								},
							],
						},
						{
							week: 6,
							sessions: [
								{
									kind: "intervals",
									warmup_s: 300,
									steps: [
										{ repeats: 1, work_s: 300, rest_s: 180 },
										{ repeats: 1, work_s: 480, rest_s: 180 },
										{ repeats: 1, work_s: 300 },
									],
									cooldown_s: 300,
								},
								{
									kind: "intervals",
									warmup_s: 300,
									steps: [
										{ repeats: 1, work_s: 600, rest_s: 180 },
										{ repeats: 1, work_s: 600 },
									],
									cooldown_s: 300,
								},
								{
									kind: "intervals",
									warmup_s: 300,
									steps: [
										{ repeats: 1, work_s: 1500 },
									],
									cooldown_s: 300,
								},
							],
						},
						{
							week: 7,
							target: {
								kind: "intervals",
								warmup_s: 300,
								steps: [
									{ repeats: 1, work_s: 1500 },
								],
								cooldown_s: 300,
							},
						},
						{
							week: 8,
							target: {
								kind: "intervals",
								warmup_s: 300,
								steps: [
									{ repeats: 1, work_s: 1680 },
								],
								cooldown_s: 300,
							},
						},
						{
							week: 9,
							target: {
								kind: "intervals",
								warmup_s: 300,
								steps: [
									{ repeats: 1, work_s: 1800 },
								],
								cooldown_s: 300,
							},
						},
					],
				},
			],
			progression: { rule: "none" },
		}),
		description: `A nine-week running program for complete beginners based on the NHS Couch to 5K. It alternates running and walking; the running intervals gradually get longer until in week 9 you run 30 minutes without stopping.

## Who it's for

For anyone who doesn't run at all or is coming back after a long break. If you have health problems, ask a doctor before you start.

## How it works

- **3 sessions a week** (Mon, Wed, Sat), with at least a day off between them.
- Each session starts and ends with **5 minutes of brisk walking**.
- The intervals for each week are in the program and show up with today's task; in weeks 5 and 6 the individual sessions differ too.
- Run slowly – the goal is to keep going, not speed.

After the session, log the run with the “Log workout from the program” button and add RPE.

## How to progress

- If a week is too hard, **repeat it** – the program can be paused and reactivated any time.
- Make up a missed session; don't skip weeks.
- After finishing, keep running 3× a week for 30 minutes and gradually lengthen one run.

## When to back off

- Joint, shin or tendon pain that doesn't go away by the next day → take 2–3 days off and go back a week.
- Breathlessness where you can't talk → slow down.

## Recommendations

- **Pace:** run most of your runs easy – so you can still talk. *(Seiler 2010 – research)*
- **Load:** don't increase in jumps; a sharp rise in load is associated with a higher injury risk (though the method is disputed). *(Gabbett 2016, Impellizzeri 2020 – research)*
- **Sleep:** at least 7 hours a day; after a short night choose an easier day. *(Watson 2015 – consensus)*
- **Check-in:** when fatigue, muscle soreness or sleep get worse several days in a row, reduce volume or take a day off. *(Saw 2016 – research; the specific approach is practice)*
- **Pain:** if an exercise hurts, reduce it or skip it. If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.

Interval plan taken from the NHS Couch to 5K (nhs.uk, © Crown copyright).

Label: **consensus / practice** (a public NHS program) – listed as practice in the plugin.`,
	},
	{
		id: "100-push-ups-a-day",
		note: program({
			name: "100 push-ups a day",
			evidence: "practice",
			sources: ["practice"],
			days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
			items: [
				{ exercise: "Push-up", target: { kind: "daily_total", daily_total: 100 } },
			],
			progression: { rule: "none" },
		}),
		description: `A challenge: 100 push-ups every day, split into any number of sets through the day. Counted with the daily counter (+5 / +10 / +15).

## Who it's for

For anyone who can do at least 15–20 push-ups in one set. Otherwise start with a lower daily target (make a copy of the program and change the number) or with knee push-ups.

## How it works

- Split up your day: e.g. 10 sets of 10 or 5 sets of 20, with hours between sets if you like.
- End every set with something in reserve – none should go to failure.
- Watch your technique: body in line, chest just above the floor. A hundred half push-ups don't count.

## How to progress

- Once 100 a day is easy, don't raise the number right away – try harder variations (diamond, decline) or a slower tempo.
- For balance, add a pulling exercise (pull-ups, inverted rows): push-ups alone load only the front of the body.

## When to back off

The program has **no rest days** – which makes listening to your body all the more important:

- Shoulder, elbow or wrist pain → a day off, then half the target.
- A morning check-in getting worse (fatigue, muscle soreness) several days in a row → 1–2 days off.
- Keep the challenge up for 4–6 weeks at most, then add a deload week.

## Recommendations

- **Reserve:** end your sets 1–3 reps short of failure – the same effect with less fatigue. *(Helms 2016 – research / practice)*
- **Check-in:** when fatigue, muscle soreness or sleep get worse several days in a row, reduce volume or take a day off. *(Saw 2016 – research; the specific approach is practice)*
- **Sleep:** at least 7 hours a day; after a short night choose an easier day. *(Watson 2015 – consensus)*
- **Pain:** if an exercise hurts, reduce it or skip it. If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.

Label: **practice**.`,
	},
	{
		id: "grease-the-groove",
		note: program({
			name: "Grease the groove",
			evidence: "practice",
			sources: ["practice"],
			days: ["mon", "tue", "wed", "thu", "fri"],
			items: [
				{ exercise: "Pull-up", target: { kind: "pct_of_max", sets: 5, pct_of_max: 50 } },
			],
			progression: { rule: "retest_pct_of_max" },
			retest_every_weeks: 2,
		}),
		description: `“Greasing the groove”: frequent, easy sets of one exercise spread through the whole day. The goal is to practice the movement with many quality reps without fatigue.

## Who it's for

For anyone who wants to raise their pull-ups (or push-ups, dips) and has a bar handy at home or at work. You need to be able to do at least 3–4 clean reps.

## How it works

- **Monday to Friday**, weekends off.
- **5 sets a day of 50 % of max**, with **at least an hour** between sets.
- Every set should be easy and technically clean – never to failure, never grinding.

Example: a max of 8 pull-ups → 4 pull-ups five times a day.

## How to progress

- Retest your max every 2 weeks (after the weekend off).
- When 5 sets are easy, add a sixth and seventh set – not reps per set.
- You can change the exercise: in a copy of the program replace pull-ups with push-ups or dips.

## When to back off

- Your max dropped at a retest → a week of only 3 sets a day.
- Elbows or forearms hurt → 2–3 days off; for pull-ups alternate overhand and underhand grips.

## Recommendations

- **Reserve:** end your sets 1–3 reps short of failure – the same effect with less fatigue. *(Helms 2016 – research / practice)*
- **Sleep:** at least 7 hours a day; after a short night choose an easier day. *(Watson 2015 – consensus)*
- **Check-in:** when fatigue, muscle soreness or sleep get worse several days in a row, reduce volume or take a day off. *(Saw 2016 – research; the specific approach is practice)*
- **Pain:** if an exercise hurts, reduce it or skip it. If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.

Label: **practice**.`,
	},
	{
		id: "daily-kettlebell",
		note: program({
			name: "Daily kettlebell",
			evidence: "practice",
			sources: ["lake2012", "farrar2010", "practice"],
			days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
			items: [
				{ exercise: "Kettlebell swing", target: { kind: "sets_reps", sets: 10, reps: 10 } },
				{ exercise: "Turkish get-up", target: { kind: "sets_reps", sets: 5, reps: 2 } },
			],
			progression: { rule: "none" },
		}),
		description: `A short daily session with one kettlebell: swings and the Turkish get-up. It takes 20–30 minutes and covers explosiveness, conditioning and shoulder and core stability.

## Who it's for

For anyone who has one kettlebell and wants a simple daily routine. First learn the swing and get-up technique (without weight or with a light bell) – see the exercise library.

## How it works

1. **Swing: 10 sets of 10** – every set explosive, rest between sets until your breathing settles.
2. **Turkish get-up: 5 sets of 2** (1 per side) – slowly and under control.

It's not about speed. When your technique slips in a set, end the set.

## How to progress

- Try a heavier bell once the whole session with your current bell has been easy several days in a row.
- Make the switch gradually: first 2–3 sets with the heavier bell, the rest with the original.
- Two-hand swing → later one-arm.

## When to back off

- Your lower back pulls → check your swing technique (movement from the hips, not the back) and reduce the weight.
- A tired grip or torn palms → a day off.
- The program has no rest days: take 1–2 days off when your check-in gets worse.

## Recommendations

- **Warm-up:** 5 minutes of mobility and 1–2 light sets before training. *(practice)*
- **Check-in:** when fatigue, muscle soreness or sleep get worse several days in a row, reduce volume or take a day off. *(Saw 2016 – research; the specific approach is practice)*
- **Sleep:** at least 7 hours a day; after a short night choose an easier day. *(Watson 2015 – consensus)*
- **Pain:** if an exercise hurts, reduce it or skip it. If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.

Label: **practice** – the layout is coaching practice. That swing training improves maximal and explosive strength and is demanding for conditioning is supported by research (Lake 2012, Farrar 2010).`,
	},
	{
		id: "deload-week",
		note: program({
			name: "Deload week",
			evidence: "practice",
			sources: ["practice"],
			duration_weeks: 1,
			days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
			items: [],
			progression: { rule: "none" },
		}),
		description: `A week with a lower load so the body can catch up on fatigue gathered in previous weeks. It's not time off – you keep training, just less.

## When to use it

- After 4–8 weeks of consistent training.
- When performance has stalled or dropped for 2–3 weeks.
- When your morning check-in (fatigue, muscle soreness, mood) or sleep gets worse several days in a row.
- After finishing a program, before starting the next one.

## How it works

- **Strength training:** roughly halve the number of sets, keep the weight or reduce it slightly. No set to failure.
- **Running:** shorter and easier runs, no intervals or tempo sections.
- **Daily challenges and counters:** half the target or 2–3 days off.
- Keep your usual days and exercises – the volume changes, not the habit.

The program has no exercises of its own; it serves as a reminder and rules for adjusting what you normally do.

## After the deload

Return to your normal volume. If you were stalling before the deload, start a step lower (5–10 % less weight or one set fewer) and build up again.

## Recommendations

- **Sleep:** at least 7 hours a day; after a short night choose an easier day. *(Watson 2015 – consensus)*
- **Protein:** roughly 1.6–2.2 g per kg of body weight a day supports gains in strength and muscle. *(Morton 2018 – research)*
- **Check-in:** when fatigue, muscle soreness or sleep get worse several days in a row, reduce volume or take a day off. *(Saw 2016 – research; the specific approach is practice)*

Label: **practice** – the individual fatigue signals are backed by research; the specific form of the deload is coaching practice.`,
	},
	{
		id: "jump-rope-from-zero-4-weeks",
		note: program({
			name: "Jump rope from zero – 4 weeks",
			evidence: "practice",
			sources: ["practice"],
			duration_weeks: 4,
			days: ["mon", "wed", "fri"],
			items: [
				{
					exercise: "Jump rope",
					target: {
						kind: "intervals",
						steps: [
							{ repeats: 8, work_s: 20, rest_s: 40 },
						],
					},
					schedule: [
						{
							week: 1,
							target: {
								kind: "intervals",
								steps: [
									{ repeats: 8, work_s: 20, rest_s: 40 },
								],
							},
						},
						{
							week: 2,
							target: {
								kind: "intervals",
								steps: [
									{ repeats: 10, work_s: 30, rest_s: 30 },
								],
							},
						},
						{
							week: 3,
							target: {
								kind: "intervals",
								steps: [
									{ repeats: 10, work_s: 40, rest_s: 20 },
								],
							},
						},
						{
							week: 4,
							target: {
								kind: "intervals",
								steps: [
									{ repeats: 8, work_s: 60, rest_s: 30 },
								],
							},
						},
					],
				},
			],
			progression: { rule: "none" },
		}),
		description: `Four weeks that teach you to skip rope smoothly for several minutes. Short skipping intervals alternate with rest and gradually get longer.

## Who it's for

For complete beginners and for returning to the rope after a long break. You only need a rope of the right length (stand on the middle – the handles reach about to your armpits) and a flat, slightly springy surface.

## How it works

Three times a week (Mon, Wed, Fri), 8–12 minutes each time:

| Week | Intervals | Total |
|---|---|---|
| 1 | 8× (20 s skipping / 40 s rest) | 8 min |
| 2 | 10× (30 s / 30 s) | 10 min |
| 3 | 10× (40 s / 20 s) | 10 min |
| 4 | 8× (60 s / 30 s) | 12 min |

- Before training, mobilize your ankles, calves and shoulders for 3–5 minutes.
- Jump low and softly from the balls of your feet; the wrists turn the rope.
- Tripping doesn't matter – keep going, the interval counts by time.

After the session use “Log workout from the program” and add the number of jumps and RPE if you like.

## How to progress

- If you can't manage a week, repeat it.
- Alternate the basic two-footed jump with alternating jumps (like light running) – they're easier on the calves.
- After finishing, continue with the “Jump rope – 6-week conditioning” program.

## When to back off

- Calf, shin or Achilles tendon pain that doesn't go away by the next day → 2–3 days off and go back a week. Tendons adapt to jumping more slowly than your fitness does.
- A hard surface (concrete, paving) → jump on a mat, rubber or a wooden floor.

## Recommendations

- **Load:** don't increase in jumps; a sharp rise in load is associated with a higher injury risk (though the method is disputed). *(Gabbett 2016, Impellizzeri 2020 – research)*
- **Check-in:** when fatigue, muscle soreness or sleep get worse several days in a row, reduce volume or take a day off. *(Saw 2016 – research; the specific approach is practice)*
- **Sleep:** at least 7 hours a day; after a short night choose an easier day. *(Watson 2015 – consensus)*
- **Pain:** if an exercise hurts, reduce it or skip it. If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.

Label: **practice**.`,
	},
	{
		id: "jump-rope-6-week-conditioning",
		note: program({
			name: "Jump rope – 6-week conditioning",
			evidence: "practice",
			sources: ["practice"],
			duration_weeks: 6,
			days: ["mon", "wed", "fri"],
			items: [
				{
					exercise: "Jump rope",
					target: {
						kind: "intervals",
						steps: [
							{ repeats: 10, work_s: 30, rest_s: 30 },
						],
					},
					schedule: [
						{
							week: 1,
							sessions: [
								{
									kind: "intervals",
									steps: [
										{ repeats: 10, work_s: 30, rest_s: 30 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 4, work_s: 120, rest_s: 60 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 1, work_s: 60, rest_s: 45 },
										{ repeats: 1, work_s: 120, rest_s: 45 },
										{ repeats: 1, work_s: 180, rest_s: 45 },
										{ repeats: 1, work_s: 120, rest_s: 45 },
										{ repeats: 1, work_s: 60 },
									],
								},
							],
						},
						{
							week: 2,
							sessions: [
								{
									kind: "intervals",
									steps: [
										{ repeats: 10, work_s: 30, rest_s: 30 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 4, work_s: 120, rest_s: 60 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 1, work_s: 60, rest_s: 45 },
										{ repeats: 1, work_s: 120, rest_s: 45 },
										{ repeats: 1, work_s: 180, rest_s: 45 },
										{ repeats: 1, work_s: 120, rest_s: 45 },
										{ repeats: 1, work_s: 60 },
									],
								},
							],
						},
						{
							week: 3,
							sessions: [
								{
									kind: "intervals",
									steps: [
										{ repeats: 12, work_s: 40, rest_s: 20 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 4, work_s: 180, rest_s: 60 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 1, work_s: 60, rest_s: 45 },
										{ repeats: 1, work_s: 120, rest_s: 45 },
										{ repeats: 1, work_s: 180, rest_s: 45 },
										{ repeats: 1, work_s: 180, rest_s: 45 },
										{ repeats: 1, work_s: 120, rest_s: 45 },
										{ repeats: 1, work_s: 60 },
									],
								},
							],
						},
						{
							week: 4,
							sessions: [
								{
									kind: "intervals",
									steps: [
										{ repeats: 12, work_s: 40, rest_s: 20 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 4, work_s: 180, rest_s: 60 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 1, work_s: 60, rest_s: 45 },
										{ repeats: 1, work_s: 120, rest_s: 45 },
										{ repeats: 1, work_s: 180, rest_s: 45 },
										{ repeats: 1, work_s: 180, rest_s: 45 },
										{ repeats: 1, work_s: 120, rest_s: 45 },
										{ repeats: 1, work_s: 60 },
									],
								},
							],
						},
						{
							week: 5,
							sessions: [
								{
									kind: "intervals",
									steps: [
										{ repeats: 15, work_s: 40, rest_s: 20 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 5, work_s: 180, rest_s: 60 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 1, work_s: 120, rest_s: 45 },
										{ repeats: 1, work_s: 180, rest_s: 45 },
										{ repeats: 1, work_s: 240, rest_s: 45 },
										{ repeats: 1, work_s: 180, rest_s: 45 },
										{ repeats: 1, work_s: 120 },
									],
								},
							],
						},
						{
							week: 6,
							sessions: [
								{
									kind: "intervals",
									steps: [
										{ repeats: 15, work_s: 40, rest_s: 20 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 5, work_s: 180, rest_s: 60 },
									],
								},
								{
									kind: "intervals",
									steps: [
										{ repeats: 1, work_s: 120, rest_s: 45 },
										{ repeats: 1, work_s: 180, rest_s: 45 },
										{ repeats: 1, work_s: 240, rest_s: 45 },
										{ repeats: 1, work_s: 180, rest_s: 45 },
										{ repeats: 1, work_s: 120 },
									],
								},
							],
						},
					],
				},
			],
			progression: { rule: "none" },
		}),
		description: `Six weeks of conditioning training with a jump rope. Three different sessions a week: short fast intervals, longer continuous efforts and a pyramid.

## Who it's for

For anyone who can already skip for at least a minute without stopping (e.g. after the “Jump rope from zero” program). Good as an addition to running or strength training.

## How it works

| Day | Focus | Weeks 1–2 | Weeks 3–4 | Weeks 5–6 |
|---|---|---|---|---|
| **Monday – fast intervals** | pace | 10× (30 s / 30 s) | 12× (40 s / 20 s) | 15× (40 s / 20 s) |
| **Wednesday – longer efforts** | endurance | 4× (2 min / 1 min) | 4× (3 min / 1 min) | 5× (3 min / 1 min) |
| **Friday – pyramid** | rhythm changes | 1-2-3-2-1 min | 1-2-3-3-2-1 min | 2-3-4-3-2 min |

- Rest 45 seconds between pyramid efforts.
- On Monday skip briskly, on Wednesday at a pace you can hold the whole time.
- Add variations: alternating jumps, high knees, criss-cross, and for advanced skippers double unders.

## How to progress

- If a week is easy, add jump variations or a heavier rope – not extra minutes.
- After 6 weeks take an easier week, then repeat the cycle with more demanding variations.

## When to back off

- Calf, shin or Achilles tendon pain → skip Monday's fast intervals and cut the rest in half.
- Combining skipping with running? Watch the total load on your calves – don't put a hard run and jump rope on the same day.

## Recommendations

- **Load:** don't increase in jumps; a sharp rise in load is associated with a higher injury risk (though the method is disputed). *(Gabbett 2016, Impellizzeri 2020 – research)*
- **Warm-up:** 5 minutes of mobility and 1–2 light sets before training. *(practice)*
- **Check-in:** when fatigue, muscle soreness or sleep get worse several days in a row, reduce volume or take a day off. *(Saw 2016 – research; the specific approach is practice)*
- **Sleep:** at least 7 hours a day; after a short night choose an easier day. *(Watson 2015 – consensus)*
- **Pain:** if an exercise hurts, reduce it or skip it. If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.

Label: **practice**.`,
	},
	{
		id: "jump-rope-1000-skips",
		note: program({
			name: "Jump rope – 1000 skips",
			evidence: "practice",
			sources: ["practice"],
			duration_weeks: 4,
			days: ["mon", "tue", "wed", "thu", "fri", "sat"],
			items: [
				{ exercise: "Jump rope", target: { kind: "daily_total", daily_total: 1000, counter_steps: [50, 100, 200] } },
			],
			progression: { rule: "none" },
		}),
		description: `A four-week challenge: 1000 skips a day, six days a week (Sunday off). Split the skips into any number of sets and count them with the daily counter (+50 / +100 / +200).

## Who it's for

For anyone who can already handle a rope and do at least 100 skips without stopping. Beginners should first go through “Jump rope from zero” – a thousand jumps a day is too much for unprepared calves and tendons.

## How it works

- 1000 skips take roughly 8–12 minutes of pure time.
- Split them up: e.g. 10× 100 with a short break, or 5× 200.
- Jump low and softly on a springy surface.

## How to progress

- Instead of a higher number, speed up or add variations (alternating jumps, high knees).
- A smaller target to start with: make a copy of the program and change the number to 300–500.

## When to back off

- Calf, shin or Achilles tendon pain → a day off, then half the target.
- A morning check-in getting worse several days in a row → 1–2 days off.
- After 4 weeks add a deload week.

## Recommendations

- **Load:** don't increase in jumps; a sharp rise in load is associated with a higher injury risk (though the method is disputed). *(Gabbett 2016, Impellizzeri 2020 – research)*
- **Check-in:** when fatigue, muscle soreness or sleep get worse several days in a row, reduce volume or take a day off. *(Saw 2016 – research; the specific approach is practice)*
- **Sleep:** at least 7 hours a day; after a short night choose an easier day. *(Watson 2015 – consensus)*
- **Pain:** if an exercise hurts, reduce it or skip it. If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.

Label: **practice**.`,
	},
];

export const TEMPLATE_DATA: TemplateData[] = [
	{ id: "push-gym", note: template({
		name: "Push – gym",
		sport: "strength",
		blocks: [
			{ type: "sets", exercise: "Bench press", sets: 4, reps: 6, kg: "last" },
			{ type: "sets", exercise: "Overhead press", sets: 3, reps: 8, kg: "last" },
			{ type: "sets", exercise: "Incline bench press", sets: 3, reps: 10, kg: "last" },
			{ type: "sets", exercise: "Lateral raise", sets: 3, reps: 12, kg: "last" },
			{ type: "sets", exercise: "Triceps pushdown", sets: 3, reps: 12, kg: "last" },
		],
	}) },
	{ id: "pull-gym", note: template({
		name: "Pull – gym",
		sport: "strength",
		blocks: [
			{ type: "sets", exercise: "Barbell row", sets: 4, reps: 8, kg: "last" },
			{ type: "sets", exercise: "Lat pulldown", sets: 3, reps: 10, kg: "last" },
			{ type: "sets", exercise: "Seated cable row", sets: 3, reps: 10, kg: "last" },
			{ type: "sets", exercise: "Face pull", sets: 3, reps: 15, kg: "last" },
			{ type: "sets", exercise: "Biceps curl", sets: 3, reps: 12, kg: "last" },
		],
	}) },
	{ id: "push-bodyweight", note: template({
		name: "Push – bodyweight",
		sport: "calisthenics",
		blocks: [
			{ type: "sets", exercise: "Dip", sets: 4, reps: 8 },
			{ type: "sets", exercise: "Push-up", sets: 4, reps: 12 },
			{ type: "sets", exercise: "Pike push-up", sets: 3, reps: 8 },
			{ type: "sets", exercise: "Diamond push-up", sets: 3, reps: 10 },
		],
	}) },
	{ id: "pull-bodyweight", note: template({
		name: "Pull – bodyweight",
		sport: "calisthenics",
		blocks: [
			{ type: "sets", exercise: "Pull-up", sets: 4, reps: 6 },
			{ type: "sets", exercise: "Chin-up", sets: 3, reps: 6 },
			{ type: "sets", exercise: "Inverted row", sets: 4, reps: 10 },
			{ type: "hold", exercise: "Dead hang", sets: 3, sec: 30 },
		],
	}) },
];
