import { Token } from 'node_modules/@sinclair/typebox/build/esm/parser/runtime/index.mjs';
import { buildApp, UserEnv, redisClient, closeDatabase } from './index.js';
import { TokenService } from './index.js';

let app: ReturnType<typeof buildApp> | null = null;

async function start() {
	try {
		app = buildApp();
	} catch (err) {
		console.log('Error al lanzar:', err);
		process.exit(1);
	}

	try {
		await app.listen({
			port: UserEnv.PORT,
			host: UserEnv.HOST
		});
        
		console.log(`App log level: ${app.log.level}`);
        
		app.log.info(`Servicio user listening en ${UserEnv.HOST}:${UserEnv.PORT}`);
		app.log.info(`Environment: ${UserEnv.NODE_ENV}`);
		app.log.info(`Database: ${UserEnv.USER_SERVICE_DB_FULL_PATH}`);
        
		// Limpieza de tabla 'refresh_tokens' para development y production
		if (UserEnv.NODE_ENV !== 'test') {
			const tokenService = new TokenService();
			setInterval(async () => {
				try {
					await tokenService.cleanExpired();
					console.info(`[${Date.now()}] Expired refresh tokens cleaned`);
                    
				} catch(err) {
					console.error(err, 'Error durante la limpieza de refresh tokens expirados');
				}
			}, 1000 * 60 * 60);
		}
	} catch (err) {
		console.error(err);
		await gracefulShutdown('STARTUP_ERROR');
		process.exit(1);
	}
}

async function gracefulShutdown(signal: string) {
	console.log(`\n${signal} recibido. Iniciando Graceful Shutdown`);

	if (redisClient) {
		try {
			// @ts-ignore
			await redisClient.quit();
			console.log('USER: Redis desconectado');
		} catch (err) {
			console.error('Error cerrando Redis', err);
		}
	}

	if (app) {
		try {
			await app.close();
			console.log('USER: Fastify HTTP server cerrado');
		} catch (err) {
			console.error('Error cerrando Fastify', err);
		}
	}

	try {
		closeDatabase();
		console.log('USER: Base de Datos cerrada');
	} catch (err) {
		console.error('Error cerrando DB', err);
	}

	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();

//TODO centralizar manejo de señales, esta dentro de GetDatabase y en start()