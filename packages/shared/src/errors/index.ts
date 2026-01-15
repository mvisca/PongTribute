import { ConflictError } from "./ConflictErrors.js";
import { NotFoundError } from "./NotFoundError.js";
import { UnauthorizedError } from "./UnauthorizedError.js";
import { ValidationError } from "./ValidationError.js";
import { handleAuthError, handleBusinessError } from "./HttpErrorHandler.js";
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

	// HTTP Error Handlers
	handleAuthError,
	handleBusinessError,

	// Type guards para validar error responses
	isConflictError,
	isNotFoundError,
	isValidationError,
	isUnauthorizedError
}