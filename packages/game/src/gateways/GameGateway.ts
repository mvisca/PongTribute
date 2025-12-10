//ARCHIVO RESPONSABLE DE MANEJO Y GESTION DE LOS WEBSOCKETS
//1. recibe la conexion
//2. Extrae el Token y el matchId de la URL del cliente
//3. Valida manualmente el Token (ya que los navegadores no envian Headers en Websockets))
//4. Acepta o rechaza la conexion

import { WebSocket } from 'ws'; // Tipo para el socket
import { FastifyRequest } from 'fastify';
// import { SocketStream } from '@fastify/websocket';
import jwt from 'jsonwebtoken';
import { GameEnv } from '../config.js';

export class GameGateway {
    
    /**
     * Maneja la conexión entrante (Handshake)
	 * Sin await: Fíjate que handleConnection no es async. 
	 * Los WebSockets funcionan por eventos (on('message'), 
	 * on('close')). No bloqueamos el hilo esperando.
	 * 
	 * NOTA: En fastify-websocket v10+, el primer argumento 'connection' 
     * puede ser directamente el Socket o un SocketStream dependiendo 
	 * de cómo se use.
     * Haremos un check seguro.
     */
	handleConnection(connection: any, req: FastifyRequest): void {
		// Compatibilidad: A veces es SocketStream, a veces es WebSocket directo
        const socket = (connection.socket ? connection.socket : connection) as WebSocket;

        // 1. Extraer datos de la Query String
        // (ws://host/api/game/ws?matchId=...&token=...)
        const query = req.query as { matchId?: string, token?: string };
        const { matchId, token } = query;

        // 2. Validación Básica
        if (!matchId || !token) {
			console.log('⛔ Conexión rechazada: Faltan parámetros');
			// El código 1008 significa "Policy Violation". Es la forma
			// educada de decir "No tienes permiso para estar aquí" en idioma WebSocket.
            socket.close(1008, 'Missing matchId or token');
            return;
        }

        // 3. Validación de Seguridad (JWT)
        try {
            // Verificamos el token manualmente usando el Secreto Compartido
            const payload = jwt.verify(token, GameEnv.JWT_SECRET) as { 
                id: string, 
                username: string 
            };

            console.log(`✅ Jugador Conectado: ${payload.username} (Match: ${matchId})`);

            // 4. Lógica de Bienvenida
            // Aquí es donde en el futuro meteremos al socket en una "Sala"
            this.sendWelcomeMessage(socket, matchId, payload.id);

            // Escuchar mensajes del cliente (Ping, Movimiento, etc.)
            socket.on('message', (message: string) => {
                console.log(`📩 Mensaje de ${payload.username}: ${message}`);
            });

            socket.on('close', () => {
                console.log(`❌ Jugador Desconectado: ${payload.username}`);
                // TODO: Aquí llamaremos al servicio para borrar la partida si estaba pending
            });

        } catch (err) {
            console.log('⛔ Conexión rechazada: Token inválido');
            socket.close(1008, 'Invalid Token');
        }
    }

    private sendWelcomeMessage(socket: WebSocket, matchId: string, userId: string) {
        const welcome = {
            event: 'JOINED_MATCH',
            data: {
                matchId,
                playerId: userId,
                status: 'pending', // Por ahora hardcodeado
                message: 'Bienvenido a la sala de espera. Esperando oponente...'
            }
        };
        socket.send(JSON.stringify(welcome));
    }
}
