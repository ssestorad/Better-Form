// Vestavěná knihovna ve vaultu: založení, doplnění textů a žebříčků, obnova programů a překlad.

import { Notice, TFile } from "obsidian";
import { exerciseHistory } from "../calc/exerciseHistory";
import { formatSets, performanceSets } from "../calc/performance";
import { renderWorkoutBlock } from "../data/workoutBlock";
import { joinPath, sanitizeFileName } from "../data/paths";
import { progressionFor } from "../seed/skills";
import { ensureFolders, seedLibrary as seedNotes } from "../data/bootstrap";
import { BLOCK_LABELS } from "../model/constants";
import { toIsoDate } from "../model/dates";
import type { ExerciseNote } from "../model/types";
import { LANGUAGES, type Language, t, tn } from "../i18n";
import { missingTexts, withBuiltinTexts } from "../seed/lookup";
import { seedPrograms } from "../seed/programs";
import { PROGRAM_DATA } from "../seed/programData";
import { builtinId, builtinName, exerciseNameIn, type BuiltinKind } from "../seed/localize";
import { translateExerciseFrontmatter } from "../seed/exercises";
import { relinkFrontmatter, translateSeedBody, type RenameMaps } from "../calc/relink";
import { exerciseNoteBody } from "../seed/exerciseTexts";
import { templateNoteBody } from "../seed/templates";
import { formatShortDate } from "../ui/format";
import { confirmAction } from "../ui/modals/ConfirmModal";
import type { LibraryModalOptions } from "../ui/modals/LibraryModal";
import type BetterFormPlugin from "../main";

/** Vstupy prohlížeče knihovny – stejné v okně i v podsekci Trénink → Cviky. */
export function libraryProps(plugin: BetterFormPlugin, options: LibraryModalOptions, openNote: (file: TFile) => void) {
	const lastText = (exercise: string): string | undefined => {
		const perf = plugin.workouts.prefillContext(toIsoDate(new Date())).last(exercise);
		if (!perf) return undefined;
		const sets = performanceSets(perf);
		const text = sets.length > 0 ? formatSets(sets, plugin.workouts.measureOf(exercise) ?? "reps_kg") : perf.blocks.map((b) => BLOCK_LABELS[b.type]).join(", ");
		return `${formatShortDate(perf.date)}: ${text}`;
	};
	return {
		exercises: plugin.index
			.all("exercise")
			.map((e) => withBuiltinTexts(e.note))
			.sort((a, b) => a.name.localeCompare(b.name, "cs")),
		initialExercise: options.exercise ? plugin.index.findExercise(options.exercise)?.note.name : undefined,
		initialMuscle: options.muscle,
		lastText,
		history: (exercise: ExerciseNote) => exerciseHistory(plugin.index.all("workout").map((w) => w.note), exercise.name, exercise.measure, plugin.statsContext()),
		onOpenNote: (exercise: string) => {
			const file = plugin.index.findExercise(exercise)?.file;
			if (file) openNote(file);
		},
	};
}

/**
 * Doplní do knihovny cviky žebříčků dovedností a u vestavěných cviků zapíše
 * žebříček a stupeň – jen tam, kde `progression` chybí (nic se nepřepisuje).
 */
export async function fillSkillLadders(plugin: BetterFormPlugin): Promise<void> {
	try {
		const seeded = await seedNotes(plugin.writer, plugin.settings.folders, {
			hasExercise: (name) => plugin.index.findExercise(name) !== undefined,
			hasProgram: () => true,
			hasTemplate: () => true,
		});
		let updated = 0;
		for (const entry of plugin.index.all("exercise")) {
			if (entry.schemaStatus === "newer") continue;
			const ladder = entry.note.progression?.ladder;
			if (ladder) {
				// Starší verze zapisovala žebříček jako odkaz [[…]] na neexistující poznámku – převést na text.
				await plugin.writer.updateFrontmatter(entry.file, (fm) => {
					const p = fm.progression as Record<string, unknown> | undefined;
					if (p && typeof p.ladder === "string" && p.ladder.trim().startsWith("[[")) p.ladder = ladder;
				});
				continue;
			}
			const progression = progressionFor(entry.note.name);
			if (!progression) continue;
			await plugin.writer.updateFrontmatter(entry.file, (fm) => {
				if (fm.progression === undefined || fm.progression === null) {
					fm.progression = { ladder: progression.ladder, level: progression.level };
				}
			});
			updated++;
		}
		new Notice(
			seeded.exercises + updated > 0
				? t("Skill ladders added – new exercises: {exercises}, exercises assigned: {updated}.", { exercises: seeded.exercises, updated })
				: t("The skill ladders are already in the library."),
		);
		plugin.indexVersion.update((n) => n + 1);
	} catch (err) {
		plugin.fail(t("Couldn't add the skill ladders"), err);
	}
}

