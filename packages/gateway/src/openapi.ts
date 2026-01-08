import type { FastifyReply, FastifyRequest } from 'fastify';
import { GatewayEnv } from './config.js';

function buildGatewayOrigin(request: FastifyRequest): string {
  // Prefer forwarded headers (when behind nginx / docker)
  const xfProto = request.headers['x-forwarded-proto'];
  const proto = Array.isArray(xfProto) ? xfProto[0] : xfProto;

  const host = request.headers['x-forwarded-host'] || request.headers['host'];
  const hostValue = Array.isArray(host) ? host[0] : host;

  const scheme = proto || (request.protocol ?? 'http');
  return `${scheme}://${hostValue}`;
}

async function fetchJsonWithTimeout(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GatewayEnv.UPSTREAM_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { accept: 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Upstream OpenAPI fetch failed (${res.status})`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function createOpenApiHandler(upstreamBase: string, openApiPath: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GatewayEnv.UPSTREAM_TIMEOUT_MS);

    try {
      const upstreamUrl = new URL(openApiPath, upstreamBase).toString();
      const spec = await fetchJsonWithTimeout(upstreamUrl);

      // Force swagger "Try it out" to call the gateway
      const origin = buildGatewayOrigin(request);
      spec.servers = [{ url: origin }];

      reply.header('content-type', 'application/json; charset=utf-8');
      return reply.send(spec);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return reply.status(504).send({
          error: 'Gateway Timeout',
          message: 'Upstream OpenAPI request timed out'
        });
      }

      return reply.status(502).send({
        error: 'Bad Gateway',
        message: 'Unable to fetch upstream OpenAPI spec'
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}
