import nodemailer from 'nodemailer';
import { AuthEnv } from '../index.js';

export async function sendPasswordReset(to: string, link: string): Promise<void> {
	const smtpUser = AuthEnv.SMTP_USER();
	const smtpPass = AuthEnv.SMTP_PASS();
	const secure =
		AuthEnv.SMTP_SECURE() ??
		AuthEnv.SMTP_PORT() === 465; // default common for SMTPS
	const requireTLS = AuthEnv.SMTP_REQUIRE_TLS() ?? false;

	const transporter = nodemailer.createTransport({
		host: AuthEnv.SMTP_HOST(),
		port: AuthEnv.SMTP_PORT(),
		secure,
		...(smtpUser && smtpPass ? { auth: { user: smtpUser, pass: smtpPass } } : {}),
		...(requireTLS ? { requireTLS: true } : {}),
	});

	await transporter.sendMail({
		from: AuthEnv.SMTP_FROM(),
		to,
		subject: 'Password reset',
		text: [
			'Se solicitó un cambio de contraseña para tu cuenta.',
			'',
			'Si no fuiste tú, ignora este email.',
			'',
			`Link: ${link}`,
		].join('\n'),
	});
}

