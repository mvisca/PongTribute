//CREA y MANEJA EL MAPA DE PARTIDAS ACTIVAS: ES LLAMADO POR GameGateway 
// CUANDO HAY UNA CONEXION O DESCONEXION DE WEBSOCKET

import { WebSocket } from 'ws';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { GameState, GAME_CONSTANTS } from '@transcendence/shared'; 

interface GameSession {
    matchId: string;
    player1Id: string;
    player2Id: string;
    socketP1: WebSocket | null;
    socketP2: WebSocket | null;
    gameState: GameState;
    loopId: NodeJS.Timeout | null;
}

export class GameService {
    private activeMatches: Map<string, GameSession> = new Map();

    constructor(private matchRepo: MatchRepository) {}

    // -------------------------------------------------------------------
    // MÉTODO: UNIRSE A PARTIDA (AHORA ES ASYNC)
    // -------------------------------------------------------------------
    public async joinMatch(matchId: string, userId: string, socket: WebSocket): Promise<void> {
        console.log(`🔌 Usuario ${userId} intentando unirse a partida ${matchId}`);
        
        // 1. Recuperar Sesión en Memoria
        let session = this.activeMatches.get(matchId);
        
        // --- CORRECCIÓN CLAVE: HIDRATACIÓN ---
        // Si no hay sesión, PRIMERO buscamos en DB para obtener los datos
        // necesarios para crearla (IDs de jugadores).
        if (!session) {
            console.log(`✨ Buscando datos en DB para crear sesión ${matchId}...`);
            
            // Usamos AWAIT porque la DB es asíncrona
            const matchFromDb = await this.matchRepo.findById(matchId);

            if (!matchFromDb) {
                socket.close(1008, 'Match not found in DB');
                return;
            }

            // AHORA SÍ tenemos los datos para crear la sesión correctamente
            session = {
                matchId: matchId,
                player1Id: String(matchFromDb.player1_id), // Convertimos a string por seguridad
                player2Id: String(matchFromDb.player2_id),
                socketP1: null,
                socketP2: null,
                gameState: this.createInitialState(matchId),
                loopId: null
            };

            // Guardamos en memoria
            this.activeMatches.set(matchId, session);
        }
        
        // 2. Asignar Socket (Usando los datos de la sesión que ya tenemos seguros)
        if (session.player1Id === userId) {
            session.socketP1 = socket;
            console.log('✅ Player 1 conectado');
        } else if (session.player2Id === userId) {
            session.socketP2 = socket;
            console.log('✅ Player 2 conectado');
        } else {
            console.log('⛔ Usuario no autorizado en esta partida');
            socket.close(1008, 'Not a player in this match');
            return;
        }

        // 3. Comprobar si ambos están listos
        if (session.socketP1 && session.socketP2) {
            // Solo iniciamos si está en WAITING (evita reiniciar si ya estaba jugando y hubo reconexión)
            if (session.gameState.status === 'WAITING') {
                console.log('🚀 AMBOS JUGADORES CONECTADOS. INICIANDO JUEGO...');
                this.startGameLoop(matchId);
            }
        }
    }
    
    // -------------------------------------------------------------------
    // AUXILIAR: ESTADO INICIAL
    // -------------------------------------------------------------------
    private createInitialState(matchId: string): GameState {
        const WALL_MARGIN = 10; 

        return {
            id: matchId,
            status: 'WAITING',
            config: {
                width: GAME_CONSTANTS.COURT_WIDTH,
                height: GAME_CONSTANTS.COURT_HEIGHT,
                paddleWidth: GAME_CONSTANTS.PADDLE_WIDTH,
                paddleHeight: GAME_CONSTANTS.PADDLE_HEIGHT,
                ballRadius: GAME_CONSTANTS.BALL_SIZE
            },
            player1: { 
                x: WALL_MARGIN, 
                y: (GAME_CONSTANTS.COURT_HEIGHT / 2) - (GAME_CONSTANTS.PADDLE_HEIGHT / 2), 
                score: 0 
            },
            player2: { 
                x: GAME_CONSTANTS.COURT_WIDTH - WALL_MARGIN - GAME_CONSTANTS.PADDLE_WIDTH, 
                y: (GAME_CONSTANTS.COURT_HEIGHT / 2) - (GAME_CONSTANTS.PADDLE_HEIGHT / 2), 
                score: 0 
            },
            ball: { 
                x: GAME_CONSTANTS.COURT_WIDTH / 2, 
                y: GAME_CONSTANTS.COURT_HEIGHT / 2, 
                dx: GAME_CONSTANTS.BALL_SPEED, 
                dy: GAME_CONSTANTS.BALL_SPEED 
            }
        };
    }

