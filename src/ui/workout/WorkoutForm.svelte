<script lang="ts">
	// Zápis tréninku (SPEC 5.3). Ctrl+Enter uloží; samotný Enter formulář neukládá.
	import { t } from "../../i18n";
	import { untrack } from "svelte";
	import { sessionLoad } from "../../calc/load";
	import type { BarbellSettings } from "../../calc/plates";
	import { formatPace, paceSecondsPerKm } from "../../calc/performance";
	import {
		BODY_SIDES,
		BODY_SIDE_LABELS,
		MUSCLES,
		MUSCLE_LABELS,
		RUN_TYPES,
		SPORT_LABELS,
		SWIM_STYLES,
		type BodySide,
		type MuscleId,
		type ExerciseCategory,
		type RunType,
		type Sport,
		type SwimStyle,
	} from "../../model/constants";
	import { RUN_TYPE_LABELS, SWIM_STYLE_LABELS } from "../../data/workoutBlock";
	import { icon } from "../actions";
	import ClockInput from "../components/ClockInput.svelte";
	import NumInput from "../components/NumInput.svelte";
	import RpePicker from "../components/RpePicker.svelte";
	import { formatNumber } from "../format";
	import BlockEditor from "./BlockEditor.svelte";
	import { emptyBlock, validateDraft, type WorkoutDraft } from "./draft";
	import ExercisePicker from "./ExercisePicker.svelte";
	import type { WorkoutFormApi } from "./api";
	import type { ExerciseOption } from "./search";

	interface Props {
		initial: WorkoutDraft;
		sports: Sport[];
		bells: number[];
		/** Osa a kotouče pro kalkulačku kotoučů; chybí = kalkulačka se neukáže. */
		barbell?: BarbellSettings;
		api: WorkoutFormApi;
	}
	let { initial, sports, bells, barbell, api }: Props = $props();

	const SPORT_ICONS: Record<Sport, string> = {
		run: "footprints",
		strength: "dumbbell",
		swim: "waves",
		calisthenics: "person-standing",
		kettlebell: "weight",
		rope: "repeat",
		other: "activity",
	};
	const PREFERRED: Record<Sport, ExerciseCategory[]> = {
		run: ["cardio"],
		strength: ["strength"],
		swim: ["cardio"],
		calisthenics: ["calisthenics"],
		kettlebell: ["kettlebell"],
		rope: ["cardio"],
		other: [],
	};

	const initialSnapshot = untrack(() => JSON.stringify(initial));
	let draft = $state<WorkoutDraft>(untrack(() => structuredClone($state.snapshot(initial) as WorkoutDraft)));
	let options = $state<ExerciseOption[]>(untrack(() => api.exercises()));
	// Aktivní boty; boty už zapsané u tréninku zůstanou v nabídce, i když jsou vyřazené.
	const shoeOptions = untrack(() => {
		const names = api.shoes();
		const current = initial.run.shoes;
		return current && !names.includes(current) ? [...names, current] : names;
	});
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let templateName = $state<string | null>(null);

	// Bolest při tréninku (SPEC 5.3): "" = žádná, "+" = nová, jinak název existujícího záznamu.
	const NEW_PAIN = "+";
	const PAIN_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
	const openPains = untrack(() => api.pains());
	let painChoice = $state("");
	let painLevel = $state(3);
	let painName = $state("");
	let painMuscle = $state<MuscleId>("quads");
	let painSide = $state<BodySide | "">("");

	function choosePain(choice: string) {
		painChoice = choice;
		const existing = openPains.find((p) => p.name === choice);
		if (existing && existing.level > 0) painLevel = existing.level;
	}

	$effect(() => {
		if (painChoice === "") draft.painReport = undefined;
		else if (painChoice === NEW_PAIN) {
			draft.painReport = { level: painLevel, draft: { name: painName.trim(), muscle: painMuscle, side: painSide || undefined } };
		} else draft.painReport = { existing: painChoice, level: painLevel };
	});
	const painError = $derived(painChoice === NEW_PAIN && painName.trim() === "" ? t("Describe what hurts.") : "");

	const errors = $derived(validateDraft(draft));
	const valid = $derived(Object.keys(errors).length === 0 && painError === "");
	const hasBlocks = $derived(draft.sport !== "run" && draft.sport !== "swim");
	const runDuration = $derived(
		draft.run.moving_time_s !== undefined && !Number.isNaN(draft.run.moving_time_s)
			? Math.round(draft.run.moving_time_s / 60)
			: undefined,
	);
	const effectiveDuration = $derived(draft.duration_min ?? (draft.sport === "run" ? runDuration : undefined));
	const load = $derived(sessionLoad(draft.rpe, effectiveDuration));
	const pace = $derived(paceSecondsPerKm(draft.run.distance_km, draft.run.moving_time_s));
	const sportChoices = $derived(sports.includes(draft.sport) ? sports : [...sports, draft.sport]);

	$effect(() => {
		const snapshot = JSON.stringify(draft);
		untrack(() => api.setDirty(snapshot !== initialSnapshot));
	});

	function addExercise(name: string) {
		draft.blocks.push(api.newBlock(name, draft.date));
	}

	async function createExercise(name: string) {
		try {
			await api.createExercise(name, draft.sport);
			const category = PREFERRED[draft.sport][0] ?? "strength";
			options = [...options, { name, aliases: [], category }];
		} catch (err) {
			saveError = err instanceof Error ? err.message : String(err);
		}
	}

	function move(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= draft.blocks.length) return;
		const [block] = draft.blocks.splice(index, 1);
		draft.blocks.splice(target, 0, block!);
	}

	async function save() {
		if (!valid || saving) return;
		saving = true;
		saveError = null;
		try {
			await api.save($state.snapshot(draft) as WorkoutDraft);
		} catch (err) {
			saveError = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}

	async function saveTemplate() {
		if (!templateName?.trim()) return;
		saveError = null;
		try {
			await api.saveTemplate($state.snapshot(draft) as WorkoutDraft, templateName.trim());
			templateName = null;
		} catch (err) {
			saveError = err instanceof Error ? err.message : String(err);
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			void save();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="bf-workout" onkeydown={onKeydown}>
	<div class="bf-sports" role="group" aria-label={t("Sport")}>
		{#each sportChoices as sport (sport)}
			<button
				type="button"
				class="bf-sport"
				class:is-selected={draft.sport === sport}
				aria-pressed={draft.sport === sport}
				onclick={() => (draft.sport = sport)}
			>
				<span class="bf-sport-icon" use:icon={SPORT_ICONS[sport]}></span>
				<span>{SPORT_LABELS[sport]}</span>
			</button>
		{/each}
	</div>

	<div class="bf-grid-3">
		<label class="bf-field">
			<span class="bf-field-label">{t("Date")}</span>
			<input type="date" class:bf-invalid={!!errors.date} value={draft.date} onchange={(e) => (draft.date = e.currentTarget.value)} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Start")}</span>
			<input type="time" value={draft.start ?? ""} oninput={(e) => (draft.start = e.currentTarget.value || undefined)} />
		</label>
		<label class="bf-field">
			<span class="bf-field-label">{t("Name")}</span>
			<input type="text" placeholder={t("e.g. Push")} value={draft.title ?? ""} oninput={(e) => (draft.title = e.currentTarget.value || undefined)} />
		</label>
	</div>

	{#if draft.sport === "run"}
		<fieldset>
			<legend>{t("Run{v}", { v: draft.source === "strava" ? t(" – from Strava") : draft.source === "file" ? t(" – from a file") : "" })}</legend>
			<div class="bf-grid-3">
				<label class="bf-field"><span class="bf-field-label">{t("Distance (km)")}</span><NumInput bind:value={draft.run.distance_km} label={t("Distance (km)")} decimals error={errors["run.distance_km"]} /></label>
				<label class="bf-field"><span class="bf-field-label">{t("Run time (h:mm:ss)")}</span><ClockInput bind:value={draft.run.moving_time_s} label={t("Run time")} placeholder="55:10" error={errors["run.moving_time_s"]} /></label>
				<div class="bf-field"><span class="bf-field-label">{t("Pace")}</span><div class="bf-readout">{pace !== null ? formatPace(pace) : "–"}</div></div>
				<label class="bf-field"><span class="bf-field-label">{t("Average heart rate")}</span><NumInput bind:value={draft.run.avg_hr} label={t("Average heart rate")} error={errors["run.avg_hr"]} /></label>
				<label class="bf-field"><span class="bf-field-label">{t("Maximum heart rate")}</span><NumInput bind:value={draft.run.max_hr} label={t("Maximum heart rate")} error={errors["run.max_hr"]} /></label>
				<label class="bf-field"><span class="bf-field-label">{t("Elevation gain (m)")}</span><NumInput bind:value={draft.run.elevation_m} label={t("Elevation gain (m)")} error={errors["run.elevation_m"]} /></label>
				<label class="bf-field">
					<span class="bf-field-label">{t("Run type")}</span>
					<select class="dropdown" value={draft.run.type ?? ""} onchange={(e) => (draft.run.type = (e.currentTarget.value || undefined) as RunType | undefined)}>
						<option value="">–</option>
						{#each RUN_TYPES as x (x)}<option value={x}>{RUN_TYPE_LABELS[x]}</option>{/each}
					</select>
				</label>
				{#if shoeOptions.length > 0}
					<label class="bf-field">
						<span class="bf-field-label">{t("Shoes")}</span>
						<select class="dropdown" value={draft.run.shoes ?? ""} onchange={(e) => (draft.run.shoes = e.currentTarget.value || undefined)}>
							<option value="">–</option>
							{#each shoeOptions as s (s)}<option value={s}>{s}</option>{/each}
						</select>
					</label>
				{/if}
			</div>
		</fieldset>
	{:else if draft.sport === "swim"}
		<fieldset>
			<legend>{t("Swim")}</legend>
			<div class="bf-grid-3">
				<label class="bf-field"><span class="bf-field-label">{t("Distance (m)")}</span><NumInput bind:value={draft.swim.distance_m} label={t("Distance (m)")} error={errors["swim.distance_m"]} /></label>
				<label class="bf-field">
					<span class="bf-field-label">{t("Stroke")}</span>
					<select class="dropdown" value={draft.swim.style ?? ""} onchange={(e) => (draft.swim.style = (e.currentTarget.value || undefined) as SwimStyle | undefined)}>
						<option value="">–</option>
						{#each SWIM_STYLES as s (s)}<option value={s}>{SWIM_STYLE_LABELS[s]}</option>{/each}
					</select>
				</label>
				<label class="bf-field"><span class="bf-field-label">{t("Pool (m)")}</span><NumInput bind:value={draft.swim.pool_m} label={t("Pool length (m)")} error={errors["swim.pool_m"]} /></label>
			</div>
		</fieldset>
	{:else if draft.sport === "rope"}
		<fieldset>
			<legend>{t("Jump rope")}</legend>
			<div class="bf-grid-3">
				<label class="bf-field"><span class="bf-field-label">{t("Total jumps")}</span><NumInput bind:value={draft.rope.jumps} label={t("Number of jumps")} error={errors["rope.jumps"]} /></label>
			</div>
			<p class="bf-hint">{t("You can log intervals and jump variations as blocks below (e.g. “For time” or “Sets” with seconds).")}</p>
		</fieldset>
	{/if}

	{#if hasBlocks}
		<div class="bf-blocks">
			{#each draft.blocks as block, i (block.id)}
				<BlockEditor
					{block}
					index={i}
					count={draft.blocks.length}
					{errors}
					{options}
					preferred={PREFERRED[draft.sport]}
					{bells}
					{barbell}
					info={api.info}
					lastText={(exercise) => api.lastText(exercise, draft.date)}
					onMove={(delta) => move(i, delta)}
					onRemove={() => draft.blocks.splice(i, 1)}
					onReplace={(next) => (draft.blocks[i] = next)}
					onCreateExercise={(name) => void createExercise(name)}
					onShowExercise={api.showExercise}
				/>
			{/each}
			<div class="bf-add-block">
				<ExercisePicker
					{options}
					preferred={PREFERRED[draft.sport]}
					onSelect={addExercise}
					onCreate={async (name) => {
						await createExercise(name);
						addExercise(name);
					}}
				/>
				<button type="button" onclick={() => draft.blocks.push(emptyBlock("amrap"))}>{t("+ AMRAP")}</button>
				<button type="button" onclick={() => draft.blocks.push(emptyBlock("complex"))}>{t("+ Complex")}</button>
			</div>
		</div>
	{/if}

	<fieldset>
		<legend>{t("Load")}</legend>
		<div class="bf-grid-3">
			<label class="bf-field">
				<span class="bf-field-label">{t("Duration (min)")}</span>
				<NumInput bind:value={draft.duration_min} label={t("Workout duration (min)")} placeholder={runDuration !== undefined ? String(runDuration) : ""} error={errors.duration_min} />
			</label>
			<div class="bf-field bf-load">
				<span class="bf-field-label">{t("Load (RPE × min)")}</span>
				<div class="bf-readout">{load !== null ? formatNumber(load, 0) : "–"}</div>
			</div>
		</div>
		<RpePicker bind:value={draft.rpe} error={errors.rpe} />
	</fieldset>

	<label class="bf-field">
		<span class="bf-field-label">{t("Note")}</span>
		<textarea rows="2" value={draft.notes ?? ""} oninput={(e) => (draft.notes = e.currentTarget.value || undefined)}></textarea>
	</label>

	<div class="bf-workout-pain">
		<label class="bf-field">
			<span class="bf-field-label">
				{t("Pain during training")}
				{#if draft.pain.length > 0}<span class="bf-hint">{t("logged: {v}", { v: draft.pain.join(", ") })}</span>{/if}
			</span>
			<select value={painChoice} onchange={(e) => choosePain(e.currentTarget.value)}>
				<option value="">{t("none")}</option>
				{#each openPains as p (p.name)}
					<option value={p.name}>{t("{p_name} (last {level}/10)", { p_name: p.name, level: p.level })}</option>
				{/each}
				<option value={NEW_PAIN}>{t("new pain…")}</option>
			</select>
		</label>
		{#if painChoice !== ""}
			<div class="bf-grid-3">
				<label class="bf-field">
					<span class="bf-field-label">{t("Intensity")}</span>
					<select bind:value={painLevel}>
						{#each PAIN_LEVELS as l (l)}
							<option value={l}>{l}/10</option>
						{/each}
					</select>
				</label>
				{#if painChoice === NEW_PAIN}
					<label class="bf-field">
						<span class="bf-field-label">{t("Nearest muscle group")}</span>
						<select bind:value={painMuscle}>
							{#each MUSCLES as m (m)}
								<option value={m}>{MUSCLE_LABELS[m]}</option>
							{/each}
						</select>
					</label>
					<label class="bf-field">
						<span class="bf-field-label">{t("Side")}</span>
						<select bind:value={painSide}>
							<option value="">{t("not specified")}</option>
							{#each BODY_SIDES as s (s)}
								<option value={s}>{BODY_SIDE_LABELS[s]}</option>
							{/each}
						</select>
					</label>
				{/if}
			</div>
			{#if painChoice === NEW_PAIN}
				<label class="bf-field">
					<span class="bf-field-label">{t("What hurts")}</span>
					<input type="text" bind:value={painName} placeholder={t("e.g. right knee")} />
				</label>
			{/if}
			<p class="bf-hint">
				{t("After saving, the intensity is added to your pain log (Body tab). If the pain is 4/10 or more or lasts longer than a week, see a physiotherapist or doctor.")}
			</p>
			{#if painError}<p class="bf-error">{painError}</p>{/if}
		{/if}
	</div>

	{#if saveError}<p class="bf-error">{saveError}</p>{/if}
	{#if !valid}<p class="bf-error">{t("Fix the highlighted fields.")}</p>{/if}

	<div class="bf-form-footer">
		<div class="bf-template-save">
			{#if templateName === null}
				{#if hasBlocks}
					<button type="button" onclick={() => (templateName = draft.title ?? "")}>{t("Save as template")}</button>
				{/if}
			{:else}
				<input
					type="text"
					placeholder={t("Template name")}
					value={templateName}
					oninput={(e) => (templateName = e.currentTarget.value)}
					onkeydown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							void saveTemplate();
						}
					}}
				/>
				<button type="button" disabled={!templateName.trim()} onclick={() => void saveTemplate()}>{t("Save template")}</button>
				<button type="button" class="clickable-icon" aria-label={t("Cancel")} onclick={() => (templateName = null)}>×</button>
			{/if}
		</div>
		<div class="bf-form-buttons">
			{#if api.remove}<button type="button" class="mod-warning" onclick={() => void api.remove?.()}>{t("Delete")}</button>{/if}
			<button type="button" onclick={api.cancel}>{t("Cancel")}</button>
			<button type="button" class="mod-cta" disabled={!valid || saving} title={t("Ctrl+Enter")} onclick={() => void save()}>
				{saving ? t("Saving…") : t("Save")}
			</button>
		</div>
	</div>
</div>

<style>
	.bf-workout-pain {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-workout-pain select {
		width: 100%;
	}

	.bf-workout-pain p {
		margin: 0;
	}

	.bf-workout {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
	}

	.bf-sports {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: var(--size-4-1);
	}

	.bf-sport {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--size-4-1);
		height: 34px;
	}

	.bf-sport.is-selected {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.bf-sport-icon {
		display: flex;
	}

	fieldset {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
		margin: 0;
		padding: var(--size-4-3);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
	}

	legend {
		padding: 0 var(--size-4-1);
		font-weight: var(--font-semibold);
	}

	.bf-readout {
		min-height: var(--input-height);
		display: flex;
		align-items: center;
		font-variant-numeric: tabular-nums;
	}

	.bf-blocks {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
	}

	.bf-add-block {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		gap: var(--size-4-2);
	}

	textarea {
		width: 100%;
		resize: vertical;
	}

	.bf-form-footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--size-4-2);
	}

	.bf-template-save,
	.bf-form-buttons {
		display: flex;
		align-items: center;
		gap: var(--size-4-2);
	}
</style>
