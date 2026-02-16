// packages/game/src/services/GameService.ts

//CREA y MANEJA EL MAPA DE PARTIDAS ACTIVAS: ES LLAMADO POR GameGateway 
// CUANDO HAY UNA CONEXION O DESCONEXION DE WEBSOCKET

import { WebSocket } from 'ws';
import { Redis } from 'ioredis';
import { MatchRepository } from '../repositories/MatchRepository.js';

import {
    GameState,
    GAME_CONSTANTS,
    GAME_MODES,
    GAME_STATUS,
    SOCKET_EVENTS,
    PaddleState,
	BallState,
	GameInputPayload,
	MatchTypes
} from '@transcendence/shared'; 

interface GameSession {
    matchId: string;
    player1Id: string;
    player2Id: string;
    socketP1: WebSocket | null;
    socketP2: WebSocket | null;
    gameState: GameState;
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
     * * @param matchId ID de la partida
     * @param userId ID del usuario que conecta
     * @param socket Conexión WebSocket activa
     */
    public async joinMatch(matchId: string, userId: string, socket: WebSocket): Promise<string | null> {
        let session = this.activeMatches.get(matchId);
        
        // A. CREAR SESIÓN SI NO EXISTE (HIDRATACION)
        if (!session) {
            let matchData: any = await this.matchRepo.findById(matchId);
            let isLocalMatch = false;

            // --- LÓGICA LOCAL START ---
            // Si no está en DB, buscamos el ticket TEMPORAL en Redis
            if (!matchData) {
                const localDataString = await this.redis.get(`match:local:${matchId}`);
                if (localDataString) {
                    const localMatch = JSON.parse(localDataString);
                    // Mapeamos el JSON al formato que espera tu lógica
                    matchData = {
                        id: localMatch.id,
                        player1_id: localMatch.player1.userId,
                        player2_id: localMatch.player2.userId, // 'guest-id'
                        target_score: localMatch.targetScore,
                        game_mode: localMatch.gameMode || 'classic',
                        status: 'active'
                    };
                    isLocalMatch = true;
                    // Consumimos el ticket para limpieza y evitar duplicados
                    await this.redis.del(`match:local:${matchId}`);
                }
            }
            // --- LÓGICA LOCAL END ---

            if (!matchData || matchData.status === 'finished') {
                socket.close(1008, 'Match invalid or finished');
                return null;
            }

            session = {
                matchId: matchId,
                player1Id: String(matchData.player1_id),
                player2Id: String(matchData.player2_id),
                socketP1: null,
                socketP2: null,
                gameState: this.createInitialState(matchId, matchData.target_score || 11, matchData.game_mode),
                loopId: null,
                isLocal: isLocalMatch // Guarda el estado
            };

            this.activeMatches.set(matchId, session);
        }
        
        // B. ASIGNAR SOCKET A SLOT CORRESPONDIENTE
        // En Local, el Player 1 controla todo. El Player 2 es virtual.
        // Solo asignamos socketP1. socketP2 se queda null (y no pasa nada).
        const isPlayer1 = session.player1Id === userId;
        const isPlayer2 = session.player2Id === userId;

        if (!isPlayer1 && !isPlayer2) {
            socket.close(1008, 'Not a player');
            return null;
        }
		// Asignación de sockets
        if (isPlayer1) {
            session.socketP1 = socket;
            // Si es partida local, asignamos el mismo socket al P2
            // para que reciba actualizaciones, aunque lógicamente controlas todo tú.
            if (session.isLocal) {
                 session.socketP2 = socket; 
            }
        } else {
            session.socketP2 = socket;
		}
		
        // C. GESTIÓN DE ESTADO Y ARRANQUE
		if (session.gameState.status === GAME_STATUS.PLAYING) {
			// Si ya estaba jugando (reconexión rápida)
            this.handleReconnection(session, matchId, isPlayer1);
            socket.send(JSON.stringify({ event: SOCKET_EVENTS.GAME_UPDATE, data: session.gameState }));
        }
        else if (session.gameState.status === GAME_STATUS.WAITING) {
            // En local arrancamos apenas conecta el P1
            if (session.isLocal && session.socketP1) {
                this.startGameLoop(session);
            }
            // En online esperamos a los dos
            else if (!session.isLocal && session.socketP1 && session.socketP2) {
                this.startGameLoop(session);
            }
		}
		// Devolvemos el estado real para el Gateway
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
        rivalSocket?.send(JSON.stringify({ event: SOCKET_EVENTS.GAME_OPPONENT_RECONNECTED }));
        this.startGameLoop(session);
    }
    
    // -------------------------------------------------------------------
    // 2. MANEJAR DESCONEXIÓN
	// -------------------------------------------------------------------
	