    // -------------------------------------------------------------------
    // MÉTODO: MANEJAR DESCONEXIÓN (ASYNC)
    // -------------------------------------------------------------------
    public async handleDisconnect(userId: string, matchId: string): Promise<void> {
        const session = this.activeMatches.get(matchId);
        if (!session) return; 

        console.log(`⚠️ Jugador ${userId} desconectado de ${matchId}`);

        let winnerSocket: WebSocket | null = null;
        let winnerId: string | null = null;

        // Aquí podríamos usar session.player1Id directamente para ahorrar DB call,
        // pero seguimos la lógica original por seguridad.
        const matchFromDb = await this.matchRepo.findById(matchId); // AWAIT
        if (!matchFromDb) return;

        if (String(matchFromDb.player1_id) === userId) {
            winnerSocket = session.socketP2;
            winnerId = String(matchFromDb.player2_id);
        } else {
            winnerSocket = session.socketP1;
            winnerId = String(matchFromDb.player1_id);
        }

        if (winnerSocket && winnerSocket.readyState === WebSocket.OPEN) {
            winnerSocket.send(JSON.stringify({
                event: 'GAME_OVER',
                data: {
                    reason: 'OPPONENT_DISCONNECTED',
                    message: '¡Tu rival se ha desconectado! Ganas por abandono.'
                }
            }));
        }

        if (session.loopId) {
            clearInterval(session.loopId);
        }

        if (winnerId) {
            // finishMatch suele ser async también en Repos SQL
            await this.matchRepo.finishMatch(matchId, winnerId, 5, 0, Date.now());
            console.log(`🏆 Partida guardada por abandono. Ganador: ${winnerId}`);
        }

        this.activeMatches.delete(matchId);
    }

    // -------------------------------------------------------------------
    // AUXILIAR: START GAME LOOP
    // -------------------------------------------------------------------
    private startGameLoop(matchId: string) {
        const session = this.activeMatches.get(matchId);
        if (!session) return;

        session.gameState.status = 'PLAYING';

        session.loopId = setInterval(() => {
            // --- CORRECCIÓN ERROR TIPOS ---
            // Usamos 'as string' para que TS no se queje si no ve 'FINISHED' en el tipo
            if ((session.gameState.status as string) === 'FINISHED') {
                if (session.loopId) clearInterval(session.loopId);
                return;
            }
            
//            if (session.gameState.status === 'PAUSED') {
//                 this.broadcastState(session);
//                 return;
//            }

            this.updatePhysics(session);

            if ((session.gameState.status as string) === 'FINISHED') return;

            this.broadcastState(session);

        }, 1000 / GAME_CONSTANTS.FPS);
    }

    // -------------------------------------------------------------------
    // LA LOGICA FISICA + PUNTUACION
    // -------------------------------------------------------------------
    private updatePhysics(session: GameSession) {
        const { ball, config, player1, player2 } = session.gameState;
        const r = config.ballRadius;

        // Mover bola
        ball.x += ball.dx;
        ball.y += ball.dy;

        // 1. Rebote Arriba/Abajo
        if (ball.y - r < 0 || ball.y + r > config.height) {
            ball.dy *= -1; 
        }

        // 2. Colisión con Palas 
        if (ball.x - r < player1.x + config.paddleWidth && 
            ball.y > player1.y && ball.y < player1.y + config.paddleHeight) {
                ball.dx *= -1; 
                ball.x = player1.x + config.paddleWidth + r + 1; 
        }

        if (ball.x + r > player2.x && 
            ball.y > player2.y && ball.y < player2.y + config.paddleHeight) {
                ball.dx *= -1;
                ball.x = player2.x - r - 1;
        }

        const WIN_SCORE = 6; //OJO esto seria mejor manejarlo desde constants. Creo.

        // 3. PUNTUACION
        if (ball.x < 0) {
            session.gameState.player2.score++;
            if (session.gameState.player2.score >= WIN_SCORE) {
                this.endGame(session.matchId, session.player2Id);
                return; 
            }
            this.resetBall(session);
        } else if (ball.x > session.gameState.config.width) {
            session.gameState.player1.score++;
            if (session.gameState.player1.score >= WIN_SCORE) {
                this.endGame(session.matchId, session.player1Id);
                return; 
            }
            this.resetBall(session); 
        }
    }

    private resetBall(session: GameSession) {
        const { config, ball } = session.gameState;
        ball.x = config.width / 2;
        ball.y = config.height / 2;
        ball.dx *= -1; 
        ball.dy = (Math.random() > 0.5 ? 1 : -1) * GAME_CONSTANTS.BALL_SPEED; 
    }

