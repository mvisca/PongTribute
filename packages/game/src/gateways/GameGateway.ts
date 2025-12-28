//ARCHIVO RESPONSABLE DE MANEJO Y GESTION DE LOS WEBSOCKETS
//1. recibe la conexion
//2. Extrae el Token y el matchId de la URL del cliente
//3. Valida manualmente el Token (ya que los navegadores no envian Headers en Websockets))
//4. Acepta o rechaza la conexion

// Tipo y clase para el socket de la lib ws
// La necesitamos para TypeScript conozca los metodos del obj socket (.send(),.on(), close(), ...)
import { WebSocket } from 'ws';
//Contiene el tipo que define como es una peticion HTTP en Fastfy.
//y empieza siendo una peticion HTTP antes de convertirse en WebSocket
import { FastifyRequest } from 'fastify';
//import { SocketStream } from '@fastify/websocket'; // VEREMOS SI LO NECESITO O NO
import jwt from 'jsonwebtoken'; //Lib standar para crear y verificar tokens
import { GameEnv } from '../config.js';

//Usaremos esta clase para encapsular toda la logica de conexion. Esto
// nos permitira en el futuro inyectarle dependencias (GameService, ...) limpiamente
export class GameGateway {
    
    /**
	 * AQUI ESTAMOS DESNUDOS PORQUE HEMOS SALIDO DEL FLUJO HTTP ESTANDAR
	 *  DONDE FASTIFY NOS PROTEGE AUTOMATICAMENTE. HEMOS DE IMPEMENTAR
	 * MANUALMENTE LA SEGURIDAD.
     * Maneja la conexión entrante (Handshake)
	 * Sin await: Fíjate que handleConnection no es async. 
	 * Los WebSockets funcionan por eventos (on('message'), 
	 * on('close')). No bloqueamos el hilo esperando.
	 * 
	 * NOTA: En fastify-websocket v10+, el primer argumento 'connection' 
     * puede ser directamente el Socket o un SocketStream dependiendo 
	 * de cómo se use.
     * Haremos un check seguro.
	 * 
	 **/
	//VALIDA PARAMETROS Y SEGURIDAD (JWT)
	handleConnection(connection: any, req: FastifyRequest): void {
		// 1. EXTRACCION DEL SOCKET REAL
		// A veces el obj 'connection' es SocketStream (wrapper que contiene
		//  el obj real dentro), a veces es WebSocket directo
        const socket = (connection.socket ? connection.socket : connection) as WebSocket;

        // 2. LECTURA DATOS. Extraer datos de la Query String (el standar
		// WebSocket no permite enviarlos de otra forma(p.ej. headers personalizados))
        // (ws://host/api/game/ws?matchId=...&token=...)
        const query = req.query as { matchId?: string, token?: string };
        const { matchId, token } = query;

        // 3. VALIDACION DE ENTRADA
        if (!matchId || !token) {
			console.log('⛔ Conexión rechazada: Faltan parámetros');
			// En protocolo WebSocket, los cierres tiene codigos numericos:
			//  1000: "Normal"
			//  1008: "Policy Violation". 
            socket.close(1008, 'Missing matchId or token');
            return;
        }

		try {
			// 4. VALIDACION DE SEGURIDAD (JWT)
			//Aqui no tenemos Fastify que revise si la configuracion es correcta, ni validaciones
			//automaticas, ni middleware como en las peticiones HTTP. 
			//Es vital envolver en un try catch por si falla algo.
			// Verificamos el token manualmente usando el Secreto Compartido.
			//Si el token esta caducado, es falso o la firma no coincide con JWT_SECRET,
			//lanzara una exception y cerrará la conexion.
            const payload = jwt.verify(token, GameEnv.JWT_SECRET) as { 
                id: string, 
                username: string 
            };

            console.log(`✅ Jugador Conectado: ${payload.username} (Match: ${matchId})`);

			// 5. LOGICA DE BIENVENIDA. El servidor dice HOLA el primero.
			// Aquí es donde confirmamos al cliente que "está dentro" y
			// sabe que la conexion es estable y puede dejar de mostrar el spinner de carga 
			// y mostrar la vista del juego.
            // Vinculamos el socket con la partida (matchId) y el usuario (payload.id)
            // TODO: Aquí es donde en el futuro meteremos al socket en una "Sala"
            this.sendWelcomeMessage(socket, matchId, payload.id);

            // 6. EVENTO: MENSAJE. Escucha indefinidamente mensajes del cliente (Ping, Movimiento, etc.)
            // Se dispara cada vez que el cliente envía datos (ej: "Mover paleta arriba")
			socket.on('message', (message: string) => {
				console.log(`📩 Mensaje de ${payload.username}: ${message}`);
				// TODO: Aquí conectaremos el GameEngine más adelante.
                // En lugar de un console.log, haremos: this.gameEngine.processInput(...)
			});
			
			// TODO: discutir con los compañeros si implementamos un "Pause" de partida. 

			// 7. EVENTO: DESCONEXION
			// Se dispara si pierde internet o cierra la pestanya
            socket.on('close', () => {
                console.log(`❌ Jugador Desconectado: ${payload.username}`);
				// TODO: Notificar al otro jugador ("Game Over. Tu rival se ha
				//  desconectado. Ganaste por abandono"). El que se queda se lleva 
				// la puntuacion maxima y guardar resultado en DB. El servidor 
				// cierra la sala y libera la memoria.
				// No vamos a pausar el juego por desconexion, guardar el estado y 
				// esperar una reconexion (eso es nivel muy PRO y no es para este proyecto pedagogico)
			});


        } catch (err) {
            console.log('⛔ Conexión rechazada: Token inválido');
            socket.close(1008, 'Invalid Token'); //codigo de desconexion 1008: Policy violation 
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
            event: 'JOINED_MATCH', //El "nombre" del evento
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
