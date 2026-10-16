// Základní statistika pro výpočty (průměr, směrodatná odchylka, přímka trendu).
// Bez závislosti na Obsidianu.

export function mean(values: readonly number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Medián; pro prázdný seznam null. */
export function median(values: readonly number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Výběrová směrodatná odchylka (dělí se n − 1); pro méně než 2 hodnoty null. */
export function sampleSd(values: readonly number[]): number | null {
	const m = mean(values);
	if (m === null || values.length < 2) return null;
	const sumSq = values.reduce((sum, v) => sum + (v - m) ** 2, 0);
	return Math.sqrt(sumSq / (values.length - 1));
}

export interface Point {
	x: number;
	y: number;
}

export interface LinearFit {
	slope: number;
	intercept: number;
}

/** Přímka metodou nejmenších čtverců; null pro méně než 2 body nebo stejné x. */
export function linearFit(points: readonly Point[]): LinearFit | null {
	if (points.length < 2) return null;
	const mx = points.reduce((s, p) => s + p.x, 0) / points.length;
	const my = points.reduce((s, p) => s + p.y, 0) / points.length;
	let sxx = 0;
	let sxy = 0;
	for (const p of points) {
		sxx += (p.x - mx) ** 2;
		sxy += (p.x - mx) * (p.y - my);
	}
	if (sxx === 0) return null;
	const slope = sxy / sxx;
	return { slope, intercept: my - slope * mx };
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
