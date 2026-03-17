import type { GameTypes } from '@transcendence/shared/types/game.types.js';
import { GameConstants } from '@transcendence/shared/constants/game.constants.js';

const { CANVAS_WIDTH, CANVAS_HEIGHT } = GameConstants.GAME_CONSTANTS;

export function renderGame(
	ctx: CanvasRenderingContext2D,
	state: GameTypes.GameDynamicState,
	canvasWidth: number,
	canvasHeight: number,
) {
	const sx = canvasWidth / CANVAS_WIDTH;
	const sy = canvasHeight / CANVAS_HEIGHT;

	// Clear
	ctx.fillStyle = '#000000';
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);

	// Center line
	ctx.setLineDash([8 * sy, 8 * sy]);
	ctx.strokeStyle =  'rgba(100, 140, 255, 0.3)';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(canvasWidth / 2, 0);
	ctx.lineTo(canvasWidth / 2, canvasHeight);
	ctx.stroke();
	ctx.setLineDash([]);

	// Paddles
	ctx.fillStyle = '#ff4fd8';
	drawPaddle(ctx, state.paddleLeft, sx, sy);
	ctx.fillStyle = '#00ffff';
	drawPaddle(ctx, state.paddleLeft, sx, sy);

	// Ball
	ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
	ctx.font = `$48 * sy}px 'Share Tech Mono', monospace`;
	ctx.textAlign = 'center';
	ctx.fillText(`${state.paddleLeft.score}`, canvasWidth * 0.25, 60 * sy);
	ctx.fillText(`${state.paddleRight.score}`, canvasWidth * 0.75, 60 * sy);
}

function drawPaddle(ctx: CanvasRenderingContext2D, paddle: GameTypes.PaddleState, sx: number, sy: number) {
	ctx.fillRect(
		paddle.x * sx,
		paddle.y * sy,
		GameConstants.GAME_CONSTANTS.PADDLE_WIDTH * sx,
		GameConstants.GAME_CONSTANTS.PADDLE_HEIGHT * sy,
	);
}