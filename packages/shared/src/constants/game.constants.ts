// ============================================================================
// GAME CONSTANTS
// ============================================================================

// 

// packages/shared/src/constants/game.constants.ts

export const GAME_CONSTANTS = {
  // =========================================
  // LEGACY (Mantener para compatibilidad con Backend actual)
  // =========================================
  COURT_WIDTH: 800,
  COURT_HEIGHT: 600,
  BALL_SIZE: 10,
  BALL_SPEED: 5,
  PADDLE_SPEED: 20,
  COUNTDOWN_SECONDS: 3,

  // =========================================
  // NUEVA ARQUITECTURA (Para Local Game y Futuro Backend)
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
  }
} as const;

// Tipos para configuración de modos (Recuperamos esto también)
export interface GameModeConfig {
  paddleSpeed: number;      
  ballSpeedBase: number;    
  ballAcceleration: number; 
  hasInertia: boolean;      
  friction?: number;        
}

// Recuperamos la configuración de modos
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