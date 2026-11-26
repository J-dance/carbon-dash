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
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-pill);
		background: var(--surface-sunken);
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

	/* Five bars that rise like a signal meter, so a higher band looks bigger as well as having more
	   bars filled. Empty bars use --border, which is 3:1 against the badge, so all five show. */
	.meter {
		display: inline-flex;
		align-items: flex-end;
		gap: 2px;
		height: 0.875rem;
	}

	.meter i {
		width: 4px;
		border-radius: 1px;
		background: var(--border);
	}

	.meter i:nth-child(1) {
		height: 40%;
	}
	.meter i:nth-child(2) {
		height: 55%;
	}
	.meter i:nth-child(3) {
		height: 70%;
	}
	.meter i:nth-child(4) {
		height: 85%;
	}
	.meter i:nth-child(5) {
		height: 100%;
	}

	.meter i.filled {
		background: var(--text);
	}
</style>
