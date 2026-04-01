import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { WS_GAME_URL } from '../../../core/ws/wsUrls';
import type { WebSocketEventsTypes, GameTypes } from '@transcendence/shared/types/index.js';
import { GameConstants as GC } from '@transcendence/shared/constants/game.constants.js';
import { WEBSOCKET_EVENTS } from '@transcendence/shared/constants/event.constants.js';


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
	// Ref for latest gameState (canvas reads this, avoids re-renders at 60fps)
	const gameStateRef = useRef<GameTypes.GameDynamicState>(null);

	const sendAction = useCallback((action: GC.GameAction, playerSide?: GC.PlayerSide) => {
		if (wsRef.current?.readyState !== WebSocket.OPEN) return;
		const payload: GameTypes.GameInputPayload = { gameId: matchId, action };
		if (playerSide) payload.playerSide = playerSide;
		wsRef.current.send(JSON.stringify(payload));
	}, [matchId]);

	// To handle match abandonment
	const disconnect = useCallback(() => {
		wsRef.current?.close();
		wsRef.current = null;
	}, []);


	// Instancia el sonido. Define la referencia vacía especificando el tipo de TypeScript
	const beepSound = useRef<HTMLAudioElement | null>(null);

	// Inicializa el audio solo una vez al montar el hook
	useEffect(() => {
		beepSound.current = new Audio('/p5.mp3');
	}, []);



	// Keeps tokenRef updated
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
		}

		ws.onmessage = async (event) => {
			try {
				// Protects from blob messages
				const raw = typeof event.data === 'string'
					? event.data
					: await (event.data as Blob).text();
				const msg = JSON.parse(raw);

				switch (msg.type) {
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
					
					case WEBSOCKET_EVENTS.GAME_UPDATE:
						gameStateRef.current = msg.payload.gameState;

						const isTick = msg.payload.updateType === GC.GAME_UPDATE_TYPE.COUNTDOWN_TICK;
						const isInitialCountdown = msg.payload.updateType === GC.GAME_UPDATE_TYPE.STATE_CHANGED 
												&& msg.payload.gameState.status === GC.GAME_STATUS.COUNTDOWN;

						// Si es un tick (2, 1) o el inicio de la cuenta atrás (3)
						if (isTick || isInitialCountdown) {
							if (beepSound.current) {
								beepSound.current.currentTime = 0;
								beepSound.current.play().catch(e => console.warn('Audio bloqueado', e));
							}
							
							setState(s => ({ ...s, status: 'countdown', gameState: msg.payload.gameState }));
						}
						else if (msg.payload.gameState.status === GC.GAME_STATUS.PLAYING) {
							setState(s => s.status !== 'playing'
								? { ...s, status: 'playing', gameState: msg.payload.gameState }
								: s
							);
						}
						// Manejo de pausa
						else if (msg.payload.updateType === GC.GAME_UPDATE_TYPE.PAUSED) {
							setState(s => ({ ...s, status: 'paused' }));
						}
						else if (msg.payload.updateType === GC.GAME_UPDATE_TYPE.RESUMED) {
							setState(s => ({ ...s, status: 'playing' }));
						}
						break;

					case WEBSOCKET_EVENTS.GAME_OVER:
						gameStateRef.current = null;
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
		}

		ws.onclose = (event) => {
			console.log(`[GameWS] Closed: ${event.code} ${event.reason}`);
			// Don't overwrite finished status
			setState(s =>
				s.status === 'finished'
					? s 
					: { ...s, status: 'error', error: event.reason || 'Connection lost'}
			);
		};

		ws.onerror = () => ws.close();

		return () => {
			ws.close();
			wsRef.current = null;
		};
	}, [matchId]);

	return { ...state, gameStateRef, sendAction, disconnect };
} 