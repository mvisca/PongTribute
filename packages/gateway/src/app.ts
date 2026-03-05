import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import swaggerUi from '@fastify/swagger-ui';
import swagger from '@fastify/swagger';
import websocket from '@fastify/websocket';
import helmet from '@fastify/helmet';
import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';
import { GatewayEnv, getFastifyConfig } from './config.js';
import { createProxyHandler } from './proxy.js';
import { createOpenApiHandler } from './openapi.js';
import { healthRoutes } from './routes/health.routes.js';

function closeWithFallback(ws: WebSocket, code = 1000, reason = 'closing', timeoutMs = 500) {
	try {
		if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
			ws.close(code, reason);
		}
	} catch { }

	// If the close handshake doesn't complete, force close the TCP socket
	setTimeout(() => {
		try {
			if (ws.readyState !== WebSocket.CLOSED) ws.terminate();
		} catch { }
	}, timeoutMs);
}

function normalizeHeaderValue(value: undefined | string | string[]): string | undefined {
	if (value === undefined) return undefined;
	return Array.isArray(value) ? value[0] : value;
}

function parseWsAllowedOrigins(): Set<string> {
	const raw = (GatewayEnv.WS_ALLOWED_ORIGINS || '').trim();
	const list = raw.length ? raw.split(',') : [GatewayEnv.CORS_ORIGIN];
	return new Set(list.map((s) => s.trim()).filter(Boolean));
}

function getClientIp(req: FastifyRequest): string {
	// Prefer forwarded header (common in docker/nginx). Keep it simple + explainable.
	const xff = normalizeHeaderValue(req.headers['x-forwarded-for']);
	if (xff) return xff.split(',')[0].trim();
	return (req.ip || req.socket?.remoteAddress || 'unknown').toString(); // joan: añado ? para evitar el crash si no existe
}

