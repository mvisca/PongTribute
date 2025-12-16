// ============================================================================
// HTTP ERROR RESPONSE TYPES
// ============================================================================

/**
 * Error 409 Conflict
 * Se usa cuando hay conflicto de recursos (ej: username/email duplicado)
 */
export interface ConflictErrorResponse {
	error: string;
	message: string;
	field: string;  // Campo que causó el conflicto (ej: 'email', 'username')
}

/**
 * Error 404 Not Found
 * Se usa cuando no se encuentra un recurso solicitado
 */
export interface NotFoundErrorResponse {
	error: string;
	message: string;
}

/**
 * Error 400 Validation
 * Se usa cuando falla la validación de datos de entrada
 */
export interface ValidationErrorResponse {
	error: string;
	message: string;
	details?: unknown;  // Detalles opcionales de validación de Fastify/AJV
}

/**
 * Error 401 Unauthorized
 * Se usa cuando falla la autenticación o el token es inválido
 */
export interface UnauthorizedErrorResponse {
	error: string;
	message: string;
}

// ============================================================================
// TYPE GUARDS - Validación en runtime
// ============================================================================

/**
 * Type guard para ConflictErrorResponse
 * Verifica si un objeto desconocido es un error de tipo Conflict
 */
export function isConflictError(obj: unknown): obj is ConflictErrorResponse {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'error' in obj &&
		'message' in obj &&
		'field' in obj &&
		typeof (obj as ConflictErrorResponse).error === 'string' &&
		typeof (obj as ConflictErrorResponse).message === 'string' &&
		typeof (obj as ConflictErrorResponse).field === 'string'
	);
}

/**
 * Type guard para NotFoundErrorResponse
 * Verifica si un objeto desconocido es un error de tipo NotFound
 */
export function isNotFoundError(obj: unknown): obj is NotFoundErrorResponse {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'error' in obj &&
		'message' in obj &&
		typeof (obj as NotFoundErrorResponse).error === 'string' &&
		typeof (obj as NotFoundErrorResponse).message === 'string'
	);
}

/**
 * Type guard para ValidationErrorResponse
 * Verifica si un objeto desconocido es un error de tipo Validation
 */
export function isValidationError(obj: unknown): obj is ValidationErrorResponse {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'error' in obj &&
		'message' in obj &&
		typeof (obj as ValidationErrorResponse).error === 'string' &&
		typeof (obj as ValidationErrorResponse).message === 'string'
	);
}

/**
 * Type guard para UnauthorizedErrorResponse
 * Verifica si un objeto desconocido es un error de tipo Unauthorized
 */
export function isUnauthorizedError(obj: unknown): obj is UnauthorizedErrorResponse {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'error' in obj &&
		'message' in obj &&
		typeof (obj as UnauthorizedErrorResponse).error === 'string' &&
		typeof (obj as UnauthorizedErrorResponse).message === 'string'
	);
}
