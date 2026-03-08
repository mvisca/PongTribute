import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SharedEnv, findEnvFile } from '@transcendence/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = findEnvFile(__dirname);
if (envPath) {
	dotenv.config({ path: envPath });
} else {
	dotenv.config();
}

export namespace ImagesEnv {
	export interface ServiceConfig {
		port: number;
		host: string;
		nodeEnv: 'development' | 'production' | 'test';
		logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
	}

	export interface FastifyConfig {
		logger: {
			level: string;
			transport?: {
				target: string;
				options: {
					colorize: boolean;
					translateTime: string;
					ignore: string;
				};
			};
		} | boolean;
		bodyLimit?: number; 
		ajv?: {
			customOptions?: {
				removeAdditional?: boolean | 'all' | 'failing';
				coerceTypes?: boolean;
				useDefaults?: boolean;
			};
		};
	}

	let _config: ReturnType<typeof SharedEnv.build> | null = null;

	export function init(): void {
		if (_config)
			return;
		_config = SharedEnv.build();
	}

	function cnf() {
		if (!_config)
			throw new Error('ImagesEnv.init() no llamado');
		return _config;
	}

	export function NODE_ENV(): string { return cnf().NODE_ENV; }
	export function LOG_LEVEL(): string { return cnf().LOG_LEVEL; }

	export function PORT(): number { return cnf().IMAGE_SERVICE_PORT; }
	export function HOST(): string { return cnf().IMAGE_SERVICE_HOST; }
	export function SERVICE_SECRET(): string { return cnf().SERVICE_SECRET; }

	export function CLOUDINARY_CLOUD_NAME(): string { return cnf().CLOUDINARY_CLOUD_NAME; }
	export function CLOUDINARY_API_KEY(): string { return cnf().CLOUDINARY_API_KEY; }
	export function CLOUDINARY_API_SECRET(): string { return cnf().CLOUDINARY_API_SECRET; }
	export function CLOUDINARY_DEFAULT_AVATAR(): string { return cnf().CLOUDINARY_DEFAULT_AVATAR; }

	export function serverConfig(): ServiceConfig {
		const configValue = cnf();

		return {
			port: configValue.IMAGE_SERVICE_PORT,
			host: configValue.IMAGE_SERVICE_HOST,
			nodeEnv: configValue.NODE_ENV as ServiceConfig['nodeEnv'],
			logLevel: configValue.LOG_LEVEL as ServiceConfig['logLevel'],
		};
	}

	export function getFastifyConfig(): FastifyConfig {
		const configValue = cnf();

		return {
			logger: {
				level: configValue.LOG_LEVEL,
				...(configValue.NODE_ENV === 'development' && {
					transport: {
						target: 'pino-pretty',
						options: {
							colorize: true,
							translateTime: 'HH:MM:ss Z',
							ignore: 'pid,hostname'
						}
					}
				})
			},
			bodyLimit: 14 * 1024 * 1024, // 14MB
			ajv: {
				customOptions: {
					removeAdditional: false,
					coerceTypes: true,
					useDefaults: true
				}
			}
		};
	}
}
