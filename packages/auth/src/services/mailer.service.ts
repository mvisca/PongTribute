import { Transporter, SentMessageInfo } from 'nodemailer';

export class MailerService {
	private transporter: Transporter<SentMessageInfo>;

	constructor(transporter: Transporter<SentMessageInfo>) {
		this.transporter = transporter;
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
		console.log(`[MAILER] Email sent to ${to} - messageId: ${info.messageId}`);
		// Log solo para dev o stagging (evaluacion) remover en producciòn
	}
	
	async verify(): Promise<void> {
		await this.transporter.verify();
	}	
}