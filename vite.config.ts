import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-node builds a standalone Node server into build/ (start it with `node build`).
			// The app must run as one long-lived process, because lazy refresh keeps its
			// single-flight guard in memory (see Hosting in the README).
			adapter: adapter()
		})
	]
});
