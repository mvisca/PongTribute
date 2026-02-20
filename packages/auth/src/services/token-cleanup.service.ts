import cron from 'node-cron';
import { AuthEnv } from '../config.js';

export class TokenCleanupService {
	private job: cron.ScheduledTask | null = null;

	start(): void {
		// Ejecutar cada 6 horas: ' 0 */6 * * *'
		this.job = cron.schedule('0 */6 * * *', async () => {
			await this.cleanup();
		});

		console.log('[TOKEN-CLEANUP] Cronjob started: cleaning expired refresh tokens every 6 hours');
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
				console.log(`[TOKEN-CLEANUP] Deleted ${result.deleted} expired tokens`);
			}
		} catch(err) {
			console.error('[TOKEN-CLEANUP] Error during cleanup:', err);
		}
	}

	stop(): void {
		if (this.job) {
			this.job.stop();
			console.log('[TOKEN-CLEANUP] Cronjob stopped');
		}
	}
}