import { buildApp } from './app.js';
import { GatewayEnv } from './config.js';

let appRef: ReturnType<typeof buildApp> | null = null;

async function start() {
	const app = buildApp();
	appRef = app;

	try {
		await app.listen({ port: GatewayEnv.PORT, host: GatewayEnv.HOST });
		app.log.info(`Gateway listening on http://${GatewayEnv.HOST}:${GatewayEnv.PORT}`);
	} catch (err) {
		console.error('Gateway failed to start:', err);
		app.log.error(err);
		process.exit(1);
	}
}

async function shutdown(signal: string) {
	if (!appRef) {
		process.exit(0);
		return;
	}

	try {
		appRef.log.info({ signal }, 'Gateway shutting down...');
		await appRef.close();
	} catch (err) {
		// Don't hang the process on shutdown failures.
		console.error('Gateway shutdown error:', err);
	} finally {
		process.exit(0);
	}
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

start();

