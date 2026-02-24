import nodemailer, { Transporter } from 'nodemailer';
import { AuthEnv } from '../index.js';

export function createMailerClient(): Transporter {
	const smtpUser = AuthEnv.SMTP_USER();
	const smtpPass = AuthEnv.SMTP_PASS();
	const secure = AuthEnv.SMTP_SECURE() ?? AuthEnv.SMTP_PORT() === 465; // TODO pasarlo TLS directo
	const requireTLS = AuthEnv.SMTP_REQUIRE_TLS() ?? false;

	return nodemailer.createTransport(
		{
			host: AuthEnv.SMTP_HOST(),
			port: AuthEnv.SMTP_PORT(),
			secure,
			...(smtpUser && smtpPass ? { auth: { user: smtpUser, pass: smtpPass }} : {}),
			...(requireTLS ? { requireTLS: true } : {}),
		},
		// parámtros default
		{
			from: AuthEnv.SMTP_FROM()
		}
	);
}