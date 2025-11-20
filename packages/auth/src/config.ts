import { SharedEnv } from '@transcendence/shared';

export namespace AuthEnv {

	const sharedEnv = SharedEnv.build();

	const jwtSecret = sharedEnv.JWT_SECRET;
	const serviceSecret = sharedEnv.SERVICE_SECRET;
	const userServiceUrl = sharedEnv.USER_SERVICE_URL;
	const authServiceUrl = sharedEnv.AUTH_SERVICE_URL;
	
	if (!jwtSecret || !serviceSecret || !userServiceUrl || !authServiceUrl) {
		console.error('Faltan ENV VARS. Crea un .env de .env.example:');
		console.error('@/transcendence: cp .env.example .env');
		console.error('Edita con tus valores');
		process.exit(1);
	}
	
	export const PORT: number = sharedEnv.AUTH_SERVICE_PORT;
	export const HOST: string = sharedEnv.AUTH_SERVICE_HOST;
	export const NODE_ENV: string = sharedEnv.NODE_ENV;
	export const JWT_SECRET: string = sharedEnv.JWT_SECRET;
	export const TOKEN_EXPIRY: string = sharedEnv.TOKEN_EXPIRY;
	export const SERVICE_SECRET: string = sharedEnv.SERVICE_SECRET;
	export const USER_SERVICE_URL: string = sharedEnv.USER_SERVICE_URL;
	export const AUTH_SERVICE_URL: string = sharedEnv.AUTH_SERVICE_URL;
}