import { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { Utils } from '@transcendence/shared';
import { buildApp } from './app.js';
import { CommsEnv } from './config.js';
import { CommsService } from './services/comms.service.js';

let app: FastifyInstance | null = null;
let commsService: CommsService | null = null;
let redisClient: Redis | null = null;
let redisSubClient: Redis | null = null;

async function start() {
  try {
    // 1. Inicializar configuración
    CommsEnv.init();

    // 2. Crear clientes Redis (command + subscriber) en server.ts
    //    redisSub es un duplicado: misma config, conexión independiente.
    //    Redis exige un cliente dedicado solo para subscribe (no puede hacer
    //    otros comandos mientras está en modo suscripción).
    try {
      redisClient = Utils.createRedisClient(CommsEnv.getRedisConfig());
      redisSubClient = redisClient.duplicate();
      console.log('[Comms] Redis clients created');
    } catch (err) {
      console.error('[Comms] Error creating Redis clients:', err);
      process.exit(1);
    }

    // 3. Inicializar CommsService con las dependencias inyectadas
    commsService = new CommsService(redisClient, redisSubClient);
    await commsService.init();

    // 4. Construir app Fastify, pasando commsService como dependencia
    app = buildApp({ commsService });

    // 5. Arrancar servidor HTTP
    await app.listen({
      port: CommsEnv.PORT(),
      host: CommsEnv.HOST()
    });

    console.log(`[Comms] Service listo en ${CommsEnv.HOST()}:${CommsEnv.PORT()}`);

  } catch (err) {
    console.error('[Comms] ERROR:', err instanceof Error ? err.message : err);
    console.log('[Comms] Verifica .env y si no existe ejecuta: "cp .env.example .env"');
    await gracefulShutdown('STARTUP_ERROR');
  }
}

async function gracefulShutdown(signal: string) {
  console.log(`\n[Comms] ${signal} recibido. Cerrando...`);

  // 1. Cerrar servidor HTTP
  if (app) {
    try {
      await app.close();
      console.log('[Comms] Servidor HTTP cerrado');
    } catch (err) {
      console.error('[Comms] Error cerrando servidor:', err);
    }
  }

  // 2. Cerrar CommsService (WS + Redis internos)
  if (commsService) {
    try {
      await commsService.close();
      console.log('[Comms] CommsService cerrado (incluyendo Redis)');
    } catch (err) {
      console.error('[Comms] Error cerrando CommsService:', err);
    }
  }

  process.exit(0);
}

// Manejadores de señales
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Iniciar
start();
