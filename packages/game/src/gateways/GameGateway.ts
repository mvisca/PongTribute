//ARCHIVO RESPONSABLE DE MANEJO Y GESTION DE LOS WEBSOCKETS
//1. recibe la conexion
//2. Extrae el Token y el matchId de la URL del cliente
//3. Valida manualmente el Token (ya que los navegadores no envian Headers en Websockets))
//4. Acepta o rechaza la conexion

import { WebSocket } from 'ws';
// Contiene el tipo que define como es una peticion HTTP en Fastfy.
// Empieza siendo una peticion HTTP antes de convertirse en WebSocket
import { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken'; //Lib standar para crear y verificar tokens
import { Value } from '@sinclair/typebox/value';
import { GameEnv } from '../config.js';
import { GameService } from '../services/GameService.js';
import { WEBSOCKET_EVENTS, AuthSchemas, AuthTypes } from '@transcendence/shared';

// Clase que encapsula la logica de conexion.
// Esto nos permitira en el futuro inyectarle dependencias (GameService, ...) limpiamente
export class GameGateway {
    
    /**
	 * Al no soportar headers estándar en el handshake inicial del navegador, 
	 * se implementa validación manual del token vía Query Param (`?token=...`).
     * Riesgo: Los tokens pasados por URL pueden quedar en logs de servidores 
	 * intermedios/proxies. Es un compromiso aceptable para WS, pero se debe 
	 * asegurar que el log de acceso no registre la query string completa en
	 *  entornos de producción.
	 * 
	 * Los WebSockets funcionan por eventos (on('message'), 
	 * on('close')). No bloqueamos el hilo esperando.
	 **/


	// INYECCIÓN DE DEPENDENCIA
    // Necesitamos el servicio para guardar la partida en memoria
	constructor(private gameService: GameService) { }
	
	/**
     * Maneja la conexión inicial WebSocket.
     * Valida el ticket y delega la gestión de la sesión al Service.
     */
	//VALIDA PARAMETROS Y SEGURIDAD (JWT)
	async handleConnection(connection: any, req: FastifyRequest): Promise<void> {
		// 1. EXTRACCION DEL SOCKET REAL
		// A veces el obj 'connection' es SocketStream (wrapper que contiene
		//  el obj real dentro), a veces es WebSocket directo
        const socket = (connection.socket ? connection.socket : connection) as WebSocket;

        // 2. LECTURA DATOS. Extraer datos de la Query String (el standar
		// WebSocket, al hacer la 1ª conexion, no permite enviarlos de otra forma(p.ej. headers personalizados))
        // (ws://host/api/game/ws?matchId=...&token=...)
        const query = req.query as { matchId?: string, token?: string };
        const { matchId, token } = query;

        // 3. VALIDACION DE ENTRADA
        if (!matchId || !token) {
			console.log('⛔ [Gateway] Conexión rechazada: Faltan parámetros');
			// En protocolo WebSocket, los cierres tienen codigos numericos:
			//  1000: "Normal"
			//  1008: "Policy Violation". 
            socket.close(1008, 'Missing matchId or token');
            return;
        }

		try {
			// 4. VALIDACION DE SEGURIDAD (JWT) MANUAL
			// Al no soportar headers estándar en el handshake inicial del navegador, 
			// se implementa validación manual del token vía Query Param (`?token=...`).
			//Aqui no tenemos Fastify que revise si la configuracion es correcta, ni validaciones
			//automaticas, ni middleware como en las peticiones HTTP.
			//Es vital envolver en un try catch por si falla algo.

			// 4a. Verificar firma JWT
			const payload = jwt.verify(token, GameEnv.JWT_SECRET()) as AuthTypes.AccessTokenPayload;

			// 4b. Validar estructura del payload con TypeBox (igual que middlewares HTTP)
			const isValid = Value.Check(AuthSchemas.AccessTokenPayloadSchema, payload);
			if (!isValid) {
				console.log('⛔ [Gateway] Token con estructura inválida');
				socket.close(1008, 'Invalid token structure');
				return;
			}

			// 4c. Validar lastLogoutAt contra User Service (endpoint ligero)
			const response = await fetch(
				`${GameEnv.USER_SERVICE_URL()}/internal/users/${payload.id}/last-logout`,
				{
					method: 'GET',
					headers: {
						'X-Service-Secret': GameEnv.SERVICE_SECRET(),
						'Content-Type': 'application/json'
					}
				}
			);

			if (!response.ok) {
				console.log('⛔ [Gateway] Fallo validación de usuario');
				socket.close(1008, 'User validation failed');
				return;
			}

			const { lastLogoutAt } = await response.json() as { lastLogoutAt: number };

			// Token es inválido si fue emitido ANTES del logout (revocado)
			if (payload.iat! < lastLogoutAt) {
				console.log('⛔ [Gateway] Token revocado (emitido antes del último logout)');
				socket.close(1008, 'Token revoked');
				return;
			}

			const userId = payload.id;

            console.log(`✅ [Gateway] Jugador Conectado: ${payload.username} (Match: ${matchId})`);
			
			// CAPTURAR EL VALOR DE RETORNO
            // Guardamos el estado que nos devuelve el servicio
            const status = await this.gameService.joinMatch(matchId, userId, socket);

            // Si devuelve null, es que algo falló (partida acabada, invalida, etc) y el socket se cerró dentro.
			if (!status) return;
			
			// PASAR EL ESTADO AL WELCOME
            // Pasamos 'status' como 4º argumento
			this.sendWelcomeMessage(socket, matchId, payload.id, status);
			

            // 6. EVENTO: MENSAJE. Escucha indefinidamente mensajes del cliente (Ping, Movimiento, etc.)
            // Se dispara cada vez que el cliente envía datos (ej: "Mover paleta arriba")
			socket.on('message', async (message: string) => {
				//CONECTAMOS LOS INPUTS DEL CLIENTE.
				await this.gameService.processInput(matchId, userId, message);
			});

			// 7. EVENTO: DESCONEXION
			// Se dispara si pierde internet o cierra la pestanya
            socket.on('close', async () => {
                console.log(`❌ [Gateway] Jugador Desconectado: ${payload.username}`);
				try {
					await this.gameService.handleDisconnect(userId, matchId);
				} catch (err) {
					console.error(`❌ [Gateway] Error en handleDisconnect:`, err);
				}
			});

        } catch (err) {
            console.log('⛔ [Gateway] Conexión rechazada: Token inválido');
            socket.close(1008, 'Invalid Token');
		}
    }


	//METODO PRIVADO AUXILIAR
	/**
     * Envía el mensaje inicial de protocolo.
     * El frontend usa esto para saber que la conexión está lista.
     */
	private sendWelcomeMessage(socket: WebSocket, matchId: string, userId: string, status: string) {
		// Podríamos pedirle al servicio la config, pero por ahora
        // con devolver el status es suficiente para que el front reaccione.
        // Si el front necesita la config, la pedirá.
        const welcome = {
            event: WEBSOCKET_EVENTS.MATCH_JOINED,
            data: {
                matchId,
                playerId: userId,
                status: status, // <--- ('active', 'waiting', 'playing')
                message: status === 'playing' 
                    ? 'Reconectando a partida en curso...' 
                    : 'Conectado. Esperando rival...'
            }
        };
        socket.send(JSON.stringify(welcome));
    }
}
