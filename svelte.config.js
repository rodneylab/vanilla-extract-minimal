import preprocess from 'svelte-preprocess';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		adapter: adapter(),
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		vite: {
			optimizeDeps: { include: ['@vanilla-extract/css'] },
			plugins: [vanillaExtractPlugin()],
			ssr:{
				noExternal: ['@vanilla-extract/css', '@vanilla-extract/css/fileScope']
			}
		}
	}
};

export default config;
