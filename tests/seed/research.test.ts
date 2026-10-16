import { describe, expect, it } from "vitest";
import { getSource, isSourceId } from "../../src/evidence/sources";
import { EVIDENCE_LEVELS } from "../../src/model/constants";
import { EXERCISE_ROWS } from "../../src/seed/exerciseData";
import { PROGRAM_DATA } from "../../src/seed/programData";
import { EXERCISE_TOPICS, PROGRAM_TOPICS, RESEARCH_TOPICS, researchTopic, topicsForExercise, topicsForProgram } from "../../src/seed/research";

describe("výzkum u cviků a programů", () => {
	it("každé téma má texty a aspoň tři různé existující zdroje", () => {
		expect(new Set(RESEARCH_TOPICS.map((t) => t.id)).size).toBe(RESEARCH_TOPICS.length);
		for (const topic of RESEARCH_TOPICS) {
			for (const text of [topic.title, topic.summary, topic.practical]) expect(text.trim(), topic.id).not.toBe("");
			const ids = topic.studies.map((s) => s.source);
			expect(new Set(ids).size, topic.id).toBe(ids.length);
			expect(ids.length, topic.id).toBeGreaterThanOrEqual(3);
			for (const s of topic.studies) {
				expect(isSourceId(s.source), `${topic.id}: ${s.source}`).toBe(true);
				expect(s.finding.trim(), `${topic.id}: ${s.source}`).not.toBe("");
			}
			expect(EVIDENCE_LEVELS).toContain(topic.evidence);
		}
	});

	it("štítek tématu není silnější než nejsilnější zdroj; metody bez vlastní studie jsou praxe", () => {
		for (const topic of RESEARCH_TOPICS) {
			const levels = topic.studies.map((s) => getSource(s.source).evidence);
			if (topic.evidence !== "practice") expect(levels, topic.id).toContain(topic.evidence);
		}
		expect(researchTopic("frequency_programs")!.evidence).toBe("practice");
	});

	it("přiřazené cviky a programy existují v knihovně", () => {
		const exercises = new Set(EXERCISE_ROWS.map((e) => e.id));
		for (const [id, ids] of Object.entries(EXERCISE_TOPICS)) {
			expect(researchTopic(id), id).toBeDefined();
			for (const exercise of ids) expect(exercises, `${id}: ${exercise}`).toContain(exercise);
		}
		const programs = new Set(PROGRAM_DATA.map((p) => p.id));
		for (const [program, ids] of Object.entries(PROGRAM_TOPICS)) {
			expect(programs, program).toContain(program);
			for (const id of ids) expect(researchTopic(id), `${program}: ${id}`).toBeDefined();
		}
	});

	it("témata ke cviku: konkrétní a u silových i obecné principy", () => {
		expect(topicsForExercise("bench press", "strength").map((t) => t.id)).toEqual(["push", "training"]);
		expect(topicsForExercise("Plank", "calisthenics").map((t) => t.id)).toEqual(["core", "training"]);
		expect(topicsForExercise("Běh", "cardio")).toEqual([]);
		expect(topicsForProgram("Od gauče k 5 km").map((t) => t.id)).toEqual(["novice_running"]);
		expect(topicsForProgram("Vlastní program")).toEqual([]);
	});

	it("chyby v podkladu jsou opravené podle Crossref", () => {
		// Podklad uváděl „Granero-Gallegos 2020“ a tři autory u Hewit 2018.
		expect(getSource("medellinRuiz2020").citation).toMatch(/^Medellín Ruiz/);
		expect(getSource("hewit2018").citation).toMatch(/^Hewit J\. K\. \(2018\)/);
	});
});
