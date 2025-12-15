// ============================================================================
// PLAYER SLOTS
// ============================================================================

export namespace MatchConstants {

	/**
	 * Slots para partidas\
	 * Cada partida tiene dos slots
	*/
	export const PLAYER_SLOT = {
		PLAYER1: "player1",
		PLAYER2: "player2"
	} as const;
	
	/**
	 * Tipo de tupla literal derivado de slots
	*/
	export type PlayerSlot = typeof PLAYER_SLOT[keyof typeof PLAYER_SLOT];
	
	// ============================================================================
	// PLAYER POSITIONS
	// ============================================================================
	
	/**
	 * Ubicacion en el campo
	*/
	export const PLAYER_POSITION = {
		LEFT: "left",
		RIGHT: "right"
	} as const;
	
	/**
	 * Tipo tupla literal derivado de position
	*/
	export type PlayerPosition = typeof PLAYER_POSITION[keyof typeof PLAYER_POSITION];
	
	// ============================================================================
	// CONFIGURACION DE MATCH
	// ============================================================================
	
	/**
	 * Constantes Match de una partida
	*/
	export const MATCH_CONFIG = {
		
		/**
		 * Puntaje para ganar una partida
		*/
		WINNING_SCORE: 5,
		
		/**
		 * Numero de players por Match
		*/
		PLAYERS_PER_MATCH: 2,
		
		/**
		 * Límite de tiempo para una partida\
		*/
		MAX_DURATION_SECONDS: 150, 
		
		/**
		 * Puntaje mínimo para una victoria\
		 * Evitar victoria por abandono en un 0-0
		*/
		MIN_VALID_SCORE: 1
	} as const;
	
	// ============================================================================
	// MATCH STATUS
	// ============================================================================
	// Se relacionan con finishedAt
	
	/**
	 * Estados posibles de una partida
	*/
	export const MATCH_STATUS = {
		
		/**
		 * Partida creada pero noiniciada\
		 * Puede no usarse si la partida empieza de inmediato al crearse el match
		*/
		PENDING: "pending",
		
		/**
		 * Partida activa
		*/
		ACTIVE: "active",
		
		/**
		 * Partida terminada
		*/
		FINISHED: "finished"
	}as const;
	
	export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];
	
}