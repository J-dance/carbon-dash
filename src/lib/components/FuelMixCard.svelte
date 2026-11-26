<script lang="ts">
	import Card from "#lib/components/Card.svelte";
	import FuelMixBar from "#lib/components/FuelMixBar.svelte";
	import type { Fuel } from "#lib/api/types.ts";

	let { mix }: { mix: Record<Fuel, number> } = $props();
</script>

<Card>
	<h2>Fuel mix now</h2>
	<FuelMixBar {mix} />
</Card>
