import { buildApp, UserEnv } from './index.js';

// TODO considerar la opcion de usar SCHWAGER, de ser asi quitar su validacion en runtime para no duplicar con ajv defastify

async function start() {
	const app = buildApp(); // LLAMADA

	try {
		await app.listen({
			port: UserEnv.PORT,
			host: UserEnv.HOST
		});

		console.log(`App log level: ${app.log.level}`);

		app.log.info(`Servicio database 'lisetning' en ${UserEnv.HOST}:${UserEnv.PORT}`);
		app.log.info(`Environment: ${UserEnv.NODE_ENV}`);
		app.log.info(`Database: ${UserEnv.DB_PATH}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

process.on('SIGINT', async() => {
	await new Promise(resolve => setTimeout(resolve, 1000));
	console.log(`\nSTOP (SIGINT) recivido, cerrando el servidor`);
	process.exit(0);
});

process.on('SIGTERM', async() => {
	await new Promise(resolve => setTimeout(resolve, 1000));
	console.log(`\nSTOP (SIGTERM) recivido, cerrando el servidor`);
	process.exit(0);
});

start();