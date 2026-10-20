// Společné pro sekce stránky nastavení: přístup k pluginu, klíče s tečkou a pole pro nepovinné číslo.

import type { App, Setting, SettingDefinition } from "obsidian";
import type BetterFormPlugin from "../main";
import type { BetterFormSettings } from "./settings";

/** Co sekce nastavení potřebuje od záložky. */
export interface SettingsHost {
	readonly app: App;
	readonly plugin: BetterFormPlugin;
	readonly settings: BetterFormSettings;
	save(): void;
	/** Znovu sestaví definice a překreslí stránku (po změně, která mění, co se zobrazuje). */
	update(): void;
}

export interface NumberOptions {
	min: number;
	max: number;
	step?: number;
}

/** Hodnota podle klíče s tečkou („thresholds.sleepTargetHours“). */
export function getPath(root: object, path: string): unknown {
	let value: unknown = root;
	for (const part of path.split(".")) {
		if (value === null || typeof value !== "object") return undefined;
		value = (value as Record<string, unknown>)[part];
	}
	return value;
}

/** Zapíše hodnotu podle klíče s tečkou; neexistující mezikrok = chyba (překlep v klíči). */
export function setPath(root: object, path: string, value: unknown): void {
	const parts = path.split(".");
	const last = parts.pop()!;
	const parent = parts.length > 0 ? getPath(root, parts.join(".")) : root;
	if (parent === null || typeof parent !== "object") throw new Error(`Unknown setting: ${path}`);
	(parent as Record<string, unknown>)[last] = value;
}

/** Řádek jen s popisem (úvod skupiny, krok návodu); do hledání nejde. */
export function note(desc: string | DocumentFragment, name = ""): SettingDefinition {
	return { name, desc, searchable: false };
}

/**
 * Nepovinné číslo podle klíče s tečkou („profile.heightCm“): prázdné pole = null, mimo rozsah se neuloží.
 * Nativní číselné pole Obsidianu prázdnou hodnotu nahradí výchozí, proto vlastní. Hodnota se čte
 * až při vykreslení – definice se staví jen při update(), řádek se kreslí i po návratu z podstránky.
 */
export function optionalNumber(host: SettingsHost, key: string, options: NumberOptions): (setting: Setting) => void {
	return (setting) =>
		void setting.addText((t) => {
			t.inputEl.type = "number";
			t.inputEl.min = String(options.min);
			t.inputEl.max = String(options.max);
			t.inputEl.step = String(options.step ?? 1);
			t.inputEl.addClass("bf-number-input");
			const value = getPath(host.settings, key);
			t.setValue(typeof value === "number" ? String(value) : "");
			t.onChange((raw) => {
				const text = raw.trim().replace(",", ".");
				const parsed = text === "" ? null : Number(text);
				const valid = parsed === null || (Number.isFinite(parsed) && parsed >= options.min && parsed <= options.max);
				t.inputEl.toggleClass("bf-invalid", !valid);
				if (!valid) return;
				setPath(host.settings, key, parsed);
				host.save();
			});
		});
}