	/**
     * Gestiona la pérdida de conexión WebSocket.
     * Pausa el juego y comienza una cuenta atrás para declarar forfeit.
     */
    public async handleDisconnect(userId: string, matchId?: string): Promise<void> {
        const targetMatchId = matchId || this.findMatchIdByUserId(userId);
        if (!targetMatchId) return;

		const session = this.activeMatches.get(targetMatchId) as GameSession;

		// Si es local, no hay reconexión ni rival remoto. Limpieza inmediata.
    if (session.isLocal) {
        this.stopGameLoop(session);
        this.activeMatches.delete(targetMatchId);
        return;
	}
		
		// Si ya terminó, ignoramos desconexiones residuales
        if (!session || session.gameState.status === GAME_STATUS.FINISHED) return;

		// 1. Detenemos el loop inmediatamente
		this.stopGameLoop(session); // Usamos el helper  centralizado
		
		// 2. Estado a PAUSED
        session.gameState.status = GAME_STATUS.PAUSED;
        
		// 3. Notificar al que aún está conectado
        const isPlayer1Gone = session.player1Id === userId;
        const rivalSocket = isPlayer1Gone ? session.socketP2 : session.socketP1;
        
        rivalSocket?.send(JSON.stringify({ 
            event: SOCKET_EVENTS.GAME_OPPONENT_DISCONNECTED, 
            data: { timeout: GAME_CONSTANTS.IN_MATCH_DISCONNECTION_TIMEOUT / 1000 } 
        }));
        
		// 4. Iniciamos cuenta atrás para victoria automática
        const timeoutId = setTimeout(() => {
            this.forfeitMatch(targetMatchId, userId);
        }, GAME_CONSTANTS.IN_MATCH_DISCONNECTION_TIMEOUT); 
        
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

        console.log(`▶️ Iniciando Game Loop para partida ${session.matchId}`);
		session.gameState.status = GAME_STATUS.PLAYING; // Aseguramos estado playing

        // 2. Iniciar Intervalo
        session.loopId = setInterval(() => {
            // A. Guard de Seguridad: Si el estado cambió externamente (ej: desconexión)
            if (session.gameState.status !== GAME_STATUS.PLAYING) {
                this.stopGameLoop(session);
                return;
            }

            // B. Física: Delegamos cálculo, recibimos veredicto
            const winnerId = this.updatePhysics(session);  // Ahora devuelve string | null

            // C. Evaluación
            if (winnerId) {
                // ¡Game Over! El loop toma el control y cierra el chiringuito
                this.stopGameLoop(session);
                this.endGame(session, winnerId); // <--- FIX: endGame acepta session
            } else {
                // D. Sigue el juego: Broadcast a los clientes
                this.broadcastState(session);
            }

        }, 1000 / GAME_CONSTANTS.FPS);
    }
 
