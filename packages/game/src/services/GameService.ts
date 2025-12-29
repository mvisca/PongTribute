//TIENE EL MAPA DE PARTIDAS ACTIVAS, ES LLAMADO POR GameGateway 
// CUANDO HAY UNA CONEXION O DESCONEXION DE WEBSOCKET

import { WebSocket } from 'ws';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { GameState } from '@transcendence/shared'; 
// Asegúrate de que 'GameState' esté exportado en tu shared, si no, usa 'any' temporalmente hasta arreglarlo.


// 1. INTERFAZ INTERNA DE SESIÓN (es priada del servicio)
// Esto guarda lo que está pasando en memoria RAM ahora mismo.
interface GameSession {
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
    // AUXILIAR: START GAME LOOP (Placeholder)
    // -------------------------------------------------------------------
    private startGameLoop(matchId: string) {
        const session = this.activeMatches.get(matchId);
        if (!session) return;

        session.gameState.status = 'PLAYING';

        // BUCLE DEL JUEGO: 60 FPS (aprox 16ms)
        session.loopId = setInterval(() => {
            // AQUI IRÁ LA FÍSICA (Mover bola, colisiones)
            // this.updatePhysics(session.gameState);
            
            // EMITIR ESTADO A AMBOS
            const updateMsg = JSON.stringify({
                event: 'GAME_UPDATE',
                data: session.gameState
            });

            session.socketP1?.send(updateMsg);
            session.socketP2?.send(updateMsg);

        }, 1000 / 60); 
    }

    // -------------------------------------------------------------------
    // AUXILIAR: ESTADO INICIAL
    // -------------------------------------------------------------------
    private createInitialState(matchId: string): GameState {
        return {
            id: matchId,
			status: 'WAITING',
			// las dimensiones definitivas las decidiremos mas tarde
            config: {
                width: 800,
                height: 600,
                paddleWidth: 10,
                paddleHeight: 100,
                ballRadius: 10
            },
            player1: { x: 10, y: 250, score: 0 },
            player2: { x: 780, y: 250, score: 0 },
            ball: { x: 400, y: 300, dx: 5, dy: 5 } //bola al centro
        };
    }
}