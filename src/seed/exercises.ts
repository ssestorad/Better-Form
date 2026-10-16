// Předplněná knihovna cviků (SPEC 3, 13 – fáze 1). Vytvoří se jen poznámky,
// které ve vaultu ještě nejsou; existující se nikdy nepřepisují.
//
// Podíl tělesné hmotnosti (`bodyweight_fraction`, SPEC 8.5): u kliků 0,64
// podle Ebben 2011 (výzkum). Ostatní hodnoty jsou orientační odhady (praxe) –
// proto u nich chybí `bodyweight_fraction_source`. Uživatel si je může upravit.

import { SCHEMA_VERSION, type ExerciseCategory, type ExerciseKind, type ExerciseMeasure, type MuscleId } from "../model/constants";
import type { ExerciseNote } from "../model/types";
import { MORE_EXERCISES } from "./exercisesMore";
import { bullets, EXERCISE_TEXTS } from "./exerciseTexts";
import { progressionFor } from "./skills";
import { getLanguage, type Language } from "../i18n";
import { EXERCISES_EN } from "./en/exercises";

export interface ExerciseRow {
	name: string;
	aliases: string[];
	category: ExerciseCategory;
	kind: ExerciseKind;
	measure: ExerciseMeasure;
	primary: MuscleId[];
	secondary: MuscleId[];
	bw?: number;
}

