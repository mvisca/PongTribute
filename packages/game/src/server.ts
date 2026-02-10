import { buildApp, redisClient } from './app.js';
import { closeDatabase } from './connection.js';
import { GameEnv } from './config.js';
import { FastifyInstance } from 'fastify';
import { MatchRepository } from './repositories/MatchRepository.js';
import { MatchService } from './services/MatchService.js';

let app: FastifyInstance | null = null;

async function start() {
	try {
		// Inicializar config
		GameEnv.init();
		
		// Construir app
		app = buildApp();
		
		// Arrancar el servidor
		await app.listen({
			port: GameEnv.PORT(),
			host: GameEnv.HOST()
		});
		
		console.log(`App log level: ${app.log.level}`);
		console.log(`\nGAME Service listo en http://${GameEnv.HOST()}:${GameEnv.PORT()}`);
		console.log(`DB Path: ${GameEnv.GAME_SERVICE_DB_FULL_PATH()}\n`);
		
		// ========================================================================
		// CRON JOB: PRUNE QUEUES + PRUNE INVITES
		// ========================================================================
		// Instanciamos el servicio (necesita el Repo)
		const matchRepo = new MatchRepository();
		const matchService = new MatchService(matchRepo);

		console.log('⏱️ Iniciando Cron Job: Prune Public Queues (cada 10s)');
		
		// Ejecutar cada 10 segundos
		setInterval(() => {
			// Limpia cola de redis cada 90 seg
			matchService.pruneQueues().catch(err => {
				console.error('❌ Error en Cron PruneQueues:', err);
			});
			// Pone en 'expired' las invitaciones que siguen en 'pending' tras 60 seg
			matchService.prunePrivateInvites().catch(err => {
				console.error('❌ Error en Cron PrunePrivateInvites:', err);
			});
		}, 10000); // 10 segundos
		// ========================================================================
		
	} catch (err) {
		console.log(`ERROR:`, err instanceof Error ? err.message : err);
		console.log('Verifica .env y si no existe ejecuta: "cp .env.example .env"');
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	console.log(`\n${signal} recibido. Iniciando Graceful Shutdown`);
	
	if (redisClient) {
		try {
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

// Manejo de cierre elegante (Graceful Shutdown)
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

start();