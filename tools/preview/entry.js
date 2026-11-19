// Náhled pro snímky do README: skutečné komponenty Plán a Rekordy s ukázkovými daty
// (nikdy ne data uživatele). ?view=plan|records&lang=en|cs
import { mount } from "svelte";
import { writable } from "svelte/store";
import { TFile } from "obsidian";
import "../../src/styles.css";
import { createContext } from "../../src/ui/context";
import { DEFAULT_SETTINGS } from "../../src/settings/settings";
import { setLanguage } from "../../src/i18n";
import { addDays, startOfWeek, toIsoDate } from "../../src/model/dates";
import { PlanService } from "../../src/data/PlanService";
import PlanTab from "../../src/ui/tabs/PlanTab.svelte";
import RecordsSection from "../../src/ui/overview/RecordsSection.svelte";
import Onboarding from "../../src/ui/modals/Onboarding.svelte";
import { onboardingFromSettings } from "../../src/settings/onboarding";
import { moduleOn } from "../../src/settings/modules";
import { readiness } from "../../src/calc/readiness";
import ReferenceTables from "../../src/ui/supplements/ReferenceTables.svelte";
import ElectrolyteTable from "../../src/ui/supplements/ElectrolyteTable.svelte";
import StreaksCard from "../../src/ui/overview/StreaksCard.svelte";
import ReadinessCard from "../../src/ui/today/ReadinessCard.svelte";
import HabitsCard from "../../src/ui/today/HabitsCard.svelte";
import NutritionTab from "../../src/ui/tabs/NutritionTab.svelte";
import GoalsTab from "../../src/ui/tabs/GoalsTab.svelte";
import SkillsTab from "../../src/ui/tabs/SkillsTab.svelte";
import { GoalService } from "../../src/data/GoalService";
import { seedExercises } from "../../src/seed/exercises";
import { nutritionPlan } from "../../src/calc/nutrition";

const params = new URLSearchParams(location.search);
const lang = params.get("lang") === "cs" ? "cs" : "en";
setLanguage(lang);
const cs = lang === "cs";
const today = toIsoDate(new Date());
const week = startOfWeek(today);

// ---------- ukázková data ----------
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const entries = [];
const add = (path, note) => entries.push({ file: new TFile(path), note, schemaStatus: "current" });
const base = { schema: 1, source: "manual", blocks: [], pain: [] };

for (let i = 70; i >= 1; i--) {
	const date = addDays(today, -i);
	const dow = new Date(date).getDay();
	if (dow === 1 || dow === 4) add(`Forma/Workouts/${date} Gym.md`, { ...base, forma: "workout", date, sport: "strength", title: dow === 1 ? "Push" : "Pull", duration_min: 60, rpe: 7 });
	if (dow === 2 || dow === 6 || dow === 0) {
		const km = dow === 6 ? 8 : dow === 2 ? 6 : 13 + (i % 3);
		const pace = 330 + rnd() * 15 + (dow === 0 ? 20 : 0) - (70 - i) * 0.3;
		const sec = Math.round(km * pace);
		add(`Forma/Workouts/${date} Run.md`, {
			...base,
			forma: "workout",
			date,
			sport: "run",
			duration_min: Math.round(sec / 60),
			rpe: dow === 2 ? 7 : 5,
			run: { distance_km: km, moving_time_s: sec, best_s: { "1k": Math.round(pace * 0.88), "5k": Math.round(pace * 5 * 0.93) } },
		});
	}
}
add("Forma/Goals/10 km.md", { forma: "goal", schema: 1, name: cs ? "10 km pod 48 minut" : "10 km under 48 minutes", type: "run_time", target: 2880, distance_km: 10, created: addDays(today, -60), deadline: addDays(week, 20), status: "active" });

// Plán: vlastní posilovna + běhy z Runny na 4 týdny.
// Runna: úterý, čtvrtek, sobota; závod v neděli 29. den (termín cíle), před ním 2 týdny ladění.
const runna = [
	[[1, "Easy Run · 6 km", "low", 6], [3, "Intervals · 6 x 800m", "high", 9], [5, "Long Run · 14 km", "mid", 14]],
	[[1, "Easy Run · 5 km", "low", 5], [3, "Intervals · 4 x 800m", "high", 8], [5, "Long Run · 6 km", "mid", 6]],
	[[1, "Easy Run · 5 km", "low", 5], [3, "Tempo Run · 7 km", "high", 7], [6, "Race · 10 km", "high", 10]],
	[[2, "Recovery Run · 4 km", "low", 4], [5, "Easy Run · 6 km", "low", 6]],
];
for (let w = 0; w < 4; w++) {
	const monday = addDays(week, 7 * w);
	const items = [];
	if (w < 3) {
		items.push({ id: "p1", date: monday, sport: "strength", title: "Push", duration_min: 60, intensity: "mid" });
		items.push({ id: "p2", date: addDays(monday, 3), sport: "strength", title: "Pull", duration_min: 45, intensity: "mid" });
	}
	runna[w].forEach(([day, title, intensity, km], i) => {
		items.push({ id: `p${3 + i}`, date: addDays(monday, day), sport: "run", title, intensity, distance_km: km, source: "Runna", uid: `runna-${w}-${i}` });
	});
	add(`Forma/Plan/${monday}.md`, { forma: "plan", schema: 1, week: monday, items });
}
// Splněné položky tohoto týdne (dnes je úterý – pondělí posilovna hotová).
add(`Forma/Workouts/${week} Gym.md`, { ...base, forma: "workout", date: week, sport: "strength", title: "Push", duration_min: 58, rpe: 7 });

