import { createLogger, type AppLogger } from '@transcendence/shared';
import { Transporter, SentMessageInfo } from 'nodemailer';

export class MailerService {
	private transporter: Transporter<SentMessageInfo>;
	private log: AppLogger;

	constructor(transporter: Transporter<SentMessageInfo>) {
		this.transporter = transporter;
		this.log = createLogger('MailerService');
	}

	async sendPasswordReset(to: string, link: string): Promise<void> {
		const info = await this.transporter.sendMail({
			to,
			subject: 'Password reset',
			text: [
				'Se solicitó un cambio de contraseña para tu cuenta.',
				'',
				'Si no fuiste tú, no tienes que hacer nada.',
				'',
				`Link: ${link}`,
			].join('\n'),
		});
		this.log.info({ to, messageId: info.messageId }, 'Email sent');
	}
	
	async verify(): Promise<void> {
		await this.transporter.verify();
	}	
}