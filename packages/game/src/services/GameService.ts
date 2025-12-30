//CREA y MANEJA EL MAPA DE PARTIDAS ACTIVAS: ES LLAMADO POR GameGateway 
// CUANDO HAY UNA CONEXION O DESCONEXION DE WEBSOCKET

import { WebSocket } from 'ws';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { GameState, GAME_CONSTANTS } from '@transcendence/shared'; 


// 1. INTERFAZ INTERNA DE SESIÓN (es privada del servicio)
// Esto guarda lo que está pasando en memoria RAM ahora mismo.
interface GameSession {
	matchId: string;
	player1Id: string;
	player2Id: string;
    socketP1: WebSocket | null; //usamos null porque al principio solo 1 jugador esta conectado
    socketP2: WebSocket | null;
    gameState: GameState; // El objeto con x, y, score, etc.
    loopId: NodeJS.Timeout | null; // El ID del setInterval para poder pararlo
}

export class GameService {
	// Mapa: Clave = matchId (string), Valor = Sesión
	//El map es instantaneo con get(), en cambio un array hay que iterarlo con find() 
    private activeMatches: Map<string, GameSession> = new Map();

    constructor(private matchRepo: MatchRepository) {}

    // -------------------------------------------------------------------
    // MÉTODO: UNIRSE A PARTIDA
    // -------------------------------------------------------------------
    public joinMatch(matchId: string, userId: string, socket: WebSocket): void {
		console.log(`🔌 Usuario ${userId} intentando unirse a partida ${matchId}`);
		
        // 1. Recuperar o Crear Sesión en Memoria
        let session = this.activeMatches.get(matchId);
		
        if (!session) {
			console.log(`✨ Creando nueva sesión en memoria para ${matchId}`);
            // Si no existe en RAM, inicializamos el estado base (bola al centro, 0-0)
			session = {
				matchId: matchId,
				player1Id: match.player1Id,
				player2Id: match.player2Id,
				socketP1: null,
                socketP2: null,
                gameState: this.createInitialState(matchId),
                loopId: null
			};
			//Meto el elemento (key:matchId, value:session) en el map activeMatches
            this.activeMatches.set(matchId, session);
        }
		
        // 2. Verificar Identidad con la Base de Datos
        // Consultamos la DB para saber quién es P1 y quién es P2 realmente.
        const matchFromDb = this.matchRepo.findById(matchId); 
		
        if (!matchFromDb) {
            socket.close(1008, 'Match not found in DB');
            return;
        }
		
        // 3. Asignar Socket al hueco correcto
        // Convertimos a string para asegurar comparación segura
        if (String(matchFromDb.player1_id) === userId) {
			session.socketP1 = socket;
            console.log('✅ Player 1 conectado');
        } else if (String(matchFromDb.player2_id) === userId) {
			session.socketP2 = socket;
            console.log('✅ Player 2 conectado');
        } else {
			console.log('⛔ Usuario no autorizado en esta partida');
            socket.close(1008, 'Not a player in this match');
            return;
        }

        // 4. Comprobar si ambos están listos
        if (session.socketP1 && session.socketP2) {
			console.log('🚀 AMBOS JUGADORES CONECTADOS. INICIANDO JUEGO...');
            this.startGameLoop(matchId);
        }
	}
	