// Norma a cviky pro Cíle a Dovednosti; denní poznámky s váhou pro Výživu.
add("Forma/Goals/Army test.md", {
	forma: "norm",
	schema: 1,
	name: cs ? "Armádní test" : "Army fitness test",
	items: [
		{ exercise: "Push-up", kind: "reps", rows: [{ sex: "male", value: 40 }] },
		{ exercise: "Sit-up", kind: "reps", rows: [{ sex: "male", value: 45 }] },
		{ exercise: "Running", kind: "run_time", distance_km: 3, rows: [{ sex: "male", value: 840 }] },
	],
});
for (const ex of seedExercises(lang)) add(`Forma/Library/${ex.name}.md`, ex);
for (let i = 20; i >= 0; i -= 2) add(`Forma/Journal/${addDays(today, -i)}.md`, { forma: "day", schema: 1, date: addDays(today, -i), sleep: {}, check_in: {}, hrv: {}, body: { weight_kg: 80 + i * 0.05 } });

// ---------- falešný plugin ----------
const index = {
	isReady: true,
	all: (type) => entries.filter((e) => e.note.forma === type),
	workouts: () => entries.filter((e) => e.note.forma === "workout").sort((a, b) => b.note.date.localeCompare(a.note.date)),
};
const settings = structuredClone(DEFAULT_SETTINGS);
settings.language = lang;
settings.runna.url = "https://example.invalid/calendar.ics";
const indexVersion = writable(0);
const writer = { createNote: async () => new TFile("x.md"), updateFrontmatter: async () => {}, setGeneratedBlock: async () => {} };
const app = { vault: { read: async () => "", getAbstractFileByPath: () => null }, workspace: { getLeaf: () => ({ openFile: async () => {} }) } };
const plugin = {
	app,
	settings,
	index,
	indexVersion,
	settingsVersion: writable(0),
	runnaBusy: writable(false),
	showTab: () => {},
	openPlanItem: () => {},
	openWorkout: () => {},
	exportPlanCalendar: () => {},
	syncRunnaPlan: () => {},
	weeklySummary: () => {},
	openTest: () => {},
	openLibrary: () => {},
	openOnboarding: () => {},
	fillSkillLadders: () => {},
	trashNote: async () => false,
	nutritionProfile: () => ({ sex: "male", age: 34, heightCm: 180, weightKg: 80, bodyFatPct: null, activity: "light", goal: "maintain" }),
	workouts: { isSameExercise: (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase() },
	moduleOn: (key) => moduleOn(settings.modules, key),
	days: { setHabits: async () => {} },
	programs: { active: () => [], tasks: () => [] },
};
plugin.nutritionPlan = (date) => nutritionPlan({ planned: [], profile: plugin.nutritionProfile(date), settings: settings.nutrition, eaMin: settings.thresholds.eaMinKcalPerKgFfm, workouts: [] });
index.day = (date) => entries.find((e) => e.note.forma === "day" && e.note.date === date);
index.findExercise = () => undefined;
settings.profile.sex = "male";
settings.profile.birthYear = 1992;
plugin.goals = new GoalService(index, writer, () => settings, () => ({ info: () => undefined, bodyweightKg: 80 }), plugin.workouts.isSameExercise, () => {});
plugin.plans = new PlanService(app, index, writer, () => settings, () => indexVersion.update((n) => n + 1));

const context = createContext(plugin);
const views = {
	onboarding: (target) => {
		const initial = onboardingFromSettings(settings);
		initial.sports.run = true;
		target.classList.add("bf-modal");
		mount(Onboarding, { target, context, props: { initial, first: true, onSave: async () => {}, onCancel: () => {} } });
	},
	plan: (target) => mount(PlanTab, { target, context }),
	nutrition: (target) => mount(NutritionTab, { target, context }),
	goals: (target) => mount(GoalsTab, { target, context }),
	skills: (target) => mount(SkillsTab, { target, context }),
	// Úzké karty pro kontrolu rozvržení na telefonu (node tools/preview/shots.mjs narrow cs 340).
	narrow: (target) => {
		const workouts = index.all("workout").map((w) => w.note);
		const ready = readiness({ form: { ctl: 10, tsb: 10 }, sleepTargetHours: 8 });
		const history = [{ date: addDays(today, -2), score: null }, { date: addDays(today, -1), score: null }, { date: today, score: ready?.score ?? null }];
		const box = () => target.appendChild(Object.assign(document.createElement("section"), { className: "bf-card" }));
		mount(ReadinessCard, { target: box(), context, props: { readiness: ready, history, onCheckIn: () => {} } });
		mount(HabitsCard, { target, context, props: { today, days: [] } });
		mount(StreaksCard, { target, context, props: { workouts, sessions: workouts, today } });
		mount(ReferenceTables, { target: box(), context, props: { sex: "male", bedtime: null, totals: [], medications: [] } });
		mount(ElectrolyteTable, { target: box(), context, props: { weightKg: 80, sex: "male" } });
	},
	records: (target) =>
		mount(RecordsSection, {
			target,
			context,
			props: { workouts: index.all("workout").map((w) => w.note), tests: [], ctx: { info: () => undefined, bodyweightKg: 80 } },
		}),
};
const root = document.getElementById("root");
window.addEventListener("error", (e) => {
	document.getElementById("errors").textContent += `${e.message}\n`;
});
try {
	views[params.get("view") ?? "plan"](root);
} catch (err) {
	document.getElementById("errors").textContent += `${err?.stack ?? err}\n`;
}
