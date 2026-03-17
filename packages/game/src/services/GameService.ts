// packages/game/src/services/GameService.ts

//CREA y MANEJA EL MAPA DE PARTIDAS ACTIVAS: ES LLAMADO POR GameGateway 
// CUANDO HAY UNA CONEXION O DESCONEXION DE WEBSOCKET

import { WebSocket } from 'ws';
import { Redis } from 'ioredis';
import { MatchRepository } from '../repositories/MatchRepository.js';
import {
	GameConstants,
	GameTypes,
	WEBSOCKET_EVENTS,
	WebSocketEventsTypes,
	MatchConstants,
	Utils,
	BOT_USER_ID
} from '@transcendence/shared';
import { createLogger, type AppLogger } from '@transcendence/shared';
import { GameEnv } from '../config.js';

interface GameSession {
	matchId: string;
	player1Id: string;
	player1Username: string;
	player1Avatar: string;
	player2Id: string;
	player2Username: string;
	player2Avatar: string;
	socketP1: WebSocket | null;
	socketP2: WebSocket | null;
	gameState: GameTypes.GameState;
	loopId: NodeJS.Timeout | null;
	isLocal: boolean;
}

/**
* GameService
* * Motor central del juego. Gestiona:
* 1. El estado en memoria de todas las partidas activas (GameSession).
* 2. El Game Loop (física y lógica a 60 FPS).
* 3. La comunicación WebSocket en tiempo real.
* 4. La sincronización con la Base de Datos al terminar.
*/
export class GameService {
	private activeMatches: Map<string, GameSession> = new Map();
	private disconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
	private log: AppLogger = createLogger('GameService');

	constructor(
		private matchRepo: MatchRepository,
		private redis: Redis
	) { }
	
	// -------------------------------------------------------------------
	// 1. GESTION DE CONEXIONES
	// -------------------------------------------------------------------
	
