<script lang="ts">
	import { scaleLinear, scaleUtc } from "d3-scale";
	import { line } from "d3-shape";
	import type { Index } from "#lib/api/types.ts";

	/**
	 * One 30-minute period: a period from `/api/national/history`, or from `/api/regions/[id]`,
	 * which has no `actual`.
	 */
	interface ChartPeriod {
		/** The start of the period, as an ISO string. */
		period: string;
		forecast: number;
		/**
		 * Null until the period has ended. Left out for a series that never has one (regions), and
		 * then the chart draws the forecast only.
		 */
		actual?: number | null;
		/** The band the forecast falls in. */
		index: Index;
	}

	let {
		periods,
		subject
	}: {
		periods: ChartPeriod[];
		/** What the line shows, for the chart's accessible name: "national carbon intensity". */
		subject: string;
	} = $props();

	const HEIGHT = 280;
	// Room outside the plot for the axis labels, in SVG units.
	const MARGIN = { top: 12, right: 20, bottom: 28, left: 52 };
	const TICK_GAP = 8;
	const Y_TICK_COUNT = 5;
	// Fewer time labels on a narrow chart, so they do not overlap.
	const NARROW_WIDTH = 400;
	const X_TICK_COUNT_NARROW = 3;
	const X_TICK_COUNT_WIDE = 6;
	const DAY_MS = 24 * 60 * 60 * 1000;

	// Fixed locale and time zone, so the server and the browser print the same text.
	const timeFormat = new Intl.DateTimeFormat("en-GB", {
		timeStyle: "short",
		timeZone: "UTC"
	});
	const dayFormat = new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		timeZone: "UTC"
	});
	const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC"
	});

	// bind:clientWidth (on the div below) keeps this equal to the width the layout gives the chart.
	// It is 0 until the browser has measured it. The server cannot measure, so the SVG is not drawn
	// until then: a guessed width would show a chart of the wrong size that then jumps.
	let width = $state(0);

	const innerWidth = $derived(width - MARGIN.left - MARGIN.right);
	const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

	// A missing `actual` (a field the series does not have) is not the same as a null one (a period
	// that has not ended), so this is checked before the points below turn both into null.
	const showsActual = $derived(periods.some((p) => p.actual !== undefined));

	// $derived: parse each timestamp once, instead of in every scale and line call.
	const points = $derived(
		periods.map((p) => ({ ...p, actual: p.actual ?? null, time: new Date(p.period) }))
	);

	// The period the readout describes. null means "the user has not chosen", which shows the
	// newest period. The slider and pointer set it, and the readout, marker and slider all read it.
	let selectedIndex = $state<number | null>(null);
	// min() keeps it in range if the data changes to something shorter.
	const activeIndex = $derived(Math.min(selectedIndex ?? points.length - 1, points.length - 1));
	const selected = $derived(points[activeIndex] ?? null);

	// What the readout says. The slider announces the same text through aria-valuetext, so a screen
	// reader user hears the values as they move it.
	const readout = $derived.by(() => {
		if (selected === null) return null;
		return {
			time: `${dateTimeFormat.format(selected.time)} UTC`,
			actual: selected.actual === null ? "not available yet" : `${selected.actual}`,
			forecast: selected.forecast,
			index: selected.index
		};
	});
	const readoutText = $derived.by(() => {
		if (readout === null) return "";
		const actual = showsActual ? ` Actual ${readout.actual}.` : "";
		return `${readout.time}.${actual} Forecast ${readout.forecast} gCO2/kWh. Forecast index ${readout.index}.`;
	});

	// $derived.by: one block builds everything that depends on the data and the width, so the
	// scales, ticks and paths always change together. d3 only does the maths here. Svelte draws
	// the SVG from what this returns.
	const chart = $derived.by(() => {
		if (points.length === 0) return null;

		const start = points[0].time;
		const end = points[points.length - 1].time;

		// scaleUtc, not scaleTime: ticks land on UTC hours, matching the labels (always UTC).
		const x = scaleUtc().domain([start, end]).range([0, innerWidth]);

		// The y-axis starts at 0 (README, UI decisions). nice() rounds the top up to a tick.
		// At least 1, like Sparkline: a region at 0 the whole time would give a domain of [0, 0].
		const highest = Math.max(1, ...points.map((p) => Math.max(p.forecast, p.actual ?? 0)));
		const y = scaleLinear().domain([0, highest]).nice().range([innerHeight, 0]);

		const forecastLine = line<(typeof points)[number]>()
			.x((p) => x(p.time))
			.y((p) => y(p.forecast));

		// defined() leaves out periods with no actual yet, so the line stops instead of drawing to 0.
		// The `?? 0` is never used: y() only runs for points that passed defined().
		const actualLine = line<(typeof points)[number]>()
			.defined((p) => p.actual !== null)
			.x((p) => x(p.time))
			.y((p) => y(p.actual ?? 0));

		const xTickCount = innerWidth < NARROW_WIDTH ? X_TICK_COUNT_NARROW : X_TICK_COUNT_WIDE;
		// Over more than a day the ticks land on midnights, so a time label would read "00:00" on
		// every one. The date says which day it is instead.
		const tickFormat = end.getTime() - start.getTime() > DAY_MS ? dayFormat : timeFormat;

		return {
			x,
			y,
			xTicks: x.ticks(xTickCount).map((value) => ({
				value,
				position: x(value),
				label: tickFormat.format(value)
			})),
			yTicks: y.ticks(Y_TICK_COUNT).map((value) => ({ value, position: y(value) })),
			forecastPath: forecastLine(points),
			actualPath: actualLine(points),
			description: `Line chart of the ${subject} in gCO2/kWh, ${showsActual ? "actual and forecast" : "forecast"}, from ${dateTimeFormat.format(start)} to ${dateTimeFormat.format(end)} UTC. The same data is in the table below the chart.`
		};
	});

	/** Selects the period nearest to where the pointer is on the plot (mouse, touch or pen). */
	function selectNearest(event: PointerEvent & { currentTarget: HTMLElement }) {
		if (chart === null) return;
		const plotLeft = event.currentTarget.getBoundingClientRect().left;
		const pointerTime = chart.x.invert(event.clientX - plotLeft - MARGIN.left).getTime();

		let nearest = 0;
		let smallestGap = Infinity;
		points.forEach((point, i) => {
			const gap = Math.abs(point.time.getTime() - pointerTime);
			if (gap < smallestGap) {
				smallestGap = gap;
				nearest = i;
			}
		});
		selectedIndex = nearest;
	}
