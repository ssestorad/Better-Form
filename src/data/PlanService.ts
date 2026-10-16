// Plán týdne (SPEC 4.8, 5.16): poznámky `forma: plan`, jedna na týden. Položky
// jsou ve frontmatteru, čitelný přehled týdne v generovaném bloku.

import { TFile, type App } from "obsidian";
import { dailyLoads } from "../calc/load";
import {
	copyItems,
	hardStreaks,
	matchPlan,
	nextItemId,
	pendingStatus,
	plannedMinutes,
	plannedWorkout,
	runPaceMinPerKm,
	weekDates,
	weekOutlook,
	weekSummary,
	type PlanStatus,
	type WeekOutlook,
	type WeekSummary,
} from "../calc/weekPlan";
import { SCHEMA_VERSION, type DayOffReason, type PlanIntensity, type Sport } from "../model/constants";
import { addDays, daysBetween, isIsoDate, startOfWeek } from "../model/dates";
import { MAX_PLAN_KM, MAX_PLAN_MINUTES, parsePlanItem, parsePlanItems, parsePlanOff } from "../model/parse";
import { planItemToFrontmatter } from "../model/serialize";
import type { PlanDayOff, PlanItem, PlanNote, WorkoutNote } from "../model/types";
import type { BetterFormSettings } from "../settings/settings";
import type { FormaIndex, IndexEntry } from "./FormaIndex";
import type { NoteWriter } from "./NoteWriter";
import { extractGeneratedBlock } from "./generatedBlock";
import { planBlock, type PlanProgramRow } from "./planBlock";
import { planNotePath } from "./paths";
import { t } from "../i18n";

/** Hodnoty z formuláře položky. */
export interface PlanDraft {
	date: string;
	sport: Sport;
	title?: string;
	template?: string;
	durationMin?: number;
	intensity: PlanIntensity;
	distanceKm?: number;
	notes?: string;
}

/** Aktivní program, který má daný den nějaký úkol (dodává plugin z ProgramService). */
export interface PlanProgram {
	name: string;
	file: TFile;
	/** Sport tréninku programu (podle prvního cviku dne). */
	sport: Sport;
	/** Obvyklá délka tréninku; chybí = den programu se do plánu nepočítá. */
	sessionMin?: number;
	intensity?: PlanIntensity;
	/** Úkoly dne jsou splněné, nebo je zapsaný trénink z programu. */
	done: boolean;
	/** Úkoly dne jako text, např. „Kliky 3×12, Shyby 3×5“. */
	text: string;
	/** Den má úkol, který se zapisuje jako trénink (ne jen denní počítadlo). */
	loggable: boolean;
	/** Trénink z programu zapsaný ten den – jde otevřít z plánu. */
	workoutFile?: TFile;
}

export interface PlanEntry {
	item: PlanItem;
	status: PlanStatus;
	/** Zapsaný trénink, kterým se položka splnila. */
	workout?: IndexEntry<WorkoutNote>;
	/** Délka včetně odhadu z vlastního tempa; null = nejde určit. */
	minutes: { minutes: number; estimated: boolean } | null;
	/** Den programu započítaný do plánu – položka není v poznámce týdne a nejde upravit ani přesunout. */
	program?: PlanProgram;
}

export interface PlanDay {
	date: string;
	/** Volný den: plánované volno, nemoc nebo dovolená. */
	off?: DayOffReason;
	entries: PlanEntry[];
	/** Programy s úkolem na tento den, které nemají vyplněnou délku tréninku – jen k zobrazení. */
	programs: PlanProgram[];
}

/** Označení položky plánu vzniklé z programu. */
const programItemId = (program: PlanProgram) => `program:${program.file.path}`;

/** Den programu jako položka plánu (jen když má program délku tréninku). */
function programItem(program: PlanProgram, date: string): PlanItem {
	return { id: programItemId(program), date, sport: program.sport, title: program.name, duration_min: program.sessionMin, intensity: program.intensity ?? "mid" };
}

export interface PlanWeek {
	week: string;
	days: PlanDay[];
	summary: WeekSummary;
	outlook: WeekOutlook;
	/** Řady těžkých dnů po sobě (data). */
	streaks: string[][];
	/** Poznámka týdne; chybí, dokud v týdnu nic není. */
	file?: TFile;
}

const NEWER = "Poznámka s plánem je z novější verze pluginu – aktualizuj plugin.";

function clean(text: string | undefined): string | undefined {
	const trimmed = text?.trim();
	return trimmed ? trimmed : undefined;
}