	/**
	* Une a un usuario a una partida existente o restaura una sesión.
	* Si la sesión no existe en memoria, intenta hidratarla desde DB o Redis (Ticket Local).
	* @param matchId ID de la partida
	* @param userId ID del usuario que conecta
	* @param socket Conexión WebSocket activa
	*/
	public async joinMatch(matchId: string, userId: string, socket: WebSocket): Promise<GameConstants.GameStatus | null> {
		// BLOQUE 1: HIDRATACION DE GAME / SESSION & STATE
		// Si existe en partidas activas, es juego empezado, hay reconexión a session
		let session = this.activeMatches.get(matchId);
		
		// Si no existe, es partida nueva, conexión nueva a session nueva
		if (!session) {
			const match = await this.matchRepo.findById(matchId);
			
			// Re-check tras await: una llamada concurrente al mismo matchId puede haber
			// creado ya la sesión mientras esperábamos la respuesta de la BD.
			session = this.activeMatches.get(matchId);
			
			if (!session) {
				if (match) {
					// MATCH Existe en BD, es juego remoto
					if (match.status === MatchConstants.MATCH_STATUS.FINISHED) {
						socket.close(1008, "Match finished");
						return null;
					}
					session = {
						matchId: matchId,
						player1Id: match.player1.userId,
						player1Username: match.player1.username,
						player1Avatar: match.player1.avatar,
						player2Id: match.player2?.userId ?? Utils.generateUserId(),
						player2Username: match.player2?.username ?? 'Guest',
						player2Avatar: match.player2?.avatar ?? GameEnv.CLOUDINARY_DEFAULT_AVATAR(),
						isLocal: false,
						socketP1: null,
						socketP2: null,
						loopId: null,
						gameState: this.createInitialState(matchId, match.targetScore, match.gameMode)
					} satisfies GameSession;
					this.activeMatches.set(matchId, session);
				} else {
					// MATCH No Existe en DB, es juego local
					const raw = await this.redis.get(`match:local:${matchId}`);
					
					// Re-check tras el segundo await: misma protección para partidas locales.
					session = this.activeMatches.get(matchId);
					
					if (!session) {
						if (!raw) {
							socket.close(1008, "Match don't exists");
							return null;
						}
						
						const local = JSON.parse(raw);
						
						await this.redis.del(`match:local:${matchId}`);
						
						session = {
							matchId: matchId,
							player1Id: local.player1.userId,
							player1Username: local.player1.username,
							player1Avatar: local.player1.avatar,
							player2Id: local.player2?.userId ?? Utils.generateUserId(),
							player2Username: local.player2?.username ?? 'Guest',
							player2Avatar: local.player2?.avatar ?? GameEnv.CLOUDINARY_DEFAULT_AVATAR(),
							isLocal: true,
							socketP1: null,
							socketP2: null,
							loopId: null,
							gameState: this.createInitialState(matchId, local.targetScore, local.gameMode)
						} satisfies GameSession;
						this.activeMatches.set(matchId, session);
					}
				}
			}
		}
		
		// BLOQUE 2: ASIGNACION DE SOCKET		
		const isPlayer1 = session?.player1Id === userId;
		const isPlayer2 = session?.player2Id === userId;
		
		// No es jugador de esta partida
		if (!isPlayer1 && !isPlayer2) {
			socket.close(1008, "Not a player");
			return null;
		}
		
		// Asigna sockets para jugador en partida local (humano-humano), en remota o 
		// con bot (humano - bot) 
		const isBotMatch = session.player2Id === BOT_USER_ID;

		if (session.isLocal && !isBotMatch) {
			// Partida local humano vs humano: mismo socket para ambos jugadores
			session.socketP1 = socket;
			session.socketP2 = socket;
		} else if (isPlayer1) {
			session.socketP1 = socket;
		} else {
			// Partida remota o local vs bot: socket independiente para P2
			session.socketP2 = socket;
		}
		
		// BLOQUE 3: BIENVENIDA Y ARRANQUE
		const msg = {
			type: WEBSOCKET_EVENTS.MATCH_JOINED,
			timestamp: Date.now(),
			payload: {
				matchId: matchId,
				opponentId: isPlayer1 ? session.player2Id : session.player1Id,
				opponentUsername: isPlayer1 ? session.player2Username : session.player1Username,
				opponentAvatar: isPlayer1 ? session.player2Avatar : session.player1Avatar,
				gameMode: session.gameState.config.gameModeName,
				status: session.gameState.status,
			}
		} satisfies WebSocketEventsTypes.MatchJoined;
		
		socket.send(JSON.stringify(msg));
		
		if (session.gameState.status === GameConstants.GAME_STATUS.PLAYING) {
			this.handleReconnection(session, matchId, isPlayer1);
		} else if (session.gameState.status === GameConstants.GAME_STATUS.WAITING) {
			if (session.isLocal && !isBotMatch && session.socketP1) {
				// Local humano vs humano: comparten socket, arranca con P1
				this.startGameLoop(session);
			} else if (session.socketP1 && session.socketP2) {
				// Remota o bot: ambos sockets deben estar conectados
				this.startGameLoop(session);
			}
		}
		
		return session.gameState.status; 
	}
	
	/**
	* Maneja la reconexión de un usuario tras una caída temporal.
	* Cancela el temporizador de forfeit y notifica al rival.
	*/
	private handleReconnection(session: GameSession, matchId: string, isPlayer1: boolean) {
		const timer = this.disconnectTimeouts.get(matchId);
		if (timer) {
			clearTimeout(timer);
			this.disconnectTimeouts.delete(matchId);
		}
		
		const rivalSocket = isPlayer1 ? session.socketP2 : session.socketP1;
		
		const msg = {
			type: WEBSOCKET_EVENTS.GAME_OPPONENT_RECONNECTED,
			timestamp: Date.now(),
			payload: { 
				matchId,
				opponentId: isPlayer1 ? session.player2Id : session.player1Id
			}
		} satisfies WebSocketEventsTypes.GameOpponentReconnected;
		
		rivalSocket?.send(JSON.stringify(msg));
		
		this.startGameLoop(session);
	}
	
	// -------------------------------------------------------------------
	// 2. MANEJAR DESCONEXIÓN
	// -------------------------------------------------------------------
	
