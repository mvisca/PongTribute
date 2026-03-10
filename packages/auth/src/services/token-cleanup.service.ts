import { createLogger, type AppLogger } from '@transcendence/shared';
import cron from 'node-cron';
import { AuthEnv } from '../config.js';

export class TokenCleanupService {
	private job: cron.ScheduledTask | null = null;
	private log: AppLogger;

	constructor() {
		this.log = createLogger('TokenCleanupService');
	}

	start(): void {
		// Ejecutar cada 6 horas: ' 0 */6 * * *'
		this.job = cron.schedule('0 */6 * * *', async () => {
			await this.cleanup();
		});

		this.log.info('Cronjob started: cleaning expired refresh tokens every 6 hours');
	}

	private async cleanup(): Promise<void> {
		try {
			const response = await fetch(
				`${AuthEnv.USER_SERVICE_URL()}/internal/tokens/expired`,
				{
					method: 'DELETE',
					headers: {
						'X-Service-Secret': AuthEnv.SERVICE_SECRET()
					}
				}
			);

			if (response.ok) {
				const result = (await response.json()) as { deleted: number };
				this.log.info({ deleted: result.deleted }, 'Expired tokens cleaned');
			}
		} catch(err) {
			this.log.error({ err }, 'Error during token cleanup');
		}
	}

	stop(): void {
		if (this.job) {
			this.job.stop();
			this.log.info('Cronjob stopped');
		}
	}
}