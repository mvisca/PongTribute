import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
			'@shared': resolve(__dirname, '../shared'),
			// Neutralizar módulos Node que deben llegar al browser:
			'path': 'node:path',
			'fs': 'node:fs',
			'url': 'node:url',
		}
	},
	// Evita: import { Game } from '../../../shared/index';
	// Permite: import { Game } from '@shared';
	
	build: {
		outDir: 'dist',
		sourcemap: true, // para ver código typescript original en DevTools
		emptyOutDir: true,
		minify: 'esbuild',
		target: 'es2022',
		rollupOptions: {
			external: [
				'path', 'fs', 'url', 
				'crypto', 'net', 'tls',
				'stream', 'events', 'util',
				'dns', 'assert'
			],
			onwarn(warning, warn) {
				if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return; // surpime 'use client'
				if (warning.loc?.file?.includes('react-router')) return; // suprime wanr de errores conocidos de dom-export.mjs
				warn(warning);
			}
		}
	},

	server: {
		port: 5173,
		strictPort: false,
		host: true,
		open: false
	},


	optimizeDeps: {
		include: ['babylonjs']
	}
});
//TODO separar exports de shared , no mezclar para backen y frontend