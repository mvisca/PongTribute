import { FastifyInstance } from 'fastify';
import { buildApp, redisClient, commsService } from './app.js';
import { CommsEnv } from './config.js';
import { CommsService } from './services/comms.service.js';

// TODO resolver redis redundante
/*
 comms/server.ts crea CommsService duplicado
Archivo: packages/comms/src/server.ts y packages/comms/src/app.ts
En app.ts se exporta commsService (inicialmente null). En server.ts se crea un new CommsService() y se asigna a (global as any).commsService. Pero app.ts también crea un redisClient que no se comparte con ese servicio. El resultado es que hay 3 conexiones Redis en comms: una en app.ts (redisClient), y dos dentro de CommsService (redis + redisSub), más la del health check que recibe el redisClient de app.ts. El redisClient de app.ts nunca se cierra en el gracefulShutdown de server.ts (solo se cierra el del service y el de la referencia global).
Severidad: MEDIO — Conexión Redis huérfana; posible resource leak
*/
let app: FastifyInstance | null = null;

async function start() {
  try {
    // 1. Inicializar configuración
    CommsEnv.init();
    
    // 2. Construir app Fastify
    app = buildApp();
    
    // 3. Inicializar CommsService (requiere Redis ya conectado)
    const service = new CommsService();
    await service.init();
    
    // Exportar para uso global (necesario en routes)
    (global as any).commsService = service;
    
    // 4. Arrancar servidor HTTP
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

  // 2. Cerrar CommsService (WS + Redis)
  const service = (global as any).commsService as CommsService | undefined;
  if (service) {
    try {
      await service.close();
      console.log('[Comms] CommsService cerrado');
    } catch (err) {
      console.error('[Comms] Error cerrando CommsService:', err);
    }
  }

  // 3. Cerrar Redis client global
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('[Comms] Redis cerrado');
    } catch (err) {
      console.error('[Comms] Error cerrando Redis:', err);
    }
  }

  process.exit(0);
}

// Manejadores de señales
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Iniciar
start();