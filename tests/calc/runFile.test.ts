import { describe, expect, it } from "vitest";
import {
	describeRunImport,
	fastestSegmentS,
	findSameRecording,
	haversineM,
	localDateTimeOf,
	parseRunFile,
	runFileToWorkout,
	runTotals,
	sportOfFileType,
} from "../../src/calc/runFile";
import type { WorkoutNote } from "../../src/model/types";

// Jeden stupeň zeměpisné šířky na kouli o poloměru 6 371 km = 2π · 6 371 000 / 360 = 111 194,93 m.
const DEG_M = 111194.93;
/** Krok v zeměpisné šířce, který odpovídá právě 100 metrům. */
const STEP = 100 / DEG_M;

/** Bod stopy GPX: `i`-tý bod leží i × 100 m severně od startu. */
function trkpt(i: number, time: string, extra = ""): string {
	return `<trkpt lat="${(50 + i * STEP).toFixed(8)}" lon="14.0000000"><time>${time}</time>${extra}</trkpt>`;
}

const hr = (value: number) => `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${value}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>`;

// Běh 400 m: tři úseky po 100 m za 30 s (3,33 m/s), minuta stání, poslední úsek 100 m za 30 s.
const GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="StravaGPX" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
 <metadata><time>2026-10-04T06:00:00Z</time></metadata>
 <trk>
  <name>Ranní běh &amp; rozklus</name>
  <type>running</type>
  <trkseg>
   ${trkpt(0, "2026-10-04T06:00:00Z", `<ele>200.0</ele>${hr(120)}`)}
   ${trkpt(1, "2026-10-04T06:00:30Z", `<ele>201.0</ele>${hr(140)}`)}
   ${trkpt(2, "2026-10-04T06:01:00Z", `<ele>204.5</ele>${hr(150)}`)}
   ${trkpt(3, "2026-10-04T06:01:30Z", `<ele>203.0</ele>${hr(160)}`)}
   ${trkpt(3, "2026-10-04T06:02:30Z", `<ele>203.5</ele>${hr(130)}`)}
   ${trkpt(4, "2026-10-04T06:03:00Z", `<ele>210.0</ele>${hr(150)}`)}
  </trkseg>
 </trk>
</gpx>`;

// TCX z MapMyRun: vzdálenost od startu u každého bodu, dvě kola.
const TCX = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
 <Activities>
  <Activity Sport="Running">
   <Id>2026-10-03T16:30:00+00:00</Id>
   <Lap StartTime="2026-10-03T16:30:00+00:00">
    <TotalTimeSeconds>300.0</TotalTimeSeconds>
    <DistanceMeters>1000.0</DistanceMeters>
    <Calories>70</Calories>
    <Track>
     <Trackpoint><Time>2026-10-03T16:30:00+00:00</Time><Position><LatitudeDegrees>50.0</LatitudeDegrees><LongitudeDegrees>14.0</LongitudeDegrees></Position><AltitudeMeters>300.0</AltitudeMeters><DistanceMeters>0.0</DistanceMeters><HeartRateBpm><Value>130</Value></HeartRateBpm></Trackpoint>
     <Trackpoint><Time>2026-10-03T16:32:30+00:00</Time><DistanceMeters>500.0</DistanceMeters><HeartRateBpm><Value>150</Value></HeartRateBpm></Trackpoint>
     <Trackpoint><Time>2026-10-03T16:35:00+00:00</Time><DistanceMeters>1000.0</DistanceMeters><HeartRateBpm><Value>160</Value></HeartRateBpm></Trackpoint>
    </Track>
   </Lap>
   <Lap StartTime="2026-10-03T16:35:00+00:00">
    <TotalTimeSeconds>280.0</TotalTimeSeconds>
    <DistanceMeters>1000.0</DistanceMeters>
    <Track>
     <Trackpoint><Time>2026-10-03T16:37:20+00:00</Time><DistanceMeters>1500.0</DistanceMeters><HeartRateBpm><Value>165</Value></HeartRateBpm></Trackpoint>
     <Trackpoint><Time>2026-10-03T16:39:40+00:00</Time><DistanceMeters>2000.0</DistanceMeters><HeartRateBpm><Value>170</Value></HeartRateBpm></Trackpoint>
    </Track>
   </Lap>
  </Activity>
 </Activities>
</TrainingCenterDatabase>`;

