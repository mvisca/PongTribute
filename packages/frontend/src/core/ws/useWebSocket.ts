import{ useEffect, useRef } from 'react';
import type { WebSocketEventsTypes } from '@transcendence/shared/types/event.types.js';
import { useAuthStore } from '../auth/AuthStore';
import { WS_COMMS_URL } from './wsUrls'; // To build ws path diverse setups (localhost, ngrok, etc)

interface UseWebSocketOptions {
	onMessage:  (msg: WebSocketEventsTypes.AnyWsMessage) => void;
	// Called on successful open (initial connect + every reconnect).
	// Helps to re-sync state that may have been lost during disconnection.
	// Must be stable (memorized with useCallback).
	// Intentionally omitted from the effect dependency array, same reasonin as onMessage.
	onConnect?: () => void;
}

export function useWebSocket({ onMessage, onConnect }: UseWebSocketOptions) {
	const wsRef = useRef<WebSocket | null>(null); // live instance of websocket
	const mountedRef = useRef(true); // indicates if the component is mounted
	const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	const token = useAuthStore((state) => state.accessToken);
	
	useEffect(() => {
		mountedRef.current = true;
		
		if (!token) {
			console.log('[WebSocket] 🔴 No token, closing connection'); // DEBUG
			wsRef.current?.close();
			wsRef.current = null;
			return;
		}

		function connect() {
			if (!mountedRef.current || !token) return;

			const wsUrl = `${WS_COMMS_URL}?token=${token.substring(0, 10)}***`; // DEBUG
            console.log('[WebSocket] 🔌 Connecting to:', WS_COMMS_URL);

			// Browsers do not allow custom headers on WebSocket upgrade requests,
			// so the JWT must be passed as a query parameter (?token=...) and validated server-side.
			const ws = new WebSocket(`${WS_COMMS_URL}?token=${token}`);
			wsRef.current = ws;

			// Calls loadFriendships
			ws.onopen = () => {
				console.log('[WebSocket] ✅ Connected successfully'); // DEBUG
				onConnect?.();

			}

			ws.onmessage = async (event) => {
				try {
					const raw = typeof event.data === 'string' // Defensive in case of message is sent as binary
						? event.data
						: await (event.data as Blob).text();
					const msg = JSON.parse(raw) as WebSocketEventsTypes.AnyWsMessage;

					console.log('[WebSocket] 📨 Received:', msg.type); // DEBUG

					onMessage(msg);
				} catch (err) {
					console.error('[WebSocket] ❌ Parse error:', err); // DEBUG
				}
			};

			ws.onclose = (event) => {

				console.log(`[WebSocket] 🔴 Closed - Code: ${event.code}, Reason: "${event.reason || 'none'}"`); // DEBUG

				// Exception: don't reconnect other's tab websocket 
				if (wsRef.current !== ws) {
					console.log('[WebSocket] ⏭️  Skip reconnect (old instance)'); // DEBUG
					return;
				}

				// Exception: don't reconnect inextistent websocket
				if (!mountedRef.current) {
					console.log('[WebSocket] ⏭️  Skip reconnect (unmounted)'); // DEBUG
					return;
				}

				// Exceptfion: auth error, don't reconnect
				if (event.code === 4001 || event.code === 4003 || event.code === 4029) {
					console.log('[WebSocket] ⏭️  Skip reconnect (auth error)'); // DEBUG
					return;
				} 

				// Reconnect after 3s
				console.log('[WebSocket] 🔄 Reconnecting in 3s...'); // DEBUG
				reconnectTimeout.current = setTimeout(connect, 3000);
			};

			ws.onerror = (err) => {
				console.error('[WebSocket] ❌ Error:', err); // DEBUG
				ws.close();
			};
		}

		connect();

		return () => {
			console.log('[WebSocket] 🧹 Cleanup - unmounting'); // DEBUG
			mountedRef.current = false;
			if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
			wsRef.current?.close();
			wsRef.current = null;
		};
	// onMessage is intentionally omitted from the dependency array: the effect should only
	// reconnect when the token changes, not on every render. Callers must keep onMessage
	// stable (e.g. memoized with useCallback) to avoid stale-closure bugs.
	}, [token]);
}