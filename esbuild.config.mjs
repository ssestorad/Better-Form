import esbuild from "esbuild";
import esbuildSvelte from "esbuild-svelte";
import { builtinModules } from "node:module";
import { rename, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { deploy, readVaultPath } from "./scripts/deploy.mjs";

const banner = `/*
Better Form – plugin pro Obsidian.
Vygenerováno esbuildem; zdrojový kód je v adresáři src/.
*/`;

const prod = process.argv[2] === "production";

// esbuild ukládá CSS vedle main.js jako main.css; Obsidian očekává styles.css.
const stylesPlugin = {
	name: "styles-css",
	setup(build) {
		build.onEnd(async (result) => {
			if (result.errors.length > 0) return;
			if (existsSync("main.css")) {
				await rm("styles.css", { force: true });
				await rename("main.css", "styles.css");
			}
			// Ve vývojovém režimu po každém buildu zkopírovat do vaultu, pokud je nastavený.
			if (!prod && readVaultPath()) {
				await deploy();
			}
		});
	},
};

const context = await esbuild.context({
	banner: { js: banner },
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtinModules,
		...builtinModules.map((m) => `node:${m}`),
	],
	format: "cjs",
	target: "es2022",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	minify: prod,
	outfile: "main.js",
	conditions: ["svelte", "browser"],
	mainFields: ["svelte", "browser", "module", "main"],
	plugins: [
		esbuildSvelte({
			compilerOptions: { css: "external", dev: !prod },
		}),
		stylesPlugin,
	],
});

if (prod) {
	await context.rebuild();
	await context.dispose();
} else {
	await context.watch();
}
