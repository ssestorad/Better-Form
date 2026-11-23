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
import { withBuiltinTexts } from "../../src/seed/lookup";
import { exerciseHistory } from "../../src/calc/exerciseHistory";
import ExerciseDetail from "../../src/ui/library/ExerciseDetail.svelte";
import LibraryBrowser from "../../src/ui/library/LibraryBrowser.svelte";
import WorkoutForm from "../../src/ui/workout/WorkoutForm.svelte";
import CheckIn from "../../src/ui/modals/CheckIn.svelte";
import EntryTest from "../../src/ui/basic/EntryTest.svelte";
import PlanItemForm from "../../src/ui/plan/PlanItemForm.svelte";
import ProgramEditor from "../../src/ui/program/ProgramEditor.svelte";
import TestForm from "../../src/ui/program/TestForm.svelte";
import PainCard from "../../src/ui/body/PainCard.svelte";
import GoalForm from "../../src/ui/goals/GoalForm.svelte";
import NormForm from "../../src/ui/goals/NormForm.svelte";
import LabelForm from "../../src/ui/supplements/LabelForm.svelte";
import SupplementForm from "../../src/ui/supplements/SupplementForm.svelte";
import { emptyBlock, emptyDraft, emptyItem } from "../../src/ui/workout/draft";
import { BLOCK_TYPES } from "../../src/model/constants";
import { initialCheckIn, lastValues } from "../../src/calc/checkIn";
import { seedPrograms } from "../../src/seed/programs";
import { nutritionPlan } from "../../src/calc/nutrition";
import BetterFormPlugin from "../../src/main";
import { createServices } from "../../src/plugin/services";
import App from "../../src/ui/App.svelte";
import { TABS } from "../../src/ui/tabs";

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
// Sonda rozvržení: prvky s textem a ovládací prvky, které přetékají rámeček nebo se překrývají,
// a vodorovné posouvání. Vrací popisy problémů (prázdné pole = v pořádku).
const PROBED = "input, select, textarea, button, label, span, strong, em, b, a, p, li, td, th, dt, dd, h2, h3, h4, h5, legend, small, div";
function layoutProblems(box, name) {
	const describe = (el) => `${el.tagName.toLowerCase()}${el.type ? "[" + el.type + "]" : ""}@${Math.round(el.getBoundingClientRect().top)}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""}"${(el.value || el.textContent || el.placeholder || "").trim().slice(0, 18)}"`;
	const visible = (el) => {
		const r = el.getBoundingClientRect();
		const cs = getComputedStyle(el);
		return el.checkVisibility() && r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
	};
	const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
	// SVG (panáček, grafy) má vlastní souřadnice – kontroluje se jen jako celek.
	const inSvg = (el) => el.closest("svg") !== null;
	const problems = [];
	const frame = box.getBoundingClientRect();
	const els = [...box.querySelectorAll(PROBED)].filter((el) => !inSvg(el) && visible(el) && (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName) || ownText(el)));
	const rects = els.map((el) => el.getBoundingClientRect());
	// Zalomený řádkový text má rámeček přes celé řádky – porovnávají se jednotlivé řádky (getClientRects).
	const lines = els.map((el) => [...el.getClientRects()].filter((r) => r.width > 0 && r.height > 0));
	const overlap = (a, b) => [Math.min(a.right, b.right) - Math.max(a.left, b.left), Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)];
	for (let i = 0; i < els.length; i++) {
		const a = rects[i];
		if (a.right > frame.right + 1 || a.left < frame.left - 1) problems.push(`OVERFLOW ${name}: ${describe(els[i])} ${Math.round(a.left - frame.left)}..${Math.round(a.right - frame.left)} / ${Math.round(frame.width)}`);
		for (let j = i + 1; j < els.length; j++) {
			if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
			const [bw, bh] = overlap(a, rects[j]);
			if (bw <= 2 || bh <= 2) continue;
			const hit = lines[i].flatMap((x) => lines[j].map((y) => overlap(x, y))).find(([w, h]) => w > 2 && h > 2);
			if (hit) problems.push(`OVERLAP ${name}: ${describe(els[i])} × ${describe(els[j])} (${Math.round(hit[0])}×${Math.round(hit[1])})`);
		}
	}
	if (box.scrollWidth > box.clientWidth + 1) problems.push(`HSCROLL ${name}: ${box.scrollWidth} > ${box.clientWidth}`);
	return problems;
}

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
	// Detail každého cviku z knihovny – chyby vykreslení se vypíšou do #errors (node … library cs 640).
	library: (target) => {
		const library = index.all("exercise").map((e) => withBuiltinTexts(e.note));
		const workouts = index.all("workout").map((w) => w.note);
		let ok = 0;
		for (const exercise of library) {
			const box = target.appendChild(document.createElement("section"));
			try {
				const history = exerciseHistory(workouts, exercise.name, exercise.measure, { info: () => undefined, bodyweightKg: 80 });
				mount(ExerciseDetail, { target: box, context, props: { exercise, history, library, onOpenNote: () => {}, onSelect: () => {} } });
				if (box.childElementCount === 0) throw new Error("empty");
				ok++;
			} catch (err) {
				document.getElementById("errors").textContent += `FAIL ${exercise.name}: ${err?.message ?? err}
`;
			}
		}
		document.getElementById("errors").textContent += `OK ${ok} / ${library.length}
`;
	},
	// Knihovna v posuvném okně jako modal na telefonu (kontrola, že detail cviku je po klepnutí vidět).
	browser: (target) => {
		const box = target.appendChild(Object.assign(document.createElement("div"), { className: "modal" }));
		box.style.cssText = "height: 400px; overflow: auto";
		const exercises = index.all("exercise").map((e) => withBuiltinTexts(e.note)).sort((a, b) => a.name.localeCompare(b.name, "cs"));
		mount(LibraryBrowser, { target: box, context, props: { exercises, lastText: () => undefined, onOpenNote: () => {} } });
		// Sonda: posun na konec seznamu, klepnutí na viditelný cvik – je nadpis detailu vidět?
		setTimeout(() => {
			box.scrollTop = 1e6;
			const list = box.querySelector(".bf-library-list");
			list.scrollTop = 1e6;
			document.getElementById("errors").textContent += `BEFORE h=${box.clientHeight} sh=${box.scrollHeight} st=${box.scrollTop} items=${box.querySelectorAll(".bf-library-item").length}
`;
			const top = box.getBoundingClientRect().top;
			const item = [...box.querySelectorAll(".bf-library-item")].find((i) => i.getBoundingClientRect().top > Math.max(top, list.getBoundingClientRect().top) + 20);
			item.click();
			setTimeout(() => {
				const h = box.querySelector(".bf-exercise h3").getBoundingClientRect();
				const r = box.getBoundingClientRect();
				document.getElementById("errors").textContent += `PROBE ${item.textContent.trim().slice(0, 30)} scrollTop=${box.scrollTop} visible=${h.bottom > r.top && h.top < r.bottom}
`;
			}, 100);
		}, 100);
	},
	// Všechny formuláře v okně jako na telefonu; sonda hlásí překryvy a přetékání (node … forms cs 340).
	forms: (target) => {
		const noop = () => {};
		const save = async () => {};
		const options = index.all("exercise").map((e) => ({ name: e.note.name, aliases: e.note.aliases, category: e.note.category }));
		const strength = emptyDraft(today, "strength");
		strength.blocks = BLOCK_TYPES.map((type) => {
			const block = emptyBlock(type, options[0].name);
			block.sets = [{ reps: 8, kg: 60 }, { reps: 8, kg: 60 }];
			block.items = [emptyItem(options[1].name), emptyItem(options[2].name)];
			block.steps = [1, 2, 3];
			return block;
		});
		const api = {
			exercises: () => options,
			info: () => undefined,
			lastText: () => "út 29. 9.: 3×6 × 80 kg",
			newBlock: (exercise) => emptyBlock("sets", exercise),
			createExercise: save,
			showExercise: noop,
			shoes: () => ["Pegasus 41"],
			pains: () => [{ name: "Koleno", level: 3 }],
			save,
			saveTemplate: save,
			cancel: noop,
			remove: save,
			setDirty: noop,
		};
		const days = index.all("day").map((e) => e.note);
		const program = seedPrograms(lang)[0].note;
		const forms = [
			["workout strength", WorkoutForm, { initial: strength, sports: ["strength", "run", "swim", "rope"], bells: [16, 24], barbell: { barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25] }, api }],
			["workout run", WorkoutForm, { initial: emptyDraft(today, "run"), sports: ["strength", "run", "swim", "rope"], bells: [16], api }],
			["workout swim", WorkoutForm, { initial: emptyDraft(today, "swim"), sports: ["strength", "run", "swim", "rope"], bells: [16], api }],
			["workout rope", WorkoutForm, { initial: emptyDraft(today, "rope"), sports: ["strength", "run", "swim", "rope"], bells: [16], api }],
			["check-in", CheckIn, { initialDate: today, load: (date) => ({ values: initialCheckIn(date, undefined, days), hints: lastValues(days, date), existing: false, stepsYesterday: 8000 }), onSave: save, onCancel: noop, showPeriod: true }],
			["entry test", EntryTest, { date: today, items: [{ exercise: options[0].name, unit: "reps", last: "minule 30 (út 29. 9.)" }, { exercise: options[1].name, unit: "sec" }], offerProgram: program.name, onSave: save, onCancel: noop }],
			["plan item", PlanItemForm, { date: today, sports: ["strength", "run", "swim"], templates: [{ name: "Push A", sport: "strength" }], onSave: save, onDelete: save, onCancel: noop }],
			["program", ProgramEditor, { initial: program, options, onSave: save, onCancel: noop }],
			["test", TestForm, { date: today, exercise: options[0].name, options, lastText: () => "minule 28 (20. 9.)", onSave: save, onCancel: noop }],
			["goal", GoalForm, { onSave: save, onCancel: noop }],
			["norm", NormForm, { onSave: save, onCancel: noop }],
			["label", LabelForm, { onSave: noop, onCancel: noop }],
			["supplement", SupplementForm, { initial: { name: "", timing: "any", trainingDaysOnly: false }, nameEditable: true, onSave: noop, onCancel: noop }],
		];
		const report = (text) => (document.getElementById("errors").textContent += `${text}\n`);
		const boxes = [];
		for (const [name, component, props] of forms) {
			// Mimo kořen .better-form – okna v Obsidianu nejsou uvnitř panelu pluginu.
			const box = document.body.appendChild(Object.assign(document.createElement("div"), { className: "modal bf-modal" }));
			box.style.width = getComputedStyle(target).width;
			box.dataset.form = name;
			const content = box.appendChild(Object.assign(document.createElement("div"), { className: "modal-content" }));
			try {
				mount(component, { target: content, context, props });
				boxes.push(box);
			} catch (err) {
				report(`FAIL ${name}: ${err?.message ?? err}`);
			}
		}
		// ?open=1 rozbalí sbalené oddíly (tělesné míry, zóny tepu…), ať se zkontrolují taky.
		if (params.get("open")) setTimeout(() => document.querySelectorAll(".bf-modal details").forEach((d) => (d.open = true)), 100);
		setTimeout(() => {
			const problems = boxes.flatMap((box) => layoutProblems(box, box.dataset.form));
			problems.forEach(report);
			report(`FORMS ${boxes.length}/${forms.length} problems=${problems.length}`);
		}, 500);
	},
	// Všechny karty skutečného pluginu (skutečné služby nad ukázkovými poznámkami). Karta, která spadne
	// nebo zůstane prázdná, se vypíše jako FAIL (node tools/preview/check.mjs, CI).
	tabs: (target) => {
		const report = (text) => (document.getElementById("errors").textContent += `${text}
`);
		const files = entries.map((e) => e.file);
		const vault = {
			getMarkdownFiles: () => files,
			getAbstractFileByPath: (path) => files.find((f) => f.path === path) ?? null,
			read: async () => "",
			cachedRead: async () => "",
			on: () => ({}),
		};
		const fakeApp = {
			vault,
			metadataCache: { getFileCache: (file) => ({ frontmatter: entries.find((e) => e.file === file)?.note }), on: () => ({}), offref: () => {} },
			fileManager: { processFrontMatter: async () => {}, trashFile: async () => {} },
			workspace: { getLeaf: () => ({ openFile: async () => {} }), getActiveFile: () => null, getLeavesOfType: () => [], onLayoutReady: () => {}, requestSaveLayout: () => {} },
		};
		const real = new BetterFormPlugin();
		real.app = fakeApp;
		real.manifest = { id: "better-form", version: "preview" };
		real.settings = settings;
		real.saveData = async () => {};
		createServices(real);
		real.index.rebuild();
		const tab = writable("today");
		mount(App, { target, context: createContext(real), props: { tab } });
		const content = () => target.querySelector(".bf-tab-content");
		const ids = TABS.map((x) => x.id).filter((id) => id !== "basic");
		const check = (id) => {
			const box = content();
			const failed = target.querySelector(".bf-tab-error");
			if (failed) report(`FAIL tab ${id}: ${failed.textContent.trim().slice(0, 400)}`);
			else if (!box || box.childElementCount === 0) report(`FAIL tab ${id}: empty`);
			else {
				const nav = [target.querySelector(".bf-tabbar"), target.querySelector(".bf-subnav")].filter(Boolean);
				const problems = [...nav.flatMap((el) => layoutProblems(el, `nav ${id}`)), ...layoutProblems(box, `tab ${id}`)];
				problems.forEach(report);
				if (problems.length === 0) report(`OK tab ${id}`);
			}
		};
		// ?tab=<id> ukáže jediný pohled (snímky obrazovky přes shots.mjs).
		if (params.get("tab")) {
			tab.set(params.get("tab"));
			return;
		}
		// Karty jedna po druhé; nakonec režim Základ (jeho karta je vidět jen v něm).
		let i = 0;
		const next = () => {
			if (i < ids.length) {
				const id = ids[i++];
				tab.set(id);
				setTimeout(() => (check(id), next()), 200);
			} else if (i === ids.length) {
				i++;
				settings.mode = "basic";
				real.settingsVersion.update((n) => n + 1);
				tab.set("basic");
				setTimeout(() => (check("basic"), report(`TABS ${ids.length + 1}`)), 200);
			}
		};
		setTimeout(next, 100);
	},
	records: (target) =>
		mount(RecordsSection, {
			target,
			context,
			props: { workouts: index.all("workout").map((w) => w.note), tests: [], ctx: { info: () => undefined, bodyweightKg: 80 } },
		}),
};
const root = document.getElementById("root");
const report = (text) => (document.getElementById("errors").textContent += `${text}\n`);
window.addEventListener("error", (e) => report(`ERROR ${e.message}`));
window.addEventListener("unhandledrejection", (e) => report(`ERROR ${e.reason?.message ?? e.reason}`));
// Chyby, které komponenty jen zalogují (např. svelte:boundary v App), taky do výpisu.
const logError = console.error.bind(console);
console.error = (...args) => {
	logError(...args);
	report(`ERROR ${args.map((a) => a?.stack ?? a?.message ?? String(a)).join(" ").slice(0, 600)}`);
};
try {
	views[params.get("view") ?? "plan"](root);
} catch (err) {
	document.getElementById("errors").textContent += `${err?.stack ?? err}\n`;
}
