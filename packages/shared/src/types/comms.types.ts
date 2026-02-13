/**
 * Tipos compartidos para comunicación WebSocket
 * Usados por backend (CommsService) y frontend
 */

export namespace CommsTypes {
	/**
	 * Tipos de mensajes WebSocket soportados
	 */
	export type WSMessageType = 'ping' | 'pong' | 'message' | 'error';

	/**
	 * Estructura base de mensaje WebSocket
	 */
	export interface WSMessage {
		type: WSMessageType;
		payload?: unknown;
		timestamp?: number;
	}

	/**
	 * Mensaje de respuesta pong (heartbeat)
	 */
	export interface PongMessage extends WSMessage {
		type: 'pong';
		timestamp: number;
	}

	/**
	 * Mensaje de error
	 */
	export interface ErrorMessage extends WSMessage {
		type: 'error';
		payload: {
			code: string;
			message: string;
		};
	}
}