	/**
	* Gestiona la pérdida de conexión WebSocket (no intencionada).
	* Pausa el juego y comienza una cuenta atrás para declarar forfeit.
	*/
	public async handleDisconnect(userId: string, matchId?: string): Promise<void> {
		const targetMatchId = matchId || this.findMatchIdByUserId(userId);
		
		if (!targetMatchId)
			return;
		
		const session = this.activeMatches.get(targetMatchId) as GameSession | null;
		
		// Si ya terminó, ignoramos desconexiones residuales
		if (!session || session.gameState.status === GameConstants.GAME_STATUS.FINISHED) return;
		
		// Si es local, no hay reconexión ni rival remoto. Limpieza inmediata.
		if (session.isLocal) {
			this.stopGameLoop(session);
			// Si es partida contra bot, notificarle y cerrar su socket
			if (session.player2Id === BOT_USER_ID) {
				const gameOverMsg = {
					type: WEBSOCKET_EVENTS.GAME_OVER,
					timestamp: Date.now(),
					payload: {
						matchId: targetMatchId,
						winnerId: session.player2Id,
						player1Score: session.gameState.paddleLeft.score,
						player2Score: session.gameState.paddleRight.score,
						reason: 'opponent_disconnected' as const
					}
				} satisfies WebSocketEventsTypes.GameOver;
				session.socketP2?.send(JSON.stringify(gameOverMsg));
				session.socketP2?.close();
			}
			this.activeMatches.delete(targetMatchId);
			return;
		}
		
		// 1. Detenemos el loop inmediatamente
		this.stopGameLoop(session); // Usamos el helper centralizado
		
		// 2. Estado a PAUSED
		session.gameState.status = GameConstants.GAME_STATUS.PAUSED;
		
		// 3. Notificar al que aún está conectado
		const isPlayer1Gone = session.player1Id === userId;
		const rivalSocket = isPlayer1Gone ? session.socketP2 : session.socketP1;
		
		const disconnectMsg = {
			type: WEBSOCKET_EVENTS.GAME_OPPONENT_DISCONNECTED,
			timestamp: Date.now(),
			payload: {
				matchId: targetMatchId,
				opponentId: userId,
				waitSeconds: GameConstants.GAME_CONSTANTS.IN_MATCH_DISCONNECTION_TIMEOUT / 1000
			}
		} satisfies WebSocketEventsTypes.GameOpponentDisconnected;
		
		const msg = JSON.stringify(disconnectMsg);
		
		rivalSocket?.send(msg);
		
		// 4. Iniciamos cuenta atrás para victoria automática
		const timeoutId = setTimeout(() => {
			this.forfeitMatch(targetMatchId, userId);
		}, GameConstants.GAME_CONSTANTS.IN_MATCH_DISCONNECTION_TIMEOUT); 
		
		this.disconnectTimeouts.set(targetMatchId, timeoutId);
	}
	
	// ===========================================================================
	// 2. GAME LOOP CORE
	// ===========================================================================
	
	/**
	* Inicia el bucle principal del juego (60 FPS).
	* Es el orquestador: calcula física -> verifica victoria -> emite estado.
	*/
	private startGameLoop(session: GameSession) {
		// 1. Limpieza preventiva
		this.stopGameLoop(session);
		
		this.log.info({ matchId: session.matchId }, 'Starting game loop');
		session.gameState.status = GameConstants.GAME_STATUS.PLAYING; // Aseguramos estado playing
		
		// 2. Iniciar Intervalo
		session.loopId = setInterval(() => {
			// A. Guard de Seguridad: Si el estado cambió externamente (ej: desconexión)
			if (session.gameState.status !== GameConstants.GAME_STATUS.PLAYING) {
				this.stopGameLoop(session);
				return;
			}
			
			// B. Física: Delegamos cálculo, recibimos veredicto
			const winnerId = this.updatePhysics(session);  // devuelve string | null
			
			// C. Evaluación
			if (winnerId) {
				// ¡Game Over! El loop toma el control y cierra el chiringuito
				this.stopGameLoop(session);
				this.endGame(session, winnerId); // <--- FIX: endGame acepta session
			} else {
				// D. Sigue el juego: Broadcast a los clientes
				this.broadcastState(session, GameConstants.GAME_UPDATE_TYPE.STATE_CHANGED);
			}
			
		}, 1000 / GameConstants.GAME_CONSTANTS.FPS);
	}
	
