// Náhled obrazovek v prohlížeči: skutečné komponenty se zástupným Obsidian API a ukázkovými daty.
// Sestaví tools/preview/dist (mimo plugin, v .gitignore). Spuštění: npm run preview
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const require = createRequire(pathToFileURL(path.join(repo, "package.json")));
const esbuild = require("esbuild");
const esbuildSvelte = require("esbuild-svelte");

mkdirSync(path.join(here, "dist"), { recursive: true });
await esbuild.build({
	entryPoints: [path.join(here, "entry.js")],
	bundle: true,
	format: "iife",
	target: "es2022",
	outfile: path.join(here, "dist", "out.js"),
	alias: { obsidian: path.join(here, "obsidian-stub.js") },
	nodePaths: [path.join(repo, "node_modules")],
	conditions: ["svelte", "browser"],
	mainFields: ["svelte", "browser", "module", "main"],
	plugins: [(esbuildSvelte.default ?? esbuildSvelte)({ compilerOptions: { css: "external", dev: false } })],
	logLevel: "info",
});

const vars = `
:root {
	--background-primary: #ffffff; --background-secondary: #f4f4f6; --background-modifier-border: #dcdce2;
	--background-modifier-border-hover: #c4c4cc; --background-modifier-hover: #ececf0;
	--text-normal: #222; --text-muted: #666; --text-faint: #999; --text-on-accent: #fff; --text-error: #c0392b; --text-success: #2e8b57;
	--interactive-accent: #7b6cd9; --link-color: #5a4fcf;
	--color-orange: #e67e22; --color-orange-rgb: 230,126,34; --color-red: #e74c3c; --color-green: #27ae60; --color-green-rgb: 39,174,96;
	--color-yellow: #f1c40f; --color-purple: #9b59b6;
	--size-2-1: 2px; --size-2-2: 4px; --size-2-3: 6px; --size-4-1: 4px; --size-4-4: 16px; --size-4-2: 8px; --size-4-3: 12px; --size-4-5: 20px;
	--radius-s: 4px; --radius-m: 8px;
	--font-ui-smaller: 12px; --font-ui-small: 13px; --font-ui-medium: 15px; --font-ui-large: 20px;
	--font-normal: 400; --font-medium: 500; --font-semibold: 600; --font-bold: 700; --font-monospace: monospace;
}
body { font-family: system-ui, sans-serif; font-size: 15px; color: var(--text-normal); background: var(--background-secondary); margin: 0; }
#root { width: WIDTHpx; margin: 12px; }
button { font: inherit; font-size: 13px; padding: 4px 10px; border-radius: 5px; border: 1px solid #ccc; background: #fff; cursor: pointer; }
button.mod-cta { background: var(--interactive-accent); color: #fff; border-color: transparent; }
select, input { font: inherit; font-size: 13px; padding: 4px 6px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; }
#errors { color: #c0392b; white-space: pre-wrap; font: 12px monospace; }
#notices { color: #2e8b57; font-size: 12px; }
`;
for (const width of [340, 420, 640, 700]) {
	writeFileSync(
		path.join(here, "dist", `index${width}.html`),
		`<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Better Form preview</title><style>${vars.replace("WIDTH", String(width))}</style><link rel="stylesheet" href="out.css"></head><body><div id="errors"></div><div id="notices"></div><div id="root" class="better-form bf-tab-content"></div><script src="out.js"></script></body></html>`,
	);
}
console.log("built");
