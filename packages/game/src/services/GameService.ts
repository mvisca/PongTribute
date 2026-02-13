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

export class GameService {
    private activeMatches: Map<string, GameSession> = new Map();
    private disconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

	constructor(
		private matchRepo: MatchRepository,
		private redis: Redis
	) { }

    // -------------------------------------------------------------------
    // 1. UNIRSE O RECONECTARSE A PARTIDA
    // -------------------------------------------------------------------
    public async joinMatch(matchId: string, userId: string, socket: WebSocket): Promise<void> {
        let session = this.activeMatches.get(matchId);
        
        // A. CREAR SESIÓN SI NO EXISTE
        if (!session) {
            let matchData: any = await this.matchRepo.findById(matchId);
            let isLocalMatch = false;

            // --- LÓGICA LOCAL START ---
            // Si no está en DB, buscamos el ticket en Redis
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
                    // Consumimos el ticket para limpieza
                    await this.redis.del(`match:local:${matchId}`);
                }
            }
            // --- LÓGICA LOCAL END ---

            if (!matchData || matchData.status === 'finished') {
                socket.close(1008, 'Match invalid or finished');
                return;
            }

            session = {
                matchId: matchId,
                player1Id: String(matchData.player1_id),
                player2Id: String(matchData.player2_id),
                socketP1: null,
                socketP2: null,
                gameState: this.createInitialState(matchId, matchData.target_score || 11, matchData.game_mode),
                loopId: null,
                isLocal: isLocalMatch // <--- GUARDAMOS EL ESTADO
            };

