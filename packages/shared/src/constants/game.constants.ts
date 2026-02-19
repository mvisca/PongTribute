// ============================================================================
// GAME CONSTANTS
// ============================================================================
// packages/shared/src/constants/game.constants.ts

// 1. IMPORTAMOS LA DEFINICIÓN OFICIAL (Para evitar duplicados)
// Nota: Usamos .js en el import por ser ESM, aunque el archivo sea .ts
import { GameModeConfig } from '../types/game.types.js';

export const GAME_CONSTANTS = {
  // =========================================
  // LOCAL GAME y GAME PRO
  // =========================================
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 60,
  
  BALL_RADIUS: 6,
  WALL_MARGIN: 15,
  
  FPS: 60,
  
  SCORE: {
    DEFAULT: 11,
    MIN: 5,
    MAX: 21,
    STEP: 2
  },
  
  // Timeouts
  IN_MATCH_DISCONNECTION_TIMEOUT: 15000 // 15 segundos para reconectarse
} as const;

// ============================================================================
// GAME STATUS (Runtime - WebSocket Game Loop)
// ============================================================================
/**
 * Estados del juego durante la ejecución en tiempo real.
 * Diferentes de MATCH_STATUS (que es para persistencia en BD).
 */
export const GAME_STATUS = {
  /** Esperando a que ambos jugadores conecten */
  WAITING: 'WAITING',
  /** Partida en curso */
  PLAYING: 'PLAYING',
  /** Pausada (desconexión temporal) */
  PAUSED: 'PAUSED',
  /** Partida terminada normalmente */
  FINISHED: 'FINISHED',
  /** Partida abortada */
  ABORTED: 'ABORTED'
} as const;

export type GameStatus = typeof GAME_STATUS[keyof typeof GAME_STATUS];

// CONFIGURACIÓN DE MODOS (Usando el tipo importado)
export const GAME_MODES: Record<string, GameModeConfig> = {
  classic: {
    paddleSpeed: 9, ballSpeedBase: 6, ballAcceleration: 0, hasInertia: false
  },
  speed: {
    paddleSpeed: 18, ballSpeedBase: 6, ballAcceleration: 0.10, hasInertia: false    
  },
  pro: {
    paddleSpeed: 18, ballSpeedBase: 6, ballAcceleration: 0.10, hasInertia: true, friction: 0.88
  }
};