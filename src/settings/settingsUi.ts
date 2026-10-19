// Společné pro sekce stránky nastavení: přístup k pluginu a pole pro číslo s kontrolou rozsahu.

import { Setting, type App } from "obsidian";
import type BetterFormPlugin from "../main";
import type { BetterFormSettings } from "./settings";

/** Co sekce nastavení potřebuje od záložky. */
export interface SettingsHost {
	readonly app: App;
	readonly plugin: BetterFormPlugin;
	readonly settings: BetterFormSettings;
	save(): void;
	/** Překreslí celou stránku (po změně, která mění, co se zobrazuje). */
	display(): void;
}

export interface NumberOptions {
	min: number;
	max: number;
	step?: number;
	/** Prázdné pole = null. */
	optional?: boolean;
}

/** Sbalitelný blok; nastavení uvnitř se vytvářejí do vráceného prvku. */
export function collapsible(el: HTMLElement, summary: string): HTMLDetailsElement {
	const details = el.createEl("details", { cls: "bf-settings-details" });
	details.createEl("summary", { text: summary });
	return details;
}

export function numberSetting(
	host: SettingsHost,
	el: HTMLElement,
	name: string,
	desc: string,
	value: number | null,
	apply: (value: number | null) => void,
	options: NumberOptions,
): void {
	new Setting(el)
		.setName(name)
		.setDesc(desc)
		.addText((t) => {
			t.inputEl.type = "number";
			t.inputEl.min = String(options.min);
			t.inputEl.max = String(options.max);
			t.inputEl.step = String(options.step ?? 1);
			t.inputEl.addClass("bf-number-input");
			t.setValue(value === null ? "" : String(value));
			t.onChange((raw) => {
				const text = raw.trim().replace(",", ".");
				const parsed = text === "" ? null : Number(text);
				const valid =
					parsed === null ? options.optional === true : Number.isFinite(parsed) && parsed >= options.min && parsed <= options.max;
				t.inputEl.toggleClass("bf-invalid", !valid);
				if (!valid) return;
				apply(parsed);
				host.save();
			});
		});
}
