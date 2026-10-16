import { describe, expect, it } from "vitest";
import type { GoalEvaluation } from "../../src/calc/goals";
import { forecastText, formatGoalValue, parseGoalTarget, targetUnit } from "../../src/ui/goals/text";

function evaluation(partial: Partial<GoalEvaluation>): GoalEvaluation {
	return { unit: "kg", direction: "up", target: 100, points: [], current: 94, start: 90, fraction: 0.4, reached: false, status: "on_track", eta: null, perWeek: null, overdue: false, ...partial };
}

describe("texty cílů", () => {
	it("hodnota podle jednotky", () => {
		expect(formatGoalValue(2970, "time")).toBe("49:30");
		expect(formatGoalValue(102.5, "kg")).toBe("102,5 kg");
		expect(formatGoalValue(15, "reps")).toBe("15 opak.");
		expect(formatGoalValue(90, "sec")).toBe("1 min 30 s");
		expect(formatGoalValue(4, "level")).toBe("stupeň 4");
		expect(formatGoalValue(40, "km")).toBe("40 km");
		expect(formatGoalValue(88, "pct")).toBe("88 %");
	});

	it("jednotka podle typu cíle", () => {
		expect(targetUnit("run_time", false)).toBe("time");
		expect(targetUnit("reps_max", true)).toBe("sec");
		expect(targetUnit("reps_max", false)).toBe("reps");
		expect(targetUnit("body_weight", false)).toBe("kg");
	});

	it("zadání cílové hodnoty", () => {
		expect(parseGoalTarget("49:30", "time")).toBe(2970);
		expect(parseGoalTarget("1:45:00", "time")).toBe(6300);
		expect(parseGoalTarget("50", "time")).toBeNull();
		expect(parseGoalTarget("102,5", "kg")).toBe(102.5);
		expect(parseGoalTarget("abc", "kg")).toBeNull();
		expect(parseGoalTarget("0", "reps")).toBeNull();
		expect(parseGoalTarget(" ", "reps")).toBeNull();
	});

	it("předpověď slovy", () => {
		expect(forecastText(evaluation({ eta: "2026-11-13", perWeek: 1 }), "2026-12-31")).toBe("Podle trendu (+1 kg za týden) vyjde splnění na 13. 11. 2026.");
		expect(forecastText(evaluation({ status: "at_risk", eta: "2027-01-15", perWeek: 0.5 }), "2026-12-01")).toBe(
			"Podle trendu (+0,5 kg za týden) vyjde splnění na 15. 1. 2027 – to je po termínu 1. 12. 2026.",
		);
		expect(forecastText(evaluation({ status: "at_risk", perWeek: -1 }), undefined)).toBe("Trend posledních týdnů k cíli nevede (−1 kg za týden).");
		expect(forecastText(evaluation({ unit: "time", direction: "down", status: "on_track", eta: "2026-11-13", perWeek: -20 }), undefined)).toBe(
			"Podle trendu (−20 s za týden) vyjde splnění na 13. 11. 2026.",
		);
		expect(forecastText(evaluation({ status: "no_data" }), undefined)).toContain("Sbírám data");
		expect(forecastText(evaluation({ status: "at_risk", overdue: true }), "2026-09-01")).toContain("Termín už uplynul");
		expect(forecastText(evaluation({ status: "reached", reached: true }), undefined)).toContain("splněný");
		expect(forecastText(evaluation({ status: "no_data", current: null }), undefined)).toContain("Zatím žádný výkon");
	});
});