/**
 * Doplní do poznámek cviků popis, provedení a časté chyby z vestavěné knihovny –
 * jen tam, kde pole chybí. Existující text se nikdy nepřepíše.
 */
export async function fillExerciseTexts(plugin: BetterFormPlugin): Promise<void> {
	let updated = 0;
	try {
		for (const entry of plugin.index.all("exercise")) {
			if (entry.schemaStatus === "newer") continue;
			const missing = missingTexts(entry.note);
			if (Object.keys(missing).length === 0) continue;
			await plugin.writer.updateFrontmatter(entry.file, (fm) => {
				for (const [key, value] of Object.entries(missing)) {
					if (fm[key] === undefined || fm[key] === null || fm[key] === "") fm[key] = value;
				}
			});
			updated++;
		}
		new Notice(updated > 0 ? tn(updated, ["Descriptions added to {n} exercise.", "Descriptions added to {n} exercises."]) : t("All exercises already have descriptions."));
	} catch (err) {
		plugin.fail(t("Couldn't add the descriptions"), err);
	}
}

/**
 * Přepíše předpřipravené programy (builtin: true) aktuální verzí z pluginu.
 * Vlastní programy a kopie se nemění; aktivace zůstane. Vyžaduje potvrzení.
 */
export async function refreshBuiltinPrograms(plugin: BetterFormPlugin): Promise<void> {
	// Program se obnoví v jazyce, ve kterém je poznámka (podle jejího názvu).
	const pairs = PROGRAM_DATA.flatMap(({ id }) => {
		const entry = plugin.programs.programs().find((p) => p.note.builtin && builtinId("program", p.note.name) === id);
		if (!entry || entry.schemaStatus === "newer") return [];
		const language = LANGUAGES.find((l) => builtinName("program", id, l) === entry.note.name) ?? "en";
		const seed = seedPrograms(language).find((p) => p.id === id)!;
		return [{ seed, entry }];
	});
	if (pairs.length === 0) {
		new Notice(t("No built-in programs to restore – use “Add to library”."));
		return;
	}
	const ok = await confirmAction(
		plugin.app,
		t("Restore built-in programs?"),
		t("The description and settings of {pairs_length} built-in programs will be replaced with the current version from the plugin. Your edits in these notes will be lost; your own programs, copies and activations stay.", { pairs_length: pairs.length }),
		t("Restore"),
	);
	if (!ok) return;
	try {
		for (const { seed, entry } of pairs) await plugin.programs.refreshBuiltin(entry, seed.note, seed.description);
		new Notice(t("Programs restored: {pairs_length}.", { pairs_length: pairs.length }));
	} catch (err) {
		plugin.fail(t("Couldn't restore the programs"), err);
	}
}

/**
 * Přeloží vestavěnou knihovnu založenou v jiném jazyce do jazyka rozhraní: cviky (název, aliasy,
 * texty, které uživatel neupravil, žebříček), šablony a programy (název). Poznámky přejmenuje
 * a odkazy na ně v trénincích, šablonách, programech, cílech, testech, normách a plánech opraví,
 * pokud je neopravil Obsidian. Vlastní poznámky a upravené texty se nemění. Vyžaduje potvrzení.
 */
