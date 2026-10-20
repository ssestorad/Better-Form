import { describe, expect, it, vi } from "vitest";
import type { SettingDefinitionItem } from "obsidian";
import { DEFAULT_SETTINGS, DEFAULT_THRESHOLDS } from "../../src/settings/settings";
import { BetterFormSettingTab } from "../../src/settings/SettingsTab";
import { getPath, setPath } from "../../src/settings/settingsUi";

// Globální pomocník Obsidianu; stačí prvek, do kterého jde dál přidávat.
const element = (): object => ({ createEl: element, appendText() {} });
(globalThis as { createFragment?: unknown }).createFragment = (build?: (f: object) => void) => {
	const fragment = element();
	build?.(fragment);
	return fragment;
};

describe("klíče nastavení s tečkou", () => {
	it("čte a zapisuje vnořené hodnoty, překlep v cestě je chyba", () => {
		const settings = structuredClone(DEFAULT_SETTINGS);
		expect(getPath(settings, "thresholds.sleepTargetHours")).toBe(7);
		expect(getPath(settings, "nutrition.activityFactors.light")).toBe(1.4);
		expect(getPath(settings, "neni.tu")).toBeUndefined();
		setPath(settings, "thresholds.sleepTargetHours", 8);
		setPath(settings, "mode", "basic");
		expect(settings.thresholds.sleepTargetHours).toBe(8);
		expect(settings.mode).toBe("basic");
		expect(() => setPath(settings, "neni.tu", 1)).toThrow();
	});
});

describe("stránka nastavení", () => {
	function tab(connected = false) {
		const plugin = {
			settings: structuredClone(DEFAULT_SETTINGS),
			strava: { isConnected: connected, canUseLocalServer: true },
			requestSaveSettings: Object.assign(vi.fn(), { run() {} }),
		};
		return { plugin, tab: new BetterFormSettingTab({} as never, plugin as never) };
	}

	/** Všechny definice ve stromu (skupiny a stránky se rozbalí). */
	function flatten(items: readonly SettingDefinitionItem[]): Record<string, unknown>[] {
		return items.flatMap((item) => {
			const record = item as unknown as Record<string, unknown>;
			const children = record.items as SettingDefinitionItem[] | undefined;
			return "type" in item ? [record, ...flatten(children ?? [])] : [record];
		});
	}

	it("každý ovládací prvek míří na existující nastavení a číslo má výchozí hodnotu podle DEFAULT_SETTINGS", () => {
		const defs = flatten(tab().tab.getSettingDefinitions());
		const controls = defs.map((d) => d.control as { key: string; type: string; defaultValue?: unknown } | undefined).filter((c) => c !== undefined);
		expect(controls.length).toBeGreaterThan(40);
		for (const c of controls) {
			const value = getPath(DEFAULT_SETTINGS, c.key);
			expect(value, c.key).not.toBeUndefined();
			if (c.type === "number") expect(c.defaultValue, c.key).toBe(value);
		}
		// Všechny prahy z Pokročilých jsou na stránce.
		for (const key of Object.keys(DEFAULT_THRESHOLDS)) expect(controls.some((c) => c.key === `thresholds.${key}`), key).toBe(true);
	});

	it("řádky do hledání mají název; skupiny a stránky se sestaví i s připojenou Stravou", () => {
		for (const connected of [false, true]) {
			const defs = flatten(tab(connected).tab.getSettingDefinitions());
			for (const d of defs) {
				if (d.type === "group" || d.searchable === false) continue;
				expect(typeof d.name === "string" && d.name !== "", JSON.stringify(d)).toBe(true);
			}
		}
	});

	it("zápis přes ovládací prvek uloží hodnotu, složku normalizuje", () => {
		const { plugin, tab: settingsTab } = tab();
		settingsTab.setControlValue("thresholds.sleepTargetHours", 8);
		settingsTab.setControlValue("folders.days", "/Deník/");
		expect(plugin.settings.thresholds.sleepTargetHours).toBe(8);
		expect(plugin.settings.folders.days).toBe("Deník");
		expect(settingsTab.getControlValue("folders.days")).toBe("Deník");
		expect(plugin.requestSaveSettings).toHaveBeenCalledTimes(2);
	});
});
