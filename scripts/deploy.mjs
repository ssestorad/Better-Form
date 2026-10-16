// Zkopíruje sestavený plugin (main.js, manifest.json, styles.css) do vaultu.
// Cesta k vaultu se čte z .env.local (VAULT_PATH=...), který se necommituje.
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["main.js", "manifest.json", "styles.css"];

export function readVaultPath() {
	const envFile = path.join(root, ".env.local");
	if (!existsSync(envFile)) return null;
	for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
		const match = line.match(/^\s*VAULT_PATH\s*=\s*(.*?)\s*$/);
		if (match && match[1]) return match[1].replace(/^["']|["']$/g, "");
	}
	return null;
}

export async function deploy() {
	const vault = readVaultPath();
	if (!vault) {
		throw new Error(
			"Chybí cesta k vaultu. Zkopíruj .env.local.example na .env.local a vyplň VAULT_PATH.",
		);
	}
	if (!existsSync(path.join(vault, ".obsidian"))) {
		throw new Error(`Ve složce „${vault}“ není vault Obsidianu (chybí .obsidian).`);
	}
	const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
	const target = path.join(vault, ".obsidian", "plugins", manifest.id);
	await mkdir(target, { recursive: true });
	for (const file of FILES) {
		await copyFile(path.join(root, file), path.join(target, file));
	}
	console.log(`Nasazeno do ${target}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	deploy().catch((err) => {
		console.error(err.message);
		process.exit(1);
	});
}