describe("čtení GPX a TCX", () => {
	it("GPX: název, typ a body s časem, výškou a tepem", () => {
		const file = parseRunFile(GPX);
		expect(file).toMatchObject({ format: "gpx", name: "Ranní běh & rozklus", type: "running" });
		expect(file.points).toHaveLength(6);
		expect(file.points[0]).toEqual({ timeMs: Date.parse("2026-10-04T06:00:00Z"), lat: 50, lon: 14, ele: 200, hr: 120 });
	});

	it("TCX: typ, body se vzdáleností od startu a součty kol", () => {
		const file = parseRunFile(TCX);
		expect(file).toMatchObject({ format: "tcx", type: "Running", lapTimeS: 580, lapDistanceM: 2000 });
		expect(file.points).toHaveLength(5);
		expect(file.points[0]).toEqual({ timeMs: Date.parse("2026-10-03T16:30:00Z"), lat: 50, lon: 14, ele: 300, hr: 130, distM: 0 });
		expect(file.points[1]).toEqual({ timeMs: Date.parse("2026-10-03T16:32:30Z"), hr: 150, distM: 500 });
	});

	it("jiný soubor se odmítne srozumitelně", () => {
		expect(() => parseRunFile("datum;km\n2026-10-04;5")).toThrow("není GPX, TCX ani FIT");
	});
});

describe("výpočty ze záznamu", () => {
	it("haversine: jeden stupeň šířky = 111 194,93 m", () => {
		expect(haversineM(50, 14, 51, 14)).toBeCloseTo(DEG_M, 1);
		expect(haversineM(50, 14, 50, 14)).toBe(0);
	});

	it("GPX: vzdálenost z poloh, čas v pohybu bez stání, tep, převýšení", () => {
		const totals = runTotals(parseRunFile(GPX));
		expect(totals.distanceM).toBeCloseTo(400, 2);
		// Čtyři úseky po 30 s; minuta stání se nepočítá.
		expect(totals.movingTimeS).toBe(120);
		expect(totals.elapsedS).toBe(180);
		expect(totals.startMs).toBe(Date.parse("2026-10-04T06:00:00Z"));
		// (120 + 140 + 150 + 160 + 130 + 150) / 6 = 141,67
		expect(totals.avgHr).toBeCloseTo(141.667, 3);
		expect(totals.maxHr).toBe(160);
		// 200 → 204,5 (+4,5; krok 1 m se sám nepočítá), pokles o 1,5 m je pod prahem 3 m, 204,5 → 210 (+5,5) = 10 m.
		expect(totals.elevationM).toBeCloseTo(10, 6);
		// Na 1 km záznam nestačí.
		expect(totals.best).toEqual({});
	});

	it("TCX: vzdálenost ze zařízení, nejrychlejší kilometr", () => {
		const totals = runTotals(parseRunFile(TCX));
		expect(totals.distanceM).toBe(2000);
		expect(totals.movingTimeS).toBe(580);
		// Druhý kilometr za 280 s je rychlejší než první za 300 s.
		expect(totals.best).toEqual({ "1k": 280 });
		expect(totals.avgHr).toBe(155);
	});

	it("nejrychlejší úsek: konec se dopočítá mezi body", () => {
		// 0 m v 0 s, 600 m ve 120 s, 1 200 m ve 300 s → nejrychlejších 1 000 m: prvních 600 m (120 s) + 400 m z dalších 600 m (180 s × 400/600 = 120 s) = 240 s.
		expect(fastestSegmentS([0, 600, 1200], [0, 120, 300], 1000)).toBeCloseTo(240, 6);
		expect(fastestSegmentS([0, 600, 1200], [0, 120, 300], 1200)).toBe(300);
		expect(fastestSegmentS([0, 600], [0, 120], 1000)).toBeNull();
	});

	it("bez poloh (běžecký pás) se vezmou součty kol", () => {
		const treadmill = TCX.replace(/<DistanceMeters>\d+\.0<\/DistanceMeters><HeartRateBpm>/g, "<HeartRateBpm>").replace(/<Position>[\s\S]*?<\/Position>/g, "");
		const totals = runTotals(parseRunFile(treadmill));
		expect(totals.distanceM).toBe(2000);
		expect(totals.movingTimeS).toBe(580);
		expect(totals.best).toEqual({});
	});
});

