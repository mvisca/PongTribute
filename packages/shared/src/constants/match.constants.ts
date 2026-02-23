// ============================================================================
// PLAYER SLOTS
// ============================================================================

export namespace MatchConstants {

	/**
	 * Timeout de permanencia en las 3 colas redis 
	*/
	export const QUEUE_TIMEOUT_MS = 90000; // 90 seg

	/**
	 * Timeout de invitacion privada si invitado no hace nada
	 */
	export const PRIVATE_INVITATION_TIMEOUT_MS = 60000; // 60 seg

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
	// CONFIGURACION DE MATCH
	// ============================================================================
	
	/**
	 * Constantes Match de una partida
	*/
	export const MATCH_CONFIG = {
		
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
		 * Partida creada pero no iniciada\
		 * Puede no usarse si la partida empieza de inmediato al crearse el match
		*/
		PENDING: "pending",
		ACTIVE: "active",
		FINISHED: "finished",
		REJECTED: "rejected",
		EXPIRED: "expired"
	} as const;
	
	export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];
	
}