	/**
	* Helper para limpiar el intervalo de NodeJS y liberar la referencia.
	*/
	// Limpia el interval de forma segura. Si el estado NO es PLAYING mata el loop y sale
	private stopGameLoop(session: GameSession) {
		if (session.loopId) {
			clearInterval(session.loopId);
			session.loopId = null;
		}
	}
	
	
	// -------------------------------------------------------------------
	// FÍSICA Y LÓGICA DEL JUEGO (SIMULACION)
	// -------------------------------------------------------------------
	
	/**
	* Calcula un frame de física: movimiento, colisiones y puntuación.
	* @returns string con el ID del ganador si se alcanzó el targetScore, o null.
	*/
	private updatePhysics(session: GameSession): string | null {
		const { config, ball, paddleLeft, paddleRight } = session.gameState;
		
		// A. Movimiento de Palas (Inercia)
		[paddleLeft, paddleRight].forEach(paddle => {
			if (paddle.dy === 0) return;
			const maxPos = config.height - config.paddleHeight;
			if (config.hasInertia && config.friction) {
				if (Math.abs(paddle.dy) > 0.1) {
					paddle.y += paddle.dy;
					paddle.dy *= config.friction!;
				} else {
					paddle.dy = 0;
				}
			} else {
				// Constant speed, applys dy at every tick without decay
				paddle.y += paddle.dy;
			}

			if (paddle.y < 0) { paddle.y = 0; paddle.dy = 0; }
			if (paddle.y > maxPos) { paddle.y = maxPos; paddle.dy = 0; }
		});
		
		// B. Movimiento de la Bola (usando vectores DX/DY)
		ball.x += ball.dx;
		ball.y += ball.dy;
		
		// C. Rebote Paredes
		if (ball.y - config.ballRadius <= 0 || ball.y + config.ballRadius >= config.height) {
			ball.dy *= -1;
		}
		
		// D. Colisión Palas
		const paddle = (ball.x < config.width / 2) ? paddleLeft : paddleRight;
		if (this.checkCollision(ball, paddle, config)) {
			this.handlePaddleHit(session.gameState, paddle);
		}
		
		// E. Puntuación y condición de victoria
		if (ball.x < 0) {
			paddleRight.score++;
			// Capturamos el retorno. Si hay ganador, lo devolvemos inmediatamente.
			const winner = this.checkScoreOrReset(session, 'paddleRight');
			if (winner)
				return winner; 
		} else if (ball.x > config.width) {
			paddleLeft.score++;
			// Idem para el otro lado.
			const winner = this.checkScoreOrReset(session, 'paddleLeft');
			if (winner)
				return winner;
		}
		
		return null; // Si no hay ganador, el juego sigue
	}
	
	/**
	* Verifica si alguien ha ganado tras un punto. Si no, resetea la bola.
	*/
	private checkScoreOrReset(session: GameSession, scorer: 'paddleLeft' | 'paddleRight'): string | null {
		const { targetScore, paddleLeft, paddleRight } = session.gameState;
		const currentScore = scorer === 'paddleLeft' ? paddleLeft.score : paddleRight.score;
		
		if (currentScore >= targetScore) {
			// DEVOLVEMOS el ganador al loop principal
			return scorer === 'paddleLeft' ? session.player1Id : session.player2Id;
		} else {
			this.resetBall(session.gameState, scorer === 'paddleLeft' ? 'left' : 'right');
			return null;
		}
	}
	
	/**
	* AABB Collision detection (Axis-Aligned Bounding Box) simplificado.
	*/
	private checkCollision(
		ball: GameTypes.BallState,
		paddle: GameTypes.PaddleState,
		config: GameTypes.GameConfig & GameTypes.GameModeConfig
	): boolean {
		// Usamos el radio desde la config, no desde la bola
		const r = config.ballRadius;
		
		const inX = ball.x - r < paddle.x + config.paddleWidth && 
		ball.x + r > paddle.x;
		
		const inY = ball.y + r > paddle.y && 
		ball.y - r < paddle.y + config.paddleHeight;
		
		return inX && inY;
	}
	