/** Ověří hodnoty z formuláře a převede je na položku; chyby vrací česky. */
export function planItemFromDraft(draft: PlanDraft, id: string): PlanItem {
	if (!isIsoDate(draft.date)) throw new Error(t("Chybí den."));
	const duration = draft.durationMin;
	if (duration !== undefined && !(duration > 0 && duration <= MAX_PLAN_MINUTES)) throw new Error(t("Délka musí být kladná, nejvýš 24 hodin."));
	const distance = draft.sport === "run" ? draft.distanceKm : undefined;
	if (distance !== undefined && !(distance > 0 && distance <= MAX_PLAN_KM)) throw new Error(t("Vzdálenost musí být kladná, nejvýš {MAX_PLAN_KM} km.", { MAX_PLAN_KM }));
	const item: PlanItem = { id, date: draft.date, sport: draft.sport, intensity: draft.intensity };
	const title = clean(draft.title);
	const template = clean(draft.template);
	const notes = clean(draft.notes);
	if (title) item.title = title;
	if (template) item.template = template;
	if (duration !== undefined) item.duration_min = Math.round(duration);
	if (distance !== undefined) item.distance_km = distance;
	if (notes) item.notes = notes;
	return item;
}

export class PlanService {
	/** Tréninky z denního počítadla programů plán neplní (nastaví plugin). */
	isCounterWorkout: (note: WorkoutNote) => boolean = () => false;
	/** Trénink z programu, jehož dny se do plánu počítají samy – ručně přidanou položku neplní (nastaví plugin). */
	isProgramSession: (note: WorkoutNote) => boolean = () => false;
	/** Aktivní programy s úkolem na daný den (nastaví plugin). */
	programsOn: (date: string) => PlanProgram[] = () => [];

	constructor(
		private readonly app: App,
		private readonly index: FormaIndex,
		private readonly writer: NoteWriter,
		private readonly settings: () => BetterFormSettings,
		private readonly onChange: () => void,
	) {}

	/** Poznámka týdne z indexu (při duplicitách ta s abecedně první cestou). */
	entry(week: string): IndexEntry<PlanNote> | undefined {
		return this.index
			.all("plan")
			.filter((e) => e.note.week === week)
			.sort((a, b) => a.file.path.localeCompare(b.file.path))[0];
	}

	/** Položky týdne seřazené podle dne. */
	items(week: string): PlanItem[] {
		return [...(this.entry(week)?.note.items ?? [])].sort((a, b) => a.date.localeCompare(b.date));
	}

	private workoutEntries(): IndexEntry<WorkoutNote>[] {
		return this.index.workouts().reverse();
	}

	/** Obvyklé tempo běhu uživatele – pro odhad délky běhu zadaného jen vzdáleností. */
	pace(today: string): number | null {
		return runPaceMinPerKm(
			this.index.all("workout").map((e) => e.note),
			today,
		);
	}

	/** Týden se stavem položek, souhrnem a výhledem zátěže. */
	view(week: string, today: string): PlanWeek {
		const entries = this.workoutEntries();
		const notes = entries.map((e) => e.note);
		const byNote = new Map(entries.map((e) => [e.note, e]));
		const pace = runPaceMinPerKm(notes, today);
		const off = this.offDays(week);
		const offDates = new Set(off.keys());
		const manual = matchPlan(
			this.items(week),
			notes.filter((n) => !this.isCounterWorkout(n) && !this.isProgramSession(n)),
			today,
			offDates,
		);
		const days: PlanDay[] = weekDates(week).map((date) => {
			const programs = this.programsOn(date);
			const fromPrograms: PlanEntry[] = programs
				.filter((p) => p.sessionMin !== undefined)
				.map((program) => {
					const item = programItem(program, date);
					return { item, status: program.done ? "done" : pendingStatus(date, today, offDates), minutes: plannedMinutes(item, pace), program };
				});
			const reason = off.get(date);
			return {
				date,
				...(reason ? { off: reason } : {}),
				entries: [
					...manual
						.filter((m) => m.item.date === date)
						.map((m) => ({ item: m.item, status: m.status, workout: m.workout ? byNote.get(m.workout) : undefined, minutes: plannedMinutes(m.item, pace) })),
					...fromPrograms,
				],
				programs: programs.filter((p) => p.sessionMin === undefined),
			};
		});
		// Souhrn, výhled i těžké dny počítají ručně naplánované položky i dny programů dohromady.
		const matches = days.flatMap((d) => d.entries.map((e) => ({ item: e.item, status: e.status })));
		const currentWeek = startOfWeek(today);
		return {
			week,
			days,
			summary: weekSummary(week, matches, notes, pace),
			outlook: weekOutlook(week, matches, dailyLoads(notes).byDate, week < currentWeek ? week : currentWeek, pace),
			streaks: hardStreaks(week, matches, notes),
			file: this.entry(week)?.file,
		};
	}

