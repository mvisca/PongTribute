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

			console.log('[WS] token at connect time:', token ? `${token.slice(0, 20)}...` : 'NULL');
		    console.log('[WS] full url:', `${WS_URL}?token=${token}`);

			// DIAGNÓSTICO TEMPORAL - borrar después de confirmar
			const wsFullUrl = `${WS_URL}?token=${token}`;
			console.log('[useCommsSocket] connecting to:', wsFullUrl, '| token length:', token?.length);

			const ws = new WebSocket(wsFullUrl);
			wsRef.current = ws;

			ws.onmessage = (event) => {
				try {
					const msg = JSON.parse(event.data) as WebSocketEventsTypes.AnyWsMessage;
					onMessage(msg);
				} catch {}
			};

			ws.onclose = (event) => {
				if (!mountedRef.current) return;
				// auth error, don't reconnect
				if (event.code === 4001 || event.code === 4003) return; 
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
	}, [token]);
}