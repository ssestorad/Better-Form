# Forma – pravidla projektu

Plugin do Obsidianu pro tréninkový deník, regeneraci, doporučení a výživu. **Kompletní zadání je v `SPEC.md` – před každou fází si přečti relevantní kapitoly.**

## Jak pracovat

- Stav po fázích podle `SPEC.md` kap. 13. Nezačínej další fázi, dokud aktuální nesplňuje akceptační kritéria a uživatel ji neodsouhlasí.
- Na začátku každé fáze krátce shrň plán (soubory, komponenty, datové změny) a počkej na potvrzení.
- Uživatel je na **Windows**; příkazy a cesty piš tak, aby fungovaly v PowerShellu. Po buildu zkopíruj `main.js`, `manifest.json`, `styles.css` do `<vault>/.obsidian/plugins/forma/` (cestu k vaultu si vyžádej a ulož do `.env.local`, necommituj).
- Používej Git; malé commity s popisem v češtině.

## Kód

- TypeScript `strict`, esbuild, šablona `obsidian-sample-plugin`.
- Výpočty (zátěž, 1RM, HRV, výživa, pravidla doporučení) jsou **čisté funkce** v `src/calc/` a `src/rules/` bez závislosti na Obsidian API a **musí mít testy** (Vitest). Každý vzorec testuj proti ručně spočítanému příkladu.
- Přístup k datům jen přes `app.vault`, `app.metadataCache`, `app.fileManager.processFrontMatter`. Žádná závislost na jiných pluginech (Dataview, Templater…).
- Nikdy nepřepisuj uživatelův text. Generovaný obsah v poznámkách jen mezi `<!-- forma:start -->` a `<!-- forma:end -->`.
- Každá datová poznámka má `forma: <typ>` a `schema: <verze>`. Změna schématu = migrace + test.
- Funkce vyžadující Node/Electron (lokální OAuth server, zip záloha) obal kontrolou `Platform.isDesktopApp`; na mobilu je skryj, plugin nesmí spadnout.

## Obsah a texty

- Rozhraní **anglicky a česky** (výchozí angličtina, přepínač v nastavení). Každý text v rozhraní jde přes `t()` / `tn()` ze `src/i18n` (klíč = český text) a anglický překlad patří do `src/i18n/en.ts`; `tests/i18n.test.ts` hlídá, že žádný nechybí. `t()` se volá až při vykreslení – tabulky popisků v konstantách obal `translated()`. Klíče ve frontmatteru anglicky bez diakritiky.
- Vestavěný obsah (cviky, programy, šablony, suplementy, výzkum, zdroje) má anglickou verzi v `src/seed/en/` a `src/evidence/sources/en.ts`; nový nebo změněný obsah doplň v obou jazycích (`tests/seed/english.test.ts` hlídá úplnost).
- Dokumentace: `README.md` je anglicky, `README.cs.md` česky – drž je obsahově stejné. `SPEC.md` a `CLAUDE.md` zůstávají česky.
- **Nic osobního napevno** – vše přes nastavení. Plugin musí fungovat pro jiného uživatele bez úprav kódu.
- Každé doporučení a výpočet má **zdroj a štítek** `výzkum | konsenzus | praxe` (katalog v `src/evidence/sources.ts`). Heuristiku nikdy nevydávej za výzkum. Nevymýšlej citace – používej jen zdroje ze `SPEC.md` kap. 14; nový zdroj přidej jen ověřený a napiš uživateli.
- Není to zdravotnická aplikace: žádné diagnózy; u bolesti ≥ 4/10 nebo > 7 dní doporučit odborníka. Výživa nikdy pod RMR, hlídat energetickou dostupnost (SPEC 11.4).
- Tokeny a klíče Stravy nikdy nelogovat ani necommitovat.

## UX

- Zápis tréninku do 1–2 minut, check-in do 30 s.
- Panáček: zvýraznění nesmí měnit geometrii (žádné tlustší obrysy), panely s pevným rozvržením – nic nesmí při hoveru poskakovat.
- Chybějící data = srozumitelný stav „sbírám data (X z Y dní)“, ne prázdný graf nebo NaN.
