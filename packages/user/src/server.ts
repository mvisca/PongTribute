import { buildApp } from './app';
import { config } from "./config";

async function start() {
	const app = buildApp(); // LLAMADA

	try {
		await app.listen({
			port: config.port,
			host: config.host
		});

		app.log.fatal("HOLA!");
		app.log.info(`Servicio database 'lisetning' en ${config.host}:${config.port}`);
		app.log.info(`Environment: ${config.nodeEnv}`);
		app.log.info(`Database: ${config.dbPath}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

process.on('SIGINT', async() => {
	console.log(`\nSTOP (SIGINT) recivido, cerrando el servidor`);
	process.exit(0);
});

process.on('SIGTERM', async() => {
	console.log(`\nSTOP (SIGTERM) recivido, cerrando el servidor`);
});

start();