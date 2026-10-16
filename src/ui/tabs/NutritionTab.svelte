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
	import { Notice } from "obsidian";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const todayIso = toIsoDate(new Date());
	let date = $state(todayIso);
	/** Ruční zátěž dne; prázdné = podle zapsaných tréninků. */
	let loadChoice = $state<DayLoad | "">("");

	const ACTIVITY_LABELS = { sedentary: t("sedavá"), light: t("lehce aktivní"), active: t("aktivní") } as const;
	const ACTIVITY_HELP = {
		sedentary: t("většinu dne sedíš (škola, kancelář)"),
		light: t("část dne jsi na nohou nebo hodně chodíš"),
		active: t("fyzická práce, většinu dne v pohybu"),
	} as const;
	// Jak přesná je která rovnice (Frankenfield 2005; metaanalýza u sportovců 2023).
	const RMR_PRECISION = {
		mifflin: t("U většiny lidí je odhad do ±10 % změřené hodnoty (Frankenfield 2005)."),
		ten_haaf: t("U sportovců je asi 80 % odhadů do ±10 % změřené hodnoty."),
		ten_haaf_ffm: t("Odhad z beztukové hmoty – záleží i na tom, jak přesně znáš podíl tuku."),
		cunningham: t("U sportovců bez soustavné odchylky, ale s větším rozptylem než ten Haafova rovnice z hmotnosti; záleží i na přesnosti podílu tuku."),
	} as const;
	const GOAL_LABELS = { lose: t("hubnutí"), maintain: t("udržování"), gain: t("nabírání") } as const;

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
			new Notice(t("Kroky: zadej číslo 0–{MAX_STEPS}.", { MAX_STEPS }));
			return;
		}
		try {
			await plugin.days.setSteps(date, value);
		} catch (err) {
			new Notice(t("Kroky se nepodařilo uložit: {v}", { v: err instanceof Error ? err.message : String(err) }));
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
	<button type="button" aria-label={t("Předchozí den")} onclick={() => shift(-1)}>‹</button>
	<span class="bf-nutri-date">{formatCzechDate(date)}</span>
	<button type="button" aria-label={t("Následující den")} disabled={date >= lastDate} onclick={() => shift(1)}>›</button>
</div>

{#if plan === null}
	<section class="bf-card">
		<h4>{t("Doporučený příjem")}</h4>
		<p>{t("Pro výpočet chybí v profilu:")} <strong>{missing.join(", ")}</strong>.</p>
		<p class="bf-muted bf-small">{t("Hmotnost se bere z posledního ranního check-inu, ostatní údaje z profilu.")}</p>
		<button type="button" class="mod-cta" onclick={() => plugin.openOnboarding()}>{t("Doplnit profil")}</button>
	</section>
{:else}
	<section class="bf-card">
		<h4>{t("Doporučený příjem")}</h4>
		<p class="bf-nutri-total">{t("asi {v} kcal", { v: formatWhole(plan.target) })}</p>
		<p class="bf-small">{t("Rozsah {v} – {v2}.", { v: rangeText(plan.intake, "kcal"), v2: profile.goal === "maintain" ? t("tak přesný je odhad; skutečnou potřebu ukáže až vývoj hmotnosti za 2–3 týdny") : t("podle tempa, které si zvolíš") })}</p>
		<p class="bf-muted bf-small">{t("Cíl: {v} · hmotnost {v2} kg{v3}", { v: GOAL_LABELS[profile.goal], v2: formatNumber(kg), v3: plan.ffmKg !== null ? t(" · beztuková hmota {v} kg", { v: formatNumber(plan.ffmKg) }) : "" })}</p>
		<div class="bf-nutri-macros" role="table" aria-label={t("Makroživiny")}>
			<span role="columnheader"></span><span role="columnheader">{t("g za den")}</span><span role="columnheader">{t("g/kg")}</span><span role="columnheader">{t("Zdroj")}</span>
			<span role="cell">{t("Bílkoviny")}</span>
			<span role="cell">{rangeText(plan.protein, "g")}</span>
			<span role="cell">{perKg(plan.protein.min)}–{perKg(plan.protein.max)}</span>
			<span role="cell">
				{#if profile.goal === "lose" && plan.ffmKg !== null}
					<BasisTag basis={basis(["helms2014protein"], "research")} named />
				{:else}
					<BasisTag basis={basis(["morton2018", "nunes2022"], "research")} named />
				{/if}
			</span>
			<span role="cell">{t("Sacharidy")}</span>
			<span role="cell">{rangeText(plan.carbs, "g")}</span>
			<span role="cell">{perKg(plan.carbs.min)}–{perKg(plan.carbs.max)}</span>
			<span role="cell"><BasisTag basis={basis(["thomas2016"], "consensus")} named /></span>
			<span role="cell">{t("Tuky")}</span>
			<span role="cell">{rangeText(plan.fat, "g")}</span>
			<span role="cell">{perKg(plan.fat.min)}–{perKg(plan.fat.max)}</span>
			<span role="cell"><BasisTag basis={basis(["thomas2016"], "consensus")} named /></span>
		</div>
		{#if plan.raisedFor.length > 0}
			<p class="bf-nutri-warning">
				{#if plan.raisedFor.includes("ea")}
					{t("Doporučení je zvednuté, aby energetická dostupnost neklesla pod {v} kcal na kg beztukové hmoty – při delším nedostatku energie hrozí zdravotní potíže a horší výkon (IOC REDs 2023, konsenzus; práh je orientační).", { v: formatNumber(eaMin, 0) })}
				{/if}
				{#if plan.raisedFor.includes("rmr")}{t("Příjem nikdy neklesne pod klidový výdej.")}{/if}
			</p>
		{/if}
		{#if plan.carbsShort}
			<p class="bf-nutri-warning">
				{t("Při tomto příjmu se doporučené sacharidy pro zátěž dne nevejdou. Přednost mají bílkoviny, pak minimum tuků (20 % energie), zbytek sacharidy.")}
			</p>
		{/if}
	</section>

	<section class="bf-card">
		<h4>{t("Co říká váha")}</h4>
		{#if trend.ready}
			<p>{t("Trend za {v} týdny:", { v: TREND_WINDOW_DAYS / 7 })} <strong>{trendText(trend)}</strong>.</p>
			{#if balance}<p>{balanceText(balance, profile.goal, plugin.settings.nutrition.lossRatePctMax)}</p>{/if}
			<p class="bf-muted bf-small">
				{t("Přímka přes {samples} vážení; 1 kg ≈ {v} kcal.", { samples: trend.samples, v: formatWhole(KCAL_PER_KG) })} <BasisTag basis={basis(["practice"], "practice")} />
				{#if profile.goal === "lose"}<BasisTag basis={basis(["helms2014contest"], "research")} named />{/if}
				{t("Krátkodobě váhu mění i voda, sůl a sacharidy. Skutečný výdej by šel spočítat až se zápisem jídla – tohle říká jen, jestli jíš nad, nebo pod ním.")}
			</p>
			{#if advice.kind === "offer"}
				<div class="bf-nutri-check">
					<p>
						<strong>{t("Týdenní kontrola:")}</strong> {t("pokud ses doporučení zhruba držel, odhad tvého výdeje je asi o {v} kcal {v2}, než má být. Můžu podle toho doporučení posunout.", { v: formatWhole(Math.abs(advice.stepKcal)), v2: advice.stepKcal > 0 ? t("nižší") : t("vyšší") })}
						<BasisTag basis={basis(["practice"], "practice")} />
					</p>
					<button type="button" class="mod-cta" onclick={() => void plugin.setNutritionCorrection(advice.totalKcal)}>
						{t("Upravit doporučení o {v}", { v: signedKcal(advice.stepKcal) })}
					</button>
				</div>
			{:else if advice.kind === "floor"}
				<p class="bf-muted bf-small">
					{t("Podle váhy by doporučení mělo být nižší, ale už stojí na spodní hranici, kterou drží pojistka (klidový výdej nebo energetická dostupnost) – níž plugin nedoporučí. Zkontroluj, jestli se doporučení opravdu držíš; pokud ano a váha dlouhodobě neklesá, poraď se s nutričním terapeutem nebo lékařem.")}
				</p>
			{:else if advice.kind === "locked"}
				<p class="bf-muted bf-small">{t("Korekce je čerstvá – další kontrola od {v}, až se projeví ve váze.", { v: formatCzechDate(advice.until, false) })}</p>
			{/if}
		{:else}
			<p class="bf-muted">
				{t("Sbírám data – {samples} z {TREND_MIN_SAMPLES} vážení za poslední {v} týdny{v2}. Važ se ráno po probuzení, aspoň dvakrát až třikrát týdně.", { samples: trend.samples, TREND_MIN_SAMPLES, v: TREND_WINDOW_DAYS / 7, v2: trend.samples >= TREND_MIN_SAMPLES
					? t(", rozpětí {spanDays} z {TREND_MIN_SPAN_DAYS} dní", { spanDays: trend.spanDays, TREND_MIN_SPAN_DAYS })
					: "" })}
			</p>
			<p class="bf-muted bf-small">{t("Z vývoje váhy pak bude vidět, jestli doporučení sedí, nebo jestli jíš nad či pod svým výdejem.")}</p>
		{/if}
		{#if correction.kcal !== 0}
			<div class="bf-nutri-check">
				<p class="bf-small">
					{t("Osobní korekce výdeje:")} <strong>{t("{v} denně", { v: signedKcal(correction.kcal) })}</strong>{correction.date ? t(" (od {date})", { date: formatCzechDate(correction.date, false) }) : ""}.
				</p>
				<button type="button" onclick={() => void plugin.setNutritionCorrection(0)}>{t("Zrušit korekci")}</button>
			</div>
		{/if}
	</section>

	<section class="bf-card">
		<h4>{t("Jak se to spočítalo")}</h4>
		<dl class="bf-nutri-steps">
			<dt>{t("Klidový výdej")}</dt>
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
							{t("Pravidelně trénuješ, ale jsi mimo skupinu, na které vznikla ten Haafova rovnice ({outside}). Máš zapsaný podíl tuku, takže se hodí rovnice z beztukové hmoty (Cunningham 1980): vychází z tvé stavby těla a u sportovců nemá soustavnou odchylku.", { outside: better.outside })}
						{:else if better.formula === "mifflin"}
							{t("Ten Haafova rovnice vznikla na sportovcích 18–35 let trénujících aspoň 3 h týdně a u lehčích a méně trénujících vychází výš. Tvůj profil je mimo tuto skupinu ({outside}); pro běžnou populaci je spolehlivější Mifflin–St Jeor.", { outside: better.outside })}
						{:else}
							{t("Podle profilu a tréninku patříš do skupiny pravidelně sportujících 18–35 let. U sportovců má rovnice pro běžnou populaci soustavnou odchylku; přesnější je ten Haaf & Weijs.")}
						{/if}
						{t("S ní by klidový výdej vyšel {v} kcal místo {v2}.", { v: formatWhole(better.kcal), v2: formatWhole(plan.rmr.kcal) })}
						<button type="button" class="bf-link-button" onclick={() => void plugin.setRmrFormula(better.formula)}>{t("Přepnout")}</button>
						<BasisTag basis={basis(["practice"], "practice")} />
					</span>
				{/if}
				{#if plan.rmr.fallback}<br /><span class="bf-muted bf-small">{t("Zvolená rovnice potřebuje podíl tuku – použita rovnice z hmotnosti.")}</span>{/if}
				<br /><span class="bf-muted bf-small">{RMR_PRECISION[plan.rmr.formula]}</span>
			</dd>
			<dt>{t("Běžná aktivita")}</dt>
			<dd>
				{t("× {v} ({v2})", { v: formatNumber(plan.activityFactor, 2), v2: profile.steps ? t("pásmo {v}", { v: ACTIVITY_LABELS[plan.activity] }) : `${ACTIVITY_LABELS[plan.activity]} – ${ACTIVITY_HELP[plan.activity]}` })} <BasisTag basis={basis(["practice"], "practice")} />
				<br />
				{#if profile.steps}
					<span class="bf-small">
						{t("Podle kroků: {v} {v2} kroků mimo běh.", { v: profile.steps.source === "day" ? t("tento den") : t("průměr za {v} z posledního týdne", { v: formatDays(profile.steps.days) }), v2: formatWhole(profile.steps.steps) })}
						<BasisTag basis={basis(["tudorLocke2004"], "research")} named />
					</span>
				{:else}
					<span class="bf-muted bf-small">{t("Z nastavení. Když budeš zapisovat kroky, určí se úroveň podle nich.")}</span>
				{/if}
				<label class="bf-nutri-stepsfield bf-small">
					<span>{t("Kroky za tento den")}</span>
					{#key `${date}:${daySteps ?? ""}`}
						<input type="number" inputmode="numeric" min="0" max={MAX_STEPS} step="100" value={daySteps ?? ""} placeholder={t("např. 8000")} onchange={(e) => void saveSteps(e.currentTarget.value)} />
					{/key}
				</label>
				<span class="bf-muted bf-small">
					{t("Jen běžný den mimo trénink – tréninky se přičítají zvlášť níže a kroky z běhu se odečítají (asi 1 000 na km). Koeficient se z kroků dopočítává plynule: {v} kroků = {v2}, {v3} = {v4}, {v5} = {v6}. Pásma kroků jsou z výzkumu, jejich převod na koeficient je odhad.", { v: formatWhole(STEP_ANCHORS.sedentary), v2: formatNumber(plugin.settings.nutrition.activityFactors.sedentary, 2), v3: formatWhole(STEP_ANCHORS.light), v4: formatNumber(
						plugin.settings.nutrition.activityFactors.light,
						2,
					), v5: formatWhole(STEP_ANCHORS.active), v6: formatNumber(plugin.settings.nutrition.activityFactors.active, 2) })}
				</span>
			</dd>
			<dt>{t("Tréninky")}</dt>
			<dd>
				{#if plan.workouts.length === 0}
					{t("žádný zapsaný ani naplánovaný trénink")}
				{:else}
					<ul class="bf-nutri-list">
						{#each plan.workouts as row, i (i)}
							<li>
								{workoutLabel(row.workout)}{#if row.planned}&nbsp;<span class="bf-tag" title={t("Z plánu týdne – trénink ještě není zapsaný; délka a intenzita jsou plánované")}>{t("plán")}</span>{/if}:
								{#if row.energy.netKcal === null}
									<span class="bf-muted">{t("bez délky – nepočítá se")}</span>
								{:else}
									{t("+{v} kcal", { v: formatWhole(row.energy.netKcal) })}
									<span class="bf-muted bf-small">
										{row.energy.method === "run_distance"
											? t("(1 kcal × kg × km mínus klidový výdej)")
											: t("(MET {v}, intenzita {v2} podle RPE, kód {code})", { v: formatNumber(row.energy.met ?? 0), v2: INTENSITY_LABELS[row.energy.intensity], code: row.energy.code ?? "" })}
									</span>
								{/if}
							</li>
						{/each}
					</ul>
					<BasisTag basis={basis(["margaria1963", "compendium2024"], "research")} named />
					<span class="bf-muted bf-small">{t("Počítá se čistý výdej nad klidový; kalorie ze Stravy se nepoužívají. Intenzita z RPE je odhad (praxe).")}</span>
				{/if}
			</dd>
			{#if plan.correctionKcal !== 0}
				<dt>{t("Korekce podle váhy")}</dt>
				<dd>
					{signedKcal(plan.correctionKcal)} <BasisTag basis={basis(["practice"], "practice")} />
					<br /><span class="bf-muted bf-small">{t("Osobní posun odhadu výdeje z týdenní kontroly váhy; zrušíš ho v části „Co říká váha“.")}</span>
				</dd>
			{/if}
			<dt>{t("Celkový výdej")}</dt>
			<dd>{t("{v} kcal ({v2})", { v: formatWhole(plan.tdee), v2: rangeText(plan.tdeeRange, "kcal") })}</dd>
			<dt>{t("Podle cíle")}</dt>
			<dd>
				{#if profile.goal === "lose"}
					{t("deficit {v}–{v2} kcal = tempo {v3}–{v4} % hmotnosti za týden", { v: formatWhole(-plan.goalAdjust.max), v2: formatWhole(-plan.goalAdjust.min), v3: formatNumber(plugin.settings.nutrition.lossRatePctMin), v4: formatNumber(
						plugin.settings.nutrition.lossRatePctMax,
					) })}
					<BasisTag basis={basis(["helms2014contest"], "research")} named />
					<span class="bf-muted bf-small">{t("(1 kg ≈ {v} kcal – hrubý odhad)", { v: formatWhole(KCAL_PER_KG) })}</span>
				{:else if profile.goal === "gain"}
					{t("přebytek {v}–{v2} % výdeje", { v: formatNumber(plugin.settings.nutrition.gainSurplusPctMin), v2: formatNumber(plugin.settings.nutrition.gainSurplusPctMax) })}
					<BasisTag basis={basis(["practice"], "practice")} />
				{:else}
					{t("udržování – rozsah odpovídá přesnosti odhadu klidového výdeje")}
				{/if}
			</dd>
			<dt>{t("Energetická dostupnost")}</dt>
			<dd>
				{t("{v} kcal/kg {v2} u spodní hranice (pojistka od {v3})", { v: formatNumber(plan.energyAvailability, 0), v2: plan.eaUsesBodyWeight ? "hmotnosti" : t("beztukové hmoty"), v3: formatNumber(eaMin, 0) })}
				<BasisTag basis={basis(["mountjoy2023"], "consensus")} named />
				{#if plan.eaUsesBodyWeight}
					<br /><span class="bf-muted bf-small">{t("Bez podílu tuku se počítá s celou hmotností – přísnější odhad. Podíl tuku zadáš v check-inu nebo v profilu.")}</span>
				{/if}
			</dd>
			<dt>{t("Zátěž dne")}</dt>
			<dd>
				<select value={loadChoice} onchange={(e) => (loadChoice = e.currentTarget.value as DayLoad | "")} aria-label={t("Zátěž dne")}>
					<option value="">{t("automaticky ({v})", { v: DAY_LOAD_LABELS[plan.load] })}</option>
					{#each DAY_LOADS as l (l)}<option value={l}>{DAY_LOAD_LABELS[l]}</option>{/each}
				</select>
				<br /><span class="bf-muted bf-small">
					{t("Sacharidy {v}–{v2} g/kg. Automatická volba podle délky a RPE zapsaných tréninků a nesplněných položek plánu týdne (hranice jsou odhad – praxe); bez plánu si zátěž dne dopředu vyber ručně.", { v: CARB_RANGES[plan.load][0], v2: CARB_RANGES[plan.load][1] })}
				</span>
			</dd>
			<dt>{t("Bílkoviny")}</dt>
			<dd class="bf-muted bf-small">
				{#if profile.goal === "lose" && plan.ffmKg !== null}
					{t("v deficitu {v}–{v2} g na kg beztukové hmoty", { v: CUT_PROTEIN_G_PER_KG_FFM[0], v2: CUT_PROTEIN_G_PER_KG_FFM[1] })}
				{:else}
					{t("{v}–{v2} g/kg; rozložit asi 0,3–0,4 g/kg na jídlo", { v: formatNumber(PROTEIN_G_PER_KG[0]), v2: formatNumber(Math.max(PROTEIN_G_PER_KG[1], plugin.settings.nutrition.proteinGPerKg)) })}
				{/if}
			</dd>
		</dl>
	</section>
{/if}

<p class="bf-muted bf-small">
	{t("Orientační odhad podle rovnic a tabulek, ne jídelníček od nutričního specialisty. Zápis jídla a doladění podle skutečného vývoje hmotnosti přijde později.")}
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
