import * as dotenv from 'dotenv';
dotenv.config({ debug: false });

export namespace AuthEnv {

	const jwtSecret = process.env.JWT_SECRET;
	const serviceSecret = process.env.SERVICE_SECRET;
	const userServiceUrl = process.env.USER_SERVICE_URL;
	
	if (!jwtSecret || !serviceSecret || !userServiceUrl) {
		throw new Error('Missing required environment variable');
	}
	
	export const PORT: number = parseInt(process.env.PORT || '3332');
	export const NODE_ENV: string = process.env.NODE_ENV || 'development';

	export const JWT_SECRET: string = jwtSecret;
	export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '1h';

	export const SERVICE_SECRET: string = serviceSecret;
	export const USER_SERVICE_URL: string = userServiceUrl;
}