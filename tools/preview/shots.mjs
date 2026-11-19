// Snímky náhledu bezhlavým prohlížečem (Edge nebo Chrome): node tools/preview/shots.mjs [view] [lang] [šířka]
// Výchozí: všechny pohledy v obou jazycích, šířka 640. Výstup: tools/preview/dist/shots/<view>-<lang>.png.
// Předtím je potřeba `npm run preview` (sestavení do dist).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "dist");
const browsers = [
	process.env.PREVIEW_BROWSER,
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Google/Chrome/Application/chrome.exe",
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
].filter(Boolean);
const browser = browsers.find((b) => existsSync(b));
if (!browser) throw new Error("Nenašel jsem Edge ani Chrome – nastav cestu v PREVIEW_BROWSER.");
if (!existsSync(path.join(dist, "out.js"))) throw new Error("Chybí sestavení – spusť nejdřív npm run preview.");

const [viewArg, langArg, widthArg, heightArg] = process.argv.slice(2);
const views = viewArg ? [viewArg] : ["plan", "records"];
const langs = langArg ? [langArg] : ["en", "cs"];
const width = Number(widthArg ?? 640);
const page = path.join(dist, `index${width}.html`);
if (!existsSync(page)) throw new Error(`Šířka ${width} není sestavená (index${width}.html).`);

mkdirSync(path.join(dist, "shots"), { recursive: true });
for (const view of views) {
	for (const lang of langs) {
		const out = path.join(dist, "shots", `${view}-${lang}.png`);
		execFileSync(browser, [
			"--headless=new",
			"--disable-gpu",
			"--hide-scrollbars",
			`--user-data-dir=${path.join(dist, "profile")}`,
			"--virtual-time-budget=3000",
			"--force-device-scale-factor=2",
			`--window-size=${width + 40},${Number(heightArg ?? 2400)}`,
			`--screenshot=${out}`,
			`${pathToFileURL(page).href}?view=${view}&lang=${lang}`,
		]);
		console.log(out);
	}
}