describe("záznam → trénink", () => {
	it("typ aktivity: neznámý je běh, kolo a chůze jsou jiný sport", () => {
		expect(sportOfFileType(undefined)).toBe("run");
		expect(sportOfFileType("running")).toBe("run");
		expect(sportOfFileType("9")).toBe("run");
		expect(sportOfFileType("TrailRun")).toBe("run");
		expect(sportOfFileType("Biking")).toBe("other");
		expect(sportOfFileType("1")).toBe("other");
		expect(sportOfFileType("walking")).toBe("other");
		expect(sportOfFileType("Swimming")).toBe("swim");
	});

	it("místní datum a čas: posun od UTC může změnit i den", () => {
		expect(localDateTimeOf(Date.parse("2026-10-04T06:00:00Z"), 120)).toEqual({ date: "2026-10-04", start: "08:00" });
		expect(localDateTimeOf(Date.parse("2026-10-03T22:30:00Z"), 120)).toEqual({ date: "2026-10-04", start: "00:30" });
		expect(localDateTimeOf(Date.parse("2026-01-10T00:30:00Z"), -300)).toEqual({ date: "2026-01-09", start: "19:30" });
	});

	it("GPX ze Stravy → běh k doplnění", () => {
		expect(runFileToWorkout(parseRunFile(GPX), 120, 1)).toEqual({
			forma: "workout",
			schema: 1,
			date: "2026-10-04",
			start: "08:00",
			sport: "run",
			source: "file",
			title: "Ranní běh & rozklus",
			duration_min: 2,
			run: { distance_km: 0.4, moving_time_s: 120, avg_hr: 142, max_hr: 160, elevation_m: 10 },
			blocks: [],
			pain: [],
		});
	});

	it("TCX z MapMyRun → běh s nejrychlejším kilometrem", () => {
		const note = runFileToWorkout(parseRunFile(TCX), 120, 1);
		expect(note).toMatchObject({ date: "2026-10-03", start: "18:30", sport: "run", source: "file", duration_min: 10 });
		expect(note.title).toBeUndefined();
		expect(note.run).toEqual({ distance_km: 2, moving_time_s: 580, avg_hr: 155, max_hr: 170, best_s: { "1k": 280 } });
	});

	it("jiný sport dostane jen délku; trasa bez časů se odmítne", () => {
		const ride = runFileToWorkout(parseRunFile(GPX.replace("<type>running</type>", "<type>cycling</type>")), 120, 1);
		expect(ride).toMatchObject({ sport: "other", duration_min: 2, title: "Ranní běh & rozklus" });
		expect(ride.run).toBeUndefined();
		const route = GPX.replace(/<time>[^<]*<\/time>/g, "");
		expect(() => runFileToWorkout(parseRunFile(route), 120, 1)).toThrow("nejsou časy");
	});
});

