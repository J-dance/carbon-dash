<script lang="ts">
	import { TIERS, TIER_LABELS, type Tier } from "#lib/regions/types.ts";
	import FilterLinks from "./FilterLinks.svelte";

	let { current }: { current: Tier | null } = $props();

	// Null is "All": no tier in the URL, so the endpoint returns every region.
	const OPTIONS = [
		{ value: null, label: "All" },
		...TIERS.map((tier) => ({ value: tier, label: TIER_LABELS[tier] }))
	];
</script>

<FilterLinks label="Tier" param="tier" options={OPTIONS} {current} />
