import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	css: {
		preprocessorOptions: {
			scss: {
				// @ts-expect-error - api option is available in newer vite versions but types might be lagging
				api: 'modern-compiler'
			}
		}
	},
});
