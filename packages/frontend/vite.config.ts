// import { defineConfig } from 'vite';
// import { resolve } from 'path';

// export default defineConfig({
// 	resolve: {
// 		alias: {
// 			'@': resolve(__dirname, './src'),
// 			'@shared': resolve(__dirname, '../shared'),
// 		}
// 	},

// 	build: {
// 		outDir: 'dist',
// 		sourcemap: true, // para ver código typescript original en DevTools
// 		emptyOutDir: true,
// 		minify: 'esbuild',
// 		target: 'es2022',
// 		rollupOptions: {
// 			external: [
// 				'path', 'fs', 'url',
// 				'crypto', 'net', 'tls',
// 				'stream', 'events', 'util',
// 				'dns', 'assert'
// 			],
// 			onwarn(warning, warn) {
// 				if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return; // surpime 'use client'
// 				if (warning.loc?.file?.includes('react-router')) return; // suprime warn de errores conocidos de dom-export.mjs
// 				warn(warning);
// 			}
// 		}
// 	},

// 	server: {
// 		port: 5173,
// 		strictPort: false,
// 		host: true,
// 		open: false,
// 		proxy: {
// 			'/api': {
// 				target: 'https://localhost',
// 				changeOrigin: true,
// 				secure: false,
// 			},
// 			'/ws': {
// 				target: 'wss://localhost',
// 				changeOrigin: true,
// 				secure: false,
// 				ws: true,
// 			}
// 		}
// 	},

// 	optimizeDeps: {
// 		include: ['babylonjs']
// 	},

// });

import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig(({ command }) => ({
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
			'@shared': resolve(__dirname, '../shared'),
		}
	},

	build: {
		outDir: 'dist',
		sourcemap: true,
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
				if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
				if (warning.loc?.file?.includes('react-router')) return;
				warn(warning);
			}
		}
	},

	server: {
		watch: {
			usePolling: true,
			interval: 300
    	},
		https: command === 'serve' ? {
			key:  fs.readFileSync('../nginx/certs/tls.key'),
			cert: fs.readFileSync('../nginx/certs/tls.crt'),
		} : undefined,
		port: 5173,
		strictPort: false,
		host: true,
		open: false,
		proxy: {
			'/api': {
				target: 'https://localhost',
				changeOrigin: true,
				secure: false,
				ws: true,
			},
			'/ws': {
				target: 'wss://localhost',
				changeOrigin: true,
				secure: false,
				ws: true,
			}
		}
	},

	optimizeDeps: {
		include: ['babylonjs']
	},
}));