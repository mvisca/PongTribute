/**
 * E2E-ish test for Gateway WebSocket proxy to Game.
 *
 * What it validates (gateway-only):
 * - Proxies messages client <-> upstream
 * - Forwards Sec-WebSocket-Protocol (subprotocols)
 * - Enforces Origin allowlist (policy violation 1008)
 * - Enforces per-IP connection limit (1013)
 * - Sends heartbeat pings to client after upstream open
 *
 * Run:
 *   pnpm --filter @transcendence/gateway test:ws
 */
import WebSocket, { WebSocketServer } from 'ws';
import assert from 'node:assert/strict';

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	let t: NodeJS.Timeout | null = null;
	const timeout = new Promise<never>((_, reject) => {
		t = setTimeout(() => reject(new Error(`Timeout (${label}) after ${ms}ms`)), ms);
	});
	return Promise.race([promise, timeout]).finally(() => {
		if (t) clearTimeout(t);
	});
}

function once<T = any>(emitter: any, event: string): Promise<T> {
	return new Promise((resolve) => emitter.once(event, resolve));
}

function onceClose(ws: WebSocket): Promise<{ code: number; reason: Buffer }> {
	return new Promise((resolve) => {
		ws.once('close', (code, reason) => resolve({ code, reason }));
	});
}

async function startUpstreamMock() {
	const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });

	const firstConnection = new Promise<{
		socket: WebSocket;
		headers: Record<string, string | string[] | undefined>;
	}>((resolve) => {
		wss.once('connection', (socket, req) => {
			resolve({ socket, headers: req.headers as any });
		});
	});

	const addr = wss.address();
	assert.ok(addr && typeof addr !== 'string');
	const port = addr.port;

	return { wss, port, firstConnection };
}

async function startGateway(gameServiceUrl: string) {
	// IMPORTANT: config.ts reads env at import time.
	process.env.GAME_SERVICE_URL = gameServiceUrl;
	process.env.GATEWAY_HOST = '127.0.0.1';

	// Keep the test fast + deterministic
	process.env.GATEWAY_WS_ALLOWED_ORIGINS = 'http://allowed.local';
	process.env.GATEWAY_WS_MAX_CONNECTIONS = '50';
	process.env.GATEWAY_WS_MAX_CONNECTIONS_PER_IP = '1';
	process.env.GATEWAY_WS_PING_INTERVAL_MS = '50';
	process.env.GATEWAY_WS_PONG_TIMEOUT_MS = '250';
	process.env.GATEWAY_WS_UPSTREAM_OPEN_TIMEOUT_MS = '500';

	const { buildApp } = await import('../src/app.js');
	const app = buildApp();
	await app.listen({ port: 0, host: '127.0.0.1' });

	const address = app.server.address();
	assert.ok(address && typeof address !== 'string');

	return { app, port: address.port as number };
}

async function main() {
	console.log('\n🧪 [GW] WS proxy tests starting...\n');

	// ---------------------------------------------------------------------
	// Setup upstream mock + gateway
	// ---------------------------------------------------------------------
	const upstream = await startUpstreamMock();
	const gameServiceUrl = `http://127.0.0.1:${upstream.port}`;

	const gateway = await startGateway(gameServiceUrl);
	const gwWsUrl = `ws://127.0.0.1:${gateway.port}/api/game/ws?matchId=abc&token=def`;

	try {
		// -----------------------------------------------------------------
		// Test 1: Origin allowlist blocks unknown origin
		// -----------------------------------------------------------------
		console.log('👉 Test 1: Origin rejection');
		{
			const ws = new WebSocket(gwWsUrl, {
				headers: { Origin: 'http://evil.local' }
			});

			const close = await withTimeout(onceClose(ws), 1500, 'origin rejection close');
			assert.equal(close.code, 1008);
		}

		// -----------------------------------------------------------------
		// Test 2: Proxy works + subprotocol forwarding + heartbeat pings
		// -----------------------------------------------------------------
		console.log('👉 Test 2: Proxy + subprotocols + ping');
		{
			const ws = new WebSocket(gwWsUrl, ['v1', 'json'], {
				headers: { Origin: 'http://allowed.local' }
			});

			await withTimeout(once(ws, 'open'), 1500, 'client open');

			// Ensure upstream saw the protocol header
			const first = await withTimeout(upstream.firstConnection, 1500, 'upstream connection');
			const protoHeader = first.headers['sec-websocket-protocol'];
			const protoValue = Array.isArray(protoHeader) ? protoHeader.join(',') : String(protoHeader || '');
			assert.ok(protoValue.includes('v1'));
			assert.ok(protoValue.includes('json'));

			// Upstream welcome -> client
			first.socket.send('UPSTREAM_READY');
			const msg1 = await withTimeout(once<WebSocket.RawData>(ws, 'message'), 1500, 'receive upstream welcome');
			assert.equal(msg1.toString(), 'UPSTREAM_READY');

			// Client -> upstream -> echo -> client
			first.socket.on('message', (data) => {
				first.socket.send(`ECHO:${data.toString()}`);
			});
			ws.send('hello');
			const msg2 = await withTimeout(once<WebSocket.RawData>(ws, 'message'), 1500, 'receive echo');
			assert.equal(msg2.toString(), 'ECHO:hello');

			// Heartbeat ping from gateway to client should arrive
			const gotPing = withTimeout(
				new Promise<void>((resolve) => ws.once('ping', () => resolve())),
				1500,
				'client ping'
			);
			await gotPing;

			ws.close();
			await withTimeout(once(ws, 'close'), 1500, 'close client');
		}

		// -----------------------------------------------------------------
		// Test 3: Per-IP connection limit (second connection rejected with 1013)
		// -----------------------------------------------------------------
		console.log('👉 Test 3: Per-IP connection limit');
		{
			const headers = {
				Origin: 'http://allowed.local',
				'x-forwarded-for': '1.2.3.4'
			};

			const ws1 = new WebSocket(gwWsUrl, { headers });
			await withTimeout(once(ws1, 'open'), 1500, 'ws1 open');

			const ws2 = new WebSocket(gwWsUrl, { headers });
			// It may briefly open then close, but must close with 1013.
			await withTimeout(once(ws2, 'open').catch(() => undefined as any), 500, 'ws2 maybe open');
			const close = await withTimeout(onceClose(ws2), 1500, 'ws2 close');
			assert.equal(close.code, 1013);

			ws1.close();
			await withTimeout(once(ws1, 'close'), 1500, 'ws1 close');
		}

		console.log('\n✅ [GW] WS proxy tests PASSED\n');
	} finally {
		try {
			await gateway.app.close();
		} catch {}
		try {
			upstream.wss.close();
		} catch {}
		// ws server close can be async; give it a tick
		await sleep(50);
	}
}

main().catch((err) => {
	console.error('\n❌ [GW] WS proxy tests FAILED:', err);
	process.exit(1);
});

