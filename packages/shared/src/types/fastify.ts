// import '@fastify/core';
import { MiddlewareTypes } from "./index.js";

declare module 'fastify' {
	interface FastifyRequest {
		user?: MiddlewareTypes.AuthenticatedUser;
	}
}

export {};