import { MatchRepository } from '../repositories/MatchRepository.js';
import { MatchMapper } from '../mappers/MatchMapper.js';
import { redisClient } from '../app.js'; 
import { MatchTypes, Utils } from '@transcendence/shared';

export type JoinQueueResponse = 
    | { outcome: 'match_found'; match: MatchTypes.Match }
    | { outcome: 'added_to_queue' };

export class MatchService {
    private matchRepo: MatchRepository;

    constructor() {
        this.matchRepo = new MatchRepository();
    }

    async joinPublicQueue(userId: string): Promise<JoinQueueResponse> {
        // Validación de seguridad por si el servidor arrancó mal
        if (!redisClient) throw new Error('Redis client not initialized');

        const QUEUE_KEY = 'match:queue:public';

        // 1. Lógica FIFO en Redis
        const opponentId = await redisClient.lpop(QUEUE_KEY);

        if (opponentId && opponentId !== userId) {
            // --- MATCH ENCONTRADO ---

            // a. Persistir en DB (Devuelve Row cruda)
            const matchRow = await this.matchRepo.createPublicMatch(opponentId, userId);

            // b. Mapear a Objeto de Dominio (Aquí usamos tu Mapper)
            const matchDomain = MatchMapper.toDomain(matchRow);

            // c. Notificar eventos (Enviamos el objeto limpio, no el de DB)
            await redisClient.publish('game_events', JSON.stringify({
                type: 'match.found',
                payload: {
                    matchId: matchDomain.id,
                    opponentId: userId, // Avisamos al que estaba esperando
                    match: matchDomain
                }
            }));

            // d. Retornar al Controller
            return { outcome: 'match_found', match: matchDomain };

        } else {
            // --- A LA COLA ---
            
            // Si por error me saqué a mí mismo, me ignoro.
            if (opponentId && opponentId === userId) {
                 // log de warning opcional
            }

            await redisClient.rpush(QUEUE_KEY, userId);
            return { outcome: 'added_to_queue' };
        }
    }

    async createPrivateMatch(userId: string, opponentId: string): Promise<MatchTypes.Match> {
        if (!redisClient) throw new Error('Redis client not initialized');

        if (userId === opponentId) {
            throw new Error("No puedes desafiarte a ti mismo");
        }

        // 1. Crear en DB (Status PENDING)
        const matchRow = await this.matchRepo.createPrivateMatch(userId, opponentId);

        // 2. Mapear
        const matchDomain = MatchMapper.toDomain(matchRow);

        // 3. Notificar invitación
        await redisClient.publish('game_events', JSON.stringify({
            type: 'match.invite',
            targetUserId: opponentId,
            payload: matchDomain
        }));

        return matchDomain;
    }
}


//===================CODIGO DESFASADO===================//

// export class MatchService {
//     // Instanciamos el repo para poder hablar con la DB
//     private matchRepo = new MatchRepository();

//     /**
//      * Lógica principal de Matchmaking (FIFO):
//      * 1. Busca si hay alguien esperando.
//      * 2. Si hay, te une a su partida.
//      * 3. Si no, crea una nueva y te pone a esperar.
//      */
//     async joinOrCreate(userId: string, opponentId: string | undefined): Promise<MatchTypes.Match> {
        
// 		// SI ES UN MATCHMAKING PRIVADO CON UN OPONENTE FRIEND
// 		if (opponentId) {

// 			//Proteccion
// 			if (userId === opponentId) {
// 				throw new Error("No puedes desafiarte a ti mismo");
// 			}

// 			// PASO 1:Crear nueva partida
// 			const newMatchId = Utils.generateMatchId(); //genera un UUID
// 			const now = Date.now();

// 			//Creo un Literal Object newRow con los datos crudos para SQL
// 			//Es la forma standard en TypeScript de preparar un objeto (DTO) para la BD
// 			const newRow: MatchTypes.MatchRow = {
// 				id: newMatchId,
// 				status: 'pending',  //aun pending hasta que oponente acepte el reto
// 				player1_id: userId,
// 				player1_score: 0,
// 				player2_id: opponentId, //seteamos el rival
// 				player2_score: 0,	
// 				winner_id: null,
// 				created_at: now,
// 				finished_at: null
// 			};

// 			// Guardamos en DB
// 			//'create' pasa los datos del Literal Object a formato SQL y los injecta en la DB
// 			this.matchRepo.create(newRow);

// 			// Devolvemos un objeto limpio al cliente (que con el mapper hemos traducido desde una sentencia SQL)
// 			return MatchMapper.toDomain(newRow);
// 		}

// 		// SI ES UN MATCHMAKING PUBLICO FIFO)
// 		else {
		
// 			// PASO 1: Buscar partida pendiente
// 			// Pregunta al Repo: "¿Hay alguna partida 'pending' a la que le falte el player2?"
// 			// (Veremos el Repo en el siguiente paso, pero imagina que devuelve una fila de SQL o null)
// 			const pendingRow = this.matchRepo.findPendingPublicMatch();

// 			// PASO 2: Unirse a existente
// 			// Condición: Que exista Y que yo no sea el Player 1 (no jugar contra mí mismo)
// 			if (pendingRow && pendingRow.player1_id !== userId) {
				
// 				// --- RAMA 1: UNIRSE A PARTIDA EXISTENTE ---

// 				// a) Actualizamos la DB (poner mi ID en player2_id y cambiar status a 'active')
// 				this.matchRepo.joinMatch(pendingRow.id, userId);
				
// 				// b) Recuperamos la fila actualizada para devolver el estado real final
// 				const updatedRow = this.matchRepo.findById(pendingRow.id);
				
// 				if (!updatedRow) {
// 					throw new Error("Error crítico: La partida ha desaparecido tras unirse.");
// 				}

// 				// c) TRADUCCIÓN (mapper): Convertimos la fila de SQL a un objeto de API
// 				//El Mapper (MatchMapper): Es el traductor. La DB habla snake_case 
// 				// (player1_id), pero nuestro frontend espera camelCase (player1: { userId: ... }). El Mapper hace ese puente al final de cada rama.
// 				return MatchMapper.toDomain(updatedRow);
// 			}

// 			// --- RAMA 2: CREAR PARTIDA EXISTENTE ---

// 			// PASO 3: Crear nueva partida (si no había nadie esperando)
// 			const newMatchId = Utils.generateMatchId(); //genera un UUID
// 			const now = Date.now();

// 			// Preparamos los datos crudos para SQL (MatchRow)
// 			//creo un Literal Object newRow con los datos
// 			//Es la forma standard en TypeScript de preparar un objeto (DTO) para la BD
// 			const newRow: MatchTypes.MatchRow = {
// 				id: newMatchId,
// 				status: 'pending',  //Importante: nace esperando un rival
// 				player1_id: userId,
// 				player1_score: 0,
// 				player2_id: null,    // Nadie aun
// 				player2_score: null,
// 				winner_id: null,
// 				created_at: now,
// 				finished_at: null
// 			};
		
// 			// Guardamos en DB
// 			//'create' pasa los datos del Literal Object a formato SQL y los injecta en la DB
// 			this.matchRepo.create(newRow);

// 			// Devolvemos un objeto limpio al cliente (que con el mapper hemos traducido desde una sentencia SQL)
// 			return MatchMapper.toDomain(newRow);
// 		}
//     }
// }
