import { ConflictError } from "./ConflictErrors.js";
import { NotFoundError } from "./NotFoundError.js";
import { UnauthorizedError } from "./UnauthorizedError.js";
import { ValidationError } from "./ValidationError.js";
import {
	isConflictError,
	isNotFoundError,
	isValidationError,
	isUnauthorizedError
} from '../types/error.types.js';

export const SharedErrors = {
	// Error classes
	ConflictError: ConflictError,
	NotFoundError: NotFoundError,
	UnauthorizedError: UnauthorizedError,
	ValidationError: ValidationError,

	// Type guards para validar error responses
	isConflictError,
	isNotFoundError,
	isValidationError,
	isUnauthorizedError
}