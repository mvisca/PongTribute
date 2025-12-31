import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { GatewayEnv } from './config.js';

const HOP_BY_HOP_HEADERS = new Set([
	'connection',
	'keep-alive',
	'proxy-authenticate',
	'proxy-authorization',
	'proxy-connection',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'host',
	'expect',
	'content-length'
]);

type ProxyHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
type ProxyBody = Uint8Array | string;

function buildOutgoingHeaders(request: FastifyRequest, requestId: string): Record<string, string> {
	const headers: Record<string, string> = {};

	for (const [key, value] of Object.entries(request.headers)) {
		const lowerKey = key.toLowerCase();
		if (HOP_BY_HOP_HEADERS.has(lowerKey)) continue;
		if (value === undefined) continue;

		const normalizedValue = Array.isArray(value) ? value.join(',') : String(value);
		headers[key] = normalizedValue;
	}

	headers['x-request-id'] = requestId;

	return headers;
}

function buildUpstreamUrl(targetBase: string, request: FastifyRequest, overridePath?: string): string {
	const pathAndQuery = request.raw.url || request.url || '/';

	if (overridePath) {
		let search = '';
		try {
			const parsed = new URL(pathAndQuery, 'http://placeholder');
			search = parsed.search;
		} catch {
			search = '';
		}

		const normalizedPath = overridePath.startsWith('/') ? overridePath : `/${overridePath}`;
		return new URL(`${normalizedPath}${search}`, targetBase).toString();
	}

	return new URL(pathAndQuery, targetBase).toString();
}

function buildRequestBody(request: FastifyRequest): ProxyBody | undefined {
	if (request.method === 'GET' || request.method === 'HEAD') return undefined;

	const body = request.body as unknown;
	if (body === undefined || body === null) return undefined;

	if (body instanceof Uint8Array || typeof body === 'string') {
		return body;
	}

	try {
		return JSON.stringify(body);
	} catch {
		return undefined;
	}
}

export function createProxyHandler(app: FastifyInstance) {
	return (targetBase: string, overridePath?: string): ProxyHandler => {
		return async (request, reply) => {
			const requestId = (request as any).gatewayRequestId as string | undefined || randomUUID();
			const upstreamUrl = buildUpstreamUrl(targetBase, request, overridePath);

			(request as any).gatewayUpstream = upstreamUrl;

			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), GatewayEnv.UPSTREAM_TIMEOUT_MS);

			try {
				const headers = buildOutgoingHeaders(request, requestId || '');
				const body = buildRequestBody(request);

				const init: RequestInit & { duplex?: 'half' } = {
					method: request.method,
					headers,
					redirect: 'manual',
					signal: controller.signal
				};

				if (body !== undefined) {
					init.body = body;
				}

				const upstreamResponse = await fetch(upstreamUrl, init);
				clearTimeout(timeout);

				reply.status(upstreamResponse.status);

				upstreamResponse.headers.forEach((value, key) => {
					if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
						reply.header(key, value);
					}
				});

				if (requestId) {
					reply.header('x-request-id', requestId);
				}

				const responseBody = upstreamResponse.body;
				if (!responseBody) {
					return reply.send();
				}

				const stream = Readable.fromWeb(responseBody as any);
				return reply.send(stream);
			} catch (error: any) {
				clearTimeout(timeout);

				if (error?.name === 'AbortError') {
					return reply.status(504).send({
						error: 'Gateway Timeout',
						message: 'Upstream request timed out'
					});
				}

				app.log.error(
					{
						err: error,
						upstream: upstreamUrl,
						requestId,
						hasAuthHeader: Boolean(request.headers['authorization'])
					},
					'Upstream request failed'
				);

				return reply.status(502).send({
					error: 'Bad Gateway',
					message: 'Unable to reach upstream service'
				});
			}
		};
	};
}

