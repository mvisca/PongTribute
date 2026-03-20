import{ useEffect, useRef } from 'react';
import type { WebSocketEventsTypes } from '@transcendence/shared/types/event.types.js';
import { useAuthStore } from '../auth/AuthStore';
import { WS_COMMS_URL } from './wsUrls'; // To build ws path diverse setups (localhost, ngrok, etc)
import { doRefresh } from '../api/apiInterceptor';

const MAX_RECONNECT_ATTEMPTS = 8;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

interface UseWebSocketOptions {
    onMessage: (msg: WebSocketEventsTypes.AnyWsMessage) => void | Promise<void>;
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
    const attemptRef = useRef(0);

    const token = useAuthStore((state) => state.accessToken);
    
    useEffect(() => {
        mountedRef.current = true;
        
        if (!token) {
            console.log('[WebSocket] 🔴 No token, closing connection'); // DEBUG
            wsRef.current?.close();
            wsRef.current = null;
            return;
        }

        const WS_CLOSE_REASONS: Record<number, string> = {
            1000: 'Normal closure',
            1001: 'Endpoint going away (server restart or tab closed)',
            1005: 'No close frame received (server dropped connection)',
            1006: 'Abnormal closure (connection lost without close)',
            1008: 'Policy violation (rate limit or auth)',
            1009: 'Message too large',
            1011: 'Server internal error',
            4001: 'Token expired',
            4003: 'Forbidden',
            4029: 'Too many connections',
        };

        function connect() {
            if (!mountedRef.current || !token) return;

            // Don't create ws if one already exist
            const current = wsRef.current;
            if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
                return;
            }

            const wsUrl = `${WS_COMMS_URL}?token=${token.substring(0, 10)}***`; // DEBUG
            console.log('[WebSocket] 🔌 Connecting to:', wsUrl);

            // Browsers do not allow custom headers on WebSocket upgrade requests,
            // so the JWT must be passed as a query parameter (?token=...) and validated server-side.
            const ws = new WebSocket(`${WS_COMMS_URL}?token=${token}`);
            wsRef.current = ws;

            // Calls loadFriendships
            ws.onopen = () => {
                console.log('[WebSocket] ✅ Connected successfully'); // DEBUG
                attemptRef.current = 0;
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

            ws.onclose = async (event) => {

                const reason = event.reason || WS_CLOSE_REASONS[event.code] || 'Unknown';
                console.log(`[WebSocket] 🔴 Closed - Code: ${event.code}, Reason: "${reason}"`); // DEBUG

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

                // Auth error, attempt to refresh tokens
                if (event.code === 4001) {
                    console.log('[WebSocket] 🔄 Token expired, attempting refresh...');
                    try {
                        await doRefresh();
                        // Refreshes tokens, does setAccessToken
                        // Refreshing token in the ws store re-executes the effect
                    } catch {
                        console.log('[WebSocket] ⏭️ Refresh failed, not reconnecting)'); // DEBUG
                    }
                    return;
                }
                
                // Exceptfion: auth error, don't reconnect
                if (event.code === 4003 || event.code === 4029) {
                    console.log('[WebSocket] ⏭️ Skip reconnect (auth error)'); // DEBUG
                    return;
                } 

                // Reconnect with exponential backoff
                if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
                    console.log('[WebSocket] 🛑 Giving up: max reconnect attempts reached'); // DEBUG
                    return;
                }
                const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attemptRef.current), MAX_DELAY_MS);
                attemptRef.current++;
                console.log(`[WebSocket] 🔄 Reconnecting in ${delay}ms - Aattempt ${attemptRef.current}/${MAX_RECONNECT_ATTEMPTS}`); // DEBUG
                reconnectTimeout.current = setTimeout(connect, delay);
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
            attemptRef.current = 0;
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            wsRef.current?.close();
            wsRef.current = null;
        };
    // onMessage is intentionally omitted from the dependency array: the effect should only
    // reconnect when the token changes, not on every render. Callers must keep onMessage
    // stable (e.g. memoized with useCallback) to avoid stale-closure bugs.
    }, [token]);
}