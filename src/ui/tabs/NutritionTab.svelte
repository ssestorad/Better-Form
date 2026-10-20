<script lang="ts">
	// Karta Výživa (SPEC 5.9, kap. 11): doporučený denní příjem jako rozsahy, rozpad výpočtu a zdroje.
	import { t } from "../../i18n";
	import {
		CARB_RANGES,
		CUT_PROTEIN_G_PER_KG_FFM,
		DAY_LOAD_LABELS,
		DAY_LOADS,
		INTENSITY_LABELS,
		KCAL_PER_KG,
		PROTEIN_G_PER_KG,
		RMR_FORMULA_LABELS,
		STEP_ANCHORS,
		missingProfile,
		recommendedRmrFormula,
		restingRmr,
		tenHaafOutOfRange,
		type DayLoad,
	} from "../../calc/nutrition";
	import { TREND_MIN_SAMPLES, TREND_MIN_SPAN_DAYS, TREND_WINDOW_DAYS, assessBalance, correctionAdvice, weightPoints, weightTrend } from "../../calc/weight";
	import { MAX_STEPS } from "../../model/parse";
	import { workoutLabel } from "../../data/dayBlock";
	import type { SourceId } from "../../evidence/sources";
	import type { EvidenceLevel } from "../../model/constants";
	import { addDays, toIsoDate } from "../../model/dates";
	import BasisTag from "../components/BasisTag.svelte";
	import { usePlugin } from "../context";
	import { formatCzechDate, formatDays, formatNumber } from "../format";
	import { balanceText, formatWhole, rangeText, trendText } from "../nutrition/text";
	import { researchTopic } from "../../seed/research";
	import ResearchCard from "../components/ResearchCard.svelte";
	import { Notice } from "obsidian";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const todayIso = toIsoDate(new Date());
	let date = $state(todayIso);
	/** Ruční zátěž dne; prázdné = podle zapsaných tréninků. */
	let loadChoice = $state<DayLoad | "">("");

	const ACTIVITY_LABELS = { sedentary: t("sedentary"), light: t("lightly active"), active: t("active") } as const;
	const ACTIVITY_HELP = {
		sedentary: t("you sit most of the day (school, office)"),
		light: t("you're on your feet part of the day or walk a lot"),
		active: t("physical work, on the move most of the day"),
	} as const;
	// Jak přesná je která rovnice (Frankenfield 2005; metaanalýza u sportovců 2023).
	const RMR_PRECISION = {
		mifflin: t("For most people the estimate is within ±10 % of the measured value (Frankenfield 2005)."),
		ten_haaf: t("In athletes about 80 % of estimates are within ±10 % of the measured value."),
		ten_haaf_ffm: t("Estimate from fat-free mass – it also depends on how accurately you know your body fat."),
		cunningham: t("In athletes without a systematic bias, but with more spread than the ten Haaf weight equation; it also depends on how accurate your body fat is."),
	} as const;
	const GOAL_LABELS = { lose: t("lose weight"), maintain: t("maintain"), gain: t("gain") } as const;

	const profile = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		return plugin.nutritionProfile(date);
	});
	// Rovnice, která se k profilu hodí víc než ta zvolená (a kolik by s ní vyšlo); null = zvolená sedí.
	const better = $derived.by(() => {
		void $settingsVersion;
		const formula = recommendedRmrFormula(profile);
		const rmr = formula === plugin.settings.nutrition.rmrFormula ? null : restingRmr(profile, formula);
		return rmr === null ? null : { formula, kcal: rmr.kcal, outside: tenHaafOutOfRange(profile).join(", ") };
	});
	const missing = $derived.by(() => {
		void $settingsVersion;
		return missingProfile(profile, plugin.settings.nutrition.rmrFormula);
	});
	const plan = $derived.by(() => {
		void $indexVersion;
		void $settingsVersion;
		return plugin.nutritionPlan(date, loadChoice === "" ? undefined : loadChoice);
	});
	const eaMin = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.thresholds.eaMinKcalPerKgFfm;
	});
	const kg = $derived(profile.weightKg ?? 0);

	// Co říká váha: trend za 3 týdny proti cíli (SPEC 11.6).
	const trend = $derived.by(() => {
		void $indexVersion;
		return weightTrend(weightPoints(plugin.index.all("day").map((e) => e.note)), date);
	});
	// Co říká výzkum: bílkoviny, hubnutí bez ztráty svalů (jen při cíli zhubnout), kroky, alkohol a pitný režim.
	const topics = $derived(
		["protein_intake", ...(profile.goal === "lose" ? ["fat_loss"] : []), "steps_health", "alcohol", "hydration"].map(researchTopic).filter((x) => x !== undefined),
	);
	const balance = $derived(plan !== null && trend.ready ? assessBalance(trend, profile.goal, plan.goalAdjust) : null);
	// Týdenní kontrola: osobní korekce odhadu výdeje podle váhy (jen pro dnešek, ne při listování).
	const correction = $derived.by(() => {
		void $settingsVersion;
		const n = plugin.settings.nutrition;
		return { kcal: n.correctionKcal, date: n.correctionDate };
	});
	const advice = $derived(
		date === todayIso ? correctionAdvice(balance, correction.kcal, correction.date, todayIso, plan !== null && plan.raisedFor.length > 0) : { kind: "none" as const },
	);
	const signedKcal = (kcal: number) => `${kcal > 0 ? "+" : "−"}${formatWhole(Math.abs(kcal))} kcal`;

	// Kroky zobrazeného dne (vstup pro běžnou aktivitu).
	const daySteps = $derived.by(() => {
		void $indexVersion;
		return plugin.index.day(date)?.note.steps;
	});
	async function saveSteps(raw: string) {
		const text = raw.trim();
		const value = text === "" ? undefined : Number(text);
		if (value !== undefined && !(Number.isFinite(value) && value >= 0 && value <= MAX_STEPS)) {
			new Notice(t("Steps: enter a number from 0 to {MAX_STEPS}.", { MAX_STEPS }));
			return;
		}
		try {
			await plugin.days.setSteps(date, value);
		} catch (err) {
			new Notice(t("Couldn't save steps: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}

	/** Dopředu jde listovat o týden – výživa zná zátěž dne z plánu týdne. */
	const lastDate = addDays(todayIso, 7);
	function shift(days: number) {
		const next = addDays(date, days);
		if (next <= lastDate) {
			date = next;
			loadChoice = "";
		}
	}

	const basis = (sourceIds: SourceId[], evidence: EvidenceLevel) => ({ sourceIds, evidence });
	const perKg = (g: number) => (kg > 0 ? formatNumber(g / kg, 1) : "–");
</script>

<div class="bf-nutri-nav">
	<button type="button" aria-label={t("Previous day")} onclick={() => shift(-1)}>‹</button>
	<span class="bf-nutri-date">{formatCzechDate(date)}</span>
	<button type="button" aria-label={t("Next day")} disabled={date >= lastDate} onclick={() => shift(1)}>›</button>
</div>

{#if plan === null}
	<section class="bf-card">
		<h4>{t("Recommended intake")}</h4>
		<p>{t("Missing from your profile for the calculation:")} <strong>{missing.join(", ")}</strong>.</p>
		<p class="bf-muted bf-small">{t("Weight comes from the latest morning check-in, the other details from your profile.")}</p>
		<button type="button" class="mod-cta" onclick={() => plugin.openOnboarding()}>{t("Complete profile")}</button>
	</section>
{:else}
	<section class="bf-card">
		<h4>{t("Recommended intake")}</h4>
		<p class="bf-nutri-total">{t("about {v} kcal", { v: formatWhole(plan.target) })}</p>
		<p class="bf-small">{t("Range {v} – {v2}.", { v: rangeText(plan.intake, "kcal"), v2: profile.goal === "maintain" ? t("that's how accurate the estimate is; your actual need shows only in your weight trend over 2–3 weeks") : t("depending on the pace you choose") })}</p>
		<p class="bf-muted bf-small">{t("Goal: {v} · weight {v2} kg{v3}", { v: GOAL_LABELS[profile.goal], v2: formatNumber(kg), v3: plan.ffmKg !== null ? t(" · fat-free mass {v} kg", { v: formatNumber(plan.ffmKg) }) : "" })}</p>
		<div class="bf-nutri-macros" role="table" aria-label={t("Macronutrients")}>
			<span role="columnheader"></span><span role="columnheader">{t("g per day")}</span><span role="columnheader">{t("g/kg")}</span><span role="columnheader">{t("Source")}</span>
			<span role="cell">{t("Protein")}</span>
			<span role="cell">{rangeText(plan.protein, "g")}</span>
			<span role="cell">{perKg(plan.protein.min)}–{perKg(plan.protein.max)}</span>
			<span role="cell">
				{#if profile.goal === "lose" && plan.ffmKg !== null}
					<BasisTag basis={basis(["helms2014protein"], "research")} named />
				{:else}
					<BasisTag basis={basis(["morton2018", "nunes2022"], "research")} named />
				{/if}
			</span>
			<span role="cell">{t("Carbohydrates")}</span>
			<span role="cell">{rangeText(plan.carbs, "g")}</span>
			<span role="cell">{perKg(plan.carbs.min)}–{perKg(plan.carbs.max)}</span>
			<span role="cell"><BasisTag basis={basis(["thomas2016"], "consensus")} named /></span>
			<span role="cell">{t("Fats")}</span>
			<span role="cell">{rangeText(plan.fat, "g")}</span>
			<span role="cell">{perKg(plan.fat.min)}–{perKg(plan.fat.max)}</span>
			<span role="cell"><BasisTag basis={basis(["thomas2016"], "consensus")} named /></span>
		</div>
		{#if plan.raisedFor.length > 0}
			<p class="bf-nutri-warning">
				{#if plan.raisedFor.includes("ea")}
					{t("The recommendation is raised so energy availability doesn't drop below {v} kcal per kg of fat-free mass – a prolonged energy shortfall risks health problems and worse performance (IOC REDs 2023, consensus; the threshold is approximate).", { v: formatNumber(eaMin, 0) })}
				{/if}
				{#if plan.raisedFor.includes("rmr")}{t("Intake never drops below resting expenditure.")}{/if}
			</p>
		{/if}
		{#if plan.carbsShort}
			<p class="bf-nutri-warning">
				{t("At this intake the recommended carbohydrates for the day's load don't fit. Protein comes first, then minimum fat (20 % of energy), carbohydrates take the rest.")}
			</p>
		{/if}
	</section>

	<section class="bf-card">
		<h4>{t("What your weight says")}</h4>
		{#if trend.ready}
			<p>{t("Trend over {v} weeks:", { v: TREND_WINDOW_DAYS / 7 })} <strong>{trendText(trend)}</strong>.</p>
			{#if balance}<p>{balanceText(balance, profile.goal, plugin.settings.nutrition.lossRatePctMax)}</p>{/if}
			<p class="bf-muted bf-small">
				{t("A line through {samples} weigh-ins; 1 kg ≈ {v} kcal.", { samples: trend.samples, v: formatWhole(KCAL_PER_KG) })} <BasisTag basis={basis(["practice"], "practice")} />
				{#if profile.goal === "lose"}<BasisTag basis={basis(["helms2014contest"], "research")} named />{/if}
				{t("In the short term, water, salt and carbohydrates change your weight too. Actual expenditure could only be calculated with food logging – this only tells you whether you're eating above or below it.")}
			</p>
			{#if advice.kind === "offer"}
				<div class="bf-nutri-check">
					<p>
						<strong>{t("Weekly check:")}</strong> {t("if you roughly followed the recommendation, your estimated expenditure is about {v} kcal {v2} than it should be. I can shift the recommendation accordingly.", { v: formatWhole(Math.abs(advice.stepKcal)), v2: advice.stepKcal > 0 ? t("lower") : t("higher") })}
						<BasisTag basis={basis(["practice"], "practice")} />
					</p>
					<button type="button" class="mod-cta" onclick={() => void plugin.setNutritionCorrection(advice.totalKcal)}>
						{t("Adjust the recommendation by {v}", { v: signedKcal(advice.stepKcal) })}
					</button>
				</div>
			{:else if advice.kind === "floor"}
				<p class="bf-muted bf-small">
					{t("Based on your weight the recommendation should be lower, but it's already at the floor held by the safeguard (resting expenditure or energy availability) – the plugin won't recommend less. Check whether you're really following the recommendation; if you are and your weight still isn't dropping over time, see a dietitian or doctor.")}
				</p>
			{:else if advice.kind === "locked"}
				<p class="bf-muted bf-small">{t("The correction is fresh – the next check from {v}, once it shows in your weight.", { v: formatCzechDate(advice.until, false) })}</p>
			{/if}
		{:else}
			<p class="bf-muted">
				{t("Collecting data – {samples} of {TREND_MIN_SAMPLES} weigh-ins in the last {v} weeks{v2}. Weigh yourself in the morning after waking up, at least two or three times a week.", { samples: trend.samples, TREND_MIN_SAMPLES, v: TREND_WINDOW_DAYS / 7, v2: trend.samples >= TREND_MIN_SAMPLES
					? t(", spread {spanDays} of {TREND_MIN_SPAN_DAYS} days", { spanDays: trend.spanDays, TREND_MIN_SPAN_DAYS })
					: "" })}
			</p>
			<p class="bf-muted bf-small">{t("Your weight trend will then show whether the recommendation fits or whether you're eating above or below your expenditure.")}</p>
		{/if}
		{#if correction.kcal !== 0}
			<div class="bf-nutri-check">
				<p class="bf-small">
					{t("Personal expenditure correction:")} <strong>{t("{v} a day", { v: signedKcal(correction.kcal) })}</strong>{correction.date ? t(" (since {date})", { date: formatCzechDate(correction.date, false) }) : ""}.
				</p>
				<button type="button" onclick={() => void plugin.setNutritionCorrection(0)}>{t("Remove correction")}</button>
			</div>
		{/if}
	</section>

	<section class="bf-card">
		<h4>{t("How it was calculated")}</h4>
		<dl class="bf-nutri-steps">
			<dt>{t("Resting expenditure")}</dt>
			<dd>
				{t("{v} kcal ({v2}) – {v3}", { v: formatWhole(plan.rmr.kcal), v2: rangeText(plan.rmrRange, "kcal"), v3: RMR_FORMULA_LABELS[plan.rmr.formula] })}
				{#if plan.rmr.formula === "mifflin"}
					<BasisTag basis={basis(["mifflin1990", "frankenfield2005"], "research")} named />
				{:else}
					<BasisTag basis={basis([plan.rmr.formula === "cunningham" ? "cunningham1980" : "tenHaaf2014", "rmrAthletes2023"], "research")} named />
				{/if}
				{#if better !== null}
					<br /><span class="bf-nutri-note bf-small">
						{#if better.formula === "cunningham"}
							{t("You train regularly, but you're outside the group the ten Haaf equation was developed on ({outside}). You've logged your body fat, so the fat-free mass equation (Cunningham 1980) fits: it's based on your body composition and has no systematic bias in athletes.", { outside: better.outside })}
						{:else if better.formula === "mifflin"}
							{t("The ten Haaf equation was developed in athletes aged 18–35 training at least 3 h a week, and it comes out higher for lighter and less-trained people. Your profile is outside this group ({outside}); for the general population Mifflin–St Jeor is more reliable.", { outside: better.outside })}
						{:else}
							{t("Based on your profile and training you belong to the group of regular athletes aged 18–35. In athletes the general-population equation has a systematic bias; ten Haaf & Weijs is more accurate.")}
						{/if}
						{t("With it, resting expenditure would come out at {v} kcal instead of {v2}.", { v: formatWhole(better.kcal), v2: formatWhole(plan.rmr.kcal) })}
						<button type="button" class="bf-link-button" onclick={() => void plugin.setRmrFormula(better.formula)}>{t("Switch")}</button>
						<BasisTag basis={basis(["practice"], "practice")} />
					</span>
				{/if}
				{#if plan.rmr.fallback}<br /><span class="bf-muted bf-small">{t("The chosen equation needs body fat – the weight-based equation was used.")}</span>{/if}
				<br /><span class="bf-muted bf-small">{RMR_PRECISION[plan.rmr.formula]}</span>
			</dd>
			<dt>{t("Everyday activity")}</dt>
			<dd>
				{t("× {v} ({v2})", { v: formatNumber(plan.activityFactor, 2), v2: profile.steps ? t("band {v}", { v: ACTIVITY_LABELS[plan.activity] }) : `${ACTIVITY_LABELS[plan.activity]} – ${ACTIVITY_HELP[plan.activity]}` })} <BasisTag basis={basis(["practice"], "practice")} />
				<br />
				{#if profile.steps}
					<span class="bf-small">
						{t("From steps: {v} {v2} steps outside running.", { v: profile.steps.source === "day" ? t("this day") : t("average over {v} of the last week", { v: formatDays(profile.steps.days) }), v2: formatWhole(profile.steps.steps) })}
						<BasisTag basis={basis(["tudorLocke2004"], "research")} named />
					</span>
				{:else}
					<span class="bf-muted bf-small">{t("From the settings. If you log steps, the level is set from them.")}</span>
				{/if}
				<label class="bf-nutri-stepsfield bf-small">
					<span>{t("Steps on this day")}</span>
					{#key `${date}:${daySteps ?? ""}`}
						<input type="number" inputmode="numeric" min="0" max={MAX_STEPS} step="100" value={daySteps ?? ""} placeholder={t("e.g. 8000")} onchange={(e) => void saveSteps(e.currentTarget.value)} />
					{/key}
				</label>
				<span class="bf-muted bf-small">
					{t("Only a normal day outside training – workouts are added separately below and steps from running are subtracted (about 1,000 per km). The factor is interpolated smoothly from steps: {v} steps = {v2}, {v3} = {v4}, {v5} = {v6}. The step bands come from research; converting them to a factor is an estimate.", { v: formatWhole(STEP_ANCHORS.sedentary), v2: formatNumber(plugin.settings.nutrition.activityFactors.sedentary, 2), v3: formatWhole(STEP_ANCHORS.light), v4: formatNumber(
						plugin.settings.nutrition.activityFactors.light,
						2,
					), v5: formatWhole(STEP_ANCHORS.active), v6: formatNumber(plugin.settings.nutrition.activityFactors.active, 2) })}
				</span>
			</dd>
			<dt>{t("Workouts")}</dt>
			<dd>
				{#if plan.workouts.length === 0}
					{t("no workout logged or planned")}
				{:else}
					<ul class="bf-nutri-list">
						{#each plan.workouts as row, i (i)}
							<li>
								{workoutLabel(row.workout)}{#if row.planned}&nbsp;<span class="bf-tag" title={t("From the weekly plan – the workout isn't logged yet; duration and intensity are planned")}>{t("plan")}</span>{/if}:
								{#if row.energy.netKcal === null}
									<span class="bf-muted">{t("no duration – not counted")}</span>
								{:else}
									{t("+{v} kcal", { v: formatWhole(row.energy.netKcal) })}
									<span class="bf-muted bf-small">
										{row.energy.method === "run_distance"
											? t("(1 kcal × kg × km minus resting expenditure)")
											: t("(MET {v}, intensity {v2} by RPE, code {code})", { v: formatNumber(row.energy.met ?? 0), v2: INTENSITY_LABELS[row.energy.intensity], code: row.energy.code ?? "" })}
									</span>
								{/if}
							</li>
						{/each}
					</ul>
					<BasisTag basis={basis(["margaria1963", "compendium2024"], "research")} named />
					<span class="bf-muted bf-small">{t("Net expenditure above resting is counted; calories from Strava aren't used. Intensity from RPE is an estimate (practice).")}</span>
				{/if}
			</dd>
			{#if plan.correctionKcal !== 0}
				<dt>{t("Correction from weight")}</dt>
				<dd>
					{signedKcal(plan.correctionKcal)} <BasisTag basis={basis(["practice"], "practice")} />
					<br /><span class="bf-muted bf-small">{t("Your personal shift of the expenditure estimate from the weekly weight check; remove it under “What your weight says”.")}</span>
				</dd>
			{/if}
			<dt>{t("Total expenditure")}</dt>
			<dd>{t("{v} kcal ({v2})", { v: formatWhole(plan.tdee), v2: rangeText(plan.tdeeRange, "kcal") })}</dd>
			<dt>{t("By goal")}</dt>
			<dd>
				{#if profile.goal === "lose"}
					{t("deficit {v}–{v2} kcal = pace {v3}–{v4} % of body weight per week", { v: formatWhole(-plan.goalAdjust.max), v2: formatWhole(-plan.goalAdjust.min), v3: formatNumber(plugin.settings.nutrition.lossRatePctMin), v4: formatNumber(
						plugin.settings.nutrition.lossRatePctMax,
					) })}
					<BasisTag basis={basis(["helms2014contest"], "research")} named />
					<span class="bf-muted bf-small">{t("(1 kg ≈ {v} kcal – a rough estimate)", { v: formatWhole(KCAL_PER_KG) })}</span>
				{:else if profile.goal === "gain"}
					{t("surplus {v}–{v2} % of expenditure", { v: formatNumber(plugin.settings.nutrition.gainSurplusPctMin), v2: formatNumber(plugin.settings.nutrition.gainSurplusPctMax) })}
					<BasisTag basis={basis(["practice"], "practice")} />
				{:else}
					{t("maintenance – the range matches the accuracy of the resting expenditure estimate")}
				{/if}
			</dd>
			<dt>{t("Energy availability")}</dt>
			<dd>
				{t("{v} kcal/kg {v2} at the lower end (safeguard from {v3})", { v: formatNumber(plan.energyAvailability, 0), v2: plan.eaUsesBodyWeight ? "hmotnosti" : t("fat-free mass"), v3: formatNumber(eaMin, 0) })}
				<BasisTag basis={basis(["mountjoy2023"], "consensus")} named />
				{#if plan.eaUsesBodyWeight}
					<br /><span class="bf-muted bf-small">{t("Without body fat, your whole body weight is used – a stricter estimate. Enter body fat in the check-in or your profile.")}</span>
				{/if}
			</dd>
			<dt>{t("Daily load")}</dt>
			<dd>
				<select value={loadChoice} onchange={(e) => (loadChoice = e.currentTarget.value as DayLoad | "")} aria-label={t("Daily load")}>
					<option value="">{t("automatic ({v})", { v: DAY_LOAD_LABELS[plan.load] })}</option>
					{#each DAY_LOADS as l (l)}<option value={l}>{DAY_LOAD_LABELS[l]}</option>{/each}
				</select>
				<br /><span class="bf-muted bf-small">
					{t("Carbohydrates {v}–{v2} g/kg. Chosen automatically from the duration and RPE of logged workouts and unfinished items in the weekly plan (the thresholds are an estimate – practice); without a plan, pick the day's load manually in advance.", { v: CARB_RANGES[plan.load][0], v2: CARB_RANGES[plan.load][1] })}
				</span>
			</dd>
			<dt>{t("Protein")}</dt>
			<dd class="bf-muted bf-small">
				{#if profile.goal === "lose" && plan.ffmKg !== null}
					{t("in a deficit {v}–{v2} g per kg of fat-free mass", { v: CUT_PROTEIN_G_PER_KG_FFM[0], v2: CUT_PROTEIN_G_PER_KG_FFM[1] })}
				{:else}
					{t("{v}–{v2} g/kg; spread about 0.3–0.4 g/kg per meal", { v: formatNumber(PROTEIN_G_PER_KG[0]), v2: formatNumber(Math.max(PROTEIN_G_PER_KG[1], plugin.settings.nutrition.proteinGPerKg)) })}
				{/if}
			</dd>
		</dl>
	</section>
{/if}

<section class="bf-card">
	{#each topics as topic (topic.id)}<ResearchCard {topic} />{/each}
</section>

<p class="bf-muted bf-small">
	{t("A rough estimate from equations and tables, not a meal plan from a nutrition professional. Food logging and fine-tuning by your actual weight trend will come later.")}
</p>

<style>
	h4,
	p {
		margin: 0;
	}

	.bf-small {
		font-size: var(--font-ui-smaller);
	}

	.bf-nutri-nav {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--size-4-2);
	}

	.bf-nutri-date {
		text-align: center;
		text-transform: capitalize;
	}

	.bf-nutri-check {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-4-2);
		padding: var(--size-4-2);
		border-radius: var(--radius-s);
		background-color: var(--background-secondary);
	}

	.bf-nutri-check p {
		flex: 1 1 14em;
	}

	.bf-nutri-total {
		font-size: var(--font-ui-large);
		font-weight: var(--font-semibold);
	}

	.bf-nutri-macros {
		display: grid;
		grid-template-columns: auto auto auto 1fr;
		gap: var(--size-4-1) var(--size-4-3);
		align-items: center;
		font-size: var(--font-ui-small);
	}

	.bf-nutri-macros [role="columnheader"] {
		color: var(--text-muted);
		font-size: var(--font-ui-smaller);
	}

	.bf-nutri-steps {
		display: grid;
		grid-template-columns: minmax(7em, auto) 1fr;
		gap: var(--size-4-2) var(--size-4-3);
		margin: 0;
		font-size: var(--font-ui-small);
	}

	.bf-nutri-steps dt {
		color: var(--text-muted);
	}

	.bf-nutri-steps dd {
		margin: 0;
	}

	.bf-nutri-list {
		margin: 0;
		padding-left: var(--size-4-4);
	}

	.bf-nutri-stepsfield {
		display: flex;
		align-items: center;
		gap: var(--size-4-2);
		margin: var(--size-4-1) 0;
	}

	.bf-nutri-stepsfield input {
		width: 8em;
	}

	.bf-nutri-note {
		color: var(--text-warning);
	}

	.bf-nutri-warning {
		padding: var(--size-4-2);
		border-left: 3px solid var(--text-warning);
		background-color: var(--background-secondary);
		font-size: var(--font-ui-small);
	}
</style>