const BASE_ROWS: ExerciseRow[] = [
	// ---------- Posilovna ----------
	{ name: "Bench press", aliases: ["Tlak na lavici", "Benchpress"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["chest"], secondary: ["triceps", "shoulders"] },
	{ name: "Tlak na šikmé lavici", aliases: ["Incline bench press"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["chest", "shoulders"], secondary: ["triceps"] },
	{ name: "Tlak s jednoručkami na lavici", aliases: ["Dumbbell bench press"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["chest"], secondary: ["triceps", "shoulders"] },
	{ name: "Rozpažování s jednoručkami", aliases: ["Dumbbell fly"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["chest"], secondary: ["shoulders"] },
	{ name: "Tlak nad hlavu", aliases: ["Overhead press", "OHP", "Military press"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["shoulders"], secondary: ["triceps", "traps", "abs"] },
	{ name: "Tlak s jednoručkami vsedě", aliases: ["Dumbbell shoulder press"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["shoulders"], secondary: ["triceps"] },
	{ name: "Upažování", aliases: ["Lateral raise"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["shoulders"], secondary: ["traps"] },
	{ name: "Face pull", aliases: ["Přítahy lana k obličeji"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["shoulders"], secondary: ["traps"] },
	{ name: "Dřep s činkou", aliases: ["Back squat", "Squat"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["quads", "glutes"], secondary: ["hamstrings", "lowback", "abs"] },
	{ name: "Přední dřep", aliases: ["Front squat"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["quads"], secondary: ["glutes", "abs", "lowback"] },
	{ name: "Mrtvý tah", aliases: ["Deadlift"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["hamstrings", "glutes", "lowback"], secondary: ["quads", "traps", "forearms", "lats"] },
	{ name: "Rumunský mrtvý tah", aliases: ["Romanian deadlift", "RDL"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["hamstrings", "glutes"], secondary: ["lowback", "forearms"] },
	{ name: "Výpady", aliases: ["Lunges"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["quads", "glutes"], secondary: ["hamstrings"] },
	{ name: "Bulharský dřep", aliases: ["Bulgarian split squat"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["quads", "glutes"], secondary: ["hamstrings"] },
	{ name: "Leg press", aliases: ["Nožní lis", "Legpress"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["quads", "glutes"], secondary: ["hamstrings"] },
	{ name: "Předkopávání", aliases: ["Leg extension"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["quads"], secondary: [] },
	{ name: "Zakopávání", aliases: ["Leg curl"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["hamstrings"], secondary: ["calves"] },
	{ name: "Hip thrust", aliases: ["Zvedání pánve s činkou"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["glutes"], secondary: ["hamstrings"] },
	{ name: "Výpony na lýtka", aliases: ["Calf raise"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["calves"], secondary: [] },
	{ name: "Přítahy v předklonu", aliases: ["Barbell row", "Bent-over row"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["lats"], secondary: ["biceps", "traps", "lowback", "shoulders"] },
	{ name: "Přítahy jednoručky", aliases: ["Dumbbell row", "One-arm row"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["lats"], secondary: ["biceps", "traps"] },
	{ name: "Stahování kladky", aliases: ["Lat pulldown"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["lats"], secondary: ["biceps"] },
	{ name: "Přítahy kladky vsedě", aliases: ["Seated cable row"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["lats", "traps"], secondary: ["biceps"] },
	{ name: "Krčení ramen", aliases: ["Shrugs"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["traps"], secondary: ["forearms"] },
	{ name: "Bicepsový zdvih", aliases: ["Biceps curl"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["biceps"], secondary: ["forearms"] },
	{ name: "Kladivový zdvih", aliases: ["Hammer curl"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["biceps", "forearms"], secondary: [] },
	{ name: "Stahování kladky na triceps", aliases: ["Triceps pushdown"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["triceps"], secondary: [] },
	{ name: "Francouzský tlak", aliases: ["Skull crusher", "French press"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["triceps"], secondary: [] },
	{ name: "Farmářská chůze", aliases: ["Farmer's walk", "Farmer carry"], category: "strength", kind: "grind", measure: "distance", primary: ["forearms", "traps"], secondary: ["abs", "obliques"] },
	{ name: "Tlak na lavici úzkým úchopem", aliases: ["Close-grip bench press"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["triceps", "chest"], secondary: ["shoulders"] },
	{ name: "Mrtvý tah sumo", aliases: ["Sumo deadlift"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["glutes", "quads", "hamstrings"], secondary: ["lowback", "traps", "forearms"] },
	{ name: "Dobré ráno", aliases: ["Good morning"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["hamstrings", "lowback"], secondary: ["glutes"] },
	{ name: "Rozpažování v předklonu", aliases: ["Reverse fly", "Rear delt fly"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["shoulders"], secondary: ["traps"] },
	{ name: "Předpažování", aliases: ["Front raise"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["shoulders"], secondary: [] },
	{ name: "Stahování protisměrných kladek", aliases: ["Cable crossover", "Cable fly"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["chest"], secondary: ["shoulders"] },
	{ name: "Zkracovačky na kladce", aliases: ["Cable crunch"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["abs"], secondary: [] },
	{ name: "Dřevorubec", aliases: ["Woodchop", "Cable woodchop"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["obliques"], secondary: ["abs", "shoulders"] },
	{ name: "Hyperextenze", aliases: ["Back extension", "Hyperextension"], category: "strength", kind: "grind", measure: "reps_bw", primary: ["lowback"], secondary: ["glutes", "hamstrings"] },
	{ name: "Výstupy na bednu", aliases: ["Step-up", "Box step-up"], category: "strength", kind: "grind", measure: "reps_kg", primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"] },

	// ---------- Kalistenika ----------
	{ name: "Kliky", aliases: ["Push-up", "Push-ups"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["chest"], secondary: ["triceps", "shoulders", "abs"], bw: 0.64 },
	{ name: "Kliky na kolenou", aliases: ["Knee push-up"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["chest"], secondary: ["triceps", "shoulders"], bw: 0.5 },
	{ name: "Kliky o vyvýšení", aliases: ["Incline push-up"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["chest"], secondary: ["triceps", "shoulders"], bw: 0.5 },
	{ name: "Kliky s nohama na vyvýšení", aliases: ["Decline push-up"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["chest", "shoulders"], secondary: ["triceps"], bw: 0.7 },
	{ name: "Diamantové kliky", aliases: ["Diamond push-up"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["triceps", "chest"], secondary: ["shoulders"], bw: 0.65 },
	{ name: "Shyby", aliases: ["Pull-up", "Pull-ups"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["lats"], secondary: ["biceps", "forearms", "traps"], bw: 0.95 },
	{ name: "Shyby podhmatem", aliases: ["Chin-up", "Chin-ups"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["lats", "biceps"], secondary: ["forearms"], bw: 0.95 },
	{ name: "Negativní shyby", aliases: ["Negative pull-up"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["lats"], secondary: ["biceps", "forearms"], bw: 0.95 },
	{ name: "Shyby s gumou", aliases: ["Band-assisted pull-up"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["lats"], secondary: ["biceps", "forearms"], bw: 0.95 },
	{ name: "Australské přítahy", aliases: ["Inverted row", "Australian pull-up"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["lats"], secondary: ["biceps", "traps", "shoulders"], bw: 0.6 },
	{ name: "Muscle-up", aliases: ["Muscle up"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["lats", "triceps"], secondary: ["chest", "biceps", "shoulders"], bw: 0.95 },
	{ name: "Dipy", aliases: ["Dips", "Kliky na bradlech"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["triceps", "chest"], secondary: ["shoulders"], bw: 0.95 },
	{ name: "Dipy na lavici", aliases: ["Bench dips"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["triceps"], secondary: ["shoulders", "chest"], bw: 0.6 },
	{ name: "Kliky ve stojce", aliases: ["Handstand push-up", "HSPU"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["shoulders", "triceps"], secondary: ["traps"], bw: 0.9 },
	{ name: "Dřepy", aliases: ["Air squat", "Bodyweight squat", "Dřep"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["quads", "glutes"], secondary: ["hamstrings"], bw: 0.8 },
	{ name: "Pistol squat", aliases: ["Dřep na jedné noze", "Pistole"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["quads", "glutes"], secondary: ["hamstrings", "abs"], bw: 0.8 },
	{ name: "Výskoky z dřepu", aliases: ["Jump squat"], category: "calisthenics", kind: "ballistic", measure: "reps_bw", primary: ["quads", "glutes"], secondary: ["calves"] },
	{ name: "Most", aliases: ["Glute bridge", "Zvedání pánve"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["glutes"], secondary: ["hamstrings"] },
	{ name: "Sedy-lehy", aliases: ["Sit-up", "Sit-ups", "Sed-leh"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["abs"], secondary: ["obliques"] },
	{ name: "Zkracovačky", aliases: ["Curl-up", "Crunch"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["abs"], secondary: [] },
	{ name: "Zvedání nohou ve visu", aliases: ["Hanging leg raise"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["abs"], secondary: ["obliques", "forearms"] },
	{ name: "Superman", aliases: ["Zvedání trupu na břiše"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["lowback"], secondary: ["glutes"] },
	{ name: "Plank", aliases: ["Prkno"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["abs"], secondary: ["obliques", "shoulders", "lowback"] },
	{ name: "Boční plank", aliases: ["Side plank", "Boční prkno"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["obliques"], secondary: ["abs", "shoulders"] },
	{ name: "Hollow hold", aliases: ["Hollow body hold", "Loďka"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["abs"], secondary: ["obliques"] },
	{ name: "L-sit", aliases: ["L sit"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["abs"], secondary: ["triceps", "shoulders", "quads"] },
	{ name: "Stojka u zdi", aliases: ["Wall handstand"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["shoulders"], secondary: ["triceps", "traps", "abs"] },
	{ name: "Front lever", aliases: ["Přední váha"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["lats", "abs"], secondary: ["shoulders", "lowback"] },
	{ name: "Planche", aliases: ["Planche hold"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["shoulders"], secondary: ["chest", "triceps", "abs"] },
	{ name: "Vis na hrazdě", aliases: ["Dead hang", "Mrtvý vis"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["forearms"], secondary: ["lats", "shoulders"] },
	{ name: "Angličáky", aliases: ["Burpee", "Burpees"], category: "calisthenics", kind: "ballistic", measure: "reps_bw", primary: ["quads", "chest"], secondary: ["shoulders", "triceps", "glutes", "abs"] },
	{ name: "Široké kliky", aliases: ["Wide push-up", "Wide push-ups"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["chest"], secondary: ["shoulders", "triceps"], bw: 0.64 },
	{ name: "Pike kliky", aliases: ["Pike push-up"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["shoulders", "triceps"], secondary: ["chest"] },
	{ name: "Shyby širokým úchopem", aliases: ["Wide pull-up", "Wide-grip pull-up"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["lats"], secondary: ["biceps", "forearms", "traps"], bw: 0.95 },
	{ name: "Zvedání kolen ve visu", aliases: ["Hanging knee raise"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["abs"], secondary: ["obliques", "forearms"] },
	{ name: "Sklapovačky", aliases: ["V-up", "V-ups", "V-sedy"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["abs"], secondary: ["obliques"] },
	{ name: "Kolo vleže", aliases: ["Bicycle crunch", "Bicycle crunches"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["abs", "obliques"], secondary: [] },
	{ name: "Ruský twist", aliases: ["Russian twist", "Russian twists"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["obliques"], secondary: ["abs"] },
	{ name: "Nůžky", aliases: ["Flutter kicks", "Flutterkicks"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["abs"], secondary: ["quads"] },
	{ name: "Nohy nad zemí", aliases: ["Feet six inches", "Six inches", "Leg hold"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["abs"], secondary: ["quads"] },
	{ name: "Plank se salutováním", aliases: ["Salute plank"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["abs"], secondary: ["obliques", "shoulders"] },
	{ name: "Horolezec", aliases: ["Mountain climber", "Mountain climbers"], category: "calisthenics", kind: "ballistic", measure: "reps_bw", primary: ["abs"], secondary: ["shoulders", "quads"] },
	// Stupně žebříčků dovedností (SPEC 5.6); podíly hmotnosti jsou orientační (praxe).
	{ name: "Archer kliky", aliases: ["Archer push-up", "Lukostřelecké kliky"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["chest"], secondary: ["triceps", "shoulders", "abs"], bw: 0.64 },
	{ name: "Kliky na jedné ruce", aliases: ["One-arm push-up", "Jednoruční kliky"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["chest", "triceps"], secondary: ["shoulders", "abs", "obliques"], bw: 0.64 },
	{ name: "Negativní dipy", aliases: ["Negative dip", "Negative dips"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["triceps", "chest"], secondary: ["shoulders"], bw: 0.95 },
	{ name: "Pistol squat s oporou", aliases: ["Assisted pistol squat", "Pistole s oporou"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["quads", "glutes"], secondary: ["hamstrings"], bw: 0.8 },
	{ name: "Stojka", aliases: ["Handstand", "Volná stojka"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["shoulders"], secondary: ["triceps", "traps", "abs", "forearms"] },
	{ name: "L-sit s pokrčenýma nohama", aliases: ["Tuck L-sit", "Tuck sit"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["abs"], secondary: ["triceps", "shoulders"] },
	{ name: "Tuck front lever", aliases: ["Přední váha ve skrčení"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["lats", "abs"], secondary: ["shoulders"] },
	{ name: "Advanced tuck front lever", aliases: ["Přední váha v polovičním skrčení"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["lats", "abs"], secondary: ["shoulders", "lowback"] },
	{ name: "Shyby k hrudníku", aliases: ["Chest-to-bar pull-up", "Vysoké shyby"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["lats"], secondary: ["biceps", "traps", "forearms"], bw: 0.95 },
	{ name: "Negativní muscle-up", aliases: ["Negative muscle-up"], category: "calisthenics", kind: "grind", measure: "reps_bw", primary: ["lats", "triceps"], secondary: ["chest", "biceps", "shoulders"], bw: 0.95 },
	{ name: "Planche lean", aliases: ["Náklon do planche"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["shoulders"], secondary: ["chest", "triceps", "abs"] },
	{ name: "Tuck planche", aliases: ["Planche ve skrčení"], category: "calisthenics", kind: "hold", measure: "seconds", primary: ["shoulders"], secondary: ["chest", "triceps", "abs"] },

	// ---------- Kettlebell ----------
	{ name: "Kettlebell swing", aliases: ["Swing", "Švih s kettlebellem"], category: "kettlebell", kind: "ballistic", measure: "reps_kg", primary: ["glutes", "hamstrings"], secondary: ["lowback", "abs", "forearms"] },
	{ name: "Kettlebell swing jednoruč", aliases: ["One-arm swing", "Jednoruční swing"], category: "kettlebell", kind: "ballistic", measure: "reps_kg", primary: ["glutes", "hamstrings"], secondary: ["lowback", "obliques", "forearms"] },
	{ name: "Turecký vztyk", aliases: ["Turkish get-up", "TGU", "Get-up"], category: "kettlebell", kind: "grind", measure: "reps_kg", primary: ["shoulders", "abs"], secondary: ["obliques", "glutes", "triceps", "quads"] },
	{ name: "Goblet dřep", aliases: ["Goblet squat"], category: "kettlebell", kind: "grind", measure: "reps_kg", primary: ["quads", "glutes"], secondary: ["abs"] },
	{ name: "Kettlebell clean", aliases: ["Clean", "Nadhoz"], category: "kettlebell", kind: "ballistic", measure: "reps_kg", primary: ["glutes", "hamstrings"], secondary: ["forearms", "lowback", "shoulders"] },
	{ name: "Kettlebell snatch", aliases: ["Snatch", "Trh"], category: "kettlebell", kind: "ballistic", measure: "reps_kg", primary: ["glutes", "hamstrings", "shoulders"], secondary: ["lowback", "traps", "forearms"] },
	{ name: "Kettlebell tlak", aliases: ["Kettlebell press", "KB press"], category: "kettlebell", kind: "grind", measure: "reps_kg", primary: ["shoulders"], secondary: ["triceps", "abs"] },
	{ name: "Kettlebell přítah", aliases: ["Kettlebell row", "KB row"], category: "kettlebell", kind: "grind", measure: "reps_kg", primary: ["lats"], secondary: ["biceps", "traps"] },
	{ name: "Kettlebell mrtvý tah", aliases: ["Kettlebell deadlift", "KB deadlift"], category: "kettlebell", kind: "grind", measure: "reps_kg", primary: ["glutes", "hamstrings"], secondary: ["lowback", "forearms", "quads"] },
	{ name: "Kettlebell halo", aliases: ["Halo"], category: "kettlebell", kind: "grind", measure: "reps_kg", primary: ["shoulders"], secondary: ["traps", "abs"] },
	{ name: "Kettlebell větrný mlýn", aliases: ["Windmill", "Kettlebell windmill"], category: "kettlebell", kind: "grind", measure: "reps_kg", primary: ["obliques", "shoulders"], secondary: ["hamstrings", "glutes"] },
	{ name: "Kettlebell thruster", aliases: ["Thruster"], category: "kettlebell", kind: "grind", measure: "reps_kg", primary: ["quads", "shoulders"], secondary: ["glutes", "triceps"] },

	// ---------- Kardio ----------
	{ name: "Běh", aliases: ["Run", "Running"], category: "cardio", kind: "grind", measure: "distance", primary: ["quads", "hamstrings", "calves"], secondary: ["glutes"] },
	{ name: "Chůze", aliases: ["Walking", "Rychlá chůze"], category: "cardio", kind: "grind", measure: "distance", primary: ["calves"], secondary: ["quads", "glutes"] },
	{ name: "Plavání", aliases: ["Swimming"], category: "cardio", kind: "grind", measure: "distance", primary: ["lats", "shoulders"], secondary: ["chest", "triceps", "abs"] },
	{ name: "Kolo", aliases: ["Cycling", "Jízda na kole"], category: "cardio", kind: "grind", measure: "distance", primary: ["quads"], secondary: ["glutes", "hamstrings", "calves"] },
	{ name: "Veslování", aliases: ["Rowing", "Veslovací trenažér"], category: "cardio", kind: "grind", measure: "distance", primary: ["lats", "quads"], secondary: ["hamstrings", "glutes", "biceps", "lowback"] },
	{ name: "Švihadlo", aliases: ["Jump rope", "Skákání přes švihadlo"], category: "cardio", kind: "ballistic", measure: "time", primary: ["calves"], secondary: ["shoulders", "forearms"] },
	{ name: "Švihadlo – střídavé skoky", aliases: ["Boxer step", "Alternate foot step", "Běh přes švihadlo"], category: "cardio", kind: "ballistic", measure: "time", primary: ["calves"], secondary: ["quads", "shoulders"] },
	{ name: "Švihadlo – vysoká kolena", aliases: ["High knees", "Švihadlo s vysokými koleny"], category: "cardio", kind: "ballistic", measure: "time", primary: ["calves", "quads"], secondary: ["abs"] },
	{ name: "Švihadlo – křížení", aliases: ["Criss-cross", "Crossover"], category: "cardio", kind: "ballistic", measure: "time", primary: ["calves"], secondary: ["shoulders", "forearms"] },
	{ name: "Dvojšvihy", aliases: ["Double unders", "Double under"], category: "cardio", kind: "ballistic", measure: "reps_bw", primary: ["calves"], secondary: ["shoulders", "forearms", "abs"] },
	{ name: "Sprinty", aliases: ["Sprint", "Sprints"], category: "cardio", kind: "ballistic", measure: "distance", primary: ["hamstrings", "quads", "glutes"], secondary: ["calves"] },
	{ name: "Eliptický trenažér", aliases: ["Elliptical", "Orbitrek"], category: "cardio", kind: "grind", measure: "time", primary: ["quads"], secondary: ["glutes", "hamstrings", "calves"] },

	// ---------- Mobilita ----------
	{ name: "Protažení flexorů kyčle", aliases: ["Hip flexor stretch"], category: "mobility", kind: "hold", measure: "seconds", primary: ["quads"], secondary: ["glutes"] },
	{ name: "Protažení zadní strany stehen", aliases: ["Hamstring stretch"], category: "mobility", kind: "hold", measure: "seconds", primary: ["hamstrings"], secondary: ["calves"] },
	{ name: "Kočka a kráva", aliases: ["Cat-cow", "Kočičí hřbet"], category: "mobility", kind: "grind", measure: "time", primary: ["lowback"], secondary: ["abs"] },
	{ name: "Rotace hrudní páteře", aliases: ["Thoracic rotation"], category: "mobility", kind: "grind", measure: "reps_bw", primary: ["obliques"], secondary: ["lowback", "shoulders"] },
	{ name: "Holubí pozice", aliases: ["Pigeon pose", "Holub"], category: "mobility", kind: "hold", measure: "seconds", primary: ["glutes"], secondary: [] },
	{ name: "Dětská pozice", aliases: ["Child's pose"], category: "mobility", kind: "hold", measure: "seconds", primary: ["lowback"], secondary: ["lats", "shoulders"] },
	{ name: "Protažení prsních svalů", aliases: ["Chest stretch", "Pec stretch"], category: "mobility", kind: "hold", measure: "seconds", primary: ["chest"], secondary: ["shoulders"] },
	{ name: "Protažení lýtek", aliases: ["Calf stretch"], category: "mobility", kind: "hold", measure: "seconds", primary: ["calves"], secondary: [] },
];

/** Cviky, u kterých má podíl tělesné hmotnosti ověřený zdroj. */
const BODYWEIGHT_SOURCES: Record<string, "ebben2011"> = { Kliky: "ebben2011" };

/** Původní knihovna + rozšíření (exercisesMore.ts). */
const ROWS: ExerciseRow[] = [...BASE_ROWS, ...MORE_EXERCISES];

export const SEED_EXERCISES: ExerciseNote[] = ROWS.map((row) => {
	const note: ExerciseNote = {
		forma: "exercise",
		schema: SCHEMA_VERSION,
		name: row.name,
		category: row.category,
		kind: row.kind,
		measure: row.measure,
		muscles: { primary: row.primary, secondary: row.secondary },
		aliases: row.aliases,
	};
	if (row.bw !== undefined) note.bodyweight_fraction = row.bw;
	const source = BODYWEIGHT_SOURCES[row.name];
	if (source) note.bodyweight_fraction_source = source;
	const progression = progressionFor(row.name, "cs");
	if (progression) note.progression = progression;
	const text = EXERCISE_TEXTS[row.name];
	if (text) {
		note.description = text.about;
		note.technique = bullets(text.how);
		note.mistakes = bullets(text.mistakes);
	}
	return note;
});

/**
 * Knihovna v jazyce: anglicky pod anglickým názvem, český název (a ostatní aliasy) zůstane jako alias –
 * odkazy v češtině i staré záznamy tak najdou stejný cvik. Texty a žebříček v tomtéž jazyce.
 */
function localizeExercise(note: ExerciseNote): ExerciseNote {
	const en = EXERCISES_EN[note.name];
	if (!en) return note;
	const out: ExerciseNote = {
		...note,
		name: en.name,
		aliases: [...new Set([note.name, ...note.aliases])].filter((alias) => alias !== en.name),
	};
	if (en.about) out.description = en.about;
	if (en.how) out.technique = bullets(en.how);
	if (en.mistakes) out.mistakes = bullets(en.mistakes);
	const progression = progressionFor(note.name, "en");
	if (progression) out.progression = progression;
	return out;
}

let englishExercises: ExerciseNote[] | null = null;

export function seedExercises(language: Language = getLanguage()): ExerciseNote[] {
	if (language === "cs") return SEED_EXERCISES;
	englishExercises ??= SEED_EXERCISES.map(localizeExercise);
	return englishExercises;
}
