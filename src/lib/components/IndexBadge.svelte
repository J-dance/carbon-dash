<script lang="ts">
	import { INDEXES, type Index } from "#lib/api/types.ts";

	/** The index as a word plus a 5-step meter, so the band never relies on colour alone. */
	let { index }: { index: Index } = $props();

	// 1 (very low) to 5 (very high): how many steps of the meter are filled.
	const level = $derived(INDEXES.indexOf(index) + 1);
</script>

<!-- The word carries the meaning. The meter repeats it visually and is hidden from screen readers. -->
<span class="badge">
	<span class="index">{index}</span>
	<span class="meter" aria-hidden="true">
		{#each INDEXES as _, i}
			<i class:filled={i < level}></i>
		{/each}
	</span>
</span>

<style>
	/* The meter wraps below the word when space is tight (in a table column on a phone). */
	.badge {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
		padding: 0 var(--space-3);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	/* inline-block so ::first-letter applies: "very low" shows as "Very low". nowrap keeps the two
	   words of "very low" together. */
	.index {
		display: inline-block;
		white-space: nowrap;
	}

	.index::first-letter {
		text-transform: uppercase;
	}

	.meter {
		display: inline-flex;
		gap: 2px;
	}

	.meter i {
		width: 7px;
		height: var(--space-3);
		border: var(--border-width) solid var(--text);
	}

	.meter i.filled {
		background: var(--text);
	}
</style>
