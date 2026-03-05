//EL Controller

import { BotService } from '../services/BotService.js';


export class BotController {

	// Propiedad privada para almacenar el servicio inyectado
	private botService: BotService;

	// Le pasamos la instancia ya creada desde fuera, en lugar de hacer new BotService
	constructor(botService: BotService) {
		this.botService = botService;
	}

	async handleBotRequest(payload: { matchId: string, gameMode: string }) {

		console.log("[BOT-CTRL] Received request: handleBotRequest");
		try {

			await this.botService.spawnBot(payload.matchId, payload.gameMode);
			
    	} catch (err) {
        	console.error(`[BOT-CTRL] Failed to spawn bot for match ${payload.matchId}:`, err);
    	}
	}
}