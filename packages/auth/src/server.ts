import { buildApp } from './app';
import { AuthEnv } from './config';

async function start() {
	let app;
	try {
		app = buildApp();
	} catch (err) {
		console.log('Error al lanzar:', err);
		process.exit(1);
	}

	try {
		await app.listen({ port: AuthEnv.PORT, host: '0.0.0.0' });
		console.log(`Auth service activo en puerto ${AuthEnv.PORT}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

process.on('SIGINT', () => {
	console.log('\nSIGINT recibido');
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log('\nSIGTERM recibido');
	process.exit(0);
});

start();