	/**
     * Helper para limpiar el intervalo de NodeJS y liberar la referencia.
     */
	// Limpia el interval de forma segura. Si el estado NO es PLAYING mata el loop y sal
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
        if (config.hasInertia && config.friction) {
            [paddleLeft, paddleRight].forEach(paddle => {
                if (Math.abs(paddle.dy) > 0.1) {
                    paddle.y += paddle.dy;
                    paddle.dy *= config.friction!;
                    const maxPos = config.height - config.paddleHeight;
                    if (paddle.y < 0) { paddle.y = 0; paddle.dy = 0; }
                    if (paddle.y > maxPos) { paddle.y = maxPos; paddle.dy = 0; }
                } else {
                    paddle.dy = 0;
                }
            });
        }

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
            if (winner) return winner; 
        } else if (ball.x > config.width) {
            paddleLeft.score++;
            // Idem para el otro lado.
            const winner = this.checkScoreOrReset(session, 'paddleLeft');
            if (winner) return winner;
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
    private checkCollision(ball: BallState, paddle: PaddleState, config: any): boolean {
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
    private handlePaddleHit(game: GameState, paddle: PaddleState) {
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

    private resetBall(game: GameState, scorerSide: 'left' | 'right') {
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
    private createInitialState(matchId: string, targetScore: number, mode: string): GameState {
        const modeConfig = GAME_MODES[mode] || GAME_MODES.classic;
        const fullConfig = { ...GAME_CONSTANTS, ...modeConfig }; // Fusión de configs

        const midY = fullConfig.CANVAS_HEIGHT / 2 - fullConfig.PADDLE_HEIGHT / 2;
        const midX = fullConfig.CANVAS_WIDTH / 2;

        const isLeft = Math.random() < 0.5;
        const angle = (Math.random() * 2 - 1) * (Math.PI / 4);

        return {
            id: matchId, 
            status: GAME_STATUS.WAITING,
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
                friction: modeConfig.friction
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

	/**
     * Procesa los inputs del usuario (teclas) y actualiza la velocidad de las palas.
     */
    public async processInput(matchId: string, userId: string, message: Buffer | string): Promise<void> {
        const session = this.activeMatches.get(matchId);
        if (!session || session.gameState.status !== GAME_STATUS.PLAYING) return;

        let payload: GameInputPayload;
        try { payload = JSON.parse(message.toString()); } catch { return; }

		let paddle: PaddleState;

		// --- SELECCIÓN DE PALA SEGURA---
		if (session.isLocal) {
			// MODO LOCAL: El payload dicta qué pala se mueve ('left' o 'right')
			// El front enviará playerSide='right' cuando use las flechas
			if (payload.playerSide === 'right') {
				paddle = session.gameState.paddleRight;
			} else {
				paddle = session.gameState.paddleLeft; // Default left/W/S
			}
			
		} else {
			// MODO ONLINE: El ID del usuario dicta qué pala se mueve (Seguridad)
            const isP1 = session.player1Id === userId;
            paddle = isP1 ? session.gameState.paddleLeft : session.gameState.paddleRight;
		}
		
        const { config } = session.gameState; // Obtenemos la config de la sesión
        const speed = config.paddleSpeed; 

		// Aplicar movimiento o física
        if (payload.action === 'STOP') {
             if (!config.hasInertia) paddle.dy = 0;
        } 
        else if (payload.action === 'MOVE_UP') {
            if (config.hasInertia) {
                paddle.dy = -speed; 
            } else {
                paddle.y = Math.max(0, paddle.y - speed);
            }
        } 
        else if (payload.action === 'MOVE_DOWN') {
             if (config.hasInertia) {
                paddle.dy = speed;
            } else {
                paddle.y = Math.min(config.height - config.paddleHeight, paddle.y + speed);
            }
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
			
			session.gameState.status = GAME_STATUS.FINISHED;
			session.gameState.winnerId = winnerId;

			// Persistencia asíncrona (si no es local)
			if (!session.isLocal) {
				this.matchRepo.finishMatch(
					session.matchId,
					winnerId,
					session.gameState.paddleLeft.score,
					session.gameState.paddleRight.score,
					Date.now()
				).catch(e => console.error(e));
			}
		
		// Notificar clientes
        const endMsg = JSON.stringify({
            event: SOCKET_EVENTS.GAME_OVER,
            data: { winnerId, reason: 'SCORE_LIMIT_REACHED' }
        });

        session.socketP1?.send(endMsg);
		session.socketP2?.send(endMsg);
		
		//Limpieza final de memoria
        this.activeMatches.delete(session.matchId);
    }

	/**
     * Finaliza la partida por abandono (Desconexión prolongada).
     */
    private forfeitMatch(matchId: string, loserId: string) {
        const session = this.activeMatches.get(matchId);
        if (!session) return;
        
        this.disconnectTimeouts.delete(matchId);
        
        const winnerId = (session.player1Id === loserId) ? session.player2Id : session.player1Id;
        const winnerSocket = (session.player1Id === loserId) ? session.socketP2 : session.socketP1;
        
        winnerSocket?.send(JSON.stringify({
            event: SOCKET_EVENTS.GAME_OVER,
            data: {
                reason: 'OPPONENT_DISCONNECTED',
                winnerId: winnerId,
                message: '¡Tu rival abandonó!'
            }
        }));
        
		// Persistencia
        if (!session.isLocal) {
             this.matchRepo.finishMatch(
                matchId,
                winnerId,
                session.gameState.paddleLeft.score,
                session.gameState.paddleRight.score,
                Date.now()
            ).catch(e => console.error(e));
        }
		this.activeMatches.delete(matchId);
    }

	/**
     * Emite el estado actual del juego a ambos jugadores.
     * Enviamos solo los datos dinámicos (sin config) para ahorrar ancho de banda.
     * El Frontend debe usar la config que recibió en el evento inicial 'JOINED_MATCH' o el primer 'GAME_UPDATE'.
     */
    private broadcastState(session: GameSession) {
        // Extraemos 'config' y 'id' para NO enviarlos en cada frame (son estáticos)
        // dynamicState contendrá: status, targetScore, winnerId, paddleLeft, paddleRight, ball
        const { config, id, ...dynamicState } = session.gameState;

		// TypeScript ahora estará feliz si tipamos esto correctamente en el evento
        const updateMsg = JSON.stringify({
            event: SOCKET_EVENTS.GAME_UPDATE,
            data: dynamicState
        });

        if (session.socketP1?.readyState === WebSocket.OPEN) session.socketP1.send(updateMsg);
        if (session.socketP2?.readyState === WebSocket.OPEN) session.socketP2.send(updateMsg);
    }

	
    private findMatchIdByUserId(userId: string): string | undefined {
        for (const [matchId, session] of this.activeMatches) {
            if (session.player1Id === userId || session.player2Id === userId) return matchId;
        }
        return undefined;
    }
}