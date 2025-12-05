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

        try {
            // 2. DELEGACIÓN (Llamada al Servicio)
            // Aquí está la clave: El controller NO sabe de matchmaking FIFO.
            // Solo le dice al servicio: "El usuario X quiere jugar. Arréglalo".
            // NOTA: Ignora el body (JSON) por ahora, solo pasamos el ID.
            const match = await this.matchService.joinOrCreate(user.id);

            // 3. Respuesta: 201 Created + Objeto Match limpio
            return reply.status(201).send(match);

        } catch (error) {
            // Logueamos el error real en servidor
            request.log.error(error);
            
            // Devolvemos error genérico al cliente
            return reply.status(500).send({ 
                error: 'Internal Server Error', 
                message: 'Error al procesar el matchmaking' 
            });
        }
    }
    
    // Aquí añadiremos getMatchById en el futuro...
}
