// ============================================================================
// GAME CONSTANTS
// ============================================================================

const COURT_HEIGHT = 600;
/**
 * Configuración base del juego Pong
 */
export const GAME_CONSTANTS = {

  /**
   * Dimensiones del campo de juego
   */
  COURT_WIDTH: COURT_HEIGHT * 1.3,
  COURT_HEIGHT: COURT_HEIGHT,

  /**
   * Dimensiones de las paletas de los jugadores
   */
  PADDLE_WIDTH: COURT_HEIGHT / 100,
  PADDLE_HEIGHT: COURT_HEIGHT / 10,

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