export function buildApp(): FastifyInstance {
	const app = Fastify(getFastifyConfig());
	
	const wsAllowedOrigins = parseWsAllowedOrigins();
	const wsConnectionCountsByIp = new Map<string, number>();
	let wsTotalConnections = 0;

	// Parse everything as Buffer to forward transparently
	app.addContentTypeParser(
		'*',
		{ parseAs: 'buffer', bodyLimit: GatewayEnv.BODY_LIMIT },
		(_request: FastifyRequest, payload: Buffer, done: (err: Error | null, body?: Buffer) => void) => done(null, payload)
	);

	app.register(websocket);

	// Agrega headers de seguridad (x-Content-Type-Options, X-Frame-Options, Script-Transport-Security) con 2 exclusiones
	app.register(helmet, {
		contentSecurityPolicy: false, // Previene MIME Sniffing
		crossOriginEmbedderPolicy: false
	});

	// CORS only at the gateway
	app.register(cors, {
		origin: GatewayEnv.CORS_ORIGIN
			.split(',')
			.map(s => s.trim())
			.filter(Boolean),
		credentials: true
	});

	// Request id + timing
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

	// Registrar health check route
	app.register(healthRoutes);

	// Swagger UI (aggregator)
	app.register(swagger, {
		openapi: {
			info: {
				title: 'Gateway docs',
				version: '1.0.0'
			}
		}
	});

	app.register(swaggerUi, {
		routePrefix: '/docs',
		uiConfig: {
			persistAuthorization: true,
			urls: [
				{ name: 'Auth Service', url: '/docs/auth.json' },
				{ name: 'User Service', url: '/docs/user.json' },
				{ name: 'Game Service', url: '/docs/game.json' }
			],
			docExpansion: 'list',
			deepLinking: true
		}
	});

	// OpenAPI JSON endpoints served by the gateway (rewritten servers => gateway origin)
	app.get('/docs/auth.json', createOpenApiHandler(GatewayEnv.AUTH_SERVICE_URL, GatewayEnv.AUTH_OPENAPI_PATH));
	app.get('/docs/user.json', createOpenApiHandler(GatewayEnv.USER_SERVICE_URL, GatewayEnv.USER_OPENAPI_PATH));
	app.get('/docs/game.json', createOpenApiHandler(GatewayEnv.GAME_SERVICE_URL, GatewayEnv.GAME_OPENAPI_PATH));

	// HTTP proxy routes
	const proxy = createProxyHandler(app);


	// =========================================================================
	// HELPER: Proxy WebSocket dinámico
	// Aisla la lógica compleja de los websockets en una unica función mantenible
	// =========================================================================
	function registerWsProxy(route: string, targetServiceUrl: string) {
		// Le decimos a Fastify que intercepte la ruta dinámica (route) y que active el soporte para WebSockets.
		app.get(route, { websocket: true }, (connection, req) => {
			// @fastify/websocket v8+ pasa el WebSocket directamente como primer argumento.
			// No usar (connection as any).socket: ws@8 expone un getter .socket que retorna
			// el net.Socket subyacente (TCP), no el WebSocket, rompiendo readyState y send().
			const client = connection as unknown as WebSocket;
			const requestId = (req as any).gatewayRequestId as string | undefined;
			const clientIp = getClientIp(req);

			// --- Security: Origin check (WS is not covered by CORS) ---
			const origin = normalizeHeaderValue(req.headers.origin);
			if (origin && !wsAllowedOrigins.has(origin)) {
				app.log.warn({ requestId, origin, clientIp }, 'ws rejected: origin not allowed');
				closeWithFallback(client, 1008, 'Origin not allowed', 200);
				return;
			}

			// --- Basic connection limiting (global + per IP) ---
			const currentIpCount = wsConnectionCountsByIp.get(clientIp) ?? 0;
			if (wsTotalConnections >= GatewayEnv.WS_MAX_CONNECTIONS || currentIpCount >= GatewayEnv.WS_MAX_CONNECTIONS_PER_IP) {
				app.log.warn({ requestId, clientIp, wsTotalConnections, currentIpCount }, 'ws rejected: too many connections');
				closeWithFallback(client, 1013, 'Try again later', 200);
				return;
			}

			wsTotalConnections += 1;
			wsConnectionCountsByIp.set(clientIp, currentIpCount + 1);

			// Transformamos la URL base (http -> ws) e inyectamos la ruta dinámica.
			// Para abrir un websocket, Node.js necesita que la URL empiece por ws://
			const wsBase = targetServiceUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:').replace(/\/$/, '');
			// req.raw.url es la URL completa tal como llega a Node.js (IncomingMessage.url):
			// incluye siempre el path + query string antes de cualquier procesamiento de Fastify.
			// Ej: "/api/game/ws?matchId=<uuid>&token=<jwt>"
			const rawUrl      = req.raw.url ?? req.url ?? route;
			const qIdx        = rawUrl.indexOf('?');
			const query       = qIdx !== -1 ? rawUrl.slice(qIdx) : '';
			const upstreamUrl = `${wsBase}${route}${query}`;


			const clientProtocolsRaw = normalizeHeaderValue(req.headers['sec-websocket-protocol']);
			const clientProtocols = clientProtocolsRaw
				? clientProtocolsRaw.split(',').map((p) => p.trim()).filter(Boolean)
				: undefined;

			app.log.info({ requestId, clientIp, origin, upstreamUrl }, 'ws accepted: opening upstream');

			const upstream = new WebSocket(upstreamUrl, clientProtocols);

			let cleanedUp = false;
			const queuedClientMessages: WebSocket.RawData[] = [];
			let queuedBytes = 0;

			const upstreamOpenTimeout = setTimeout(() => {
				closeWithFallback(client, 1011, 'Upstream not available', 200);
				closeWithFallback(upstream, 1011, 'Upstream open timeout', 200);
				cleanup();
			}, GatewayEnv.WS_UPSTREAM_OPEN_TIMEOUT_MS);

			let clientAlive = true;
			let upstreamAlive = true;
			let pingInterval: NodeJS.Timeout | null = null;
			let pongTimeout: NodeJS.Timeout | null = null;

			function scheduleHeartbeatCheck() {
				if (pongTimeout) clearTimeout(pongTimeout);
				pongTimeout = setTimeout(() => {
					if (!clientAlive) closeWithFallback(client, 1002, 'Client heartbeat failed', 200);
					if (!upstreamAlive) closeWithFallback(upstream, 1002, 'Upstream heartbeat failed', 200);
					cleanup();
				}, GatewayEnv.WS_PONG_TIMEOUT_MS);
			}

			function startHeartbeat() {
				if (pingInterval) return;
				pingInterval = setInterval(() => {
					clientAlive = false;
					upstreamAlive = false;
					try { if (client.readyState === WebSocket.OPEN) client.ping(); } catch { }
					try { if (upstream.readyState === WebSocket.OPEN) upstream.ping(); } catch { }
					scheduleHeartbeatCheck();
				}, GatewayEnv.WS_PING_INTERVAL_MS);
			}

			function cleanup() {
				if (cleanedUp) return;
				cleanedUp = true;
				clearTimeout(upstreamOpenTimeout);
				if (pingInterval) clearInterval(pingInterval);
				if (pongTimeout) clearTimeout(pongTimeout);
				try { client.removeAllListeners(); } catch { }
				try { upstream.removeAllListeners(); } catch { }

				wsTotalConnections = Math.max(0, wsTotalConnections - 1);
				const prev = wsConnectionCountsByIp.get(clientIp) ?? 1;
				const next = prev - 1;
				if (next <= 0) wsConnectionCountsByIp.delete(clientIp);
				else wsConnectionCountsByIp.set(clientIp, next);
			}

			client.on('pong', () => { clientAlive = true; });
			upstream.on('pong', () => { upstreamAlive = true; });

			upstream.on('open', () => {
				clearTimeout(upstreamOpenTimeout);
				for (const data of queuedClientMessages) {
					if (upstream.readyState !== WebSocket.OPEN) break;
					upstream.send(data);
				}
				queuedClientMessages.length = 0;
				queuedBytes = 0;
				startHeartbeat();
			});

			upstream.on('message', (data: WebSocket.RawData) => {
				if (client.readyState !== WebSocket.OPEN) {
					closeWithFallback(upstream, 1000, 'client not open', 200);
					return;
				}
				if (client.bufferedAmount > GatewayEnv.WS_MAX_BUFFERED_AMOUNT_BYTES) {
					closeWithFallback(client, 1013, 'Client too slow', 200);
					closeWithFallback(upstream, 1013, 'Client too slow', 200);
					cleanup();
					return;
				}
				client.send(data);
			});

			upstream.on('close', (code, reason) => {
				closeWithFallback(client, code, reason.toString(), 500);
				cleanup();
			});

			upstream.on('error', () => {
				closeWithFallback(client, 1011, 'Upstream error', 500);
				cleanup();
			});

			client.on('message', (data: WebSocket.RawData) => {
				if (upstream.readyState === WebSocket.OPEN) {
					if (upstream.bufferedAmount > GatewayEnv.WS_MAX_BUFFERED_AMOUNT_BYTES) {
						closeWithFallback(client, 1013, 'Upstream busy', 200);
						closeWithFallback(upstream, 1013, 'Upstream busy', 200);
						cleanup();
						return;
					}
					upstream.send(data);
					return;
				}

				if (upstream.readyState === WebSocket.CONNECTING) {
					const bytes = Buffer.byteLength(data as any);
					if (queuedClientMessages.length + 1 > GatewayEnv.WS_MAX_BUFFERED_MESSAGES || queuedBytes + bytes > GatewayEnv.WS_MAX_BUFFERED_BYTES) {
						closeWithFallback(client, 1013, 'Upstream not ready', 200);
						closeWithFallback(upstream, 1013, 'Client sent too early', 200);
						cleanup();
						return;
					}
					queuedClientMessages.push(data);
					queuedBytes += bytes;
					return;
				}

				closeWithFallback(client, 1011, 'Upstream not open', 200);
				cleanup();
			});

			client.on('close', (code, reason) => {
				closeWithFallback(upstream, code, reason.toString(), 500);
				cleanup();
			});

			client.on('error', () => {
				closeWithFallback(upstream, 1011, 'Client error', 500);
				cleanup();
			});
		});
	}

	// =========================================================================
	// REGISTRO DE RUTAS WEBSOCKET
	// =========================================================================
	// Llamamos a la función inyectando la ruta de "Game".
	registerWsProxy('/api/game/ws', GatewayEnv.GAME_SERVICE_URL);
	// Reutilizamos toda la lógica de seguridad y backpressure para "Comms".
	registerWsProxy('/api/comms/ws', GatewayEnv.COMMS_SERVICE_URL);




	const authProxy = proxy(GatewayEnv.AUTH_SERVICE_URL);
	app.all('/api/auth', authProxy);
	app.all('/api/auth/*', authProxy);

	const userProxy = proxy(GatewayEnv.USER_SERVICE_URL);
	app.all('/api/users', userProxy);
	app.all('/api/users/*', userProxy);
	app.all('/api/friendships', userProxy);
	app.all('/api/friendships/*', userProxy);

	const gameProxy = proxy(GatewayEnv.GAME_SERVICE_URL);
	app.all('/api/matches', gameProxy);
	app.all('/api/matches/*', gameProxy);

	const commsProxy = proxy(GatewayEnv.COMMS_SERVICE_URL);
	app.all('/api/comms/*', commsProxy);

	app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
		reply.status(404).send({
			error: 'Not Found',
			message: 'Route not handled by gateway'
		});
	});

	return app;
}
