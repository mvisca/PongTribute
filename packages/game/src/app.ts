import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import helmet from '@fastify/helmet';
import fastifyWebsocket from '@fastify/websocket';
import { gameRoutes } from './index.js';
import { GameEnv } from './config.js';

export function buildApp(): FastifyInstance {
    // 1. Inicialización con Configuración (Logger, etc.)
    const app = Fastify(GameEnv.getFastifyConfig());

    // 2. Plugins Globales de Seguridad
    app.register(helmet, { 
        contentSecurityPolicy: false, // Ajustar según necesidad del juego
        crossOriginEmbedderPolicy: false 
    });

	// 2.1. REGISTRO DE WEBSOCKETS
    // Esto habilita ws:// en tu servidor
    app.register(fastifyWebsocket);

    // 3. Hooks Globales (Logging de peticiones)
    app.addHook('onRoute', (route) => {
        const method = route.method.toString();
        if (method === 'HEAD') return;
        console.log(`GAME: ${method.padEnd(7)} ${route.url}`);
    });

    // 4. Health Check (Vital para Docker/K8s)
    app.get('/health', async () => {
        return { status: 'OK', service: 'GAME SERVICE', timestamp: new Date() };
    });

    // 5. Registro de Rutas del Dominio
    // Prefijo '/api' para que quede como: POST /api/matches
    app.register(gameRoutes, { prefix: '/api' });

    // 6. Manejador de Errores Global
    app.setErrorHandler((error, request, reply) => {
        request.log.error(error);

        // Si es un error de validación de Schema (Fastify nativo)
        if ((error as any).validation) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'Error de validación en los datos enviados',
                details: (error as any).validation
            });
        }

        const statusCode = (error as FastifyError).statusCode || 500;
        return reply.status(statusCode).send({
            error: (error as FastifyError).name || 'Internal Server Error',
            message: error.message || 'Algo salió mal en el servidor de juego'
        });
    });

    return app;
}