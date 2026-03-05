import { GameConstants, BOT_USER_ID, BOT_USERNAME } from '@transcendence/shared';
import { BotEnv } from '../config.js';
import { BotClient } from '../BotClient.js';

export class BotService {

    // Mapa de instancias activas: matchId → BotClient
    // Permite gestionar múltiples partidas simultáneas
    private activeBots: Map<string, BotClient> = new Map();

    /**
     * spawnBot
     * Crea una instancia de BotClient para la partida indicada y la conecta.
     * Llamado por BotController cuando llega MATCH_BOT_REQUESTED.
     */
    async spawnBot(matchId: string, gameMode: string): Promise<void> {

        // Guard: evitar instancias duplicadas para la misma partida
        if (this.activeBots.has(matchId)) {
            console.warn(`[BOT-SERVICE] Bot already exists for match ${matchId}`);
            return;
        }

        const validGameMode = this.resolveGameMode(gameMode);

        console.log(`[BOT-SERVICE] Spawning bot for match ${matchId} (mode: ${validGameMode})`);

        const bot = new BotClient({
            matchId,
            gameMode:   validGameMode,
            wsUrl:      BotEnv.GAME_WS_URL(),
            botUserId:  BOT_USER_ID,
            botUsername: BOT_USERNAME,
            jwtSecret:  BotEnv.JWT_SECRET(),
            onDestroy:  () => this.destroyBot(matchId),
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
        console.log(`[BOT-SERVICE] Bot instance removed for match ${matchId}`);
        console.log(`[BOT-SERVICE] Active bots: ${this.activeBots.size}`);
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
        console.warn(`[BOT-SERVICE] Unknown gameMode "${gameMode}", falling back to classic`);
        return GameConstants.GAME_MODE.CLASSIC;
    }
}