	// -------------------------------------------------------------------
	// AUXILIAR: ESTADO INICIAL
	// -------------------------------------------------------------------
	private createInitialState(matchId: string): GameState {

		const WALL_MARGIN = 10; //defino el margen pala-lateral de cancha

		return {
			id: matchId,
			status: 'WAITING',
			// las dimensiones estan en shared/constants/game.constants
			config: {
				width: GAME_CONSTANTS.COURT_WIDTH,
				height: GAME_CONSTANTS.COURT_HEIGHT,
				paddleWidth: GAME_CONSTANTS.PADDLE_WIDTH,
				paddleHeight: GAME_CONSTANTS.PADDLE_HEIGHT,
				ballRadius: GAME_CONSTANTS.BALL_SIZE
			},
			player1: { 
            x: WALL_MARGIN, 
            // Fórmula de centrado: (Alto Pista / 2) - (Alto Pala / 2)
            y: (GAME_CONSTANTS.COURT_HEIGHT / 2) - (GAME_CONSTANTS.PADDLE_HEIGHT / 2), 
            score: 0 
			},
			player2: { 
				// Fórmula P2: Ancho Total - Margen - Ancho Pala
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
    // MÉTODO: MANEJAR DESCONEXIÓN (Win by Abandon)
    // -------------------------------------------------------------------
    public handleDisconnect(userId: string, matchId: string): void {
        const session = this.activeMatches.get(matchId);
        if (!session) return; // Si no hay sesión, no hay nada que hacer

        console.log(`⚠️ Jugador ${userId} desconectado de ${matchId}`);

        // 1. Identificar quién se fue y quién gana
        // userId es el que se desconectó.
        let winnerSocket: WebSocket | null = null;
        let winnerId: string | null = null;

        // Necesitamos saber los IDs de usuario originales para guardar en DB
        const matchFromDb = this.matchRepo.findById(matchId);
        if (!matchFromDb) return;

		//convierto a string porque en la DB SQL los ID suelen ser numeros,
		//aunque nosotros usamos los uuid y creo que ya son strings
        if (String(matchFromDb.player1_id) === userId) {
            // Se fue P1, gana P2
            winnerSocket = session.socketP2;
            winnerId = matchFromDb.player2_id;
        } else {
            // Se fue P2, gana P1
            winnerSocket = session.socketP1;
            winnerId = matchFromDb.player1_id;
        }

        // 2. Notificar al ganador (si sigue conectado, por que si no lo esta
		// el servidor podria caerse intentando enviar los datos al socket)
        if (winnerSocket && winnerSocket.readyState === WebSocket.OPEN) {
            winnerSocket.send(JSON.stringify({
                event: 'GAME_OVER',
                data: {
                    reason: 'OPPONENT_DISCONNECTED',
                    message: '¡Tu rival se ha desconectado! Ganas por abandono.'
                }
            }));
        }

        // 3. Detener Game Loop
        if (session.loopId) {
            clearInterval(session.loopId);
        }

        // 4. Actualizar DB (Repo)
        if (winnerId) {
            // finishMatch(id, winnerId, p1Score, p2Score, finishedAt)
            // Asumimos 5-0 por abandono
            this.matchRepo.finishMatch(matchId, winnerId, 5, 0, Date.now());
            console.log(`🏆 Partida guardada. Ganador: ${winnerId}`);
        }

        // 5. Limpiar memoria
        this.activeMatches.delete(matchId);
    }

    // -------------------------------------------------------------------
    // AUXILIAR: START GAME LOOP
    // -------------------------------------------------------------------
    private startGameLoop(matchId: string) {
        const session = this.activeMatches.get(matchId);
        if (!session) return;

        session.gameState.status = 'PLAYING';

		// AQUI LA FÍSICA (Mover bola, colisiones)
        // BUCLE DEL JUEGO: 60 FPS (1000ms / 60 =  aprox 16ms)
		session.loopId = setInterval(() => {
			// --- VÁLVULA DE SEGURIDAD ---
            // Si el estado ya es FINISHED, paramos el intervalo y salimos.
            // Esto corrige el bug de los puntos infinitos si clearInterval falla.
            if (session.gameState.status === 'FINISHED') {
                if (session.loopId) clearInterval(session.loopId);
                return;
            }
            // ----------------------------
			// 1. Si está pausado, no calculamos nada, solo enviamos estado (o ni eso)
            if (session.gameState.status === 'PAUSED') {
                 // Enviamos para que el cliente sepa que está PAUSED
                 this.broadcastState(session);
                 return;
            }

            // 2. Calcular nueva posición de la bola
            this.updatePhysics(session);

            // 3. Comprobar si alguien ganó (Score limit)
           // Si updatePhysics terminó el juego, no enviamos update
            if (session.gameState.status === 'FINISHED') return;

            // 4. Enviar estado a los clientes
            this.broadcastState(session);

		}, 1000 / GAME_CONSTANTS.FPS);
    }

	// -------------------------------------------------------------------
    // LA LOGICA FISICA + PUNTUACION
    // -------------------------------------------------------------------

	private updatePhysics(session: GameSession) {
        const { ball, config, player1, player2 } = session.gameState;

		//creo una constante para el radio de la bola
		const r = config.ballRadius;

        // Mover bola
        ball.x += ball.dx;
        ball.y += ball.dy;

        // 1. Rebote Arriba/Abajo
        if (ball.y - r < 0 || ball.y + r > config.height) {
            ball.dy *= -1; // Invertir dirección vertical
        }

        // 2. Colisión con Palas (Simplificado AABB - Axis Aligned Bounding Box)
        // Jugador 1 (Izquierda)
        // Si la bola está en la zona X de la pala Y coincide en la zona Y de la pala...
        if (ball.x - r < player1.x + config.paddleWidth && 
            ball.y > player1.y && ball.y < player1.y + config.paddleHeight) {
                ball.dx *= -1; // Rebote horizontal
                // Truco: empujar la bola un poco para que no se quede atrapada dentro de la pala
                ball.x = player1.x + config.paddleWidth + r + 1; 
        }

        // Jugador 2 (Derecha)
        if (ball.x + r > player2.x && 
            ball.y > player2.y && ball.y < player2.y + config.paddleHeight) {
                ball.dx *= -1;
                ball.x = player2.x - r - 1;
        }

		const WIN_SCORE = 3; // TODO: de momento hardcodeado para el test

        // 3. PUNTUACION (Salirse por los lados)
        // CASO A: Bola sale por la izquierda (Punto para P2)
        if (ball.x < 0) {
            session.gameState.player2.score++;

            // Verificamos victoria INMEDIATAMENTE
            if (session.gameState.player2.score >= WIN_SCORE) {
                this.endGame(session.matchId, session.player2Id);
                return; // Cortamos la física aquí
            }

            this.resetBall(session);
        } 
        // CASO B: Bola sale por la derecha (Punto para P1)
        else if (ball.x > session.gameState.config.width) {
            session.gameState.player1.score++;

            // Verificamos victoria INMEDIATAMENTE
            if (session.gameState.player1.score >= WIN_SCORE) {
                this.endGame(session.matchId, session.player1Id);
                return; // Cortamos la física aquí
            }

            this.resetBall(session); // Esto solo ocurre si NO gana
        }
    }

    private resetBall(session: GameSession) {
        const { config, ball } = session.gameState;
        ball.x = config.width / 2;
        ball.y = config.height / 2;
        ball.dx *= -1; // Saque para el que recibió el punto (o random)
        ball.dy = (Math.random() > 0.5 ? 1 : -1) * GAME_CONSTANTS.BALL_SPEED; // Un poco de aleatoriedad
    }

    private broadcastState(session: GameSession) {
        const updateMsg = JSON.stringify({
            event: 'GAME_UPDATE',
            data: session.gameState
        });
        session.socketP1?.send(updateMsg);
        session.socketP2?.send(updateMsg);
	}
	
	private endGame(matchId: string, winnerId: string) {
        const session = this.activeMatches.get(matchId);
        if (!session) return;

        // 1. Marcar estado INMEDIATAMENTE para activar la válvula de seguridad
        session.gameState.status = 'FINISHED';

        // 2. Detener el bucle explícitamente
        if (session.loopId) {
            clearInterval(session.loopId);
            session.loopId = null; // Evitar dobles llamadas
        }
        
        // AHORA SÍ funcionará porque los añadimos a la interfaz
        const p1Score = session.gameState.player1.score;
        const p2Score = session.gameState.player2.score;

        console.log(`🏆 GAME OVER. Winner: ${winnerId} | Score: ${p1Score}-${p2Score}`);

        // 3. Notificar a los clientes
        const endMsg = JSON.stringify({
            event: 'GAME_OVER',
            data: { 
                winnerId: winnerId,
                reason: 'SCORE_LIMIT_REACHED'
            }
        });
        
        // Usar try-catch al enviar por si el socket ya se cerró
        try { session.socketP1?.send(endMsg); } catch(e) {}
        try { session.socketP2?.send(endMsg); } catch(e) {}
        
        // 4. Limpiar sesión (Importante para liberar memoria)
		this.activeMatches.delete(matchId);
		
        // TODO: 4. Guardar en DB y limpiar memoria (Lo haremos después)
        // this.matchRepository.saveResult(...)
        // this.activeMatches.delete(matchId); 
	}
	

	// -------------------------------------------------------------------
    // PROCESADO DE LOS INPUTS (Teclas del keyboard que mueven las palas)
    // -------------------------------------------------------------------

	// Velocidad de la pala (píxeles por actualización o por evento)
    private readonly PADDLE_SPEED = GAME_CONSTANTS.PADDLE_SPEED; 

    public processInput(matchId: string, userId: string, message: Buffer | string): void {
        const session = this.activeMatches.get(matchId);
        if (!session) return;

        // 1. Parsear el Input
        // Los WebSockets a veces envían Buffer, aseguramos conversión a String
        const msgString = message.toString();
        let payload: any;
        try {
            payload = JSON.parse(msgString);
        } catch (e) {
            console.error('❌ JSON inválido recibido');
            return;
        }

        // 2. Identificar Jugador
        // Usamos referencias cortas para no repetir código (Punteros)
        let playerPaddle = null;
        const matchFromDb = this.matchRepo.findById(matchId);
        if (!matchFromDb) return;

        if (String(matchFromDb.player1_id) === userId) {
            playerPaddle = session.gameState.player1;
        } else if (String(matchFromDb.player2_id) === userId) {
            playerPaddle = session.gameState.player2;
        } else {
            return; // Es un espectador o hacker, ignorar
        }

        // 3. Ejecutar Acción
        const { height, paddleHeight } = session.gameState.config;
        
        switch (payload.action) {
			case 'MOVE_UP':
				// Evita que la pala suba más allá del techo (coordenada 0). 
				// Si la resta da -20, se queda en 0.
                playerPaddle.y = Math.max(0, playerPaddle.y - this.PADDLE_SPEED);
                break;
			case 'MOVE_DOWN':
				//Evita que la pala baje más allá del suelo.
                // La coordenada Y crece hacia ABAJO.
                // Límite inferior = Alto Tablero - Alto Pala
                playerPaddle.y = Math.min(height - paddleHeight, playerPaddle.y + this.PADDLE_SPEED);
                break;
            case 'PAUSE_TOGGLE':
                // Requisito: Pausa
                this.togglePause(session);
                break;
        }
    }

    private togglePause(session: GameSession) {
        if (session.gameState.status === 'PLAYING') {
            session.gameState.status = 'PAUSED';
            // Opcional: Detener el intervalo si quieres ahorrar CPU, 
            // o dejarlo corriendo y que el updatePhysics no haga nada.
            // Por simplicidad pedagógica, solo cambiamos el flag.
        } else if (session.gameState.status === 'PAUSED') {
            session.gameState.status = 'PLAYING';
        }
    }




}