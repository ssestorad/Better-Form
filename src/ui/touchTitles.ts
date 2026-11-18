// Bubliny (atribut title) se na dotykovém displeji neukážou. Na telefonu proto klepnutí
// na prvek s bublinou ukáže její text jako hlášku. Tlačítka, odkazy a pole si nechávají
// svou akci – jejich bublina je jen doplněk k popisku.

/** Text bubliny pro klepnutý prvek v panelu nebo okně pluginu; null, když se nemá ukázat. */
export function titleForTap(target: EventTarget | null): string | null {
	if (!(target instanceof Element)) return null;
	const element = target.closest("[title]");
	if (!element || !element.closest(".better-form, .bf-modal")) return null;
	if (element.closest("button, a, input, select, textarea, label, [role='button'], [role='tab']")) return null;
	const text = element.getAttribute("title")?.trim();
	return text ? text : null;
}
