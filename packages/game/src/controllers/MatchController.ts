//Hace la funcion de recepcionista
import { FastifyRequest, FastifyReply } from 'fastify';
import { MatchService } from '../services/MatchService.js';
// Importamos tipos, aunque Fastify infiere mucho, es bueno ser explícito
import { MatchTypes } from '@transcendence/shared';

export class MatchController {
    // Instanciamos el servicio (Singleton implícito por cómo JS maneja imports/clases)
    private matchService = new MatchService();

    /**
     * Handler para POST /matches
     */
    async createMatch(
        request: FastifyRequest<{ Body: MatchTypes.CreateMatchBody }>, 
        reply: FastifyReply
    ): Promise<void> {
        
        // 1. IDENTIDAD Seguridad: Obtener quién es el usuario desde el Token
        // El middleware 'validateJWT' descifro el token y relleno request.user
        // request.user = { id: "user-1111", username: "Goku", ... }
		const user = request.user;

        if (!user) {
            // Esto no debería pasar si el middleware está puesto, pero por seguridad de tipos:
            return reply.status(401).send({ 
                error: 'Unauthorized', 
                message: 'No se ha podido identificar al usuario' 
            });
        }

		// Extraemos 'opponentId' directamente del cuerpo.
		//Busca una propiedad llamada opponentId dentro de 
		// request.body y crea una variable con ese mismo nombre".
		//  Si la propiedad no existe, la variable se crea con valor undefined.
        // Si el body es {}, opponentId será undefined.
        // Si el body es { opponentId: "..." }, tendrá el valor.
		const { opponentId }  = request.body;

        try {
            // 2. DELEGACIÓN (Llamada al Servicio)
            // Aquí está la clave: El controller NO sabe de matchmaking FIFO.
            // Solo le dice al servicio: "El usuario X quiere jugar. Arréglalo".
            const match = await this.matchService.joinOrCreate(user.id, opponentId);

            // 3. Respuesta: 201 Created + Objeto Match limpio
            return reply.status(201).send(match);

    //     } catch (error: any) { // Tipamos error como any para acceder a message
    //         // Logueamos el error real en servidor
    //         request.log.error(error);
    //         // Si el servicio lanza un error de validación (ej: auto-desafío),
    //         // podríamos devolver 400. Por simplicidad devolvemos 500 o mensaje del error.
    //         return reply.status(500).send({
    //             error: 'Internal Server Error',
    //             message: error.message || 'Error al procesar el matchmaking'
    //         });
			//     }
			} catch (error: any) {
            request.log.error(error);
            
            // MEJORA: Si el error es de lógica de negocio conocida, devolvemos 400
            if (error.message === "No puedes desafiarte a ti mismo") {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: error.message
                });
            }

            // Para todo lo demás (DB caída, bugs), devolvemos 500
            return reply.status(500).send({ 
                error: 'Internal Server Error', 
                message: 'Error al procesar el matchmaking' 
            });
        }
    }
    
    // Aquí añadiremos getMatchById en el futuro...
}
