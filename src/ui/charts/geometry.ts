// Geometrie vlastních SVG grafů (SPEC 2: lehké vlastní komponenty, bez knihovny).
// Bez závislosti na Obsidianu.

export interface ChartBox {
	width: number;
	height: number;
	/** Okraje kolem kreslicí plochy. */
	left: number;
	right: number;
	top: number;
	bottom: number;
}

export const CHART_BOX: ChartBox = { width: 500, height: 170, left: 8, right: 8, top: 10, bottom: 10 };

/** Nejmenší a největší konečná hodnota; null, když žádná není. */
export function extent(values: readonly (number | null | undefined)[]): [number, number] | null {
	let min = Infinity;
	let max = -Infinity;
	for (const v of values) {
		if (v === null || v === undefined || !Number.isFinite(v)) continue;
		if (v < min) min = v;
		if (v > max) max = v;
	}
	return min === Infinity ? null : [min, max];
}

/** Rozsah osy s 8 % rezervou; stejné hodnoty roztáhne, `includeZero` přidá nulu. */
export function paddedDomain(min: number, max: number, includeZero = false): [number, number] {
	let lo = includeZero ? Math.min(0, min) : min;
	let hi = includeZero ? Math.max(0, max) : max;
	if (lo === hi) {
		const delta = Math.abs(lo) > 0 ? Math.abs(lo) * 0.1 : 1;
		lo -= delta;
		hi += delta;
	}
	const pad = (hi - lo) * 0.08;
	return [includeZero && lo === 0 ? 0 : lo - pad, hi + pad];
}

/** Lineární převod hodnoty z rozsahu `d0–d1` na `r0–r1`. */
export function scale(d0: number, d1: number, r0: number, r1: number): (value: number) => number {
	const span = d1 - d0;
	return (value) => (span === 0 ? (r0 + r1) / 2 : r0 + ((value - d0) / span) * (r1 - r0));
}

/** Vodorovná poloha bodu `index` z `count` (jediný bod je uprostřed). */
export function xAt(index: number, count: number, box: ChartBox = CHART_BOX): number {
	const inner = box.width - box.left - box.right;
	return count <= 1 ? box.left + inner / 2 : box.left + (index / (count - 1)) * inner;
}

/** Svislý převod hodnoty na souřadnici (větší hodnota výš; `invert` obráceně). */
export function yScale(domain: [number, number], box: ChartBox = CHART_BOX, invert = false): (value: number) => number {
	const top = box.top;
	const bottom = box.height - box.bottom;
	return invert ? scale(domain[0], domain[1], top, bottom) : scale(domain[0], domain[1], bottom, top);
}

const fmt = (n: number) => n.toFixed(1);

/**
 * Cesta čáry. Chybějící hodnoty (null) čáru přeruší; s `connect` se přeskočí
 * a sousední body se spojí (řídká data, např. tempo jednotlivých běhů).
 */
export function linePath(values: readonly (number | null)[], x: (index: number) => number, y: (value: number) => number, connect = false): string {
	const parts: string[] = [];
	let pen = false;
	values.forEach((v, i) => {
		if (v === null || !Number.isFinite(v)) {
			if (!connect) pen = false;
			return;
		}
		parts.push(`${pen ? "L" : "M"}${fmt(x(i))},${fmt(y(v))}`);
		pen = true;
	});
	return parts.join(" ");
}

/** Uzavřené plochy pásma mezi `low` a `high` – zvlášť pro každý souvislý úsek. */
export function bandPath(
	low: readonly (number | null)[],
	high: readonly (number | null)[],
	x: (index: number) => number,
	y: (value: number) => number,
): string {
	const parts: string[] = [];
	let run: number[] = [];
	const flush = () => {
		if (run.length > 0) {
			const upper = run.map((i, k) => `${k === 0 ? "M" : "L"}${fmt(x(i))},${fmt(y(high[i]!))}`);
			const lower = [...run].reverse().map((i) => `L${fmt(x(i))},${fmt(y(low[i]!))}`);
			parts.push(`${upper.join(" ")} ${lower.join(" ")} Z`);
		}
		run = [];
	};
	for (let i = 0; i < Math.min(low.length, high.length); i++) {
		const lo = low[i];
		const hi = high[i];
		if (lo === null || hi === null || lo === undefined || hi === undefined) flush();
		else run.push(i);
	}
	flush();
	return parts.join(" ");
}

/** Index bodu nejblíž vodorovné poloze `px` (v souřadnicích viewBoxu). */
export function nearestIndex(px: number, count: number, box: ChartBox = CHART_BOX): number {
	if (count <= 1) return 0;
	const inner = box.width - box.left - box.right;
	const index = Math.round(((px - box.left) / inner) * (count - 1));
	return Math.min(count - 1, Math.max(0, index));
}

/** Indexy bodů s hodnotou. */
export function definedIndexes(values: readonly (number | null)[]): number[] {
	const out: number[] = [];
	values.forEach((v, i) => {
		if (v !== null && Number.isFinite(v)) out.push(i);
	});
	return out;
}

/**
 * Vrcholy radarového grafu: osa i míří od středu pod úhlem i × 360° / počet (první nahoru),
 * vzdálenost = hodnota / max × poloměr. Chybějící hodnota = střed.
 */
export function radarPoints(values: readonly (number | null | undefined)[], max: number, radius: number, cx: number, cy: number): [number, number][] {
	return values.map((v, i) => {
		const r = v === null || v === undefined || !Number.isFinite(v) || max <= 0 ? 0 : (Math.min(Math.max(v, 0), max) / max) * radius;
		const angle = (i / values.length) * 2 * Math.PI - Math.PI / 2;
		return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
	});
}

/** Uzavřená lomená čára přes body (atribut `points` u <polygon>). */
export function polygonPoints(points: readonly [number, number][]): string {
	return points.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(" ");
}
