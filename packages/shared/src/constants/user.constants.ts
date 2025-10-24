// ============================================================================
// PLAYER SLOTS
// ============================================================================

/**
 * Slots para partidas\
 * Cada partida tiene dos slots
 */
export const PLAYUSER_VALIDATION = {
	MIN_USERNAME_LENGTH: 3,
	MAX_USERNAME_LENGTH: 20,
	MIN_PASSWORD_LENGTH: 8,
	MAX_PASSWORD_LENGTH: 128,
	EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
} as const;