	/** Volné dny týdne podle data. */
	offDays(week: string): Map<string, DayOffReason> {
		return new Map((this.entry(week)?.note.off ?? []).map((o) => [o.date, o.reason]));
	}

	/**
	 * Dny nemoci a dovolené ze všech plánů – omlouvají série dnů a týdenní cíl
	 * (SPEC 9.2). Běžné volno mezi ně nepatří.
	 */
	excusedDates(): Set<string> {
		const out = new Set<string>();
		for (const entry of this.index.all("plan")) {
			for (const day of entry.note.off ?? []) if (day.reason !== "rest") out.add(day.date);
		}
		return out;
	}

	/**
	 * Označí dny od `from` do `to` (včetně) jako volné, nebo volno zruší (`reason` null).
	 * Položky plánu v těch dnech zůstávají – jen se nepočítají jako vynechané.
	 */
	async setOff(from: string, to: string, reason: DayOffReason | null): Promise<void> {
		if (!isIsoDate(from) || !isIsoDate(to) || to < from) throw new Error(t("Neplatné období."));
		const length = daysBetween(from, to);
		if (length > 60) throw new Error(t("Volno jde nastavit nejvýš na 61 dní najednou."));
		const byWeek = new Map<string, string[]>();
		for (let i = 0; i <= length; i++) {
			const date = addDays(from, i);
			const week = startOfWeek(date);
			byWeek.set(week, [...(byWeek.get(week) ?? []), date]);
		}
		for (const [week, dates] of byWeek) {
			// Zrušení volna v týdnu, který nemá poznámku, nic nezakládá.
			if (reason === null && !this.findFile(week)) continue;
			await this.mutatePlan(week, (plan) => {
				const kept = plan.off.filter((o) => !dates.includes(o.date));
				return { items: plan.items, off: reason === null ? kept : [...kept, ...dates.map((date) => ({ date, reason }))] };
			});
		}
	}

	/** Přesune všechny nesplněné ručně naplánované položky dne na jiný den; vrací jejich počet. */
	async movePending(date: string, to: string, today: string): Promise<number> {
		const pending = (this.view(startOfWeek(date), today).days.find((d) => d.date === date)?.entries ?? []).filter((e) => !e.program && e.status !== "done");
		for (const entry of pending) await this.move(entry.item, to);
		return pending.length;
	}

	/** Programy v týdnu pro tabulku v poznámce: den, název a u započítaných i délka a intenzita. */
	private programRows(week: string): PlanProgramRow[] {
		return weekDates(week).flatMap((date) =>
			this.programsOn(date).map((p) => ({ date, name: p.name, item: p.sessionMin !== undefined ? programItem(p, date) : undefined })),
		);
	}

	/**
	 * Obnoví tabulku v poznámce týdne (např. po změně programu). Zapisuje jen
	 * tehdy, když poznámka existuje a tabulka se opravdu liší.
	 */
	async refreshBlock(week: string): Promise<boolean> {
		const entry = this.entry(week);
		if (!entry || entry.schemaStatus === "newer") return false;
		const block = planBlock(week, this.items(week), this.programRows(week), entry.note.off ?? []);
		if (extractGeneratedBlock(await this.app.vault.read(entry.file)) === block) return false;
		await this.writer.setGeneratedBlock(entry.file, block);
		return true;
	}

	/** Položky daného dne, které ještě nejsou splněné ani vynechané. */
	pending(date: string, today: string): PlanEntry[] {
		return (
			this.view(startOfWeek(date), today)
				.days.find((d) => d.date === date)
				?.entries.filter((e) => e.status === "planned") ?? []
		);
	}

	/**
	 * Nesplněné položky dne jako tréninky – výživa díky nim zná zátěž dne dřív,
	 * než je trénink zapsaný (SPEC 11.5).
	 */
	plannedWorkouts(date: string, today: string): WorkoutNote[] {
		if (date < today) return [];
		const pace = this.pace(today);
		return this.pending(date, today).map((e) => plannedWorkout(e.item, pace));
	}

	async add(draft: PlanDraft): Promise<void> {
		const week = startOfWeek(draft.date);
		await this.mutate(week, (items) => [...items, planItemFromDraft(draft, nextItemId(items))]);
	}

