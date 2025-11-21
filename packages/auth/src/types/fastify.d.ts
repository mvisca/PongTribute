import '@fastify/core';
// import { AuthTypes } from '@transcendence/shared';

declare module 'fastify' {
	interface FastifyRequest {
		user?: {
			id: string;
			username: string;
			email: string;
		};
	}
}