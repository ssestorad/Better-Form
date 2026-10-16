import { ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import { get, writable, type Writable } from "svelte/store";
import type BetterFormPlugin from "../main";
import App from "./App.svelte";
import { createContext } from "./context";
import { isTabId, type TabId } from "./tabs";

export const VIEW_TYPE_BETTER_FORM = "better-form-view";

export class BetterFormView extends ItemView {
	private component: ReturnType<typeof mount> | null = null;
	/** Otevřená karta; ukládá se do stavu layoutu, aby po restartu zůstala. */
	private readonly tab: Writable<TabId> = writable("today");

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: BetterFormPlugin,
	) {
		super(leaf);
		this.tab.subscribe(() => this.app.workspace.requestSaveLayout());
	}

	getViewType(): string {
		return VIEW_TYPE_BETTER_FORM;
	}

	getDisplayText(): string {
		return "Better Form";
	}

	override getIcon(): string {
		return "dumbbell";
	}

	override getState(): Record<string, unknown> {
		return { ...super.getState(), tab: get(this.tab) };
	}

	override async setState(state: unknown, result: ViewStateResult): Promise<void> {
		if (typeof state === "object" && state !== null && "tab" in state && isTabId(state.tab)) {
			this.tab.set(state.tab);
		}
		await super.setState(state, result);
	}

	/** Přepne na kartu (např. z příkazu). */
	showTab(tab: TabId): void {
		this.tab.set(tab);
	}

	override async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("better-form");
		this.component = mount(App, {
			target: this.contentEl,
			props: { tab: this.tab },
			context: createContext(this.plugin),
		});
	}

	/** Vykreslí kartu znovu (po změně jazyka – texty se překládají při vykreslení). */
	async remount(): Promise<void> {
		await this.onClose();
		await this.onOpen();
	}

	override async onClose(): Promise<void> {
		if (this.component) {
			await unmount(this.component);
			this.component = null;
		}
	}
}