	/** Upraví položku; když se změní týden, přesune ji do poznámky nového týdne. */
	async update(item: PlanItem, draft: PlanDraft): Promise<void> {
		if (item.id.startsWith("program:")) throw new Error(t("Den programu se v plánu neupravuje – změň dny nebo délku tréninku u programu."));
		const from = startOfWeek(item.date);
		const to = startOfWeek(draft.date);
		if (from === to) {
			await this.mutate(from, (items) => items.map((i) => (i.id === item.id ? planItemFromDraft(draft, i.id) : i)));
			return;
		}
		// Nejdřív zapsat na nové místo – při chybě položka zůstane aspoň na původním.
		await this.mutate(to, (items) => [...items, planItemFromDraft(draft, nextItemId(items))]);
		await this.mutate(from, (items) => items.filter((i) => i.id !== item.id));
	}

	/** Přesune položku na jiný den (i do jiného týdne). */
	async move(item: PlanItem, date: string): Promise<void> {
		if (date === item.date) return;
		await this.update(item, {
			date,
			sport: item.sport,
			title: item.title,
			template: item.template,
			durationMin: item.duration_min,
			intensity: item.intensity,
			distanceKm: item.distance_km,
			notes: item.notes,
		});
	}

	async remove(item: PlanItem): Promise<void> {
		if (item.id.startsWith("program:")) throw new Error(t("Den programu se z plánu nemaže – pozastav program nebo mu smaž délku tréninku."));
		await this.mutate(startOfWeek(item.date), (items) => items.filter((i) => i.id !== item.id));
	}

	/** Zkopíruje položky z jednoho týdne do druhého (přidá k těm, které tam už jsou); vrací počet. */
	async copyWeek(fromWeek: string, toWeek: string): Promise<number> {
		const source = this.items(fromWeek);
		if (source.length === 0) return 0;
		await this.mutate(toWeek, (items) => [...items, ...copyItems(source, fromWeek, toWeek, items)]);
		return source.length;
	}

	/** Zkopíruje předchozí týden do `week`. */
	copyPrevious(week: string): Promise<number> {
		return this.copyWeek(addDays(week, -7), week);
	}

	async openNote(week: string): Promise<void> {
		const file = await this.ensureFile(week);
		await this.refreshBlock(week);
		await this.app.workspace.getLeaf(false).openFile(file);
	}

	private findFile(week: string): TFile | null {
		const entry = this.entry(week);
		if (entry) {
			if (entry.schemaStatus === "newer") throw new Error(t(NEWER));
			return entry.file;
		}
		// Právě založená poznámka ještě nemusí být v indexu.
		const file = this.app.vault.getAbstractFileByPath(planNotePath(this.settings().folders, week));
		return file instanceof TFile ? file : null;
	}

	private async ensureFile(week: string): Promise<TFile> {
		const existing = this.findFile(week);
		if (existing) return existing;
		const file = await this.writer.createNote(planNotePath(this.settings().folders, week), { forma: "plan", schema: SCHEMA_VERSION, week, items: [] });
		await this.writer.setGeneratedBlock(file, planBlock(week, [], this.programRows(week)));
		return file;
	}

	/**
	 * Změní položky týdne: čte je přímo z frontmatteru při zápisu (ne z indexu,
	 * který se obnovuje se zpožděním). Řádky, které plugin neumí přečíst, nechá být.
	 */
	private mutate(week: string, change: (items: PlanItem[]) => PlanItem[]): Promise<void> {
		return this.mutatePlan(week, (plan) => ({ items: change(plan.items), off: plan.off }));
	}

	/** Jako `mutate`, ale mění i volné dny týdne. */
	private async mutatePlan(week: string, change: (plan: { items: PlanItem[]; off: PlanDayOff[] }) => { items: PlanItem[]; off: PlanDayOff[] }): Promise<void> {
		const file = await this.ensureFile(week);
		let written: PlanItem[] = [];
		let off: PlanDayOff[] = [];
		await this.writer.updateFrontmatter(file, (frontmatter) => {
			const raw = Array.isArray(frontmatter.items) ? (frontmatter.items as unknown[]) : [];
			const unreadable = raw.filter((value, i) => parsePlanItem(value, week, i) === null);
			const next = change({ items: parsePlanItems(raw, week), off: parsePlanOff(frontmatter.off, week) });
			written = next.items.sort((a, b) => a.date.localeCompare(b.date));
			// Přes parser: seřadí dny a u opakovaného data nechá poslední důvod.
			off = parsePlanOff(next.off, week);
			frontmatter.forma = "plan";
			frontmatter.schema ??= SCHEMA_VERSION;
			frontmatter.week = week;
			frontmatter.items = [...written.map(planItemToFrontmatter), ...unreadable];
			if (off.length > 0) frontmatter.off = off.map((o) => ({ date: o.date, reason: o.reason }));
			else delete frontmatter.off;
		});
		await this.writer.setGeneratedBlock(file, planBlock(week, written, this.programRows(week), off));
		this.onChange();
	}
}
