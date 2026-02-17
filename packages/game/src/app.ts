// Tu trabajo es CONFIGURAR FASTIFY

import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import fastifyWebsocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { gameRoutes } from './index.js';
import { GameEnv } from './config.js';

// 1. IMPORTAMOS LA CONSTANTE DESDE SHARED (Arquitectura correcta & Docker-proof)
import { SWAGGER_THEME_CSS } from '@transcendence/shared';

// NOTA: Eliminamos 'fs', 'path' y 'url' porque ya no leemos archivos del disco.

export function buildApp(): FastifyInstance {
    
    // Eliminamos el cálculo de __dirname, ya no hace falta.
    
    // Inicialización de Fastify
    const app = Fastify(GameEnv.getFastifyConfig());
    
    // Plugins Globales de Seguridad
    app.register(helmet, {
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    });
    
    // Plugins de documentación (Swagger Core)
    app.register(swagger, {
        openapi: {
            info: {
                title: 'Transcendence Game API',
                version: '1.0.0'
            },
            servers: [
                { url: `http://localhost:${GameEnv.PORT()}` }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            },
            security: [{ bearerAuth: [] }],
            tags: [
                { name: 'Game', description: 'Game service' }
            ]
        },
        transform: ({ schema, url }) => {
            return { schema, url };
        }
    });

    // Swagger UI (Visual)
    app.register(swaggerUI, {
        routePrefix: '/docs',
        staticCSP: true,
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false
        },
        theme: {
            title: 'Transcendence Game API',
            // 2. INYECTAMOS EL CSS DIRECTAMENTE COMO CÓDIGO
            css: [
                {
                    filename: 'swagger-custom.css',
                    content: SWAGGER_THEME_CSS // <--- Aquí la magia
                }
            ]
        }
    });
    
    
    // REGISTRO DE WEBSOCKETS
    app.register(fastifyWebsocket);
    
    // Hooks Globales (Logging Visual de Rutas)
    app.addHook('onRoute', (route) => {
        const method = route.method.toString();
        
        if (method == 'HEAD') return;
        
        const url = route.url;
        const icon = {
            POST: 'GAME 📝: ',
            GET: 'GAME 📖:',
            PUT: 'GAME ✏️:',
            DELETE: 'GAME 🗑️:',
            PATCH: 'GAME 🔧:'
        }[method as string] || '📌';
        console.log(`${icon} ${method.padEnd(7)} ${url}`);
    });

    // REGISTRO DE RUTAS PRINCIPAL
    console.log('REG GAME ROUTES');
    app.register(gameRoutes, { prefix: '/api' });
    
    // Manejador de Errores 404
    app.setNotFoundHandler((request, reply) => {
        return reply.status(404).send({
            error: 'Not found',
            message: `Route ${request.method} ${request.url} no encontrada`,
        });
    });
    
    console.log('Returning App: GAME');
    return app;
}