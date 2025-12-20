// ============================================================================
// FRIENDSHIP STATUS
// ============================================================================

/**
 * Estados posibles de una relación de amistad
 */
export const FRIENDSHIP_STATUS = {

	/**
	 * Solicitud enviada, pendiente de aceptación
	 */
	PENDING: "pending",

	/**
	 * Solicitud aceptada, amistad activa
	 */
	ACCEPTED: "accepted",

	/**
	 * Solicitud rechazada
	 */
	REJECTED: "rejected"

} as const;

/**
 * Tipo literal derivado de FRIENDSHIP_STATUS
 */
export type FriendshipStatus =
	typeof FRIENDSHIP_STATUS[keyof typeof FRIENDSHIP_STATUS];