import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

let certsHttps: { key: Buffer; cert: Buffer } | undefined;
try {
	certsHttps = {
		key: fs.readFileSync('../nginx/certs/tls.key'),
		cert: fs.readFileSync('../nginx/certs/tls.crt'),
	};
} catch {
	certsHttps = undefined;
}

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
		https: command === 'serve' ? certsHttps : undefined,
		port: 5173,
		strictPort: false,
		host: true,
		open: false,
		proxy: {
			'/api': {
				target: 'https://localhost:8443', // Ojo aquí, revisar
				changeOrigin: true,
				secure: false,
				ws: true,
			},
			'/ws': {
				target: 'wss://localhost:8443', // Ojo aquí, revisar
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