export async function renameBuiltinToLanguage(plugin: BetterFormPlugin): Promise<void> {
	const language = plugin.settings.language;
	const frontmatter = (file: TFile) => structuredClone((plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>);
	// Text, který plugin vložil do těla při založení – v každém jazyce (přeloží se jen beze změny).
	const seededBody = (kind: BuiltinKind, id: string, l: Language): string | undefined =>
		kind === "exercise" ? exerciseNoteBody(l) : kind === "template" ? templateNoteBody(l, id) : seedPrograms(l).find((p) => p.id === id)?.description;
	type Job = { kind: "exercise" | "template" | "program"; id: string; file: TFile; name: string; to: string; body: string | null };
	const jobs: Job[] = [];
	for (const kind of ["exercise", "template", "program"] as const) {
		for (const e of plugin.index.all(kind)) {
			const id = builtinId(kind, e.note.name);
			if (id === undefined || e.schemaStatus === "newer") continue;
			const to = builtinName(kind, id, language);
			const target = seededBody(kind, id, language);
			const seeded = LANGUAGES.map((l) => seededBody(kind, id, l)).filter((x): x is string => x !== undefined);
			const body = target === undefined ? null : translateSeedBody(await plugin.app.vault.read(e.file), seeded, target);
			const frontmatterChanged = kind === "exercise" && translateExerciseFrontmatter(frontmatter(e.file), id, language);
			if (frontmatterChanged || to !== e.note.name || body !== null) jobs.push({ kind, id, file: e.file, name: e.note.name, to, body: target ?? null });
		}
	}
	const exercises = jobs.filter((job) => job.kind === "exercise");
	const library =
		jobs.length === 0
			? t("The built-in library is already in the interface language.")
			: `${t("Exercises: {exercises}, templates and programs: {other}.", { exercises: exercises.length, other: jobs.length - exercises.length })} ${t("The notes are renamed and links to them in workouts, templates, programs, goals and plans are updated. Texts you edited and your own exercises, templates and programs stay unchanged.")}`;
	const ok = await confirmAction(
		plugin.app,
		t("Translate to the interface language?"),
		`${library} ${t("Texts generated in daily notes, workouts, weekly plans and summaries are rewritten in the interface language; your own text in notes stays.")}`,
		t("Translate"),
	);
	if (!ok) return;
	const renamed: Record<"exercise" | "template" | "program", Map<string, string>> = { exercise: new Map(), template: new Map(), program: new Map() };
	try {
		for (const job of jobs) {
			const oldNames = [job.file.basename, job.name];
			await plugin.app.fileManager.processFrontMatter(job.file, (fm: Record<string, unknown>) => {
				if (job.kind === "exercise") translateExerciseFrontmatter(fm, job.id, language);
				else fm.name = job.to;
			});
			const target = job.body;
			if (target !== null) {
				const seeded = LANGUAGES.map((l) => seededBody(job.kind, job.id, l)).filter((x): x is string => x !== undefined);
				await plugin.app.vault.process(job.file, (text) => translateSeedBody(text, seeded, target) ?? text);
			}
			const path = joinPath(job.file.parent?.path ?? "", `${sanitizeFileName(job.to)}.md`);
			if (path !== job.file.path && plugin.app.vault.getAbstractFileByPath(path) === null) await plugin.app.fileManager.renameFile(job.file, path);
			for (const old of oldNames) if (old !== job.file.basename) renamed[job.kind].set(old.toLowerCase(), job.file.basename);
		}
		await relinkRenamed(plugin, { exercise: renamed.exercise, max_from: renamed.exercise, template: renamed.template, program: renamed.program });
		plugin.settings.basicExercises = plugin.settings.basicExercises.map((name) => exerciseNameIn(name, language));
		if (plugin.settings.situpAlternative) plugin.settings.situpAlternative = exerciseNameIn(plugin.settings.situpAlternative, language);
		await plugin.saveSettings();
		const blocks = await refreshGeneratedBlocks(plugin);
		new Notice(t("Translated library notes: {n}; notes with updated texts: {blocks}.", { n: jobs.length, blocks }));
	} catch (err) {
		plugin.fail(t("Translating the library failed"), err);
	}
}

/**
 * Generované bloky (mezi forma:start / forma:end) ve všech poznámkách znovu v jazyce rozhraní:
 * tréninky, denní poznámky, plány týdne a souhrny. Zapisuje jen tam, kde se blok liší. Vrací počet
 * poznámek, které se změnily.
 */
async function refreshGeneratedBlocks(plugin: BetterFormPlugin): Promise<number> {
	let changed = 0;
	const count = async (file: TFile, write: () => Promise<unknown>) => {
		const before = await plugin.app.vault.read(file);
		await write();
		if ((await plugin.app.vault.read(file)) !== before) changed++;
	};
	for (const { file, note, schemaStatus } of plugin.index.workouts()) {
		if (schemaStatus === "newer") continue;
		await count(file, () => plugin.writer.setGeneratedBlock(file, renderWorkoutBlock(note, (e) => plugin.workouts.measureOf(e))));
	}
	for (const { file, note } of plugin.index.all("day")) await count(file, () => plugin.days.refreshBlock(note.date));
	for (const { file, note } of plugin.index.all("plan")) await count(file, () => plugin.plans.refreshBlock(note.week));
	const today = toIsoDate(new Date());
	for (const file of plugin.app.vault.getMarkdownFiles()) {
		const month = plugin.summaries.monthOf(file);
		const year = plugin.summaries.yearOf(file);
		const week = plugin.summaries.weekOf(file);
		if (month) await count(file, () => plugin.summaries.generate(month));
		else if (week) {
			const view = plugin.plans.view(week, today);
			await count(file, () => plugin.summaries.generateWeek(week, view.summary, view.outlook.average));
		} else if (year !== null) await count(file, () => plugin.summaries.generateYear(year));
	}
	return changed;
}

/** Odkazy na přejmenované poznámky ve frontmatteru ostatních poznámek (cviky, šablony, programy). */
async function relinkRenamed(plugin: BetterFormPlugin, maps: RenameMaps): Promise<void> {
	if (Object.values(maps).every((map) => map.size === 0)) return;
	for (const type of ["workout", "template", "program", "goal", "test", "norm", "plan"] as const) {
		for (const { file } of plugin.index.all(type)) {
			const cached = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!cached || !relinkFrontmatter(cached, maps).changed) continue;
			await plugin.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				const { value, changed } = relinkFrontmatter(fm, maps);
				if (!changed) return;
				for (const key of Object.keys(fm)) delete fm[key];
				Object.assign(fm, value);
			});
		}
	}
}

