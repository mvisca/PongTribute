import type { FastifyBaseLogger } from 'fastify';
import { GameConstants, BOT_USER_ID, BOT_USERNAME } from '@transcendence/shared';
import { BotEnv } from '../config.js';
import { BotClient } from '../BotClient.js';

export class BotService {

	private activeBots: Map<string, BotClient> = new Map();
	private log: FastifyBaseLogger;

	constructor(logger: FastifyBaseLogger) {
		this.log = logger.child({ component: 'BotService' });
	}

	/**
	 * spawnBot
	 * Crea una instancia de BotClient para la partida indicada y la conecta.
	 * Llamado por BotController cuando llega MATCH_BOT_REQUESTED.
	 */
	async spawnBot(matchId: string, gameMode: string): Promise<void> {

		// Guard: evitar instancias duplicadas para la misma partida
		if (this.activeBots.has(matchId)) {
			this.log.warn({ matchId }, 'Bot already exists for match');
			return;
		}

		const validGameMode = this.resolveGameMode(gameMode);

		this.log.info({ matchId, gameMode: validGameMode }, 'Spawning bot');

		const bot = new BotClient({
			matchId,
			gameMode: validGameMode,
			wsUrl: BotEnv.GAME_WS_URL(),
			botUserId: BOT_USER_ID,
			botUsername: BOT_USERNAME,
			jwtSecret: BotEnv.JWT_SECRET(),
			logger: this.log,
			onDestroy: () => this.destroyBot(matchId),
		});

		this.activeBots.set(matchId, bot);

		await bot.connect();
	}

	/**
	 * destroyBot
	 * Elimina la instancia del mapa cuando la partida termina.
	 * Llamado por el propio BotClient cuando recibe GAME_OVER.
	 */
	private destroyBot(matchId: string): void {
		this.activeBots.delete(matchId);
		this.log.info({ matchId, activeBots: this.activeBots.size }, 'Bot instance removed');
	}

	/**
	 * resolveGameMode
	 * Valida y normaliza el gameMode recibido del evento Redis.
	 * Si llega un valor desconocido, usa 'classic' como fallback seguro.
	 */
	private resolveGameMode(gameMode: string): GameConstants.GameModeType {
		const valid = Object.values(GameConstants.GAME_MODE) as string[];
		if (valid.includes(gameMode)) {
			return gameMode as GameConstants.GameModeType;
		}
		this.log.warn({ gameMode }, 'Unknown gameMode, falling back to classic');
		return GameConstants.GAME_MODE.CLASSIC;
	}
}
