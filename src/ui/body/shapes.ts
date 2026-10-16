// Tvary panáčka podle referenčního návrhu uživatele („Osobní přehled – panáček“,
// SPEC 5.5): postava zepředu a zezadu, 14 svalových partií. Jen geometrie –
// barvy a zvýraznění řeší komponenta. Bez závislosti na Obsidianu.
//
// Každá postava je nakreslená v prostoru 200 × 420; zadní je posunutá doprava.
// Cesty popisují levou polovinu těla a zrcadlí se kolem svislé osy postavy.

import { inContext } from "../../i18n";
import type { MuscleId } from "../../model/constants";

/** Šířka jedné postavy v původním návrhu. */
const SINGLE_WIDTH = 200;
const GAP = 20;
const BACK_OFFSET = SINGLE_WIDTH + GAP;

export const FIGURE_WIDTH = SINGLE_WIDTH * 2 + GAP;
export const FIGURE_HEIGHT = 420;

export type Shape =
	| { kind: "path"; d: string }
	| { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
	| { kind: "rect"; x: number; y: number; w: number; h: number; r: number };

export type Side = "front" | "back";

export interface PlacedShape {
	shape: Shape;
	side: Side;
	/** Zrcadlená (pravá) polovina těla. */
	mirrored: boolean;
}

export interface MuscleShape extends PlacedShape {
	muscle: MuscleId;
}

/** SVG transformace umístění tvaru: posun zadní postavy a zrcadlení kolem osy postavy. */
export function shapeTransform(placed: Pick<PlacedShape, "side" | "mirrored">): string | undefined {
	const offset = placed.side === "back" ? BACK_OFFSET : 0;
	if (placed.mirrored) return `matrix(-1 0 0 1 ${SINGLE_WIDTH + offset} 0)`;
	return offset > 0 ? `translate(${offset} 0)` : undefined;
}

const path = (d: string): Shape => ({ kind: "path", d });
const ellipse = (cx: number, cy: number, rx: number, ry: number): Shape => ({ kind: "ellipse", cx, cy, rx, ry });
const rect = (x: number, y: number, w: number, h: number, r: number): Shape => ({ kind: "rect", x, y, w, h, r });

function both(muscle: MuscleId, side: Side, d: string): MuscleShape[] {
	return [
		{ muscle, side, mirrored: false, shape: path(d) },
		{ muscle, side, mirrored: true, shape: path(d) },
	];
}

function center(muscle: MuscleId, side: Side, d: string): MuscleShape {
	return { muscle, side, mirrored: false, shape: path(d) };
}

// Paže a ramena mají zepředu i zezadu stejný obrys.
const UPPER_ARM = "M53,97 C48,111 48,127 52,141 C58,144 64,141 66,137 C68,123 67,109 63,103 Z";
const SHOULDER = "M80,66 C66,64 55,72 53,90 C55,97 59,101 63,103 C65,90 71,80 82,74 Z";
const FOREARM = "M51,147 C45,163 43,183 45,200 L55,202 C61,185 65,167 65,146 Z";

export const MUSCLE_SHAPES: MuscleShape[] = [
	// ----- zepředu -----
	center("abs", "front", "M89,116 L111,116 L111,194 C105,200 95,200 89,194 Z"),
	...both("biceps", "front", UPPER_ARM),
	...both("shoulders", "front", SHOULDER),
	...both("chest", "front", "M98,72 L84,74 C74,80 68,90 67,103 C75,112 88,115 98,111 Z"),
	...both("forearms", "front", FOREARM),
	...both("obliques", "front", "M70,112 C68,132 70,162 78,190 L86,196 L86,118 Z"),
	...both("quads", "front", "M78,212 C67,238 65,272 69,302 C75,307 85,307 93,301 C97,272 97,238 96,214 Z"),
	...both("calves", "front", "M71,322 C67,346 69,376 73,396 L85,396 C89,376 91,346 89,322 Z"),

	// ----- zezadu -----
	center("lowback", "back", "M89,168 L111,168 L111,196 L89,196 Z"),
	...both("lats", "back", "M88,80 C77,85 69,97 69,111 C71,131 79,151 91,165 L98,161 L98,124 Z"),
	...both("triceps", "back", UPPER_ARM),
	...both("shoulders", "back", SHOULDER),
	...both("forearms", "back", FOREARM),
	...both("glutes", "back", "M100,200 L80,202 C71,214 71,232 79,242 C89,248 98,244 100,238 Z"),
	...both("hamstrings", "back", "M73,248 C67,272 67,292 71,306 C79,311 89,311 95,305 C97,285 97,263 96,248 Z"),
	...both("calves", "back", "M69,322 C63,342 65,364 73,378 C79,382 87,380 89,372 C93,354 91,336 89,322 Z"),
	// Trapézy se kreslí nakonec – překrývají horní okraj zad.
	center("traps", "back", "M100,50 L90,60 L74,68 L90,78 L100,120 L110,78 L126,68 L110,60 Z"),
];

/** Části těla bez svalové partie (hlava, krk, pánev, ruce, kolena, chodidla). */
export const BODY_SHAPES: PlacedShape[] = [
	// zepředu
	{ side: "front", mirrored: false, shape: ellipse(100, 29, 19, 19) },
	{ side: "front", mirrored: false, shape: rect(93, 46, 14, 16, 3) },
	{ side: "front", mirrored: false, shape: path("M84,198 L116,198 L112,214 L88,214 Z") },
	...[ellipse(47, 213, 7, 11), ellipse(81, 313, 7, 7), ellipse(78, 404, 11, 6)].flatMap((shape) => [
		{ side: "front" as const, mirrored: false, shape },
		{ side: "front" as const, mirrored: true, shape },
	]),
	// zezadu
	{ side: "back", mirrored: false, shape: ellipse(100, 29, 19, 19) },
	{ side: "back", mirrored: false, shape: rect(93, 46, 14, 10, 3) },
	...[ellipse(47, 213, 7, 11), ellipse(81, 314, 6, 6), path("M76,380 L86,380 L84,398 L78,398 Z"), ellipse(80, 404, 10, 6)].flatMap(
		(shape) => [
			{ side: "back" as const, mirrored: false, shape },
			{ side: "back" as const, mirrored: true, shape },
		],
	),
];

/** Ozdobné dělicí čáry břišních svalů (kreslí se barvou pozadí, neklikací). */
export const ABS_LINES = "M89,138 L111,138 M89,160 L111,160 M89,180 L111,180 M100,116 L100,197";

/** Popisky pod postavami. */
export const FIGURE_LABELS = [
	{ x: SINGLE_WIDTH / 2, text: "front" },
	{ x: BACK_OFFSET + SINGLE_WIDTH / 2, text: inContext("figure", "back") },
];

/** Všechny souřadnice [x, y] z cesty (cesty používají jen absolutní M, L, C, Z). */
export function pathPoints(d: string): [number, number][] {
	const numbers = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
	const points: [number, number][] = [];
	for (let i = 0; i + 1 < numbers.length; i += 2) points.push([numbers[i]!, numbers[i + 1]!]);
	return points;
}
