// packages/shared/src/errors/AppError.ts

export abstract class AppError extends Error {
    abstract readonly statusCode: number;
    abstract readonly isOperational: boolean;
    
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this);
    }
    
    // Cada subclase define su propia estructura de response
    abstract toJSON(): Record<string, any>;
}

export class ValidationError extends AppError {
    readonly statusCode = 400;
    readonly isOperational = true;
    
    constructor(message: string, public readonly field?: string) {
        super(message);
    }
    
    toJSON() {
        return {
            error: 'ValidationError',
            message: this.message,
            ...(this.field && { field: this.field })
        };
    }
}

export class UnauthorizedError extends AppError {
    readonly statusCode = 401;
    readonly isOperational = true;
    
    toJSON() {
        return {
            error: 'UnauthorizedError',
            message: this.message
        };
    }
}

export class ForbiddenError extends AppError {
    readonly statusCode = 403;
    readonly isOperational = true;
    
    toJSON() {
        return {
            error: 'ForbiddenError',
            message: this.message
        };
    }
}

export class NotFoundError extends AppError {
    readonly statusCode = 404;
    readonly isOperational = true;
    
    constructor(message: string, public readonly resource?: string) {
        super(message);
    }
    
    toJSON() {
        return {
            error: 'NotFoundError',
            message: this.message,
            ...(this.resource && { resource: this.resource })
        };
    }
}

export class ConflictError extends AppError {
    readonly statusCode = 409;
    readonly isOperational = true;
    
    constructor(message: string, public readonly field?: string) {
        super(message);
    }
    
    toJSON() {
        return {
            error: 'ConflictError',
            message: this.message,
            ...(this.field && { field: this.field })
        };
    }
}

export class InternalError extends AppError {
    readonly statusCode = 500;
    readonly isOperational = false;
    
    constructor(message: string = 'Error interno del servidor') {
        super(message);
    }
    
    toJSON() {
        // NO exponer detalles en producción
        return {
            error: 'InternalServerError',
            message: 'Error interno del servidor'
        };
    }
}

export class ServiceError extends AppError {
    readonly statusCode = 503;
    readonly isOperational = true;
    
    constructor(public readonly service: string, message: string) {
        super(message);
    }
    
    toJSON() {
        return {
            error: 'ServiceUnavailableError',
            message: this.message,
            service: this.service
        };
    }
}