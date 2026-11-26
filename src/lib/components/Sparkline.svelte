<script lang="ts">
	import { scaleLinear, scaleUtc } from "d3-scale";
	import { line } from "d3-shape";

	/**
	 * A small line of forecasts over time, with no axes, and a dot on the newest period. It shows
	 * the shape of the data only: the caller puts the numbers next to it as text, and passes a
	 * `label` that says in words what the line shows.
	 */
	let {
		periods,
		label
	}: {
		/** Oldest first. `period` is the start of the period, as an ISO string. */
		periods: { period: string; forecast: number }[];
		/** The accessible name, for example "Forecast for London over the last 24 hours, 80 to 210 gCO2/kWh". */
		label: string;
	} = $props();

	const HEIGHT = 64;
	// Room around the line so the stroke and the dot are not cut off at the edges, in SVG units.
	const PADDING = 5;

	// Measured, like LineChart: 0 until the browser has measured it, so nothing is drawn on the server.
	let width = $state(0);

	// $derived.by: the scales and the path depend on the data and the width, so they are built
	// together and always change together.
	const chart = $derived.by(() => {
		if (periods.length === 0 || width === 0) return null;

		const points = periods.map((p) => ({ time: new Date(p.period), forecast: p.forecast }));
		const x = scaleUtc()
			.domain([points[0].time, points[points.length - 1].time])
			.range([PADDING, width - PADDING]);
		// From 0, like every chart in the app (README, UI decisions), so a flat line near the top
		// really means "high" and is not just the zoomed-in shape of a small change.
		// At least 1: a region at 0 the whole time (North Scotland has been) would give a domain of
		// [0, 0], and d3 draws that in the middle of the chart, not along the bottom.
		const highest = Math.max(1, ...points.map((p) => p.forecast));
		const y = scaleLinear()
			.domain([0, highest])
			.range([HEIGHT - PADDING, PADDING]);

		const path = line<(typeof points)[number]>()
			.x((p) => x(p.time))
			.y((p) => y(p.forecast));

		const newest = points[points.length - 1];
		return {
			path: path(points),
			dot: { cx: x(newest.time), cy: y(newest.forecast) }
		};
	});
</script>

<div class="plot" style:height="{HEIGHT}px" bind:clientWidth={width}>
	{#if chart}
		<svg viewBox="0 0 {width} {HEIGHT}" height={HEIGHT} role="img" aria-label={label}>
			<!-- The shared chart entrance (see layout.css): the line is revealed left to right, then
				the dot pops in once it has drawn. -->
			<path class="line reveal" style:--order="2" d={chart.path} />
			<circle class="dot pop" style:--order="7" cx={chart.dot.cx} cy={chart.dot.cy} r="3.5" />
		</svg>
	{/if}
</div>

<style>
	svg {
		display: block;
		width: 100%;
	}

	.line {
		fill: none;
		stroke: var(--accent);
		stroke-width: 2;
		stroke-linejoin: round;
	}

	/* Hollow, like the forecast dot in LineChart. */
	.dot {
		fill: var(--surface);
		stroke: var(--accent);
		stroke-width: 2;
	}
</style>
