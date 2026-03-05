// SUBSCRIPCION DEL SERVICIO BOT AL EVENTO REDIS
// Es la capa de entrada al servicio (equivalente a un Router HTTP).
// Su mision es escuchar la red, parsear el JSON y pasar los datos 
// limpios hacia el BotController.

import { Redis } from 'ioredis';
import { BotController } from '../controllers/BotController.js';
import {
	TRANSCENDENCE_CHANNEL,
	TRANSCENDENCE_EVENTS,
	TranscendenceEventsTypes,
} from '@transcendence/shared';


export class RedisSubscriber {
	private subscriber: Redis;
	private connected: boolean = false;
	private controller: BotController;

	constructor(subscriberRedis: Redis, controller: BotController) {
		this.subscriber = subscriberRedis;
		this.controller = controller;
	}
	
	public async connect() {
		try {
			console.log('[BOT-SUBSCRIBER] Connecting to Pub/Sub...');
			
			// Nos suscribimos al canal de eventos definido en Shared
			await this.subscriber.subscribe(TRANSCENDENCE_CHANNEL);
			
			// Escuchamos mensajes
			this.subscriber.on('message', (_channel, message) => {
					this.handleMessage(message);
			});
			
			console.log('[BOT-SUBSCRIBER] Ready. Listening on channel:', TRANSCENDENCE_CHANNEL);
			
			this.connected = true;

		} catch (error) {
			this.connected = false;
			console.error('[BOT-SUBSCRIBER] Failed to subscribe:', error);
		}
	}
	
	private handleMessage(message: string) {
		try {
			// 1. Casteamos a SystemEvent para que TypeScript nos ayude
			const event = JSON.parse(message) as TranscendenceEventsTypes.SystemEvent;
			
			// Validación defensiva básica
			if (!event || !event.type || !event.payload) return;
			
			if (event.type !== TRANSCENDENCE_EVENTS.MATCH_BOT_REQUESTED) return;
				
			const bot_requestedEvent = event as TranscendenceEventsTypes.MatchBotRequestedEvent;
		
			// Forma limpia de extraer propiedades de un objeto y 
			// meterlas en constantes del mismo nombre en una sola línea.
			const { matchId, gameMode } = bot_requestedEvent.payload;
				
			if (matchId && gameMode) {
				console.log(`[BOT-SUBSCRIBER] Bot requested for ${matchId}`);
						
				this.controller.handleBotRequest({ matchId, gameMode });

			} else {
				// Log de advertencia si llega el evento pero sin los datos necesarios
				console.warn(`[BOT-SUBSCRIBER] ${matchId} is missing`);
			}
		} catch (error) { 
			console.error('[BOT-SUBSCRIBER] Failed to parse Redis message:', error);
		}
	}
	
	// Cierra limpiamente la conexion Redis
	public async disconnect() {
		if (this.subscriber) {
			console.log('[BOT-SUBSCRIBER] Disconnecting...');
			this.connected = false;
			await this.subscriber.quit();
		}
	}

	// Para healthCheck
	public isConnected() {
		return this.connected;
	}
}
