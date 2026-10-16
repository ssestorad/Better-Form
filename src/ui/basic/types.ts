export interface EntryTestItem {
	exercise: string;
	/** Výdrže se testují v sekundách. */
	unit: "reps" | "sec";
	/** Poslední maximum, např. „minule 30 (út 29. 9.)“. */
	last?: string;
}

export interface EntryTestResult {
	exercise: string;
	unit: "reps" | "sec";
	value: number;
}
