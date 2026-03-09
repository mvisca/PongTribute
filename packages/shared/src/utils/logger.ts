import pino from 'pino';

/**
 * Crea un logger Pino configurado para un servicio o componente.
 *
 * - En desarrollo: salida legible vía pino-pretty
 * - En producción: JSON estructurado
 * - Nivel controlado por LOG_LEVEL (env var)
 *
 * @param name - Nombre del servicio o componente (aparece en todos los logs)
 */
export function createLogger(name: string) {
	const level = process.env.LOG_LEVEL ?? 'info';
	const isDev  = process.env.NODE_ENV === 'development';

	return pino({
		level,
		...(isDev && {
			transport: {
				target: 'pino-pretty',
				options: {
					colorize:      true,
					translateTime: 'HH:MM:ss Z',
					ignore:        'pid,hostname',
				}
			}
		})
	}).child({ component: name });
}

export type AppLogger = ReturnType<typeof createLogger>;
