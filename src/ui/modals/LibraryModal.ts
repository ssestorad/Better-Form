import { Modal } from "obsidian";
import { mount, unmount } from "svelte";
import type BetterFormPlugin from "../../main";
import type { MuscleId } from "../../model/constants";
import { libraryProps } from "../../plugin/library";
import LibraryBrowser from "../library/LibraryBrowser.svelte";
import { t } from "../../i18n";

export interface LibraryModalOptions {
	/** Cvik, jehož detail se má rovnou otevřít (název nebo alias). */
	exercise?: string;
	/** Předvybraná partie ve filtru. */
	muscle?: MuscleId;
}

export class LibraryModal extends Modal {
	private component: ReturnType<typeof mount> | null = null;

	constructor(
		private readonly plugin: BetterFormPlugin,
		private readonly options: LibraryModalOptions = {},
	) {
		super(plugin.app);
	}

	override onOpen(): void {
		this.modalEl.addClass("bf-modal", "bf-modal-wide");
		this.titleEl.setText(t("Exercise library"));
		this.component = mount(LibraryBrowser, {
			target: this.contentEl,
			props: libraryProps(this.plugin, this.options, (file) => {
				this.close();
				void this.app.workspace.getLeaf(false).openFile(file);
			}),
		});
	}

	override onClose(): void {
		if (this.component) {
			void unmount(this.component);
			this.component = null;
		}
		this.contentEl.empty();
	}
}
