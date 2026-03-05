import Fastify, { FastifyInstance } from 'fastify';
import { BotEnv } from './config.js';
import { RedisSubscriber } from './subscribers/RedisSubscriber.js';

export interface BotAppDependencies {
    redisSubscriber: RedisSubscriber;
}

export function buildApp(deps: BotAppDependencies): FastifyInstance {

    const app = Fastify({
        logger: {
            level: BotEnv.LOG_LEVEL(),
            ...(BotEnv.NODE_ENV() === 'development' && {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'HH:MM:ss Z',
                        ignore: 'pid,hostname'
                    }
                }
            })
        }
    });

    // ── Health check ────────────────────────────────────────────────────────
    // Único endpoint del bot. Solo existe para Docker y monitorización.
    app.get('/health', async (_req, reply) => {
        const redisOk = deps.redisSubscriber.isConnected();
        return reply.status(redisOk ? 200 : 503).send({
            status:  redisOk ? 'ok' : 'degraded',
            service: 'bot',
            redis:   redisOk,
        });
    });

    app.addHook('onRoute', (route) => {
        if (route.method.toString() === 'HEAD') return;
        console.log(`[BOT] [ROUTE] ${route.method.toString().padEnd(7)} ${route.url}`);
    });

    console.log('[BOT] App ready');
    return app;
}