/** Vytvoří chybějící složky podle nastavení. */
export async function createFolders(plugin: BetterFormPlugin, notify: boolean): Promise<void> {
	try {
		const created = await ensureFolders(plugin.writer, plugin.settings.folders);
		if (notify) {
			new Notice(created > 0 ? t("Folders created: {created}.", { created }) : t("All folders already exist."));
		}
	} catch (err) {
		plugin.fail(t("Couldn't create the folders"), err);
	}
}

/** Doplní chybějící cviky, předpřipravené programy a šablony tréninků; nic nepřepisuje. */
export async function seedLibrary(plugin: BetterFormPlugin, notify: boolean): Promise<void> {
	try {
		const sameName = (a: string, b: string) => a.toLocaleLowerCase("cs") === b.toLocaleLowerCase("cs");
		const result = await seedNotes(plugin.writer, plugin.settings.folders, {
			hasExercise: (name) => plugin.index.findExercise(name) !== undefined,
			hasProgram: (name) => plugin.index.all("program").some((e) => sameName(e.note.name, name)),
			hasTemplate: (name) => plugin.index.all("template").some((e) => sameName(e.note.name, name)),
		});
		if (notify) {
			new Notice(
				result.exercises + result.programs + result.templates > 0
					? t("Added – exercises: {exercises}, programs: {programs}, templates: {templates}.", { exercises: result.exercises, programs: result.programs, templates: result.templates })
					: t("The library is complete, nothing was missing."),
			);
		}
	} catch (err) {
		plugin.fail(t("Couldn't fill the library"), err);
	}
}

export async function firstRun(plugin: BetterFormPlugin): Promise<void> {
	await createFolders(plugin, false);
	await seedLibrary(plugin, false);
	plugin.settings.initialized = true;
	plugin.settings.librarySeeded = true;
	await plugin.saveSettings();
	new Notice(t("Better Form: folder “{root}” is ready with a library of exercises, programs and templates.", { root: plugin.settings.folders.root }));
	plugin.openOnboarding(true);
}

/** Vault, kde plugin běžel ještě před zavedením knihovny: naplnit jednou. */
export async function seedOnce(plugin: BetterFormPlugin): Promise<void> {
	await seedLibrary(plugin, true);
	plugin.settings.librarySeeded = true;
	await plugin.saveSettings();
}
