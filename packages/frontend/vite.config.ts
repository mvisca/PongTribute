import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
			'@shared': resolve(__dirname, '../shared')
		}
	},
	// Evita: import { Game } from '../../../shared/index';
	// Permite: import { Game } from '@shared';

	server: {
		port: 3000,
		strictPort: false,
		host: true,
		open: false
	},

	build: {
		outDir: 'dist',
		sourcemap: true, // para ver código typescript original en DevTools
		emptyOutDir: true,
		minify: 'esbuild',
		target: 'es2022'
	},

	optimizeDeps: {
		include: ['babylonjs']
	}
});