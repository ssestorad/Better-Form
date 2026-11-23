// Kontrola rozhraní: sestaví náhled a v bezhlavém prohlížeči otevře všechny karty, formuláře a knihovnu
// v obou jazycích a v úzkém i širokém panelu. Selže, když karta spadne nebo zůstane prázdná, něco na kartě či ve formuláři
// se překrývá či přetéká, nebo detail cviku po klepnutí není vidět. Spuštění: npm run check:ui
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "dist");
const browser = [
	process.env.PREVIEW_BROWSER,
	"C:/Program Files/Google/Chrome/Application/chrome.exe",
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
]
	.filter(Boolean)
	.find((b) => existsSync(b));
if (!browser) throw new Error("Nenašel jsem Edge ani Chrome – nastav cestu v PREVIEW_BROWSER.");

execFileSync(process.execPath, [path.join(here, "build.mjs")], { stdio: "ignore" });

// [pohled, šířka, řádek se souhrnem, který musí ve výpisu být]
const runs = [
	["tabs", 340, /^TABS \d+$/],
	["tabs", 700, /^TABS \d+$/],
	["forms", 340, /^FORMS (\d+)\/\1 problems=0$/],
	["forms&open=1", 340, /^FORMS (\d+)\/\1 problems=0$/],
	["forms", 420, /^FORMS (\d+)\/\1 problems=0$/],
	["library", 340, /^OK (\d+) \/ \1$/],
	["browser", 340, /^PROBE .* visible=true$/],
];
const fine = /^(OK |TABS |FORMS .* problems=0$|BEFORE |PROBE .* visible=true$)/;

let failed = 0;
for (const lang of ["en", "cs"]) {
	for (const [view, width, summary] of runs) {
		const url = `${pathToFileURL(path.join(dist, `index${width}.html`)).href}?view=${view}&lang=${lang}`;
		// Vlastní profil pro každý běh – zamčený profil z předchozího běhu by vrátil prázdnou stránku.
		const profile = mkdtempSync(path.join(tmpdir(), "bf-check-"));
		const args = ["--headless=new", "--disable-gpu", `--user-data-dir=${profile}`, "--virtual-time-budget=10000", `--window-size=${width + 40},1200`, "--dump-dom", url];
		// Chrome v kontejneru CI (GitHub Actions) bez sandboxu nenastartuje.
		if (process.platform === "linux") args.unshift("--no-sandbox");
		const html = execFileSync(browser, args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
		// Prohlížeč může profil chvíli držet – nesmazaný zůstane v dočasné složce systému.
		try {
			rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
		} catch {}
		if (!html.trim()) throw new Error(`Prohlížeč ${browser} nevrátil žádnou stránku – zkus jiný přes PREVIEW_BROWSER.`);
		const log = (html.match(/<div id="errors">([\s\S]*?)<\/div>/)?.[1] ?? "")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&amp;/g, "&")
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean);
		const problems = log.filter((l) => !fine.test(l));
		if (!log.some((l) => summary.test(l))) problems.push(`chybí souhrn ${summary} – pohled nedoběhl`);
		const name = `${view} ${lang} ${width}px`;
		if (problems.length === 0) {
			console.log(`ok    ${name}`);
		} else {
			failed++;
			console.log(`CHYBA ${name}\n${problems.map((p) => `      ${p}`).join("\n")}`);
		}
	}
}
if (failed > 0) {
	console.error(`\nKontrola rozhraní: ${failed} pohledů s chybou.`);
	process.exit(1);
}
console.log("\nKontrola rozhraní prošla.");
