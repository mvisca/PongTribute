import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { WS_GAME_URL } from '../../../core/ws/wsUrls';
import type { WebSocketEventsTypes, GameTypes } from '@transcendence/shared/types/index.js';
import { GameConstants as GC } from '@transcendence/shared/constants/game.constants.js';
import { WEBSOCKET_EVENTS } from '@transcendence/shared/constants/event.constants.js';
import { soundManager } from '../audio/soundManager';

// Toda la lógica de audio vive en soundManager (y no aquí)

export interface MatchInfo {
    matchId: string;
    opponentId: string;
    opponentUsername: string;
    opponentAvatar: string;
    gameMode: GC.GameModeType;
    playerSide: 'left' | 'right';
}

export type GameStatus = 'connecting' | 'joined' | 'countdown' | 'playing' | 'paused' | 'finished' | 'opponent_disconnected' | 'error';

interface GameSocketState {
    status: GameStatus;
    matchInfo: MatchInfo | null;
    gameState: GameTypes.GameDynamicState | null;
    gameOver: WebSocketEventsTypes.GameOver['payload'] | null;
    waitSeconds: number;
    error: string;
}

export function useGameSocket(matchId: string) {
    const tokenRef = useRef(useAuthStore.getState().accessToken);

    const [state, setState] = useState<GameSocketState>({
        status: 'connecting',
        matchInfo: null,
        gameState: null,
        gameOver: null,
        waitSeconds: 0,
        error: '',
    } satisfies GameSocketState);

    const wsRef = useRef<WebSocket | null>(null);

    // El canvas lee este ref directamente a 60fps — no pasa por React state
    // para evitar re-renders en cada frame
    const gameStateRef = useRef<GameTypes.GameDynamicState>(null);

    // ─── Refs para detección de eventos sonoros ────────────────────────────────
    
    // Guardamos el frame anterior para poder compararlo con el actual.
    // Es un ref (no state) porque no necesitamos re-renderizar cuando cambia,
    // solo necesitamos leerlo en el siguiente mensaje WS.
    const prevStateRef = useRef<GameTypes.GameDynamicState | null>(null);

    // Semáforo: se activa cuando detectamos un punto anotado.
    // El siguiente frame donde ball.dx !== 0 es el saque → suena serve().
    // Sin este semáforo, el cambio de dx en el saque se confundiría con un golpe de pala.
    const justScoredRef = useRef(false);

    const sendAction = useCallback((action: GC.GameAction, playerSide?: GC.PlayerSide) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        const payload: GameTypes.GameInputPayload = { gameId: matchId, action };
        if (playerSide) payload.playerSide = playerSide;
        wsRef.current.send(JSON.stringify(payload));
    }, [matchId]);

    const disconnect = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
    }, []);

    // Mantiene tokenRef sincronizado si el token se renueva durante la partida
    useEffect(() => {
        const unsubscribe = useAuthStore.subscribe(
            (state) => { tokenRef.current = state.accessToken; }
        );
        return unsubscribe;
    }, []);

    useEffect(() => {
        const token = tokenRef.current;
        if (!token || !matchId) return;

        const ws = new WebSocket(`${WS_GAME_URL}?matchId=${matchId}&token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[GameWS] Connected');
        };

        ws.onmessage = async (event) => {
            try {
                // Protección contra mensajes en formato Blob (algunos navegadores)
                const raw = typeof event.data === 'string'
                    ? event.data
                    : await (event.data as Blob).text();
                const msg = JSON.parse(raw);

                switch (msg.type) {

                    // El servidor confirma que este cliente se unió a la partida.
                    // Recibimos aquí los datos del oponente y el lado asignado (left/right).
                    case WEBSOCKET_EVENTS.MATCH_JOINED:
                        setState(state => ({
                            ...state,
                            status: 'joined',
                            matchInfo: {
                                matchId: msg.payload.matchId,
                                opponentId: msg.payload.opponentId,
                                opponentUsername: msg.payload.opponentUsername,
                                opponentAvatar: msg.payload.opponentAvatar,
                                gameMode: msg.payload.gameMode,
                                playerSide: msg.payload.playerSide ?? 'left',
                            },
                        }));
                        break;

                    case WEBSOCKET_EVENTS.GAME_UPDATE: {
                        const curr = msg.payload.gameState as GameTypes.GameDynamicState;
                        const prev = prevStateRef.current;

                        // ── Cuenta atrás ───────────────────────────────────────
                        // COUNTDOWN_TICK → ticks 2 y 1
                        // STATE_CHANGED + status COUNTDOWN → primer tick (3)
                        const isTick = msg.payload.updateType === GC.GAME_UPDATE_TYPE.COUNTDOWN_TICK;
                        const isInitialCountdown =
                            msg.payload.updateType === GC.GAME_UPDATE_TYPE.STATE_CHANGED
                            && curr.status === GC.GAME_STATUS.COUNTDOWN;

                        if (isTick || isInitialCountdown) {
                            soundManager.countdownBeep();
                            setState(s => ({ ...s, status: 'countdown', gameState: curr }));

                        } else if (curr.status === GC.GAME_STATUS.PLAYING) {

                            // ── Transición countdown → playing ─────────────────
                            // Solo suena go() en el primer frame de PLAYING,
                            // detectado porque el status anterior era 'countdown'
                            setState(s => {
                                if (s.status === 'countdown') soundManager.go();
                                return s.status !== 'playing'
                                    ? { ...s, status: 'playing', gameState: curr }
                                    : s;
                            });

                            // ── Detección de eventos sonoros ───────────────────
                            // Solo procesamos si tenemos un frame anterior con el que comparar
                            if (prev) {

                                // PRIORIDAD 1 — Punto anotado
                                // Cualquier cambio en el score de cualquier pala = punto
                                const scoreChanged =
                                    curr.paddleLeft.score  !== prev.paddleLeft.score ||
                                    curr.paddleRight.score !== prev.paddleRight.score;

                                if (scoreChanged) {
                                    soundManager.score();
                                    // Activamos el semáforo para detectar el saque siguiente
                                    justScoredRef.current = true;

                                // PRIORIDAD 2 — Saque
                                // Primer frame tras un punto donde la bola vuelve a moverse
                                } else if (justScoredRef.current && curr.ball.dx !== 0) {
                                    soundManager.serve();
                                    justScoredRef.current = false;

                                // PRIORIDAD 3 — Colisiones (solo si no hubo punto ni saque)
                                // Usamos Math.sign para detectar cambio de dirección:
                                //   sign(1.5) =  1  →  sign(-1.5) = -1  → flipó
                                //   sign(0)   =  0  (bola parada, ignoramos)
                                } else {
                                    const dxFlipped =
                                        prev.ball.dx !== 0 &&
                                        Math.sign(curr.ball.dx) !== Math.sign(prev.ball.dx);
                                    const dyFlipped =
                                        prev.ball.dy !== 0 &&
                                        Math.sign(curr.ball.dy) !== Math.sign(prev.ball.dy);

                                    if (dxFlipped) {
                                        // dx invirtió → la bola golpeó una pala
                                        soundManager.paddleHit();
                                    } else if (dyFlipped) {
                                        // Solo dy invirtió → rebote en pared superior o inferior
                                        soundManager.wallBounce();
                                    }
                                }
                            }

                        // ── Pausa / Reanudación ────────────────────────────────
                        } else if (msg.payload.updateType === GC.GAME_UPDATE_TYPE.PAUSED) {
                            setState(s => ({ ...s, status: 'paused' }));

                        } else if (msg.payload.updateType === GC.GAME_UPDATE_TYPE.RESUMED) {
                            setState(s => ({ ...s, status: 'playing' }));
                        }

                        // Actualizamos ambos refs al final del frame
                        gameStateRef.current = curr;
                        prevStateRef.current = curr;
                        break;
                    }

                    // Partida terminada — limpiamos todos los refs de audio
                    // El jingle de victoria/derrota lo dispara GamePages (Paso 3),
                    // porque solo GamePages sabe si el usuario actual ganó o perdió
                    case WEBSOCKET_EVENTS.GAME_OVER:
                        gameStateRef.current = null;
                        prevStateRef.current = null;
                        justScoredRef.current = false;
                        setState(s => ({
                            ...s,
                            status: 'finished',
                            gameOver: msg.payload,
                        }));
                        break;

                    case WEBSOCKET_EVENTS.GAME_OPPONENT_DISCONNECTED:
                        setState(s => ({
                            ...s,
                            status: 'opponent_disconnected',
                            waitSeconds: msg.payload.waitSeconds,
                        }));
                        break;

                    case WEBSOCKET_EVENTS.GAME_OPPONENT_RECONNECTED:
                        setState(s => ({ ...s, status: 'playing' }));
                        break;
                }
            } catch (err) {
                console.log('[GameWS] Parse error:', err);
            }
        };

        ws.onclose = (event) => {
            console.log(`[GameWS] Closed: ${event.code} ${event.reason}`);
            setState(s =>
                s.status === 'finished'
                    ? s
                    : { ...s, status: 'error', error: event.reason || 'Connection lost' }
            );
        };

        ws.onerror = () => ws.close();

        // Cleanup al desmontar: cerramos WS y reseteamos refs de audio
        return () => {
            ws.close();
            wsRef.current = null;
            prevStateRef.current = null;
            justScoredRef.current = false;
        };
    }, [matchId]);

    return { ...state, gameStateRef, sendAction, disconnect };
}