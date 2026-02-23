// packages/shared/src/types/game.types.ts

import type { GameConstants } from '../constants/game.constants.js';
import type { UserTypes } from './user.types.js';

export namespace GameTypes {
	
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
		gameModeName: GameConstants.GameModeType;
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
	/**
	* GameState Completo
	* Se usa para:
	* 1. Inicializar la partida (status: WAITING/ACTIVE)
	* 2. Reconexiones (status: PLAYING)
	* Contiene TODO: Configuración + Posiciones
	*/
	export interface GameState {
		id: string;              // UUID de la partida (string, no number, por seguridad)
		paddleLeft: PaddleState;  // Pala izquierda (jugador 1)
		paddleRight: PaddleState; // Pala derecha (jugador 2)
		ball: BallState;
		// Unimos dimensiones + reglas de modo para que el front tenga TODO el contexto
		config: GameConfig & GameModeConfig;
		targetScore: number;
		status: GameConstants.GameStatus; // 'waiting' | 'playing' | 'paused' | 'finished'
		winnerId?: UserTypes.UserId;  // UUID del usuario ganador (si finished)
	}
	
	/**
	* GameDynamicState (Estado Ligero)
	* Se usa para:
	* 1. Bucle de juego (60 FPS)
	* 2. Evento 'game:update'
	* * Usamos 'Omit' para crear un nuevo tipo basado en GameState
	* pero excluyendo las propiedades estáticas.
	* Si actualizas GameState, este se actualiza solo. ¡Magia de TS!
	*/
	export type GameDynamicState = Omit<GameState, 'config' | 'id'>;
	
	// 4. Inputs del Cliente (Lo que envía el usuario)
	export interface GameInputPayload {
		gameId: string;
		action: GameConstants.GameAction;
		
		// Opcional porque en online 'classic' lo deduce del socketID.
		// Obligatorio para lógica 'local'. Ha de saber que pala se movió del 'local'
		playerSide?: GameConstants.PlayerSide;
	}
	
}
