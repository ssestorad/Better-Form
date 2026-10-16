import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		// Modul „obsidian“ existuje jen uvnitř aplikace – testy datové vrstvy ho nahrazují.
		alias: { obsidian: fileURLToPath(new URL("./tests/helpers/obsidian.ts", import.meta.url)) },
	},
	test: {
		include: ["tests/**/*.test.ts"],
		setupFiles: ["tests/setup.ts"],
		environment: "node",
		passWithNoTests: true,
	},
});
