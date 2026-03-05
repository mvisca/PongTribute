import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import {
	GameConstants,
	WEBSOCKET_EVENTS,
	GameTypes,
	WebSocketEventsTypes,
} from '@transcendence/shared';

// ── Configuración de dificultad por gameMode ─────────────────────────────────
// botSpeed:     píxeles por frame que puede mover la pala el bot
// errorMargin:  desviación máxima en px respecto a la pelota (simula imprecisión)
// reactionRate: cada cuántos ticks recalcula su objetivo (simula tiempo de reacción)

const BOT_DIFFICULTY: Record<GameConstants.GameModeType, {
	botSpeed: number;
	errorMargin: number;
	reactionRate: number;
}> = {
	classic: { botSpeed: 5, errorMargin: 90, reactionRate: 10 },
	speed: { botSpeed: 9, errorMargin: 55, reactionRate: 6 },
	pro: { botSpeed: 12, errorMargin: 25, reactionRate: 3 },
};

// ── Tipos internos ────────────────────────────────────────────────────────────

export interface BotClientOptions {
	matchId: string;
	gameMode: GameConstants.GameModeType;
	wsUrl: string;
	botUserId: string;
	botUsername: string;
	jwtSecret: string;
	onDestroy: () => void;
}

// ── BotClient ─────────────────────────────────────────────────────────────────

export class BotClient {

	private ws: WebSocket | null = null;
	private tickCount: number = 0;
	private targetY: number = 300;     // Centro del canvas por defecto
	private paddleY: number = 270;     // Posición actual de la pala del bot
	private difficulty: typeof BOT_DIFFICULTY[GameConstants.GameModeType];
	private destroyed: boolean = false;
	private retryCount: number = 0;
	private opponentDisconnectedTimer: NodeJS.Timeout | null = null;

	private readonly MAX_RETRIES = 5;
	private readonly BASE_RETRY_MS = 1_000;
	// Margen extra sobre waitSeconds del servidor antes de auto-destruir el bot:
	// cubre latencia de red y pequeñas derivas de scheduling.
	private readonly FORFEIT_BUFFER_MS = 5_000;

	constructor(private options: BotClientOptions) {
		this.difficulty = BOT_DIFFICULTY[options.gameMode];
	}

	// ── Conexión ──────────────────────────────────────────────────────────────

	async connect(): Promise<void> {
		const token = this.generateToken();
		const url = `${this.options.wsUrl}?matchId=${this.options.matchId}&token=${token}`;

		console.log(`[BOT-CLIENT] Connecting to ${this.options.wsUrl} (match: ${this.options.matchId})`);

		this.ws = new WebSocket(url);

		this.ws.on('open', () => {
			this.retryCount = 0;
			console.log(`[BOT-CLIENT] Connected to match ${this.options.matchId}`);
		});

		this.ws.on('message', (data: Buffer) => {
			this.handleMessage(data.toString());
		});

		this.ws.on('close', (code: number, reason: Buffer) => {
			const reasonStr = reason.toString();
			console.log(`[BOT-CLIENT] Connection closed: ${code} ${reasonStr}`);

			// Cierre de negocio (el servidor rechazó la conexión intencionalmente):
			//   1008 → token inválido, matchId inexistente, jugador no autorizado
			// En estos casos no tiene sentido reintentar.
			const isBusinessClose = code === 1008;

			if (this.destroyed || isBusinessClose || this.retryCount >= this.MAX_RETRIES) {
				this.destroy();
				return;
			}

			// Cierre de infraestructura (problema temporal de red o proceso):
			// Reintentar con backoff exponencial: 1s, 2s, 4s, 8s, 16s
			const delay = this.BASE_RETRY_MS * Math.pow(2, this.retryCount);
			this.retryCount++;
			console.log(`[BOT-CLIENT] Retrying in ${delay}ms (attempt ${this.retryCount}/${this.MAX_RETRIES})`);
			setTimeout(() => {
				if (!this.destroyed) this.connect();
			}, delay);
		});

		this.ws.on('error', (err: Error) => {
			console.error(`[BOT-CLIENT] WebSocket error:`, err.message);
		});
	}

	// ── Procesamiento de mensajes ─────────────────────────────────────────────

