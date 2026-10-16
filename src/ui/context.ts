// Předání pluginu Svelte komponentám (index, nastavení, služby).

import { getContext } from "svelte";
import type BetterFormPlugin from "../main";

const CONTEXT_KEY = Symbol("better-form");

interface BetterFormContext {
	plugin: BetterFormPlugin;
}

/** Kontext pro `mount(…, { context })`. */
export function createContext(plugin: BetterFormPlugin): Map<unknown, unknown> {
	return new Map<unknown, unknown>([[CONTEXT_KEY, { plugin } satisfies BetterFormContext]]);
}

export function usePlugin(): BetterFormPlugin {
	return (getContext(CONTEXT_KEY) as BetterFormContext).plugin;
}
