<script lang="ts">
	import Card from "#lib/components/Card.svelte";
	import FuelMixBar from "#lib/components/FuelMixBar.svelte";
	import InfoButton from "#lib/components/InfoButton.svelte";
	import type { Fuel } from "#lib/api/types.ts";

	let { mix }: { mix: Record<Fuel, number> } = $props();
</script>

<Card>
	<h2>Fuel mix now</h2>
	<InfoButton title="Fuel mix now">
		<p>
			Where Great Britain's electricity is coming from right now. Renewables (wind, solar, hydro and
			biomass) and nuclear release little or no CO₂, while fossil fuels (gas and coal) release the
			most.
		</p>
		<p>The more of the bar that is renewable, the cleaner the electricity.</p>
	</InfoButton>
	<FuelMixBar {mix} />
</Card>
