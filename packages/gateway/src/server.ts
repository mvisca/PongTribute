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
		// En Pino: el objeto de contexto va PRIMERO, el mensaje va SEGUNDO
		// y es distinto de console.error que no tiene estructura.
		// Pino serializa el err como un objeto JSON con { message, stack, 
		// type } — buscable y filtrable. Con console.error es texto plano, 
		// imposible de procesar automáticamente.
		app.log.error(err, 'Gateway failed to start');
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
		appRef.log.error(err, 'Gateway shutdown error');
	} finally {
		process.exit(0);
	}
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

start();