	/**
	* Calcula el rebote de la bola en la pala, variando el ángulo según dónde golpee.
	*/
	private handlePaddleHit(game: GameTypes.GameState, paddle: GameTypes.PaddleState) {
		const { ball, config } = game;
		
		// 1. Invertir dirección X (USANDO DX)
		ball.dx = (ball.x < config.width / 2) ? Math.abs(ball.dx) : -Math.abs(ball.dx);
		
		// 2. Calcular ángulo relativo (más agudo si pega en los bordes de la pala)
		const hitPoint = ball.y - (paddle.y + config.paddleHeight / 2);
		const normalizedHit = hitPoint / (config.paddleHeight / 2);
		const angle = normalizedHit * (Math.PI / 4); 
		
		// 3. Aceleración progresiva
		if (config.ballAcceleration) {
			ball.speed *= (1 + config.ballAcceleration);
		}
		
		// 4. Recalcular vectores (usando DX/DY)
		const directionX = (ball.dx > 0) ? 1 : -1;
		ball.dx = directionX * ball.speed * Math.cos(angle);
		ball.dy = ball.speed * Math.sin(angle);
	}
	
	private resetBall(game: GameTypes.GameState, scorerSide: 'left' | 'right') {
		const { config } = game;
		
		game.ball.x = config.width / 2;
		game.ball.y = config.height / 2;
		game.ball.speed = config.ballSpeedBase; 
		
		// Saca el que recibió el punto (o el que anotó, según prefieras, aquí saca el que anotó)
		const direction = (scorerSide === 'left') ? 1 : -1; 
		
		// USANDO DX/DY
		game.ball.dx = direction * config.ballSpeedBase;
		game.ball.dy = 0; 
	}
	
	// -------------------------------------------------------------------
	// 5. FACTORY & INPUTS
	// -------------------------------------------------------------------
	
	/**
	* Genera el estado inicial del juego (posiciones, velocidad) basado en el modo.
	*/
	private createInitialState(matchId: string, targetScore: number, mode: GameConstants.GameModeType): GameTypes.GameState {
		const modeConfig = GameConstants.GAME_MODES[mode] || GameConstants.GAME_MODES.classic;
		const fullConfig = { ...GameConstants.GAME_CONSTANTS, ...modeConfig }; // Fusión de configs
		
		const midY = fullConfig.CANVAS_HEIGHT / 2 - fullConfig.PADDLE_HEIGHT / 2;
		const midX = fullConfig.CANVAS_WIDTH / 2;
		
		const isLeft = Math.random() < 0.5;
		const angle = (Math.random() * 2 - 1) * (Math.PI / 4);
		
		return {
			id: matchId, 
			status: GameConstants.GAME_STATUS.WAITING,
			targetScore: targetScore,
			winnerId: undefined,
			config: {
				width: fullConfig.CANVAS_WIDTH,
				height: fullConfig.CANVAS_HEIGHT,
				paddleWidth: fullConfig.PADDLE_WIDTH,
				paddleHeight: fullConfig.PADDLE_HEIGHT,
				ballRadius: fullConfig.BALL_RADIUS,
				paddleSpeed: modeConfig.paddleSpeed,
				ballSpeedBase: modeConfig.ballSpeedBase,
				ballAcceleration: modeConfig.ballAcceleration,
				hasInertia: modeConfig.hasInertia,
				friction: modeConfig.friction,
				gameModeName: mode
			},
			paddleLeft: {
				x: fullConfig.WALL_MARGIN,
				y: midY,
				score: 0,
				dy: 0
			},
			paddleRight: {
				x: fullConfig.CANVAS_WIDTH - fullConfig.WALL_MARGIN - fullConfig.PADDLE_WIDTH,
				y: midY,
				score: 0,
				dy: 0
			},
			ball: {
				x: midX,
				y: fullConfig.CANVAS_HEIGHT / 2,
				speed: modeConfig.ballSpeedBase,
				// USANDO DX/DY
				dx: modeConfig.ballSpeedBase * (isLeft ? -1 : 1) * Math.cos(angle),
				dy: modeConfig.ballSpeedBase * Math.sin(angle)
			}
		};
	}
	
	
	
