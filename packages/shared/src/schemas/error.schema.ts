// packages/shared/src/schemas/error.schema.ts
// ============================================================================
// SCHEMAS DE ERROR RESPONSE CENTRALIZADOS
// Cada schema espeja exactamente el toJSON() de su clase en AppError.ts
// ============================================================================

import { Type } from '@sinclair/typebox';

export namespace ErrorSchemas {

	/** 400 — Espeja ValidationError.toJSON() */
	export const Validation = Type.Object({
		error: Type.String(),
		message: Type.String(),
		field: Type.Optional(Type.String())
	});

	/** 401 — Espeja UnauthorizedError.toJSON() */
	export const Unauthorized = Type.Object({
		error: Type.String(),
		message: Type.String()
	});

	/** 403 — Espeja ForbiddenError.toJSON() */
	export const Forbidden = Type.Object({
		error: Type.String(),
		message: Type.String()
	});

	/** 404 — Espeja NotFoundError.toJSON() */
	export const NotFound = Type.Object({
		error: Type.String(),
		message: Type.String(),
		resource: Type.Optional(Type.String())
	});

	/** 409 — Espeja ConflictError.toJSON() */
	export const Conflict = Type.Object({
		error: Type.String(),
		message: Type.String(),
		field: Type.Optional(Type.String())
	});

	/** 500 — Espeja InternalError.toJSON() */
	export const Internal = Type.Object({
		error: Type.String(),
		message: Type.String()
	});

	/** 503 — Espeja ServiceError.toJSON() */
	export const ServiceUnavailable = Type.Object({
		error: Type.String(),
		message: Type.String(),
		service: Type.String()
	});
}
