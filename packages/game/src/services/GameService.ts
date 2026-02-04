//CREA y MANEJA EL MAPA DE PARTIDAS ACTIVAS: ES LLAMADO POR GameGateway 
// CUANDO HAY UNA CONEXION O DESCONEXION DE WEBSOCKET

import { WebSocket } from 'ws';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { GameState, GAME_CONSTANTS, SOCKET_EVENTS } from '@transcendence/shared'; 

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

	// Este map es como una sala de espera de la muerte (15 sec).
	// Guarda el ID del timeout asociado a cada partida.
	// Si el usuario vuelve busco aqui para cancelar la ejecución
	private disconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

    constructor(private matchRepo: MatchRepository) {}

    // -------------------------------------------------------------------
    // UNIRSE O RECONECTARSE A PARTIDA
    // -------------------------------------------------------------------
    public async joinMatch(matchId: string, userId: string, socket: WebSocket): Promise<void> {
        console.log(`🔌 Usuario ${userId} intentando unirse a partida ${matchId}`);
        
        // 1. Recuperar Sesión en Memoria
        let session = this.activeMatches.get(matchId);
        
        // SI NO EXISTE EN MEMORIA, LA CREAMOS.
		// Buscamos en DB para obtener los datos necesarios para crearla (IDs de jugadores).
        if (!session) {
            console.log(`✨ Buscando datos en DB para crear sesión ${matchId}...`);
            
            // Usamos AWAIT porque la DB es asíncrona
            const matchFromDb = await this.matchRepo.findById(matchId);

            if (!matchFromDb) {
                socket.close(1008, 'Match not found in DB');
                return;
            }

			// Si la partida ya acabó en DB, rechazamos
            if (matchFromDb.status === 'finished') {
                 socket.close(1008, 'Match already finished');
                 return;
			}

            // AHORA ya tenemos los datos para crear la sesión correctamente
            session = {
                matchId: matchId,
                player1Id: String(matchFromDb.player1_id), // Convertimos a string por seguridad
                player2Id: String(matchFromDb.player2_id),
                socketP1: null,
                socketP2: null,
                gameState: this.createInitialState(matchId, matchFromDb.target_score || 11),
                loopId: null
            };

            // Guardamos en memoria
            this.activeMatches.set(matchId, session);
        }
        
		// ASIGNAR SOCKET Y GESTIONAR LA RECONEXION
        // Verificamos si es P1 o P2
        const isPlayer1 = session.player1Id === userId;
        const isPlayer2 = session.player2Id === userId;

        if (!isPlayer1 && !isPlayer2) {
            socket.close(1008, 'Not a player in this match');
            return;
        }

        // Actualizamos el socket correspondiente
        if (isPlayer1) session.socketP1 = socket;
        else session.socketP2 = socket;

		console.log(`✅ Player ${isPlayer1 ? '1' : '2'} conectado/reconectado`);

		// LÓGICA DE RECONEXIÓN
		// Detecta que no es una partida nueva, sino una que estaba congelada.
        if (session.gameState.status === 'PAUSED') {
            console.log(`♻️ RECONEXIÓN DETECTADA en partida ${matchId}`);
            
            // 1. Cancela la ejecucion del "Timeout de la Muerte"
            const timer = this.disconnectTimeouts.get(matchId);
            if (timer) {
                clearTimeout(timer);
                this.disconnectTimeouts.delete(matchId);
            }

            // 2. Notificar al rival que volvimos
            const rivalSocket = isPlayer1 ? session.socketP2 : session.socketP1;
            rivalSocket?.send(JSON.stringify({ event: SOCKET_EVENTS.GAME_OPPONENT_RECONNECTED }));

			// Enviar estado visual AL INSTANTE (Evita pantallazo congelado en negro)
            socket.send(JSON.stringify({
                event: SOCKET_EVENTS.GAME_UPDATE,
                data: session.gameState
			}));
			
            // 3. Reanudar juego inmediatamente
            this.startGameLoop(matchId);
		}

		// LÓGICA DE INICIO NORMAL (Ambos conectados por primera vez)
        else if (session.socketP1 && session.socketP2 && session.gameState.status === 'WAITING') {
            console.log('🚀 AMBOS JUGADORES LISTOS. INICIANDO...');
            this.startGameLoop(matchId);
        }
    }
    
	
    // -------------------------------------------------------------------
    // MANEJAR DESCONEXIÓN
    // -------------------------------------------------------------------
    public async handleDisconnect(userId: string, matchId?: string): Promise<void> {
		// 1. Si no nos dan matchId, lo buscamos nosotros
        const targetMatchId = matchId || this.findMatchIdByUserId(userId);

        // Si no encontramos partida para este usuario, no hay nada que pausar
        if (!targetMatchId) return;

        const session = this.activeMatches.get(targetMatchId);
        // Si ya no existe o terminó, adiós
        if (!session || session.gameState.status === 'FINISHED') return;

        console.log(`⚠️ Jugador ${userId} desconectado. PAUSANDO partida ${targetMatchId}...`);

        // 1. Pausar el Loop de Juego (Congelar bola)
        if (session.loopId) {
			clearInterval(session.loopId);
            session.loopId = null; // Es CRITICO para detener el loop fisico (que no se mueva la bola)
        }
        session.gameState.status = 'PAUSED';
		
        // 2. Identificar quién se fue y quién queda
        const isPlayer1Gone = session.player1Id === userId;
        const rivalSocket = isPlayer1Gone ? session.socketP2 : session.socketP1;
		
        // 3. Notificar al rival: "Tu oponente se fue, espera 15s"
        rivalSocket?.send(JSON.stringify({ 
			event: SOCKET_EVENTS.GAME_OPPONENT_DISCONNECTED, 
            data: { timeout: 15 } 
        }));
		
		// 4. Iniciar "Cuenta Atrás de la Muerte" (15 sec)
		//Programamos una función anónima para que se ejecute en el futuro. 
		// Si nadie la cancela antes, matará la partida llamando a forfeitMatch.
        const timeoutId = setTimeout(() => {
			console.log(`💀 TIEMPO AGOTADO para ${targetMatchId}. Finalizando por abandono.`);
            this.forfeitMatch(targetMatchId, userId);
        }, 15000); // 15 segundos
		
        this.disconnectTimeouts.set(targetMatchId, timeoutId);
    }
	
	// -------------------------------------------------------------------
    // FINALIZAR POR ABANDONO (Privado)
    // -------------------------------------------------------------------
    private async forfeitMatch(matchId: string, loserId: string) {
		const session = this.activeMatches.get(matchId);
        if (!session) return;
		
        // Limpieza de timeout del mapa
        this.disconnectTimeouts.delete(matchId);
		
        // Determinar ganador
        const winnerId = (session.player1Id === loserId) ? session.player2Id : session.player1Id;
        const winnerSocket = (session.player1Id === loserId) ? session.socketP2 : session.socketP1;
		
        // Notificar victoria
        winnerSocket?.send(JSON.stringify({
			event: SOCKET_EVENTS.GAME_OVER,
            data: {
				reason: 'OPPONENT_DISCONNECTED',
                winnerId: winnerId,
                message: '¡Tu rival no volvió! Ganas por abandono.'
            }
        }));
		
        // 3. CALCULAR SCORE DINÁMICO
        // El ganador obtiene la puntuación objetivo de la sesión (sea 5, 11 o 21).
        // El perdedor se queda con lo que tenía.
        const p1Score = (session.player1Id === winnerId) ? session.gameState.targetScore : session.gameState.player1.score;
        const p2Score = (session.player2Id === winnerId) ? session.gameState.targetScore : session.gameState.player2.score;
		
        try {
			// Guardar en DB
			await this.matchRepo.finishMatch(matchId, winnerId, p1Score, p2Score, Date.now()); 
            console.log(`🏆 Partida ${matchId} cerrada por Forfeit. Score: ${p1Score}-${p2Score}`);
        } catch (e) {
			console.error('❌ Error guardando forfeit en DB:', e);
        }
		
        // Limpiar memoria
        this.activeMatches.delete(matchId);
	}
	

	// -------------------------------------------------------------------
	// AUXILIAR: ESTADO INICIAL
	// -------------------------------------------------------------------
	private createInitialState(matchId: string, targetScore: number): GameState {
		const WALL_MARGIN = 10; 

		return {
			id: matchId,
			status: 'WAITING',
			targetScore: targetScore,
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
    // AUXILIAR: START GAME LOOP
    // -------------------------------------------------------------------
    private startGameLoop(matchId: string) {
        const session = this.activeMatches.get(matchId);
        if (!session) return;

        session.gameState.status = 'PLAYING';

        // Aseguramos que no haya un loop previo corriendo
        if (session.loopId) clearInterval(session.loopId);

        session.loopId = setInterval(() => {
            if (session.gameState.status !== 'PLAYING') return;

            this.updatePhysics(session);
            
            // Si el juego terminó dentro de updatePhysics, paramos
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

		const winScore = session.gameState.targetScore;
		
        // PUNTUACION
        if (ball.x < 0) {
            session.gameState.player2.score++;
            if (session.gameState.player2.score >= winScore) {
                this.endGame(session.matchId, session.player2Id);
                return; 
            }
            this.resetBall(session);
        } else if (ball.x > session.gameState.config.width) {
            session.gameState.player1.score++;
            if (session.gameState.player1.score >= winScore) {
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
            event: SOCKET_EVENTS.GAME_UPDATE,
            data: session.gameState
        });
        // IMPORTANTE: Verificar que el socket esté abierto antes de enviar
        if (session.socketP1?.readyState === WebSocket.OPEN) session.socketP1.send(updateMsg);
        if (session.socketP2?.readyState === WebSocket.OPEN) session.socketP2.send(updateMsg);
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
		(session.gameState.status) = 'FINISHED';
		
		// Limpiar posible timeout de desconexión si existiera (edge case)
        if (this.disconnectTimeouts.has(matchId)) {
            clearTimeout(this.disconnectTimeouts.get(matchId)!);
            this.disconnectTimeouts.delete(matchId);
		}
		
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
            event: SOCKET_EVENTS.GAME_OVER,
            data: { 
                winnerId: winnerId,
                reason: 'SCORE_LIMIT_REACHED'
            }
        });

		if (session.socketP1?.readyState === WebSocket.OPEN) session.socketP1.send(endMsg);
        if (session.socketP2?.readyState === WebSocket.OPEN) session.socketP2.send(endMsg);

        // 5. Eliminamos la session del Map en memoria RAM (para evitar leaks y/o colapso de server)
        this.activeMatches.delete(matchId);
    }
    
    // -------------------------------------------------------------------
    // PROCESADO DE LOS INPUTS (ASYNC)
    // -------------------------------------------------------------------
    public async processInput(matchId: string, userId: string, message: Buffer | string): Promise<void> {
        const session = this.activeMatches.get(matchId);
        
		if (!session || session.gameState.status !== 'PLAYING') return; // Bloquear inputs si el juego está PAUSED

        const msgString = message.toString();
        let payload: any;
        try {
            payload = JSON.parse(msgString);
        } catch (e) {
            console.error('❌ JSON inválido recibido');
            return;
        }

		let playerPaddle = (session.player1Id === userId) ? session.gameState.player1 
                          : (session.player2Id === userId) ? session.gameState.player2 
                          : null;
        
         if (!playerPaddle) return;
        

        const { height, paddleHeight } = session.gameState.config;
        
        switch (payload.action) {
            case 'MOVE_UP':
                playerPaddle.y = Math.max(0, playerPaddle.y - GAME_CONSTANTS.PADDLE_SPEED);
                break;
            case 'MOVE_DOWN':
                playerPaddle.y = Math.min(height - paddleHeight, playerPaddle.y + GAME_CONSTANTS.PADDLE_SPEED);
                break;
        }
	}
	
	// -------------------------------------------------------------------
    // NUEVO: Método auxiliar para buscar partida por ID de usuario
    // -------------------------------------------------------------------
    private findMatchIdByUserId(userId: string): string | undefined {
        for (const [matchId, session] of this.activeMatches) {
            if (session.player1Id === userId || session.player2Id === userId) {
                return matchId;
            }
        }
        return undefined;
	}
	


}