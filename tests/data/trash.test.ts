import { describe, expect, it } from "vitest";
import { TRASH_KINDS, trashPrompt } from "../../src/data/trash";

describe("mazání z rozhraní", () => {
	it("potvrzení říká, že jde o koš, a co se stane", () => {
		expect(trashPrompt("workout", "2026-10-03 Posilovna – Push")).toEqual({
			title: "Smazat trénink?",
			message: "„2026-10-03 Posilovna – Push“ se přesune do koše – dá se z něj obnovit. Zmizí z přehledů, rekordů, objemu i zátěže.",
		});
		expect(trashPrompt("program", "Základ 4", "Předpřipravený program jde vrátit v Nastavení → Doplnit knihovnu.").message).toMatch(/Doplnit knihovnu\.$/);
	});

	it("každý druh má titulek i text", () => {
		for (const kind of TRASH_KINDS) {
			const prompt = trashPrompt(kind, "X");
			expect(prompt.title, kind).toMatch(/^Smazat .+\?$/);
			expect(prompt.message, kind).toContain("do koše");
		}
	});
});
