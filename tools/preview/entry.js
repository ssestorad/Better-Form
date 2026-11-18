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
};
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
