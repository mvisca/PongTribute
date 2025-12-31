import { buildApp } from './app.js';
import { GatewayEnv } from './config.js';

async function start() {
	const app = buildApp();

	try {
		await app.listen({ port: GatewayEnv.PORT, host: GatewayEnv.HOST });
		app.log.info(`Gateway listening on http://${GatewayEnv.HOST}:${GatewayEnv.PORT}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

start();