            this.activeMatches.set(matchId, session);
        }
        
        // B. ASIGNAR SOCKET
        // En Local, el Player 1 controla todo. El Player 2 es virtual.
        // Solo asignamos socketP1. socketP2 se queda null (y no pasa nada).
        const isPlayer1 = session.player1Id === userId;
        const isPlayer2 = session.player2Id === userId;

        if (!isPlayer1 && !isPlayer2) {
            socket.close(1008, 'Not a player');
            return;
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
		
        // C. GESTIÓN DE ESTADO
        if (session.gameState.status === GAME_STATUS.PLAYING) {
            this.handleReconnection(session, matchId, isPlayer1);
            socket.send(JSON.stringify({ event: SOCKET_EVENTS.GAME_UPDATE, data: session.gameState }));
        }
        else if (session.gameState.status === GAME_STATUS.WAITING) {
            // En local arrancamos apenas conecta el P1
            if (session.isLocal && session.socketP1) {
                this.startGameLoop(matchId);
            }
            // En online esperamos a los dos
            else if (!session.isLocal && session.socketP1 && session.socketP2) {
                this.startGameLoop(matchId);
            }
        }
	}
	
    private handleReconnection(session: GameSession, matchId: string, isPlayer1: boolean) {
        const timer = this.disconnectTimeouts.get(matchId);
        if (timer) {
            clearTimeout(timer);
            this.disconnectTimeouts.delete(matchId);
        }
        const rivalSocket = isPlayer1 ? session.socketP2 : session.socketP1;
        rivalSocket?.send(JSON.stringify({ event: SOCKET_EVENTS.GAME_OPPONENT_RECONNECTED }));
        this.startGameLoop(matchId);
    }
    
    // -------------------------------------------------------------------
    // 2. MANEJAR DESCONEXIÓN
    // -------------------------------------------------------------------
    public async handleDisconnect(userId: string, matchId?: string): Promise<void> {
        const targetMatchId = matchId || this.findMatchIdByUserId(userId);
        if (!targetMatchId) return;

        const session = this.activeMatches.get(targetMatchId) as GameSession;
        if (!session || session.gameState.status === GAME_STATUS.FINISHED) return;

        // Pausar Loop
        if (session.loopId) {
            clearInterval(session.loopId);
            session.loopId = null; 
        }
        session.gameState.status = GAME_STATUS.PAUSED;
        
		// Envia un mensaje al que aún está conectado
        const isPlayer1Gone = session.player1Id === userId;
        const rivalSocket = isPlayer1Gone ? session.socketP2 : session.socketP1;
        
        rivalSocket?.send(JSON.stringify({ 
            event: SOCKET_EVENTS.GAME_OPPONENT_DISCONNECTED, 
            data: { timeout: GAME_CONSTANTS.IN_MATCH_DISCONNECTION_TIMEOUT / 1000 } 
        }));
        
        const timeoutId = setTimeout(() => {
            this.forfeitMatch(targetMatchId, userId);
        }, GAME_CONSTANTS.IN_MATCH_DISCONNECTION_TIMEOUT); 
        
        this.disconnectTimeouts.set(targetMatchId, timeoutId);
    }

    // -------------------------------------------------------------------
    // 3. GAME LOOP (Central)
	// -------------------------------------------------------------------
    private startGameLoop(matchId: string) {
        const session = this.activeMatches.get(matchId);
        if (!session) return;

        session.gameState.status = GAME_STATUS.PLAYING;
        if (session.loopId) clearInterval(session.loopId);

        session.loopId = setInterval(() => {
            // 1. Si ya no estamos jugando, paramos
            if (session.gameState.status !== GAME_STATUS.PLAYING) return;

            // 2. Calculamos física (AQUI el estado puede cambiar a FINISHED)
            this.updatePhysics(session);
            
            // 3. Verificamos si terminó (Forzamos el tipo para callar a TS)
            if ((session.gameState.status as string) === GAME_STATUS.FINISHED) return;

            // 4. Si sigue activo, emitimos
            this.broadcastState(session);

        }, 1000 / GAME_CONSTANTS.FPS);
    }
 
    // -------------------------------------------------------------------
    // 4. FÍSICA Y LÓGICA DEL JUEGO (dx/dy Corregidos)
    // -------------------------------------------------------------------
    private updatePhysics(session: GameSession) {
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

        // B. Movimiento de la Bola (USANDO DX/DY)
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

        // E. Puntuación
        if (ball.x < 0) {
            paddleRight.score++;
            this.checkScoreOrReset(session, 'paddleRight');
        } else if (ball.x > config.width) {
            paddleLeft.score++;
            this.checkScoreOrReset(session, 'paddleLeft');
        }
    }

    private checkScoreOrReset(session: GameSession, scorer: 'paddleLeft' | 'paddleRight') {
        const { targetScore, paddleLeft, paddleRight } = session.gameState;
        const currentScore = scorer === 'paddleLeft' ? paddleLeft.score : paddleRight.score;

        if (currentScore >= targetScore) {
            const winnerId = scorer === 'paddleLeft' ? session.player1Id : session.player2Id;
            this.endGame(session.matchId, winnerId);
        } else {
            this.resetBall(session.gameState, scorer === 'paddleLeft' ? 'left' : 'right');
        }
    }

    private checkCollision(ball: BallState, paddle: PaddleState, config: any): boolean {
       // Usamos el radio desde la config, no desde la bola
        const r = config.ballRadius;

        const inX = ball.x - r < paddle.x + config.paddleWidth && 
                   ball.x + r > paddle.x;
                   
        const inY = ball.y + r > paddle.y && 
                   ball.y - r < paddle.y + config.paddleHeight;
                   
        return inX && inY;
    }

    private handlePaddleHit(game: GameState, paddle: PaddleState) {
        const { ball, config } = game;

        // 1. Invertir dirección X (USANDO DX)
        ball.dx = (ball.x < config.width / 2) ? Math.abs(ball.dx) : -Math.abs(ball.dx);

        // 2. Ángulo relativo
        const hitPoint = ball.y - (paddle.y + config.paddleHeight / 2);
        const normalizedHit = hitPoint / (config.paddleHeight / 2);
        const angle = normalizedHit * (Math.PI / 4); 

        // 3. Aceleración
        if (config.ballAcceleration) {
            ball.speed *= (1 + config.ballAcceleration);
        }

        // 4. Recalcular vectores (USANDO DX/DY)
        const directionX = (ball.dx > 0) ? 1 : -1;
        ball.dx = directionX * ball.speed * Math.cos(angle);
        ball.dy = ball.speed * Math.sin(angle);
    }

    private resetBall(game: GameState, scorerSide: 'left' | 'right') {
        const { config } = game;
        
        game.ball.x = config.width / 2;
        game.ball.y = config.height / 2;
        game.ball.speed = config.ballSpeedBase; 

        const direction = (scorerSide === 'left') ? 1 : -1; 
        
        // USANDO DX/DY
        game.ball.dx = direction * config.ballSpeedBase;
        game.ball.dy = 0; 
    }

    // -------------------------------------------------------------------
    // 5. ESTADO INICIAL (ARGUMENTOS CORREGIDOS)
    // -------------------------------------------------------------------
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

    // -------------------------------------------------------------------
    // 6. PROCESAR INPUTS
    // -------------------------------------------------------------------
    public async processInput(matchId: string, userId: string, message: Buffer | string): Promise<void> {
        const session = this.activeMatches.get(matchId);
        if (!session || session.gameState.status !== GAME_STATUS.PLAYING) return;

        let payload: GameInputPayload;
        try { payload = JSON.parse(message.toString()); } catch { return; }

		let paddle: PaddleState;

		// --- SELECCIÓN DE PALA ---
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
    private endGame(matchId: string, winnerId: string) {
        const session = this.activeMatches.get(matchId);
        if (!session) return;

        if (session.loopId) {
            clearInterval(session.loopId);
            session.loopId = null;
        }
        
        session.gameState.status = GAME_STATUS.FINISHED;
        // En local, winnerId podría ser 'guest-id', parseInt daría NaN, pero no importa porque no guardamos
        
		session.gameState.winnerId = parseInt(winnerId) || 0; // || 0 por si es 'guest-id'

        // --- PROTECCIÓN DB START ---
        if (!session.isLocal) {
             this.matchRepo.finishMatch(
                matchId,
                winnerId,
                session.gameState.paddleLeft.score,
                session.gameState.paddleRight.score,
                Date.now()
            ).catch(e => console.error(e));
        }
		// --- PROTECCIÓN DB END ---

        const endMsg = JSON.stringify({
            event: SOCKET_EVENTS.GAME_OVER,
            data: { winnerId, reason: 'SCORE_LIMIT_REACHED' }
        });

        session.socketP1?.send(endMsg);
        session.socketP2?.send(endMsg);
        this.activeMatches.delete(matchId);
    }

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
        
        //this.matchRepo.finishMatch(matchId, winnerId, 0, 0, Date.now()).catch(e => console.error(e));
        
		// --- PROTECCIÓN DB START ---
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

    private broadcastState(session: GameSession) {
        const updateMsg = JSON.stringify({
            event: SOCKET_EVENTS.GAME_UPDATE,
            data: session.gameState
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