	private handleMessage(raw: string): void {
		try {
			const msg = JSON.parse(raw) as { type: string; payload?: unknown };

			switch (msg.type) {

				case WEBSOCKET_EVENTS.GAME_UPDATE:
					this.handleGameUpdate(msg as WebSocketEventsTypes.GameUpdate);
					break;

				case WEBSOCKET_EVENTS.GAME_OVER:
					console.log(`[BOT-CLIENT] Game over for match ${this.options.matchId}`);
					this.destroy();
					break;

				case WEBSOCKET_EVENTS.MATCH_JOINED:
					console.log(`[BOT-CLIENT] Joined match ${this.options.matchId}`);
					break;

				case WEBSOCKET_EVENTS.GAME_OPPONENT_DISCONNECTED: {
					// El jugador humano se desconectó. El servidor esperará waitSeconds antes
					// de darle la victoria al bot por forfeit (y enviará GAME_OVER).
					// Si el servidor se cae antes de ese evento, arrancamos un timer de
					// seguridad para liberar recursos y no dejar el bot corriendo ad-infinitum.
					const { waitSeconds } = (msg as WebSocketEventsTypes.GameOpponentDisconnected).payload;
					console.log(`[BOT-CLIENT] Opponent disconnected in match ${this.options.matchId}. Waiting ${waitSeconds}s for forfeit.`);
					this.clearOpponentTimer();
					this.opponentDisconnectedTimer = setTimeout(() => {
						console.log(`[BOT-CLIENT] Forfeit safety timeout fired (${waitSeconds}s + buffer). Destroying bot.`);
						this.destroy();
					}, waitSeconds * 1000 + this.FORFEIT_BUFFER_MS);
					break;
				}

				case WEBSOCKET_EVENTS.GAME_OPPONENT_RECONNECTED:
					// El humano volvió — cancelamos el timer de seguridad y seguimos jugando.
					console.log(`[BOT-CLIENT] Opponent reconnected in match ${this.options.matchId}. Resuming.`);
					this.clearOpponentTimer();
					break;

				default:
					break;
			}
		} catch (err) {
			console.error(`[BOT-CLIENT] Failed to parse message:`, err);
		}
	}

	// ── Bucle de juego ────────────────────────────────────────────────────────

	private handleGameUpdate(msg: WebSocketEventsTypes.GameUpdate): void {
		const state = msg.payload.gameState;

		// Actualizar posición actual de la pala del bot (player2 = lado derecho)
		this.paddleY = state.paddleRight.y;

		this.tickCount++;

		if (this.tickCount % this.difficulty.reactionRate === 0) {
			this.recalculateTarget(state);
		}

		this.sendMove();
	}

	private recalculateTarget(state: GameTypes.GameDynamicState): void {
		const ballY = state.ball.y;

		// Error aleatorio recalculado periódicamente — simula imprecisión humana
		const error = (Math.random() * 2 - 1) * this.difficulty.errorMargin;
		this.targetY = ballY + error;

		// Clamp: el objetivo no puede salir del canvas
		const { CANVAS_HEIGHT, PADDLE_HEIGHT } = GameConstants.GAME_CONSTANTS;
		this.targetY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.targetY));
	}

	private sendMove(): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

		const paddleCenter = this.paddleY + GameConstants.GAME_CONSTANTS.PADDLE_HEIGHT / 2;
		const diff = this.targetY - paddleCenter;
		const deadZone = 10; // px — evita vibración cuando la pala está cerca del objetivo

		let action: GameConstants.GameAction;

		if (diff > deadZone) {
			action = GameConstants.GAME_ACTION.MOVE_DOWN;
		} else if (diff < -deadZone) {
			action = GameConstants.GAME_ACTION.MOVE_UP;
		} else {
			action = GameConstants.GAME_ACTION.STOP;
		}

		this.ws.send(JSON.stringify({ action }));
	}

	// ── Ciclo de vida ─────────────────────────────────────────────────────────

	private clearOpponentTimer(): void {
		if (this.opponentDisconnectedTimer !== null) {
			clearTimeout(this.opponentDisconnectedTimer);
			this.opponentDisconnectedTimer = null;
		}
	}

	private destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;

		this.clearOpponentTimer();

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.options.onDestroy();
	}

	// ── JWT ───────────────────────────────────────────────────────────────────

	private generateToken(): string {
		const payload = {
			id: this.options.botUserId,
			username: this.options.botUsername,
			email: 'bot@transcendence.local',
		};

		// El bot genera su propio token con el mismo secret que usa el sistema.
		// lastLogoutAt del bot es 0, así que cualquier token (iat > 0) es válido.
		return jwt.sign(payload, this.options.jwtSecret, { expiresIn: '1h' });
	}
}