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
		
		console.log(`👉 ⚙️ [Service] Revisando cola Redis (${QUEUE_KEY})...`);

        // 1. Lógica FIFO en Redis
        const opponentId = await redisClient.lpop(QUEUE_KEY);

		if (opponentId && opponentId !== userId) {
			console.log(`👉 ⚙️ [Service] ¡Oponente encontrado! (${opponentId}) vs Yo (${userId})`);
            // --- MATCH ENCONTRADO ---

            // a. Persistir en DB (Devuelve Row cruda)
            const matchRow = await this.matchRepo.createPublicMatch(opponentId, userId);

            // b. Mapear a Objeto de Dominio (Aquí usamos tu Mapper)
            const matchDomain = MatchMapper.toDomain(matchRow);

			//OJO, MAS ADELANTE:llamada HTTP a user para obtener los username
			// del objeto matchDomain antes de enviar el evento a Redis
			//De momento, con este metodo devuelvo un objeto MOCK basado en el ID
			// en lugar de "unknown", para provar que funciona.

			// 1. MOCK: Llamamos al mock para AMBOS jugadores (usando await)
			//Uso el objeto de dominio como fuente de la verdad
			console.log("👉 ⚙️ [Service] Hidratando nombres...");
			const player1Data = await this.fetchUserProfile(matchDomain.player1.userId);
			matchDomain.player1.username = player1Data.username;
	
			if (matchDomain.player2) {
    			const player2Data = await this.fetchUserProfile(matchDomain.player2.userId);
    			matchDomain.player2.username = player2Data.username;
			}

			// ahora sí, publicas en Redis y retornas matchDomain	

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
			console.log("👉 ⚙️ [Service] Cola vacía o soy yo mismo. Añadiéndome a la cola...");
			
            // Si por error me saqué a mí mismo, me ignoro.
            if (opponentId && opponentId === userId) {
				// log de warning opcional
				console.warn("⚠️ ⚙️ [Service] Warning: Me saqué a mí mismo de la cola. Reinsertando.");
            }

            await redisClient.rpush(QUEUE_KEY, userId);
            return { outcome: 'added_to_queue' };
        }
    }

    async createPrivateMatch(userId: string, opponentId: string): Promise<MatchTypes.Match> {
        if (!redisClient) throw new Error('Redis client not initialized');

		console.log(`👉 ⚙️ [Service] Creando partida privada: ${userId} vs ${opponentId}`);

        if (userId === opponentId) {
            throw new Error("No puedes desafiarte a ti mismo");
        }

        // 1. Crear en DB (Status PENDING)
        const matchRow = await this.matchRepo.createPrivateMatch(userId, opponentId);

        // 2. Mapear
		const matchDomain = MatchMapper.toDomain(matchRow);
		
		//OJO, MAS ADELANTE: aqui pondre una llamada HTTP a user para obtener 
		// los username del objeto matchDomain antes de enviar el evento a Redis.
		//De momento, con este metodo devuelvo un objeto MOCK basado en el ID
		// en lugar de "unknown", para provar que funciona.
		// 1. Llamamos al mock para AMBOS jugadores (usando await)
		//Uso el objeto de dominio como fuente de la verdad
		console.log("👉 ⚙️ [Service] Hidratando nombres...");
		const player1Data = await this.fetchUserProfile(matchDomain.player1.userId);
		matchDomain.player1.username = player1Data.username;
	
		if (matchDomain.player2) {
    		const player2Data = await this.fetchUserProfile(matchDomain.player2.userId);
    		matchDomain.player2.username = player2Data.username;
		}
		// ahora sí, publica en Redis y retorna matchDomain
			

        // 3. Notificar invitación
        await redisClient.publish('game_events', JSON.stringify({
            type: 'match.invite',
            targetUserId: opponentId,
            payload: matchDomain
        }));

        return matchDomain;
	}
	
	// // Método helper para simular fetch al User Service
	// private async fetchUserProfile(userId: string): Promise<{ username: string }> {
	// 	// TODO: Reemplazar por llamada HTTP real: axios.get(`http://user-service...`)
	// 	// Por ahora, devolvemos un mock para verificar que el flujo de datos funciona.
	// 	const mockName = `Player_${userId.substring(0, 4)}`;
	// 	console.log(`   🔍 [Hydration] Fetching UserID: ${userId} -> Mock: ${mockName}`);
	// 	return { username: `Player_${userId.substring(0, 4)}` };
	// }

// 	// Método helper: Comunicación Inter-Servicio real 
// 	// (pide al modulo user por HTTP el username del userId)
//     private async fetchUserProfile(userId: string): Promise<{ username: string }> {
//         // 1. Obtener URL (Fallback a localhost si no carga el env por alguna razón)
//         const baseUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
//         const targetUrl = `${baseUrl}/api/users/${userId}`;

//         try {
//             // console.log(`   📡 [Network] GET ${targetUrl}`); // Debug

//             // 2. Fetch Nativo (Node 18+)
//             const response = await fetch(targetUrl);

//             // 3. Manejo de errores HTTP (404 Not Found, 500 Server Error)
//             if (!response.ok) {
//                 console.warn(`   ⚠️ [Hydration] Falló petición a User Service (${response.status}): Usuario ${userId} no encontrado o servicio caído.`);
//                 return { username: 'Unknown' };
//             }

//             // 4. Parsear respuesta
//             // Asumimos que User Service devuelve: { id: string, username: string, ... }
//             const userData = await response.json() as { username: string };
            
//             return { username: userData.username };

//         } catch (error) {
//             // 5. Manejo de errores de Red (Connection Refused, Timeout)
//             // Esto evita que el juego se detenga si el servicio de usuarios muere.
//             console.error(`   🔥 [Hydration] Error Crítico de Red conectando a ${baseUrl}:`, error);
//             return { username: 'Unknown' };
//         }
//     }

	// Método helper: Comunicación Inter-Servicio real 
	// (pide al modulo user por HTTP el username del userId)
	private async fetchUserProfile(userId: string): Promise<{ username: string }> {
		// 1. Obtener URL Base
		const baseUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
		
		// 🔥 CAMBIO 1: Usamos la ruta interna, no la pública (/api)
		// Esta ruta interna debería estar protegida por el SERVICE_SECRET en lugar del JWT
		const targetUrl = `${baseUrl}/internal/users/by-id/${userId}`;
		
		try {
			// console.log(`   📡 [Network] GET ${targetUrl} (S2S Auth)`); // Debug
			
			// 2. Fetch con Autenticación de Servicio
			const response = await fetch(targetUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					// 🔥 CAMBIO 2: Presentamos la credencial de servicio (definida en .env)
					'x-service-secret': process.env.SERVICE_SECRET || ''
				}
			});
			
			// 3. Manejo de errores HTTP
			if (!response.ok) {
				console.warn(`   ⚠️ [Hydration] Falló petición a User Service (${response.status}): Usuario ${userId} no encontrado o auth rechazada.`);
				return { username: 'Unknown' };
			}
			
			// 4. Parsear respuesta
			const userData = await response.json() as { username: string };
			
			return { username: userData.username };
			
		} catch (error) {
			console.error(`   🔥 [Hydration] Error Crítico de Red conectando a ${baseUrl}:`, error);
			return { username: 'Unknown' };
		}
	}
}