	public async processInput(matchId: string, userId: string, message: Buffer | string): Promise<void> {
		const session = this.activeMatches.get(matchId);
		if (!session) return;
		
		// 1. Parseamos PRIMERO para saber qué intentan hacer
		let payload: GameTypes.GameInputPayload;
		try { 
			payload = JSON.parse(message.toString()); 
		} catch { 
			return; 
		}
		
		// 2. Guard de Estado: Permitimos inputs si está JUGANDO, o si está PAUSADO y quiere DESPAUSAR
		const isPauseToggle = payload.action === 'PAUSE_TOGGLE';
		const isPlaying = session.gameState.status === GameConstants.GAME_STATUS.PLAYING;
		
		if (!isPlaying && !isPauseToggle) return;
		
		// 3. Manejo de Pausa (Solo Local)
		if (isPauseToggle) {
			if (session.isLocal) {
				this.togglePause(session);
			}
			return; // No procesamos movimiento si es un comando de sistema
		}
		
		// Si el juego está pausado, ignoramos movimientos (doble check)
		if (!isPlaying) return;
		
		// 4. Lógica de Movimiento (tu código original sigue aquí abajo)
		let paddle: GameTypes.PaddleState;
		
		if (session.isLocal) {
			if (payload.playerSide === 'right') {
				paddle = session.gameState.paddleRight;
			} else {
				paddle = session.gameState.paddleLeft;
			}
		} else {
			const isP1 = session.player1Id === userId;
			paddle = isP1 ? session.gameState.paddleLeft : session.gameState.paddleRight;
		}
		
		const { config } = session.gameState;
		const speed = config.paddleSpeed; 
		
		if (payload.action === 'STOP') {
			paddle.dy = 0;
		} 
		else if (payload.action === 'MOVE_UP') {
			paddle.dy = -speed; 
		} 
		else if (payload.action === 'MOVE_DOWN') {
			paddle.dy = speed;
		}
	}
	
	/**
	* Alterna entre pausa y juego. Solo para local.
	*/
	private togglePause(session: GameSession) {
		if (session.gameState.status === GameConstants.GAME_STATUS.PLAYING) {
			// PAUSAR
			this.stopGameLoop(session);
			session.gameState.status = GameConstants.GAME_STATUS.PAUSED;
			this.broadcastState(session, GameConstants.GAME_UPDATE_TYPE.PAUSED); // Notificar UI para mostrar overlay "PAUSED"
		} else if (session.gameState.status === GameConstants.GAME_STATUS.PAUSED) {
			// REANUDAR
			this.startGameLoop(session); // Esto setea PLAYING y arranca el timer
			this.broadcastState(session, GameConstants.GAME_UPDATE_TYPE.RESUMED);
		}
	}
	
	
	
	// -------------------------------------------------------------------
	// 7. FINALIZACIÓN
	// -------------------------------------------------------------------
	
	/**
	* Finaliza la partida normalmente (Score limit alcanzado).
	* Guarda resultados en DB y limpia memoria.
	*/
	private endGame(session: GameSession, winnerId: string) {
		
		// Detener loop
		this.stopGameLoop(session);
		
		// Limpiar timeout de desconexión si existía
		const timeout = this.disconnectTimeouts.get(session.matchId);
		if (timeout) {
			clearTimeout(timeout);
			this.disconnectTimeouts.delete(session.matchId);
		}
		
		session.gameState.status = GameConstants.GAME_STATUS.FINISHED;
		session.gameState.winnerId = winnerId;
		
		// Persistencia asíncrona (si no es local)
		if (!session.isLocal) {
			this.matchRepo.finishMatch(
				session.matchId,
				winnerId,
				session.gameState.paddleLeft.score,
				session.gameState.paddleRight.score,
				Date.now()
			).catch(e => this.log.error({ err: e, matchId: session.matchId }, 'Error finishing match in DB'));
		}
		
		// Notificar a los 2 clientes, via websocket event		
		const msg = {
			type: WEBSOCKET_EVENTS.GAME_OVER,
			timestamp: Date.now(),
			payload: { matchId: session.matchId, winnerId, player1Score: session.gameState.paddleLeft.score, player2Score: session.gameState.paddleRight.score, reason: 'normal' as const }
		} satisfies WebSocketEventsTypes.GameOver;
		const str = JSON.stringify(msg);
		session.socketP1?.send(str);
		session.socketP2?.send(str);
	
		//Limpieza final de memoria
		this.activeMatches.delete(session.matchId);
	}
	
