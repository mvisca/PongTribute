// packages/shared/src/types/game.types.ts

import type { GameStatus } from '../constants/game.constants.js';

// Definición de Tipos para la Configuración del Modo
export interface GameModeConfig {
  paddleSpeed: number;      // Píxeles por frame
  ballSpeedBase: number;    // Velocidad inicial
  ballAcceleration: number; // Multiplicador por golpe (ej: 0.10 = +10%)
  hasInertia: boolean;      // Activa física de fricción
  friction?: number;        // 0 a 1 (Solo si hasInertia es true)
}

// 1. Configuración del tablero (La "Cancha")
// El backend decide el tamaño lógico (ej: 800x600).
// El frontend escala esto al tamaño de la pantalla del usuario.
export interface GameConfig {
    width: number;        // Ancho total lógico
    height: number;       // Alto total lógico
    paddleWidth: number;
    paddleHeight: number;
    ballRadius: number;
}

// 2. Objetos del juego. La referencia al centro de la bola (BallState extiende de aqui)
export interface Coordinate {
    x: number;
    y: number;
}

export interface BallState extends Coordinate {
	dx: number;     // Vector X
	dy: number;     // Vector Y
	speed: number;  // Velocidad escalar actual (necesaria para aceleración)
}


export interface PaddleState {
    x: number;      // Necesario para dibujar (aunque sea fijo, el front debe saberlo)
    y: number;      // La variable que cambia
	score: number;
	dy: number;     // Velocidad vertical actual (necesaria para inercia)
}


// 3. Estado completo de la partida
export interface GameState {
    id: string;              // UUID de la partida (string, no number, por seguridad)
    paddleLeft: PaddleState;  // Pala izquierda (jugador 1)
    paddleRight: PaddleState; // Pala derecha (jugador 2)
	ball: BallState;
	// Unimos dimensiones + reglas de modo para que el front tenga TODO el contexto
    config: GameConfig & GameModeConfig;
	targetScore: number;
    status: GameStatus;
    winnerId?: number;       // ID del usuario ganador (si finished)
}

// 4. Inputs del Cliente (Lo que envía el usuario)
export interface GameInputPayload {
    gameId: string;
	action: 'MOVE_UP' | 'MOVE_DOWN' | 'STOP' | 'PAUSE_TOGGLE';
	
	// Opcional porque en online 'classic' lo deduce del socketID.
    // Obligatorio para lógica 'local'. Ha de saber que pala se movió del 'local'
    playerSide?: 'left' | 'right';
}