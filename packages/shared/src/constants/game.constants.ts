// ============================================================================
// GAME CONSTANTS
// ============================================================================

/**
 * Configuración base del juego Pong
 */
export const GAME_CONSTANTS = {

  /**
   * Dimensiones del campo de juego
   */
  COURT_WIDTH: 800,
  COURT_HEIGHT: 600,

  /**
   * Dimensiones de las paletas de los jugadores
   */
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 100,

  /**
   * Tamaño y velocidad inicial de la pelota
   */
  BALL_SIZE: 10,
  BALL_SPEED: 5,

  /**
   * Fotogramas por segundo del bucle principal del juego
   */
  FPS: 60,

  /**
   * Duración de la cuenta regresiva antes de iniciar una partida
   */
  COUNTDOWN_SECONDS: 3

} as const;
