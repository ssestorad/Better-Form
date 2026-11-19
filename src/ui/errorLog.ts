// Posledních pár chyb pro hlášení z telefonu, kde není vidět konzole: chyby mimo
// vykreslování (svelte:boundary je nezachytí), nezachycené sliby a console.error.

const MAX = 5;
const entries: string[] = [];

export function describeError(error: unknown): string {
	if (error instanceof Error) {
		const stack = error.stack ? error.stack.split("\n").slice(1, 6).join("\n") : "";
		return [`${error.name}: ${error.message}`, stack].filter((p) => p !== "").join("\n");
	}
	try {
		return typeof error === "string" ? error : JSON.stringify(error) ?? String(error);
	} catch {
		return Object.prototype.toString.call(error);
	}
}

export function recordError(error: unknown): void {
	entries.push(`${new Date().toTimeString().slice(0, 8)} ${describeError(error)}`);
	if (entries.length > MAX) entries.shift();
}

export function recentErrors(): readonly string[] {
	return entries;
}

/** Zapne záznam; vrátí funkci, která ho vypne (onunload). */
export function installErrorLog(win: Window): () => void {
	const onError = (e: ErrorEvent) => recordError(e.error ?? e.message);
	const onRejection = (e: PromiseRejectionEvent) => recordError(e.reason);
	const original = console.error;
	console.error = (...args: unknown[]) => {
		recordError(args.length === 1 ? args[0] : args.map((a) => (a instanceof Error ? describeError(a) : a)));
		original.apply(console, args);
	};
	win.addEventListener("error", onError);
	win.addEventListener("unhandledrejection", onRejection);
	return () => {
		console.error = original;
		win.removeEventListener("error", onError);
		win.removeEventListener("unhandledrejection", onRejection);
	};
}
