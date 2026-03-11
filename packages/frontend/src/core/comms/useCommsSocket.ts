import{ useEffect, useRef } from 'react';
import type { WebSocketEventsTypes } from '@transcendence/shared/types/event.types.js';
import { useAuth } from '../auth/AuthContext';

type MessageHandler = (msg: WebSocketEventsTypes.AnyWsMessage) => void;

const WS_URL = import.meta.env.VITE_WS_COMMS_URL ?? '/ws/comms';

export function useCommsSocket(onMessage:MessageHandler) {
	const token = useAuth((state) => state.accessToken);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mountedRef = useRef(true);
	
	useEffect(() => {
		mountedRef.current = true;
		
		if (!token) {
			wsRef.current?.close();
			wsRef.current = null;
			return;
		}

		function connect() {
			if (!mountedRef.current || !token) return;

				// Browsers do not allow custom headers on WebSocket upgrade requests,
			// so the JWT must be passed as a query parameter (?token=...) and validated server-side.
			const ws = new WebSocket(`${WS_URL}?token=${token}`);
			wsRef.current = ws;

			ws.onmessage = async (event) => {
				try {
					const raw = typeof event.data === 'string' // Defensive in case of message is sent as binary
						? event.data
						: await (event.data as Blob).text();
					const msg = JSON.parse(raw) as WebSocketEventsTypes.AnyWsMessage;
					onMessage(msg);
				} catch {}
			};

			ws.onclose = (event) => {
				if (wsRef.current !== ws) return;
				if (!mountedRef.current) return;
				// auth error, don't reconnect
				if (event.code === 4001 || event.code === 4003 || event.code === 4029) return; 
				// Reconnect after 3s
				reconnectTimeout.current = setTimeout(connect, 3000);
			};

			ws.onerror = () => {
				ws.close();
			};
		}

		connect();

		return () => {
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