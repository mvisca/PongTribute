// packages/shared/src/constants/game.constants.ts

import { GameModeConfig } from '../types/index.js';

export const GAME_CONSTANTS = {
  // Dimensiones del Tablero (Aspect Ratio 4:3 aprox)
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,

  // Dimensiones Elementos
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 60, // 600 / 10 = 60
  BALL_RADIUS: 6,
  WALL_MARGIN: 15, // Margen de seguridad para colisiones
  FPS: 60,

  // Configuración de Puntuación
  SCORE: {
    DEFAULT: 11, // Para públicas
    MIN: 5,      // Slider min
    MAX: 21,     // Slider max
    STEP: 2      // Pasos impares (5, 7, 9...)
  }
} as const;


// STRATEGY PATTERN: Configuración por modo
export const GAME_MODES: Record<string, GameModeConfig> = {
  classic: {
    paddleSpeed: 9,      // Velocidad moderada
    ballSpeedBase: 6,    // Velocidad constante
    ballAcceleration: 0, // Sin aceleración
    hasInertia: false
  },
  speed: {
    paddleSpeed: 18,     // Doble de classic
    ballSpeedBase: 6,    // Empieza igual
    ballAcceleration: 0.10, // +10% velocidad en cada golpe
    hasInertia: false    
  },
  pro: {
    paddleSpeed: 18,     // Rápido
    ballSpeedBase: 6,
    ballAcceleration: 0.10, 
    hasInertia: true,    // HABILITA INERCIA
    friction: 0.88       // Factor de deslizamiento (hielo)
  }
};



// ====== OLD CONSTANTS =======
// const COURT_HEIGHT = 600;
// /**
//  * Configuración base del juego Pong
//  */
// export const GAME_CONSTANTS = {

// 	/**
// 	 * Dimensiones del campo de juego
// 	 */
// 	COURT_WIDTH: COURT_HEIGHT * 1.3,
// 	COURT_HEIGHT: COURT_HEIGHT,

// 	/**
// 	 * Dimensiones y velocidad de las paletas de los jugadores
// 	 */
// 	PADDLE_WIDTH: COURT_HEIGHT / 100,
// 	PADDLE_HEIGHT: COURT_HEIGHT / 10,
// 	WALL_MARGIN: 10, // distancia pared-pala
// 	PADDLE_SPEED: 20, 

// 	/**
// 	 * Tamaño y velocidad inicial de la pelota
// 	 */
// 	BALL_SIZE: 10,
// 	BALL_SPEED: 5,

// 	/**
// 	 * Fotogramas por segundo del bucle principal del juego
// 	 */
// 	FPS: 60,

// 	/**
// 	 * Duración de la cuenta regresiva antes de iniciar una partida
// 	 */
// 	COUNTDOWN_SECONDS: 3

// } as const;
