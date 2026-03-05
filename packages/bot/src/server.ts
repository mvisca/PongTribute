import { Redis } from 'ioredis';
import { Utils } from '@transcendence/shared';
import { BotEnv } from './config.js';
import { buildApp } from './app.js';
import { BotService } from './services/BotService.js';
import { BotController } from './controllers/BotController.js';
import { RedisSubscriber } from './subscribers/RedisSubscriber.js';


let app: Awaited<ReturnType<typeof buildApp>> | null = null;
let subscriberRedisClient: Redis | null = null;
let redisSubscriber: RedisSubscriber | null = null;

async function start() {
    try {
        // ── 1. Configuración ─────────────────────────────────────────────
        BotEnv.init();

        // ── 2. Redis ─────────────────────────────────────────────────────
        try {
            subscriberRedisClient = Utils.createRedisClient(BotEnv.getRedisConfig());
            console.log('[BOT] Redis subscriber client created');
        } catch (err) {
            console.error('[BOT] Error connecting to Redis:', err);
            process.exit(1);
        }

        // ── 3. Composition root ──────────────────────────────────────────
        const botService    = new BotService();
        const botController = new BotController(botService);
        redisSubscriber     = new RedisSubscriber(subscriberRedisClient, botController);

        // ── 4. Suscripción Redis ─────────────────────────────────────────
        // Antes de buildApp para que /health reporte estado real desde el inicio
        await redisSubscriber.connect();

        // ── 5. Servidor HTTP (solo /health) ──────────────────────────────
        app = buildApp({ redisSubscriber });

        await app.listen({
            port: BotEnv.PORT(),
            host: BotEnv.HOST(),
        });

        console.log(`[BOT] Service ready at http://${BotEnv.HOST()}:${BotEnv.PORT()}`);
        console.log(`[BOT] Listening for MATCH_BOT_REQUESTED events...`);
        console.log(`[BOT] Game WS endpoint: ${BotEnv.GAME_WS_URL()}`);

    } catch (err) {
        console.error('[BOT] Startup error:', err instanceof Error ? err.message : err);
        console.log('[BOT] Check .env file - if missing, run: "cp .env.example .env"');
        await gracefulShutdown('STARTUP_ERROR');
    }
}

async function gracefulShutdown(signal: string) {
    console.log(`\n[BOT] ${signal} received. Starting graceful shutdown`);

    // 1. Dejar de recibir eventos Redis
    if (redisSubscriber) {
        try {
            await redisSubscriber.disconnect();
            console.log('[BOT] Redis subscriber disconnected');
        } catch (err) {
            console.error('[BOT] Error closing Redis subscriber:', err);
        }
    }

    // 2. Cerrar HTTP
    if (app) {
        try {
            await app.close();
            console.log('[BOT] Fastify server closed');
        } catch (err) {
            console.error('[BOT] Error closing Fastify:', err);
        }
    }

    // // 3. Cerrar Redis
    // if (subscriberRedisClient) {
    //     try {
    //         await subscriberRedisClient.quit();
    //         console.log('[BOT] Redis disconnected');
    //     } catch (err) {
    //         console.error('[BOT] Error closing Redis:', err);
    //     }
    // }

    process.exit(0);
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();