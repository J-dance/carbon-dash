<script lang="ts">
	import { RANGES, type Range } from "#lib/regions/types.ts";
	import FilterLinks from "./FilterLinks.svelte";

	let { current }: { current: Range } = $props();

	const OPTION_LABELS: Record<Range, string> = {
		"24h": "24 hours",
		"7d": "7 days",
		"30d": "30 days"
	};

	const OPTIONS = RANGES.map((range) => ({ value: range, label: OPTION_LABELS[range] }));
</script>

<FilterLinks label="Period" param="range" options={OPTIONS} {current} />
