<script lang="ts">
	import type { Snippet } from "svelte";

	let { children }: { children: Snippet } = $props();
</script>

<article class="dash-ele">{@render children()}</article>

<style>
	.dash-ele {
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-sm);
		padding: var(--space-2);
	}
</style>
