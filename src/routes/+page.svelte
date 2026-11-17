<script lang="ts">
	import FuelMixCard from "#lib/components/FuelMixCard.svelte";
	import IntensityNowCard from "#lib/components/IntensityNowCard.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Home | Carbon Dash</title>
</svelte:head>

<h1>Great Britain Carbon Intensity</h1>

<div class="cards">
	<IntensityNowCard intensity={data.intensity} />
	<FuelMixCard mix={data.generation.mix} />
</div>

<style>
	h1 {
		margin-bottom: var(--space-4);
	}

	/*
	 * Mobile first, with no media query: as many columns as fit, each at least 18rem.
	 * min(100%, 18rem) lets a column shrink below 18rem on very narrow screens
	 * instead of overflowing.
	 */
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
		gap: var(--space-4);
		max-width: var(--content-max-width);
	}
</style>
