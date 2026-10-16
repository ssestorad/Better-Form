<script lang="ts">
	// Plán týdne (SPEC 5.16): sedm dní s naplánovanými tréninky, jejich stav,
	// souhrn týdne a výhled zátěže. Rozvržení řádků je pevné – nic neposkakuje.
	import { t } from "../../i18n";
	import { Menu, Notice } from "obsidian";
	import { OUTLOOK_WEEKS, PLAN_LOAD_BASIS, PLAN_STATUS_LABELS, type PlanStatus } from "../../calc/weekPlan";
	import { planItemDetails, planItemTitle } from "../../data/planBlock";
	import type { PlanDay, PlanEntry } from "../../data/PlanService";
	import { DAY_OFF_LABELS, WEEKDAY_LABELS, type DayOffReason } from "../../model/constants";
	import { addDays, startOfWeek, toIsoDate, weekdayOf } from "../../model/dates";
	import BasisTag from "../components/BasisTag.svelte";
	import { usePlugin } from "../context";
	import { formatCzechDate, formatDurationMin, formatNumber } from "../format";
	import { formatWhole } from "../nutrition/text";

	const plugin = usePlugin();
	const indexVersion = plugin.indexVersion;
	const settingsVersion = plugin.settingsVersion;

	const today = $derived.by(() => {
		void $indexVersion;
		return toIsoDate(new Date());
	});
	const currentWeek = $derived(startOfWeek(today));
	/** Pondělí zobrazeného týdne. */
	let week = $state(startOfWeek(toIsoDate(new Date())));
	let busy = $state(false);

	const view = $derived.by(() => {
		void $indexVersion;
		return plugin.plans.view(week, today);
	});
	// Tabulka v poznámce týdne obsahuje i dny programů – po změně programu se obnoví,
	// jakmile se plán zobrazí (zapisuje se jen při rozdílu).
	$effect(() => {
		if (!view.file) return;
		void plugin.plans.refreshBlock(view.week).catch(() => {
			// Poškozené značky v poznámce ohlásí až úprava plánu; při pouhém zobrazení mlčet.
		});
	});
	const acwrWarn = $derived.by(() => {
		void $settingsVersion;
		return plugin.settings.thresholds.acwrWarn;
	});

	const STATUS_CLASS: Record<PlanStatus, string> = { done: "bf-tag bf-tag-done", planned: "bf-tag", missed: "bf-tag bf-tag-warn", off: "bf-tag" };
	const shortDate = (iso: string) => {
		const [, m, d] = iso.split("-").map(Number) as [number, number, number];
		return `${d}. ${m}.`;
	};
	const weekTitle = $derived(`${shortDate(week)} – ${formatCzechDate(addDays(week, 6), false)}`);
	const weekNote = $derived(week === currentWeek ? t("tento týden") : week === addDays(currentWeek, 7) ? t("příští týden") : week === addDays(currentWeek, -7) ? t("minulý týden") : "");
	const streakText = (dates: string[]) => dates.map((d) => `${WEEKDAY_LABELS[weekdayOf(d)].toLocaleLowerCase("cs")} ${shortDate(d)}`).join(", ");

	function log(entry: PlanEntry) {
		const template = entry.item.template ? plugin.index.all("template").find((x) => x.note.name === entry.item.template)?.file : undefined;
		plugin.openWorkout(template ? { date: entry.item.date, template } : { date: entry.item.date, plan: entry.item });
	}

	async function run(action: () => Promise<unknown>, failure: string) {
		try {
			await action();
		} catch (err) {
			new Notice(`${failure}: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	const setOff = (from: string, to: string, reason: DayOffReason | null) => run(() => plugin.plans.setOff(from, to, reason), t("Volno se nepodařilo uložit"));

	/** Nabídka dne: volno, nemoc, dovolená a přesun nesplněných položek. */
	function dayMenu(event: MouseEvent, day: PlanDay) {
		const menu = new Menu();
		const weekEnd = addDays(week, 6);
		const movable = day.entries.filter((e) => !e.program && e.status !== "done").length;
		if (movable > 0) {
			const target = day.date < today ? today : addDays(day.date, 1);
			menu.addItem((item) =>
				item
					.setTitle(day.date < today ? t("Přesunout nesplněné na dnešek ({movable})", { movable }) : t("Přesunout nesplněné na další den ({movable})", { movable }))
					.setIcon("arrow-right")
					.onClick(() => void run(() => plugin.plans.movePending(day.date, target, today), t("Přesun se nepodařil"))),
			);
			menu.addSeparator();
		}
		menu.addItem((item) => item.setTitle(t("Volný den")).setIcon("coffee").onClick(() => void setOff(day.date, day.date, "rest")));
		menu.addItem((item) => item.setTitle(t("Nemoc")).setIcon("thermometer").onClick(() => void setOff(day.date, day.date, "illness")));
		menu.addItem((item) => item.setTitle(t("Dovolená")).setIcon("palmtree").onClick(() => void setOff(day.date, day.date, "vacation")));
		if (day.date < weekEnd) {
			menu.addItem((item) => item.setTitle(t("Nemoc do konce týdne")).setIcon("thermometer").onClick(() => void setOff(day.date, weekEnd, "illness")));
			menu.addItem((item) => item.setTitle(t("Dovolená do konce týdne")).setIcon("palmtree").onClick(() => void setOff(day.date, weekEnd, "vacation")));
		}
		if (day.off) {
			menu.addSeparator();
			menu.addItem((item) => item.setTitle(t("Zrušit volno")).setIcon("x").onClick(() => void setOff(day.date, day.date, null)));
		}
		menu.showAtMouseEvent(event);
	}

	async function copyPrevious() {
		if (busy) return;
		busy = true;
		try {
			const count = await plugin.plans.copyPrevious(week);
			new Notice(count > 0 ? t("Zkopírováno z minulého týdne: {count}.", { count }) : t("V předchozím týdnu není nic naplánováno."));
		} catch (err) {
			new Notice(t("Plán se nepodařilo zkopírovat: {v}", { v: err instanceof Error ? err.message : String(err) }));
		} finally {
			busy = false;
		}
	}

	async function openNote() {
		try {
			await plugin.plans.openNote(week);
		} catch (err) {
			new Notice(t("Poznámku plánu nejde otevřít: {v}", { v: err instanceof Error ? err.message : String(err) }));
		}
	}
</script>

<div class="bf-plan-nav">
	<button type="button" aria-label={t("Předchozí týden")} onclick={() => (week = addDays(week, -7))}>‹</button>
	<span class="bf-plan-week">
		<strong>{weekTitle}</strong>
		<span class="bf-muted bf-small bf-plan-weeknote">{weekNote}</span>
	</span>
	<button type="button" aria-label={t("Následující týden")} onclick={() => (week = addDays(week, 7))}>›</button>
</div>

<section class="bf-card">
	<ul class="bf-plan-days">
		{#each view.days as day (day.date)}
			<li class="bf-plan-day" class:is-today={day.date === today}>
				<span class="bf-plan-date">
					<strong>{WEEKDAY_LABELS[weekdayOf(day.date)]}</strong>
					<span class="bf-muted">{shortDate(day.date)}</span>
				</span>
				<div class="bf-plan-items">
					{#if day.off}
						<div><span class="bf-tag bf-plan-off" title={day.off === "rest" ? t("Plánované volno") : t("Omluvený den – nepočítá se jako vynechaný a nepřeruší sérii dnů")}>{DAY_OFF_LABELS[day.off]}</span></div>
					{/if}
					{#each day.entries as entry (entry.item.id)}
						<div class="bf-plan-item">
							{#if entry.program}
								<button type="button" class="bf-link-button bf-plan-title" title={t("Den aktivního programu – dny a délku tréninku změníš na kartě Programy")} onclick={() => plugin.showTab("programs")}>
									{t("Program {program_name}", { program_name: entry.program.name })}
								</button>
							{:else}
								<button type="button" class="bf-link-button bf-plan-title" title={t("Upravit, přesunout nebo smazat")} onclick={() => plugin.openPlanItem({ date: day.date, item: entry.item })}>
									{planItemTitle(entry.item)}
								</button>
							{/if}
							<span class={STATUS_CLASS[entry.status]}>{PLAN_STATUS_LABELS[entry.status]}</span>
							<span class="bf-muted bf-small bf-plan-details">
								{planItemDetails(entry.item, entry.minutes)}{entry.program ? ` · ${entry.program.text}` : entry.item.notes ? ` · ${entry.item.notes}` : ""}
							</span>
							{#if entry.status === "done" && entry.workout}
								<button type="button" class="bf-plan-action" onclick={() => plugin.openWorkout({ file: entry.workout!.file })}>{t("Trénink")}</button>
							{:else if entry.program}
								{#if entry.program.workoutFile}
									<button type="button" class="bf-plan-action" onclick={() => plugin.openWorkout({ file: entry.program!.workoutFile! })}>{t("Trénink")}</button>
								{:else if entry.status !== "done" && day.date <= today}
									<button type="button" class="bf-plan-action" onclick={() => plugin.openWorkout({ program: entry.program!.file, date: day.date })}>{t("Zapsat")}</button>
								{/if}
							{:else if day.date <= today}
								<button type="button" class="bf-plan-action" onclick={() => log(entry)}>{t("Zapsat")}</button>
							{/if}
						</div>
					{/each}
					{#each day.programs as program (program.file.path)}
						<div class="bf-plan-program bf-muted bf-small">
							{t("Program {program_name}: {program_text}", { program_name: program.name, program_text: program.text })}
							<span title={program.loggable ? t("Na kartě Programy vyplň u programu délku tréninku – jeho dny se pak počítají do souhrnu, zátěže a výživy.") : t("Denní počítadlo nemá délku ani RPE, proto se do zátěže nepočítá.")}>
								· {program.loggable ? t("bez délky tréninku – nepočítá se") : t("denní počítadlo – nepočítá se")}
							</span>
						</div>
					{/each}
					{#if day.entries.length === 0 && day.programs.length === 0 && !day.off}
						<span class="bf-muted bf-small">{t("nic v plánu")}</span>
					{/if}
				</div>
				<span class="bf-plan-buttons">
					<button type="button" class="bf-plan-add" aria-label={t("Volno, nemoc, dovolená a přesun – {v}", { v: shortDate(day.date) })} title={t("Volno, nemoc, dovolená, přesun nesplněných")} onclick={(e) => dayMenu(e, day)}>⋯</button>
					<button type="button" class="bf-plan-add" aria-label={t("Naplánovat trénink na {v}", { v: shortDate(day.date) })} onclick={() => plugin.openPlanItem({ date: day.date })}>+</button>
				</span>
			</li>
		{/each}
	</ul>
</section>

<section class="bf-card">
	<h4>{t("Souhrn týdne")}</h4>
	{#if view.summary.planned === 0}
		<p class="bf-muted">{t("V tomto týdnu zatím nic není v plánu. Trénink přidáš tlačítkem + u dne.")}</p>
	{:else}
		<dl class="bf-plan-summary">
			<dt>{t("Tréninky")}</dt>
			<dd>
				{t("splněno {done} z {planned}{v}{v2}", { done: view.summary.done, planned: view.summary.planned, v: view.summary.missed > 0 ? t(", vynecháno {missed}", { missed: view.summary.missed }) : "", v2: view.summary.postponed > 0
					? t(", odloženo {postponed}", { postponed: view.summary.postponed })
					: "" })}
			</dd>
			<dt>{t("Čas")}</dt>
			<dd>
				{t("v plánu {v}, odtrénováno {v2}", { v: formatDurationMin(view.summary.plannedMin), v2: formatDurationMin(view.summary.actualMin) })}
				{#if view.summary.withoutDuration > 0}<span class="bf-muted bf-small"> {t("· {withoutDuration}× bez délky (nepočítá se)", { withoutDuration: view.summary.withoutDuration })}</span>{/if}
			</dd>
			{#if view.summary.plannedRunKm > 0 || view.summary.actualRunKm > 0}
				<dt>{t("Běh")}</dt>
				<dd>{t("v plánu {v} km, uběhnuto {v2} km", { v: formatNumber(view.summary.plannedRunKm), v2: formatNumber(view.summary.actualRunKm) })}</dd>
			{/if}
			<dt>{t("Zátěž")}</dt>
			<dd>
				{#if view.outlook.ratio !== null && view.outlook.average !== null}
					{t("asi {v} AU, tedy {v2}× průměr posledních {OUTLOOK_WEEKS} týdnů ({v3} AU)", { v: formatWhole(view.outlook.expected), v2: formatNumber(view.outlook.ratio, 2), OUTLOOK_WEEKS, v3: formatWhole(view.outlook.average) })}
					{#if view.outlook.planned > 0 && view.outlook.ratio > acwrWarn}
						<br /><span class="bf-plan-warning">{t("Je to výrazný skok (práh {v}×) – zvaž zkrátit nebo zlehčit některý trénink.", { v: formatNumber(acwrWarn, 2) })}</span>
					{/if}
				{:else}
					{t("asi {v} AU", { v: formatWhole(view.outlook.expected) })}
					<br /><span class="bf-muted bf-small">{t("Sbírám data – srovnání s průměrem bude po {OUTLOOK_WEEKS} týdnech tréninků se zapsaným RPE a délkou.", { OUTLOOK_WEEKS })}</span>
				{/if}
				<br /><span class="bf-muted bf-small">
					{t("Zapsané tréninky ({v} AU) + zbytek plánu ({v2} AU); u plánu je to odhad z délky a intenzity (lehká 3, střední 5, těžká 8 × minuty).", { v: formatWhole(view.outlook.actual), v2: formatWhole(view.outlook.planned) })}
					<BasisTag basis={PLAN_LOAD_BASIS} />
				</span>
			</dd>
		</dl>
		{#each view.streaks as streak (streak[0])}
			<p class="bf-plan-warning">
				{t("Těžké dny po sobě: {v} – zvaž prohodit některý s lehčím dnem.", { v: streakText(streak) })}
				<BasisTag basis={{ sourceIds: ["practice"], evidence: "practice" }} />
			</p>
		{/each}
	{/if}
</section>

<div class="bf-actions">
	<button type="button" disabled={week === currentWeek} onclick={() => (week = currentWeek)}>{t("Tento týden")}</button>
	<button type="button" disabled={busy} onclick={() => void copyPrevious()}>{t("Zkopírovat minulý týden")}</button>
	<button type="button" onclick={() => void openNote()}>{t("Otevřít poznámku týdne")}</button>
	<button type="button" title={t("Čísla týdne proti minulému, splnění plánu a nové rekordy v poznámce ve složce Souhrny")} onclick={() => void plugin.weeklySummary(week)}>
		{t("Souhrn týdne")}
	</button>
</div>

<style>
	.bf-plan-nav {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--size-4-2);
	}

	.bf-plan-week {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* Řádek pod datem má pevnou výšku i bez textu, aby se navigace při listování nehýbala. */
	.bf-plan-weeknote {
		min-height: 1.4em;
	}

	.bf-plan-days {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	/* Šířka seznamu řídí rozvržení dne: v úzkém panelu jdou položky pod datum. */
	.bf-plan-days {
		container-type: inline-size;
	}

	.bf-plan-day {
		display: grid;
		grid-template-columns: 5.5em minmax(0, 1fr) auto;
		align-items: start;
		gap: var(--size-4-2);
		padding: var(--size-4-2) var(--size-2-3);
		border-top: 1px solid var(--background-modifier-border);
		border-left: 3px solid transparent;
		min-height: 2.75em;
	}

	.bf-plan-day:first-child {
		border-top: none;
	}

	.bf-plan-day.is-today {
		border-left-color: var(--interactive-accent);
		background-color: var(--background-secondary);
	}

	.bf-plan-date {
		white-space: nowrap;
		display: flex;
		gap: var(--size-2-3);
		align-items: baseline;
	}

	.bf-plan-items {
		display: flex;
		flex-direction: column;
		gap: var(--size-2-3);
		min-width: 0;
	}

	/* Název, štítek a tlačítko vedle sebe; když se nevejdou, zalomí se na další řádek – nikdy se nepřekryjí. */
	.bf-plan-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-2-3) var(--size-4-2);
	}

	.bf-plan-title {
		flex: 1 1 7em;
		min-width: 0;
		text-align: left;
		overflow-wrap: anywhere;
	}

	.bf-plan-item :global(.bf-tag) {
		flex: none;
		white-space: nowrap;
	}

	.bf-plan-action {
		flex: none;
	}

	.bf-plan-details {
		flex: 1 0 100%;
		order: 1;
		overflow-wrap: anywhere;
	}

	.bf-plan-program {
		overflow-wrap: anywhere;
	}

	.bf-plan-add {
		min-width: 2.2em;
	}

	.bf-plan-buttons {
		display: flex;
		gap: var(--size-2-2);
	}

	/* Volný den jen štítkem – řádek dne má stejné rozměry jako ostatní. */
	.bf-plan-off {
		font-weight: var(--font-semibold);
	}

	@container (max-width: 26em) {
		.bf-plan-day {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.bf-plan-buttons {
			grid-column: 2;
			grid-row: 1;
		}

		.bf-plan-items {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}

	.bf-plan-summary {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--size-2-3) var(--size-4-3);
		margin: 0;
	}

	.bf-plan-summary dt {
		color: var(--text-muted);
	}

	.bf-plan-summary dd {
		margin: 0;
	}

	.bf-plan-warning {
		color: var(--text-warning);
	}

	p.bf-plan-warning {
		margin: var(--size-4-2) 0 0;
	}
</style>