describe("duplicity a hlášení", () => {
	const imported = runFileToWorkout(parseRunFile(TCX), 120, 1);
	const run = (partial: Partial<WorkoutNote>): WorkoutNote => ({ forma: "workout", schema: 1, date: "2026-10-03", sport: "run", source: "file", blocks: [], pain: [], ...partial });

	it("tentýž záznam: stejný den, start do 2 minut a vzdálenost do 3 %", () => {
		expect(findSameRecording(imported, [run({ start: "18:31", run: { distance_km: 2.04 } })])).toBe(0);
		expect(findSameRecording(imported, [run({ source: "strava", strava_id: 5, start: "18:30", run: { distance_km: 2 } })])).toBe(0);
		expect(findSameRecording(imported, [run({ start: "18:40", run: { distance_km: 2 } })])).toBe(-1);
		expect(findSameRecording(imported, [run({ start: "18:30", run: { distance_km: 2.2 } })])).toBe(-1);
		expect(findSameRecording(imported, [run({ date: "2026-10-02", start: "18:30", run: { distance_km: 2 } })])).toBe(-1);
		// Ruční zápis není duplicita – s tím se import slučuje.
		expect(findSameRecording(imported, [run({ source: "manual", start: "18:30", run: { distance_km: 2 } })])).toBe(-1);
	});

	it("hlášení po importu", () => {
		expect(describeRunImport({ created: 1, merged: 0, duplicates: 0, withoutHr: 0, failed: [] })).toBe("Import ze souboru – 1 nový trénink.\nDoplň RPE, typ běhu a boty – běhy jsou v seznamu k doplnění.");
		expect(describeRunImport({ created: 3, merged: 1, duplicates: 2, withoutHr: 0, failed: [{ name: "trasa.gpx", reason: "V souboru nejsou časy." }] })).toBe(
			"Import ze souboru – nových tréninků: 3, sloučeno s ručním zápisem: 1, už v deníku: 2.\nDoplň RPE, typ běhu a boty – běhy jsou v seznamu k doplnění.\ntrasa.gpx: V souboru nejsou časy.",
		);
		expect(describeRunImport({ created: 0, merged: 0, duplicates: 1, withoutHr: 0, failed: [] })).toBe("Import ze souboru – už v deníku: 1.");
		expect(describeRunImport({ created: 0, merged: 0, duplicates: 0, withoutHr: 0, failed: [] })).toBe("Import ze souboru: nic nového.");
		// Soubor bez tepu (např. záznam z mobilu bez hrudního pásu) – říct to, ať to nevypadá jako chyba importu.
		expect(describeRunImport({ created: 1, merged: 0, duplicates: 0, withoutHr: 1, failed: [] }).split("\n")[2]).toBe(
			"Soubor neobsahuje tep – aplikace ho k aktivitě nemá, nebo ho do exportu nezapsala. Tep jde doplnit ručně.",
		);
		expect(describeRunImport({ created: 2, merged: 1, duplicates: 0, withoutHr: 1, failed: [] }).split("\n")[2]).toContain("Soubor neobsahuje tep (1×)");
	});
});

describe("kadence", () => {
	const cad = (value: number) => `<extensions><gpxtpx:TrackPointExtension><gpxtpx:cad>${value}</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions>`;

	it("GPX: průměr bodů s kadencí za jednu nohu × 2; stání (0) se nepočítá", () => {
		const gpx = `<gpx><trk><trkseg>${trkpt(0, "2026-10-04T06:00:00Z", cad(0))}${trkpt(1, "2026-10-04T06:00:30Z", cad(84))}${trkpt(2, "2026-10-04T06:01:00Z", cad(86))}</trkseg></trk></gpx>`;
		// (84 + 86) / 2 = 85 za jednu nohu → 170 kroků/min
		expect(runFileToWorkout(parseRunFile(gpx), 0).run?.cadence_spm).toBe(170);
	});

	it("TCX: RunCadence z rozšíření Garminu", () => {
		const point = (time: string, m: number, value: number) =>
			`<Trackpoint><Time>${time}</Time><DistanceMeters>${m}</DistanceMeters><Extensions><ns3:TPX><ns3:RunCadence>${value}</ns3:RunCadence></ns3:TPX></Extensions></Trackpoint>`;
		const tcx = `<TrainingCenterDatabase><Activities><Activity Sport="Running"><Lap><Track>${point("2026-10-04T06:00:00Z", 0, 88)}${point("2026-10-04T06:01:00Z", 250, 90)}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
		expect(runFileToWorkout(parseRunFile(tcx), 0).run?.cadence_spm).toBe(178);
	});

	it("soubor bez kadence pole nemá", () => {
		expect(runFileToWorkout(parseRunFile(GPX), 0).run?.cadence_spm).toBeUndefined();
	});
});