    private broadcastState(session: GameSession) {
        const updateMsg = JSON.stringify({
            event: 'GAME_UPDATE',
            data: session.gameState
        });
        session.socketP1?.send(updateMsg);
        session.socketP2?.send(updateMsg);
    }
    
    
    // 
    private endGame(matchId: string, winnerId: string) {
        const session = this.activeMatches.get(matchId);
        if (!session) return;

		// 1. Detener el bucle de juego (Game Loop)
		// Si no paramos el intervalo, el servidor seguiría calculando 
		// la física de una partida terminada, consumiendo CPU inútilmente.
        if (session.loopId) {
            clearInterval(session.loopId);
            session.loopId = null;
        }
        
		// 2. Actualizar estado y recuperar puntuaciones finales
		// El as any es un "truco" temporal porque el tipo GameState 
		// en shared podría no tener actualizado el estado 'FINISHED' todavía.
        (session.gameState.status as any) = 'FINISHED';
        const p1Score = session.gameState.player1.score;
        const p2Score = session.gameState.player2.score;

        console.log(`🏆 GAME OVER. Winner: ${winnerId} | Score: ${p1Score}-${p2Score}`);

        // 3. PERSISTENCIA: Guardar resultado en Base de Datos 
		// (llama al repo para escribir quien gano y demas datos).
		// Importante: Hacer esto ANTES de borrar la sesión de memoria.
		// Esta envuelto en un try-catch por si la base de datos falla que 
		// no se caiga el servidor (loguea el error y continua para cerrar 
		// la conexion de los clientes limpiamente).
        try {
            this.matchRepo.finishMatch(
                matchId, 
                winnerId, 
                p1Score, 
                p2Score, 
                Date.now()
            );
            console.log('✅ Resultado guardado en DB');
        } catch (error) {
            console.error('❌ Error guardando resultado en DB:', error);
        }

        // 4. Notificar a los clientes vía WebSocket
        const endMsg = JSON.stringify({
            event: 'GAME_OVER',
            data: { 
                winnerId: winnerId,
                reason: 'SCORE_LIMIT_REACHED'
            }
        });

		// Usamos try-catch individual por si un socket ya se cerró abruptamente
		// Con el '?': si el socketP1 existe llama a send(), sino no hace nada. 
		// Evita errores si un jugador se desconectó antes de ganar.
        try { session.socketP1?.send(endMsg); } catch(e) {}
        try { session.socketP2?.send(endMsg); } catch(e) {}
        
        // 5. Eliminamos la session del Map en memoria RAM (para evitar leaks y/o colapso de server)
        this.activeMatches.delete(matchId);
    }
    
    // -------------------------------------------------------------------
    // PROCESADO DE LOS INPUTS (ASYNC)
    // -------------------------------------------------------------------
    public async processInput(matchId: string, userId: string, message: Buffer | string): Promise<void> {
        const session = this.activeMatches.get(matchId);
        if (!session) return;

        const msgString = message.toString();
        let payload: any;
        try {
            payload = JSON.parse(msgString);
        } catch (e) {
            console.error('❌ JSON inválido recibido');
            return;
        }

		//VALIDACION DE INPUTS. SEGURIDAD.
		// Si el userId no coincide con ninguno de los jugadores
		//  de la sesión, aborto la ejecución silenciosamente.

        // Si ya tenemos los IDs en la sesión, NO hace falta ir a DB.
        // Optimizamos usando la caché de sesión.
        let playerPaddle = null;
        
        if (session.player1Id === userId) {
            playerPaddle = session.gameState.player1;
        } else if (session.player2Id === userId) {
            playerPaddle = session.gameState.player2;
        } else {
            return; 
        }

        const { height, paddleHeight } = session.gameState.config;
        
        switch (payload.action) {
            case 'MOVE_UP':
                playerPaddle.y = Math.max(0, playerPaddle.y - GAME_CONSTANTS.PADDLE_SPEED);
                break;
            case 'MOVE_DOWN':
                playerPaddle.y = Math.min(height - paddleHeight, playerPaddle.y + GAME_CONSTANTS.PADDLE_SPEED);
                break;
            //case 'PAUSE_TOGGLE':
            //    this.togglePause(session);
            //    break;
        }
    }

/*
    private togglePause(session: GameSession) {
        if (session.gameState.status === 'PLAYING') {
            session.gameState.status = 'PAUSED';
        } else if (session.gameState.status === 'PAUSED') {
            session.gameState.status = 'PLAYING';
        }
    }
*/
	
}