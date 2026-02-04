//ARCHIVO RESPONSABLE DE MANEJO Y GESTION DE LOS WEBSOCKETS
//1. recibe la conexion
//2. Extrae el Token y el matchId de la URL del cliente
//3. Valida manualmente el Token (ya que los navegadores no envian Headers en Websockets))
//4. Acepta o rechaza la conexion

// Tipo y clase para el socket de la lib ws
// La necesitamos para que TypeScript conozca los metodos del obj socket (.send(),.on(), close(), ...)
import { WebSocket } from 'ws';
// Contiene el tipo que define como es una peticion HTTP en Fastfy.
// Empieza siendo una peticion HTTP antes de convertirse en WebSocket
import { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken'; //Lib standar para crear y verificar tokens
import { GameEnv } from '../config.js';
import { GameService } from '../services/GameService.js';
import { SOCKET_EVENTS } from '@transcendence/shared';

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
	
	//VALIDA PARAMETROS Y SEGURIDAD (JWT)
	handleConnection(connection: any, req: FastifyRequest): void {
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
			// Verificamos el token manualmente usando el Secreto Compartido.
			//Si el token esta caducado, es falso o la firma no coincide con JWT_SECRET,
			//lanzara una exception y cerrará la conexion.
            const payload = jwt.verify(token, GameEnv.JWT_SECRET()) as {
                id: string,
                username: string
            };

			const userId = payload.id;

            console.log(`✅ [Gateway] Jugador Conectado: ${payload.username} (Match: ${matchId})`);
			
			// USO DEL SERVICIO INYECTADO
			//METEMOS AL SOCKET EN LA SALA DE JUEGO (map activeMatches<> en GameService)
			this.gameService.joinMatch(matchId, userId, socket);

			// 5. LOGICA DE BIENVENIDA. El servidor dice HOLA el primero.
			// Aquí es donde confirmamos al cliente que "está dentro" y
			// sabe que la conexion es estable y puede dejar de mostrar el spinner de carga 
			// y mostrar la vista del juego.
            // Vinculamos el socket con la partida (matchId) y el usuario (payload.id)
            this.sendWelcomeMessage(socket, matchId, payload.id);

            // 6. EVENTO: MENSAJE. Escucha indefinidamente mensajes del cliente (Ping, Movimiento, etc.)
            // Se dispara cada vez que el cliente envía datos (ej: "Mover paleta arriba")
			socket.on('message', async (message: string) => {
				//CONECTAMOS LOS INPUTS DEL CLIENTE.
				await this.gameService.processInput(matchId, userId, message);
			});

			// 7. EVENTO: DESCONEXION (por perdida de internet o cierre de la pestanya)
            socket.on('close', () => {
                console.log(`❌ [Gateway] Jugador Desconectado: ${payload.username}`);
			});

        } catch (err) {
            console.log('⛔ [Gateway] Conexión rechazada: Token inválido');
            socket.close(1008, 'Invalid Token');
			// Martin: no se hacen throw en los catch para que el controller envíe respuestas de fallo al clietne?
			// No, aqui la conexion HTTP ya no existe mas, termino, ahora es un socket y
			//para decir error se usa socket.close(codigo de cierre, mensaje). Si haces
			// un throw new Error el servvidor explotara o logueara el error en consola
			// y dejara un socket zombie.
		}
    }


	//METODO PRIVADO AUXILIAR
    private sendWelcomeMessage(socket: WebSocket, matchId: string, userId: string) {
        const welcome = {
            event: SOCKET_EVENTS.JOINED_MATCH,
            data: {
                matchId,
                playerId: userId,
                status: 'pending', // Por ahora hardcodeado
                message: 'Bienvenido a la sala de espera. Esperando oponente...'
            }
		};
		
		// IMPORTANTE: WebSocket solo envía TEXTO o BINARIO.
        // No puedes enviar objetos JS directos, hay que serializar 
		// a String (JSON) de texto plano. El cliente tendrá que hacer 
		// JSON.parse() al recibirlo.
        socket.send(JSON.stringify(welcome));
    }
}