	/**
	* Finaliza la partida por abandono (Desconexión prolongada).
	*/
	private forfeitMatch(matchId: string, loserId: string) {
		// Limpiar siempre al inicio — evita entradas huérfanas si lanza excepción
		this.disconnectTimeouts.delete(matchId);
		
		const session = this.activeMatches.get(matchId);
		if (!session || session.gameState.status === GameConstants.GAME_STATUS.FINISHED) return;
		
		const winnerId = (session.player1Id === loserId) ? session.player2Id : session.player1Id;
		const winnerSocket = (session.player1Id === loserId) ? session.socketP2 : session.socketP1;
		
		// Notificar game over al cliente vivo via websocket event.
		const msg = {
			type: WEBSOCKET_EVENTS.GAME_OVER,
			timestamp: Date.now(),
			payload: { matchId, winnerId, player1Score: session.gameState.paddleLeft.score, player2Score: session.gameState.paddleRight.score, reason: 'opponent_disconnected' as const }
		} satisfies WebSocketEventsTypes.GameOver;
		
		winnerSocket?.send(JSON.stringify(msg));

		// Persistencia
		if (!session.isLocal) {
			this.matchRepo.finishMatch(
				matchId,
				winnerId,
				session.gameState.paddleLeft.score,
				session.gameState.paddleRight.score,
				Date.now()
			).catch(e => this.log.error({ err: e, matchId }, 'Error saving forfeit match in DB'));
		}

		// Quitar partida de mapa de activas
		this.activeMatches.delete(matchId);
	}
	
	/**
	* Emite el estado actual del juego a ambos jugadores.
	* Enviamos solo los datos dinámicos (sin config) para ahorrar ancho de banda.
	* El Frontend debe usar la config que recibió en el evento inicial 'MATCH_JOINED' o el primer 'GAME_UPDATE'.
	*/
	private broadcastState(session: GameSession, updateType: GameConstants.GameUpdateType) {
		const { config, id, ...dynState } = session.gameState;
		
		// TypeScript ahora estará feliz si tipamos esto correctamente en el evento
		const updateMsg = {
			type: WEBSOCKET_EVENTS.GAME_UPDATE,
			timestamp: Date.now(),
			payload: {
				matchId: session.matchId,
				gameState: dynState,
				updateType
			}
		} satisfies WebSocketEventsTypes.GameUpdate;
		
		const msg = JSON.stringify(updateMsg);
		if (session.socketP1?.readyState === WebSocket.OPEN) 
			session.socketP1.send(msg);
		if (session.socketP2?.readyState === WebSocket.OPEN)
			session.socketP2.send(msg);
	}
	
	private findMatchIdByUserId(userId: string): string | undefined {
		for (const [matchId, session] of this.activeMatches) {
			if (session.player1Id === userId || session.player2Id === userId) return matchId;
		}
		return undefined;
	}
	
	/**
	* Actualiza el nombre de un usuario en una partida activa (Memoria).
	*/
	public updatePlayerInActiveMatch(userId: string, newName: string, newAvatar: string): void {
		// Usamos tu propio helper para buscar la partida
		const matchId = this.findMatchIdByUserId(userId);
		
		if (!matchId) return; // No está jugando, solo actualizamos DB (MatchService se encarga)
		
		const session = this.activeMatches.get(matchId);
		if (!session) return;
		
		// Actualizamos la referencia en memoria
		if (session.player1Id === userId) {
			session.player1Username = newName;
			session.player1Avatar = newAvatar;
			this.log.info({ userId, newName }, 'Memory updated: Player 1');
		} else if (session.player2Id === userId) {
			session.player2Username = newName;
			session.player2Avatar = newAvatar;
			this.log.info( { userId, newName }, 'Memory updated: Player 2');
		}
	}
}