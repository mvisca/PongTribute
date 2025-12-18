import { FastifyRequest, FastifyReply } from 'fastify';
import { MatchService } from '../services/MatchService.js';
// Importamos el Schema (Valor) Y el Tipo (que acabamos de crear)
import { MatchSchemas } from '@transcendence/shared';


export class MatchController {
	// Instanciamos el servicio (Singleton implícito por cómo JS maneja imports/clases)
	// Inyección de dependencias simple
    private matchService = new MatchService();

	/*===== HANDLER(discrimina entre partida 'private' o 'public') ====*/
	// Aquí decimos: "Este request TIENE que traer un body que cumpla CreateMatchBodyType"
	async createMatch(
		request: FastifyRequest<{ Body: MatchSchemas.CreateMatchBodyType }>,
		reply: FastifyReply
	) {

		console.log("\n--- NEW REQUEST ---");
        console.log("👉 🎮 [Controller] 1. Entrando en createMatch");

		// MOCK TEMPORAL PARA TEST
		const userId = request.headers['x-mock-user-id'] as string || "user_default";
		// 1. Obtener User ID (del token decodificado por el middleware)
		// Extraemos solo el ID. Fastify (vía middleware) suele poner el user en request.user
        // Asumimos que request.user tiene la forma { id: string, ... }
		// OPCIÓN B: REAL (Comentada hasta que integremos Auth)
		//const user = request.user as { id: string }; // Comenta esto
		//const userId = user.id; // Comenta esto
        
		console.log(`👉 🎮 [Controller] 2. User ID identificado: ${userId}`);
        console.log("👉 🎮 [Controller] 3. Body recibido:", request.body);

		// 2. Extraer datos (Ahora TS sabe que existen gracias al Type del match.schema.ts)
        const { matchType, opponentId } = request.body;

		// 3. VALIDACIÓN DE NEGOCIO (Opción A)
		// Si es privada y NO hay oponente -> Error 400
		if (matchType === 'private' && !opponentId) {
			console.log("❌ 🎮 [Controller] Error: Private match sin opponentId");
			// Usamos reply nativo para evitar errores si falta la clase CustomError
            return reply.status(400).send({ 
                error: 'Bad Request', 
                message: 'Private match requires an opponentId' 
            });
        }
	
		
		// 4. DELEGACION al Servicio
		let result;
		if (matchType === 'public') {
			console.log("👉 🎮 [Controller] 4. Llamando a Service.joinPublicQueue...");
			// Lógica de cola
			result = await this.matchService.joinPublicQueue(userId);
		} else {
			console.log("👉 🎮 [Controller] 4. Llamando a Service.createPrivateMatch...");
			// El ! es seguro aquí por el if anterior
			// Lógica de creación directa (el ! asegura a TS que existe, ya validamos antes)
			result = await this.matchService.createPrivateMatch(userId, opponentId!);
		}
		
		// 5. RESPUESTA (CON TYPE GUARD)
        console.log("👉 🎮 [Controller] 5. Respuesta recibida del servicio:", JSON.stringify(result).substring(0, 50) + "...");
        // Verificamos primero si la propiedad 'outcome' EXISTE dentro de result
        if ('outcome' in result) {
            // --- RAMA PÚBLICA (Viene de joinPublicQueue) ---
            
            // TypeScript ahora sabe que aquí dentro 'result' TIENE outcome
            if (result.outcome === 'added_to_queue') {
                return reply.status(200).send(result);
            }

            if (result.outcome === 'match_found') {
                // Desempaquetamos el match interno
                return reply.status(201).send(result.match);
            }
        } else {
            // --- RAMA PRIVADA (Viene de createPrivateMatch) ---
            // Si NO tiene 'outcome', TypeScript deduce que 'result' es un Match puro
            return reply.status(201).send(result);
        }
        
        // Fallback de seguridad (para satisfacer al compilador si quedaran casos sueltos)
        return reply.status(500).send({ error: 'Unexpected state' });
	}
	
    
}
