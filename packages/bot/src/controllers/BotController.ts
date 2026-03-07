import type { FastifyBaseLogger } from 'fastify';
import { BotService } from '../services/BotService.js';


export class BotController {

	private botService: BotService;
	private log: FastifyBaseLogger;

	constructor(botService: BotService, logger: FastifyBaseLogger) {
		this.botService = botService;
		this.log = logger.child({ component: 'BotController' });
	}

	async handleBotRequest(payload: { matchId: string, gameMode: string }) {

		this.log.info({ matchId: payload.matchId, gameMode: payload.gameMode }, 'Received bot request');
		try {

			await this.botService.spawnBot(payload.matchId, payload.gameMode);

		} catch (err) {
			this.log.error({ err, matchId: payload.matchId }, 'Failed to spawn bot');
		}
	}
}