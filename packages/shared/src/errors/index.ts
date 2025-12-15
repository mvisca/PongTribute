import { ConflictError } from "./ConflictErrors.js";
import { NotFoundError } from "./NotFoundError.js";
import { UnauthorizedError } from "./UnauthorizedError.js";
import { ValidationError } from "./ValidationError.js";

export const SharedErrors = {
	ConflictError: ConflictError,
	NotFoundError: NotFoundError,
	UnauthorizedError: UnauthorizedError,
	ValidationError: ValidationError 
}