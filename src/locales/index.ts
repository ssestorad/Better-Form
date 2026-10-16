// Registr jazyků. Angličtina je zdroj (texty a vestavěný obsah přímo v kódu), ostatní jazyky
// jsou překlady. Nový jazyk: složka src/locales/<kód>/ podle cs/ a jeden řádek sem –
// přepínač v nastavení, volba podle jazyka Obsidianu i testy úplnosti se odvodí odsud.

import { CS } from "./cs";
import type { Locale } from "./types";

export const LOCALES = {
	cs: CS,
} satisfies Record<string, Locale>;