</script>

{#if chart && selected && readout}
	<figure>
		<!-- A text readout above the chart, not a floating tooltip (README, UI decisions). It follows
			the slider, a tap or hover on the chart, and shows the newest period until one is chosen. -->
		<p class="readout">
			<strong>{readout.time}</strong>
			{#if showsActual}
				<span>Actual: {readout.actual}</span>
			{/if}
			<span>Forecast: {readout.forecast}</span>
			<span class="unit">gCO₂/kWh</span>
			<span>Forecast index: {readout.index}</span>
		</p>

		<!-- The div is always there so it can be measured. Its fixed height keeps the card the same
			size before and after the SVG appears, so nothing below it moves. -->
		<!-- Pointer handling is only a shortcut for mouse and touch. The slider below does the same
			job for the keyboard and screen readers, so this div has no role of its own. -->
		<div
			class="plot"
			role="presentation"
			style:height="{HEIGHT}px"
			bind:clientWidth={width}
			onpointerdown={selectNearest}
			onpointermove={selectNearest}
		>
			{#if width > 0}
				<svg viewBox="0 0 {width} {HEIGHT}" height={HEIGHT} role="img" aria-label={chart.description}>
					<g transform="translate({MARGIN.left} {MARGIN.top})">
						<!-- The entrance animation (see "Chart entrance" in layout.css): the axes fade in first,
							then the lines are revealed left to right, then the marker appears. -->
						<g class="fade" style:--order="1">
							{#each chart.yTicks as tick (tick.value)}
								<line
									class="grid"
									x1="0"
									x2={innerWidth}
									y1={tick.position}
									y2={tick.position}
								/>
								<text x={-TICK_GAP} y={tick.position} dy="0.32em" text-anchor="end">
									{tick.value}
								</text>
							{/each}

							{#each chart.xTicks as tick (tick.value.getTime())}
								<text
									x={tick.position}
									y={innerHeight + MARGIN.bottom - TICK_GAP}
									text-anchor="middle"
								>
									{tick.label}
								</text>
							{/each}

							<text
								transform="rotate(-90)"
								x={-innerHeight / 2}
								y={-MARGIN.left + TICK_GAP * 2}
								text-anchor="middle"
							>
								gCO₂/kWh
							</text>
						</g>

						<path class="series forecast reveal" style:--order="3" d={chart.forecastPath} />
						{#if showsActual}
							<path class="series actual reveal" style:--order="2" d={chart.actualPath} />
						{/if}

						<!-- The selected period: a line, plus a hollow dot (forecast) and a solid dot (actual),
							so the two are told apart by shape and not only by colour. Order 8 is after both
							lines have finished drawing. Both dots always exist: one that came and went with
							the data would replay its entrance every time it came back. -->
						<line
							class="cursor fade"
							style:--order="8"
							x1={chart.x(selected.time)}
							x2={chart.x(selected.time)}
							y1="0"
							y2={innerHeight}
						/>
						<circle
							class="dot forecast pop"
							style:--order="8"
							cx={chart.x(selected.time)}
							cy={chart.y(selected.forecast)}
							r="4"
						/>
						<!-- Hidden, not removed, while the selected period has no actual yet. A series with no
							actuals at all never has the dot, which does not change while the chart is shown. -->
						{#if showsActual}
							<circle
								class="dot actual pop"
								style:--order="8"
								visibility={selected.actual === null ? "hidden" : "visible"}
								cx={chart.x(selected.time)}
								cy={chart.y(selected.actual ?? 0)}
								r="4"
							/>
						{/if}
					</g>
				</svg>
			{/if}
		</div>

		<!-- A real range input gives keyboard (arrow keys, Home, End) and screen reader support for
			free. Its margins line the track up with the plot above. -->
		<label class="slider" style:margin-inline="{MARGIN.left}px {MARGIN.right}px">
			Select a time to read its values
			<input
				type="range"
				min="0"
				max={points.length - 1}
				step="1"
				value={activeIndex}
				aria-valuetext={readoutText}
				oninput={(event) => (selectedIndex = event.currentTarget.valueAsNumber)}
			/>
		</label>

		<!-- The key says which line is which in words and by line style, not by colour alone. -->
		<ul class="key">
			{#if showsActual}
				<li>
					<svg width="24" height="8" aria-hidden="true">
						<line class="series actual" x1="0" x2="24" y1="4" y2="4" />
					</svg>
					Actual (solid)
				</li>
			{/if}
			<li>
				<svg width="24" height="8" aria-hidden="true">
					<line class="series forecast" x1="0" x2="24" y1="4" y2="4" />
				</svg>
				Forecast (dashed)
			</li>
		</ul>

		<details>
			<summary>View the data as a table</summary>
			<table>
				<caption>Carbon intensity per 30-minute period, in gCO₂/kWh (times are UTC)</caption>
				<thead>
					<tr>
						<th scope="col">Period start</th>
						<th scope="col">Forecast</th>
						{#if showsActual}
							<th scope="col">Actual</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each points as point (point.period)}
						<tr>
							<th scope="row">{dateTimeFormat.format(point.time)}</th>
							<td>{point.forecast}</td>
							{#if showsActual}
								<td>{point.actual ?? "Not available yet"}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</details>
	</figure>
{:else}
	<p>No history is stored yet. Reload in a few minutes to try again.</p>
{/if}

<style>
	/* A percentage width lets the SVG shrink with its container instead of forcing it wider. */
	svg {
		display: block;
		width: 100%;
	}

	text {
		fill: var(--text-muted);
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
	}

	/* Quiet gridlines: the tick labels, the readout and the table carry the values, so the lines
	   only guide the eye. */
	.grid {
		stroke: var(--hairline);
	}

	.series {
		fill: none;
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.actual {
		stroke: var(--text);
	}

	.forecast {
		stroke: var(--accent);
		stroke-dasharray: 5 5;
	}

	/* The key swatches are their own small SVGs, so they must not stretch to full width. */
	.readout {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin-bottom: var(--space-2);
		font-size: var(--text-sm);
	}

	.unit {
		margin-left: calc(var(--space-3) * -1);
		color: var(--text-muted);
	}

	/* touch-action: a sideways drag on the chart selects a period, while up and down still scrolls. */
	.plot {
		touch-action: pan-y;
	}

	.cursor {
		stroke: var(--text-muted);
		stroke-dasharray: 2 3;
	}

	/* The forecast dot is hollow and the actual dot is solid. */
	.dot {
		stroke-width: 2;
	}

	circle.actual {
		fill: var(--text);
		stroke: var(--text);
	}

	circle.forecast {
		fill: var(--surface);
		stroke: var(--accent);
		stroke-dasharray: none;
	}

	.slider {
		display: block;
		margin-top: var(--space-2);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	.slider input {
		display: block;
		width: 100%;
		margin-top: var(--space-1);
		accent-color: var(--accent);
	}

	.key {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		margin-top: var(--space-2);
		list-style: none;
		font-size: var(--text-sm);
	}

	.key li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.key svg {
		width: 24px;
	}

	/* Set off from the chart by a hairline, so the table reads as a footnote to the widget. */
	details {
		margin-top: var(--space-4);
		padding-top: var(--space-3);
		border-top: var(--border-width) solid var(--hairline);
		font-size: var(--text-sm);
	}

	summary {
		width: fit-content;
		color: var(--accent);
		font-weight: 500;
		cursor: pointer;
	}

	table {
		margin-top: var(--space-2);
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}

	caption {
		margin-bottom: var(--space-2);
		color: var(--text-muted);
		text-align: left;
	}

	th,
	td {
		padding: var(--space-1) var(--space-3);
		border-bottom: var(--border-width) solid var(--hairline);
		text-align: left;
	}

	thead th {
		border-bottom-color: var(--border);
		color: var(--text-muted);
		font-weight: 600;
	}
</style>
