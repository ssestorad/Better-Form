// Minimal stand-in for the Obsidian API, only for the preview harness.
export class Events {
	constructor() {
		this._h = {};
	}
	on(name, cb) {
		(this._h[name] ??= []).push(cb);
		return { name, cb };
	}
	offref() {}
	trigger(name, ...args) {
		for (const cb of this._h[name] ?? []) cb(...args);
	}
}
export class TFile {
	constructor(path) {
		this.path = path;
		this.basename = path.split("/").pop().replace(/\.md$/, "");
		this.extension = "md";
	}
}
export class TFolder {}
export class Notice {
	constructor(message) {
		console.log("[Notice]", message);
		const el = document.getElementById("notices");
		if (el) el.textContent = String(message);
	}
}
export function setIcon(node, name) {
	node.textContent = "";
	const span = document.createElement("span");
	span.textContent = "◆";
	span.title = name;
	span.style.fontSize = "12px";
	node.appendChild(span);
}
export function setTooltip(node, text) {
	node.title = text;
}
export function debounce(fn) {
	const wrapped = (...args) => fn(...args);
	wrapped.run = () => {};
	return wrapped;
}
export class Component {
	load() {}
	unload() {}
}
export class Modal {}
export class Plugin {
	register() {}
	registerEvent() {}
	async loadData() {
		return null;
	}
	async saveData() {}
}
export class ItemView {}
export class PluginSettingTab {}
export class Setting {}
export const MarkdownRenderer = { render: async () => {} };
export const Platform = { isDesktopApp: true };
export function normalizePath(p) {
	return p;
}
export function stringifyYaml(v) {
	return JSON.stringify(v, null, 1);
}
export async function requestUrl() {
	return { status: 500, json: {}, text: "" };
}
export class Menu {}
export class App {}
export function getLanguage() {
	return "en";
}
export function parseYaml(text) {
	return JSON.parse(text);
}
export function getFrontMatterInfo(content) {
	return { exists: false, frontmatter: "", from: 0, to: 0, contentStart: 0 };
}
