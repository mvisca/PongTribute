import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import { GatewayEnv, getFastifyConfig } from './config.js';
import { createProxyHandler } from './proxy.js';

export function buildApp(): FastifyInstance {
	const app = Fastify(getFastifyConfig());

	app.addContentTypeParser(
		'*',
		{ parseAs: 'buffer', bodyLimit: GatewayEnv.BODY_LIMIT },
		(_request: FastifyRequest, payload: Buffer, done: (err: Error | null, body?: Buffer) => void) =>
			done(null, payload)
	);

	app.register(cors, {
		origin: GatewayEnv.CORS_ORIGIN,
		credentials: true
	});

	app.addHook('onRequest', (request: FastifyRequest, reply: FastifyReply, done) => {
		const incoming = request.headers['x-request-id'] || request.headers['request-id'];
		const normalizedIncoming = Array.isArray(incoming) ? incoming[0] : incoming;
		const requestId = normalizedIncoming || randomUUID();

		(request as any).gatewayRequestId = requestId;
		(request as any).gatewayStart = process.hrtime.bigint();
		(request.headers as Record<string, string>)['x-request-id'] = requestId;
		reply.header('x-request-id', requestId);
		done();
	});

	app.addHook('onResponse', (request, reply, done) => {
		const target = (request as any).gatewayUpstream;
		const start = (request as any).gatewayStart as bigint | undefined;
		const durationMs = start ? Number((process.hrtime.bigint() - start) / 1_000_000n) : undefined;
		const requestId = (request as any).gatewayRequestId;

		app.log.info(
			{
				requestId,
				method: request.method,
				url: request.url,
				upstream: target,
				statusCode: reply.statusCode,
				durationMs,
				hasAuthHeader: Boolean(request.headers['authorization'])
			},
			'proxy completed'
		);
		done();
	});

	app.get('/health', async () => {
		return {
			status: 'ok',
			service: 'gateway',
			timestamp: new Date().toISOString()
		};
	});

	const proxy = createProxyHandler(app);

	const authProxy = proxy(GatewayEnv.AUTH_SERVICE_URL);
	app.all('/api/auth', authProxy);
	app.all('/api/auth/*', authProxy);

	const userProxy = proxy(GatewayEnv.USER_SERVICE_URL);
	app.all('/api/users', userProxy);
	app.all('/api/users/*', userProxy);

	const gameProxy = proxy(GatewayEnv.GAME_SERVICE_URL);
	app.all('/api/matches', gameProxy);
	app.all('/api/matches/*', gameProxy);

	app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
		reply.status(404).send({
			error: 'Not Found',
			message: 'Route not handled by gateway'
		});
	});

	return app;
}

