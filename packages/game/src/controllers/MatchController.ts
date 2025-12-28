import { FastifyRequest, FastifyReply } from 'fastify';
import { MatchService } from '../services/MatchService.js';
// Importamos el Schema (Valor) Y el Tipo (que acabamos de crear)
import { MatchSchemas, AuthTypes } from '@transcendence/shared';


// export class MatchController {
// 	// Instanciamos el servicio (Singleton implícito por cómo JS maneja imports/clases)
// 	// Inyección de dependencias simple
//     private matchService = new MatchService();

// 	/*===== HANDLER(discrimina entre partida 'private' o 'public') ====*/
// 	// Aquí decimos: "Este request TIENE que traer un body que cumpla CreateMatchBodyType"
// 	async createMatch(
// 		request: FastifyRequest,
// 		reply: FastifyReply
// 	) {

// 		console.log("\n--- NEW REQUEST (SECURE) ---");
//         console.log("👉 🎮 [Controller] 1. Entrando en createMatch");

// 		// // Usamos '!' porque el middleware garantiza que el user existe si llega aquí
// 		// const userId = request.user!.id;

// 		const user = request.user as AuthTypes.JWTPayload;
	
// 		console.log(`👉 🎮 [Controller] User Authenticated: ${user.id}`);
		
// 		// 2. Extraer datos (Ahora TS sabe que existen gracias al Type del match.schema.ts)
//         const { matchType, opponentId } = request.body as MatchSchemas.CreateMatchBodyType;

// 		// 3. VALIDACIÓN DE NEGOCIO (Opción A)
// 		// Si es privada y NO hay oponente -> Error 400
// 		if (matchType === 'private' && !opponentId) {
// 			console.log("❌ 🎮 [Controller] Error: Private match sin opponentId");
// 			// Usamos reply nativo para evitar errores si falta la clase CustomError
//             return reply.status(400).send({ 
//                 error: 'Bad Request', 
//                 message: 'Private match requires an opponentId' 
//             });
//         }
			
// 		// 4. DELEGACION al Servicio
// 		let result;
// 		if (matchType === 'public') {
// 			console.log("👉 🎮 [Controller] 4. Llamando a Service.joinPublicQueue...");
// 			// Lógica de cola
// 			result = await this.matchService.joinPublicQueue(user.id);
// 		} else {
// 			console.log("👉 🎮 [Controller] 4. Llamando a Service.createPrivateMatch...");
// 			// El ! es seguro aquí por el if anterior
// 			// Lógica de creación directa (el ! asegura a TS que existe, ya validamos antes)
// 			result = await this.matchService.createPrivateMatch(user.id, opponentId!);
// 		}
		
// 		// 5. RESPUESTA (CON TYPE GUARD)
//         console.log("👉 🎮 [Controller] 5. Respuesta recibida del servicio:", JSON.stringify(result).substring(0, 50) + "...");
//         // Verificamos primero si la propiedad 'outcome' EXISTE dentro de result
//         if ('outcome' in result) {
//             // --- RAMA PÚBLICA (Viene de joinPublicQueue) ---
            
//             // TypeScript ahora sabe que aquí dentro 'result' TIENE outcome
//             if (result.outcome === 'added_to_queue') {
//                 return reply.status(200).send(result);
//             }

//             if (result.outcome === 'match_found') {
//                 // Desempaquetamos el match interno
//                 return reply.status(201).send(result.match);
//             }
//         } else {
//             // --- RAMA PRIVADA (Viene de createPrivateMatch) ---
//             // Si NO tiene 'outcome', TypeScript deduce que 'result' es un Match puro
//             return reply.status(201).send(result);
//         }
        
//         // Fallback de seguridad (para satisfacer al compilador si quedaran casos sueltos)
//         return reply.status(500).send({ error: 'Unexpected state' });
// 	}
	
    
// }


export class MatchController {
	// Instanciamos el servicio (Singleton implícito por cómo JS maneja imports/clases)
	private matchService = new MatchService();

	/*===== HANDLER(discrimina entre partida 'private' o 'public') ====*/
	async createMatch(
		request: FastifyRequest,
		reply: FastifyReply
	) {
		console.log("\n--- NEW REQUEST (SECURE) ---");
		console.log("👉 🎮 [Controller] 1. Entrando en createMatch");

		const user = request.user as AuthTypes.JWTPayload;
		console.log(`👉 🎮 [Controller] User Authenticated: ${user.id}`);
		
		// 2. Extraer datos
		const { matchType, opponentId } = request.body as MatchSchemas.CreateMatchBodyType;

		// 3. VALIDACIÓN DE ENTRADA (Controller level)
		if (matchType === 'private' && !opponentId) {
			console.log("❌ 🎮 [Controller] Error: Private match sin opponentId");
			return reply.status(400).send({ 
				error: 'Bad Request', 
				message: 'Private match requires an opponentId' 
			});
		}

		// 4. LÓGICA Y DELEGACIÓN (Envuelto en TRY-CATCH)
		try {
			let result;

			if (matchType === 'public') {
				console.log("👉 🎮 [Controller] 4. Llamando a Service.joinPublicQueue...");
				result = await this.matchService.joinPublicQueue(user.id);
			} else {
				console.log("👉 🎮 [Controller] 4. Llamando a Service.createPrivateMatch...");
				// El ! es seguro aquí por el if del paso 3
				result = await this.matchService.createPrivateMatch(user.id, opponentId!);
			}
			
			// 5. RESPUESTA EXITOSA
			console.log("👉 🎮 [Controller] 5. Respuesta recibida del servicio:", JSON.stringify(result).substring(0, 50) + "...");

			if ('outcome' in result) {
				// --- RAMA PÚBLICA ---
				if (result.outcome === 'added_to_queue') {
					return reply.status(200).send(result);
				}
				if (result.outcome === 'match_found') {
					return reply.status(201).send(result.match);
				}
			} else {
				// --- RAMA PRIVADA ---
				return reply.status(201).send(result);
			}

			// Fallback por si acaso
			return reply.status(500).send({ error: 'Unexpected state' });

		} catch (error) {
			// 6. MANEJO DE ERRORES DE NEGOCIO
			console.error("❌ 🎮 [Controller] Error capturado:", error);

			if (error instanceof Error) {
				// Error: Auto-desafío (Bad Request)
				if (error.message.includes('ti mismo')) {
					return reply.status(400).send({
						error: 'Bad Request',
						message: error.message
					});
				}
				// Error: Usuario no encontrado (Not Found) - Útil para cuando consultamos User Service
				if (error.message.includes('not found')) {
					return reply.status(404).send({
						error: 'Not Found',
						message: error.message
					});
				}
			}

			// Error Genérico (Infraestructura, DB, etc)
			return reply.status(500).send({
				error: 'Internal Server Error',
				message: 'An internal error occurred processing the match'
			});
		}
	}
}