// Svelte akce pro ikony a tooltipy z Obsidianu.

import { Component, MarkdownRenderer, setIcon, setTooltip, type App } from "obsidian";

/** Vykreslí Markdown (např. popis programu z poznámky) stejně jako Obsidian. */
export function markdown(node: HTMLElement, params: { app: App; text: string; sourcePath: string }) {
	let component = new Component();
	const render = (p: typeof params) => {
		node.empty();
		component = new Component();
		component.load();
		void MarkdownRenderer.render(p.app, p.text, node, p.sourcePath, component);
	};
	render(params);
	return {
		update(next: typeof params) {
			component.unload();
			render(next);
		},
		destroy() {
			component.unload();
		},
	};
}

export function icon(node: HTMLElement, name: string) {
	setIcon(node, name);
	return {
		update(next: string) {
			setIcon(node, next);
		},
	};
}

export function tooltip(node: HTMLElement, text: string) {
	setTooltip(node, text);
	return {
		update(next: string) {
			setTooltip(node, next);
		},
	};
}
