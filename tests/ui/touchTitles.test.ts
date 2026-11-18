// Klepnutí na prvek s bublinou na telefonu: kdy se text ukáže a kdy ne.
import { beforeAll, describe, expect, it } from "vitest";

/** Minimální prvek DOM: rodič, třídy, značka a atributy – stačí pro closest() s jednoduchými selektory. */
class FakeElement {
	constructor(
		readonly tag: string,
		readonly attrs: Record<string, string> = {},
		readonly parent: FakeElement | null = null,
	) {}
	getAttribute(name: string): string | null {
		return this.attrs[name] ?? null;
	}
	private matches(selector: string): boolean {
		return selector.split(",").some((part) => {
			const s = part.trim();
			if (s.startsWith(".")) return (this.attrs.class ?? "").split(" ").includes(s.slice(1));
			const attr = s.match(/^\[(\w+)(?:='(\w+)')?\]$/);
			if (attr) return attr[2] === undefined ? attr[1]! in this.attrs : this.attrs[attr[1]!] === attr[2];
			return this.tag === s;
		});
	}
	closest(selector: string): FakeElement | null {
		for (let el: FakeElement | null = this; el; el = el.parent) if (el.matches(selector)) return el;
		return null;
	}
}

let titleForTap: (target: EventTarget | null) => string | null;
beforeAll(async () => {
	(globalThis as { Element?: unknown }).Element = FakeElement;
	({ titleForTap } = await import("../../src/ui/touchTitles"));
});

const view = new FakeElement("div", { class: "better-form" });
const tap = (el: FakeElement) => titleForTap(el as unknown as EventTarget);

describe("bubliny na dotykovém displeji", () => {
	it("text i u prvku uvnitř prvku s bublinou; jen v panelu nebo okně pluginu", () => {
		const row = new FakeElement("div", { title: "Datum: 3. 10." }, view);
		expect(tap(new FakeElement("span", {}, row))).toBe("Datum: 3. 10.");
		const modal = new FakeElement("div", { class: "modal bf-modal" });
		expect(tap(new FakeElement("span", { title: "V okně" }, modal))).toBe("V okně");
		expect(tap(new FakeElement("span", { title: "Cizí plugin" }, new FakeElement("div")))).toBeNull();
	});

	it("tlačítka, odkazy a karty si nechají svou akci; prázdná bublina nic", () => {
		expect(tap(new FakeElement("button", { title: "Uložit" }, view))).toBeNull();
		expect(tap(new FakeElement("span", { title: "Ikona" }, new FakeElement("a", {}, view)))).toBeNull();
		expect(tap(new FakeElement("div", { title: "Karta", role: "tab" }, view))).toBeNull();
		expect(tap(new FakeElement("span", { title: "  " }, view))).toBeNull();
		expect(titleForTap(null)).toBeNull();
	});
});
