// SUBSCRIPCION DEL SERVICIO BOT AL EVENTO REDIS
// Es la capa de entrada al servicio (equivalente a un Router HTTP).
// Su mision es escuchar la red, parsear el JSON y pasar los datos 
// limpios hacia el BotController.

import { Redis } from 'ioredis';
import type { FastifyBaseLogger } from 'fastify';
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
	private log: FastifyBaseLogger;

	constructor(subscriberRedis: Redis, controller: BotController, logger: FastifyBaseLogger) {
		this.subscriber = subscriberRedis;
		this.controller = controller;
		this.log = logger.child({ component: 'RedisSubscriber' });
	}

	public async connect() {
		try {
			this.log.info('Connecting to Pub/Sub...');

			await this.subscriber.subscribe(TRANSCENDENCE_CHANNEL);

			this.subscriber.on('message', (_channel, message) => {
				this.handleMessage(message);
			});

			this.log.info({ channel: TRANSCENDENCE_CHANNEL }, 'Ready. Listening on channel');

			this.connected = true;

		} catch (error) {
			this.connected = false;
			this.log.error({ err: error }, 'Failed to subscribe');
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
				this.log.info({ matchId }, 'Bot requested');

				this.controller.handleBotRequest({ matchId, gameMode });

			} else {
				this.log.warn({ matchId }, 'Event received with missing data');
			}
		} catch (error) {
			this.log.error({ err: error }, 'Failed to parse Redis message');
		}
	}

	// Cierra limpiamente la conexion Redis
	public async disconnect() {
		if (this.subscriber) {
			this.log.info('Disconnecting...');
			this.connected = false;
			await this.subscriber.quit();
		}
	}

	// Para healthCheck
	public isConnected() {
		return this.connected;
	}
}
